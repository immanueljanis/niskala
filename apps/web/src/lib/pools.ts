import registry from "../../../../packages/pools/pools.json";
import { CHAIN_ID } from "./chain/network";

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  logo: string;
}

export interface PoolSpec {
  slug: string;
  base: TokenInfo;
  market: string;
  coingeckoId: string;
  referencePriceE6: string;
  defaultSize: string;
  maxSize: string;
  makerDeposit: string;
  commitWindowSec: number;
  settleWindowSec: number;
  tier: string;
  description: string;
}

export interface PoolStats {
  rounds: number;
  settled: number;
  volumeUsdc: string;
  lastPriceE6: string | null;
  liquidityBase: string;
  updatedAt: number;
}

export type PoolWithStats = PoolSpec & { stats?: PoolStats };

interface Registry {
  verifier: string;
  makers: string[];
  quote: TokenInfo;
  pools: PoolSpec[];
}

const chain = (registry as Record<string, Registry>)[String(CHAIN_ID)];

export const QUOTE: TokenInfo = chain?.quote ?? { symbol: "USDC", name: "USDC", decimals: 6, address: "", logo: "/tokens/usdc.png" };
export const VERIFIER = chain?.verifier ?? "";
export const POOLS: PoolSpec[] = (chain?.pools ?? []).filter((p) => p.market && p.base.address);
export const DEFAULT_POOL: PoolSpec | undefined = POOLS[0];

/** Maker slots per round: a round closes at MAX_SLOTS commitments or at the deadline with at least MIN_SLOTS. */
export const MAX_SLOTS = 5;
export const MIN_SLOTS = 3;

export function poolBySlug(slug: string | undefined): PoolSpec | undefined {
  return POOLS.find((p) => p.slug === slug);
}
