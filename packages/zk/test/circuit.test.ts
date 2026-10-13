import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { quoteCommitment, getBarretenberg } from "../src/poseidon.ts";
import { MAX_MAKERS, proveBestQuote, publicInputsOf, selectWinner, verifyBestQuote, type RoundWitness } from "../src/prover.ts";
import { domainSeparator } from "../src/fields.ts";

const MAKERS = [
  "0x00000000000000000000000000000000000000a1",
  "0x00000000000000000000000000000000000000b2",
  "0x00000000000000000000000000000000000000c3",
  "0x00000000000000000000000000000000000000d4",
  "0x00000000000000000000000000000000000000e5",
];
const DOMAIN = domainSeparator(31337, "0x1234567890123456789012345678901234567890");

async function round(prices: bigint[], winnerIndex = selectWinner(prices), winningPriceE6 = prices[winnerIndex]): Promise<RoundWitness> {
  const makers = MAKERS.slice(0, prices.length);
  const salts = prices.map((_, i) => 1000n + BigInt(i));
  const commitments = await Promise.all(prices.map((priceE6, i) => quoteCommitment({ domain: DOMAIN, rfqId: 1n, maker: makers[i], priceE6, salt: salts[i] })));
  return { domain: DOMAIN, rfqId: 1n, makers, commitments, winnerIndex, winningPriceE6, prices, salts };
}

async function expectRejected(w: RoundWitness, label: string) {
  let failed = false;
  try {
    const proof = await proveBestQuote(w);
    failed = !(await verifyBestQuote(proof));
  } catch {
    failed = true;
  }
  assert.ok(failed, `${label}: expected witness/proof to be rejected`);
}

before(async () => {
  await getBarretenberg();
});
after(async () => {
  await (await getBarretenberg()).destroy();
});

test("full round of 5: each slot can win; public inputs match the contract layout", async () => {
  const base = [3505_000000n, 3503_000000n, 3504_000000n, 3506_000000n, 3507_000000n];
  for (let w = 0; w < MAX_MAKERS; w++) {
    const prices = base.map((p, i) => (i === w ? 3501_250000n : p));
    const witness = await round(prices);
    assert.equal(witness.winnerIndex, w);
    const proof = await proveBestQuote(witness);
    assert.equal(proof.publicInputs.length, 2 + MAX_MAKERS * 2 + 3);
    assert.deepEqual(proof.publicInputs, publicInputsOf(witness));
    assert.ok(await verifyBestQuote(proof), `winner ${w} should verify`);
  }
});

test("partial round of 3 verifies; unused slots are zero in the public inputs", async () => {
  const w = await round([3505_000000n, 3501_250000n, 3503_100000n]);
  const proof = await proveBestQuote(w);
  const pi = publicInputsOf(w);
  assert.equal(pi[2 + 3], `0x${"0".repeat(64)}`);
  assert.equal(pi[2 + MAX_MAKERS * 2], `0x${"0".repeat(63)}3`);
  assert.ok(await verifyBestQuote(proof));
});

test("tie resolves to the first minimum; later tied index is rejected", async () => {
  const prices = [3505_000000n, 3501_250000n, 3501_250000n];
  assert.equal(selectWinner(prices), 1);
  assert.ok(await verifyBestQuote(await proveBestQuote(await round(prices))));
  await expectRejected(await round(prices, 2), "tie index 2");
});

test("tampering is rejected: salt, price, commitment, false winner, price mismatch, winner outside count", async () => {
  const prices = [3505_000000n, 3501_250000n, 3503_100000n];
  const base = await round(prices);
  await expectRejected({ ...base, salts: [base.salts[0] + 1n, base.salts[1], base.salts[2]] }, "altered salt");
  await expectRejected({ ...base, prices: [3500_000000n, prices[1], prices[2]] }, "altered price");
  await expectRejected({ ...base, commitments: [base.commitments[0] + 1n, base.commitments[1], base.commitments[2]] }, "altered commitment");
  await expectRejected({ ...base, winnerIndex: 0, winningPriceE6: prices[0] }, "false winner");
  await expectRejected({ ...base, winningPriceE6: prices[1] - 1n }, "winning price mismatch");
  await assert.rejects(proveBestQuote({ ...base, winnerIndex: 3 }), "winner outside count");
});

test("a valid proof fails against different public inputs (replay to another RFQ or a different count)", async () => {
  const w = await round([3505_000000n, 3501_250000n, 3503_100000n]);
  const proof = await proveBestQuote(w);
  const replayed = { ...proof, publicInputs: publicInputsOf({ ...w, rfqId: 2n }) };
  assert.equal(await verifyBestQuote(replayed).catch(() => false), false);
  const grown = { ...proof, publicInputs: proof.publicInputs.map((v, i) => (i === 2 + MAX_MAKERS * 2 ? `0x${"0".repeat(63)}4` : v)) as `0x${string}`[] };
  assert.equal(await verifyBestQuote(grown).catch(() => false), false);
});
