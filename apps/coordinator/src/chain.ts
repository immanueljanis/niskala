import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Web3 } from "web3";
import { config } from "./config.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const web3 = new Web3(config.rpcUrl);
web3.eth.handleRevert = true;
web3.eth.transactionPollingInterval = 1500;
web3.eth.transactionConfirmationBlocks = 1;

/**
 * The public Monad RPC allows ~15 requests per second per IP. Every call from this process
 * (makers, prover, watcher, scripts) goes through one token bucket, and 429s are retried with backoff.
 */
const RPS = Number(process.env.RPC_MAX_RPS ?? "10");
const GAP_MS = 1000 / RPS;
let nextSlot = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const provider = web3.currentProvider as any;
const rawRequest = provider.request.bind(provider);
provider.request = async (payload: unknown) => {
  const now = Date.now();
  nextSlot = Math.max(now, nextSlot) + GAP_MS;
  const wait = nextSlot - GAP_MS - now;
  if (wait > 0) await sleep(wait);
  for (let attempt = 0; ; attempt++) {
    try {
      return await rawRequest(payload);
    } catch (err: any) {
      const limited = err?.statusCode === 429 || /limited to|rate limit|429/i.test(String(err?.message ?? err?.cause?.message ?? ""));
      if (!limited || attempt >= 6) throw err;
      await sleep(400 * (attempt + 1));
    }
  }
};

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

export async function readRfq(market: any, rfqId: bigint): Promise<ChainRfq> {
  const r = await market.methods.getRfq(rfqId).call();
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

export async function readRfqCount(market: any): Promise<bigint> {
  return BigInt(await market.methods.rfqCount().call());
}

export async function readDomain(market: any): Promise<bigint> {
  return BigInt(await market.methods.DOMAIN().call());
}

/** Monad charges on gas limit, so estimate and pad rather than using a blanket cap. */
export async function sendWithEstimate(method: any, from: string, pad = 1.25) {
  const estimate = BigInt(await method.estimateGas({ from }));
  const gas = (estimate * BigInt(Math.round(pad * 100))) / 100n;
  const receipt = await method.send({ from, gas: gas.toString() });
  return { txHash: String(receipt.transactionHash), blockNumber: Number(receipt.blockNumber), gasUsed: Number(receipt.gasUsed) };
}
