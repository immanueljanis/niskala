# Design review: Niskala landing v1 → v2

Date: 2026-10-13. References captured in `docs/screenshots/ref-*.png`.

## What the strongest pages in the neighbourhood do

| Site | Hero | How the product is shown | Trust artefacts | Flow explanation | Motion | Close |
|---|---|---|---|---|---|---|
| wotsignature.xyz (user reference) | Full-bleed canvas: particle glyphs over a rippling surface, one sentence, pill CTAs | Contract address panel with copy button right in the hero | Contract address, DEX links | "How it works" anchor | Canvas motion + staggered reveals; 36 animated elements | Short page, one idea |
| succinct.xyz | White, serif display, line-art product object | Three product rows with labels, solution tiles with illustrations | Partner logo wall, live counters wired with lines | Technology → Solutions → Partners | Counter animation, few keyframes | News grid |
| hyperliquid.xyz | Particle dot terrain, serif display | Product screenshot in a frame, app list | Stats bar (volume, open interest), partner logos | Trade → Build → Vision → Security | Framer in-view, video | Giant wordmark |
| zama.ai | Yellow drench, large friendly sans | Mini-UI cards that replay the flow (Shield / Earn / Swap) | Live shielded volume, code snippet, industry grid | "Confidential onchain finance is live" cards | GSAP, canvas | Contact CTA |

Common structure: a hero visual that *is* the concept, one claim, real numbers, the product itself on the page, the flow as a sequence with visuals, artefacts you can click, a typographic closing.

## What v1 was missing (reverse-engineering our own page)

- Hero was a UI widget (three rows in a box), not a brand image; no ambient motion.
- No product shown; the round page, our strongest surface, never appeared on the landing.
- Flow was three text cards: no actors, no onchain vs private lanes, no real artefacts.
- No iconography, no stats, no live data, no transaction ledger, no FAQ, no closing moment.
- Tiny uppercase eyebrow above every section and identical card grids: the AI-template grammar.

## v2 decisions

- **Hero**: generative canvas (`HeroField`) with three dense particle lanes drifting upward on the right; a proof line sweeps every 7 s and resolves one lane into a single sage node while the other two dim to amber. Text left, visual right; contract address pill with copy + explorer under the CTAs (borrowed from the reference).
- **Stats strip**: live `rfqCount` and settled count from the chain, plus the three measured facts (7,232 B proof, 0.6 s, 5.8 M gas). Counters animate once.
- **Compare**: trusted routing vs verifiable routing as two small node diagrams, not prose.
- **FlowStepper**: five moves (Request, Seal, Close, Prove and verify, Settle). Left: actor, body, the exact onchain call, what stays private. Right: a stage that replays what the trader sees (lanes sealing, proof line, verifier true, settlement). Autoplays, pauses on hover, click to jump, keyboard reachable.
- **Replay**: round #1 on Monad as a ledger of seven real transactions with explorer links; live from the coordinator, static facts as fallback.
- **Boundary**: public vs private lists with eye icons and the honest coordinator note inside the private column.
- **FAQ**: the judge questions from the build pack, native `<details>`.
- **Close**: giant NISKALA wordmark with one CTA.
- **Motion**: `motion` in-view reveals with a 2.5 s fallback so nothing ships blank in headless renders; `prefers-reduced-motion` disables all of it; canvas renders one static frame.
- **Icons**: lucide, 1.6 stroke, used as meaning (actor, lock, shield, swap), never as decoration above headings.
- **Palette**: unchanged Niskala tokens. Sage = proven, amber = sealed, ice = links. Metropolis was used for pacing and motion, not colour.

## Still open

- Product pages (`/trade`, `/rfq/[id]`) received icons on the phase strip only; the terminal form could use the same stage treatment.
- A short looping product video of a real round would beat the stepper for judges skimming on a phone.
- DESIGN.md for the design system (impeccable `document`) is not written yet.

## v3 (2026-10-13, second feedback round)

Reference: TrustFlow on motionsites.ai (finance template): light page, centered serif headline, three-line body, one black button,
pale architectural illustration behind the hero, a white card overlapping the hero, grey tiles instead of bordered cards, almost no borders.

What changed, site-wide:
- Palette flipped to light with Niskala's own tokens (`DESIGN.md`): page #F5F7F6, white cards with soft shadow, #ECF0EE tiles, pine #163F2F as the single committed colour. Green still means proven, amber still means sealed.
- Display type: Source Serif 4 for every heading and big number; Geist for UI; Geist Mono for hashes.
- Borders removed everywhere except list dividers; tonal fills carry structure.
- Nav: serif wordmark, four centred links, one dark button. App pages swap the button for the wallet chip.
- Hero: centred headline over the particle field (now light grey-green, proof line above the text), contract pill below the CTAs, white card overlapping with the three moves.
- Terminal, round page, receipt and inspector rebuilt on the same tiles and cards; execution panel is the brand block.
- Copy cut by roughly a third; one named kicker ("What happens in a round") instead of eyebrows.
