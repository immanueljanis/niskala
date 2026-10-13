# Technical demo video (≤ 3:00, target 2:00)

One screen recording of the production app, one real round on Monad testnet, voice-over on top.

## Rule for every line

Each screen gets **one sentence about what the user gets**, then silence while the product proves it. If a sentence
explains how something works instead of why it matters, cut it. Details live in the README.

## The value, said once at the start and once at the end

> "You get the best price from five market makers, and a proof that it really was the best. The makers never reveal
> their prices to anyone."

Who gains what:

| Who | Today | With Niskala |
|---|---|---|
| Trader | Trusts the router's word that the quote was the best | Gets the best of five quotes, with a proof the contract checked |
| Market maker | Either leaks prices on a public book or trusts a private router | Competes without anyone seeing the losing prices |

## Prep

| # | Check |
|---|---|
| 1 | https://coordinator-production-9e0b.up.railway.app/api/health → `ok: true` |
| 2 | Trade page shows **Makers live** |
| 3 | Relayer ≥ 3 MON, every maker ≥ 0.3 MON |
| 4 | Demo wallet: Monad Testnet, ≥ 0.5 MON, test USDC minted, USDC not yet approved for the market |
| 5 | One dry run on another market ten minutes before |
| 6 | Chrome guest window, 1920×1080, zoom 125 %, notifications off |
| 7 | Tabs: ① landing ② `/trade?pool=sol-usdc` ③ https://testnet.monadvision.com |

## Script (≈ 170 words)

### 0:00–0:15 · The problem and the promise

[Landing hero.]

> "When you buy in size, you ask a few market makers for a price and take the best one. But you never see the other
> quotes. You just trust that you got the best.
>
> Niskala gives you the best price from five market makers, and a proof that it really was the best."

### 0:15–0:30 · Ask

[Tab ②. Click **Request private quotes**, confirm.]

> "I want a hundred SOL. One click sends the request to five independent market makers."

### 0:30–0:50 · Makers quote in secret

[Round page. Lanes seal one by one. No talking for the first five seconds.]

> "Each maker sends a sealed quote and locks the full amount, so every quote can actually fill. Nobody can see the
> prices, not even the other makers."

### 0:50–1:15 · You get the best price, with proof

[Headline becomes **Best price proven**. Point at the winning price and "5 / 5 considered". Click the verification
transaction, two seconds on MonadVision, back.]

> "Here's my price: the best of the five. And this transaction is the proof, checked by the contract on Monad, that no
> better quote was hidden or skipped. The four losing prices stay secret."

Overlay: `best of 5 quotes · proof verified onchain`

### 1:15–1:40 · Settle

[Click **Approve and execute**, confirm. Receipt appears at the top.]

> "One transaction, and the trade is done. USDC to the winning maker, SOL to me. The whole round took seconds."

Overlay: `request → 5 quotes → proof → settled · ~7 s on Monad`

### 1:40–2:00 · Close

[Back to the landing hero, then end card.]

> "Best price from every maker. Proof that it was the best. Prices that stay private.
>
> Niskala. Live on Monad today."

[End card `docs/brand/niskala-banner.png`, 2 s.]

## Cut on purpose

Proof inspector, raw proof bytes, gas numbers, contract counts, the SDK. They are true and useful, but they belong in
the README and the pitch, not in a two-minute product demo.

## If something goes wrong while recording

| Symptom | Action |
|---|---|
| "Makers offline" | Wait 60 s, check `/api/health`. Record only on "Makers live". |
| Fewer than 5 commitments | A maker is out of MON: faucet or `pnpm setup:monad`, record on another market. |
| "Proving" longer than 20 s | Relayer out of MON: top up, re-record from the request. |
| Execute disabled | Mint USDC from the wallet card, or start a new round if 15 min passed. |

## Upload

YouTube, **Unlisted**, 1080p. Title: `Niskala — best price from every maker, with proof (Monad Metropolis demo)`.

```
Niskala gives traders the best price from five market makers, and a proof that it really was the best. The makers' prices stay private.

Live app: https://niskala-nu.vercel.app
A settled round: https://niskala-nu.vercel.app/rfq/weth-usdc/2
Code: https://github.com/immanueljanis/niskala

Recorded in one take on Monad testnet.
```

Tick **Show this video publicly**.
