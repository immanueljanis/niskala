"use client";

import { useEffect, useState } from "react";
import { api, type RoundView } from "@/lib/api";
import { getRfq } from "@/lib/chain/contracts";
import { poolBySlug } from "@/lib/pools";

export interface RoundState {
  view: RoundView | null;
  coordinatorOffline: boolean;
  error: string | null;
  now: number;
}

/** Polls the coordinator (chain + offchain view); falls back to a direct chain read when it is down. */
export function useRound(poolSlug: string, rfqId: string, intervalMs = 1000): RoundState {
  const [view, setView] = useState<RoundView | null>(null);
  const [coordinatorOffline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    const spec = poolBySlug(poolSlug);
    if (!spec) {
      setError(`Unknown market "${poolSlug}"`);
      return;
    }
    const load = async () => {
      try {
        const v = await api.round(poolSlug, rfqId);
        if (!alive) return;
        setView(v);
        setOffline(false);
        setError(null);
      } catch {
        try {
          const chain = await getRfq(spec, rfqId);
          if (!alive) return;
          if (chain.status === 0) setError("Unknown RFQ");
          setView((prev) => ({
            pool: prev?.pool ?? spec,
            chain,
            offchain: prev?.offchain ?? { rfqId, phase: "open", commits: [], updatedAt: 0 },
            makers: prev?.makers ?? [],
            explorerTxBase: prev?.explorerTxBase ?? "",
          }));
          setOffline(true);
        } catch (err) {
          if (alive) setError((err as Error).message);
        }
      }
    };
    load();
    const t = setInterval(load, intervalMs);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      clearInterval(t);
      clearInterval(clock);
    };
  }, [poolSlug, rfqId, intervalMs]);

  return { view, coordinatorOffline, error, now };
}
