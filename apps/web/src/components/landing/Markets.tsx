"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PoolLogo } from "@/components/PoolLogo";
import { fmtPriceE6, fmtUnits } from "@/lib/format";
import { usePools } from "@/lib/usePools";

function price(p: { stats?: { lastPriceE6: string | null }; referencePriceE6: string }) {
  const v = p.stats?.lastPriceE6 ?? null;
  if (v) return { text: fmtPriceE6(v), label: "last proven" };
  return { text: fmtPriceE6(p.referencePriceE6), label: "reference" };
}

export function Markets() {
  const { pools, live } = usePools();
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pools.map((p) => {
          const pr = price(p);
          return (
            <Link key={p.slug} href={`/trade?pool=${p.slug}`} className="tile group flex flex-col gap-5 p-5 transition-colors hover:bg-[#e2e8e5]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PoolLogo pool={p} size={34} />
                  <div>
                    <div className="text-sm text-text">
                      {p.base.symbol} / USDC
                    </div>
                    <div className="text-xs text-dim">{p.tier}</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-dim transition-colors group-hover:text-text" strokeWidth={1.6} />
              </div>
              <div>
                <div className="display text-2xl tabular-nums">{pr.text}</div>
                <div className="text-xs text-dim">USDC · {pr.label}</div>
              </div>
              <div className="flex items-end justify-between text-xs text-muted">
                <span>
                  {p.stats ? fmtUnits(p.stats.liquidityBase, p.base.decimals, 0) : p.makerDeposit} {p.base.symbol} maker liquidity
                </span>
                <span className="mono">{p.stats ? `${p.stats.rounds} rounds` : live === false ? "" : "…"}</span>
              </div>
            </Link>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-dim">Every market is its own RfqMarket contract on Monad testnet with the same five makers and the same verifier. Mock tokens; prices reference live market data.</p>
    </div>
  );
}
