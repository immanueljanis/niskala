# Pitch video (≤ 2:00, target 1:50)

Form requirement: introduce the team, the problem you solve, and why you are building it. Up to 2 minutes.

**Slides: https://niskala-nu.vercel.app/pitch** (9 slides, arrow keys or space to advance, swipe on mobile).
Record the browser full screen with your voice over it, or picture-in-picture with your camera in a corner.

## Prep

| # | Check |
|---|---|
| 1 | Chrome, full screen (F11), 1920×1080, zoom 100 %, notifications off. Open `/pitch` on slide 1. |
| 2 | Mic within 50 cm, quiet room. Optional: webcam bubble bottom-left (Loom or OBS). |
| 3 | Advance with the right arrow key on the first word of each section below. |
| 4 | Record three takes, keep the one that sounds like explaining to one person. |

## Script, slide by slide (≈ 260 words)

### 1 · Title (0:00–0:10)

> "Hi, I'm Immanuel. I built Niskala for Monad Metropolis, track one, Onchain Finance and Trading."

### 2 · The setup (0:10–0:22)

> "When a fund buys ten million dollars of ETH, it doesn't use an exchange. It asks a broker to collect prices from a
> few trading firms and pick the best one. Then it gets one number back. This was the best price."

### 3 · The problem (0:22–0:35)

> "It can't see the other prices. It can't check. In traditional finance, best execution is even a legal duty, and the
> proof is a report the broker writes about itself."

### 4 · Why it is still broken (0:35–0:50)

> "Putting every price on a blockchain would fix that. But then every firm's strategy is public, and nobody wants to
> quote.
>
> So today, the best price is something you're told. Not something you can check."

### 5 · Meet Niskala (0:50–1:05)

> "Niskala makes it something you can check. Trading firms quote in secret. A proof, checked by the contract, shows the
> best price won. And the firms join, because their losing prices are never shown to anyone."

### 6 · How it works (1:05–1:20)

> "Four steps. The trader asks. Up to five makers seal a hidden price and lock the full size. A zero-knowledge proof
> shows the winner is the best in the set, and the market contract checks it. Then one transaction settles the trade."

### 7 · Proof it works (1:20–1:30)

> "And it's live on Monad today. Eight markets, five makers per round, twenty-seven verified contracts. Every step of
> this round is a real transaction."

### 8 · Why Monad (1:30–1:40)

> "Verifying the proof costs about six million gas. On Monad, the whole round, quotes, proof and settlement, takes
> about seven seconds. So the proof lives inside the trade, not after it."

### 9 · The future (1:40–1:50)

> "We think every price with a secret behind it deserves a proof. Niskala. Private quotes, provably best execution."

## Delivery notes

- If a judge asks "isn't your coordinator the new middleman?": "Our coordinator can see prices, but it can't lie about
  the winner. The contract checks that." Full privacy from the coordinator is the roadmap.

- One idea per slide. If you run long, shorten slide 6 first.
- Say "the contract checks it" at least once; it is what makes this different from every private RFQ.
- Never say "trustless" or "fully private". The coordinator sees the quote openings; the README says so. If asked,
  privacy against the prover is the roadmap.
- Numbers: 5 makers, 8 markets, 27 verified contracts, about 7 seconds, about 6 million gas. Nothing else.

## Upload

YouTube, **Unlisted**. Title: `Niskala — pitch (Monad Metropolis)`.

```
Pitch for Niskala Markets, Monad Metropolis 2026, Track 01 Onchain Finance & Trading.

Slides: https://niskala-nu.vercel.app/pitch
Live app: https://niskala-nu.vercel.app
Code: https://github.com/immanueljanis/niskala
```

Paste the link in the form's **Pitch video** field.
