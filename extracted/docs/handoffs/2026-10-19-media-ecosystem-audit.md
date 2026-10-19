# Media Ecosystem — step 0: audit and design

19 Oct 2026, branch `media-ecosystem-audit`. Audit and design only: no game code changed.
Agreed with Maxi: Budget V2 merged first (main `11ecdd7`), Media Ecosystem moves ahead of
Relationships 2.0, the 39% → 32% career-billion question waits until after it.

The goal is three markets — theatrical, television, streaming — that behave differently, and an
actor whose worth differs between them. Not the word "streaming" added to the same formulas.

---

## 1. What exists today

### 1.1 Five fields describe a project, and four of them mix concepts

| field | what it holds | what it mixes |
|---|---|---|
| `type` | a string: 'Soap Opera', 'Network Drama', 'Drama Series', 'Crime Series', 'Prestige Series', 'Feature Film', 'Indie Film', 'Blockbuster', 'Studio Blockbuster', 'Short Film', 'Horror Movie', 'Festival Film', 'Prestige Drama' (a **film**), and the day jobs ('Brand Campaign', 'Commercial', 'Theatre Run'…) | format + flavour + sometimes size. Read as a key by `SLOT_NORM`, `SEASON_CAP`, `TV_PACE` (franchise.js, copied into bubble.js), the poster format, the singer filter (store.js) and a brand regex (castings.js) |
| `scale` | film: small, festival, indie, feature, blockbuster · TV: episode, recurring, prestige · day jobs: oneoff | **size and medium**. The medium is derived from the scale, three different ways (below) |
| `medium` | **not the medium**: the pay market, a key into `status.js QUOTE` — tv_daytime, tv_network, tv_prestige, film_indie, film_studio, film_tentpole, ad, gig | medium + size + daypart |
| `tier` | the size of your part: supporting, lead — and 'tentpole', which also means "the lead of a blockbuster" | part + project |
| `episodes` / `perEpisode` / `season` | TV terms | used as a TV test (franchise.js `mediumOf`) |

Clean since Budget V2: `budget` and `needs` (production requirements), carried at every boundary.

Three tests for "is this television", all on the scale, and they disagree:
- `release.js isFilm(scale)` — small, indie, festival, feature, blockbuster;
- `awards.js isTelevision(scale)` — prestige, recurring, episode;
- `awards.js isTVScale(scale)` — recurring, episode, **oneoff** (an advert counts as television here; prestige does not).

### 1.2 Seven doors a project comes through

1. **The casting board** (castings.js `POOLS`): four shelves — tv, film, indie, day. Each row
   carries type, scale, pay key, min fame, share. **The only door to television.**
2. **Agent offers** (offers.js `generateOffer`): film only. Scale from `scaleForOffer`, pay key
   from scale + part, type from scale.
3. **The tentpole board** (tentpoles.js): blockbusters.
4. **Continuations** (franchise.js `maybeContinue`): sequels (same scale) and TV seasons
   (`renewalOdds`).
5. **The bubble** (bubble.js): a cancelled show is taken by "a streamer", "a service with a
   library to fill", "the channel it should have been on" or "a co-production abroad" — a shorter
   order and less money. Mechanically it stays network television; only the buyer's name changes.
6. One-offs: the room offer (offers.js `roomOffer`), the festival studio call (release.js
   `studioCall`), collaborations (collab.js), late-career jobs (decline.js — resolved outside
   release.js; "it went out on a streamer in March" is flavour text).
7. The singer pools — closed (store.js turns singers into actors). **Dormant leak:** 'Stadium
   Tour' has scale blockbuster and 'Concert Film' feature, so if the road reopens they pass
   `isFilm`, get a film budget and take a box office.

### 1.3 The chain, and where data is lost

