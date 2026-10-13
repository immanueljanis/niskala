# DECISIONS — Niskala Markets

| # | Decision | Why |
|---|---|---|
| 1 | Noir + bb.js WASM instead of circom/snarkjs | Build pack prefers Noir; bb.js 5.x exposes Solidity verifier generation in JS so no native `bb` (unavailable on Windows) is needed. Fallback if proving fails: circom + snarkjs Groth16. |
| 2 | Compile circuit with `@noir-lang/noir_wasm` | No Windows `nargo` binary in Noir 1.0.0-rc releases. |
| 3 | Poseidon2 commitment hash | In Noir stdlib and bb.js; same field (BN254 Fr); consistency verified by test. |
| 4 | One `RfqMarket.sol` holding vault logic (no separate `SettlementVault.sol`) | Fewer contracts/tests/deploy steps; vault is ~40 lines. Upgrade path: extract when multi-market. |
| 5 | Verifier public inputs rebuilt from contract storage | Proof cannot be replayed onto a different RFQ, chain, or commitment set. |
| 6 | `domain = (chainId << 160) \| address(market)` | Fits in BN254 field, binds chain + contract without keccak-in-circuit. |
| 7 | Commitment = Poseidon2(domain, rfqId, makerAddress, priceE6, salt) | Maker address prevents commitment copying between slots; rfqId + domain prevent replay. |
| 8 | Coordinator is a plain Node `http` service, not Next.js route handlers | Keeps bb.js WASM + worker threads out of the Next bundler; one `tsx` process. |
| 9 | Three MM simulators run as separate wallet objects inside the coordinator | Real, distinct commit transactions; "independent participant" data model; one process to run. |
| 10 | Proof relayed by a coordinator key; `submitProof` is permissionless | Proof is self-certifying; permissionless submission avoids trusting the relayer for liveness. |
| 11 | Round auto-closes at 3 commitments | Circuit is fixed at 3; shortest demo path. Deadline path cancels + unlocks. |
| 12 | MockUSDC has an open `mint` faucet | Judge's wallet is unknown in advance; demo must work from a clean browser. |
| 13 | Prices are `uint64 priceE6` (USDC per WETH, 6 decimals), amounts `uint256` wei | No floats; fits comfortably in circuit range checks. |
| 14 | Vendor `noir-lang/poseidon` v0.4.0 into `circuits/poseidon` (path dependency) | rc.3 stdlib made Poseidon2 crate-private; vendoring keeps compile offline and deterministic for noir_wasm and nargo alike. |
| 15 | Compile with a POSIX-path shim on Windows (`packages/zk/src/compile.ts`) | noir_wasm rc.3 mixes win32 `path.join` and "/" joins, so the compiler cannot find `src\main.nr`. Shim is a no-op elsewhere. |
| 16 | Commit `packages/zk/target/best_quote.json` + `vk.bin` | A fresh clone must prove without compiling; artifacts are small (31 KB + 2 KB). Regenerate with `pnpm zk:build`. |
| 17 | Fresh Niskala deployer wallet instead of reusing the earlier project's key | Harness policy blocks reading another project's secret; a new wallet only needs one MON top-up from the user. |
| 18 | Coordinator discovers `RfqCreated`/`RfqSettled` tx hashes from events | Receipt links every transaction even for viewers who did not send them; bounded `getPastEvents` windows respect RPC limits. |
| 19 | No Framer Motion; CSS keyframes only | Motion is state communication (seal pulse, line draw, sweep, count-up); no dependency needed. |
| 20 | Fixed commit window 120 s / settle window 900 s from the UI | Long enough for three testnet commits and a judge's wallet confirmations; short enough that capital is not locked for long. |
| 21 | Fund the Niskala deployer and relayer through faucet.monad.xyz (address only, no login) | Unblocked the Monad deployment without touching the earlier project's key; 5 MON per address per drip. |
| 22 | Browser e2e with an injected EIP-1193 test wallet (`apps/web/test/wallet-e2e.playwright.js`) | Exercises the exact MetaMask code path (eth_requestAccounts, wallet_switchEthereumChain, eth_sendTransaction) without a human; proved RFQ #1 on Monad end to end. |
| 23 | Round data file keyed by chainId + market (`data/rounds-<chain>-<market>.json`) | A redeploy must never reuse openings from another deployment's rounds. |
| 24 | Circuit and market widened to MAX_SLOTS = 5 with a public `count`; round closes at 5 or at the deadline with ≥ 3 | User asked for more than three makers; variable count keeps the proof over the exact committed set without forcing five commits. Public inputs 10 → 15. |
| 25 | v2 verifier deployed with `forge script` (auto-links RelationsLib/ZKTranscriptLib); markets with `forge create` | The 5-slot verifier emits external libraries, which `forge create` cannot link. Script path also verifies all pieces on Sourcify. |
| 26 | v1 contracts left onchain and recorded under `legacy` in the registry | Round #1 receipt stays reachable; nothing is pretended to be new. |
| 27 | Coordinator round records keyed by market address, legacy records migrated to the v1 addresses | A redeployed pool reused the `slug:rfqId` key and inherited the old proof, so the new round was never proved. |
| 28 | Reads batched and spread over three RPC endpoints; sends use local nonces, cached fees and fixed commit gas | The official Monad RPC allows ~15 req/s per IP; this took create → PROVEN from ≈ 27 s to ≈ 5 s on a five-maker round. |
| 29 | Relayer closes/expires rounds after their deadlines | Abandoned rounds otherwise keep maker collateral locked until someone calls the contract. |
| 30 | Hero is a three.js GPU line terrain (`apps/web/src/components/landing/HeroScene.tsx`): 56 lines displaced by simplex noise in the vertex shader, a pine proof front sweeping every 11 s | The earlier 2D canvas and points scenes read as noise; thin flowing lines stay smooth at 60 fps on integrated GPUs because the CPU only updates three uniforms, and rendering pauses off screen. |
| 31 | `@niskala/sdk` is a workspace package consumed from TypeScript source (`exports` → `src`), with `publishConfig` pointing at `dist` and generated TS modules for the registry and ABIs | The web app and coordinator stay zero-build in dev, publishing needs no JSON import attributes, and a drift test keeps the generated files equal to `packages/pools` and `packages/abi`. Maker and prover are separate entries so the trader/reader core never loads bb.js. |
| 32 | External makers deliver openings through `POST /api/pools/:slug/rfq/:id/openings`, signed with the maker key (EIP-191) and checked against the onchain commitment | Keeps the documented trust model (the prover sees openings) while letting anyone run a maker; the coordinator cannot be fed a price for a maker that did not commit, nor one that does not hash to the commitment. |
| 33 | Round history from Envio HyperSync (`apps/coordinator/src/history.ts`), with the `eth_getLogs` window scan kept as the fallback when no token is set | Public Monad RPCs cap `eth_getLogs` at 100 blocks and the old scanner only knew rounds the running process had seen (moving hosts needed a seed file). One HyperSync query returns every market event plus the proof calldata and block times, so any coordinator rebuilds the full history in seconds. The JSON HTTP API is used directly with `fetch`: no native dependency, same code on Windows, Railway and CI. |
