"use client";

import { useEffect, useState } from "react";
import type { RoundView } from "@/lib/api";
import { fmtPriceE6, shortHash } from "@/lib/format";
import { Pill, TxLink } from "../ui";

function useCountUp(target: number, ms = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

export function ProofResult({ view }: { view: RoundView }) {
  const { chain, offchain, makers, pool } = view;
  const [open, setOpen] = useState(false);
  const price = Number(BigInt(chain.winningPriceE6)) / 1e6;
  const animated = useCountUp(price);
  const decimals = price < 1 ? 4 : 2;
  const winnerAddress = chain.makers[chain.winnerIndex];
  const winner = makers.find((m) => m.address.toLowerCase() === winnerAddress?.toLowerCase());

  return (
    <div className="card p-7 animate-fade-up">
      <div className="grid gap-8 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <div className="text-xs text-dim">Best execution</div>
          <div className="display mt-2 text-5xl tabular-nums">{animated.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</div>
          <div className="mt-2 text-xs text-muted">
            USDC per {pool.base.symbol} · {fmtPriceE6(chain.winningPriceE6)} proven
          </div>
        </div>
        <div className="space-y-5">
          <div>
            <div className="text-xs text-dim">Winner</div>
            <div className="mt-1 text-sm">{winner?.displayName ?? `Slot ${chain.winnerIndex}`}</div>
            <div className="mono text-xs text-dim">{shortHash(winnerAddress ?? "", 6)}</div>
          </div>
          <div>
            <div className="text-xs text-dim">Quote set</div>
            <div className="mt-1 text-sm">{chain.commitmentCount} / {chain.commitmentCount} considered</div>
          </div>
        </div>
        <div className="space-y-5">
          <div>
            <div className="text-xs text-dim">Proof</div>
            <div className="mt-1.5 flex items-center gap-2">
              <Pill tone="verified">Verified</Pill>
              {offchain.proof?.txHash && <TxLink hash={offchain.proof.txHash} />}
            </div>
          </div>
          <div>
            <div className="text-xs text-dim">Losing quotes</div>
            <div className="mt-1.5">
              <Pill tone="pending">Sealed</Pill>
            </div>
          </div>
        </div>
      </div>
      <button className="mt-6 text-xs text-accent underline-offset-4 hover:underline" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide" : "What was proven?"}
      </button>
      {open && (
        <div className="mt-3 grid gap-3 text-sm text-muted md:grid-cols-2">
          <div className="tile p-4">Each of the 3 private openings hashes (Poseidon2) to its onchain commitment, bound to this RFQ id, this market address and this chain id.</div>
          <div className="tile p-4">The published winning price equals the winner&apos;s private price and is less than or equal to every other committed price, with the first index winning ties.</div>
          <div className="tile p-4">The verifier contract rebuilt the public inputs from its own storage, so this proof could not be replayed on another round or commitment set.</div>
          <div className="tile mono p-4 text-xs">
            proof hash {shortHash(chain.proofHash, 8)} · {offchain.proof?.proofBytes ?? "—"} bytes · gas {offchain.proof?.gasUsed?.toLocaleString() ?? "—"}
          </div>
        </div>
      )}
    </div>
  );
}
