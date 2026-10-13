"use client";

import type { RoundView } from "@/lib/api";
import { fmtPriceE6, fmtUnits, shortHash } from "@/lib/format";
import { AddressLink, Field, Pill, TxLink } from "../ui";

export function Receipt({ view, settleTx }: { view: RoundView; settleTx: string | null }) {
  const { chain, offchain, makers, pool } = view;
  const sym = pool.base.symbol;
  const winnerAddress = chain.makers[chain.winnerIndex];
  const winner = makers.find((m) => m.address.toLowerCase() === winnerAddress?.toLowerCase());
  const settle = settleTx ?? offchain.settleTxHash;
  return (
    <div className="card p-7 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="text-sm text-text">Execution receipt</div>
        <Pill tone="verified">Settled</Pill>
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Amount" value={`${fmtUnits(chain.amountOut, pool.base.decimals, 4)} ${sym}`} mono />
        <Field label="Price" value={`${fmtPriceE6(chain.winningPriceE6)} USDC / ${sym}`} mono />
        <Field label="USDC paid" value={`${fmtUnits(chain.usdcPaid, 6, 2)} USDC`} mono />
        <Field label={`${sym} received`} value={`${fmtUnits(chain.amountOut, pool.base.decimals, 4)} ${sym}`} mono />
        <Field label="Winner" value={<>{winner?.displayName ?? `Slot ${chain.winnerIndex}`} · <AddressLink address={winnerAddress} /></>} />
        <Field label="Market" value={<AddressLink address={pool.market} chars={6} />} />
        <Field label="RFQ id" value={`#${chain.rfqId}`} mono />
        <Field label="Proof id" value={shortHash(chain.proofHash, 8)} mono />
        <Field label="Verifier" value={<>verified {offchain.proof?.txHash && <TxLink hash={offchain.proof.txHash} />}</>} mono />
        <Field label="Settlement tx" value={settle ? <TxLink hash={settle} chars={8} /> : <span className="text-dim">see explorer</span>} mono />
        <Field label="RFQ tx" value={offchain.createTxHash ? <TxLink hash={offchain.createTxHash} chars={8} /> : <span className="text-dim">see explorer</span>} mono />
        <Field label="Trader" value={<AddressLink address={chain.trader} chars={6} />} />
      </div>
    </div>
  );
}
