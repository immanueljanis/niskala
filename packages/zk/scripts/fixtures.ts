import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { quoteCommitment, getBarretenberg } from "../src/poseidon.ts";
import { proveBestQuote, selectWinner, verifyBestQuote } from "../src/prover.ts";
import { domainSeparator, toHex32 } from "../src/fields.ts";
import { FIXTURE_DIR } from "../src/paths.ts";

/**
 * Deterministic world mirrored by contracts/test/RfqMarket.t.sol:
 * chainId 31337, market deployed by MARKET_DEPLOYER at nonce 0, five fixed makers, rfqId 1.
 */
const CHAIN_ID = 31337n;
const MARKET_DEPLOYER = "0x1111111111111111111111111111111111111111";
const MAKERS = [
  "0x00000000000000000000000000000000000000a1",
  "0x00000000000000000000000000000000000000b2",
  "0x00000000000000000000000000000000000000c3",
  "0x00000000000000000000000000000000000000d4",
  "0x00000000000000000000000000000000000000e5",
];
const AMOUNT_OUT = 10n * 10n ** 18n;

function createAddressNonce0(deployer: string): string {
  const rlp = Uint8Array.from([0xd6, 0x94, ...Buffer.from(deployer.slice(2), "hex"), 0x80]);
  return `0x${Buffer.from(keccak_256(rlp)).toString("hex").slice(24)}`;
}

const market = createAddressNonce0(MARKET_DEPLOYER);
const domain = domainSeparator(CHAIN_ID, market);

const cases: Record<string, bigint[]> = {
  full_a_wins: [3501_250000n, 3505_000000n, 3503_100000n, 3506_000000n, 3507_500000n],
  full_e_wins: [3505_000000n, 3503_100000n, 3506_000000n, 3507_500000n, 3501_250000n],
  partial_b_wins: [3505_000000n, 3501_250000n, 3503_100000n],
};

mkdirSync(FIXTURE_DIR, { recursive: true });
for (const [name, prices] of Object.entries(cases)) {
  const t0 = Date.now();
  const rfqId = 1n;
  const makers = MAKERS.slice(0, prices.length);
  const salts = prices.map((_, i) => 0x5a17n + BigInt(i) * 7919n);
  const commitments = await Promise.all(prices.map((priceE6, i) => quoteCommitment({ domain, rfqId, maker: makers[i], priceE6, salt: salts[i] })));
  const winnerIndex = selectWinner(prices);
  const w = { domain, rfqId, makers, commitments, winnerIndex, winningPriceE6: prices[winnerIndex], prices, salts };
  const proof = await proveBestQuote(w);
  if (!(await verifyBestQuote(proof))) throw new Error(`${name}: proof did not verify`);
  const fixture = {
    chainId: Number(CHAIN_ID),
    marketDeployer: MARKET_DEPLOYER,
    market,
    domain: toHex32(domain),
    rfqId: Number(rfqId),
    amountOut: AMOUNT_OUT.toString(),
    count: prices.length,
    makers,
    commitments: commitments.map(toHex32),
    winnerIndex,
    winningPriceE6: Number(prices[winnerIndex]),
    proof: proof.proof,
    publicInputs: proof.publicInputs,
  };
  writeFileSync(resolve(FIXTURE_DIR, `${name}.json`), JSON.stringify(fixture, null, 2));
  console.log(`${name}: count ${prices.length} winner ${winnerIndex} @ ${prices[winnerIndex]} proof ${(proof.proof.length - 2) / 2} bytes in ${Date.now() - t0}ms`);
}
console.log(`market ${market} domain ${toHex32(domain)}`);
await (await getBarretenberg()).destroy();
