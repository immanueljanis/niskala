import { Niskala, formatPriceE6, parseUnits } from "../src/index.ts";
import { MakerClient } from "../src/maker.ts";

/**
 * Market maker from Node: keep collateral deposited, watch for open rounds, seal a quote for each one and
 * hand the opening to the prover. Pricing here is a fixed spread over the pool's reference price; a real
 * maker plugs in its own model. The maker address must be on the market roster (`registerMaker`).
 * Env: MAKER_KEY, optional POOLS (comma-separated slugs, default all), SPREAD_BPS (default 10), COORDINATOR_URL.
 */
const niskala = new Niskala({ coordinatorUrl: process.env.COORDINATOR_URL });
const maker = new MakerClient(niskala, { privateKey: must("MAKER_KEY") });
const slugs = process.env.POOLS?.split(",").map((s) => s.trim()) ?? niskala.pools.map((p) => p.slug);
const spreadBps = BigInt(process.env.SPREAD_BPS ?? "10");
const log = (m: string) => console.log(new Date().toISOString(), m);
const quoted = new Set<string>();

log(`maker ${maker.address} on ${slugs.join(", ")}`);
for (const slug of slugs) {
  const pool = niskala.pool(slug);
  if (!(await maker.isRegistered(pool))) throw new Error(`${maker.address} is not on the ${slug} roster; ask the market owner to registerMaker`);
  const tx = await maker.ensureDeposit(pool, BigInt(parseUnits(pool.makerDeposit, pool.base.decimals)));
  log(`${slug}: vault ready${tx ? ` (deposit ${tx.txHash})` : ""}`);
}

for (;;) {
  for (const slug of slugs) {
    const pool = niskala.pool(slug);
    for (const rfq of await maker.openRounds(pool)) {
      const key = `${slug}:${rfq.rfqId}`;
      if (quoted.has(key)) continue;
      quoted.add(key);
      const priceE6 = (BigInt(pool.referencePriceE6) * (10_000n + spreadBps)) / 10_000n;
      try {
        const q = await maker.quote(pool, rfq, priceE6);
        log(`${key}: sealed ${formatPriceE6(priceE6)} USDC per ${pool.base.symbol}, commit ${q.commitTx.txHash}, opening delivered`);
      } catch (err) {
        quoted.delete(key);
        log(`${key}: quote failed: ${(err as Error).message}`);
      }
    }
  }
  await new Promise((r) => setTimeout(r, 2000));
}

function must(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`missing env ${key}`);
  return v;
}
