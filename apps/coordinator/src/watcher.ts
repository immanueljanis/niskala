import { proveBestQuote, selectWinner, verifyBestQuote } from "@niskala/zk";
import { abi, addWallet, batchCall, normalizeRfq, readDomain, sendTx, Status, web3, type ChainRfq } from "./chain.ts";
import { config } from "./config.ts";
import { historyEnabled } from "./history.ts";
import { makers, makerByAddress } from "./makers.ts";
import { pools, type Pool } from "./pools.ts";
import { referenceMidE6 } from "./prices.ts";
import { ensureRound, openingFor, recordOpening, roundsOf, updateRound, type Round } from "./rounds.ts";

const relayer = addWallet(config.relayerKey);
const inflight = new Set<string>();
const SEED_BACK = 8n;
const STATS_EVERY_MS = 15_000;
/** Monad's public RPC limits eth_getLogs to 100 blocks per call. */
const LOG_WINDOW = 100;
const LOG_WINDOWS_PER_TICK = 10;

const marketAbi = abi("RfqMarket");
const getRfqOutputs = marketAbi.find((f) => f.type === "function" && f.name === "getRfq").outputs;

interface PoolState {
  lastCount: bigint;
  active: Set<string>;
  statsAt: number;
}
const state = new Map<string, PoolState>();

function log(...args: unknown[]) {
  console.log(new Date().toISOString(), ...args);
}

async function maybeCommit(pool: Pool, rfq: ChainRfq) {
  const now = Math.floor(Date.now() / 1000);
  if (now > rfq.commitDeadline) return;
  const committed = new Set(rfq.makers.slice(0, rfq.commitmentCount).map((m) => m.toLowerCase()));
  for (const mm of makers) {
    const key = `${pool.slug}:${rfq.rfqId}:commit:${mm.id}`;
    if (committed.has(mm.address.toLowerCase()) || inflight.has(key)) continue;
    inflight.add(key);
    updateRound(pool.slug, rfq.rfqId, { phase: "committing" });
    void (async () => {
      try {
        const { midE6, source } = await referenceMidE6(pool);
        const priceE6 = mm.priceFor(pool.slug, BigInt(rfq.rfqId), midE6);
        const { commitment, salt } = await mm.seal(pool, BigInt(rfq.rfqId), priceE6);
        recordOpening(pool.slug, rfq.rfqId, mm.address, { priceE6: priceE6.toString(), salt: salt.toString() });
        const { txHash, blockNumber } = await mm.commit(pool, BigInt(rfq.rfqId), commitment);
        const r = ensureRound(pool.slug, rfq.rfqId);
        r.referencePriceE6 = midE6.toString();
        r.commits.push({ maker: mm.address, makerId: mm.id, displayName: mm.displayName, txHash, blockNumber, committedAt: Date.now() });
        updateRound(pool.slug, rfq.rfqId, {});
        log(`${pool.slug} #${rfq.rfqId}: ${mm.id} sealed quote (mid ${source}) tx ${txHash}`);
      } catch (err) {
        log(`${pool.slug} #${rfq.rfqId}: ${mm.id} commit failed:`, (err as Error).message);
      } finally {
        inflight.delete(key);
      }
    })();
  }
}

