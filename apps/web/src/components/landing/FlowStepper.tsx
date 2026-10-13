"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeftRight, FileText, Lock, ShieldCheck, Users, type LucideIcon } from "lucide-react";

interface Step {
  key: string;
  icon: LucideIcon;
  actor: string;
  title: string;
  body: string;
  onchain: string;
  privateNote?: string;
}

const STEPS: Step[] = [
  { key: "request", icon: FileText, actor: "Trader", title: "Request", body: "Open a fixed-size RFQ. Pair, size and direction go onchain. Nothing else does.", onchain: "createRfq → RfqCreated #1" },
  { key: "seal", icon: Users, actor: "Up to five makers", title: "Seal", body: "Each maker sends a Poseidon2 commitment from its own wallet. The commitment locks the full size, so every sealed quote can fill.", onchain: "commit(#1, 0x07c8…) ×3", privateNote: "price and salt stay with the maker and the prover" },
  { key: "close", icon: Lock, actor: "Contract", title: "Close", body: "The window closes at five commitments, or at the deadline with at least three. The set is final.", onchain: "CommitPhaseClosed(#1, count)" },
  { key: "prove", icon: ShieldCheck, actor: "Coordinator → verifier", title: "Prove and verify", body: "A proof shows the winner is the lowest valid quote in the set. The contract rebuilds the public inputs from its own storage and verifies it.", onchain: "submitProof → BestExecutionProven", privateNote: "the two losing prices stay sealed" },
  { key: "settle", icon: ArrowLeftRight, actor: "Trader", title: "Settle", body: "Execute at the proven price. USDC to the winner, the asset to the trader, losers unlocked. One transaction.", onchain: "execute(#1) → RfqSettled" },
];

const EASE = [0.16, 1, 0.3, 1] as const;

function Lane({ name, state, delay = 0 }: { name: string; state: "idle" | "sealed" | "won" | "lost" | "paid"; delay?: number }) {
  const tone = state === "won" || state === "paid" ? "bg-[#e3efe8] text-verified" : state === "sealed" || state === "lost" ? "bg-[#f4ebdb] text-pending" : "bg-surface text-dim";
  const label = state === "won" ? "2,455.60  best" : state === "paid" ? "+24,556.02 USDC" : state === "sealed" || state === "lost" ? "sealed" : "waiting";
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay, duration: 0.5, ease: EASE }} className={`flex h-11 items-center justify-between rounded-lg px-4 ${tone}`}>
      <span className="text-sm text-text">{name}</span>
      <span className="mono text-xs">{label}</span>
    </motion.div>
  );
}

function Stage({ step }: { step: Step["key"] }) {
  const names = ["Niskala MM-01", "Niskala MM-02", "Niskala MM-03"];
  if (step === "request") {
    return (
      <div className="space-y-2.5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="rounded-lg bg-surface p-4">
          <div className="text-xs text-dim">RFQ #1 · public</div>
          <div className="mt-1.5 flex items-baseline gap-3">
            <span className="display text-2xl">Buy 10 WETH</span>
            <span className="text-sm text-muted">with USDC</span>
          </div>
        </motion.div>
        {names.map((n, i) => (
          <Lane key={n} name={n} state="idle" delay={0.1 + i * 0.06} />
        ))}
      </div>
    );
  }
  if (step === "seal" || step === "close") {
    return (
      <div className="space-y-2.5">
        {names.map((n, i) => (
          <Lane key={n} name={n} state="sealed" delay={step === "seal" ? i * 0.25 : 0} />
        ))}
        {step === "close" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center gap-2 rounded-lg bg-surface px-4 py-2.5 text-xs text-muted">
            <Lock className="h-3.5 w-3.5 text-text" strokeWidth={1.6} /> all commitments in · set is final
          </motion.div>
        )}
      </div>
    );
  }
  if (step === "prove") {
    return (
      <div className="space-y-2.5">
        <Lane name="Niskala MM-01" state="lost" />
        <Lane name="Niskala MM-02" state="lost" />
        <Lane name="Niskala MM-03" state="won" delay={0.6} />
        <div className="relative h-px w-full overflow-hidden bg-hairline">
          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.9, ease: EASE }} className="absolute inset-0 origin-left bg-verified" />
        </div>
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.5, ease: EASE }} className="flex items-center justify-between rounded-lg bg-surface px-4 py-2.5">
          <span className="flex items-center gap-2 text-xs text-verified">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.6} /> verify → true
          </span>
          <span className="mono text-xs text-dim">7,232 B · 0.6 s</span>
        </motion.div>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      <Lane name="Niskala MM-03" state="paid" />
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5, ease: EASE }} className="grid grid-cols-2 gap-2.5">
        <div className="rounded-lg bg-surface p-4">
          <div className="text-xs text-dim">trader receives</div>
          <div className="display mt-1 text-2xl">10 WETH</div>
        </div>
        <div className="rounded-lg bg-surface p-4">
          <div className="text-xs text-dim">losing makers</div>
          <div className="mt-1 text-sm text-muted">collateral released</div>
        </div>
      </motion.div>
    </div>
  );
}

export function FlowStepper() {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || reduced) return;
    const t = setTimeout(() => setI((v) => (v + 1) % STEPS.length), 4200);
    return () => clearTimeout(t);
  }, [i, paused, reduced]);

  const step = STEPS[i];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <ol className="space-y-1" aria-label="How a round works">
        {STEPS.map((s, idx) => {
          const active = idx === i;
          return (
            <li key={s.key}>
              <button onClick={() => setI(idx)} aria-current={active ? "step" : undefined} className={`grid w-full grid-cols-[2.25rem_1fr] items-start gap-4 rounded-xl px-4 py-3.5 text-left transition-colors ${active ? "bg-surface shadow-[0_1px_2px_rgba(15,22,19,0.04),0_12px_32px_-20px_rgba(15,22,19,0.18)]" : "hover:bg-surface/70"}`}>
                <span className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-brand text-white" : "bg-tile text-muted"}`}>
                  <s.icon className="h-4 w-4" strokeWidth={1.6} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className={`display text-xl ${active ? "text-text" : "text-muted"}`}>{s.title}</span>
                    <span className="truncate text-xs text-dim">{s.actor}</span>
                  </span>
                  <AnimatePresence initial={false}>
                    {active && (
                      <motion.span initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="block overflow-hidden">
                        <span className="mt-2 block text-sm leading-relaxed text-muted">{s.body}</span>
                        <span className="mono mt-2 block break-words text-xs text-verified">{s.onchain}</span>
                        {s.privateNote && <span className="mono mt-1 block text-xs text-pending">private: {s.privateNote}</span>}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="tile relative min-h-[320px] overflow-hidden p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs text-dim">what the trader sees</span>
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((s, idx) => (
              <span key={s.key} className={`h-1 w-6 rounded-full transition-colors ${idx === i ? "bg-brand" : idx < i ? "bg-dim/50" : "bg-surface"}`} />
            ))}
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <Stage step={step.key} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
