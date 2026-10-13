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

> "If you want to buy a lot of crypto at once, you don't use a normal exchange. You ask a few trading firms for a
> price and take the cheapest one."

### 3 · The problem (0:22–0:30)

> "But you never see the other prices. You just hear: trust me, best price."

### 4 · The trap (0:30–0:50)

> "Here's the problem. If those prices go on the blockchain, everyone sees them, and the firms stop giving their best
> price. If the prices stay hidden, someone in the middle picks the winner, and you just have to believe them.
>
> So today you either give up privacy, or you give up proof."

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
