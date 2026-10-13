# FABLE ONE-SHOT PROMPT — NISKALA MARKETS

Build the project described in `NISKALA_MASTER_BUILD_PACK.md` end-to-end.

You are operating autonomously overnight. The user will not be available to answer routine questions. Do not stop to ask for permission for work already authorized. Make reasonable assumptions, record them in `STATE.md`, and keep moving.

## Non-negotiable product constraints

- Product name: **Niskala Markets**
- Hackathon: **Monad Metropolis**
- Main track: **01 — Onchain Finance & Trading**
- Product: **private RFQ market making with ZK-verifiable best execution**
- Tagline: **Private quotes. Provably best execution.**
- Keep the project positioned as a market-making/trading product.
- Use **Web3.js** for frontend chain interactions, isolated behind a chain adapter.
- UI must feel institutional, private, restrained, and modern.
- Avoid DeFi-casino visuals, neon cyberpunk, particles, 3D coins, and excessive animation.
- Use real cryptographic proofs and real contract interactions; never fake a proof, tx, or market maker.
- Use the current official Monad network configuration, not remembered/stale values.

## Execution rule

Prioritize a complete working demo in this order:

1. RFQ contracts
2. 3 market-maker commitments
3. real ZK best-quote circuit
4. onchain proof verification
5. token settlement
6. Web3.js trader UI
7. proof inspector
8. visual polish
9. optional sponsor integrations

## Mandatory state files

Create and maintain:

- `STATE.md`
- `RESEARCH.md`
- `DECISIONS.md`

`STATE.md` must always say what works, what is broken, what is next, and which assumptions remain.

## Start

1. Read `NISKALA_MASTER_BUILD_PACK.md`.
2. Inspect the existing repo.
3. Perform a timeboxed prior-art/novelty audit.
4. Write the architecture you will actually implement into `STATE.md`.
5. Build until the end-to-end demo works.
6. Run real verification/tests.
7. Self-review against the final checklist in the build pack.
8. Prepare the repo so the user can wake up, run one documented command sequence, and demo the product.

Do not merely produce a plan. Execute the plan.
