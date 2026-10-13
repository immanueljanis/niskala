"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { usePools } from "@/lib/usePools";

function Count({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const reduced = useReducedMotion();
  const [v, setV] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) return setV(value);
    const c = animate(0, value, { duration: 1.1, ease: [0.16, 1, 0.3, 1], onUpdate: setV });
    return () => c.stop();
  }, [value, reduced]);
  return (
    <span className="tabular-nums">
      {v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

export function StatsStrip() {
  const { pools, live } = usePools();
  const rounds = pools.reduce((acc, p) => acc + (p.stats?.rounds ?? 0), 0);
  const settled = pools.reduce((acc, p) => acc + (p.stats?.settled ?? 0), 0);

  const cells = [
    { label: "markets on Monad testnet", value: <Count value={pools.length} />, sub: "one contract each, one shared verifier" },
    { label: "rounds so far", value: live ? <Count value={rounds} /> : "—", sub: live ? `${settled} settled` : "coordinator offline" },
    { label: "time to prove", value: <Count value={0.6} decimals={1} suffix=" s" />, sub: "7,232-byte UltraHonk proof" },
    { label: "verification gas", value: <Count value={5.8} decimals={1} suffix=" M" />, sub: "one contract call" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cells.map((c) => (
        <div key={c.label} className="tile px-6 py-6">
          <div className="display text-4xl text-text">{c.value}</div>
          <div className="mt-2 text-sm text-muted">{c.label}</div>
          <div className="mt-1 text-xs text-dim">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
