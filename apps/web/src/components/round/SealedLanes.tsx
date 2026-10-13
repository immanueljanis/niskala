"use client";

import type { RoundView } from "@/lib/api";
import { fmtPriceE6, fmtTime, shortAddress } from "@/lib/format";
import { TxLink } from "../ui";
import { MAX_SLOTS } from "@/lib/pools";

export function SealedLanes({ view }: { view: RoundView }) {
  const { chain, offchain, makers } = view;
  const proven = chain.status >= 3 && chain.status !== 5;
  const winner = proven ? chain.makers[chain.winnerIndex]?.toLowerCase() : null;
  const roster = makers.length ? makers : chain.makers.filter(Boolean).map((a, i) => ({ id: `slot-${i}`, address: a, displayName: `Maker ${i + 1}`, tier: "" }));

  return (
    <div className="card">
      <div className="flex items-center justify-between px-6 py-5">
        <div className="text-sm text-text">Sealed quotes</div>
        <span className="mono text-xs text-dim">{chain.commitmentCount} / {MAX_SLOTS} committed</span>
      </div>
      <div className="space-y-2 px-3 pb-3">
        {roster.map((m) => {
          const commit = offchain.commits.find((c) => c.maker.toLowerCase() === m.address.toLowerCase());
          const slot = chain.makers.findIndex((a) => a.toLowerCase() === m.address.toLowerCase());
          const sealed = slot >= 0 && slot < chain.commitmentCount;
          const isWinner = !!winner && m.address.toLowerCase() === winner;
          const tone = isWinner ? "bg-[#e3efe8]" : sealed ? "bg-[#f4ebdb]" : "bg-tile";
          return (
            <div key={m.id} className={`grid items-center gap-3 rounded-lg px-4 py-3.5 md:grid-cols-[1.3fr_1fr_1fr_auto] ${tone} ${sealed ? "animate-seal" : ""}`}>
              <div>
                <div className="text-sm text-text">{m.displayName}</div>
                <div className="text-xs text-dim">
                  {m.tier || "Market maker"} · <span className="mono">{shortAddress(m.address)}</span>
                </div>
              </div>
              <div className="mono text-xs text-muted">{sealed ? <>commitment {chain.commitments[slot].slice(0, 10)}…</> : <span className="text-dim">awaiting</span>}</div>
              <div className="mono text-xs text-muted">
                {commit ? (
                  <>
                    tx <TxLink hash={commit.txHash} /> · {fmtTime(commit.committedAt)}
                  </>
                ) : sealed ? (
                  <span className="text-dim">onchain</span>
                ) : (
                  ""
                )}
              </div>
              <div className={`mono text-right text-xs ${isWinner ? "text-verified" : sealed ? "text-pending" : "text-dim"}`}>{isWinner ? `${fmtPriceE6(chain.winningPriceE6)}  best` : sealed ? "sealed" : "waiting"}</div>
            </div>
          );
        })}
      </div>
      {proven && <div className="px-6 pb-5 text-xs text-dim">Losing quotes remain sealed. They were never sent to the trader or the chain.</div>}
    </div>
  );
}
