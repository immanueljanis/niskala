# Niskala Markets

**Private quotes. Provably best execution.**

Monad Metropolis · Track 01 — Onchain Finance & Trading

Niskala is a sealed RFQ market on Monad. Up to five market makers compete for a fixed-size trade
without publishing their prices. A zero-knowledge proof, verified by a contract on Monad, shows
that the selected quote is the best valid quote across the complete committed set. Only the winning
price is revealed, then WETH and USDC settle atomically in the same market contract.

> Existing RFQ: private quotes + trusted routing.
> Niskala: private quotes + verifiable routing.

## What is real in this build

| Piece | Implementation |
|---|---|
| Sealed quotes | Poseidon2 commitments `H(domain, rfqId, maker, priceE6, salt)` sent onchain by up to five independent maker wallets |
| Best-execution proof | Noir circuit (`circuits/best_quote`) proved with Barretenberg UltraHonk (`@aztec/bb.js`, keccak/EVM target) |
| Onchain verification | Generated `HonkVerifier.sol` deployed on Monad; `RfqMarket.submitProof` rebuilds the public inputs from storage and reverts on an invalid proof |
| Settlement | `RfqMarket.execute`: trader's USDC → winning maker, maker's vaulted WETH → trader, losers' locks released, in one transaction |
| Frontend | Next.js 16 + Web3.js v4 (isolated in `apps/web/src/lib/chain/`) against the official Monad testnet config |

Nothing is mocked except the two test tokens (`MockERC20` with an open `mint` faucet).

### Honest privacy boundary

Losing prices and salts never reach the trader, the frontend or the chain. The coordinator process
that runs the three demo makers and the prover **does** see the quote openings, because it builds
the witness. Privacy against the coordinator (MPC / FHE / TEE proving) is roadmap, not a claim.

| Data | Visibility |
|---|---|
| RFQ pair, size, direction, participating makers | Public |
| Quote commitments | Public |
| Winning price, winner, proof, verifier result, settlement tx | Public after proof |
| Losing prices, salts | Private from trader and chain (known to coordinator/prover) |
| Maker pricing strategy, inventory model | Private (never leave the maker object) |

## The ZK statement

Public inputs (15 × bytes32, in this order):
`domain, rfqId, makers[5], commitments[5], count, winnerIndex, winningPriceE6`
with `domain = (chainId << 160) | marketAddress`.

Private witness: `prices[5]`, `salts[5]` (slots beyond `count` are zero and ignored).

Constraints: `1 <= count <= 5`, `winnerIndex < count`; for every committed slot the opening hashes to its commitment, the price is positive,
`winningPrice <= prices[i]`, and strictly smaller than every earlier slot (first minimum wins ties); `winningPrice == prices[winnerIndex]`.

Because the contract rebuilds the public inputs from its own storage, a proof is bound to one chain,
one market, one RFQ and one exact commitment set. Tests show that altering any salt, price,
commitment, the winner index or the winning price, or replaying the proof on another RFQ, is rejected
both in JS (`pnpm zk:test`) and onchain (`forge test`, real proofs in `contracts/test/fixtures`).

## Repository

```
apps/web            Next.js 16, Tailwind 4, Web3.js v4 — landing, RFQ terminal, round page, proof inspector
apps/coordinator    Node 24 service: 3 maker wallets (private strategies), prover, relayer, REST API
packages/zk         noir_wasm compile · bb.js Poseidon2 + UltraHonk prove/verify · verifier + fixture generators
packages/abi        ABIs exported from Foundry
circuits/best_quote Noir circuit (+ vendored noir-lang/poseidon v0.4.0 in circuits/poseidon)
contracts           Foundry: RfqMarket.sol, HonkVerifier.sol (generated), MockERC20.sol, Deploy.s.sol, tests
docs                ARCHITECTURE, DEMO runbook, THREAT_MODEL, SUBMISSION write-up, original build pack
STATE.md · RESEARCH.md · DECISIONS.md   build log, prior-art audit, decision record
```

