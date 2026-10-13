import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Web3 } from "web3";
import { getBarretenberg, quoteCommitment } from "@niskala/zk";
import { DEFAULT_REGISTRY, Niskala, RfqMarketAbi, domainSeparator, findPool, formatPriceE6, formatUnits, loadRegistry, normalizeRfq, openingMessage, parsePriceE6, parseUnits, recoverOpeningSigner, signOpening } from "../src/index.ts";
import { MakerClient, commitment, destroyBarretenberg, toBytes32 } from "../src/maker.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const MARKET = "0xCB6B05059d5Fe13866612Ff1c391Aa812364B609";

after(async () => {
  await destroyBarretenberg();
  await (await getBarretenberg()).destroy();
});

test("bundled registry and ABI match the workspace JSON sources", () => {
  assert.deepEqual(DEFAULT_REGISTRY, JSON.parse(readFileSync(resolve(root, "packages/pools/pools.json"), "utf8")));
  assert.deepEqual(RfqMarketAbi, JSON.parse(readFileSync(resolve(root, "packages/abi/RfqMarket.json"), "utf8")));
});

test("registry lookup", () => {
  const chain = loadRegistry(10143);
  assert.equal(chain.pools.length, 8);
  assert.equal(chain.quote.symbol, "USDC");
  assert.match(chain.verifier, /^0x[0-9a-fA-F]{40}$/);
  assert.equal(findPool(chain.pools, "weth-usdc")?.market, MARKET);
  assert.equal(findPool(chain.pools, MARKET.toLowerCase())?.slug, "weth-usdc");
  assert.throws(() => loadRegistry(1), /no Niskala deployment/);
  assert.equal(domainSeparator(10143, MARKET), (10143n << 160n) | BigInt(MARKET));
});

test("units", () => {
  assert.equal(parseUnits("1.5", 18), "1500000000000000000");
  assert.equal(parseUnits("10", 6), "10000000");
  assert.equal(formatUnits("1500000000000000000", 18), "1.5");
  assert.equal(parsePriceE6("2528.000796"), "2528000796");
  assert.equal(formatPriceE6("2528000796"), "2528.000796");
  assert.throws(() => parseUnits("1,5", 18));
});

test("normalizeRfq stringifies bigint fields", () => {
  const r = normalizeRfq(7n, { trader: "0xabc", amountOut: 10n ** 19n, commitDeadline: 1n, settleDeadline: 2n, status: 3n, commitmentCount: 5n, winnerIndex: 1n, winningPriceE6: 2528000796n, makers: ["0x1"], commitments: ["0x2"], proofHash: "0x3", usdcPaid: 0n });
  assert.equal(r.rfqId, "7");
  assert.equal(r.statusName, "PROVEN");
  assert.equal(r.amountOut, "10000000000000000000");
  assert.equal(r.winningPriceE6, "2528000796");
});

test("opening message is canonical and signatures recover the maker", async () => {
  const account = new Web3().eth.accounts.create();
  const claim = { chainId: 10143, market: MARKET, rfqId: "7", maker: account.address, priceE6: "2528000796", salt: "12345" };
  const message = openingMessage(claim);
  assert.equal(message, `Niskala quote opening\nchainId: 10143\nmarket: ${MARKET.toLowerCase()}\nrfqId: 7\nmaker: ${account.address.toLowerCase()}\npriceE6: 2528000796\nsalt: 12345`);
  const signed = await signOpening(claim, { privateKey: account.privateKey });
  assert.equal(recoverOpeningSigner(signed), account.address.toLowerCase());
  assert.notEqual(recoverOpeningSigner({ ...signed, priceE6: "1" }), account.address.toLowerCase());
});

test("commitment matches the zk package's Poseidon2 commitment", async () => {
  const o = { domain: domainSeparator(10143, MARKET), rfqId: 7n, maker: "0x3cDe2bfeF87f8eFc65FC381219b77B9F4BFc72f4", priceE6: 2528000796n, salt: 99n };
  const mine = await commitment(o);
  assert.equal(mine, await quoteCommitment(o));
  assert.match(toBytes32(mine), /^0x[0-9a-f]{64}$/);
});

test("client and maker work offline up to the first chain call", async () => {
  const niskala = new Niskala();
  assert.equal(niskala.chainId, 10143);
  assert.equal(niskala.pool("weth-usdc").market, MARKET);
  assert.equal(niskala.domain(MARKET), domainSeparator(10143, MARKET));
  const key = new Web3().eth.accounts.create();
  const maker = new MakerClient(niskala, { privateKey: key.privateKey });
  assert.equal(maker.address, key.address);
  const sealed = await maker.sealed("weth-usdc", 7n, 2528000796n, 42n);
  assert.equal(recoverOpeningSigner(sealed.opening), key.address.toLowerCase());
  assert.equal(sealed.commitment, await commitment({ domain: niskala.domain(MARKET), rfqId: 7n, maker: key.address, priceE6: 2528000796n, salt: 42n }));
});
