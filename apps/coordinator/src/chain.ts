import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { HttpProvider, Web3 } from "web3";
import { config } from "./config.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * RPC strategy for Monad testnet: the official endpoint allows ~15 req/s per IP, so reads are spread
 * across several public endpoints (each with its own token bucket) while transactions, nonces and gas
 * estimates stay on the primary. 429s fail over to the next endpoint. Other chains use the single RPC_URL.
 */
interface Endpoint {
  url: string;
  rps: number;
  batch: boolean;
  primary: boolean;
  provider: HttpProvider;
  nextSlot: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isMonadTestnet = config.chainId === 10143n;
const ENDPOINTS: Endpoint[] = [
  { url: config.rpcUrl, rps: Number(process.env.RPC_MAX_RPS ?? "12"), batch: true, primary: true },
  ...(isMonadTestnet
    ? [
        { url: "https://rpc.ankr.com/monad_testnet", rps: 25, batch: true, primary: false },
        { url: "https://rpc-testnet.monadinfra.com", rps: 15, batch: false, primary: false },
      ]
    : []),
].map((e) => ({ ...e, provider: new HttpProvider(e.url), nextSlot: 0 }));

const PRIMARY_ONLY = new Set(["eth_sendRawTransaction", "eth_sendTransaction", "eth_getTransactionCount", "eth_estimateGas"]);

function pick(payload: any): Endpoint {
  const isBatch = Array.isArray(payload);
  const method = isBatch ? "" : String(payload?.method ?? "");
  if (PRIMARY_ONLY.has(method)) return ENDPOINTS[0];
  const eligible = ENDPOINTS.filter((e) => !isBatch || e.batch);
  return eligible.reduce((best, e) => (e.nextSlot < best.nextSlot ? e : best), eligible[0]);
}

async function throttled(endpoint: Endpoint, payload: any) {
  const gap = 1000 / endpoint.rps;
  const now = Date.now();
  endpoint.nextSlot = Math.max(now, endpoint.nextSlot) + gap;
  const wait = endpoint.nextSlot - gap - now;
  if (wait > 0) await sleep(wait);
  return endpoint.provider.request(payload);
}

async function routedRequest(payload: any) {
  let lastErr: any;
  for (let attempt = 0; attempt < 6; attempt++) {
    const endpoint = pick(payload);
    try {
      return await throttled(endpoint, payload);
    } catch (err: any) {
      lastErr = err;
      const limited = err?.statusCode === 429 || /limited to|rate limit|429/i.test(String(err?.message ?? err?.cause?.message ?? ""));
      if (!limited) throw err;
      endpoint.nextSlot = Date.now() + 1500;
      await sleep(150 * (attempt + 1));
    }
  }
  throw lastErr;
}

/** web3 gets its own provider instance; every call it makes is routed across ENDPOINTS (which keep their original request). */
export const web3 = new Web3(new HttpProvider(config.rpcUrl));
web3.eth.handleRevert = true;
web3.eth.transactionPollingInterval = 500;
web3.eth.transactionConfirmationBlocks = 1;
(web3.currentProvider as any).request = routedRequest;

const abis: Record<string, any[]> = {};
export function abi(name: string): any[] {
  abis[name] ??= JSON.parse(readFileSync(resolve(config.abiDir, `${name}.json`), "utf8"));
  return abis[name];
}

export function contractAt(name: string, address: string): any {
  return new web3.eth.Contract(abi(name), address);
}

export function addWallet(privateKey: string) {
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(account);
  return account;
}

/** One JSON-RPC batch of eth_call; returns raw hex results in order. */
export async function batchCall(calls: Array<{ to: string; data: string }>): Promise<string[]> {
  if (calls.length === 0) return [];
  const batch = new web3.BatchRequest();
  const promises = calls.map((c, i) => batch.add({ jsonrpc: "2.0", id: i + 1, method: "eth_call", params: [{ to: c.to, data: c.data }, "latest"] } as any));
  for (const p of promises) p.catch(() => undefined);
  await batch.execute({ timeout: 8000 });
  return (await Promise.all(promises)).map(String);
}

export const Status = { NONE: 0, OPEN: 1, COMMIT_CLOSED: 2, PROVEN: 3, SETTLED: 4, CANCELLED: 5 } as const;
export const STATUS_NAMES = ["NONE", "OPEN", "COMMIT_CLOSED", "PROVEN", "SETTLED", "CANCELLED"] as const;

export interface ChainRfq {
  rfqId: string;
  trader: string;
  amountOut: string;
  commitDeadline: number;
  settleDeadline: number;
  status: number;
  statusName: (typeof STATUS_NAMES)[number];
  commitmentCount: number;
  winnerIndex: number;
  winningPriceE6: string;
  makers: string[];
  commitments: string[];
  proofHash: string;
  usdcPaid: string;
}

export function normalizeRfq(rfqId: bigint | string, r: any): ChainRfq {
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
    makers: Array.from(r.makers as string[]).map((m) => String(m)),
    commitments: Array.from(r.commitments as string[]).map((c) => String(c)),
    proofHash: String(r.proofHash),
    usdcPaid: BigInt(r.usdcPaid).toString(),
  };
}

