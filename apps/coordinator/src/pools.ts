import { readFileSync } from "node:fs";
import type { ChainRegistry, PoolSpec, PoolStats, TokenInfo } from "@niskala/sdk";
import { config } from "./config.ts";
import { contractAt } from "./chain.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type { PoolSpec, PoolStats, TokenInfo };
export type Registry = ChainRegistry;

export class Pool {
  readonly market: any;
  readonly base: any;
  domain = 0n;
  stats: PoolStats = { rounds: 0, settled: 0, volumeUsdc: "0", lastPriceE6: null, liquidityBase: "0", updatedAt: 0 };

  constructor(readonly spec: PoolSpec) {
    this.market = contractAt("RfqMarket", spec.market);
    this.base = contractAt("MockERC20", spec.base.address);
  }

  get slug() {
    return this.spec.slug;
  }

  public() {
    return { ...this.spec, stats: this.stats };
  }
}

const raw = JSON.parse(readFileSync(config.poolsFile, "utf8")) as Record<string, Registry>;
export const registry: Registry | undefined = raw[config.chainId.toString()];
if (!registry) throw new Error(`no pools registered for chain ${config.chainId} in ${config.poolsFile}`);

export const pools: Pool[] = registry.pools.filter((p) => p.market && p.base.address).map((p) => new Pool(p));
if (pools.length === 0) throw new Error(`chain ${config.chainId} has no deployed pools`);

export const usdc: any = contractAt("MockERC20", registry.quote.address);

export function poolBySlug(slug: string): Pool | undefined {
  return pools.find((p) => p.slug === slug);
}