```
casting listing ─┐
agent offer ─────┤
tentpole board ──┼─► OFFER  {type, scale, medium(pay), tier, genre, budget, needs,
continuation ────┤          episodes, episodeFee, season, part, contract terms…}
bubble rescue ───┘     │
                       ▼   contract.js / negotiate.js  (pay key re-derived if missing)
                  startProduction ─► SET  p   ← fields copied one by one; medium is NOT copied
                       │
                       ▼   wrap (production.js)
                  CREDIT (draft)  {title, role, type, genre, rating, status, exceptional…}
                       │
                       ▼   scheduleRelease
                  RELEASE rel  ← p + credit copied one by one
                     └─ rel.job  ← the next season / part is built from THIS and nothing else
                       │
                       ▼   releaseTick (opening night)
         festival? ─► prize / sold / unsold
         film ─────► boxOfficeFor (demand → opening → legs → expansion)
         TV ───────► viewersFor → holdFactor (open → end viewers)
                  CREDIT rebuilt from rel, field by field;  credit._rel = another hand-picked copy
                       │
                       ▼   runTick → closeRun
         verdictOf · fame / hype / Standing · typecast · genre market (films only)
         maybeContinue(job) ─► next offer  │  on the bubble ─► bubble.js ─► rescue offer
```

Every new field has to be added by hand in four to six places. release.js says so itself:
*"a field that stops here is a field that does not exist"*. This is the main migration risk,
and the reason for one carried `project` object (§2).

### 1.4 Television today — good, and the base to build on

- `viewersFor`: the slot's audience by type (`SLOT_NORM`) × the rating × your name; a returning
  show **inherits** last season's finishing audience and moves from it.
- `holdFactor` (chapter.js): opening → finale audience — retention already exists.
- `verdictOf` for TV: watched / seen / ignored, the audience against the slot.
- `renewalOdds` (franchise.js): the audience against the slot, the trend against last season,
  fatigue, a format's season cap; prestige partly on the reviews.