## Quick start

Prerequisites: Node ≥ 22 (24 used), pnpm 11, Foundry (`forge`, `cast`, `anvil`). No native `nargo`/`bb` needed:
the circuit compiles through `@noir-lang/noir_wasm` and proves through `@aztec/bb.js` WASM.

```bash
pnpm install
pnpm check            # zk tests, forge tests (real proofs), typecheck, web build
```

### Run the demo against Monad testnet

1. Copy `apps/coordinator/.env.example` → `apps/coordinator/.env`, fill the maker, relayer and deployer keys
   (any fresh keys; `cast wallet new`). Fund the deployer with testnet MON from https://faucet.monad.xyz.
2. Deploy and fund:
   ```bash
   pnpm deploy:monad     # deploys mocks + HonkVerifier + RfqMarket, writes addresses to both env files
   pnpm setup:monad      # tops up makers/relayer/trader with MON, deposits 500 WETH per maker, mints trader USDC
   ```
3. Start everything:
   ```bash
   pnpm dev              # coordinator on :8787 + web on :3000
   ```
4. Open http://localhost:3000 → **Open RFQ Terminal** → connect MetaMask (Monad Testnet is added automatically)
   → **Mint 100,000 test USDC** → **Request Private Quotes** → watch three sealed commitments land, the proof
   verify onchain, then **Execute**. The receipt and proof inspector link every transaction on MonadVision.
   Your wallet needs a little testnet MON for gas: paste its address at https://faucet.monad.xyz (no login needed).

Browser end-to-end without MetaMask (injected test wallet signing with `TRADER_KEY`): run
`apps/web/test/wallet-e2e.playwright.js` through a Playwright session (see the file header).

Scripted alternative that doubles as the integration test (uses `TRADER_KEY` from `.env`):

```bash
pnpm lifecycle:monad
```

### Local rehearsal (anvil)

```bash
anvil --chain-id 31337                     # terminal 1
# .env.anvil: same layout as .env but RPC http://127.0.0.1:8545, CHAIN_ID 31337, PORT 8788, anvil key 0 as DEPLOYER_KEY
cd contracts && DEPLOYER_KEY=... MAKERS=... forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
cd apps/coordinator && node --env-file=.env.anvil --import tsx scripts/setup.ts
node --env-file=.env.anvil --import tsx src/index.ts   # terminal 2
node --env-file=.env.anvil --import tsx scripts/lifecycle.ts
```

## Markets (Monad testnet)

