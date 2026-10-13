import { Box, ShieldCheck, User, Users } from "lucide-react";

function Node({ icon: Icon, label, tone = "neutral" }: { icon: typeof Box; label: string; tone?: "neutral" | "verified" | "muted" }) {
  const cls = tone === "verified" ? "bg-[#e3efe8] text-verified" : tone === "muted" ? "bg-surface text-dim" : "bg-surface text-text";
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${cls}`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={1.6} />
      {label}
    </div>
  );
}

function Arrow({ dashed = false }: { dashed?: boolean }) {
  return <span className={`h-px w-6 shrink-0 ${dashed ? "border-t border-dashed border-dim" : "bg-dim"}`} aria-hidden />;
}

export function Compare() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="tile p-7">
        <div className="text-xs text-dim">RFQ today</div>
        <div className="display mt-2 text-2xl">Private quotes, trusted routing.</div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Node icon={User} label="Trader" />
          <Arrow />
          <Node icon={Box} label="Router picks a quote" tone="muted" />
          <Arrow dashed />
          <Node icon={Users} label="Makers quote privately" />
        </div>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">The trader cannot check the router&apos;s claim that the selected quote was the best valid one it saw.</p>
      </div>
      <div className="rounded-xl bg-brand p-7 text-white">
        <div className="text-xs text-white/60">Niskala</div>
        <div className="display mt-2 text-2xl">Private quotes, verifiable routing.</div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Node icon={User} label="Trader" />
          <Arrow />
          <Node icon={Users} label="Up to 5 sealed commitments onchain" />
          <Arrow />
          <Node icon={ShieldCheck} label="Proof checked by the contract" tone="verified" />
        </div>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-white/75">The commitment set is public, the proof is verified by code, settlement is atomic. Evidence instead of a promise, and the losing prices stay sealed.</p>
      </div>
    </div>
  );
}
