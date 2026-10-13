import { addWallet, readRfq, sendWithEstimate, Status, web3 } from "../src/chain.ts";
import { config } from "../src/config.ts";
import { MAX_MAKERS } from "@niskala/zk";
import { poolBySlug, pools, usdc } from "../src/pools.ts";

/**
 * Scripted end-to-end run as the trader, against a live coordinator:
 * mint USDC -> create RFQ -> wait for 3 sealed commitments + onchain proof -> approve -> execute -> assert balances.
 * Env: TRADER_KEY, optional POOL (slug, default first pool), AMOUNT (base units, default pool.defaultSize).
 */
const trader = addWallet(process.env.TRADER_KEY ?? "");
const pool = process.env.POOL ? poolBySlug(process.env.POOL) : pools[0];
if (!pool) throw new Error(`unknown pool ${process.env.POOL}`);
const AMOUNT_OUT = BigInt(web3.utils.toWei(process.env.AMOUNT ?? pool.spec.defaultSize, "ether"));
const WAIT_MS = Number(process.env.LIFECYCLE_TIMEOUT_MS ?? 240_000);
const sym = pool.spec.base.symbol;
const tx = (h: string) => `${config.explorerTxBase}${h}`;
const fmtBase = (v: bigint) => web3.utils.fromWei(v, "ether");

function log(msg: string) {
  console.log(`${new Date().toISOString()} ${msg}`);
}

const monBalance = BigInt(await web3.eth.getBalance(trader.address));
if (monBalance === 0n) throw new Error(`trader ${trader.address} has no MON for gas`);

const usdcBalance = BigInt(await usdc.methods.balanceOf(trader.address).call());
if (usdcBalance < 100_000n * 10n ** 6n) {
  const r = await sendWithEstimate(usdc.methods.mint(trader.address, 100_000n * 10n ** 6n), trader.address);
  log(`minted 100,000 test USDC ${tx(r.txHash)}`);
}
const baseBefore = BigInt(await pool.base.methods.balanceOf(trader.address).call());
const usdcBefore = BigInt(await usdc.methods.balanceOf(trader.address).call());

const created = await sendWithEstimate(pool.market.methods.createRfq(AMOUNT_OUT, pool.spec.commitWindowSec, pool.spec.settleWindowSec), trader.address);
const rfqId = BigInt(await pool.market.methods.rfqCount().call());
log(`${pool.slug} RFQ #${rfqId} created: BUY ${fmtBase(AMOUNT_OUT)} ${sym} ${tx(created.txHash)}`);

const deadline = Date.now() + WAIT_MS;
let lastStatus = -1;
let lastCount = -1;
let rfq = await readRfq(pool.market, rfqId);
while (rfq.status !== Status.PROVEN) {
  if (rfq.status === Status.CANCELLED) throw new Error("round cancelled");
  if (Date.now() > deadline) throw new Error(`timed out waiting for proof (status ${rfq.statusName}, ${rfq.commitmentCount}/${MAX_MAKERS} commitments)`);
  if (rfq.commitmentCount !== lastCount) {
    lastCount = rfq.commitmentCount;
    log(`sealed commitments: ${lastCount}/${MAX_MAKERS}`);
  }
  if (rfq.status !== lastStatus) {
    lastStatus = rfq.status;
    log(`status: ${rfq.statusName}`);
  }
  await new Promise((r) => setTimeout(r, 1500));
  rfq = await readRfq(pool.market, rfqId);
}
log(`status: PROVEN  winner slot ${rfq.winnerIndex} (${rfq.makers[rfq.winnerIndex]})  price ${(Number(rfq.winningPriceE6) / 1e6).toFixed(4)} USDC/${sym}  proofHash ${rfq.proofHash}`);

const cost = BigInt(await pool.market.methods.quoteCost(AMOUNT_OUT, rfq.winningPriceE6).call());
await sendWithEstimate(usdc.methods.approve(pool.spec.market, cost), trader.address);
const executed = await sendWithEstimate(pool.market.methods.execute(rfqId), trader.address);
log(`executed: paid ${(Number(cost) / 1e6).toFixed(2)} USDC ${tx(executed.txHash)}`);

const baseAfter = BigInt(await pool.base.methods.balanceOf(trader.address).call());
const usdcAfter = BigInt(await usdc.methods.balanceOf(trader.address).call());
const final = await readRfq(pool.market, rfqId);
const checks: Array<[string, boolean]> = [
  ["status SETTLED", final.status === Status.SETTLED],
  [`trader received exactly ${fmtBase(AMOUNT_OUT)} ${sym}`, baseAfter - baseBefore === AMOUNT_OUT],
  ["trader paid exactly the proven price", usdcBefore - usdcAfter === cost],
  ["usdcPaid recorded", BigInt(final.usdcPaid) === cost],
];
for (const [label, ok] of checks) log(`${ok ? "PASS" : "FAIL"} ${label}`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
log(`lifecycle complete for ${pool.slug} RFQ #${rfqId}`);
process.exit(0);
