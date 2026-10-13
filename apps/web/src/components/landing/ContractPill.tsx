"use client";

import { useState } from "react";
import { Check, Copy, ArrowUpRight } from "lucide-react";
import { NETWORK, addressUrl } from "@/lib/chain/network";
import { shortAddress } from "@/lib/format";
import { DEFAULT_POOL, POOLS } from "@/lib/pools";

export function ContractPill() {
  const [copied, setCopied] = useState(false);
  const market = DEFAULT_POOL?.market;
  if (!market) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(market);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked; the explorer link still works */
    }
  };
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-surface py-1.5 pl-4 pr-1.5 text-xs shadow-[0_1px_2px_rgba(15,22,19,0.05),0_8px_24px_-16px_rgba(15,22,19,0.2)]">
      <span className="text-dim">
        {POOLS.length} markets · {NETWORK.name} · {DEFAULT_POOL?.base.symbol}/USDC
      </span>
      <span className="mono hidden text-text sm:inline">{shortAddress(market, 8)}</span>
      <span className="mono text-text sm:hidden">{shortAddress(market, 4)}</span>
      <button onClick={copy} aria-label="Copy contract address" className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-tile hover:text-text">
        {copied ? <Check className="h-3.5 w-3.5 text-verified" strokeWidth={1.8} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.6} />}
      </button>
      <a href={addressUrl(market)} target="_blank" rel="noreferrer" aria-label="Open contract on explorer" className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-tile hover:text-text">
        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.6} />
      </a>
    </div>
  );
}
