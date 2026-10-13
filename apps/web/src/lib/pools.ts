import { MAX_SLOTS, MIN_SLOTS, loadRegistry, type ChainRegistry, type PoolSpec, type PoolStats, type PoolWithStats, type TokenInfo } from "@niskala/sdk";
import { CHAIN_ID } from "./chain/network";

export type { PoolSpec, PoolStats, PoolWithStats, TokenInfo };
export { MAX_SLOTS, MIN_SLOTS };

let chain: ChainRegistry | undefined;
try {
  chain = loadRegistry(CHAIN_ID);
} catch {
  chain = undefined;
}

export const QUOTE: TokenInfo = chain?.quote ?? { symbol: "USDC", name: "USDC", decimals: 6, address: "", logo: "/tokens/usdc.png" };
export const VERIFIER = chain?.verifier ?? "";
export const POOLS: PoolSpec[] = chain?.pools ?? [];
export const DEFAULT_POOL: PoolSpec | undefined = POOLS[0];

export function poolBySlug(slug: string | undefined): PoolSpec | undefined {
  return POOLS.find((p) => p.slug === slug);
}
