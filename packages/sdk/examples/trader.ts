import { Niskala, formatPriceE6, formatUnits, parseUnits } from "../src/index.ts";

/**
 * Trader flow from Node: mint test USDC, open a round, wait for the proof, approve, execute.
 * Env: TRADER_KEY (funded with testnet MON), optional POOL (slug, default weth-usdc), AMOUNT (base units, default 1),
 * COORDINATOR_URL (default http://localhost:8787).
 */
const niskala = new Niskala({ coordinatorUrl: process.env.COORDINATOR_URL });
const from = niskala.useAccount(must("TRADER_KEY"));
const pool = niskala.pool(process.env.POOL ?? "weth-usdc");
const amountOut = parseUnits(process.env.AMOUNT ?? "1", pool.base.decimals);
const log = (m: string) => console.log(new Date().toISOString(), m);

const { usdc } = await niskala.balances(from);
if (BigInt(usdc) < 100_000n * 10n ** 6n) {
  const tx = await niskala.mintUsdc(100_000n * 10n ** 6n, { from });
  log(`minted 100,000 test USDC ${tx.txHash}`);
}

const created = await niskala.createRfq(pool, amountOut, { from });
log(`${pool.slug} RFQ #${created.rfqId}: buy ${formatUnits(amountOut, pool.base.decimals)} ${pool.base.symbol} (${created.txHash})`);

let seen = -1;
const proven = await niskala.waitForProof(pool, created.rfqId, {
  onUpdate: (r) => {
    if (r.commitmentCount !== seen) log(`sealed commitments: ${(seen = r.commitmentCount)}`);
  },
});
log(`proven: ${formatPriceE6(proven.winningPriceE6)} USDC per ${pool.base.symbol} from slot ${proven.winnerIndex} (${proven.makers[proven.winnerIndex]})`);

const cost = await niskala.quoteCost(pool, amountOut, proven.winningPriceE6);
if (BigInt(await niskala.usdcAllowance(pool, from)) < BigInt(cost)) await niskala.approveUsdc(pool, cost, { from });
const settled = await niskala.executeRfq(pool, created.rfqId, { from });
log(`settled: paid ${formatUnits(cost, 6)} USDC (${settled.txHash})`);

function must(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`missing env ${key}`);
  return v;
}
