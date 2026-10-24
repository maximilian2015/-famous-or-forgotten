# Famous or Forgotten — the one roadmap

Written 25 Oct 2026, from the branches and the handoff notes, not from memory. No code was changed for it.

**Rules (Maxi/ChatGPT, 25 Oct):**
- No new features until the core systems are finished.
- A new idea goes into a section of this plan, not into a new task.
- No new independent system where an existing one can be extended.
- The next big step starts only when the last one is checked and accepted.

## 0. Where everything is today

### Branches not in main

| Branch | What it is | State | Tests | Merges into main |
|---|---|---|---|---|
| `fix/decline-preview` | Pass/Decline says what it will do before it does it | done, verified by a side session | in suite | clean |
| `premiere-tonight` | Opening night shows only what is out of the ordinary; fits a phone | done | in suite | clean |
| `story-v1` (contains `story-audit`) | Film stories stages 1–2: story kept on the film, offer shows synopsis, script card, scene days know the page, "Out of order" from the film's secret, critics name the scene | done on the branch; four corrections asked (§2) | 18 story tests + generator checkers | clean |
| `rep-cover` | Memory ledger + the cover chain: four outcomes, director traits, grudge with reason, way back, remembered years later | prototype, built end to end, shown in the UI | test_cover + test_arcs | clean |
| `poster-prototype`, `poster-v2-1`, `poster-v3-directions` | Poster experiments | **paused** — prototypes in `tools/` only | — | do not merge |
| `shared-universe-audit` | Streaming plan rev 4 and the shared-universe design (heirs, U1–U4) | docs only; the plan is built, the universe is parked | — | docs; can stay out |
| `thoughts-aloud` | Maxi's four play-time ideas | docs only | — | docs |

**Trial merge, 25 Oct.**
- Order: main + decline-preview + premiere-tonight + story-v1 + rep-cover, in a separate folder.
- Result: **no conflicts, the build passes, 99/99 tests.**
- They touch some of the same files (Messages, stories.js, release.js, production.js, the set card), but the changes do not collide.

### Done vs designed

