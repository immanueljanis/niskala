# Pitch video (≤ 2:00)

Form requirement: introduce the team, the problem you solve, and why you are building it. Up to 2 minutes. Target
length **1:45**.

Format: you on camera (phone or webcam, eye level, window light, plain background) with four short screen inserts
from the product. Slides are allowed here but not needed; the product is the slide. Speak to one person, not to a
room. Replace the bracketed parts.

## Prep

| # | Check |
|---|---|
| 1 | Camera at eye level, 1080p, landscape. Light in front of you, not behind. Phone on a stand or books. |
| 2 | Audio: quiet room, phone or lav mic within 50 cm. Record a 5-second test and listen with headphones. |
| 3 | Four screen inserts recorded in advance (see list below), 1080p, no cursor flailing. |
| 4 | Script memorised in beats, not word for word. One beat per section, 20–30 seconds each. |
| 5 | Record the whole thing three times; keep the take where you sound like you are explaining, not reading. |

## Flow and script

### 0:00–0:15 · Who we are (camera)

> "Hi, I'm [name], [role, one line of background: e.g. 'I've built trading systems for X years' / 'I'm a smart
> contract engineer']. [If a team: 'With me is [name], who did [part].'] We built Niskala for Monad Metropolis,
> Track one, Onchain Finance and Trading."

### 0:15–0:45 · The problem (camera, insert ① at 0:30)

> "Serious size doesn't trade on an order book. It trades by request for quote: you ask a few market makers for a
> price, the best one wins. The makers' prices are private, and they should be; a public losing book leaks every
> maker's strategy over time.
>
> But privacy moves the trust to the middle. The router tells you 'this was the best quote.' You can't check. A
> transparent auction would fix that and leak every price. A private router protects prices and asks for trust.
> Today you get one or the other."

Insert ①: landing section "Makers were always private. Routers were always trusted." (5 s).

### 0:45–1:15 · What we built (camera, inserts ② and ③)

> "Niskala keeps the competition sealed and makes the result provable. A trader opens a round on Monad. Up to five
> makers post a commitment to their price and lock the full size, so every quote can fill. When the window closes,
> a zero-knowledge proof shows the winner is the best quote in that exact set, and the market contract verifies it
> itself. Only the winning price comes out. Then it settles in one transaction.
>
> It's live on Monad testnet: eight markets, twenty-seven verified contracts, a hosted coordinator, and an SDK so any
> desk can plug its own pricing in today."

Insert ②: round page, lanes sealing then "Best price proven" (10 s, from the demo recording).
Insert ③: receipt with the settlement transaction (5 s).

### 1:15–1:35 · Why Monad, why us (camera, insert ④)

> "The proof costs about six million gas to verify. On most chains that's a slow, expensive afterthought. On Monad
> the whole round, five commits, verification, settlement, finishes in about seven seconds, so verification can sit
> inside the trade instead of after it.
>
> We're building this because we've been on the taker side of 'trust me, that was the best price'. We'd rather have
> the receipt."

Insert ④: phase strip "create → 5 commits → verified onchain → settled" with the timing overlay (5 s).

### 1:35–1:45 · Close (camera)

> "Niskala. Private quotes, provably best execution. The app, the code and the verified contracts are in the
> submission. Thank you."

End card: `docs/brand/niskala-banner.png`, 2 seconds, with the URL `niskala-nu.vercel.app` under it.

## Screen inserts to record (before the camera takes)

| # | What | Where | Length |
|---|---|---|---|
| ① | Compare section, both cards | landing, scroll to "Makers were always private" | 5 s |
| ② | Lanes sealing → "Best price proven" | reuse the demo recording, 0:55–1:30 | 10 s |
| ③ | Receipt card with settlement link | demo recording, 1:55–2:05 | 5 s |
| ④ | Phase strip of a settled round | https://niskala-nu.vercel.app/rfq/weth-usdc/2 top | 5 s |

## Delivery notes

- Problem first, product second. The judge should be able to repeat the problem in one sentence after 0:45.
- Say "verified by the contract" at least once; it is the difference from every private RFQ pitch.
- Do not say "trustless" or "fully private". The coordinator sees the openings; the README says so and judges will
  check. If asked, that is the roadmap (MPC / TEE proving).
- Numbers to keep straight: 5 makers, 8 markets, 27 verified contracts, about 7 seconds per round, about 5.8 M gas,
  7.2 KB proof.
- No music under speech. Cut on sentence boundaries. Export 1080p, MP4.

## Upload

- YouTube, **Unlisted**. Title: `Niskala Markets — pitch (Monad Metropolis)`.
- Description: same block as the demo video (see `VIDEO-DEMO.md`), first line replaced with
  `Pitch for Niskala Markets, Monad Metropolis 2026, Track 01 Onchain Finance & Trading.`
- Paste the link in the form's **Pitch video** field.
