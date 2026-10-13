"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { api, type RoundView } from "@/lib/api";
import { fmtPriceE6, fmtUnits, shortHash } from "@/lib/format";

const PUBLIC_INPUT_LABELS = ["domain (chainId << 160 | market)", "rfqId", "maker[0]", "maker[1]", "maker[2]", "maker[3]", "maker[4]", "commitment[0]", "commitment[1]", "commitment[2]", "commitment[3]", "commitment[4]", "count", "winnerIndex", "winningPriceE6"];

export function ProofInspector({ view }: { view: RoundView }) {
  const { chain, offchain, makers, pool } = view;
  const [raw, setRaw] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const proven = chain.status >= 3 && chain.status !== 5;
  const sym = pool.base.symbol;
  const winnerName = (i: number) => makers.find((m) => m.address.toLowerCase() === chain.makers[i]?.toLowerCase())?.displayName ?? `slot ${i}`;

  async function loadRaw() {
    setLoading(true);
    try {
      const r = await api.proof(pool.slug, chain.rfqId);
      setRaw(r.proof?.proof ?? "unavailable");
    } catch {
      setRaw("unavailable (coordinator offline)");
    } finally {
      setLoading(false);
    }
  }

  const committedIdx = Array.from({ length: chain.commitmentCount }, (_, i) => i);
  const rosterOrder = makers.length ? makers.map((m) => chain.makers.findIndex((a, i) => i < chain.commitmentCount && a.toLowerCase() === m.address.toLowerCase())).filter((i) => i >= 0) : committedIdx;
  const privateRows = (rosterOrder.length === chain.commitmentCount ? rosterOrder : committedIdx).map((i) => {
    const isWinner = proven && i === chain.winnerIndex;
    return { key: `price-${i}`, label: `${winnerName(i)} price`, value: isWinner ? `${fmtPriceE6(chain.winningPriceE6)} (revealed by proof)` : "sealed", revealed: isWinner };
  });

  return (
    <div className="card">
      <div className="flex items-center justify-between px-6 py-5">
        <div className="text-sm text-text">Proof inspector</div>

      </div>
      <div className="grid gap-3 px-3 pb-3 md:grid-cols-2">
        <div className="tile p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-verified">
            <Eye className="h-4 w-4" strokeWidth={1.6} /> Public
          </div>
          <Row k="RFQ" v={`#${chain.rfqId} · buy · ${sym}/USDC`} />
          <Row k="Market" v={shortHash(pool.market, 6)} />
          <Row k="Trade size" v={`${fmtUnits(chain.amountOut, pool.base.decimals, 4)} ${sym}`} />
          {chain.makers.slice(0, Math.max(chain.commitmentCount, 1)).map((m, i) => (
            <Row key={m + i} k={`maker[${i}]`} v={m ? shortHash(m, 6) : "—"} />
          ))}
          {chain.commitments.slice(0, Math.max(chain.commitmentCount, 1)).map((c, i) => (
            <Row key={c + i} k={`commitment[${i}]`} v={i < chain.commitmentCount ? shortHash(c, 8) : "—"} />
          ))}
          <Row k="count" v={String(chain.commitmentCount)} />
          <Row k="winnerIndex" v={proven ? `${chain.winnerIndex} (${winnerName(chain.winnerIndex)})` : "—"} />
          <Row k="winningPriceE6" v={proven ? `${chain.winningPriceE6} (${fmtPriceE6(chain.winningPriceE6)})` : "—"} />
          <Row k="proof hash" v={proven ? shortHash(chain.proofHash, 8) : "—"} />
          <Row k="status" v={chain.statusName} />
        </div>
        <div className="tile p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-pending">
            <EyeOff className="h-4 w-4" strokeWidth={1.6} /> Private
          </div>
          {privateRows.map((r) => (
            <Row key={r.key} k={r.label} v={r.value} tone={r.revealed ? "text-verified" : "text-pending"} />
          ))}
          <Row k="quote salts" v="sealed" tone="text-pending" />
          <Row k="pricing strategies" v="never leave the maker" tone="text-pending" />
          <Row k="inventory models" v="never leave the maker" tone="text-pending" />
          <Row k="who sees openings" v="coordinator / prover only" tone="text-muted" />
        </div>
      </div>
      {offchain.proof && (
        <div className="space-y-3 px-6 pb-6 pt-2">
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
            <span className="text-text">Public inputs (bytes32[15])</span>
            <span className="mono">proof {offchain.proof.proofBytes} bytes</span>
            <span className="mono">prove {offchain.proof.proveMs} ms</span>
            {offchain.proof.gasUsed && <span className="mono">verify gas {offchain.proof.gasUsed.toLocaleString()}</span>}
          </div>
          <div className="grid gap-1 md:grid-cols-2">
            {offchain.proof.publicInputs.map((pi, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-dim">{PUBLIC_INPUT_LABELS[i] ?? `input[${i}]`}</span>
                <span className="mono text-muted">{shortHash(pi, 10)}</span>
              </div>
            ))}
          </div>
          <div>
            {raw === null ? (
              <button className="text-xs text-accent underline-offset-4 hover:underline" onClick={loadRaw} disabled={loading}>
                {loading ? "Loading…" : "Show raw proof bytes"}
              </button>
            ) : (
              <pre className="mono max-h-48 overflow-auto rounded-lg bg-tile p-3 text-[10px] leading-relaxed text-muted whitespace-pre-wrap break-all">{raw}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, tone = "text-text" }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-xs">
      <span className="text-muted">{k}</span>
      <span className={`mono text-right ${tone}`}>{v}</span>
    </div>
  );
}
