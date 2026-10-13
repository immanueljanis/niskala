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
    { label: "markets on Monad testnet", value: <Count value={pools.length} /> },
    { label: live ? `rounds, ${settled} settled` : "rounds", value: live ? <Count value={rounds} /> : "—" },
    { label: "to prove a round", value: <Count value={0.6} decimals={1} suffix=" s" /> },
    { label: "gas to verify onchain", value: <Count value={5.8} decimals={1} suffix=" M" /> },
  ];

  return (
    <div className="flex flex-wrap items-baseline gap-x-12 gap-y-5">
      {cells.map((c) => (
        <div key={c.label} className="flex items-baseline gap-2.5">
          <span className="display text-3xl text-text">{c.value}</span>
          <span className="text-sm text-muted">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
