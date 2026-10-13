# @niskala/sdk

TypeScript SDK for [Niskala Markets](https://github.com/immanueljanis/niskala): sealed RFQ rounds on Monad where a
zero-knowledge proof, verified by the market contract, shows the winning quote was the best one in the committed set.
The SDK is what the Niskala terminal itself runs on.

- **Trader**: open a round, wait for the proof, execute at the proven price.
- **Maker**: deposit collateral, seal a Poseidon2 quote, hand the opening to the prover with a signed message.
- **Reader**: pools, rounds, proofs and public inputs from the coordinator.
- **Prover**: build and verify the best-execution proof yourself (`@niskala/sdk/prover`).

Chain adapter is Web3.js v4. Works in the browser with any EIP-1193 wallet and in Node with a private key.
Deployed Monad testnet addresses are bundled; no configuration is needed to read.

```sh
pnpm add @niskala/sdk web3
```

## Trader

```ts
import { Niskala, parseUnits } from "@niskala/sdk";

const niskala = new Niskala({ provider: window.ethereum });   // or { provider: "https://..." } + useAccount(key) in Node
const from = (await window.ethereum.request({ method: "eth_requestAccounts" }))[0];
const pool = niskala.pool("weth-usdc");

const amount = parseUnits("10", pool.base.decimals);
const { rfqId } = await niskala.createRfq(pool, amount, { from });

const proven = await niskala.waitForProof(pool, rfqId, { onUpdate: (r) => console.log(r.statusName, r.commitmentCount) });
const cost = await niskala.quoteCost(pool, amount, proven.winningPriceE6);

if (BigInt(await niskala.usdcAllowance(pool, from)) < BigInt(cost)) await niskala.approveUsdc(pool, cost, { from });
await niskala.executeRfq(pool, rfqId, { from });
```

Amounts are base-unit strings (`parseUnits` / `formatUnits`). Prices are USDC per unit with six decimals (`priceE6`,
`formatPriceE6`). A round closes at five sealed commitments or at the commit deadline with at least three; after
`PROVEN` only the trader who opened it can execute, until the settle deadline.

Runnable version: [`examples/trader.ts`](./examples/trader.ts) (`pnpm example:trader` with `TRADER_KEY` in `.env`).

## Maker

```ts
import { Niskala, parseUnits } from "@niskala/sdk";
import { MakerClient } from "@niskala/sdk/maker";

const niskala = new Niskala({ coordinatorUrl: "http://localhost:8787" });
const maker = new MakerClient(niskala, { privateKey: process.env.MAKER_KEY! });
const pool = niskala.pool("weth-usdc");

await maker.ensureDeposit(pool, BigInt(parseUnits(pool.makerDeposit, pool.base.decimals)));
for (const rfq of await maker.openRounds(pool)) {
  await maker.quote(pool, rfq, 2528_000000n);   // your price; it never goes onchain
}
```

`quote()` does three things: computes `Poseidon2(domain, rfqId, maker, priceE6, salt)`, sends `commit(rfqId, commitment)`
from the maker wallet, then POSTs the **opening** (price and salt) to the coordinator, signed with the maker key
(EIP-191). The coordinator accepts it only if the signature recovers to a maker that has a commitment in that round and
the opening hashes to that exact commitment. The prover needs every committed maker's opening to build the proof, so a
maker that commits without delivering its opening stalls the round until the settle deadline.

The maker entry loads Barretenberg (WASM) for Poseidon2, which is why it is a separate import. Call
`destroyBarretenberg()` before exiting a Node script. The maker address must be on the market roster
(`niskala.registerMaker`, market owner only).

Runnable version: [`examples/maker.ts`](./examples/maker.ts) (`pnpm example:maker` with `MAKER_KEY` in `.env`).

## Reader

```ts
const { pools } = await niskala.coordinator.pools();        // registry + live stats
const view = await niskala.coordinator.round("weth-usdc", "2");
view.chain.statusName;                                      // OPEN | COMMIT_CLOSED | PROVEN | SETTLED | CANCELLED
view.offchain.proof?.publicInputs;                          // 15 bytes32: domain, rfqId, makers[5], commitments[5], count, winnerIndex, winningPriceE6
const { proof } = await niskala.coordinator.proof("weth-usdc", "2");   // raw UltraHonk bytes
```

Chain reads work without the coordinator: `getRfq`, `recentRfqs`, `available`, `balances`, `quoteCost`, `blockNumber`.

## Prover

```ts
import { proveBestQuote, verifyBestQuote, selectWinner } from "@niskala/sdk/prover";
```

Re-exported from the workspace package `@niskala/zk` (compiled Noir circuit + bb.js UltraHonk). Node only, monorepo
only until that package is published. `submitProof` on the client is permissionless, so anyone holding the openings
can prove and relay.

## Configuration

```ts
new Niskala({
  chainId: 10143,                      // default: Monad testnet
  provider: "https://rpc.ankr.com/monad_testnet" | eip1193 | web3Instance,
  registry: customRegistryJson,        // default: bundled packages/pools/pools.json
  coordinatorUrl: "http://localhost:8787",
});
```

`registry` lets you point at a local anvil deployment; the shape is the one in `packages/pools/pools.json`.

## Security notes

- Openings leave the maker only in the signed HTTP request to the coordinator and never go onchain. The coordinator
  that builds the proof sees them; removing that trust (MPC/FHE/TEE proving) is roadmap, not a claim.
- `commit` locks the full round size from the maker's vault, so every sealed quote can fill.
- Monad charges gas on the gas limit; the SDK uses fixed limits for `commit`, `closeCommit` and `expire` and lets the
  provider estimate the rest.

## Development

```sh
pnpm --filter @niskala/sdk gen        # regenerate src/generated from packages/pools and packages/abi
pnpm --filter @niskala/sdk test       # node:test (includes a drift guard for the generated files)
pnpm --filter @niskala/sdk build      # dist/ for publishing (publishConfig points exports at dist)
```
