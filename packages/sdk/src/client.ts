import { Web3, type Contract } from "web3";
import { CoordinatorClient } from "./coordinator.ts";
import { MockERC20Abi } from "./generated/MockERC20.ts";
import { RfqMarketAbi } from "./generated/RfqMarket.ts";
import { DEFAULT_REGISTRY, MONAD_TESTNET, domainSeparator, findPool, loadRegistry } from "./registry.ts";
import { STATUS_NAMES, type Balances, type ChainRegistry, type ChainRfq, type PoolSpec, type RegistryFile, type TokenInfo, type TxResult } from "./types.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
}

export interface NiskalaConfig {
  /** Defaults to Monad testnet (10143). */
  chainId?: number;
  /** RPC URL, an EIP-1193 provider (MetaMask, a test wallet) or a ready Web3 instance. Defaults to the chain's public RPC. */
  provider?: string | Eip1193Provider | Web3;
  /** Override the bundled deployment registry (for a local anvil deployment, for example). */
  registry?: RegistryFile;
  /** Coordinator base URL for the read API and opening submission. */
  coordinatorUrl?: string;
}

export interface SendOptions {
  /** Sender; must be an unlocked account of the provider or one added with `useAccount`. */
  from: string;
  /** Fixed gas limit. When omitted the provider estimates. Monad charges on the limit, so tight values save MON. */
  gas?: bigint | number | string;
}

export interface WaitOptions {
  timeoutMs?: number;
  intervalMs?: number;
  /** Called on every poll with the latest state. */
  onUpdate?: (rfq: ChainRfq) => void;
}

type Market = Contract<typeof RfqMarketAbi>;
type Token = Contract<typeof MockERC20Abi>;

export function normalizeRfq(rfqId: string | bigint, r: any): ChainRfq {
  const status = Number(r.status);
  return {
    rfqId: rfqId.toString(),
    trader: String(r.trader),
    amountOut: BigInt(r.amountOut).toString(),
    commitDeadline: Number(r.commitDeadline),
    settleDeadline: Number(r.settleDeadline),
    status,
    statusName: STATUS_NAMES[status] ?? "NONE",
    commitmentCount: Number(r.commitmentCount),
    winnerIndex: Number(r.winnerIndex),
    winningPriceE6: BigInt(r.winningPriceE6).toString(),
    makers: Array.from(r.makers as string[]).map(String),
    commitments: Array.from(r.commitments as string[]).map(String),
    proofHash: String(r.proofHash),
    usdcPaid: BigInt(r.usdcPaid).toString(),
  };
}

/**
 * One client for everything a trader, a maker or a dashboard does against Niskala markets.
 * Reads work over any RPC; writes need a provider that can sign for `from` (an injected wallet,
 * or a private key added with `useAccount` for Node). Amounts are base-unit strings, prices are
 * USDC per unit with 6 decimals (`priceE6`).
 */
export class Niskala {
  readonly chainId: number;
  readonly web3: Web3;
  readonly registry: ChainRegistry;
  readonly pools: PoolSpec[];
  readonly quote: TokenInfo;
  readonly verifier: string;
  readonly coordinator: CoordinatorClient;
  private readonly markets = new Map<string, Market>();
  private readonly tokens = new Map<string, Token>();

  constructor(config: NiskalaConfig = {}) {
    this.chainId = config.chainId ?? MONAD_TESTNET.chainId;
    const provider = config.provider ?? (this.chainId === MONAD_TESTNET.chainId ? MONAD_TESTNET.rpcUrl : undefined);
    if (!provider) throw new Error(`provider is required for chain ${this.chainId}`);
    this.web3 = provider instanceof Web3 ? provider : new Web3(provider as any);
    this.web3.eth.handleRevert = true;
    this.registry = loadRegistry(this.chainId, config.registry ?? DEFAULT_REGISTRY);
    this.pools = this.registry.pools;
    this.quote = this.registry.quote;
    this.verifier = this.registry.verifier;
    this.coordinator = new CoordinatorClient(config.coordinatorUrl);
  }

