# Technical demo video (≤ 3:00)

Form requirement: show the working product on Monad testnet, not slides or a code walkthrough. Up to 3 minutes.
Target **2:45**. One screen recording of the production app, one real round, voice-over on top.

This is a keynote, not a tutorial. One idea, said three ways, proven once on screen. Short sentences. Pauses do the
work. The product is the reveal; you are the narrator who already knows the ending.

## The one idea

**Every private trade ends with four words: "trust me, best price." Today that ends.**

Everything in the video serves that line. If a sentence does not push it forward, cut it.

## Prep (15 minutes before)

| # | Check |
|---|---|
| 1 | https://coordinator-production-9e0b.up.railway.app/api/health → `ok: true`, `history.source: envio-hypersync` |
| 2 | https://niskala-nu.vercel.app loads; trade page shows **Makers live** |
| 3 | Relayer ≥ 3 MON, every maker ≥ 0.3 MON (one commit ≈ 0.022 MON). Check with the balances script; faucet or `pnpm setup:monad` if low |
| 4 | Demo wallet on Monad Testnet with ≥ 0.5 MON and test USDC minted. USDC **not yet approved** for the market you will use, so "Approve and execute" appears on camera |
| 5 | One dry run on a different market ten minutes before. If the proof takes longer than 15 s, check the Railway log before recording |
| 6 | Chrome guest window, 1920×1080, zoom 125 %, bookmarks hidden, notifications off |
| 7 | Tabs: ① landing ② `/trade?pool=sol-usdc` ③ https://testnet.monadvision.com |
| 8 | OBS or Loom, 1080p30, mic only, cursor highlight on. Record the browser window |
| 9 | Read the script aloud twice before recording. Slow down 20 % more than feels natural |

Market: **SOL/USDC**, default 100 SOL. Prices are readable and five makers quote it.

## Script

Stage directions in brackets. Pauses marked with "…" are real: one full second.

### 0:00–0:20 · Cold open

[Landing hero, line terrain breathing. Do not move the mouse.]

> "Every day, billions of dollars trade in private. Not on an order book. By request. A few market makers, a few
> private prices, one winner.
>
> … And every one of those trades ends with the same four words.
>
> Trust me. Best price.
>
> … Today, that ends."

### 0:20–0:40 · The reveal

[Scroll slowly to "Makers were always private. Routers were always trusted." Stop on the two cards.]

> "This is Niskala.
>
> A market where the quotes stay private … and the result is proven. Not promised. Proven. By a zero-knowledge proof
> that the market contract checks itself. On Monad.
>
> Let me show you. Not slides. The real thing."

### 0:40–1:00 · Request

[Tab ②. Pause one second on the market list and the five makers on the right. Click **Request private quotes**,
confirm in MetaMask.]

> "Eight markets. Five independent market makers, each with its own wallet and its own secret strategy.
>
> I want a hundred SOL. One click. … That's the whole request."

### 1:00–1:25 · Seal

[Round page. Lanes flip to sealed one by one. Let it play. Do not talk over the first two.]

> "… Watch the lanes.
>
> Five makers. Five sealed quotes. Each one is a commitment on Monad, and each one locks the maker's full size, so
> every quote can actually fill.
>
> Nobody sees a price. Not me. Not the chain. Not the other makers."

### 1:25–1:55 · Prove

[Phase strip: Proving sweeps, then Verified onchain. Headline becomes **Best price proven**. Click the verification
transaction, let MonadVision open for two seconds, come back.]

> "… And now the part that has never existed before.
>
> A proof. Seven kilobytes. It says one thing: this winner was the best of the five. Every opening matches its
> commitment. No quote was skipped. The contract rebuilt the inputs from its own storage and verified it. Right there.
>
> That's not a screenshot. That's Monad. Five point eight million gas, a few seconds.
>
> Four prices stay sealed. Forever."

### 1:55–2:20 · Settle

[Click **Approve and execute**. Two confirmations. Receipt appears at the top. Click the settlement link, show
MonadVision, come back.]

> "Execute. … One transaction. USDC to the winner. SOL to me. The other four makers unlocked.
>
> Here's the receipt. Every line is a transaction you can open."

### 2:20–2:40 · What the chain knows

[Scroll to the proof inspector. Hover the public column, then the private column. Click **Show raw proof bytes** for
one second.]

> "Here's what the chain knows. The set. The commitments. The winner. The proof.
>
> And here's what it will never know. Four prices that never existed on chain.
>
> Private for the makers. Provable for the trader. Both. For the first time."

### 2:40–2:45 · Close

[Tab ①, scroll to the SDK section, then end card.]

> "It's live today. Twenty-seven verified contracts. An SDK, so any desk can plug its own pricing in.
>
> Niskala. Private quotes. Provably best execution."

[End card: `docs/brand/niskala-banner.png`, 2 s, silence.]

## Delivery

- Lower your voice at "Trust me. Best price." and at "Forever." Those are the two beats people remember.
- Never say "basically", "kind of", "just". Never apologise for the testnet.
- Let the product breathe. Fifteen seconds of lanes sealing with no narration is stronger than fifteen seconds of
  narration.
- Overlay text, bottom left, small, only three times: "5 sealed commitments · 2 s", "proof verified onchain · 5.8 M
  gas", "settled at the proven price". No other graphics. No music under speech.

## If something goes wrong while recording

| Symptom | Action |
|---|---|
| "Makers offline" | Coordinator restarting; wait 60 s, check `/api/health`. Record only on "Makers live". |
| Commitments stop at 3 or 4 | A maker is out of MON. Top up (faucet or `pnpm setup:monad`), record on another market. |
| "Proving" for more than 20 s | Relayer out of MON. Top up; the proof submits itself once funded. Re-record from Request. |
| Execute disabled | Mint USDC from the wallet card, or the settle window (15 min) expired: new round. |
| Page did not scroll to Execute | Scroll to the top; the panel is there. |

## Upload

YouTube, **Unlisted**, 1080p. Title: `Niskala — private quotes, provably best execution (Monad Metropolis demo)`.

```
Every private trade ends with four words: "trust me, best price." Niskala ends that.

A sealed RFQ market on Monad. Five market makers quote in private; a zero-knowledge proof, verified by the market contract, shows the winner was the best quote in the set; only the winning price is revealed; settlement is one transaction.

Live app: https://niskala-nu.vercel.app
A settled round: https://niskala-nu.vercel.app/rfq/weth-usdc/2
Code: https://github.com/immanueljanis/niskala
Verifier on Monad testnet: https://testnet.monadvision.com/address/0x22Aaeff3Df06535AeFD92D5475628D2eF61c4FaD

Recorded in one take on Monad testnet. The waits are real.
```

Tick **Show this video publicly**.
