# Niskala Markets — submission write-up

**Track:** 01 — Onchain Finance & Trading
**One line:** Private quotes. Provably best execution.

## Problem

Professional RFQ markets already protect market-maker pricing. The trust gap is in routing: the trader
relies on the router's word that the quote it selected was the best valid one from the competition it saw.
A fully transparent auction fixes that but leaks every losing price; a private router protects information
but demands trust.

## What Niskala does

A sealed RFQ competition on Monad whose result can be verified without trusting the router:

1. Trader opens a fixed-size RFQ (`BUY 10 WETH` for USDC) on Monad.
2. Up to five market makers, each with its own wallet and private strategy, submit Poseidon2 commitments during a short window; a round closes at five or at the deadline with at least three.
   Each commitment locks the maker's WETH in the market vault, so every sealed quote is executable.
3. A Noir/Barretenberg (UltraHonk) proof shows that the winner is the lowest valid quote across the complete committed set,
   that every opening matches its commitment, and that the set is bound to this RFQ, market and chain.
4. The verifier contract on Monad checks the proof against public inputs it rebuilds from its own storage. Only the winning price is revealed.
5. The trader executes: USDC to the winner, WETH to the trader, losers unlocked — one transaction.

## What was built (all during the window)

- `RfqMarket.sol` (RFQ lifecycle, maker vault, proof binding, settlement, expiry) + generated `HonkVerifier.sol` + mock tokens; 23 Foundry tests with **real** proofs.
- Noir circuit + JS proving/verifying pipeline that runs on any Node host (no native prover binaries), with tamper-rejection tests.
- Coordinator service: five maker wallets across eight markets, prover, relayer, read-only API that never exposes a losing price.
- Next.js + Web3.js terminal: landing, RFQ terminal, live round page (sealed lanes, proof, execution receipt) and a proof inspector
  that shows what is public versus private.
- Deployment and funding scripts for Monad testnet, plus a scripted end-to-end lifecycle that doubles as the integration test.

## Honesty

The coordinator that runs the demo makers and generates the proof sees the quote openings. The trader, the
frontend and the chain never do. Privacy against the coordinator is roadmap (MPC/FHE/TEE proving). The circuit has
five slots with a public count; arbitrary-size completeness via a Merkle root of the eligible set is the next step.

## Why Monad

One round is five state transitions with a ~2.4M-gas proof verification in the middle. Fast finality keeps the
whole loop inside a trading workflow, and the verifier is an ordinary contract call.

## Links

- Code: this repository (`README.md` for the one-command run, `docs/DEMO.md` for the 90-second script).
- Deployed contracts: `contracts/deployments/10143.json` (Monad testnet).
- Architecture / threat model: `docs/ARCHITECTURE.md`, `docs/THREAT_MODEL.md`.
