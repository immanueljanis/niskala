import marketAbi from "../../../../../packages/abi/RfqMarket.json";
import erc20Abi from "../../../../../packages/abi/MockERC20.json";
import { QUOTE, type PoolSpec } from "../pools";
import { getInjectedWeb3, getReadWeb3 } from "./web3";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const STATUS_NAMES = ["NONE", "OPEN", "COMMIT_CLOSED", "PROVEN", "SETTLED", "CANCELLED"] as const;
export type StatusName = (typeof STATUS_NAMES)[number];

export interface ChainRfq {
  rfqId: string;
  trader: string;
  amountOut: string;
  commitDeadline: number;
  settleDeadline: number;
  status: number;
  statusName: StatusName;
  commitmentCount: number;
  winnerIndex: number;
  winningPriceE6: string;
  makers: string[];
  commitments: string[];
  proofHash: string;
  usdcPaid: string;
}

export interface Balances {
  mon: string;
  usdc: string;
}

function readMarket(pool: PoolSpec): any {
  return new (getReadWeb3().eth.Contract as any)(marketAbi, pool.market);
}

function readToken(address: string): any {
  return new (getReadWeb3().eth.Contract as any)(erc20Abi, address);
}

function walletContract(abi: any, address: string): any {
  const web3 = getInjectedWeb3();
  if (!web3) throw new Error("No injected wallet found.");
  return new (web3.eth.Contract as any)(abi, address);
}

export function normalizeRfq(rfqId: string, r: any): ChainRfq {
  const status = Number(r.status);
  return {
    rfqId,
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

export async function getRfq(pool: PoolSpec, rfqId: string): Promise<ChainRfq> {
  return normalizeRfq(rfqId, await readMarket(pool).methods.getRfq(rfqId).call());
}

export async function getRfqCount(pool: PoolSpec): Promise<number> {
  return Number(await readMarket(pool).methods.rfqCount().call());
}

export async function quoteCost(pool: PoolSpec, amountOut: string, priceE6: string): Promise<string> {
  return BigInt(await readMarket(pool).methods.quoteCost(amountOut, priceE6).call()).toString();
}

/** Sum of the makers' unlocked vault balance in the pool's base token. */
export async function getPoolLiquidity(pool: PoolSpec, makers: string[]): Promise<string> {
  const m = readMarket(pool);
  const vals = await Promise.all(makers.map((a) => m.methods.available(a).call()));
  return vals.reduce((acc: bigint, v: unknown) => acc + BigInt(v as string), 0n).toString();
}

export async function getBalances(address: string): Promise<Balances> {
  const web3 = getReadWeb3();
  const [mon, usdc] = await Promise.all([web3.eth.getBalance(address), QUOTE.address ? readToken(QUOTE.address).methods.balanceOf(address).call() : "0"]);
  return { mon: BigInt(mon).toString(), usdc: BigInt(usdc as any).toString() };
}

export async function getTokenBalance(address: string, token: string): Promise<string> {
  return BigInt(await readToken(token).methods.balanceOf(address).call()).toString();
}

export async function getUsdcAllowance(owner: string, pool: PoolSpec): Promise<string> {
  return BigInt(await readToken(QUOTE.address).methods.allowance(owner, pool.market).call()).toString();
}

export async function getBlockNumber(): Promise<number> {
  return Number(await getReadWeb3().eth.getBlockNumber());
}

/* ----------------------------- wallet transactions ----------------------------- */

export interface TxResult {
  txHash: string;
  blockNumber: number;
}

async function send(method: any, from: string): Promise<TxResult> {
  const receipt = await method.send({ from });
  return { txHash: String(receipt.transactionHash), blockNumber: Number(receipt.blockNumber) };
}

export async function createRfq(from: string, pool: PoolSpec, amountOut: string, commitWindowSec: number, settleWindowSec: number): Promise<TxResult & { rfqId: string }> {
  const market = walletContract(marketAbi, pool.market);
  const receipt = await market.methods.createRfq(amountOut, commitWindowSec, settleWindowSec).send({ from });
  const fromEvent = receipt?.events?.RfqCreated?.returnValues?.rfqId;
  const rfqId = fromEvent !== undefined ? String(fromEvent) : String(await getRfqCount(pool));
  return { txHash: String(receipt.transactionHash), blockNumber: Number(receipt.blockNumber), rfqId };
}

export function approveUsdc(from: string, pool: PoolSpec, amount: string): Promise<TxResult> {
  return send(walletContract(erc20Abi, QUOTE.address).methods.approve(pool.market, amount), from);
}

export function mintUsdc(from: string, amount: string): Promise<TxResult> {
  return send(walletContract(erc20Abi, QUOTE.address).methods.mint(from, amount), from);
}

export function executeRfq(from: string, pool: PoolSpec, rfqId: string): Promise<TxResult> {
  return send(walletContract(marketAbi, pool.market).methods.execute(rfqId), from);
}
