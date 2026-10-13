"use client";

import { useEffect, useState } from "react";
import { api, type MakerPublic } from "./api";
import { POOLS, type PoolWithStats } from "./pools";

/** Pool registry merged with live coordinator stats; falls back to the static registry when the coordinator is down. */
export function usePools(intervalMs = 8000): { pools: PoolWithStats[]; makers: MakerPublic[]; live: boolean | null } {
  const [pools, setPools] = useState<PoolWithStats[]>(POOLS);
  const [makers, setMakers] = useState<MakerPublic[]>([]);
  const [live, setLive] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await api.pools();
        if (!alive) return;
        const bySlug = new Map(r.pools.map((p) => [p.slug, p]));
        setPools(POOLS.map((p) => bySlug.get(p.slug) ?? p));
        setMakers(r.makers);
        setLive(true);
      } catch {
        if (alive) setLive(false);
      }
    };
    load();
    const t = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [intervalMs]);

  return { pools, makers, live };
}
