import { Eye, EyeOff } from "lucide-react";

const PUBLIC = ["Pair, size, direction", "The committed makers and how many there were", "Every commitment hash", "Winning price, once proven", "Proof and verifier result", "Settlement transaction"];
const PRIVATE = ["Every losing price", "Every salt", "Each maker's pricing strategy", "Each maker's inventory"];

export function Boundary() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="tile p-7">
        <div className="flex items-center gap-2 text-sm text-verified">
          <Eye className="h-4 w-4" strokeWidth={1.6} />
          On the chain, for anyone
        </div>
        <ul className="mt-5 space-y-3">
          {PUBLIC.map((t) => (
            <li key={t} className="flex items-start gap-3 text-base text-text">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-verified" />
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="tile p-7">
        <div className="flex items-center gap-2 text-sm text-pending">
          <EyeOff className="h-4 w-4" strokeWidth={1.6} />
          Never on the chain, never shown to the trader
        </div>
        <ul className="mt-5 space-y-3">
          {PRIVATE.map((t) => (
            <li key={t} className="flex items-start gap-3 text-base text-text">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pending" />
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-6 rounded-lg bg-surface p-4 text-xs leading-relaxed text-muted">The coordinator that builds the proof sees the openings. Removing that trust (MPC, FHE, TEE) is roadmap, not a claim.</p>
      </div>
    </div>
  );
}
