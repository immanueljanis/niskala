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

### 2 · The setup (0:10–0:25)

> "Big trades don't go to an order book. A trader asks a few market makers for a price, and the best one wins. The
> prices stay private. But look at what the trader can actually check: the price they got. Not the other quotes. Not
> that the best one really won."

### 3 · The problem (0:25–0:35)

> "So every private trade ends with the same four words. Trust me. Best price."

### 4 · The trap (0:35–0:50)

> "And today you have to pick one. A public auction lets anyone check the winner, but every losing price leaks. A
> private RFQ protects the makers, but the trader has to trust whoever picked the winner."

### 5 · Meet Niskala (0:50–1:05)

> "Niskala gives you both. The best price from every maker, and a proof that it really was the best. The losing
> prices stay secret."

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
