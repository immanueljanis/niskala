import type { HypersyncClient, Log, Query } from "@envio-dev/hypersync-client";
import { abi, web3 } from "./chain.ts";
import { config } from "./config.ts";
import { makerByAddress } from "./makers.ts";
import { pools, type Pool } from "./pools.ts";
import { ensureRound, updateRound, type ProofRecord } from "./rounds.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Round history from Envio HyperSync. Every RfqMarket event across all markets is fetched in one paginated query
 * (no 100-block eth_getLogs windows), together with the submitProof transaction inputs and block timestamps, and
 * folded into the round records: commit transactions (including external makers), the proof bytes and gas, the
 * settlement, cancellations. A fresh host rebuilds the full history in seconds instead of inheriting a data file.
 */
const HYPERSYNC: Record<string, string> = { "10143": "https://monad-testnet.hypersync.xyz", "143": "https://143.hypersync.xyz" };
export const historyEnabled = config.envioApiToken !== "" && HYPERSYNC[config.chainId.toString()] !== undefined;

const EVENT_NAMES = new Set(["RfqCreated", "QuoteCommitted", "BestExecutionProven", "RfqSettled", "RfqCancelled"]);
const events: any[] = abi("RfqMarket").filter((f) => f.type === "event" && EVENT_NAMES.has(f.name));
const byTopic = new Map<string, any>(events.map((e) => [web3.eth.abi.encodeEventSignature(e).toLowerCase(), e]));
const SUBMIT_PROOF = web3.eth.abi.encodeFunctionSignature("submitProof(uint256,uint8,uint64,bytes)").toLowerCase();

export interface MarketEvent {
  name: string;
  market: string;
  rfqId: string;
  blockNumber: number;
  logIndex: number;
  txHash: string;
  args: Record<string, string>;
}

export interface History {
  events: MarketEvent[];
  txInput: Map<string, { input: string; gasUsed?: number }>;
  blockTime: Map<number, number>;
  nextBlock: number;
  height: number;
}

export function decodeMarketLog(log: Log): MarketEvent | null {
  const topic0 = log.topics[0]?.toLowerCase();
  const ev = topic0 ? byTopic.get(topic0) : undefined;
  if (!ev || !log.address || !log.transactionHash || log.blockNumber === undefined) return null;
  const topics = log.topics.slice(1).filter((t): t is string => typeof t === "string");
  const decoded: any = web3.eth.abi.decodeLog(ev.inputs, log.data ?? "0x", topics);
  const args: Record<string, string> = {};
  for (const input of ev.inputs) args[input.name] = String(decoded[input.name]);
  return { name: ev.name, market: log.address.toLowerCase(), rfqId: args.rfqId, blockNumber: log.blockNumber, logIndex: log.logIndex ?? 0, txHash: log.transactionHash.toLowerCase(), args };
}

/** Proof bytes and winner from a submitProof(uint256,uint8,uint64,bytes) transaction input. */
export function proofFromCalldata(input: string): { proof: string; winnerIndex: number; winningPriceE6: string } | null {
  if (!input.toLowerCase().startsWith(SUBMIT_PROOF)) return null;
  const d: any = web3.eth.abi.decodeParameters(["uint256", "uint8", "uint64", "bytes"], `0x${input.slice(10)}`);
  return { proof: String(d[3]), winnerIndex: Number(d[1]), winningPriceE6: BigInt(d[2]).toString() };
}

let client: Promise<HypersyncClient> | undefined;
/** Loaded lazily: the native binding is only needed when the sync is on, and a host without it must still boot. */
function hypersync(): Promise<HypersyncClient> {
  client ??= import("@envio-dev/hypersync-client").then((m) => new m.HypersyncClient({ url: HYPERSYNC[config.chainId.toString()], apiToken: config.envioApiToken }));
  return client;
}

