# Streaming Movies V1 — built (Media Ecosystem stage 3, second half)

22 Oct 2026, branch `streaming-movies-v1` (on `streaming-movies-plan`). The plan is
`2026-10-21-streaming-movies-v1-plan.md`, revision 2, beside this file.

## Where it lives

| piece | file |
|---|---|
| the film table, `dropFilm` (starts / momentum / completion), the outcome, fame, the platform's line, sequel odds, who backs a campaign, the festival bidder, the later-sale odds, `isPlatformFilm` | `career/streaming.js` |
| a platform's all-in film budget, its film scale | `career/budget.js` `planPlatformFilmBudget`, `platformFilmScale` |
| a platform film is `medium: streaming, format: movie`; its sequel is a franchise, not a series | `career/project.js` |
| film rows on the streaming shelf, the agent's and the platform's calls; the fee at ×1.25 | `career/castings.js` `FILM_ROWS`, `makePlatformFilmPart` |
| the buyout line in place of back end / merchandise / points | `career/contract.js` |
| the drop | `career/release/streaming.js` `dropPlatformFilm` |
| two buyers, the choice, the sale to a platform, the later sale | `career/release/acquisition.js` (new) |
| the festival decided once, the answer, cinema-only standing for a sale | `career/release/theatrical.js` |
| the letter | `meta/email.js` |
| the night it goes out, the four-week close, fame, the money line, the sequel instead of a renewal, reviewed as a film | `career/release.js` |
| the platform's sequel | `career/franchise.js` `platformFilmSequel` |
| who pays for the Asker campaign | `career/awards.js` `campaignKind`, `campaignBacker`; `CampaignCard.jsx` |
| not on the box-office lists | `world/yearbook.js` |
| screens | `BigMoment.jsx` (week one figure), `Filmography.jsx` (Streaming Film, week x of 4), `Diary.jsx` (two buyers, the drop) |

## Where it differs from the plan (all found by the probe or by playing it)

1. **Calibrated values** (the plan's starting values stay in `tests/test_streaming_movies.mjs` PLAN; the
   plan's examples are still checked against them):
   - targets: giant 0.18→0.52, premium 0.32→0.74, ad-supported 0.65→1.2, genre 0.33→0.26;
   - Breakout bars: 70→120, 25→32, 35→40, genre 10.

   At the starting values a film's median score was 2.4–2.9 on careers, and half of the giant's films
   were Breakouts. On a real career the names are bigger, the talk louder and the crowd kinder than in
   the plan's examples.
2. **A platform's price for a festival picture has a floor**: never less than its own cheapest film
   (its low push line). Without it the giant bought a €2m picture for €2.6m and it scored 26. The
   later sale has the same floor at half.
3. **The choice takes one month.** The letter arrives with the month's post. The release waits one
   month; with no answer it goes to cinemas, and the letter says so. The cinema road therefore opens a
   month later than it did; with streaming off nothing waits.
4. **Two lines of text found by playing it**:
   - the critics-against-the-room line said "bought a ticket" on a platform. It now says "pressed
     play", for series too;
   - "Monarch Pictures's offer".

## Measured

`tests/probes/probe_streaming_movies.mjs`, 40 careers × 34 years, calibrated values.

| | unsteered ("any") | streaming bot |
|---|---|---|
| platform films (share of all films) | 345 (16%) | 636 (41%) |
| median score: giant · premium · ad-supported · genre | 1.07 · 1.47 · 1.61 · 3.07 | 0.93 · 1.00 · 1.00 · 1.07 |
| miss · solid · hit · breakout | 18% · 40% · 40% · 2% | 31% · 34% · 34% · 0% |
| week one, median share of 28 days | 51% | 67% |
| completion, median | 70% | 56% |
| how it arrived | agent 162 · platform's call 137 · open call 45 | open call 403 · agent 121 · platform's call 103 |
| festival pictures a platform bought (median score) | 71 (2.10) | 58 (1.56) |
| two-buyer letters (platform / cinema) | 121 (69 / 52, chosen at random) | 56 (all platform) |
| sold to a platform later | 3 (of 25 unsold rated 55+) | 2 (of 7) |
| Asker nominations: platform films · cinema films | 33 · 115 | 29 · 42 |

**Fame** (closeRun's change; a cinema film also gets its opening-night fame, not counted here):

| | platform | cinema |
|---|---|---|
| indie lead | 0.97 | 0.07 |
| feature lead | 0.66 | 0.82 |
| blockbuster lead | 1.02 | 0.71 |

The indie gap is the cinema's flops. A star's indie that bombs takes fame away; a platform film that
misses takes nothing, as a season does.

**×1.25 against points.** The bot signs without the contract room, so this is what three points
would have paid on its own cinema leads:

| | buyout quarter (platform) | three points (cinema) |
|---|---|---|
| indie | €0.79m | €0.43m |
| feature | €4.2m | €2.2m |
| blockbuster | €9.5m | €13.2m |

The buyout pays more on small and middle films, and points pay more on tentpoles. It is a decision,
not a dominant road.

**The cinema, against main** (unsteered, 40 careers each):

| | branch | main |
|---|---|---|
| gross p50: indie | €10.9m | €11.1m |
| gross p50: feature | €128.5m | €130.9m |
| gross p50: blockbuster | €751m | €687m |
| feature smash | 29% | 30% |
| blockbuster smash | 29% | 26% |
| blockbusters past a billion | 36% | 32% |

Within noise. Festival pictures in cinemas are fewer (107 against 178), because half of the ones with
a platform bidder went to the platform.

**Streaming seasons** (`probe_streaming.mjs`, seasons only now): first-season outcomes as before.
There are fewer seasons per career (497 against 762 unsteered), because films share the shelf, the
agent's share and the platform's calls, as the plan said. With fewer seasons there are fewer Emmet
nominations (71 against 153).

`STREAMING=off`: six careers × 30 years, the same seed, identical to main to the last line.
`tests/test_streaming_movies.mjs`: 20 checks.

Played once in the browser:
- festival sold at Toronto;
- the letter, then "Streaming — Static";
- the drop card ("bought by Static");
- Four weeks in: Hit, 1.4m in week one, 2.7m in 28 days, 62% finished, "Static wants a second one";
- Filmography: "Streaming Film · Horror", the 📱 line, "Low Tide II" greenlit.

## Not built, or open

- The home screen's "RIGHT NOW" line says the picture "is in post" while two buyers wait (App.jsx,
  not touched). The event line under it says the choice is in Messages.
- A co-star's own career does not record a platform film (`applyFilmToActor` is cinema-only).
- Heat counts a platform film's rating and no gross.
- Known For does not count a platform film's Hit as a hit unless it is rated 7.5+ (as for series).
- A platform's memory of you after a flop, and Streaming Value: stage 4.
- No TV movies (plan §9).

## Debt

- `release.js` is 880 lines (was 828). `open` is ~185 lines and `closeRun` ~240: both are past the
  line, and both got checks, not logic. The film's night is its own function (`platformFilmNight`),
  and the acquisition is its own module.
- `castings.js` is 932 lines (was 858), nearing 1000. The film rows are data plus one maker.
- `awards.js` 841, `theatrical.js` 687, `streaming.js` 347.
