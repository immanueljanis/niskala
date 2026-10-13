"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PoolLogo } from "@/components/PoolLogo";
import { Notice, Pill, type Tone, AddressLink } from "@/components/ui";
import { fmtCountdown, fmtUnits, statusLabel } from "@/lib/format";
import { ExecutePanel } from "./ExecutePanel";
import { PhaseStrip } from "./PhaseStrip";
import { ProofInspector } from "./ProofInspector";
import { ProofResult } from "./ProofResult";
import { Receipt } from "./Receipt";
import { SealedLanes } from "./SealedLanes";
import { useRound } from "./useRound";

const statusTone: Record<string, Tone> = { OPEN: "pending", COMMIT_CLOSED: "pending", PROVEN: "verified", SETTLED: "verified", CANCELLED: "error" };

function headline(status: number, phase: string, commitmentCount: number) {
  if (status === 1) return commitmentCount === 0 ? "Waiting for sealed quotes" : "Collecting sealed quotes";
  if (status === 2) return phase === "error" ? "Proof could not be generated" : phase === "submitting" ? "Submitting proof to Monad" : "Proving best execution";
  if (status === 3) return "Best price proven";
  if (status === 4) return "Settled";
  if (status === 5) return "Round cancelled";
  return "Loading round";
}

export function RoundClient({ poolSlug, rfqId }: { poolSlug: string; rfqId: string }) {
  const { view, coordinatorOffline, error, now } = useRound(poolSlug, rfqId);
  const [settleTx, setSettleTx] = useState<string | null>(null);
  const chainStatus = view?.chain.status;

  /** The execute panel and receipt sit under the header; bring them into view when the round reaches them. */
  useEffect(() => {
    if (chainStatus === 3 || chainStatus === 4) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [chainStatus]);

  if (error && !view) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-20 text-center">
        <Notice tone="error">{error}</Notice>
        <Link href="/trade" className="btn btn-secondary mt-6">
          Back to terminal
        </Link>
      </div>
    );
  }
  if (!view) return <div className="mx-auto max-w-7xl px-5 py-20 text-sm text-dim">Loading round…</div>;

  const { chain, offchain, pool } = view;
  const status = chain.status;
  const sym = pool.base.symbol;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-5 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
        <div>
          <div className="flex items-center gap-3">
            <PoolLogo pool={pool} size={28} />
            <span className="text-sm text-muted">
              {sym} / USDC · RFQ #{chain.rfqId}
            </span>
          </div>
          <h1 className="display mt-3 text-4xl md:text-5xl">{headline(status, offchain.phase, chain.commitmentCount)}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>
              Buy <span className="mono text-text">{fmtUnits(chain.amountOut, pool.base.decimals, 4)} {sym}</span> with USDC
            </span>
            <span className="text-dim">·</span>
            <span>
              trader <AddressLink address={chain.trader} />
            </span>
            {status === 1 && (
              <>
                <span className="text-dim">·</span>
                <span className="mono">commit window {fmtCountdown(chain.commitDeadline, now)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Pill tone={statusTone[chain.statusName] ?? "neutral"} pulse={status === 1 || status === 2}>
            {statusLabel(chain.statusName)}
          </Pill>
          <Link href={`/trade?pool=${pool.slug}`} className="text-sm text-muted hover:text-text">
            New RFQ
          </Link>
        </div>
      </div>

      {coordinatorOffline && <Notice tone="pending">Coordinator offline: showing onchain state only. Market makers and the prover run inside the coordinator process.</Notice>}
      {offchain.phase === "error" && offchain.error && <Notice tone="error">{offchain.error}</Notice>}
      {status === 5 && <Notice tone="error">This round was cancelled. Locked maker capital has been released.</Notice>}

      {status === 3 && <ExecutePanel view={view} now={now} onSettled={setSettleTx} />}
      {status === 4 && <Receipt view={view} settleTx={settleTx} />}
      <PhaseStrip view={view} now={now} />
      <SealedLanes view={view} />
      {status >= 3 && status !== 5 && <ProofResult view={view} />}
      <ProofInspector view={view} />
    </div>
  );
}
