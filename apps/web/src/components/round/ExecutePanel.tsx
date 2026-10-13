"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { RoundView } from "@/lib/api";
import { approveUsdc, executeRfq, getUsdcAllowance, quoteCost } from "@/lib/chain/contracts";
import { NETWORK } from "@/lib/chain/network";
import { fmtCountdown, fmtUnits } from "@/lib/format";
import { useWallet } from "@/lib/wallet";
import { Notice } from "../ui";

/** One-time unlimited approval so every later execution is a single wallet confirmation. Test USDC only. */
const MAX_UINT256 = (2n ** 256n - 1n).toString();

export function ExecutePanel({ view, now, onSettled }: { view: RoundView; now: number; onSettled: (txHash: string) => void }) {
  const { chain, pool } = view;
  const { address, balances, connect, wrongNetwork, switchNetwork, refresh } = useWallet();
  const [cost, setCost] = useState<string | null>(null);
  const [allowance, setAllowance] = useState<string | null>(null);
  const [step, setStep] = useState<"idle" | "approving" | "executing">("idle");
  const [error, setError] = useState<string | null>(null);

  const isTrader = !!address && address.toLowerCase() === chain.trader.toLowerCase();
  const sym = pool.base.symbol;

  useEffect(() => {
    quoteCost(pool, chain.amountOut, chain.winningPriceE6).then(setCost).catch(() => {});
  }, [pool, chain.amountOut, chain.winningPriceE6]);

  useEffect(() => {
    if (!address) return;
    getUsdcAllowance(address, pool).then(setAllowance).catch(() => {});
  }, [address, pool, step]);

  const needsApproval = cost !== null && allowance !== null && BigInt(allowance) < BigInt(cost);
  const insufficient = cost !== null && balances !== null && BigInt(balances.usdc) < BigInt(cost);
  const expired = now / 1000 > chain.settleDeadline;

  async function onExecute() {
    setError(null);
    if (!address) return connect();
    if (wrongNetwork) return switchNetwork();
    if (!cost) return;
    try {
      if (needsApproval) {
        setStep("approving");
        await approveUsdc(address, pool, MAX_UINT256);
      }
      setStep("executing");
      const { txHash } = await executeRfq(address, pool, chain.rfqId);
      await refresh();
      onSettled(txHash);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStep("idle");
    }
  }

  return (
    <div className="rounded-2xl bg-brand p-7 text-white animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="text-xs text-white/60">Execute at the proven price</div>
          <div className="display mt-2 text-3xl">
            {cost ? fmtUnits(cost, 6, 2) : "—"} USDC <span className="text-white/50">for</span> {fmtUnits(chain.amountOut, pool.base.decimals, 4)} {sym}
          </div>
          <div className="mt-2 text-sm text-white/70">One transaction: USDC to the winner, {sym} to you.</div>
        </div>
        <div className="mono text-xs text-white/60">settle by {fmtCountdown(chain.settleDeadline, now)}</div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {!address ? (
          <button className="btn bg-white text-text hover:bg-bg" onClick={connect}>
            Connect wallet to execute
          </button>
        ) : wrongNetwork ? (
          <button className="btn bg-white text-text hover:bg-bg" onClick={switchNetwork}>
            Switch to {NETWORK.name}
          </button>
        ) : !isTrader ? (
          <span className="text-sm text-white/70">Only the trader who opened this RFQ can execute it.</span>
        ) : (
          <>
            <button className="btn bg-white text-text hover:bg-bg" onClick={onExecute} disabled={step !== "idle" || !cost || insufficient || expired}>
              {step === "approving" ? "Approve USDC in wallet…" : step === "executing" ? "Confirm execution…" : needsApproval ? "Approve and execute" : "Execute"}
              {step === "idle" && <ArrowRight className="h-4 w-4" strokeWidth={1.8} />}
            </button>
            {needsApproval && step === "idle" && <span className="text-xs text-white/60">First time only: one USDC approval, then execution.</span>}
          </>
        )}
      </div>
      {insufficient && isTrader && (
        <div className="mt-4">
          <Notice tone="pending">Insufficient test USDC. Mint some from the terminal first.</Notice>
        </div>
      )}
      {expired && (
        <div className="mt-4">
          <Notice tone="error">Settlement window expired. Anyone can call expire() to unlock maker capital.</Notice>
        </div>
      )}
      {error && (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
    </div>
  );
}
