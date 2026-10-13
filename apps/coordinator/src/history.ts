import { abi, web3 } from "./chain.ts";
import { config } from "./config.ts";
import { makerByAddress } from "./makers.ts";
import { pools, type Pool } from "./pools.ts";
import { ensureRound, updateRound, type ProofRecord } from "./rounds.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Round history from Envio HyperSync (JSON HTTP API, https://docs.envio.dev/docs/HyperSync/hypersync-query).
 * Every RfqMarket event across all markets is fetched in one paginated query (no 100-block eth_getLogs windows),
 * together with the submitProof transaction inputs and block timestamps, and folded into the round records:
 * commit transactions (including external makers), the proof bytes and gas, the settlement, cancellations.
 * A fresh host rebuilds the full history in seconds instead of inheriting a data file.
 */
const HYPERSYNC: Record<string, string> = { "10143": "https://monad-testnet.hypersync.xyz", "143": "https://143.hypersync.xyz" };
export const historyEnabled = config.envioApiToken !== "" && HYPERSYNC[config.chainId.toString()] !== undefined;

const EVENT_NAMES = new Set(["RfqCreated", "QuoteCommitted", "BestExecutionProven", "RfqSettled", "RfqCancelled"]);
const events: any[] = abi("RfqMarket").filter((f) => f.type === "event" && EVENT_NAMES.has(f.name));
const byTopic = new Map<string, any>(events.map((e) => [web3.eth.abi.encodeEventSignature(e).toLowerCase(), e]));
const SUBMIT_PROOF = web3.eth.abi.encodeFunctionSignature("submitProof(uint256,uint8,uint64,bytes)").toLowerCase();

/** A log as the coordinator consumes it (HyperSync's snake_case rows are mapped onto this). */
export interface MarketLog {
  address?: string;
  topics: Array<string | null | undefined>;
  data?: string;
  blockNumber?: number;
  logIndex?: number;
  transactionHash?: string;
}

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

interface HsResponse {
  data: Array<{
    logs?: Array<{ address: string; data?: string; topic0?: string | null; topic1?: string | null; topic2?: string | null; topic3?: string | null; block_number: number; log_index: number; transaction_hash: string }>;
    transactions?: Array<{ hash: string; input?: string; gas_used?: string | number }>;
    blocks?: Array<{ number: number; timestamp: string | number }>;
  }>;
  next_block: number;
  archive_height?: number;
}

export function decodeMarketLog(log: MarketLog): MarketEvent | null {
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

async function query(body: Record<string, unknown>): Promise<HsResponse> {
  const res = await fetch(`${HYPERSYNC[config.chainId.toString()]}/query`, {
    method: "POST",
    headers: { authorization: `Bearer ${config.envioApiToken}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`hypersync ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as HsResponse;
}

const num = (v: string | number | undefined): number | undefined => (v === undefined ? undefined : Number(BigInt(v)));

export async function fetchHistory(fromBlock: number, toBlock?: number): Promise<History> {
  const markets = pools.map((p) => p.spec.market.toLowerCase());
  const out: History = { events: [], txInput: new Map(), blockTime: new Map(), nextBlock: fromBlock, height: fromBlock };
  let from = fromBlock;
  for (let page = 0; page < 500; page++) {
    const res = await query({
      from_block: from,
      ...(toBlock === undefined ? {} : { to_block: toBlock }),
      logs: [{ address: markets, topics: [[...byTopic.keys()]] }],
      field_selection: {
        log: ["address", "topic0", "topic1", "topic2", "topic3", "data", "block_number", "log_index", "transaction_hash"],
        transaction: ["hash", "input", "gas_used"],
        block: ["number", "timestamp"],
      },
    });
    for (const chunk of res.data) {
      for (const l of chunk.logs ?? []) {
        const e = decodeMarketLog({ address: l.address, topics: [l.topic0, l.topic1, l.topic2, l.topic3], data: l.data, blockNumber: l.block_number, logIndex: l.log_index, transactionHash: l.transaction_hash });
        if (e) out.events.push(e);
      }
      for (const t of chunk.transactions ?? []) if (t.hash && t.input) out.txInput.set(t.hash.toLowerCase(), { input: t.input, gasUsed: num(t.gas_used) });
      for (const b of chunk.blocks ?? []) if (b.number !== undefined && b.timestamp !== undefined) out.blockTime.set(b.number, num(b.timestamp) ?? 0);
    }
    out.height = res.archive_height ?? res.next_block;
    out.nextBlock = res.next_block;
    if (res.next_block >= (toBlock ?? out.height) || res.next_block <= from) break;
    from = res.next_block;
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

/** What `/api/health` reports so anyone can check where the round history comes from. */
export const historyStatus: { source: "envio-hypersync" | "eth_getLogs"; endpoint?: string; fromBlock?: number; height?: number; events?: number; syncedAt?: number } = historyEnabled
  ? { source: "envio-hypersync", endpoint: HYPERSYNC[config.chainId.toString()], fromBlock: config.historyFromBlock }
  : { source: "eth_getLogs" };

export async function syncHistory() {
  const from = Math.max(config.historyFromBlock, cursor - 64);
  const h = await fetchHistory(from);
  const changed = applyHistory(h);
  cursor = h.nextBlock;
  Object.assign(historyStatus, { height: h.height, events: (historyStatus.events ?? 0) + (from === config.historyFromBlock ? h.events.length : 0), syncedAt: Date.now() });
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
