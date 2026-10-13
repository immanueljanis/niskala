# Technical demo video (≤ 3:00)

Form requirement: show the working product on Monad testnet, not slides or a code walkthrough. Up to 3 minutes,
hosted on YouTube, Loom or Vimeo. Target length **2:40** so the upload never trips the limit.

The whole video is one screen recording of the production app with voice-over. One round runs for real on Monad
testnet while the camera watches. Nothing is faked and nothing is cut inside the round; the waits are the point
(five commits in about two seconds, proof verified a few seconds later).

## Prep (15 minutes before recording)

| # | Check | How |
|---|---|---|
| 1 | Coordinator live | https://coordinator-production-9e0b.up.railway.app/api/health returns `ok: true`, block number moving |
| 2 | Web live | https://niskala-nu.vercel.app loads, markets table shows "last proven" prices, trade page says **Makers live** |
| 3 | Relayer has gas | ≥ 3 MON (one proof ≈ 0.65 MON). Top up: `MIN_RELAYER_GAS=3 RELAYER_TOPUP=6 pnpm setup:monad` or the faucet |
| 4 | Demo wallet (MetaMask) | On Monad Testnet, ≥ 0.5 MON, ≥ 30,000 test USDC already minted, USDC **not yet approved** for the market you will use (so the video shows "Approve and execute"). Use a market with no round in the last hour so the round id is fresh |
| 5 | Dry run | Run one full round in the browser on a *different* market 10 minutes before. If the proof takes longer than 15 s, check the Railway log before recording |
| 6 | Browser | Fresh Chrome profile or guest window, 1920×1080, zoom 110–125 %, bookmarks bar hidden, no extensions except MetaMask, notifications off, dark mode off |
| 7 | Tabs, in order | ① `https://niskala-nu.vercel.app` ② `https://niskala-nu.vercel.app/trade?pool=sol-usdc` (or the market you chose) ③ `https://testnet.monadvision.com` |
| 8 | Recorder | OBS or Loom, 1080p30, system audio off, mic on, cursor highlight on. Record the browser window only |
| 9 | Script | This file open on a second screen or printed. Read the lines; do not improvise numbers |

Market choice: **SOL/USDC** (default size 100 SOL) or **WETH/USDC** (10 WETH). Both have live reference prices and five
makers. Avoid WMON (tiny price, hard to read on camera).

## Flow and script

Times are targets. Speak slowly; the product does the work.

### 0:00–0:15 · Hook (tab ① landing, hero)

Screen: landing hero with the line terrain moving. Scroll nothing yet.

> "This is Niskala, a sealed RFQ market on Monad. Market makers quote in private, and a zero-knowledge proof,
> verified by the market contract, shows the trader got the best quote in the set. Only the winning price is revealed.
> Let me run a round."

### 0:15–0:30 · The claim in one scroll (tab ①)

Screen: scroll to "Makers were always private. Routers were always trusted." then to "Not a mock. This round ran on
Monad." Hover one commitment transaction link.

> "Private RFQ already exists. What it adds is a trusted router: you take its word that the quote it picked was the
> best. Niskala keeps the quotes private and makes the result verifiable. Every row here is a real transaction on
> Monad testnet."

### 0:30–0:55 · Request (tab ②, terminal)

Screen: trade page. Point at the market list, the "Makers live" pill, the five makers on the right. Keep the default
size. Click **Request private quotes**. MetaMask opens; confirm.

> "The terminal. Eight markets, five independent maker wallets, each with its own private strategy. I ask for a
> hundred SOL against USDC. One transaction opens the round."

### 0:55–1:20 · Seal (round page, lanes)

Screen: the page moves to `/rfq/sol-usdc/<id>`. Lanes flip to sealed one by one, each with a transaction link and a
commitment hash. The phase strip shows 5 / 5.

> "Five makers, five wallets, five Poseidon commitments. Each one locks the maker's full size in the vault, so every
> sealed quote can actually fill. No price has been broadcast. The window closes at five."

### 1:20–1:45 · Prove (phase strip, result card)

Screen: "Proving" sweeps, then "Verified onchain" shows the transaction. The headline becomes **Best price proven**,
the page scrolls to the execute panel. Click the verification transaction link, let MonadVision open in a new tab for
two seconds, come back.

