import assert from "node:assert/strict";
import { test } from "node:test";

process.env.RPC_URL ??= "http://127.0.0.1:1";
process.env.CHAIN_ID ??= "10143";
process.env.RELAYER_KEY ??= `0x${"11".repeat(32)}`;

const { decodeMarketLog, proofFromCalldata } = await import("../src/history.ts");
const { abi, web3 } = await import("../src/chain.ts");

const MARKET = "0xCB6B05059d5Fe13866612Ff1c391Aa812364B609";
const TRADER = "0x519c812bF546B1AAfc956E16de85Af8C4C78DA2F";
const pad = (v: string | bigint) => web3.eth.abi.encodeParameter(typeof v === "string" ? "address" : "uint256", v);
const event = (name: string) => abi("RfqMarket").find((f) => f.type === "event" && f.name === name);

test("decodeMarketLog turns a HyperSync log into a typed market event", () => {
  const ev = event("RfqCreated");
  const log = {
    address: MARKET.toLowerCase(),
    topics: [web3.eth.abi.encodeEventSignature(ev), pad(7n), pad(TRADER)],
    data: web3.eth.abi.encodeParameters(["uint256", "uint64", "uint64"], ["10000000000000000000", "1700000000", "1700000900"]),
    blockNumber: 70_600_000,
    logIndex: 3,
    transactionHash: "0xABCDEF",
  };
  const e = decodeMarketLog(log);
  assert.ok(e);
  assert.equal(e.name, "RfqCreated");
  assert.equal(e.market, MARKET.toLowerCase());
  assert.equal(e.rfqId, "7");
  assert.equal(e.args.trader.toLowerCase(), TRADER.toLowerCase());
  assert.equal(e.args.amountOut, "10000000000000000000");
  assert.equal(e.txHash, "0xabcdef");
  assert.equal(decodeMarketLog({ ...log, topics: [`0x${"00".repeat(32)}`] }), null);
});

test("proofFromCalldata recovers the proof bytes from a submitProof transaction", () => {
  const fn = abi("RfqMarket").find((f) => f.type === "function" && f.name === "submitProof");
  const input = web3.eth.abi.encodeFunctionCall(fn, ["7", "3", "2528000796", "0xdeadbeef"]);
  assert.deepEqual(proofFromCalldata(input), { proof: "0xdeadbeef", winnerIndex: 3, winningPriceE6: "2528000796" });
  assert.equal(proofFromCalldata("0x12345678"), null);
});
