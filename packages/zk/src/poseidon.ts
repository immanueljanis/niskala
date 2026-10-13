import { Barretenberg } from "@aztec/bb.js";
import { fromField, toField } from "./fields.ts";

let apiPromise: Promise<Barretenberg> | undefined;

/** Shared Barretenberg instance (WASM, multi-threaded when available). */
export function getBarretenberg(): Promise<Barretenberg> {
  apiPromise ??= Barretenberg.new({ threads: Math.min(8, Math.max(1, (globalThis.navigator?.hardwareConcurrency ?? 8))) });
  return apiPromise;
}

export async function poseidon2(inputs: Array<bigint | number | string>): Promise<bigint> {
  const api = await getBarretenberg();
  const { hash } = await api.poseidon2Hash({ inputs: inputs.map(toField) });
  return fromField(hash);
}

export interface QuoteOpening {
  domain: bigint;
  rfqId: bigint;
  maker: string;
  priceE6: bigint;
  salt: bigint;
}

/** Commitment = Poseidon2(domain, rfqId, maker, priceE6, salt). Mirrors circuits/best_quote. */
export function quoteCommitment(q: QuoteOpening): Promise<bigint> {
  return poseidon2([q.domain, q.rfqId, BigInt(q.maker), q.priceE6, q.salt]);
}
