# RESEARCH — prior art / novelty audit (timeboxed, 2026-10-13)

## Verdict

The exact thesis survives: no product or hackathon project found implements **all five** of
(1) hidden maker quotes for an RFQ, (2) competition bound to an onchain set of eligible commitments,
(3) a cryptographic proof that the selected quote is the best valid quote over that complete set,
(4) losing quotes non-public, (5) atomic onchain settlement by the proven winner. Build proceeds as specified.

## Closest analogues

| Project | What it does | Where it differs from Niskala |
|---|---|---|
| **Zama Confidential RFQ** (private beta 2026, FHE on Ethereum) | Trader intent with hidden size/direction; makers submit encrypted quotes; contract selects the best encrypted quote via a sealed-bid auction under FHE | Confidentiality comes from FHE, not a proof the trader can check; no ZK best-execution statement, no commitment set bound to a succinct proof. Niskala's verifiability is the trader-side artefact; Zama's is coprocessor trust. |
| **Waiola** (ETHGlobal HackMoney 2026, Uniswap v4 hook) | Single maker/taker RFQ negotiated offchain; Noir proof binds a Poseidon2 commitment to the quoted terms so the output price is not revealed onchain; EIP-712 + hook settlement | One quote, one maker: no competition, no "best among a set" statement. It states explicitly it is not "fully private swaps". |
| **Cannabis RFQ** (ETHGlobal 2023) | Noir circuit keeps the selected quote private | Older prototype; no completeness over a committed set, no vaulted executability. |
| 0x RFQ / Hashflow-style routers | Professional MM quoting with private pricing | Routing is trusted; selection not verifiable. This is the market Niskala targets. |
| Sealed-bid auction research (ZK auctions, Azure/Aztec examples) | Proofs over bids | Not an RFQ with executable, vaulted maker quotes and chain-bound commitment sets. |
| Waiola / Red Black Honey Girl / ZkAlpha / P.A.T (names from the brief) | Only Waiola surfaced in search; the others were not found under those names | — |

Sources: ethglobal.com/showcase/waiola-ug402; zama.org/post/announcing-zama-confidential-rfq-private-beta;
0x.org/post/delivering-superior-trade-execution-with-0x-rfq; ethglobal.com/showcase/cannabis-rfq-cx13u.

## Monad network (verified from docs.monad.xyz/developer-essentials/testnets)

- Monad Testnet, chainId **10143**, currency MON, version v0.15.2 / MONAD_NINE, reset from genesis 2025-12-16.
- RPC: `https://testnet-rpc.monad.xyz` (QuickNode, 50 rps; 25 rps eth_call/estimateGas; ws `wss://testnet-rpc.monad.xyz`),
  `https://rpc.ankr.com/monad_testnet`, `https://rpc-testnet.monadinfra.com` (20 rps, no batch).
- Explorers: `https://testnet.monadvision.com`, `https://testnet.monadscan.com`. Faucet: `https://faucet.monad.xyz`.
- Differences page: max contract size 128 KB, gas charged on gas **limit**, no EIP-4844 blob txs, P256 precompile at 0x0100.

## Hackathon (monad.xyz/developers/hackathons/metropolis)

- Track 01 Onchain Finance & Trading ($30k / 3 teams); submission deadline **13 Oct**, judging 14–27 Oct, winners 3 Nov.
- Submission: working product with public profile, demo, short write-up, code link; work must be built in the window.

## ZK toolchain (verified from npm + repos, 2026-10-13)

- `@noir-lang/noir_js` / `noir_wasm` latest 1.0.0-rc.3; Noir's `scripts/install_bb.sh` pins Barretenberg **5.0.0**;
  `@aztec/bb.js` latest 5.2.1 (published 2026-10-12) — used and working with rc.3 artifacts.
- No Windows `nargo` binary in Noir rc releases (darwin/linux only). noir_wasm has a win32 path bug (fixed locally with a POSIX-path shim).
- rc.3 stdlib made `std::hash::poseidon2` crate-private; `Poseidon2::hash` lives in `noir-lang/poseidon` (v0.4.0, vendored).
- bb.js API: `UltraHonkBackend.generateProof(witness, { verifierTarget: "evm" })`, `getVerificationKey`, `getSolidityVerifier(vk)`;
  `Barretenberg.poseidon2Hash({ inputs: Uint8Array[] })`.
- Generated verifier: `verify(bytes proof, bytes32[] publicInputs) view returns (bool)`, reverts on failure; public inputs
  in Noir `main` declaration order with arrays flattened; needs ecAdd/ecMul/ecPairing/modexp precompiles (present on Monad).