**In the game (main, 1d9be31):**
- Media Ecosystem stages 1–3: one project identity, the outcome adapter, Series Awards (the Emmet), Streaming Series V1, Streaming Movies V1 (platform films, the festival buyers).
- Lost continuations (a show or sequel's life without you).
- Budget V2, Family V1, the Directors screen, the passed-parts ledger.

**Built on branches (above):** decline preview, premiere card, film stories 1–2, the cover chain.

**Designed only, no code:**
- reputation architecture (`docs/reputation-architecture.md`);
- the minigame audit (artifact 5uXZd4…: keep 8, redesign 5, two become story choices, remove 1);
- titles from the story (audited, `docs/plot-integration.md` §1b);
- Media Ecosystem stages 4–6;
- Reputation Consequences for departures (The Last Woman slice);
- Role Memory.

## Streaming, series and the media ecosystem — what we started and did not finish

Media Ecosystem V1 was planned in six stages; **1–3 are shipped, 4–6 are not.**

| Item | Status | Goes to |
|---|---|---|
| **Stage 4: market values** — what your fame is worth in cinema / TV / streaming, a platform's memory of you after a flop, market-specific casting doors, the TV legend's road to Icon | designed, not built | Step 6 |
| **Stage 5:** per-medium appetite, the world's own streaming releases and lists | designed, not built | Step 6 |
| **Stage 6:** theatrical bankability read by demand; the Billion Club question | designed, not built | Step 6 |
| **Small streaming loose ends:** the shelf ignores the typecast turn-away; Known For does not count a Breakout or a platform hit unless rated 7.5+; a streaming show cannot be pushed with a favour; the home line says "in post" while two platforms bid; a co-star's career does not record a platform film; Heat counts a platform film's rating and no gross | known, small | **Step 1** |
| **Sequels of platform films** run as world films in the continuation code | known gap | Step 2 |
| **Series Roles V2** — supporting in a series rarely reaches the award floor; TV "lead" parts | backlog since 20 Oct | Step 2 |
| **"Without you" stories** run one at a time; the card reads "recast" between the meeting and the new paper | known, small | Step 1 |
| **Pay cut to save a show** | backlog ("right after V1") | Step 6 (needs market values) |
| **TV movies** | not built | Backlog |
| **The world has no television** (world actors carry no TV credits) | known gap | Step 6 |
| **Shared universe** (heirs, a new actor in an old world) | parked by Maxi | Backlog |

## The plan

Each step: scope · existing systems used · done when · tests · how it ships.

### Step 1 — Stabilise and merge what is ready

- **Scope:**
  - merge decline-preview → premiere-tonight → story-v1 → rep-cover into main, one merge at a time;
  - close the small loose ends marked "Step 1" above;
  - fix the story-v1 corrections that are bugs, not features: story chronology vs shooting order; the meter effect explained.
- **Uses:** what exists; no new system.
- **Done when:** all four are in main; game.html rebuilt and copied; an old save (Alex Moon) loads and plays a year; full suite green after each merge.
- **Tests:** full suite and a played-through life after each merge; one test per loose end.
- **Ships:** one merge per step, game.html after the last.
- **Note:** rep-cover can wait until Step 4 if Maxi prefers it reviewed with the rest of relationships. It merges cleanly either way.

### Step 2 — Stories for films, sequels and series

- **Scope:**
  - titles from the story where a title is born unseen (offers, youngblood, collab, scripted offers; castings and the board at the listing);
  - a supporting part's own want and conflict (~190 roles);
  - sequels from part one's stored story (`sequelFor`), platform-film sequels included;
  - series: the story across seasons, characters who leave and come back (with lost continuations);
  - Series Roles V2;
  - Role Memory (who you played, kept across a franchise).
- **Uses:** career/plot, continuation.js, franchise.js, the renewal path, naming.js.
- **Done when:**
  - a new film's title answers its story;
  - part two keeps part one's hero, place and twist;
  - season 4 is about the same people as season 1, or says who left and why;
  - old films and old sequels are not rewritten.
- **Tests:** the generator checkers (`tools/story-proto`) and test_plot extended to sequels and seasons, plus save-compatibility tests.
- **Ships:** each piece its own branch.

### Step 3 — The on-set minigames

- **Scope:**
  - act on the audit: keep 8, redesign 5, two to story choices, remove 1;
  - "Out of order" rebuilt from the film's own scenes;
  - Stunt Minefield (logic-solvable boards), Crack the Character, a reworked Find Your Light — replacing weak ones, not added on top;
  - the per-scene approaches, so choices stop feeling generic.
- **Uses:** scenes.js, scenework.js, SceneLogic.jsx, the story pages from Step 2.
- **Done when:** no scene is pure guessing; every remembered day can name its scene; the 8 scenes without a MOMENT line have one.
- **Tests:** solvability probes for the boards (the FrameCheck probe found 10–46% ambiguous boards), and the rules text written off the component.
- **Ships:** one mechanic per branch, each played in the browser.

### Step 4 — Relationships and professional reputation

- **Scope:**
  - the memory ledger (from rep-cover) for every on-set ask;
  - director traits read everywhere;
  - co-stars' long memory;
  - refusal reasons on every shut door;
  - insurability that recovers through recent behaviour, not a permanent count;
  - the four categories kept apart: broken obligations, creative disputes, personal feeling, public accusations;
  - Reputation Consequences for departures (The Last Woman slice).
- **Uses:** the grudges, rumour, insurability, standing rungs, people, industryWeight. No new scale.
- **Done when:**
  - one event moves Standing at most once;
  - keeping your contract never counts as unreliability;
  - every closed door says why;
  - every path has a way back through action.
- **Tests:** test_cover extended per ask; double-punishment checks; old saves.

### Step 5 — On-set events as chains

- **Scope:**
  - `shorter` (the money wants a week) and `stunt`, as chains after `cover`;
  - "Save the movie" as the answer to an existing freeze, only on shaky productions;
  - at most one crisis a film, many films none.
- **Uses:** the career-story mechanism, stability.js freeze/collapse, demands.js.
- **Done when:** a choice can come back in a month and in years; the safe-money guarantee still holds (test_stability).
- **Tests:** test_arcs (says what it does), frequency probe.

### Step 6 — Media and markets

- **Scope:**
  - **press:** a set conflict → a possible leak → the press reaction → consequences, using the existing setPieces, rumour, scandal and hype;
  - **markets:** Media Ecosystem stages 4–6 (market values, a platform's memory, appetite and world streaming lists, theatrical bankability);
  - pay cut to save a show; the world's television.
- **Uses:** press.js, trouble.js, hype.js, factions, the outcome adapter, streaming.js.
- **Done when:** the media knows only public events; a market value is learned from real credits.

### Step 7 — Posters V4

Only once stories are a permanent part of films. Start from the paused brief (`docs/handoffs/2026-10-23-posters-paused.md`): several real art languages, large faces, an embedded image library, no repeats across a filmography, franchise style kept.

## Backlog (not now)

- **From the reputation discussion:** a star's manager, charity as an action.
- **Television and the world:** TV movies; the shared universe (heirs, U1–U4); Icon for a television legend.
- **Thoughts aloud:**
  1. the A-list advisor;
  2. decisions → a unique life story / biography;
  3. a shareable career card;
  4. hard decisions and consequences — the last one is largely Steps 4–5.
- **Unsolved oddity:** the declined-film "refused" story still rolls its outcome at refusal.

## Debt to watch

- `release.js` 880 lines, `castings.js` 932 (near 1000), `awards.js` 841.
- `open` (~185 lines) and `closeRun` (~240) in release.js are past the line.
- The film-story data adds ~114 KB to game.html.
