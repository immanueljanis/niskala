import type { Niskala, SendOptions } from "./client.ts";
import { openingMessage, randomSalt, recoverOpeningSigner, signOpening } from "./opening.ts";
import type { ChainRfq, OpeningClaim, PoolSpec, SignedOpening, TxResult } from "./types.ts";

export { openingMessage, randomSalt, recoverOpeningSigner, signOpening };

/**
 * Maker-side helpers. This entry pulls in Barretenberg (WASM) for Poseidon2, so it is kept out of the
 * core entry; the core SDK stays light for traders and dashboards.
 */

const BN254_FR = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function toField(value: bigint): Uint8Array {
  if (value < 0n || value >= BN254_FR) throw new Error(`value out of BN254 field: ${value}`);
  const out = new Uint8Array(32);
  let v = value;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

let bbPromise: Promise<import("@aztec/bb.js").Barretenberg> | undefined;

async function barretenberg() {
  bbPromise ??= import("@aztec/bb.js").then(({ Barretenberg }) => Barretenberg.new({ threads: 1 }));
  return bbPromise;
}

/** Releases the Poseidon2 WASM worker so a Node process can exit; the next `commitment()` call restarts it. */
export async function destroyBarretenberg(): Promise<void> {
  const pending = bbPromise;
  bbPromise = undefined;
  if (pending) await (await pending).destroy();
}

export interface Opening {
  domain: bigint;
  rfqId: bigint;
  maker: string;
  priceE6: bigint;
  salt: bigint;
}

/** Commitment = Poseidon2(domain, rfqId, maker, priceE6, salt), as the circuit and the contract expect. */
export async function commitment(o: Opening): Promise<bigint> {
  const api = await barretenberg();
  const { hash } = await api.poseidon2Hash({ inputs: [o.domain, o.rfqId, BigInt(o.maker), o.priceE6, o.salt].map(toField) });
  return hash.reduce((acc, b) => (acc << 8n) | BigInt(b), 0n);
}

export function toBytes32(value: bigint): `0x${string}` {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

export interface MakerQuote {
  pool: PoolSpec;
  rfq: ChainRfq;
  priceE6: bigint;
  salt: bigint;
  commitment: bigint;
  commitTx: TxResult;
  opening: SignedOpening;
}

/**
 * A market maker over one `Niskala` client: deposit collateral, seal a quote for an open round, and hand
 * the opening to the prover. The maker's address must be on the market roster (`registerMaker`).
 */
export class MakerClient {
  readonly address: string;

  constructor(
    private readonly niskala: Niskala,
    signer: { privateKey: string; address?: string } | { address: string },
  ) {
    this.signer = signer;
    this.address = "privateKey" in signer ? niskala.useAccount(signer.privateKey) : signer.address;
  }

  private readonly signer: { privateKey: string } | { address: string };

  private get send(): SendOptions {
    return { from: this.address };
  }

  async isRegistered(pool: string | PoolSpec): Promise<boolean> {
    return this.niskala.isMaker(pool, this.address);
  }

  /** Tops the vault up to `target` base units (mints on testnet when the wallet lacks the tokens). */
  async ensureDeposit(pool: string | PoolSpec, target: bigint, { mint = true } = {}): Promise<TxResult | null> {
    const p = this.niskala.pool(pool);
    const have = BigInt(await this.niskala.deposited(p, this.address));
    if (have >= target) return null;
    const need = target - have;
    if (mint && BigInt(await this.niskala.tokenBalance(p.base.address, this.address)) < need) await this.niskala.mintBase(p, need, this.send);
    return this.niskala.deposit(p, need, this.send);
  }

  /** Rounds that are OPEN, inside their commit window, and this maker has not committed to yet. */
  async openRounds(pool: string | PoolSpec, lookback = 6): Promise<ChainRfq[]> {
    const recent = await this.niskala.recentRfqs(pool, lookback);
    const now = Math.floor(Date.now() / 1000);
    const me = this.address.toLowerCase();
    return recent.filter((r) => r.statusName === "OPEN" && now < r.commitDeadline && !r.makers.slice(0, r.commitmentCount).some((m) => m.toLowerCase() === me));
  }

  /** Builds the signed opening without sending anything; useful for custom submission paths. */
  async sealed(pool: string | PoolSpec, rfqId: string | bigint, priceE6: bigint, salt = randomSalt()) {
    const p = this.niskala.pool(pool);
    const c = await commitment({ domain: this.niskala.domain(p), rfqId: BigInt(rfqId), maker: this.address, priceE6, salt });
    const claim: OpeningClaim = { chainId: this.niskala.chainId, market: p.market, rfqId: rfqId.toString(), maker: this.address, priceE6: priceE6.toString(), salt: salt.toString() };
    const opening = await signOpening(claim, "privateKey" in this.signer ? { privateKey: this.signer.privateKey } : { provider: this.niskala.web3.currentProvider as never });
    return { pool: p, commitment: c, salt, opening };
  }

  /**
   * Commits the sealed quote onchain, then hands the opening to the coordinator so the proof can include
   * this quote. The price never goes onchain; only the winner's is revealed by the proof.
   */
  async quote(pool: string | PoolSpec, rfq: ChainRfq | string | bigint, priceE6: bigint): Promise<MakerQuote> {
    const p = this.niskala.pool(pool);
    const r = typeof rfq === "object" ? rfq : await this.niskala.getRfq(p, rfq);
    if (priceE6 <= 0n) throw new Error("priceE6 must be positive");
    const { commitment: c, salt, opening } = await this.sealed(p, r.rfqId, priceE6);
    const commitTx = await this.niskala.commit(p, r.rfqId, toBytes32(c), this.send);
    await this.niskala.coordinator.submitOpening(p.slug, opening);
    return { pool: p, rfq: r, priceE6, salt, commitment: c, commitTx, opening };
  }
}
