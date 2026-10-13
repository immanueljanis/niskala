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
