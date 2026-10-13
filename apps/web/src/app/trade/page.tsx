"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PoolLogo, TokenLogo } from "@/components/PoolLogo";
import { Notice, Pill, type Tone, AddressLink } from "@/components/ui";
import { createRfq, getBlockNumber, getRfq, getRfqCount, getTokenBalance, mintUsdc, type ChainRfq } from "@/lib/chain/contracts";
import { FAUCET_URL, NETWORK } from "@/lib/chain/network";
import { fmtPriceE6, fmtUnits, shortAddress, statusLabel, toUnits } from "@/lib/format";
import { DEFAULT_POOL, MAX_SLOTS, POOLS, QUOTE, poolBySlug, type PoolWithStats } from "@/lib/pools";
import { usePools } from "@/lib/usePools";
import { useWallet } from "@/lib/wallet";

const statusTone: Record<string, Tone> = { OPEN: "pending", COMMIT_CLOSED: "pending", PROVEN: "verified", SETTLED: "verified", CANCELLED: "error" };

function PoolRow({ p, active, onClick }: { p: PoolWithStats; active: boolean; onClick: () => void }) {
  const last = p.stats?.lastPriceE6 ?? null;
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${active ? "bg-tile" : "hover:bg-bg"}`} aria-pressed={active}>
      <PoolLogo pool={p} size={28} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-sm text-text">{p.base.symbol}</span>
          <span className="mono text-xs text-text">{fmtPriceE6(last ?? p.referencePriceE6)}</span>
        </span>
        <span className="flex items-baseline justify-between gap-2 text-[11px] text-dim">
          <span>{p.tier}</span>
          <span className="mono">{p.stats ? `${p.stats.rounds} rounds` : last ? "" : "ref"}</span>
        </span>
      </span>
    </button>
  );
}

export default function TradePage() {
  const router = useRouter();
  const { address, balances, connect, wrongNetwork, switchNetwork, refresh, hasWallet } = useWallet();
  const { pools, makers, live } = usePools(6000);
  const [slug, setSlug] = useState<string>(DEFAULT_POOL?.slug ?? "");
  const pool = useMemo(() => pools.find((p) => p.slug === slug) ?? pools[0], [pools, slug]);
  const [amount, setAmount] = useState(DEFAULT_POOL?.defaultSize ?? "1");
  const [busy, setBusy] = useState<"create" | "mint" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<ChainRfq[]>([]);
  const [block, setBlock] = useState<number | null>(null);
  const [baseBalance, setBaseBalance] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("pool");
    const spec = poolBySlug(q ?? undefined);
    if (spec) {
      setSlug(spec.slug);
      setAmount(spec.defaultSize);
    }
  }, []);

  useEffect(() => {
    if (!pool) return;
    let alive = true;
    const load = async () => {
      try {
        const count = await getRfqCount(pool);
        const ids = Array.from({ length: Math.min(6, count) }, (_, i) => String(count - i));
        const rows = await Promise.all(ids.map((id) => getRfq(pool, id)));
        if (alive) setRecent(rows);
        if (alive) setBlock(await getBlockNumber());
        if (alive && address) setBaseBalance(await getTokenBalance(address, pool.base.address));
      } catch {
        /* chain unreachable; leave list empty */
      }
    };
    load();
    const t = setInterval(load, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [pool, address]);

  if (!pool) return <div className="mx-auto max-w-7xl px-5 py-20 text-sm text-dim">No markets configured for this chain.</div>;

  const decimals = pool.base.decimals;
  const amountWei = (() => {
    try {
      return toUnits(amount || "0", decimals);
    } catch {
      return "0";
    }
  })();
  const amountValid = BigInt(amountWei) > 0n && BigInt(amountWei) <= BigInt(toUnits(pool.maxSize, decimals));

  function selectPool(p: PoolWithStats) {
    setSlug(p.slug);
    setAmount(p.defaultSize);
    setRecent([]);
    setBaseBalance(null);
    window.history.replaceState(null, "", `/trade?pool=${p.slug}`);
  }

  async function onRequest() {
    setError(null);
    if (!address) return connect();
    if (wrongNetwork) return switchNetwork();
    setBusy("create");
    try {
      const { rfqId } = await createRfq(address, pool, amountWei, pool.commitWindowSec, pool.settleWindowSec);
      router.push(`/rfq/${pool.slug}/${rfqId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onMint() {
    if (!address) return connect();
    if (wrongNetwork) return switchNetwork();
    setBusy("mint");
    setError(null);
    try {
      await mintUsdc(address, toUnits("100000", 6));
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const liquidity = pool.stats ? fmtUnits(pool.stats.liquidityBase, decimals, 0) : pool.makerDeposit;

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="display text-4xl md:text-5xl">Request private quotes</h1>
          <p className="mt-3 max-w-md text-sm text-muted">Pick a market. Sealed makers compete; the proof picks the price.</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-dim">
          <span>{NETWORK.name}</span>
          {block !== null && <span className="mono">block {block.toLocaleString()}</span>}
          <Pill tone={live === false ? "error" : live ? "verified" : "neutral"}>{live === false ? "Makers offline" : live ? "Makers live" : "Makers"}</Pill>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr_300px]">
        <div className="card p-2 animate-fade-up">
          <div className="px-3 pb-1 pt-3 text-xs text-dim">{POOLS.length} markets · quoted in USDC</div>
          <div className="space-y-0.5">
            {pools.map((p) => (
              <PoolRow key={p.slug} p={p} active={p.slug === pool.slug} onClick={() => selectPool(p)} />
            ))}
          </div>
        </div>

        <div className="space-y-5 animate-fade-up">
          <div className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <PoolLogo pool={pool} size={40} />
                <div>
                  <div className="display text-2xl">
                    {pool.base.symbol} / USDC
                  </div>
                  <div className="text-xs text-dim">
                    {pool.base.name} · {pool.tier}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="mono text-xl">{fmtPriceE6(pool.stats?.lastPriceE6 ?? pool.referencePriceE6)}</div>
                <div className="text-xs text-dim">USDC · {pool.stats?.lastPriceE6 ? "last proven price" : "reference price"}</div>
              </div>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">{pool.description}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_1fr]">
              <div>
                <div className="text-xs text-dim">Amount ({pool.base.symbol})</div>
                <input className="input mono mt-1.5 text-base" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
                <div className="mt-1.5 text-xs text-dim">Up to {pool.maxSize} {pool.base.symbol} per round.</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="tile px-4 py-3">
                  <div className="text-dim">Side</div>
                  <div className="mt-1 text-sm text-text">Buy with USDC</div>
                </div>
                <div className="tile px-4 py-3">
                  <div className="text-dim">Windows</div>
                  <div className="mono mt-1 text-sm text-text">
                    {pool.commitWindowSec}s / {pool.settleWindowSec}s
                  </div>
                </div>
              </div>
            </div>
            <button className="btn btn-primary mt-5 w-full sm:w-auto" onClick={onRequest} disabled={busy !== null || !amountValid || !hasWallet}>
              {busy === "create" ? "Confirm in wallet…" : !address ? "Connect wallet" : wrongNetwork ? `Switch to ${NETWORK.name}` : `Request private quotes for ${amount || "0"} ${pool.base.symbol}`}
              {busy === null && address && !wrongNetwork && <ArrowRight className="h-4 w-4" strokeWidth={1.8} />}
            </button>
            {!hasWallet && <div className="mt-4"><Notice tone="pending">No wallet detected. Install MetaMask to create an RFQ.</Notice></div>}
            {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
          </div>

          <div className="card p-6">
            <div className="text-sm text-text">Market details</div>
            <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-dim">Market contract</div>
                <div className="mt-1 text-sm">
                  <AddressLink address={pool.market} chars={6} />
                </div>
              </div>
              <div>
                <div className="text-dim">{pool.base.symbol} token</div>
                <div className="mt-1 flex items-center gap-1.5 text-sm">
                  <TokenLogo src={pool.base.logo} size={16} /> <AddressLink address={pool.base.address} chars={6} />
                </div>
              </div>
              <div>
                <div className="text-dim">USDC token</div>
                <div className="mt-1 flex items-center gap-1.5 text-sm">
                  <TokenLogo src={QUOTE.logo} size={16} /> <AddressLink address={QUOTE.address} chars={6} />
                </div>
              </div>
              <div>
                <div className="text-dim">Maker liquidity</div>
                <div className="mono mt-1 text-sm">
                  {liquidity} {pool.base.symbol}
                </div>
              </div>
              <div>
                <div className="text-dim">Rounds</div>
                <div className="mono mt-1 text-sm">{pool.stats ? `${pool.stats.rounds} · ${pool.stats.settled} settled` : "—"}</div>
              </div>
              <div>
                <div className="text-dim">Volume</div>
                <div className="mono mt-1 text-sm">{pool.stats ? `${fmtUnits(pool.stats.volumeUsdc, 6, 0)} USDC` : "—"}</div>
              </div>
              <div>
                <div className="text-dim">Price feed</div>
                <div className="mt-1 text-sm">CoinGecko · {pool.coingeckoId}</div>
              </div>
              <div>
                <div className="text-dim">Maker deposit each</div>
                <div className="mono mt-1 text-sm">
                  {pool.makerDeposit} {pool.base.symbol}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between px-6 py-5">
              <div className="text-sm text-text">Recent rounds · {pool.base.symbol} / USDC</div>

            </div>
            <div className="px-2 pb-2">
              {recent.length === 0 && <div className="px-4 py-10 text-center text-sm text-dim">No rounds in this market yet.</div>}
              {recent.map((r) => (
                <Link key={r.rfqId} href={`/rfq/${pool.slug}/${r.rfqId}`} className="flex items-center justify-between gap-4 rounded-lg px-4 py-3.5 transition-colors hover:bg-bg">
                  <div className="flex items-center gap-4">
                    <span className="mono text-xs text-dim">#{r.rfqId}</span>
                    <span className="text-sm">
                      Buy {fmtUnits(r.amountOut, decimals, 4)} {pool.base.symbol}
                    </span>
                    <span className="mono hidden text-xs text-dim sm:inline">{shortAddress(r.trader)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.status >= 3 && r.status !== 5 && <span className="mono text-xs text-muted">{fmtPriceE6(r.winningPriceE6)}</span>}
                    <span className="mono text-xs text-dim">
                      {r.commitmentCount}/{MAX_SLOTS}
                    </span>
                    <Pill tone={statusTone[r.statusName] ?? "neutral"} pulse={r.statusName === "OPEN" || r.statusName === "COMMIT_CLOSED"}>
                      {statusLabel(r.statusName)}
                    </Pill>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5 animate-fade-up">
          <div className="card space-y-4 p-6">
            <div className="text-sm text-text">Your wallet</div>
            {address ? (
              <>
                <div className="mono text-sm text-muted">{shortAddress(address, 6)}</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    ["MON", balances ? fmtUnits(balances.mon, 18, 3) : "—"],
                    ["USDC", balances ? fmtUnits(balances.usdc, 6, 0) : "—"],
                    [pool.base.symbol, baseBalance ? fmtUnits(baseBalance, decimals, 3) : "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="tile px-3 py-2.5">
                      <div className="text-dim">{k}</div>
                      <div className="mono mt-0.5 truncate text-sm text-text">{v}</div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-secondary h-9 w-full text-xs" onClick={onMint} disabled={busy !== null}>
                  {busy === "mint" ? "Minting…" : "Mint 100,000 test USDC"}
                </button>
                <div className="text-xs text-dim">
                  Gas needs testnet MON:{" "}
                  <a className="inline-flex items-center gap-0.5 text-accent hover:underline" href={FAUCET_URL} target="_blank" rel="noreferrer">
                    faucet.monad.xyz <ArrowUpRight className="h-3 w-3" strokeWidth={1.6} />
                  </a>
                </div>
              </>
            ) : (
              <button className="btn btn-primary w-full" onClick={connect}>
                Connect wallet
              </button>
            )}
          </div>
          <div className="card space-y-3 p-6">
            <div className="text-sm text-text">Market makers</div>
            {(makers.length ? makers : [1, 2, 3, 4, 5].map((i) => ({ id: `mm-0${i}`, displayName: `Niskala MM-0${i}`, tier: "", address: "" }))).map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <div>
                  <div>{m.displayName}</div>
                  <div className="text-xs text-dim">{m.tier || "Market maker"}</div>
                </div>
                <span className="text-xs text-verified">ready</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