async function maybeProve(pool: Pool, rfq: ChainRfq, round: Round) {
  const key = `${pool.slug}:${rfq.rfqId}:prove`;
  if (round.proof?.txHash || inflight.has(key)) return;
  const now = Math.floor(Date.now() / 1000);
  if (now > rfq.settleDeadline) return;

  const committed = rfq.makers.slice(0, rfq.commitmentCount);
  const openings = committed.map((m) => openingFor(round, m));
  if (openings.some((o) => !o)) {
    const missing = committed.filter((m) => !openingFor(round, m));
    const demo = missing.map((a) => makerByAddress(a)).filter((m) => m !== undefined);
    if (demo.some((m) => inflight.has(`${pool.slug}:${rfq.rfqId}:commit:${m.id}`))) return;
    if (demo.length > 0) {
      const lost = demo.map((m) => m.id).join(", ");
      const expires = new Date(rfq.settleDeadline * 1000).toISOString().slice(11, 19);
      updateRound(pool.slug, rfq.rfqId, { phase: "error", note: undefined, error: `the openings of ${lost} were lost (coordinator restarted mid-round), so this round cannot be proven; maker collateral is released at ${expires} UTC` });
      return;
    }
    const note = `waiting for ${missing.length} external maker opening${missing.length > 1 ? "s" : ""} (${missing.map((a) => `${a.slice(0, 6)}…${a.slice(-4)}`).join(", ")})`;
    if (round.note !== note) updateRound(pool.slug, rfq.rfqId, { phase: "closed", error: undefined, note });
    return;
  }

  inflight.add(key);
  void (async () => {
    try {
      updateRound(pool.slug, rfq.rfqId, { phase: "proving", error: undefined, note: undefined });
      const prices = openings.map((o) => BigInt(o!.priceE6));
      const salts = openings.map((o) => BigInt(o!.salt));
      const winnerIndex = selectWinner(prices);
      const t0 = Date.now();
      const proof = await proveBestQuote({
        domain: pool.domain,
        rfqId: BigInt(rfq.rfqId),
        makers: committed,
        commitments: rfq.commitments.slice(0, rfq.commitmentCount).map((c) => BigInt(c)),
        winnerIndex,
        winningPriceE6: prices[winnerIndex],
        prices,
        salts,
      });
      const proveMs = Date.now() - t0;
      if (!(await verifyBestQuote(proof))) throw new Error("local verification failed");
      const proofHash = web3.utils.keccak256(proof.proof);
      updateRound(pool.slug, rfq.rfqId, {
        phase: "submitting",
        proof: { ...proof, proofHash, winnerIndex, winningPriceE6: prices[winnerIndex].toString(), generatedAt: Date.now(), proveMs },
      });
      log(`${pool.slug} #${rfq.rfqId}: proof generated in ${proveMs}ms, winner slot ${winnerIndex} (${makerByAddress(rfq.makers[winnerIndex])?.id})`);

      const tx = await sendTx(pool.market.methods.submitProof(BigInt(rfq.rfqId), winnerIndex, prices[winnerIndex], proof.proof), relayer.address, { pad: 1.08 });
      const r = ensureRound(pool.slug, rfq.rfqId);
      updateRound(pool.slug, rfq.rfqId, { phase: "proven", proof: { ...r.proof!, txHash: tx.txHash, blockNumber: tx.blockNumber, gasUsed: tx.gasUsed, submittedAt: Date.now() } });
      log(`${pool.slug} #${rfq.rfqId}: proof verified onchain tx ${tx.txHash} gas ${tx.gasUsed}`);
    } catch (err) {
      log(`${pool.slug} #${rfq.rfqId}: proving failed:`, (err as Error).message);
      updateRound(pool.slug, rfq.rfqId, { phase: "error", error: (err as Error).message });
    } finally {
      inflight.delete(key);
    }
  })();
}

/**
 * Discovers the trader's own transactions (RfqCreated / RfqSettled) so the receipt can link them.
 * Scans forward in 100-block windows from the best anchor and resumes from `round.scan[event]` on later ticks.
 */
