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

const COLS = "md:grid-cols-[1.5fr_1fr_1fr_0.5fr_1.5rem]";

export function Markets() {
  const { pools } = usePools();
  return (
    <div className="card overflow-hidden">
      <div className={`hidden gap-4 px-6 pb-3 pt-5 text-xs text-dim md:grid ${COLS}`}>
        <span>Market</span>
        <span className="text-right">Price in USDC</span>
        <span className="text-right">Maker liquidity</span>
        <span className="text-right">Rounds</span>
        <span />
      </div>
      <div className="hairline-y">
        {pools.map((p) => {
          const pr = price(p);
          return (
            <Link key={p.slug} href={`/trade?pool=${p.slug}`} className={`group grid grid-cols-[1fr_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-bg ${COLS}`}>
              <div className="flex items-center gap-3">
                <PoolLogo pool={p} size={32} />
                <div>
                  <div className="text-sm text-text">{p.base.symbol} / USDC</div>
                  <div className="text-xs text-dim">
                    {p.base.name} · {p.tier}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="display text-xl tabular-nums">{pr.text}</div>
                <div className="text-xs text-dim">{pr.label}</div>
              </div>
              <div className="hidden text-right text-sm text-muted md:block">
                {p.stats ? fmtUnits(p.stats.liquidityBase, p.base.decimals, 0) : p.makerDeposit} {p.base.symbol}
              </div>
              <div className="mono hidden text-right text-sm text-muted md:block">{p.stats ? p.stats.rounds : "—"}</div>
              <ArrowUpRight className="hidden h-4 w-4 justify-self-end text-dim transition-colors group-hover:text-text md:block" strokeWidth={1.6} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
