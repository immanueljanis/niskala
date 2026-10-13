import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config.ts";
import { poolBySlug, registry } from "./pools.ts";

export type Phase = "open" | "committing" | "closed" | "proving" | "submitting" | "proven" | "settled" | "cancelled" | "error";

export interface CommitRecord {
  maker: string;
  makerId: string;
  displayName: string;
  txHash: string;
  blockNumber: number;
  committedAt: number;
}

export interface ProofRecord {
  proof: string;
  publicInputs: string[];
  proofHash: string;
  winnerIndex: number;
  winningPriceE6: string;
  generatedAt: number;
  proveMs: number;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: number;
  submittedAt?: number;
}

/** Private quote opening. Lives only in this process (and its local data file). */
interface Opening {
  priceE6: string;
  salt: string;
}

export interface Round {
  pool: string;
  /** Market contract address: rounds are keyed by it so a redeployed pool never inherits old records. */
  market: string;
  rfqId: string;
  phase: Phase;
  commits: CommitRecord[];
  openings: Record<string, Opening>;
  referencePriceE6?: string;
  proof?: ProofRecord;
  createTxHash?: string;
  settleTxHash?: string;
  /** Next from-block per event name for the windowed log scan (public RPCs cap eth_getLogs ranges). */
  scan?: Record<string, number>;
  /** Snapshot of final chain facts for pool stats (set when the round reaches a final status). */
  final?: { status: number; usdcPaid: string; winningPriceE6: string; amountOut: string };
  error?: string;
  /** Neutral status line for the UI (for example: waiting for an external maker's opening). */
  note?: string;
  updatedAt: number;
}

const rounds = new Map<string, Round>();

function marketOf(pool: string): string {
  const spec = poolBySlug(pool)?.spec;
  if (!spec) throw new Error(`unknown pool ${pool}`);
  return spec.market.toLowerCase();
}

const key = (market: string, rfqId: string) => `${market.toLowerCase()}:${rfqId}`;

export function loadRounds() {
  if (!existsSync(config.dataFile)) return;
  const raw = JSON.parse(readFileSync(config.dataFile, "utf8")) as Array<Round & { market?: string }>;
  const legacy = (registry as { legacy?: { markets?: Record<string, string> } } | undefined)?.legacy?.markets ?? {};
  for (const r of raw) {
    if (!r.pool) continue;
    const market = (r.market ?? legacy[r.pool] ?? "").toLowerCase();
    if (!market) continue;
    rounds.set(key(market, r.rfqId), { ...r, market });
  }
}

let saveTimer: NodeJS.Timeout | undefined;
function saveNow() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = undefined;
  mkdirSync(dirname(config.dataFile), { recursive: true });
  writeFileSync(config.dataFile, JSON.stringify([...rounds.values()], null, 2));
}
function scheduleSave() {
  saveTimer ??= setTimeout(saveNow, 200);
}

export function getRound(pool: string, rfqId: string): Round | undefined {
  return rounds.get(key(marketOf(pool), rfqId));
}

export function ensureRound(pool: string, rfqId: string): Round {
  const market = marketOf(pool);
  let r = rounds.get(key(market, rfqId));
  if (!r) {
    r = { pool, market, rfqId, phase: "open", commits: [], openings: {}, updatedAt: Date.now() };
    rounds.set(key(market, rfqId), r);
    scheduleSave();
  }
  return r;
}

export function updateRound(pool: string, rfqId: string, patch: Partial<Round>) {
  const r = ensureRound(pool, rfqId);
  Object.assign(r, patch, { updatedAt: Date.now() });
  scheduleSave();
  return r;
}

/** Openings are written to disk immediately: losing one (a hard kill inside the debounce window) makes the round unprovable. */
export function recordOpening(pool: string, rfqId: string, maker: string, opening: Opening) {
  const r = ensureRound(pool, rfqId);
  r.openings[maker.toLowerCase()] = opening;
  r.updatedAt = Date.now();
  saveNow();
}

export function openingFor(round: Round, maker: string): Opening | undefined {
  return round.openings[maker.toLowerCase()];
}

/** Rounds of the pool's current market only. */
export function roundsOf(pool: string): Round[] {
  const market = marketOf(pool);
  return [...rounds.values()].filter((r) => r.market === market);
}

/** What the API may expose: never openings, never losing prices. */
export function publicView(r: Round) {
  const { openings: _hidden, ...rest } = r;
  return rest;
}