> "The prover builds an UltraHonk proof over the five private openings: every opening matches its commitment and
> the winner is the lowest valid quote. The verifier contract rebuilds the public inputs from its own storage and
> checks the proof. That transaction is the verification, about five point eight million gas. Four prices stay sealed."

### 1:45–2:10 · Settle (execute panel, receipt)

Screen: click **Approve and execute**. Two MetaMask confirmations. The receipt appears at the top with amount,
price, USDC paid, settlement transaction. Click the settlement link, show MonadVision, come back.

> "I execute at the proven price. One transaction: USDC to the winning maker, SOL to me, the losing makers'
> collateral released. Here is the receipt, and here is the settlement on Monad."

### 2:10–2:30 · Proof inspector

Screen: scroll to the proof inspector. Point at the public column (makers, commitments, count, winner index, winning
price), then the private column (four prices "sealed", one "revealed by proof"). Click **Show raw proof bytes** for a
moment.

> "What the chain knows versus what stays private. Fifteen public inputs, seven kilobytes of proof. The losing
> prices never existed on chain."

### 2:30–2:40 · Close (tab ①, SDK section or footer)

Screen: scroll the landing to the SDK snippet.

> "Everything you saw runs on an open SDK: trader, maker, reader, prover. Twenty-seven verified contracts on Monad
> testnet. Niskala: private quotes, provably best execution."

End card: `docs/brand/niskala-banner.png` for 2 seconds (optional, add in the editor).

## Shot list (for the editor)

| Clip | Length | Source |
|---|---|---|
| Hero with motion | 15 s | tab ① |
| Compare + live round section | 15 s | tab ① scroll |
| Terminal, request, MetaMask | 25 s | tab ② |
| Lanes sealing (do not cut) | 25 s | round page |
| Proof verified + MonadVision | 25 s | round page + tab ③ |
| Approve, execute, receipt + MonadVision | 25 s | round page + tab ③ |
| Proof inspector | 20 s | round page |
| SDK snippet + end card | 10 s | tab ① + banner |

Overlay text (small, bottom-left) where it helps: "5 sealed commitments · ~2 s", "proof verified onchain · 5.8 M gas",
"settled at the proven price". No music under voice; a quiet bed is fine under the end card.

## If something goes wrong while recording

| Symptom | Action |
|---|---|
| "Makers offline" on the trade page | Coordinator is restarting or down. Check `/api/health`; wait 60 s; `railway logs --service coordinator`. Do not record until "Makers live". |
| Commitments stop at 3 or 4 | A maker wallet is out of MON. The round still closes at the deadline (120 s) with ≥ 3; too slow for the video. Top up with `pnpm setup:monad`, record on another market. |
| "Proving" for more than 20 s | Relayer out of MON (log says "Signer had insufficient balance"). Top up the relayer; the proof is submitted automatically once funded. Re-record from Request. |
| Round shows "waiting for quote openings" | Transient after a coordinator restart; it clears within seconds. If it says openings were lost, the round cannot be proven: start a new round. |
| MetaMask on the wrong network | The nav shows "Switch to Monad Testnet"; click it. |
| Execute button disabled | Insufficient USDC: mint from the wallet card first. Or the settle window expired (15 min): new round. |
| Page scrolled away from the execute panel | It auto-scrolls to the top when proven; if not, scroll up. |

## Upload

- YouTube, **Unlisted**, 1080p. Title: `Niskala Markets — technical demo (Monad Metropolis)`.
- Description:

```
Niskala is a sealed RFQ market on Monad. Up to five market makers quote in private; a Noir/UltraHonk proof verified by the market contract shows the winner is the best valid quote in the committed set; only the winning price is revealed; settlement is atomic.

Live app: https://niskala-nu.vercel.app
A settled round: https://niskala-nu.vercel.app/rfq/weth-usdc/2
Code: https://github.com/immanueljanis/niskala
Verifier on Monad testnet: https://testnet.monadvision.com/address/0x22Aaeff3Df06535AeFD92D5475628D2eF61c4FaD

Everything in the video runs on Monad testnet (chain 10143). Recorded in one take; the waits are real.
```

- Paste the link in the form's **Technical demo video** field. Tick **Show this video publicly** (the video contains
  nothing private; a public demo helps discovery).
