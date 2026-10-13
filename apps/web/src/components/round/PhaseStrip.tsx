"use client";

import { ArrowLeftRight, Lock, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import type { RoundView } from "@/lib/api";
import { fmtCountdown } from "@/lib/format";
import { TxLink } from "../ui";
import { MAX_SLOTS } from "@/lib/pools";

type StepState = "todo" | "active" | "done" | "failed";

const ICONS: Record<string, LucideIcon> = { sealed: Users, proving: Lock, verified: ShieldCheck, settled: ArrowLeftRight };

function iconBox(s: StepState) {
  return s === "done" ? "bg-[#e3efe8] text-verified" : s === "active" ? "bg-brand text-white" : s === "failed" ? "bg-[#f6e3e2] text-error" : "bg-tile text-dim";
}

export function PhaseStrip({ view, now }: { view: RoundView; now: number }) {
  const { chain, offchain } = view;
  const cancelled = chain.status === 5;
  const sealed: StepState = chain.status >= 2 && !cancelled ? "done" : cancelled ? "failed" : "active";
  const proving: StepState = chain.status >= 3 && !cancelled ? "done" : chain.status === 2 ? (offchain.phase === "error" ? "failed" : "active") : cancelled ? "failed" : "todo";
  const verified: StepState = chain.status >= 3 && !cancelled ? "done" : cancelled ? "failed" : "todo";
  const settled: StepState = chain.status === 4 ? "done" : chain.status === 3 ? "active" : cancelled ? "failed" : "todo";

  const steps: Array<{ key: string; label: string; state: StepState; detail?: React.ReactNode }> = [
    { key: "sealed", label: "Sealed quotes", state: sealed, detail: sealed === "active" ? `${chain.commitmentCount}/${MAX_SLOTS} · ${fmtCountdown(chain.commitDeadline, now)}` : `${chain.commitmentCount} / ${MAX_SLOTS}` },
    { key: "proving", label: "Proving", state: proving, detail: offchain.proof?.proveMs ? `${(offchain.proof.proveMs / 1000).toFixed(1)} s` : proving === "active" ? (offchain.phase === "submitting" ? "submitting" : "generating") : undefined },
    { key: "verified", label: "Verified onchain", state: verified, detail: offchain.proof?.txHash ? <TxLink hash={offchain.proof.txHash} /> : undefined },
    { key: "settled", label: "Settled", state: settled, detail: settled === "active" ? `by ${fmtCountdown(chain.settleDeadline, now)}` : undefined },
  ];

  return (
    <div className="card grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((s) => {
        const Icon = ICONS[s.key];
        return (
          <div key={s.key} className="flex items-center gap-3 rounded-lg px-3 py-3">
            <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg ${iconBox(s.state)}`}>
              <Icon className="h-4 w-4" strokeWidth={1.6} />
              {s.state === "active" && <span className="absolute inset-x-0 bottom-0 h-0.5 w-1/3 bg-white/70 animate-sweep" />}
            </span>
            <div className="min-w-0">
              <div className={`text-sm ${s.state === "todo" ? "text-dim" : "text-text"}`}>{s.label}</div>
              <div className="mono truncate text-xs text-muted">{s.detail ?? " "}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