  /** Adds a private key so `from` can be that address in Node scripts. Returns the address. */
  useAccount(privateKey: string): string {
    const account = this.web3.eth.accounts.privateKeyToAccount(privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`);
    this.web3.eth.accounts.wallet.add(account);
    return account.address;
  }

  /** Pool by slug ("weth-usdc") or market address. */
  pool(slugOrMarket: string | PoolSpec): PoolSpec {
    if (typeof slugOrMarket !== "string") return slugOrMarket;
    const p = findPool(this.pools, slugOrMarket);
    if (!p) throw new Error(`unknown pool "${slugOrMarket}" on chain ${this.chainId}`);
    return p;
  }

  market(pool: string | PoolSpec): Market {
    const p = this.pool(pool);
    let c = this.markets.get(p.market);
    if (!c) {
      c = new this.web3.eth.Contract(RfqMarketAbi, p.market);
      this.markets.set(p.market, c);
    }
    return c;
  }

  token(address: string): Token {
    let c = this.tokens.get(address);
    if (!c) {
      c = new this.web3.eth.Contract(MockERC20Abi, address);
      this.tokens.set(address, c);
    }
    return c;
  }

  /** Circuit/contract domain separator for a pool: (chainId << 160) | market. */
  domain(pool: string | PoolSpec): bigint {
    return domainSeparator(this.chainId, this.pool(pool).market);
  }

  /* --------------------------------- reads --------------------------------- */

  async getRfq(pool: string | PoolSpec, rfqId: string | bigint): Promise<ChainRfq> {
    const r: any = await this.market(pool).methods.getRfq(rfqId.toString()).call();
    return normalizeRfq(rfqId, r);
  }

  async getRfqCount(pool: string | PoolSpec): Promise<number> {
    return Number(await this.market(pool).methods.rfqCount().call());
  }

  /** The newest `limit` rounds of a pool, highest id first. */
  async recentRfqs(pool: string | PoolSpec, limit = 6): Promise<ChainRfq[]> {
    const count = await this.getRfqCount(pool);
    const ids = Array.from({ length: Math.min(limit, count) }, (_, i) => String(count - i));
    return Promise.all(ids.map((id) => this.getRfq(pool, id)));
  }

  /** USDC owed for `amountOut` base units at `priceE6`, as the contract computes it. */
  async quoteCost(pool: string | PoolSpec, amountOut: string | bigint, priceE6: string | bigint): Promise<string> {
    return BigInt(await (this.market(pool).methods.quoteCost as any)(amountOut.toString(), priceE6.toString()).call()).toString();
  }

  async isMaker(pool: string | PoolSpec, maker: string): Promise<boolean> {
    return Boolean(await this.market(pool).methods.isMaker(maker).call());
  }

  async hasCommitted(pool: string | PoolSpec, rfqId: string | bigint, maker: string): Promise<boolean> {
    return Boolean(await this.market(pool).methods.hasCommitted(rfqId.toString(), maker).call());
  }

  /** A maker's unlocked vault balance in the pool's base token. */
  async available(pool: string | PoolSpec, maker: string): Promise<string> {
    return BigInt(await this.market(pool).methods.available(maker).call()).toString();
  }

  async deposited(pool: string | PoolSpec, maker: string): Promise<string> {
    return BigInt(await this.market(pool).methods.deposited(maker).call()).toString();
  }

  async tokenBalance(token: string, owner: string): Promise<string> {
    return BigInt(await this.token(token).methods.balanceOf(owner).call()).toString();
  }

  async allowance(token: string, owner: string, spender: string): Promise<string> {
    return BigInt(await this.token(token).methods.allowance(owner, spender).call()).toString();
  }

  async usdcAllowance(pool: string | PoolSpec, owner: string): Promise<string> {
    return this.allowance(this.quote.address, owner, this.pool(pool).market);
  }

  async balances(address: string): Promise<Balances> {
    const [mon, usdc] = await Promise.all([this.web3.eth.getBalance(address), this.tokenBalance(this.quote.address, address)]);
    return { mon: BigInt(mon).toString(), usdc };
  }

  async blockNumber(): Promise<number> {
    return Number(await this.web3.eth.getBlockNumber());
  }

  /** Sum of the registered makers' unlocked liquidity in a pool. */
  async poolLiquidity(pool: string | PoolSpec, makers: string[] = this.registry.makers): Promise<string> {
    const vals = await Promise.all(makers.map((m) => this.available(pool, m)));
    return vals.reduce((acc, v) => acc + BigInt(v), 0n).toString();
  }

  /** Polls a round until `done(rfq)` is true. Rejects on CANCELLED or timeout. */
  async waitFor(pool: string | PoolSpec, rfqId: string | bigint, done: (rfq: ChainRfq) => boolean, opts: WaitOptions = {}): Promise<ChainRfq> {
    const deadline = Date.now() + (opts.timeoutMs ?? 240_000);
    for (;;) {
      const rfq = await this.getRfq(pool, rfqId);
      opts.onUpdate?.(rfq);
      if (done(rfq)) return rfq;
      if (rfq.statusName === "CANCELLED") throw new Error(`rfq #${rfq.rfqId} was cancelled`);
      if (Date.now() > deadline) throw new Error(`timed out waiting for rfq #${rfq.rfqId} (status ${rfq.statusName}, ${rfq.commitmentCount} commitments)`);
      await new Promise((r) => setTimeout(r, opts.intervalMs ?? 1500));
    }
  }

  /** Resolves once the proof is verified onchain (status PROVEN or later). */
  waitForProof(pool: string | PoolSpec, rfqId: string | bigint, opts?: WaitOptions): Promise<ChainRfq> {
    return this.waitFor(pool, rfqId, (r) => r.status >= 3, opts);
  }

  /* --------------------------------- writes --------------------------------- */

