# Niskala Markets — Metropolis submission

## Primary track

**Onchain Finance & Trading** (Track 01).

## Project logo

`docs/brand/niskala-logo-1024.png` (1024 × 1024 mark). Banner for the profile header: `docs/brand/niskala-banner.png`
(1600 × 900). Wordmark: `docs/brand/niskala-wordmark.png`. Source: `docs/brand/logo.html`.

## One line

Private quotes, provably best execution: a sealed RFQ market on Monad where a ZK proof verified by the contract shows the winning quote was the best one.

## Description

**Problem.** Professional RFQ venues keep market-maker pricing private, and that is the right default: a public
losing book leaks every maker's strategy over time. But privacy moves the trust to the router. The trader has to
take the router's word that the quote it selected was the best valid one in the competition it ran. Transparent
auctions fix routing and leak prices; private routers protect prices and demand trust. Nobody gets both.

**Our solution.** Niskala makes the competition sealed and the result provable. A trader opens a fixed-size round
on Monad. Up to five market makers, each from its own wallet, post a Poseidon2 commitment to a price and lock the
full size in the market vault, so every sealed quote can fill. When the window closes, a Noir/UltraHonk proof shows
that the chosen winner is the lowest valid quote across the exact set of commitments the contract stored, and the
`RfqMarket` contract verifies it against public inputs it rebuilds from its own storage. Only the winning price is
revealed. The trader then settles in one transaction: USDC to the winner, the asset to the trader, losers unlocked.
Eight markets are live on Monad testnet with 27 verified contracts, a hosted coordinator, and a public SDK.

**What makes it useful.** Traders get firm, competitive execution and evidence instead of a promise: the receipt
links every commitment, the proof and the settlement. Makers compete without putting losing prices on a public book;
strategy and inventory never leave the maker. Builders get `@niskala/sdk`, the same client our terminal runs on,
with trader, maker, reader and prover surfaces, so a desk can plug its own pricing into any Niskala market today.
Monad makes the loop fast enough to live inside a trading workflow: create, five commits, a 5.8 M-gas proof
verification and settlement complete in about seven seconds.

## Go-to-market and user acquisition

**First users.** Two groups, both small and reachable.

1. Market makers and OTC desks already quoting on Monad and on EVM RFQ venues (the teams behind Kuru liquidity,
   Monad-native perps makers, and the CoW/0x/1inch RFQ maker set on Ethereum). They are the supply side; three of
   them on a market is enough for a round. Their reason to join: a venue where their losing prices never become
   public data, with a one-file SDK integration (`@niskala/sdk/maker`) and no custody change beyond a vault deposit.
2. Size takers on Monad: treasuries, DAOs and funds rotating six-figure positions who currently pay AMM impact or
   trust an OTC chat. Their reason: competitive firm quotes with a proof, not a screenshot.

**How we reach them.**

- Direct outreach to the first ten makers with a maker-side pilot: we run the coordinator, they run the SDK maker
  example with their own pricing, we share round-level analytics (fill rate, win rate, spread to mid) privately.
- A public "proven round" feed: every settled round links its proof and settlement, which is a credibility asset
  for makers and a discovery surface for takers. Shared through Monad ecosystem channels, the Metropolis showcase,
  and Monad-native aggregators once we expose a quote API.
- Integrations before marketing: a plug-in route for Monad aggregators and wallets so Niskala appears as "proven
  RFQ" next to AMM routes for large sizes. The SDK already has the trader surface those integrations need.
- Mainnet in stages: majors first (WETH, WBTC, WMON) with partner makers, then long tail by maker demand.

**Monetisation (later, not now).** A basis-point fee on settled notional paid by the taker, and premium maker
analytics. No token.

## Judge access instructions

1. **Live app:** https://niskala-nu.vercel.app (web on Vercel; the coordinator with the demo makers and prover
   runs on Railway at https://coordinator-production-9e0b.up.railway.app/api/health).
2. **See a finished round first:** https://niskala-nu.vercel.app/rfq/weth-usdc/2 shows a five-maker round with its
   five commitment transactions, the proof verification transaction, the settlement, and the proof inspector
   (public inputs versus sealed data).
3. **Run your own round (about 1 minute):**
   - Install MetaMask. Open https://niskala-nu.vercel.app/trade and click **Connect wallet**; Monad Testnet is added automatically.
   - Get testnet MON for gas: paste your address at https://faucet.monad.xyz (5 MON, no login).
   - Click **Mint 100,000 test USDC** (one confirmation).
   - Pick a market (WETH/USDC by default), keep the size, click **Request private quotes**, confirm.
   - Watch five sealed commitments land, the proof verify onchain, then click **Approve and execute** (two confirmations the first time).
   - The receipt links every transaction on MonadVision.
4. **Verify the chain side:** every contract is Sourcify-verified on https://testnet.monadvision.com; addresses in `README.md` and `packages/pools/pools.json`.
5. **Verify the proof system:** `pnpm install && pnpm check` runs 5 circuit tests, 7 SDK tests and 26 Foundry tests that verify real proof fixtures onchain, including tamper and replay rejection.
6. **Scripted alternative:** `pnpm lifecycle:monad` runs mint → create → wait for proof → approve → execute from a script and prints explorer links.
7. **SDK:** `packages/sdk/README.md`; `pnpm --filter @niskala/sdk example:trader`.

## Sponsor bounties

**Best Use of Envio.** The coordinator's round history is served by Envio HyperSync on Monad testnet
(`apps/coordinator/src/history.ts`). One paginated query over all eight market contracts returns every round event
(`RfqCreated`, `QuoteCommitted`, `BestExecutionProven`, `RfqSettled`, `RfqCancelled`) with the `submitProof`
transaction inputs and block timestamps joined in. From that the coordinator rebuilds, for every round on every
market: the commitment transactions of every maker including external SDK makers, the proof bytes and verification
gas recovered from calldata, settlement and cancellation snapshots that drive the pool statistics on the landing
page and terminal. This replaced the previous `eth_getLogs` scanner, which the public Monad RPC caps at 100 blocks
per call and which only knew about rounds the running process had seen. A fresh coordinator now reconstructs the
whole history in seconds; the production coordinator on Railway runs with it enabled.

**Best Community Team Project** (Monad Foundation): selected by the team on the platform.

Not selected: Alchemy, Privy, Dynamic, Kuru, Perpl, Chainlink CRE, Nansen, Agora, Mera, Aurora and the model
bounties. We do not claim bounties for integrations the product does not use.

## What was built during the window

Everything in the repository: the Noir circuit and JS proving pipeline, the market and verifier contracts with
real-proof tests, the coordinator with five maker wallets across eight markets, the Next.js terminal, the SDK with
a signed opening protocol for external makers, deployment on Monad testnet (27 verified contracts), hosting on
Railway and Vercel. First commit 2026-10-13; see `git log` and `DECISIONS.md` (32 recorded decisions).

## Honesty

The coordinator that builds the witness sees the openings; the trader, the frontend and the chain never do.
Privacy against the prover is roadmap. The circuit has five slots with a public count; arbitrary-size completeness
is the next step. Mock tokens, testnet only.