async function recordEventTx(pool: Pool, rfq: ChainRfq, round: Round, event: "RfqCreated" | "RfqSettled", field: "createTxHash" | "settleTxHash") {
  if (round[field]) return;
  const key = `${pool.slug}:${rfq.rfqId}:${event}`;
  if (inflight.has(key)) return;
  inflight.add(key);
  try {
    const latest = Number(await web3.eth.getBlockNumber());
    const firstCommit = round.commits[0]?.blockNumber;
    const anchor = event === "RfqSettled" ? (round.proof?.blockNumber ?? firstCommit ?? latest - LOG_WINDOW + 1) : (firstCommit ?? latest) - LOG_WINDOW + 1;
    let from = Math.max(0, round.scan?.[event] ?? anchor);
    for (let i = 0; i < LOG_WINDOWS_PER_TICK && from <= latest; i++) {
      const to = Math.min(from + LOG_WINDOW - 1, latest);
      const events = await pool.market.getPastEvents(event, { filter: { rfqId: rfq.rfqId }, fromBlock: from, toBlock: to });
      const tx = events[0]?.transactionHash;
      if (tx) {
        updateRound(pool.slug, rfq.rfqId, { [field]: String(tx) });
        return;
      }
      from = to + 1;
    }
    updateRound(pool.slug, rfq.rfqId, { scan: { ...(round.scan ?? {}), [event]: from } });
  } catch (err) {
    log(`${pool.slug} #${rfq.rfqId}: ${event} lookup failed:`, (err as Error).message);
  } finally {
    inflight.delete(key);
  }
}

/** After a deadline the relayer closes or expires the round so maker collateral is released promptly. */
async function housekeeping(pool: Pool, rfq: ChainRfq, fn: "closeCommit" | "expire") {
  const key = `${pool.slug}:${rfq.rfqId}:${fn}`;
  if (inflight.has(key)) return;
  inflight.add(key);
  try {
    const tx = await sendTx(pool.market.methods[fn](BigInt(rfq.rfqId)), relayer.address, { gas: 200_000n });
    log(`${pool.slug} #${rfq.rfqId}: ${fn} tx ${tx.txHash}`);
  } catch (err) {
    log(`${pool.slug} #${rfq.rfqId}: ${fn} failed:`, (err as Error).message);
  } finally {
    inflight.delete(key);
  }
}

function chainPhase(rfq: ChainRfq, round: Round) {
  switch (rfq.status) {
    case Status.OPEN:
      return rfq.commitmentCount > 0 ? "committing" : "open";
    case Status.COMMIT_CLOSED:
      return round.phase === "proving" || round.phase === "submitting" || round.phase === "error" ? round.phase : "closed";
    case Status.PROVEN:
      return "proven";
    case Status.SETTLED:
      return "settled";
    case Status.CANCELLED:
      return "cancelled";
    default:
      return round.phase;
  }
}

async function refreshStats(pool: Pool) {
  const calls = makers.map((m) => ({ to: pool.spec.market, data: pool.market.methods.available(m.address).encodeABI() as string }));
  const raw = await batchCall(calls);
  const liquidityBase = raw.reduce((acc, hex) => acc + BigInt(web3.eth.abi.decodeParameter("uint256", hex) as string), 0n);
  const finals = roundsOf(pool.slug).filter((r) => r.final);
  const settledRounds = finals.filter((r) => r.final!.status === Status.SETTLED).sort((a, b) => Number(a.rfqId) - Number(b.rfqId));
  const volumeUsdc = settledRounds.reduce((acc, r) => acc + BigInt(r.final!.usdcPaid), 0n);
  const last = settledRounds.at(-1);
  pool.stats = {
    rounds: Number(state.get(pool.slug)?.lastCount ?? 0n),
    settled: settledRounds.length,
    volumeUsdc: volumeUsdc.toString(),
    lastPriceE6: last ? last.final!.winningPriceE6 : null,
    liquidityBase: liquidityBase.toString(),
    updatedAt: Date.now(),
  };
}