export async function fetchHistory(fromBlock: number, toBlock?: number): Promise<History> {
  const markets = pools.map((p) => p.spec.market.toLowerCase());
  const out: History = { events: [], txInput: new Map(), blockTime: new Map(), nextBlock: fromBlock, height: fromBlock };
  let from = fromBlock;
  for (let page = 0; page < 500; page++) {
    const query: Query = {
      fromBlock: from,
      toBlock,
      logs: [{ address: markets, topics: [[...byTopic.keys()]] }],
      fieldSelection: {
        log: ["Address", "Topic0", "Topic1", "Topic2", "Topic3", "Data", "BlockNumber", "LogIndex", "TransactionHash"],
        transaction: ["Hash", "Input", "GasUsed"],
        block: ["Number", "Timestamp"],
      },
    };
    const res = await (await hypersync()).get(query);
    for (const l of res.data.logs) {
      const e = decodeMarketLog(l);
      if (e) out.events.push(e);
    }
    for (const t of res.data.transactions) if (t.hash && t.input) out.txInput.set(t.hash.toLowerCase(), { input: t.input, gasUsed: t.gasUsed === undefined ? undefined : Number(t.gasUsed) });
    for (const b of res.data.blocks) if (b.number !== undefined && b.timestamp !== undefined) out.blockTime.set(b.number, Number(b.timestamp));
    out.height = res.archiveHeight ?? res.nextBlock;
    out.nextBlock = res.nextBlock;
    if (res.nextBlock >= (toBlock ?? out.height) || res.nextBlock <= from) break;
    from = res.nextBlock;
  }
  out.events.sort((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex);
  return out;
}

function poolOfMarket(market: string): Pool | undefined {
  return pools.find((p) => p.spec.market.toLowerCase() === market);
}

/** Folds events into the round records; idempotent, so overlapping fetches are safe. Returns the number of updates. */
export function applyHistory(h: History): number {
  let changed = 0;
  for (const e of h.events) {
    const pool = poolOfMarket(e.market);
    if (!pool) continue;
    const round = ensureRound(pool.slug, e.rfqId);
    const at = (h.blockTime.get(e.blockNumber) ?? 0) * 1000;
    if (e.name === "RfqCreated" && !round.createTxHash) {
      updateRound(pool.slug, e.rfqId, { createTxHash: e.txHash });
      changed++;
    } else if (e.name === "QuoteCommitted" && !round.commits.some((c) => c.maker.toLowerCase() === e.args.maker.toLowerCase())) {
      const maker = e.args.maker;
      const mm = makerByAddress(maker);
      round.commits.push({ maker, makerId: mm?.id ?? `ext-${maker.slice(2, 8).toLowerCase()}`, displayName: mm?.displayName ?? `Maker ${maker.slice(0, 6)}…${maker.slice(-4)}`, txHash: e.txHash, blockNumber: e.blockNumber, committedAt: at });
      round.commits.sort((a, b) => a.blockNumber - b.blockNumber);
      updateRound(pool.slug, e.rfqId, {});
      changed++;
    } else if (e.name === "BestExecutionProven" && !round.proof?.txHash) {
      const tx = h.txInput.get(e.txHash);
      const decoded = tx ? proofFromCalldata(tx.input) : null;
      const proof: ProofRecord = {
        proof: decoded?.proof ?? round.proof?.proof ?? "0x",
        publicInputs: round.proof?.publicInputs ?? [],
        proofHash: e.args.proofHash,
        winnerIndex: Number(e.args.winnerIndex),
        winningPriceE6: e.args.winningPriceE6,
        generatedAt: round.proof?.generatedAt ?? at,
        proveMs: round.proof?.proveMs ?? 0,
        txHash: e.txHash,
        blockNumber: e.blockNumber,
        gasUsed: tx?.gasUsed,
        submittedAt: at,
      };
      const finalPhase = round.phase === "settled" || round.phase === "cancelled";
      updateRound(pool.slug, e.rfqId, { proof, phase: finalPhase ? round.phase : "proven", error: undefined, note: undefined });
      changed++;
    } else if (e.name === "RfqSettled" && !round.settleTxHash) {
      const final = round.final ?? { status: 4, usdcPaid: e.args.usdcPaid, winningPriceE6: round.proof?.winningPriceE6 ?? "0", amountOut: e.args.amountOut };
      updateRound(pool.slug, e.rfqId, { settleTxHash: e.txHash, phase: "settled", final });
      changed++;
    } else if (e.name === "RfqCancelled" && !round.final) {
      updateRound(pool.slug, e.rfqId, { phase: "cancelled", final: { status: 5, usdcPaid: "0", winningPriceE6: "0", amountOut: "0" } });
      changed++;
    }
  }
  return changed;
}

let cursor = config.historyFromBlock;

export async function syncHistory() {
  const from = Math.max(config.historyFromBlock, cursor - 64);
  const h = await fetchHistory(from);
  const changed = applyHistory(h);
  cursor = h.nextBlock;
  return { from, events: h.events.length, changed, height: h.height };
}

export function startHistory(intervalMs = 20_000) {
  const log = (...a: unknown[]) => console.log(new Date().toISOString(), ...a);
  if (!historyEnabled) {
    log("history: HyperSync off (set ENVIO_API_TOKEN); transaction hashes come from windowed eth_getLogs scans");
    return;
  }
  log(`history: HyperSync ${HYPERSYNC[config.chainId.toString()]} from block ${config.historyFromBlock}`);
  const loop = async () => {
    try {
      const r = await syncHistory();
      if (r.changed > 0 || r.from === config.historyFromBlock) log(`history: ${r.events} events from block ${r.from}, ${r.changed} round updates, height ${r.height}`);
    } catch (err) {
      log("history: sync failed:", (err as Error).message);
    }
    setTimeout(loop, intervalMs);
  };
  void loop();
}
