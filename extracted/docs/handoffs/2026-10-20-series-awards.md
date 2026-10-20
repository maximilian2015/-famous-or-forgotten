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
- **Series Roles V2 — after Streaming V1** (Maxi). Real ensemble and supporting parts for existing
  television, each with its own offer card, fee, screen time, award category and fame — never a label made
  for the award alone. Network Drama: Lead / Ensemble regular / Recurring / Guest · Prestige Series: Lead /
  Supporting / Guest · Soap: Lead / Recurring supporting · Limited Series: Lead / Supporting. Includes a
  supporting part "stealing the show".

## Award roles — the audit (20 Oct) and the decision

Every television part an actor gets, 40 television careers (`awardRoleOf` in `career/awards.js`):

| part | credits | rated 70+ | what the offer card says | award role |
|---|---|---|---|---|
| Network Drama · Series regular | 643 | 323 | Lead | leading |
| Prestige Series · Season lead | 271 | 241 | Lead | leading |
| Crime Series · Episode | 206 | 0 (best 63) | a day or two | **ineligible** |
| Drama Series · Guest role | 192 | 0 (best 66) | a day or two | **ineligible** |
| Soap Opera · Recurring | 170 | 49 | Lead | leading |
| Prestige Series · The matriarch | 105 | 92 | Lead (fee ×0.8) | leading |
| a singer's Talent Series · Judge, Music Show · Guest | — | — | — | **ineligible** (not acting) |

The card, the fee and the A-list door (`carried`) all call the first four leads, so the award does too —
relabelling one for the award alone would contradict the card the player signed. The ineligible parts are
out explicitly, not by the rating ceiling (a guest spot's job prestige, 30–45, holds its rating near 66; a
later formula could lift it). Supporting in a Series stays nearly empty for the player until parts that are
honestly supporting exist: Streaming V1 brings the first ones (a supporting part with a lower fee and a card
that says so), Series Roles V2 the rest. Same seed, six careers: identical lives before and after.
- Diary night entry, Walk of Fame, the Standing screen's own wording: later.
