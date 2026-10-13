# Demo video dubbing script

Source: `2026-10-14 02-36-39.mp4` (100 s, one real SOL/USDC round on Monad testnet).
Timecodes are from the **original** recording. Speak at a calm pace (about 2.5 words per second).

## Recommended edit before dubbing

| Cut | Why |
|---|---|
| 0:00–0:01 | OBS window |
| 0:74–0:94 | Create tx, commit tx and a second pass over the inspector; repeats what 0:54–0:73 already proves |
| 0:98–1:00 | OBS window |
| Add at the end | Hold the "Settled" frame or the brand card (`docs/brand/niskala-banner.png`) for 3 s so the close fits |

Result: about 75 s.

## Script

| Original time | Screen | Voice-over |
|---|---|---|
| 0:02–0:11 | Landing hero, stats, markets | "Niskala gives you the best price from five trading firms, and a proof that it really was the best. Eight markets, live on Monad." |
| 0:12–0:17 | Trade page, pick SOL, request | "I want a hundred SOL. One request goes to five trading firms." |
| 0:18–0:23 | Wallet confirmation | "One signature." |
| 0:24–0:27 | Waiting, then submitting proof | "The firms quote in secret. All five sealed prices land in about two seconds." |
| 0:28–0:35 | Best price proven, lanes, 107.69 best | "Here's my price: 107.69 USDC per SOL, the best of the five. The other four prices stay secret." |
| 0:36–0:43 | Best execution card, proof inspector | "And this proof, checked by the contract on Monad, shows no better price was hidden or skipped." |
| 0:44–0:49 | Execute, wallet confirmation | "Now I execute. One more signature." |
| 0:50–0:53 | Settled, receipt | "Done. The USDC goes to the winning firm, the SOL comes to me." |
| 0:54–0:63 | Proof verification tx on MonadVision | "Everything is onchain. This is the contract verifying the proof." |
| 0:64–0:73 | Settlement tx on MonadVision | "And this is the settlement: ten thousand seven hundred sixty-nine USDC out, a hundred SOL in, in one transaction." |
| 0:74–0:94 | (cut) | If you keep it: "Every step is a transaction you can open: the request, and each firm's sealed quote." |
| 0:95–0:97 + 3 s hold | Settled page or brand card | "Best price. Proof it was the best. Niskala, live on Monad today." |

## Recording tips

- Record each row as a separate take; it is easier to line up in the editor.
- Leave the 0:18–0:23 and 0:44–0:49 wallet moments mostly silent; the click is enough.
- Keep the original system audio muted under the voice.