export async function readRfq(market: any, rfqId: bigint): Promise<ChainRfq> {
  return normalizeRfq(rfqId, await market.methods.getRfq(rfqId).call());
}

export async function readRfqCount(market: any): Promise<bigint> {
  return BigInt(await market.methods.rfqCount().call());
}

export async function readDomain(market: any): Promise<bigint> {
  return BigInt(await market.methods.DOMAIN().call());
}

/* ------------------------------ transaction sending ------------------------------ */

const nonces = new Map<string, bigint>();
let gasPriceCache: { value: bigint; at: number } = { value: 0n, at: 0 };

async function nextNonce(from: string): Promise<bigint> {
  const k = from.toLowerCase();
  if (!nonces.has(k)) nonces.set(k, BigInt(await web3.eth.getTransactionCount(from, "pending")));
  const n = nonces.get(k)!;
  nonces.set(k, n + 1n);
  return n;
}

async function gasPrice(): Promise<bigint> {
  if (Date.now() - gasPriceCache.at > 15_000) gasPriceCache = { value: BigInt(await web3.eth.getGasPrice()), at: Date.now() };
  return gasPriceCache.value;
}

export interface TxOptions {
  /** Fixed gas limit; when omitted, estimateGas × pad is used. */
  gas?: bigint;
  pad?: number;
}

/**
 * Sends a contract call with locally managed nonce, cached fee fields and an explicit chainId, so a send
 * costs one eth_sendRawTransaction plus receipt polls instead of five RPC round trips. Monad charges on
 * gas limit, so fixed limits stay close to real usage.
 */
export async function sendTx(method: any, from: string, opts: TxOptions = {}) {
  const gas = opts.gas ?? (BigInt(await method.estimateGas({ from })) * BigInt(Math.round((opts.pad ?? 1.25) * 100))) / 100n;
  const price = await gasPrice();
  const nonce = await nextNonce(from);
  try {
    const receipt = await method.send({
      from,
      gas: gas.toString(),
      nonce: nonce.toString(),
      chainId: config.chainId.toString(),
      type: "0x2",
      maxFeePerGas: ((price * 13n) / 10n).toString(),
      maxPriorityFeePerGas: (2n * 10n ** 9n).toString(),
    });
    return { txHash: String(receipt.transactionHash), blockNumber: Number(receipt.blockNumber), gasUsed: Number(receipt.gasUsed) };
  } catch (err) {
    nonces.delete(from.toLowerCase());
    throw err;
  }
}

/** Backwards-compatible name used by scripts. */
export function sendWithEstimate(method: any, from: string, pad = 1.25) {
  return sendTx(method, from, { pad });
}
