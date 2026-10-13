import { config } from "./config.ts";
import { pools, type Pool } from "./pools.ts";

let cache: { at: number; usd: Record<string, number>; source: string } = { at: 0, usd: {}, source: "config" };

async function refresh() {
  if (Date.now() - cache.at < 60_000) return;
  const ids = [...new Set(pools.map((p) => p.spec.coingeckoId))].join(",");
  try {
    const res = await fetch(`${config.priceFeedUrl}${ids}`, { signal: AbortSignal.timeout(3000) });
    const json = (await res.json()) as Record<string, { usd?: number }>;
    const usd: Record<string, number> = {};
    for (const [id, v] of Object.entries(json)) if (typeof v?.usd === "number" && v.usd > 0) usd[id] = v.usd;
    cache = { at: Date.now(), usd, source: Object.keys(usd).length ? "coingecko" : "config" };
  } catch {
    cache = { at: Date.now(), usd: cache.usd, source: Object.keys(cache.usd).length ? "coingecko (stale)" : "config" };
  }
}

/** Reference mid price for a pool (USDC per base unit, 6 decimals). Live feed when reachable, registry fallback otherwise. */
export async function referenceMidE6(pool: Pool): Promise<{ midE6: bigint; source: string }> {
  await refresh();
  const usd = cache.usd[pool.spec.coingeckoId];
  if (usd) return { midE6: BigInt(Math.round(usd * 1e6)), source: cache.source };
  return { midE6: BigInt(pool.spec.referencePriceE6), source: "config" };
}