Eight RFQ markets, each its own `RfqMarket` contract sharing one HonkVerifier ([`0x22Aaeff3…`](https://testnet.monadvision.com/address/0x22Aaeff3Df06535AeFD92D5475628D2eF61c4FaD)), one mock USDC ([`0x9a0653C6…`](https://testnet.monadvision.com/address/0x9a0653C6a22318dE8e89e696422eFD9fE7d7dF1D)) and the same five makers. A round closes at five sealed commitments, or at the commit deadline with at least three. Registry: `packages/pools/pools.json`; logos in `apps/web/public/tokens`; deploy with `pnpm deploy:pools`, fund with `pnpm setup:monad`.

| Market | Tier | Base token | RfqMarket | Maker deposit (each) | Default / max size | Price feed |
|---|---|---|---|---|---|---|
| WETH / USDC | Majors | [`0x91F2388e…`](https://testnet.monadvision.com/address/0x91F2388e78906ef91fB7E673A45d21852027B835) | [`0xCB6B0505…`](https://testnet.monadvision.com/address/0xCB6B05059d5Fe13866612Ff1c391Aa812364B609) | 500 WETH | 10 / 100 | CoinGecko `ethereum` |
| WBTC / USDC | Majors | [`0x12e36137…`](https://testnet.monadvision.com/address/0x12e36137B87431e23429B112Cbd51e7a680196DD) | [`0xB29AF2bD…`](https://testnet.monadvision.com/address/0xB29AF2bD7e086B0347434B5888eB42bF7BA83AeC) | 25 WBTC | 0.5 / 5 | CoinGecko `bitcoin` |
| WMON / USDC | Monad | [`0xE2958467…`](https://testnet.monadvision.com/address/0xE29584674c46f492663424c5848aAA5C550C9116) | [`0xAa6942Fd…`](https://testnet.monadvision.com/address/0xAa6942Fdf7C2658a662fA48cBb1aD10d5ca9FBD2) | 500,000 WMON | 10000 / 100000 | CoinGecko `monad` |
| SOL / USDC | Majors | [`0x0b7eA661…`](https://testnet.monadvision.com/address/0x0b7eA6619842625BD56e8Bcf50cEAefF6d935F76) | [`0x49294a48…`](https://testnet.monadvision.com/address/0x49294a487b54Ebe500e1696F535F31267f6e290e) | 5,000 SOL | 100 / 1000 | CoinGecko `solana` |
| LINK / USDC | DeFi | [`0x3eef804e…`](https://testnet.monadvision.com/address/0x3eef804e7E7f55E972A1E4D8c4ccFC5779db6f23) | [`0x1c65C0Bf…`](https://testnet.monadvision.com/address/0x1c65C0Bf82A25e037e6A04739fB6c3F5A161Fdba) | 25,000 LINK | 500 / 5000 | CoinGecko `chainlink` |
| UNI / USDC | DeFi | [`0xf9E94B9C…`](https://testnet.monadvision.com/address/0xf9E94B9CD4eD5Ac8F398cCCB4dCDB07F66A0D913) | [`0x2710E1f1…`](https://testnet.monadvision.com/address/0x2710E1f1954fba536E75B5C9d28A9bc809FF7290) | 50,000 UNI | 1000 / 10000 | CoinGecko `uniswap` |
| AAVE / USDC | DeFi | [`0xC1D4B776…`](https://testnet.monadvision.com/address/0xC1D4B77612310a0879EF2459B7231604C546FAB0) | [`0xBd4C2923…`](https://testnet.monadvision.com/address/0xBd4C2923A62e039C735aF64219ec81994027A75c) | 2,500 AAVE | 50 / 500 | CoinGecko `aave` |
| ARB / USDC | L2 | [`0x8739f97b…`](https://testnet.monadvision.com/address/0x8739f97b5e575329dEEB3294675c6adAc72B8d60) | [`0x7AED9229…`](https://testnet.monadvision.com/address/0x7AED92298E3294114B2D4497e5Dcb68eCBc329C6) | 250,000 ARB | 5000 / 50000 | CoinGecko `arbitrum` |

All base tokens are 18-decimal mocks with an open `mint`; prices are integer USDC per unit with 6 decimals (`priceE6`), so a 0.0249 USDC WMON quote is `24900`. Every market is Sourcify-verified on MonadVision. The v1 deployment (three fixed slots; RfqMarket [`0x054694A7…`](https://testnet.monadvision.com/address/0x054694A70B61AA6493A14ea729f7044986A30F9D), verifier [`0x4978Ca3B…`](https://testnet.monadvision.com/address/0x4978Ca3B939D93e0611Bc317aD0e923D0FEA6354)) stays onchain and holds round #1.

## Deployment (Monad testnet, chainId 10143)

Deployed 2026-10-13 and verified on MonadVision (Sourcify runtime match):

| Contract | Address |
|---|---|
| RfqMarket | [`0x054694A70B61AA6493A14ea729f7044986A30F9D`](https://testnet.monadvision.com/address/0x054694A70B61AA6493A14ea729f7044986A30F9D) |
| HonkVerifier | [`0x4978Ca3B939D93e0611Bc317aD0e923D0FEA6354`](https://testnet.monadvision.com/address/0x4978Ca3B939D93e0611Bc317aD0e923D0FEA6354) |
| Mock USDC (6 dec, open mint) | [`0x9a0653C6a22318dE8e89e696422eFD9fE7d7dF1D`](https://testnet.monadvision.com/address/0x9a0653C6a22318dE8e89e696422eFD9fE7d7dF1D) |
| Mock WETH (18 dec, open mint) | [`0x91F2388e78906ef91fB7E673A45d21852027B835`](https://testnet.monadvision.com/address/0x91F2388e78906ef91fB7E673A45d21852027B835) |
| Makers (roster) | `0x3cDe2bfeF87f8eFc65FC381219b77B9F4BFc72f4`, `0x2A3780c5A61975117BeEF7BDa931ffB0d795cD9D`, `0x981E3471e32c3dec3E847dcf43364Fa972D34FE9` |

First live round, RFQ #1 (driven from the browser through the Web3.js wallet path):
create [`0xd999ac25…`](https://testnet.monadvision.com/tx/0xd999ac25d2f37a2804226b83bcd7518c0405f25d4b70fdd85e3a0ca0f56b2539)
→ three commits → proof verified [`0x61361d73…`](https://testnet.monadvision.com/tx/0x61361d73a9022d6a91947871c67b8328a01459e2e74e2d700bb4e8618709365f)
→ settled [`0x978ca23d…`](https://testnet.monadvision.com/tx/0x978ca23de830b7ee67e7b0e7d525abc6d57bc1e822d02fd9ff4edbfe6a02d642) (see the receipt on `/rfq/1`).

Addresses are written to `contracts/deployments/10143.json` by `pnpm deploy:monad` and mirrored into
`apps/coordinator/.env` and `apps/web/.env.local`.

Network values are taken from the official docs (https://docs.monad.xyz/developer-essentials/testnets):
RPC `https://testnet-rpc.monad.xyz`, explorer `https://testnet.monadvision.com`, faucet `https://faucet.monad.xyz`.

## Numbers

| Metric | Value |
|---|---|
| Proof size | 7,232 bytes (+ 15 public inputs) |
| Proving time (bb.js WASM, laptop) | 0.5–3 s |
| Onchain verification gas | ≈ 2.4 M execution (forge) · ≈ 3.5 M on anvil incl. calldata · 5.8 M reported on Monad testnet (≈ 0.6 MON at 102 gwei) |
| HonkVerifier runtime size | 18.3 KB |
| Round on Monad | create → 5 commits (≈ 1.6 s) → proof verified (≈ 5 s) → execute (≈ 7 s) |
| Markets | 8 (WETH, WBTC, WMON, SOL, LINK, UNI, AAVE, ARB vs USDC) · 5 makers per round |

## Limitations (hackathon scope)

- Up to five maker slots; the circuit takes all five slots plus `count` as public inputs. Arbitrary-size completeness
  (Merkle root of the eligible set) is V1.
- One market (WETH/USDC), BUY side, full-fill quotes only.
- Five simulated makers run inside the coordinator (own wallets and private strategies, but one process).
- Coordinator sees openings (see boundary above). No delivery receipts / slashing for makers who withhold openings.
- Mock tokens, testnet only.

## Tests

- `pnpm zk:test` — circuit via JS: A/B/C winners, tie rule, tamper rejection, replay rejection.
- `nargo test` in `circuits/best_quote` (Linux/WSL; nargo has no Windows build).
- `forge test --root contracts` — 23 tests including lifecycle with real proofs, wrong-winner/price/commitment/RFQ rejection,
  double execution, expiry unlock, vault accounting.
- `apps/coordinator/scripts/lifecycle.ts` — scripted end-to-end against a live chain.

## License

MIT for Niskala code. `circuits/poseidon` is noir-lang/poseidon (MIT), vendored unchanged.