async function processRound(pool: Pool, st: PoolState, rfq: ChainRfq) {
  const round = ensureRound(pool.slug, rfq.rfqId);
  if (!historyEnabled && !round.createTxHash) void recordEventTx(pool, rfq, round, "RfqCreated", "createTxHash");
  if (rfq.status === Status.SETTLED || rfq.status === Status.CANCELLED) {
    if (!round.final) updateRound(pool.slug, rfq.rfqId, { final: { status: rfq.status, usdcPaid: rfq.usdcPaid, winningPriceE6: rfq.winningPriceE6, amountOut: rfq.amountOut } });
    if (historyEnabled) {
      st.active.delete(rfq.rfqId);
    } else if (rfq.status === Status.SETTLED && !round.settleTxHash) {
      void recordEventTx(pool, rfq, round, "RfqSettled", "settleTxHash");
    } else if (round.createTxHash || round.scan?.RfqCreated !== undefined) {
      st.active.delete(rfq.rfqId);
    }
    if (round.phase !== chainPhase(rfq, round)) updateRound(pool.slug, rfq.rfqId, { phase: chainPhase(rfq, round) });
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  if (rfq.status === Status.OPEN && now > rfq.commitDeadline) return void housekeeping(pool, rfq, "closeCommit");
  if ((rfq.status === Status.COMMIT_CLOSED || rfq.status === Status.PROVEN) && now > rfq.settleDeadline) return void housekeeping(pool, rfq, "expire");
  if (rfq.status === Status.OPEN) await maybeCommit(pool, rfq);
  if (rfq.status === Status.COMMIT_CLOSED) await maybeProve(pool, rfq, round);
  const phase = chainPhase(rfq, round);
  if (round.phase !== phase && !inflight.has(`${pool.slug}:${rfq.rfqId}:prove`)) updateRound(pool.slug, rfq.rfqId, { phase });
}

/** One tick: a single batched read of every pool's rfqCount plus every active round, then per-round logic. */
async function tick() {
  const counts = await batchCall(pools.map((p) => ({ to: p.spec.market, data: p.market.methods.rfqCount().encodeABI() as string })));
  const reads: Array<{ pool: Pool; id: string }> = [];
  pools.forEach((pool, i) => {
    const st = state.get(pool.slug)!;
    const count = BigInt(web3.eth.abi.decodeParameter("uint256", counts[i]) as string);
    if (count > st.lastCount) {
      const from = st.lastCount === 0n && count > SEED_BACK ? count - SEED_BACK + 1n : st.lastCount + 1n;
      for (let id = from; id <= count; id++) st.active.add(id.toString());
      st.lastCount = count;
    }
    for (const id of st.active) reads.push({ pool, id });
  });
  const raw = await batchCall(reads.map((r) => ({ to: r.pool.spec.market, data: r.pool.market.methods.getRfq(r.id).encodeABI() as string })));
  for (let i = 0; i < reads.length; i++) {
    const { pool, id } = reads[i];
    const decoded = web3.eth.abi.decodeParameters(getRfqOutputs, raw[i]) as any;
    const rfq = normalizeRfq(id, decoded[0]);
    try {
      await processRound(pool, state.get(pool.slug)!, rfq);
    } catch (err) {
      log(`${pool.slug} #${id}: processing failed:`, (err as Error).message);
    }
  }
  for (const pool of pools) {
    const st = state.get(pool.slug)!;
    if (Date.now() - st.statsAt > STATS_EVERY_MS) {
      st.statsAt = Date.now();
      refreshStats(pool).catch((err) => log(`${pool.slug}: stats failed:`, (err as Error).message));
    }
  }
}

export async function startWatcher() {
  for (const pool of pools) {
    pool.domain = await readDomain(pool.market);
    const expected = (config.chainId << 160n) | BigInt(pool.spec.market);
    if (pool.domain !== expected) throw new Error(`${pool.slug}: market DOMAIN mismatch: chain says ${pool.domain}, registry says ${expected}`);
    state.set(pool.slug, { lastCount: 0n, active: new Set(), statsAt: 0 });
    log(`watcher: pool ${pool.slug} ${pool.spec.market}`);
  }
  log(`watcher: chain ${config.chainId} relayer ${relayer.address}`);
  for (const mm of makers) log(`watcher: ${mm.id} ${mm.address}`);
  const loop = async () => {
    const t0 = Date.now();
    try {
      await tick();
    } catch (err) {
      log("tick failed:", (err as Error).message);
    }
    setTimeout(loop, Math.max(200, config.pollMs - (Date.now() - t0)));
  };
  void loop();
}
