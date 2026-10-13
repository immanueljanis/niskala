import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config.ts";

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
  updatedAt: number;
}

const rounds = new Map<string, Round>();
const key = (pool: string, rfqId: string) => `${pool}:${rfqId}`;

export function loadRounds() {
  if (!existsSync(config.dataFile)) return;
  const raw = JSON.parse(readFileSync(config.dataFile, "utf8")) as Round[];
  for (const r of raw) if (r.pool) rounds.set(key(r.pool, r.rfqId), r);
}

let saveTimer: NodeJS.Timeout | undefined;
function scheduleSave() {
  saveTimer ??= setTimeout(() => {
    saveTimer = undefined;
    mkdirSync(dirname(config.dataFile), { recursive: true });
    writeFileSync(config.dataFile, JSON.stringify([...rounds.values()], null, 2));
  }, 200);
}

export function getRound(pool: string, rfqId: string): Round | undefined {
  return rounds.get(key(pool, rfqId));
}

export function ensureRound(pool: string, rfqId: string): Round {
  let r = rounds.get(key(pool, rfqId));
  if (!r) {
    r = { pool, rfqId, phase: "open", commits: [], openings: {}, updatedAt: Date.now() };
    rounds.set(key(pool, rfqId), r);
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

export function recordOpening(pool: string, rfqId: string, maker: string, opening: Opening) {
  const r = ensureRound(pool, rfqId);
  r.openings[maker.toLowerCase()] = opening;
  r.updatedAt = Date.now();
  scheduleSave();
}

export function openingFor(round: Round, maker: string): Opening | undefined {
  return round.openings[maker.toLowerCase()];
}

export function roundsOf(pool: string): Round[] {
  return [...rounds.values()].filter((r) => r.pool === pool);
}

/** What the API may expose: never openings, never losing prices. */
export function publicView(r: Round) {
  const { openings: _hidden, ...rest } = r;
  return rest;
}
