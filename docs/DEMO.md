# Niskala — demo runbook (≈ 90 seconds)

## Before the demo (5 minutes)

1. `apps/coordinator/.env` has the Monad testnet addresses (`pnpm deploy:monad` done) and funded wallets (`pnpm setup:monad` done).
2. `pnpm dev` is running: coordinator on http://localhost:8787/api/health (returns `ok: true`), web on http://localhost:3000.
3. MetaMask: the demo account is on **Monad Testnet (10143)** and holds ≥ 0.5 MON (https://faucet.monad.xyz).
4. On `/trade`, click **Mint 100,000 test USDC** once (one wallet confirmation).
5. Optional dry run: `pnpm lifecycle:monad` proves the whole loop from a script and prints explorer links.
6. Have https://testnet.monadvision.com open in a second tab.

## Script

**0–15 s — Problem** (landing page, hero)
> "Professional market makers already keep their strategies private. But private RFQ markets add a trust assumption: the trader has to trust the router when it says *this* was the best quote. Niskala keeps the competition private and makes the result verifiable."

**15–30 s — Create RFQ** (`/trade`)
> "Niskala turns the RFQ into a sealed competition on Monad."
Pick a market in the left column (WETH by default; WMON or SOL make a nice second round), keep the default size, click **Request private quotes**, confirm in MetaMask. The page moves to `/rfq/<market>/<id>`.

**30–45 s — Sealed commitments** (round page, lanes)
> "Three market makers, three wallets, three sealed Poseidon commitments. No price is broadcast."
Lanes flip to `SEALED •` with a transaction link each. Round auto-closes at 3/3.

**45–60 s — Proof** (phase strip)
> "The coordinator builds a zero-knowledge proof over the three private openings. The verifier contract on Monad checks it against the commitment set it stored itself."
Step 02 sweeps, step 03 shows the verification transaction.

**60–75 s — Result** (proof result card)
> "Winner, price, 3 of 3 quotes considered. The two losing prices stay sealed — they never existed on chain."
Open **What was proven?** if there is time. Point at the proof inspector: public column vs private column.

**75–90 s — Settlement** (execute panel)
Click **Approve & Execute** (two confirmations, or one if already approved).
> "Settlement is atomic in the market contract: USDC to the winning maker, WETH to the trader, losing collateral released. Verifiable best execution without turning the losing book into public data."
Show the receipt; click the settlement transaction link on MonadVision.

## If something goes wrong

| Symptom | Action |
|---|---|
| Lanes stay `WAITING` | Coordinator not running or wrong `MARKET_ADDRESS`. Check `/api/health`, restart `pnpm dev`. |
| `Coordinator offline` banner | Same as above; the page keeps showing onchain state. |
| Proof step shows an error | Read the banner; usually missing openings after a coordinator restart mid-round. Create a new RFQ. |
| MetaMask on wrong chain | Click **Switch to Monad Testnet** in the nav. |
| Execute reverts | Insufficient USDC (mint), or settle window (15 min) expired (new RFQ). |
| Need a fully scripted fallback | `pnpm lifecycle:monad`, then open `/rfq/<id>` from its output. |

## Judge FAQ (short answers)

- *Aren't RFQ quotes already private?* Yes; the novelty is that the **selection** is verifiable while losing prices stay non-public.
- *Does the prover see losing quotes?* In this build, yes (the coordinator). Not the trader, not the chain. MPC/FHE/TEE proving is the roadmap.
- *Why ZK?* A transparent auction leaks every price; a private router needs trust. The proof verifies the outcome without publishing the inputs.
- *Why Monad?* Five state transitions per round with onchain verification and atomic settlement; fast finality keeps it inside a trading workflow and the 2.4M-gas verifier is a routine contract call.
