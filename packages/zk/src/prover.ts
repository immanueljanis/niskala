import { readFileSync } from "node:fs";
import { Noir, type CompiledCircuit } from "@noir-lang/noir_js";
import { UltraHonkBackend, type ProofData } from "@aztec/bb.js";
import { bytesToHex, toHex32 } from "./fields.ts";
import { getBarretenberg } from "./poseidon.ts";
import { ARTIFACT_PATH } from "./paths.ts";

/** Maximum maker slots per round; must match `global N` in circuits/best_quote and `MAX_SLOTS` in RfqMarket. */
export const MAX_MAKERS = 5;
const EVM = { verifierTarget: "evm" } as const;

export interface RoundWitness {
  domain: bigint;
  rfqId: bigint;
  /** Committed makers in slot order; length = count (1..MAX_MAKERS). */
  makers: string[];
  commitments: bigint[];
  winnerIndex: number;
  winningPriceE6: bigint;
  prices: bigint[];
  salts: bigint[];
}

export interface BestQuoteProof {
  /** Raw UltraHonk proof bytes (hex) for HonkVerifier.verify. */
  proof: `0x${string}`;
  /** Public inputs as bytes32 hex, in circuit declaration order. */
  publicInputs: `0x${string}`[];
}

let circuitPromise: Promise<CompiledCircuit> | undefined;
let backendPromise: Promise<UltraHonkBackend> | undefined;

export function loadCircuit(): Promise<CompiledCircuit> {
  circuitPromise ??= Promise.resolve(JSON.parse(readFileSync(ARTIFACT_PATH, "utf8")) as CompiledCircuit);
  return circuitPromise;
}

export async function getBackend(): Promise<UltraHonkBackend> {
  backendPromise ??= (async () => new UltraHonkBackend((await loadCircuit()).bytecode, await getBarretenberg()))();
  return backendPromise;
}

function pad<T>(arr: T[], fill: T): T[] {
  return [...arr, ...Array.from({ length: MAX_MAKERS - arr.length }, () => fill)];
}

export function validateWitness(w: RoundWitness) {
  const count = w.makers.length;
  if (count < 1 || count > MAX_MAKERS) throw new Error(`expected 1..${MAX_MAKERS} quotes, got ${count}`);
  if (w.commitments.length !== count || w.prices.length !== count || w.salts.length !== count) throw new Error("witness arrays must all have length = count");
  if (w.winnerIndex < 0 || w.winnerIndex >= count) throw new Error("winnerIndex outside committed set");
  return count;
}

export function toCircuitInputs(w: RoundWitness) {
  const count = validateWitness(w);
  return {
    domain: w.domain.toString(),
    rfq_id: w.rfqId.toString(),
    makers: pad(w.makers.map((m) => BigInt(m).toString()), "0"),
    commitments: pad(w.commitments.map((c) => c.toString()), "0"),
    count,
    winner_index: w.winnerIndex,
    winning_price: w.winningPriceE6.toString(),
    prices: pad(w.prices.map((p) => p.toString()), "0"),
    salts: pad(w.salts.map((s) => s.toString()), "0"),
  };
}

/** Public inputs exactly as RfqMarket rebuilds them from storage. */
export function publicInputsOf(w: RoundWitness): `0x${string}`[] {
  const count = validateWitness(w);
  return [
    toHex32(w.domain),
    toHex32(w.rfqId),
    ...pad(w.makers.map((m) => toHex32(BigInt(m))), toHex32(0)),
    ...pad(w.commitments.map(toHex32), toHex32(0)),
    toHex32(count),
    toHex32(w.winnerIndex),
    toHex32(w.winningPriceE6),
  ];
}

/** Deterministic selection rule the circuit enforces: first index with the minimum price. */
export function selectWinner(prices: bigint[]): number {
  let best = 0;
  for (let i = 1; i < prices.length; i++) if (prices[i] < prices[best]) best = i;
  return best;
}

export async function proveBestQuote(w: RoundWitness): Promise<BestQuoteProof> {
  const noir = new Noir(await loadCircuit());
  const { witness } = await noir.execute(toCircuitInputs(w));
  const backend = await getBackend();
  const data = await backend.generateProof(witness, EVM);
  return { proof: bytesToHex(data.proof), publicInputs: data.publicInputs as `0x${string}`[] };
}

export async function verifyBestQuote(p: BestQuoteProof): Promise<boolean> {
  const backend = await getBackend();
  const proofData: ProofData = { proof: Uint8Array.from(Buffer.from(p.proof.slice(2), "hex")), publicInputs: p.publicInputs };
  return backend.verifyProof(proofData, EVM);
}

export async function getVerificationKey(): Promise<Uint8Array> {
  return (await getBackend()).getVerificationKey(EVM);
}

export async function getSolidityVerifier(): Promise<string> {
  const backend = await getBackend();
  return backend.getSolidityVerifier(await backend.getVerificationKey(EVM), EVM);
}