  private async send(method: any, opts: SendOptions): Promise<TxResult> {
    const tx: Record<string, unknown> = { from: opts.from };
    if (opts.gas !== undefined) tx.gas = opts.gas.toString();
    const receipt = await method.send(tx);
    return { txHash: String(receipt.transactionHash), blockNumber: Number(receipt.blockNumber), gasUsed: receipt.gasUsed === undefined ? undefined : Number(receipt.gasUsed) };
  }

  /** Trader: opens a fixed-size round. Windows default to the pool's configured values. */
  async createRfq(
    pool: string | PoolSpec,
    amountOut: string | bigint,
    opts: SendOptions & { commitWindowSec?: number; settleWindowSec?: number },
  ): Promise<TxResult & { rfqId: string }> {
    const p = this.pool(pool);
    const method = (this.market(p).methods.createRfq as any)(amountOut.toString(), opts.commitWindowSec ?? p.commitWindowSec, opts.settleWindowSec ?? p.settleWindowSec);
    const tx: Record<string, unknown> = { from: opts.from };
    if (opts.gas !== undefined) tx.gas = opts.gas.toString();
    const receipt: any = await method.send(tx);
    const fromEvent = receipt?.events?.RfqCreated?.returnValues?.rfqId;
    const rfqId = fromEvent !== undefined ? String(fromEvent) : String(await this.getRfqCount(p));
    return { txHash: String(receipt.transactionHash), blockNumber: Number(receipt.blockNumber), gasUsed: Number(receipt.gasUsed), rfqId };
  }

  /** Trader: lets the market pull up to `amount` USDC. Pass a large amount once to skip future approvals. */
  approveUsdc(pool: string | PoolSpec, amount: string | bigint, opts: SendOptions): Promise<TxResult> {
    return this.send(this.token(this.quote.address).methods.approve(this.pool(pool).market, amount.toString()), opts);
  }

  /** Trader: settles a PROVEN round at the proven price. Only the trader who opened it can call this. */
  executeRfq(pool: string | PoolSpec, rfqId: string | bigint, opts: SendOptions): Promise<TxResult> {
    return this.send(this.market(pool).methods.execute(rfqId.toString()), opts);
  }

  /** Testnet only: the mock USDC has an open mint. */
  mintUsdc(amount: string | bigint, opts: SendOptions & { to?: string }): Promise<TxResult> {
    return this.send(this.token(this.quote.address).methods.mint(opts.to ?? opts.from, amount.toString()), opts);
  }

  /** Testnet only: mock base tokens have an open mint too. */
  mintBase(pool: string | PoolSpec, amount: string | bigint, opts: SendOptions & { to?: string }): Promise<TxResult> {
    return this.send(this.token(this.pool(pool).base.address).methods.mint(opts.to ?? opts.from, amount.toString()), opts);
  }

  /** Maker: approves and locks base-token collateral in the market vault. */
  async deposit(pool: string | PoolSpec, amount: string | bigint, opts: SendOptions): Promise<TxResult> {
    const p = this.pool(pool);
    const allowance = BigInt(await this.allowance(p.base.address, opts.from, p.market));
    if (allowance < BigInt(amount)) await this.send(this.token(p.base.address).methods.approve(p.market, amount.toString()), opts);
    return this.send(this.market(p).methods.deposit(amount.toString()), opts);
  }

  withdraw(pool: string | PoolSpec, amount: string | bigint, opts: SendOptions): Promise<TxResult> {
    return this.send(this.market(pool).methods.withdraw(amount.toString()), opts);
  }

  /** Maker: posts a sealed commitment (bytes32 hex) for an OPEN round. */
  commit(pool: string | PoolSpec, rfqId: string | bigint, commitment: string, opts: SendOptions): Promise<TxResult> {
    return this.send(this.market(pool).methods.commit(rfqId.toString(), commitment), { gas: 220_000, ...opts });
  }

  /** Anyone: verifies a best-execution proof onchain. */
  submitProof(pool: string | PoolSpec, rfqId: string | bigint, winnerIndex: number, winningPriceE6: string | bigint, proof: string, opts: SendOptions): Promise<TxResult> {
    return this.send((this.market(pool).methods.submitProof as any)(rfqId.toString(), winnerIndex, winningPriceE6.toString(), proof), opts);
  }

  /** Anyone, after the commit deadline: closes the window (≥ MIN_SLOTS) or cancels the round. */
  closeCommit(pool: string | PoolSpec, rfqId: string | bigint, opts: SendOptions): Promise<TxResult> {
    return this.send(this.market(pool).methods.closeCommit(rfqId.toString()), { gas: 200_000, ...opts });
  }

  /** Anyone, after the settle deadline: releases maker collateral. */
  expire(pool: string | PoolSpec, rfqId: string | bigint, opts: SendOptions): Promise<TxResult> {
    return this.send(this.market(pool).methods.expire(rfqId.toString()), { gas: 200_000, ...opts });
  }

  /** Market owner only: adds a maker to the roster. */
  registerMaker(pool: string | PoolSpec, maker: string, opts: SendOptions): Promise<TxResult> {
    return this.send(this.market(pool).methods.registerMaker(maker), opts);
  }
}
