# Design

Niskala visual system, v3 (light editorial fintech). Reference: TrustFlow (motionsites.ai), kept for pacing, hierarchy and restraint; palette and motif are Niskala's own.

## Theme

Light. One page background, white surfaces, tonal tiles instead of borders. The only saturated surface is the pine-green brand block used for the strongest claim, the execution panel and the closing CTA.

## Color

| Token | Hex | Role |
|---|---|---|
| bg | #F5F7F6 | page |
| surface | #FFFFFF | cards (soft shadow, 14px radius) |
| tile | #ECF0EE | tonal containers, inputs, secondary buttons |
| hairline | #E1E6E3 | dividers in lists only |
| text | #0F1613 | ink |
| muted | #5B6762 | secondary copy |
| dim | #8A948F | tertiary, labels |
| brand | #163F2F | committed blocks, active steps, hover on primary |
| verified | #2E7D5B | proven / public (tint #E3EFE8) |
| pending | #B7791F | sealed / private (tint #F4EBDB) |
| error | #B4443E | failures (tint #F6E3E2) |
| accent | #1B5E47 | links |

Semantics never change: green means proven or public, amber means sealed or private.

## Typography

- Display: Source Serif 4, 400, letter-spacing -0.02em, line-height 1.02. Used for h1/h2, big numbers, card titles.
- Body and UI: Geist 400/500, 14 to 15px, line-height 1.6, max 60ch.
- Mono: Geist Mono for hashes, amounts, timers.
- Scale: h1 clamp(2.75rem, 7.2vw, 5.75rem); h2 2.5rem; card title 1.5rem; body 0.9375rem; meta 0.75rem.

## Components

- Buttons: 42px, 8px radius, no border. Primary ink on white; secondary tile; on brand blocks, white.
- Pills: tonal fill, uppercase 11px, dot indicator.
- Cards: white, shadow only. Tiles: #ECF0EE, no shadow. No nested cards.
- Inputs: tile fill, focus ring #C9DCD3.
- Nav: logo in serif, four centered links, one dark CTA. Transparent over page with blur.

## Motion

- Hero: canvas particle field; proof line sweeps every 7 s above the headline, one lane resolves to a pine node, the other two fade to amber.
- In-view reveals (motion): 18px rise + blur, expo ease, 2.5 s fallback so nothing stays hidden.
- Stepper autoplay 4.2 s, pause on hover. Counters animate once.
- Reduced motion: static hero frame, no reveals, no autoplay.

## Layout

- Max width 80rem, 20px gutters. Section rhythm 6 to 8rem on desktop.
- Hero is centered; the first card overlaps the hero field.
- Grids: tiles use gap-3/4; long lists use thin dividers.
