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

## Not built, or open

- **Breakout for stars.** On ordinary careers, where streaming comes mostly to established names, later seasons
  are Breakouts 43–55% of the time: a pushed star draws past any views bar. The plan defines a Breakout by views
  alone; making it also need virality (people passing it around) is a decision for Maxi.
- Routes: only the board (open call) and the rescue. The agent's submissions and the platforms' direct offers
  by email (plan §8) are not built.
- The board's typecast turn-away is not applied to the streaming shelf; the genre box still leans it.
- Bubble month-by-month lines still say "the network" for a platform's show (the first line is fixed).
- The critics' reviews call a series "a film" — as they always did for television.
- Known For does not count a Breakout as a hit unless it is rated 7.5+ — as for television's "watched".
- A streaming show cannot be pushed back with a favour (`pushable`) yet.
- Pay cut to save a show (backlog, Maxi: right after V1) — renewal already reads the real fees, so it slots in.

## Measured

`tests/probes/probe_streaming.mjs`, 40 careers × 34 years, the shipped values. "Streaming bot" reads for the
streaming shelf first (two runs); "ordinary" takes the best-paid offer, as a player who is not steering does.

| | streaming bot | ordinary |
|---|---|---|
| careers with streaming work | 40 of 40, ~33 seasons each, 60% of all work | 40 of 40, ~9 seasons each, 16% of all work |
| first seasons: miss · solid · hit · breakout | 28–29% · 42–43% · 26–29% · 1–2% | 10% · 47% · 33% · 9% |
| first seasons renewed | 58% | 71% |
| later seasons: miss · solid · hit · breakout | 6–7% · 26–28% · 56–61% · 6–10% | 2% · 33% · 23% · 42% |
| shows that ran 4+ seasons | 8–10% | 11% |
| cancelled for what the next season would cost | 96–103 of ~320 cancellations | 61 of 78 |
| score around the Solid/Hit line (0.7–1.05 · 1.05–1.4 · 1.4–2.1) | 280 · 204 · 256 | 80 · 84 · 101 |
| series award: nominations · supporting (wins) | 75–89 · 22–25 (1–3) | 62 · 4 (0) |

By platform, first seasons, streaming bot: the giant miss 33–38% (stars do better: 11%), the premium
service 25–39% miss and 25–36% renewed (it is dear), the ad-supported and genre services about 25% miss and
70% renewed (cheap). Fame from a season: +0.6 to +0.9 on average (it is awareness, and most streaming work is
done by people already known). The supporting race at the series award has the player in it now — 22–25
supporting nominations in 40 careers, where every run before this had none.

Same seed, six careers, streaming off: identical to main to the last digit. `tests/test_streaming.mjs`: 23 checks.
