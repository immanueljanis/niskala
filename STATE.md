# STATE — Niskala Markets

_Last updated: 2026-10-13 (after Monad testnet deployment and first live round)_

## Status: demo-ready on Monad testnet

RFQ #1 ran end to end **on Monad testnet from the browser** through the Web3.js wallet path
(injected EIP-1193 test wallet, same code path as MetaMask): mint test USDC → create RFQ →
three sealed commits from three maker wallets → UltraHonk proof (0.6 s) → verified onchain →
approve + execute → receipt. Trader received exactly 10 WETH and paid 24,556.02 USDC at the proven price.

| Item | Value |
|---|---|
| RfqMarket | `0x054694A70B61AA6493A14ea729f7044986A30F9D` (Sourcify match) |
| HonkVerifier | `0x4978Ca3B939D93e0611Bc317aD0e923D0FEA6354` (Sourcify match) |
| Mock USDC / WETH | `0x9a0653C6a22318dE8e89e696422eFD9fE7d7dF1D` / `0x91F2388e78906ef91fB7E673A45d21852027B835` |
| RFQ #1 create / proof / settle | `0xd999ac25…` / `0x61361d73…` / `0x978ca23d…` |
| Proof verification gas on Monad | 5,816,256 (≈ 0.6 MON at 102 gwei) |
| Balances after run | deployer ≈ 1.0 MON · relayer ≈ 5.9 MON (≈ 9 more proofs) · makers 0.3 MON each · trader 0.28 MON |

## Makers v5 (2026-10-13): up to five makers per round
Circuit widened to N = 5 slots with a public `count` (nargo 4/4, JS 5/5); RfqMarket MAX_SLOTS 5 / MIN_SLOTS 3 (26 Foundry tests
with real proofs incl. partial rounds). New verifier `0x22Aaeff3Df06535AeFD92D5475628D2eF61c4FaD` (deployed via forge script with linked
libraries) and eight v2 markets, all Sourcify-verified; v1 addresses kept under `legacy` in the registry. Five maker wallets funded and
deposited in all eight pools. WETH/USDC round #2: 5 commits, proof 1.4 s / 15 public inputs, verified onchain (5.83 M gas), settled; PASS.
RPC: official endpoint now limits 15 rps/IP; coordinator has a 10 rps token bucket + 429 retry; browser reads use Ankr.
Deployer ≈ 9.7 MON, relayer ≈ 3.5 MON.

## Markets v4 (2026-10-13)
Eight pools live on Monad testnet (WETH, WBTC, WMON, SOL, LINK, UNI, AAVE, ARB vs USDC): one RfqMarket each, shared verifier,
Sourcify-verified, makers funded with per-pool deposits. Registry `packages/pools/pools.json` drives coordinator (multi-pool watcher,
`/api/pools` with live liquidity/rounds/volume/last price) and web (pool selector in terminal, Markets section, `/rfq/<pool>/<id>`).
First live WMON round (#1) was created from the user wallet and proven onchain. Deployer ≈ 2.6 MON, relayer ≈ 5 MON.

## Design v3 (2026-10-13, light editorial system after second feedback round)
Full redesign of every surface after the TrustFlow reference: light palette with pine brand colour, Source Serif 4 display,
no borders, tonal tiles, white overlap card, same canvas hero in light tones. See `DESIGN.md` and `docs/DESIGN-REVIEW.md` (v3).
Screenshots `docs/screenshots/v3-*.png`. Typecheck, build and verifier pass; no console errors; no overflow at 390 px.

## Design v4 (2026-10-13, copy trim + three.js hero)
Unnecessary copy removed across landing, terminal and round pages (one sentence per idea, no repeated facts).
Hero replaced by `HeroScene.tsx`: three.js line terrain, simplex noise in the vertex shader, pine proof front every 11 s,
pointer-eased camera, reduced-motion static frame, pauses off screen. Screenshots `docs/screenshots/v7-hero*.png`.

## Landing v2 (2026-10-13, after first feedback)
Generative canvas hero, live stats strip, routing comparison, five-move interactive flow stepper, round #1 ledger with
real Monad transactions, public/private boundary, judge FAQ, wordmark close. `motion` + `lucide-react` added. Reverse-engineering
of reference sites in `docs/DESIGN-REVIEW.md`; screenshots `docs/screenshots/v2-*.png`. Typecheck + build pass, no console errors,
no horizontal overflow at 390 px.

## What works (verified by running it)
- `pnpm check` green: ZK tests 4/4, forge 23/23 with real proofs, typechecks, web build.
- `nargo test` 2/2 (WSL). Poseidon2 JS == circuit.
- Two scripted lifecycles on anvil + one browser-driven round on Monad testnet: all PASS.
- API never serialises openings; `/api/rfq/:id` exposes chain state, commit/proof/create/settle tx hashes only.
- Faucet (`faucet.monad.xyz`) drips 5 MON per address with no login — used for the deployer and relayer.

## How to demo (see docs/DEMO.md)
```bash
pnpm dev                       # coordinator :8787 (Monad) + web :3000
# MetaMask on Monad Testnet with a little MON (faucet) → /trade → Mint USDC → Request Private Quotes → Execute
pnpm lifecycle:monad           # scripted fallback round (uses TRADER_KEY from apps/coordinator/.env)
```
Keep the relayer topped up: ≈ 0.6 MON per round; `pnpm setup:monad` re-funds from the deployer when low, or paste
`0x0fD676A9e0fB9d96E7C7973Ae2074BDF6a143d69` into the faucet.

## Known limitations (documented in README/THREAT_MODEL)
- Fixed 3 maker slots (circuit takes all 3 commitments as public inputs); one market; BUY only; full fills.
- Simulated makers inside the coordinator; coordinator sees quote openings (honest boundary, stated in UI).
- Monad reports higher gas than anvil for the Honk verifier (5.8 M vs 3.5 M); Foundry nightly 1.7 used (docs suggest ≥ 1.8 with `network = "monad"`).
- MetaMask was exercised via an injected EIP-1193 wallet, not a human click-through.

## Final checklist (build pack §30)
- [x] Name/track consistent; no "private Uniswap"; no claim that strategy privacy is novel; coordinator visibility stated.
- [x] Web3.js isolated in `apps/web/src/lib/chain/*`.
- [x] Official current Monad config, verified from docs.monad.xyz on 2026-10-13.
- [x] Three real commitment transactions, real proof, real onchain verifier, real settlement — all on Monad testnet (RFQ #1).
- [x] Proof rejects tampered input (JS + onchain tests).
- [x] Losing prices absent from frontend state and API.
- [x] README describes the privacy boundary; demo runbook < 2 minutes; STATE.md hides no blocker.

## Decisions / research
`DECISIONS.md` (23 entries), `RESEARCH.md` (prior-art verdict, network + toolchain facts).
