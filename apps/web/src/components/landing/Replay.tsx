"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { api, type RoundView } from "@/lib/api";
import { txUrl } from "@/lib/chain/network";
import { fmtPriceE6, fmtUnits, shortHash } from "@/lib/format";
import { RevealGroup, Item } from "./Reveal";

const REPLAY_POOL = "weth-usdc";
const REPLAY_RFQ = "2";

/** Round #2 on the WETH/USDC market (five makers), as it ran on Monad testnet. Live data when the coordinator is up; these facts otherwise. */
const FALLBACK = {
  amountOut: "10000000000000000000",
  winningPriceE6: "2528000796",
  usdcPaid: "25280007960",
  winnerName: "Niskala MM-02",
  createTx: "0x443e541c09da34a71c1c828a83b9b8e3649e53c3032dac79921bafa7c677e042",
  commits: [
    { name: "Niskala MM-05", tx: "0x5b6216bcc7980cbd3d8499137f8b761b32de876fa1d1152629847f5a6daba04c" },
    { name: "Niskala MM-01", tx: "0x28328ee23dcd70d6fb7a165742425bff818be32bf8429986bf2342103d8ecc15" },
    { name: "Niskala MM-04", tx: "0x88439ad436d4821f61783e3d470ace348bbce321902d176c9509f3969f02bf67" },
    { name: "Niskala MM-03", tx: "0xd656e6b85f1afac453c60a8282aa17b1e9f0a9c9d2eea927349d15f198e9c5d4" },
    { name: "Niskala MM-02", tx: "0xab98d0f8f8d9196db062ea0863c82b00e1d3aee01786fa92a044fd9b9200d583" },
  ],
  proofTx: "0x80d1f0d473fa286aa956dae2eba8c83f5e8fe60a09f8a539bdbd36754dcce9d0",
  proofBytes: 7232,
  proveMs: 1376,
  gasUsed: 5826610,
  settleTx: "0x419784383ed2c25ff844d67e45274416c8f892b8745dbb4315b0886c31b9a764",
};

interface Row {
  label: string;
  actor: string;
  detail: string;
  tx?: string;
  tone: "neutral" | "pending" | "verified";
}

function rowsFrom(v: RoundView | null): Row[] {
  const chain = v?.chain;
  const off = v?.offchain;
  const winnerName = v ? (v.makers.find((m) => m.address.toLowerCase() === chain!.makers[chain!.winnerIndex]?.toLowerCase())?.displayName ?? FALLBACK.winnerName) : FALLBACK.winnerName;
  const commits = off && off.commits.length >= 3 ? off.commits.map((c) => ({ name: c.displayName, tx: c.txHash })) : FALLBACK.commits;
  const losers = commits.length - 1;
  return [
    { label: "RFQ opened", actor: "trader", detail: `buy ${fmtUnits(chain?.amountOut ?? FALLBACK.amountOut, 18, 0)} WETH with USDC`, tx: off?.createTxHash ?? FALLBACK.createTx, tone: "neutral" },
    ...commits.map((c) => ({ label: "Sealed commitment", actor: c.name, detail: "hash onchain · 10 WETH locked", tx: c.tx, tone: "pending" as const })),
    { label: "Window closed", actor: "contract", detail: `${commits.length} / ${commits.length} · set is final`, tone: "neutral" },
    { label: "Proof verified", actor: "HonkVerifier", detail: `${off?.proof?.proofBytes ?? FALLBACK.proofBytes} B · ${((off?.proof?.proveMs ?? FALLBACK.proveMs) / 1000).toFixed(1)} s · ${((off?.proof?.gasUsed ?? FALLBACK.gasUsed) / 1e6).toFixed(1)} M gas`, tx: off?.proof?.txHash ?? FALLBACK.proofTx, tone: "verified" },
    { label: "Best price revealed", actor: winnerName, detail: `${fmtPriceE6(chain?.winningPriceE6 ?? FALLBACK.winningPriceE6)} USDC per WETH · ${losers} prices stay sealed`, tone: "verified" },
    { label: "Settled", actor: "trader", detail: `${fmtUnits(chain?.usdcPaid ?? FALLBACK.usdcPaid, 6, 2)} USDC ↔ 10 WETH`, tx: off?.settleTxHash ?? FALLBACK.settleTx, tone: "verified" },
  ];
}

const dot: Record<Row["tone"], string> = { neutral: "bg-dim", pending: "bg-pending", verified: "bg-verified" };

export function Replay() {
  const [view, setView] = useState<RoundView | null>(null);
  useEffect(() => {
    api.round(REPLAY_POOL, REPLAY_RFQ).then(setView).catch(() => {});
  }, []);
  const rows = rowsFrom(view);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
        <div className="text-sm text-muted">
          WETH / USDC round <span className="text-text">#{REPLAY_RFQ}</span>, five makers. Every row is a transaction.
        </div>
        <Link href={`/rfq/${REPLAY_POOL}/${REPLAY_RFQ}`} className="inline-flex items-center gap-1 text-sm text-accent underline-offset-4 hover:underline">
          Full receipt <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.6} />
        </Link>
      </div>
      <RevealGroup className="relative px-2 pb-3" gap={0.06}>
        <div className="absolute bottom-7 left-[27px] top-3 w-px bg-hairline" aria-hidden />
        {rows.map((r, idx) => (
          <Item key={`${r.label}-${idx}`} className="relative grid grid-cols-[2.25rem_1fr] items-start gap-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-bg sm:grid-cols-[2.25rem_11rem_1fr_auto] sm:items-center">
            <span className="flex h-6 w-6 items-center justify-center">
              <span className={`h-2 w-2 rounded-full ${dot[r.tone]} ring-4 ring-surface`} />
            </span>
            <span className="text-sm text-text">{r.label}</span>
            <span className="col-start-2 text-xs text-muted sm:col-start-3">
              <span className="text-dim">{r.actor}</span> · {r.detail}
            </span>
            <span className="col-start-2 sm:col-start-4">
              {r.tx ? (
                <a href={txUrl(r.tx)} target="_blank" rel="noreferrer" className="mono inline-flex items-center gap-1 text-xs text-accent underline-offset-4 hover:underline">
                  {shortHash(r.tx, 6)} <ArrowUpRight className="h-3 w-3" strokeWidth={1.6} />
                </a>
              ) : (
                <span className="text-xs text-dim">state change</span>
              )}
            </span>
          </Item>
        ))}
      </RevealGroup>
    </div>
  );
}
