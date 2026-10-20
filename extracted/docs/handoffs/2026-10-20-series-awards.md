# Series Awards V1 — the Emmet

20 Oct 2026, branch `series-awards`. Built before Streaming stage 3 (Maxi).

## What it is

- **Eligibility by format** (`career/project.js` awardsTrack): movie → Asker, festival picture → Asker,
  series / soap / limited series → the series award, a day's work → nothing. The Asker is the Oscar: no
  series is ever in it.
- **The same engine** as the Asker (`career/awards.js` tracks `ASKER`, `SERIES`): its own calendar (lists in
  May, night in August), categories (Leading / Supporting Performance in a Series, Best Series), a field of
  rivals (the world makes no series yet), smaller effects than an Asker (nomination: hype 35, quote ×1.15,
  standing up to +5 and fame up to +2, less the higher they are; win: hype 60, quote ×1.4, standing +10,
  fame +10).
- **No television-against-film penalty inside it.** `ASKER_SCALE` put a series at ×0.85 and a guest spot at
  ×0.70 so they could share the Askers' pool with films. In a series-only award those penalties mean
  nothing: `SERIES.scale` is 1 for a network series, a soap and a guest spot. The prestige season keeps its
  ×1.30 (the voters' taste, as festival and indie are the Asker's). The Asker's own table is untouched.

## Measured — 40 television careers × 34 years (`probe_awards.mjs … tv`, the bot reads for series)

| inside the series award | nominations | wins | careers with a win | prestige: share of acting noms / wins |
|---|---|---|---|---|
| inherited (×0.85 / ×0.70 / ×1.30), 2 runs | 180 | 14.5 | 12 of 40 | 88% / 97% |
| everything ×1, 2 runs | 140 | 8 | 7 of 40 | 80% / 94% |
| **shipped: penalties out, prestige ×1.30**, 3 runs | 201 | 14 | 12 of 40 | 83% / 93% |

Wins per winning career: 1, sometimes 2, at most 3. Run-to-run noise is large (9 to 19 wins in the same
setting). Prestige takes most of it whatever the multiplier: its seasons are rated higher and are mostly
drama, which the voters like (`ASKER_GENRE`). Whether network and soap work should have a better road is a
design question — a separate drama / comedy split, or what the soaps are rated — not a multiplier.
Supporting: 0 in every run (below).
- **Name: "Emmet" is the working name** (Maxi: keep it, rename later — one constant).

## Doors

- **A-list door** ("a hit you carried, or a nomination"): an Emmet nomination opens it. A series nomination
  always did, when series were up for Askers; the series award keeps that, it does not add anything new.
- **Icon door: Asker only, not changed** (Maxi). An Emmet does not open it.
- **Casting doors** (`askerStanding` → casting reach): Asker only, not changed (Maxi). They become
  market-specific when TV / Streaming Value arrive (stage 4): the Asker for theatrical access, the Emmet for
  television and streaming, a little transfer between.
- **Old saves**: a series' Asker records move to the series award only when tied to the exact credit
  (creditId, or a unique title in the year window); nothing is guessed. A moved record is marked
  `fromAsker` and keeps what it gave under the old rules — the Icon key and the casting reach.

## Screens

Season card per award, the morning and the night name the award and its months, the campaign says network
for a series, hype says "the Emmets", 📺 line under the name, passport row, Known For, legacy, the mantelpiece
(a silver statuette with a globe beside the Askers' gold), the Guide (the two doors, Standing).

## Backlog — decided, not built

- **Icon for a television legend** (stage 4 / backlog): six Emmets and twenty-five years of series and no
  Asker cannot reach Icon today. Something like: an Asker winner, or several Emmets, or a world / streaming
  phenomenon, with longevity.
- **Market-specific casting doors** with TV / Streaming Value (stage 4).
- **A supporting part in a series.** Every television part in the game counts as a lead — the soap's
  Recurring, the network drama's Series regular, the prestige Season lead and The matriarch — and guest spots
  in the probe never reached the 70 floor (24 of them, the best rated 69). So the Supporting race is always
  somebody else's. Which television parts are supporting is a design decision for later.
- Diary night entry, Walk of Fame, the Standing screen's own wording: later.
