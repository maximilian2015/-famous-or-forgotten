# Streaming Series V1 — built (Media Ecosystem stage 3)

20 Oct 2026, branch `streaming-v1` (on `award-roles`). The plan is
`docs/handoffs/2026-10-20-streaming-series-v1-plan.md`, revision 4 (branch `shared-universe-audit`).

## Where it lives

| piece | file |
|---|---|
| platforms, the drop, the outcome, the renewal projection, the words | `career/streaming.js` (pure: no state but the platforms' first appearance, no Math.random) |
| what an episode costs a platform | `career/budget.js` `planEpisodeCost` (seeded, kept on the project) |
| fee tables `stream_series` (network ×1.3), `stream_premium` (premium ×1.15) | `meta/status.js` `QUOTE` |
| medium `streaming`, format `series` / `limited_series`, `platformId`, `episodeCost`, `legacy`, distribution `drop` | `career/project.js` |
| the Streaming shelf on top of the board, its rows, the offer keeping tier and platform | `career/castings.js` `STREAM_ROWS`, `fillStreamShelf` |
| the drop (post 4–7 months), the close, fame from views, hype by outcome, no `tv` mark | `career/release.js` `dropStreaming`, `open`, `closeRun` |
| renewal on the real next cost, through `maybeContinue` when renewed, the bubble near the bar | `career/franchise.js` `streamingRenewal` |
| a network show a platform rescues (legacy index), a platform show another platform rescues | `career/bubble.js` `rescue` |
| miss −1 · solid 0 · hit +1 · breakout +2 | `career/outcome.js` |
| screens | `OpenCall.jsx` (shelf, platform line), `BigMoment.jsx` (the drop, four weeks in: score, views, finished, outcome, the platform's line), `Filmography.jsx`, `Diary.jsx` |

`setStreamingPool(false)` switches off the shelf and the platform rescue; with it off, a seeded life is the
same to the last digit as main (`STREAMING=off node tests/probes/probe_same_life.mjs …`).

## Where it differs from the plan (all found by the probe, all in one place to undo)

1. **Returning fans are counted once.** The plan's `opening7 = … + 0.6 × last finished28`, then
   `views28 = opening7 × 2.4 × virality`, multiplied last season's finishers by the four-week run as if they
   were new viewers: every returning season more than doubled the one before (52–59% of second seasons were
   Breakouts). Fans now sit in week one and are added to `views28` once; the run and virality multiply only the
   fresh opening. Same kind of double count as completion in revision 3.
2. **Calibrated values** (`ARCHETYPES`; the plan's starting values stay in `tests/test_streaming.mjs` PLAN, and
   the plan's examples are still checked against them): targets global 0.15→0.21, prestige 0.07→0.135,
   library 0.10→0.31, genre 0.045→0.073 · breakout bars 60→75, 25→35, 30→40, 8→9 · renewal bars 1.0→0.85,
   0.8→0.65, 0.7→0.65, 0.8→0.7. Set so a first season's median score is about 1 everywhere.
3. **Fame per view** doubled: +1 per 5M views (was 10M), up to +8 (was 6). At the plan's rate a median streaming
   season moved a name a fifth of a network lead's season.
4. **The cheap services do not call names they cannot pay**: a season's fee above €8m (ad-supported) or €4m
   (genre) is not offered. Without it an A-lister was offered a library lead at €20m, on a platform whose whole
   season ceiling is €40m.

5. **A Breakout needs virality** (Maxi, 20 Oct): a Hit, past the platform's views bar, AND passed around (word
   82+, 70% finishing). A condition for the word, never a multiplier on the score. Before it, 42–55% of a star's
   later seasons were Breakouts; now 4–6%.
6. **The routes** (plan §8): the shelf carries the supporting parts (open call, self-tape); a platform lead
   (fame 35+, 45+ for a limited series) comes through your agent — one agent call in six; a premium season
   lead (55+) and an event series (75+) are the platform's own call, in Email (2.2% a month for a star, 3.5% for
   an A-lister). Fame gates all of it until stage 4. Without an agent, no agent route.
7. **The words**: a platform's show on the bubble is decided by the platform, by name, on every line; critics
   review any series — television or streaming — as a series (critics.js asSeries).
8. The cheap services' renewal bars went to 0.8 (they renewed 80% of everything at 0.65–0.7).

## Not built, or open

- The board's typecast turn-away is not applied to the streaming shelf; the genre box still leans it.
- Known For does not count a Breakout as a hit unless it is rated 7.5+ — as for television's "watched".
- A streaming show cannot be pushed back with a favour (`pushable`) yet.
- Pay cut to save a show (backlog, Maxi: right after V1) — renewal already reads the real fees, so it slots in.

## Measured

`tests/probes/probe_streaming.mjs`, 40 careers × 34 years, the shipped values. "Streaming bot" reads for the
streaming shelf first and takes a platform's work first; "ordinary" takes the best-paid offer, as a player who
is not steering does. Both sign an agent when one offers.

| | streaming bot | ordinary (two runs) |
|---|---|---|
| streaming in a career | 36 seasons, 60% of all work | 20–21 seasons, 29–30% of all work |
| how it arrived | open call 746 · continuation 426 · agent 146 · platform's call 117 | platform's call 274–295 · continuation 225–235 · agent 163–199 · open call 113–118 |
| first seasons: miss · solid · hit · breakout | 29% · 40% · 30% · 0% | 17–19% · 43–45% · 32–33% · 5–6% |
| later seasons: breakout | 1% | 4–6% |
| renewed, all seasons: giant · premium · ad-supported · genre | 50% · 72% · 68% · 67% | 67–70% · 78–84% · 80% · 80–90% |
| first seasons renewed | 48% | 54–56% |
| cancelled for what the next season would cost | 144 of 419 | 122–127 of ~170 |
| fame from a season: lead · supporting | +0.68 · +0.65 | +0.43–0.47 · +0.30–0.37 |
| series award: nominations · supporting (wins) | 107 · 30 (3) | 155–169 · 5–6 (1) |

Fame by part: a supporting part gets half of what its views would give a lead (`fameFromViews`). In the
streaming bot the averages come out close because supporting parts are taken early, when a point of fame is
cheap, and leads late, when it is dear; in ordinary careers, where both come late, the half shows (0.30–0.37
against 0.43–0.47, though the supporting parts there were on bigger shows).

Same seed, six careers, streaming off: identical to main to the last digit. `tests/test_streaming.mjs`: 29 checks.