- bubble.js: on the bubble → a fan campaign → the network decides → other buyers.
- Contract TV terms: options, exit, points, producing, guarantee, billing (contract.js, terms.js).
- Pay per episode by format, bulk discount for longer orders (status.js `episodeRate`).
- 'Prestige Series' is renewed by a network but written as streaming ("prestige streaming shows
  are written to end", franchise.js).

### 1.5 Theatrical today

Budget V2 and the genre pass (`2026-10-18-budget-v2.md`). The only alternative to a wide release
is the festival: prize, sold or unsold, then a platform run or nothing.

### 1.6 Streaming today

Not a system. Only words: bubble.js buyers, decline.js lines, a comment in market.js.

### 1.7 Fame, Hype and Standing by medium

- **One fame for every market.** Pay = a `QUOTE` band picked by `fameTier(pricedAt(s))` — the same
  number read through eight tables.
- Opening night: fame by the part's size. Close of the run: fame by part + rating + verdict
  (smash/profitable/World Hit). TV verdicts give **no** fame bonus but give hype (watched, renewed).
- The only per-market memory is the typecast label **'tv'** ("the studios think of you as
  television": `typeFit` −w for feature and blockbuster), with 'commercial' and 'serious' beside it.

### 1.8 Where the code assumes a film means a cinema

- **The genre market** (market.js) is fed by films only. Television has no genre appetite.
- **The world** (world.js) makes films only; world actors' credits are films; the yearbook is
  `isFilm`; awards' world field is built from those.
- **Verdict strings**: 20+ call sites switch on 'smash' / 'profitable' / 'broke even' / 'bomb'
  (franchise sequel pricing, knownFor, press, factions, critics, aftermath, night, favours,
  Filmography, App) and on 'watched' / 'seen' / 'ignored' (App, needs, knownFor, release).
- **`boxOffice` readers**: App, billion, ambition, knownFor, press, world, yearbook, Filmography.
- The opening credit's provisional verdict is 'in cinemas' for every medium (internal; the UI
  hides verdicts while a credit is running).
- `SCREENS` and `CROWD_SCALE` carry a 'prestige' (TV) key: dead in SCREENS; in CROWD_SCALE it
  lowers a prestige series' audience score by six.
- bubble.js copies `SLOT_NORM`, `SEASON_CAP` and `TV_PACE` from franchise.js on purpose (import
  cycle): every new format edits both.

### 1.9 A bug found on the way (not fixed here — small, its own commit)

The pay key is dropped at `startProduction`. On renewal franchise.js `mediumOf` re-derives it and
knows no daytime; contract.js's fallback does the same; a bubble rescue copies `p.medium` from a
job that never had one. So **a daytime soap's season two is priced as network television**: its fee
can climb past daytime's ceiling, and "nobody offers an A-lister a soap" (`tv_daytime.alist: null`)
is skipped on renewal.

---

## 2. Proposed data model

```
project = {
  id, seriesId                                               one identity for its whole life (see stage 1)
  medium:   'theatrical' | 'television' | 'streaming' | 'other'   where the audience meets it ('other': ads, stage, voice)
  format:   'movie' | 'series' | 'limited_series' | 'soap'        what it is
  scale:    movies: small | festival | indie | feature | blockbuster   (names kept: calibrated, saved)
  style:    'standard' | 'prestige'                          NOT a medium: prestige exists on television AND streaming,
                                                             and for films ('Prestige Drama')
  outlet:   television: daytime | network · streaming: the platform's tier (later)
  distribution: movies: wide | festival | streaming_original (a theatrical window later) · series: broadcast | platform
  awardsTrack: 'film' | 'television' | 'festival'            its own field — never derived from the medium alone
  route:    how it reached you (§2b)
  genre, needs, budget                                       (as now)
  payMarket: today's `medium` value (tv_daytime … gig)       (renamed — decision 1)
}
the part stays on the offer/credit: role, tier, share — and for television the part is NOT the size of
the show: today's scale 'episode' means a guest part in a network series, not a small series.
```

Examples: Theatrical + movie · Streaming + movie · Streaming + limited · Television + series ·
Television + soap. Medium and format are never one field.

**Carried as one object.** `project` goes on the offer, the set, the release, the job and the
credit, copied whole at every boundary — so a field added to it later survives without six edits.
Old objects get one lazily, built from type/scale/medium/episodes (`projectOf(x)`, the
`marketOf(s)` pattern). One function answers "which medium", replacing the three scale tests.

---

## 2b. How the player finds work — routes into each market

A market is not enough; the player has to physically reach it. Today the doors are unequal: television
comes only through the casting board, the agent brings only films (§1.2). Every project records the
route it came by, reusing the offer's existing `via` field:

| route | today's `via` | where the player meets it |
|---|---|---|
| `open_call` — you search and self-submit | casting | OpenCall |
| `agent_submission` — your agent brings or submits | agent | AAA (the agency's board) + Messages |
| `direct_offer` — a studio, network, platform or showrunner approaches | studio, festival, brand | Email |
| `relationship_offer` — a director, producer or co-star | director, partner, letter | People |
| `continuation` — next season, sequel, a rescued show | rescue, franchise renewals | Messages |
| `self_created` — later | pitch | NightRoom pitch |

- **OpenCall** becomes the central self-service market with tabs: For you · Film · TV · Streaming ·
  Commercial; listings marked Open submission / Self-tape · Agent only · Invite only.
- **The agent brings work from the markets where you have value** — not films only. Later, career
  direction: "push me for films / I want prestige TV / get me into streaming / I need work".
- **The route changes with the career, the markets do not disappear**: early mostly OpenCall; rising
  a mix with the agent; a star mostly agent and direct offers; A-list mostly direct, agent and
  relationship offers — with OpenCall still open for a deliberate small or prestige choice (a layer of
  "projects looking for names", not "Waiter #2").
- **Television stays a high-level path** (premium series, limited, event miniseries); a daytime soap
  or a guest episode fades for an A-lister. **Streaming has its own ladder**: recurring role → platform
  series → limited series and original movies → event projects built around you.
- **Access = market value + Fame/Standing + route.** Streaming value 20: open streaming castings;
  50: the agent can submit you for good parts; 75: platforms call; 90: projects are built around you.
- No new phone apps: OpenCall for searching, AAA/agency for private submissions, Email for direct
  offers, People for relationships.

---

## 3. Three markets

**Theatrical** (exists): opening, reach, word of mouth / legs, worldwide gross, studio economics.
Outcome words: BOMB → LOSS → BROKE EVEN → PROFITABLE → SMASH (the next economic pass; theatrical
language only).

**Television** (exists): audience against the slot, retention (open → finale), renewal and
cancellation, the bubble, longevity in seasons. Outcome words: **Cancelled / Stable / Hit /
Phenomenon**, from the audience against the slot and the renewal.

**Streaming** (new). Not box office converted into views:
- **Opening audience** — views in the first 28 days: your streaming value × the platform's reach ×
  the appetite for the genre on streaming × how hard the platform features it (decided at
  greenlight, like `campaignTier`).
- **Completion** — the share who finish: quality, how the crowd took it, and length (a limited
  series is finished more often than a fifth season).
- **Total reach** — the opening plus a tail driven by completion and talk.
- **Longevity** — how long it keeps being watched; library value.
- **Outcome words:** **Miss / Solid / Hit / Breakout**, against the platform's expectation for
  that slot (the `SLOT_NORM` idea).
- **Series renewal** on completion and reach against cost; low season caps; cancellation after one
  or two seasons is normal.
- **Money**: an upfront fee, larger than television's, little backend; no box office; the studio's
  economics stay off screen.

Each market has its own genre appetite, in market.js's "judged against its own kind" shape
(the market already runs two tracks).

---

## 4. Market values — what the fame is worth where

```
s.value = { theatrical, tv, streaming }    0–100, lazily made
```
- Fame stays public recognition; Hype stays this month's talk. The values say whether that fame
  **sells you** in each market: "Fame 80 · Theatrical 41 · TV 86 · Streaming 63".
- Seeded from fame, the filmography by medium and the 'tv' label.
- Moved mostly by outcomes in their own medium (a theatrical smash raises theatrical a lot and
  streaming a little; a streaming breakout raises streaming a lot and theatrical only slightly; a
  television phenomenon raises TV and, through the 'tv' label, can cost theatrical).
- Drift back towards a fame-anchored baseline over years, like the typecast fade.
- Read, in this order: (a) **pay** — the `QUOTE` band picked by that market's value, not fame;
  (b) **access** — which listings and offers reach you; (c) last, **theatrical demand** — the cast
  draw reads bankability instead of raw fame. (c) moves the box office and is measured against the
  Budget V2 baselines.
- Shown on the Passport as three bars with words, not raw numbers.

### 4b. Fame is not movie-star status (Maxi, 19 Oct)

A player can become very famous through a soap, network television or streaming and stay weak
theatrically — "Fame 82 · TV 91 · Streaming 74 · Theatrical 38" is a normal career: a huge television
star a studio will not yet trust with a €200m picture. TV stars are not banned from becoming movie
stars; the move is possible and **earned**. Cross-market transfer is asymmetric:

| success in | moves theatrical value |
|---|---|
| daytime / soap | a little |
| network television | modestly |
| prestige television | more |
| a global streaming breakout | more strongly |
| **theatrical** success | moves television and streaming access **substantially** |

- **A new blockbuster lead depends primarily on theatrical bankability**, not on fame. The way in is
  the real one: a supporting part in a big film → a theatrical release that works → bankability grows →
  the lead in a medium feature → a tentpole lead.
- A theatrical A-lister can go to prestige television or streaming without losing movie status.
- **Continuations follow their own rules**: a soap star who became famous on the show stays on it.
  New A-list-level actors rarely get a fresh daytime-soap offer (already true: the soap listing stops at
  fame 74, and daytime has no band for an A-lister).
- Careers this must make possible, and the probe should find: soap legend · network TV star · prestige
  TV actor · streaming phenomenon · theatrical movie star · crossover superstar.

**What it replaces today** (`career/access.js`, `offers.js`, `castings.js`): the tentpole board (AAA)
opens on `hasHit` — any credit rated 85+ or with a "Hit" status, which a soap season or an advert can
be — or on a powerful contact; the agent then offers tentpole leads at fame 60 (`generateOffer`), and the
board lists 'Studio Blockbuster · Lead' from fame 70. In stage 4 these read theatrical bankability.

---

## 5. One outcome interface for the rest of the career

```
projectOutcome(credit) → { medium, label, grade, reach, money?, renewed? }
  grade: −2 flop · −1 under · 0 par · +1 good · +2 great · +3 phenomenon
```
Fame, Standing, Hype, typecast, Known For, awards, sequels and renewals read `grade` and `reach`;
each medium keeps its own `label`. **The grade is an adapter, never a replacement**: every project
keeps its native result beside it — theatrical gross, profit and verdict; television viewers,
retention, renewal and outcome; streaming opening views, completion, total reach and outcome. Old credits keep their verdict strings and an adapter maps them
(bomb −2, broke even 0, profitable +1, smash +2, World Hit +3; ignored −1, seen 0, watched +1).
The 20+ string switches move behind the adapter one at a time.

---

## 6. What we reuse

- **Television**: everything in §1.4.
- **bubble.js buyers** → the streamer becomes a real streaming medium for a rescued show.
- **The festival** → a third ending: a streamer buys it (a streaming original).
- **market.js** (judged against its own kind, two tracks) → an appetite per medium.
- **Typecast labels** ('tv', 'commercial', 'serious') → seeds of the market values.
- **`QUOTE` bands** → pay by market value.
- **awards.js `branchOf`** → becomes `awardsTrack` (film / television / festival): streaming series
  join the television track, streaming movies the film or festival track.
- **Posters** (film/series/soap/ad/festival formats) → a streaming mark.
- **Budget V2** → streaming budgets; theatrical untouched.

---

## 7. Migration risks

1. **Hand-copied boundaries** (§1.3) — the largest. Mitigation: the one `project` object and a
   boundary test (like the transition audit) that a project field survives offer → credit →
   next season → rescue.
2. **The name `medium` is taken** by the pay key on saved offers and listings.
3. **Verdict strings** — adapter first, then migrate.
4. **Old saves**: credits without a project (`projectOf`), offers and listings in flight, running
   releases and bubbles — each must finish exactly as before.
5. **Duplicated tables** (bubble.js / franchise.js).
6. **Balance**: values read by theatrical demand move the box office — last, and measured.
7. **The world** has no television or streaming: the yearbook and the awards field only know its films.

---

## 8. Staged V1 plan — each step its own branch, measured, reported before merge

Order as decided (Maxi, 19 Oct): market values come AFTER streaming exists, so a streaming value is
learned from real streaming credits instead of being invented.

1. **Project foundation, no behaviour change** (the soap pay bug is the one intended fix). One
   persistent project identity through offer → contract → production → release → credit → next
   season; `medium` → `payMarket`. Plan and save compatibility: `2026-10-19-media-ecosystem-stage1-plan.md`.
2. **The outcome adapter.** `projectOutcome`; fame, hype and Known For read it; no number moves.
3. **Streaming series**, on the television machinery that already has audience, retention, renewal
   and the bubble — with streaming's own audience model (28-day views, completion, reach, long tail)
   and outcome words; the bubble's streamer becomes a real streaming medium. **Then streaming
   movies**: a festival sold to a streamer, and streaming originals.
4. **Market values**, learned from real credits in each market; read by pay and access; shown as
   words and bars. The routes of §2b.
5. **Per-medium appetite**, world streaming releases for the lists, the awards tracks.
6. **Theatrical bankability read by demand**, re-measured against the Budget V2 baselines; the
   Billion Club question reopens here.

The theatrical verdict names (BOMB → LOSS → …) slot in after step 2, on the adapter.

---

## Decisions (Maxi, 19 Oct 2026)

1. **Yes** — today's `medium` (the pay key) becomes `payMarket`; `medium` means theatrical /
   television / streaming. (`payMarket` may later be derived from medium + format + scale + style.)
2. **No** — prestige is not a medium. It is a `style` of a project, possible on television and on
   streaming (and for films). The rule "prestige series ⇒ streaming" is forbidden.
3. **Yes** — streaming series before streaming movies, reusing the TV machinery where it fits, with
   streaming's own audience and outcome model.
4. **Partly** — streaming series and limited series may share the television awards track; streaming
   movies take the film or festival eligibility path. `awardsTrack` is its own field
   (film / television / festival), never `if streaming => television`.
5. **Yes** — market values numeric inside, words and bars on screen.
- The common grade (−2…+3) is an adapter for cross-market systems only (§5).
- Order: foundation → outcome adapter → streaming series → market values → markets/awards →
  theatrical bankability (§8).
- Before coding stage 1: the work-discovery layer (§2b) and the stage 1 migration plan.
