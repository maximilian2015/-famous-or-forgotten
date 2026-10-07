# Reputation dependency audit

Read-only. Nothing in this was changed, rebalanced or implemented. 7 Oct 2026, against the tree
at `9cf1a37` + the Block 1 commits. Baseline as agreed: `s.respect` is **Standing** on screen,
Industry typecast is a separate working system, Known For is presentation derived from credits.

**The one fact that decides most of the rest:** `factions()` in `systems/meta/factions.js` is
imported by exactly one file — `src/ui/components/Passport.jsx`. No production system reads a
faction score. Changing any of the six displayed numbers today changes nothing anywhere in the
game, because nothing downstream ever asks for them.

---

## 1. The six, one at a time

### Critics — 64

1. **Formula.** `clamp(avg(rating of last 5 non-minor, non-running credits) * 0.9 + noms(last 3 years) * 4)`.
2. **Memory.** None. Fully derived, recomputed on every render.
3. **Underlying variables.** `credit.rating` (last five only), `s.awards.nominations[].year`.
4. **Who else reads those directly.** `awards.js` (nomination strength is built from the credit's
   rating and role), `knownFor.js hitWeight` (score ≥ 8.5 / 7.5 bands), `franchise.js sequelOdds`
   (rating is the fallback when there is no verdict), `franchise.js renewalOdds` (television),
   `typecast.js typecastAfterCredit` (a Drama at 78+ makes you serious), `release.js` (lastRating
   feeds the next part's demand).
5. **Double-count risk if fed back.** **High.** Feeding Critics into awards would be the rating
   deciding the nomination twice. Feeding it into prestige casting would be a third pass at the
   same five numbers.
6. **Persistent data that could carry real consequences.** `s.awards {wins, nominations, losses}`,
   per-credit `rating`, `festival` results, `asker`/`nominated` counts. All of it already exists
   and all of it is already wired.

### Audience — 81

1. **Formula.** `clamp(avg over last 5 of: smash 95 / profitable 72 / broke even 50 / bomb 22, else reviews.audience × 10)`.
2. **Memory.** None. Derived.
3. **Underlying variables.** `credit.verdict`, `credit.reviews.audience`.
4. **Who else reads those directly.** `sequelOdds` — the verdict is the **primary** term there
   (smash 58, profitable 26, anything else 0). `hitWeight`, `knownFor`, `whyOf`, `theFlops`.
   `market.js` appetite is a separate world-level signal with its own memory.
5. **Double-count risk.** **High** for sequels and box office. The verdict is already the thing
   that greenlights the next picture; a second pass through an Audience score would double it.
6. **Persistent data.** `credit.verdict`, `credit.boxOffice`, `credit.reviews`, and the market's
   genre appetite in `marketOf(s)` — which is the only thing in this group with real memory.

### Studios — 75

1. **Formula.** `clamp((50 + respect*0.4 + (fame−40)*0.3) * insurability(s) − 30 if poisonUntil − 15 if walkedOff within 36 months)`.
2. **Memory.** None of its own. Every term belongs to something else.
3. **Underlying variables.** `s.respect`, `s.fame`, `insurability(s)` (from `life/strain.js`),
   `s.poisonUntil`, `s.walkedOff[]`.
4. **Who else reads those directly.** This is the worst case in the file.
   `castingChance` multiplies by `insurability(s)`; `standing.js insuranceShut`/`prestigeShut`/
   `roomHasHeard`/`boardThinned`/`coldStart`/`comebackFloor` all come off the Fame×Standing combo;
   `s.poisonUntil` closes the studio shelf outright; `favours.js` prices every ask off respect;
   `awards.js standingFactor(respect)`; `collab.js` greenlight odds; `production.js` crew warmth;
   `economy.js` forgetting speed; `status.js pricedAt` prices you off fame and peak fame.
5. **Double-count risk.** **Very high.** Every single term is already a lever somewhere else.
   There is no part of "Studios" that is not already driving the game under its own name.
6. **Persistent data.** `s.poisonUntil`, `s.walkedOff[]` (timestamps, 36-month window),
   `s.strain`/insurability, `s.respect`, contract options and obligations in `s.offers`/franchise.

### Press — 42

1. **Formula.** `clamp(50 − scandal*0.6 + (hype*0.3 if the hype is not scandal) − 20 if it is + 8 if you employ a publicist)`.
2. **Memory.** None of its own.
3. **Underlying variables.** `s.scandal`, `hype(s)`, `hypeSource(s)`, `s.staff.publicist`.
4. **Who else reads those directly.** `castingChance` subtracts `scandal * 0.3`; `typecastScandal`
   builds the scandal label; `regard.js` revises every person's opinion of you on a scandal;
   `demandFor` takes `buzz = hype` unless the source is scandal; `status.js hypePrice` adds up to
   a quarter to the quote; `press.js` runs its own monthly cycle with real state.
5. **Double-count risk.** **High**, and partly circular: hype already sets the ticket demand and
   the quote.
6. **Persistent data.** `s.scandal`, the hype state in `meta/hype.js`, `s.rumour {until}`,
   `s.staff.publicist`, `p._press` per production.

### Directors — 4

1. **Formula.** `clamp(50 + ((warm − cold) / max(1, directors)) * 45 − grudges*12 − 20 if a rumour is live)`,
   where warm = a director in `s.people` with `relationship ≥ 50` and not cold, cold = `p.cold`.
2. **Memory.** **Yes — and this is the only one of the six with any.** It reads two real stores:
   `s.people` (per-person `relationship`, `cold`, `fromSet`, `lastSeen`, `role`, `id`, `worldId`)
   and `s.grudges[]` (`who`, `title`, `scale`, `since`, `due`, `until`, `hit`, `gross`, `opened`).
3. **Underlying variables.** The two above, plus `s.rumour.until`.
4. **Who else reads those directly.** A great deal, and all of it on the individual, not the score:
   - `offers.js:40` — one agent offer in four comes from a director already in your phone
     (`!cold && relationship > 15`).
   - `tentpoles.js:53` — one board entry in four is a director you know
     (`!cold && relationship > 35 && !holdsAGrudge`).
   - `production.js:63` — one shoot in three is directed by somebody you know, and the crew bond
     **starts at their relationship**, warm or cold (`!cold && relationship > 15 && fromSet && !holdsAGrudge`).
   - `production.js:99` — at wrap, the shoot overwrites the relationship with the bond you ended on.
   - `production.js:226` — walking off a set makes that director cold and files a 60-month grudge.
   - `stories.js noteRefusal` — saying no to a lead from a named director files a grudge (24 months,
     60 if the film turns out to be a hit) and makes them cold.
   - `stories.js:231` — one story lets you write to them: charisma 55 clears the grudge and warms them.
   - `collab.js:55/131` — cold or holding a grudge means they will not take your call at all, and a
     cold partner costs 30 points off a project's chance of ever being made.
   - `price.js closeOnes/driftTick` — relationships decay with fame if you never ring.
   - `access.js knowsPowerBroker` — `industryWeight ≥ 80 && relationship ≥ 60` opens a door.
5. **Double-count risk.** **Low.** The consequences are already attached to named people. A score
   on top would be the only generic modifier in the set.
6. **Persistent data.** All of the above, plus `s._collabAsked[id]`, `s.collabs[]`, `s._seen[id]`.

### Fans — 99

1. **Formula.** `clamp(35 + fame*0.4 + 20 if a smash or 85+ in the last 3 years + 10 if the hype source is a hit − 25 if "furious" − 20 if forgotten)`.
2. **Memory.** **None, and worse than none:** "furious" is a **regex over the last 60 timeline
   entries** looking for the literal string `Fans are furious`.
3. **Underlying variables.** `s.fame`, `s.peakFame`, recent `credit.verdict`/`rating`, `hypeSource`,
   timeline text.
4. **Who else reads those directly.** Fame is read by reach, the quote, demand, the agent, world
   rank — everything. The timeline string is read by nothing else.
5. **Double-count risk.** Moderate for the fame term; the rest is not wired at all.
6. **Persistent data that could support real consequences.** **There is none.** No fan count, no
   fandom state, no per-franchise following, nothing. It would have to be built from scratch.

---

## 2. The connected systems — what reads what

**Standing (`s.respect`)** — read in 25 files. The ones that matter: `engine/combo.js` turns
Fame × Standing into 11 archetypes, and `standing.js` turns those into `reachFromStanding`,
`prestigeShut`, `insuranceShut`, `roomHasHeard` (×0.85 on the casting roll), `boardThinned`,
`coldStart` (a colder crew), `comebackFloor`. Plus `favours.js` (cost and odds of every ask),
`awards.js standingFactor` (0.75 → 1.25 on every nomination and win), `collab.js` (whether a
project ever gets made), `production.js`, `economy.js` (how fast you are forgotten).
**It is not in the quote.** Money is priced off fame alone.

**Fame** — `reach(s) = fame + askerStanding + reachFromStanding + hypeReach + socialReach + heirReach`,
which gates the whole board; `pricedAt(fame, peakFame)` picks the quote band; `demandCore` takes it
as half the cast term; the agent arrives on it; world rank is `heatOf`, not fame.

**Industry typecast** — `typeFit`/`typeFactor` multiply the casting roll; `fieldFactor` shapes what
the board even offers; `refusedOnType` is how you get out of a box; `castingExpectation` feeds
**anticipation** into box-office demand. Real, wired, and nothing to do with the factions.

**Known For** — presentation only. Reads the filmography, writes nothing, is read by two screens.

**Casting board generation** (`refreshCastingPool`) — minFame gates, shelf locks from the combo,
`fieldFactor` from genre labels, `boardThinned` when forgotten, world directors and co-stars.

**Casting odds** (`castingChance`) — skill, charisma, looks, luck, scandal, `facePenalty`, `ageFit`,
`insurability`, depression, the reach gap, `roomHasHeard`, `rumourFactor`, `fieldFactor`,
`typeFactor`, `storyCastFactor`. **No faction. No director relationship. No standing except
through the combo.**

**Salary / quote** — `quoteBand(fameTier(pricedAt(s)), medium) × hypePrice(s)`, clamped by
`quoteCeiling`. Fame, peak fame and hype. Nothing else.

**Contracts / negotiation** — `standoff.js` writes respect (±1 to −3 per move) and files grudges
when a standoff ends badly; `contract.js` reads sets, exclusivity and options. Reads no faction.

**Sequel odds** — `sequelOdds(rating, part, obliged, verdict, scale, genre, potential)`. The film's
own numbers, and nothing at all about who you are.

**Director relationships / repeat collaboration** — see Directors above. The one wired case.

**Box-office demand** — `demandCore({scale, genre, cast:[your fame, co-star fame], appetite,
campaignTier, part, lastRating, appealMod, buzz: hype, anticipation: castingExpectation, tour, remind})`.

**Awards** — strength from the credit's rating and role, `standingFactor(respect)`,
`campaignFactor`, `overdueFactor(losses)`, `enoughFactor(askers)`.

---

## 3. The example, answered

Fame 85 · Standing 29 · Critics 64 · Audience 81 · Studios 75 · Press 42 · Directors 4 · Fans 99.

First, literally: **if you edited any of those six numbers, nothing in the game would behave
differently**, because the only consumer is a card in the Passport. So the question has to be read
as "what if the underlying state were different", and then:

**Directors 80 instead of 4** — the state behind 4 is: most directors in `s.people` are cold, and/or
there are live grudges. At 80 instead:
- roughly one agent offer in four would arrive from a director you know, by name, instead of none;
- roughly one tentpole board entry in four would have your director attached;
- roughly one shoot in three would be directed by somebody you know, **starting at their
  relationship instead of a stranger's `rint(30,55)`** — which feeds the meter, the wrap rating,
  and therefore the money and the awards;
- `canPropose` would be open instead of "not taking your calls", and a project with a warm partner
  is 30 points likelier to ever get made;
- the director stories would fire instead of being skipped for want of a non-cold director.
This is the one faction where the answer is substantial.

**Studios 20 instead of 75** — holding fame and standing fixed, the only ways down are
`insurability` collapsing, `poisonUntil` being live, or a walk-off in the last three years. All
three already bite, hard and by name: insurability multiplies the casting roll directly, poison
closes the studio shelf, the walk-off cost 9 points of standing when it happened. So the *number*
changes nothing and the *state* changes everything — and it already does.

**Fans 20 instead of 99** — holding fame fixed, the difference is a recent smash, the hype source,
or the "furious" string. The smash and the hype are already priced into demand and the quote.
The furious flag is read by **nothing**. So: **almost nothing.** This is the faction with the
largest gap between what the bar implies and what exists.

**Press** — almost nothing on its own; every term is already wired under its own name.
**Critics** and **Audience** — nothing on their own; both are summaries of credit fields that are
already the primary inputs to awards and sequels.

---

## 4. Directors as the first pilot

The architecture you described —
`specific relationships/events → concrete gameplay consequences → faction score summarises` —
**is already the architecture for Directors.** It is not a thing to build; it is a thing to finish
and to show. Of the six items you listed:

| | state | wired to consequences |
|---|---|---|
| refusal memory | `s.grudges` via `noteRefusal` | yes — crew, tentpoles, collab |
| previous collaborations | `p.fromSet`, `p.relationship` | yes — but there is **no count** of films made together |
| conflicts | walk-off, standoff, press cold | yes |
| warmth / relationship | `p.relationship`, `driftTick` decay | yes |
| blacklist / will-not-call | `p.cold` + `holdsAGrudge(until)` | yes |
| recommendations | — | **does not exist** |

What is actually missing is three things, and none of them is a modifier:

1. **A count of what you have made together.** A second film with the same director should not look
   like a first. The data to derive it exists (`credit.director`, `p.name`), nothing computes it.
2. **Recommendations.** `access.js knowsPowerBroker` is the nearest thing and it is about doors, not
   about one director telling another. This is the one genuinely new mechanic.
3. **Visibility.** The player cannot see, in one place, which directors are warm, which are cold,
   who is holding a grudge and why, or that a grudge expires. The Directors bar says "4" and gives
   one sentence. Everything above happens silently.

So the pilot, if you want it, is: derive the collaboration count, add recommendations, and build the
screen that shows the list of names with their state and their history. The bar then honestly
summarises a thing that is already true. **Not implemented. Not started.**

---

## 5. Wave 1, recounted from scratch

`src/App.jsx` — **3468 lines, 86 top-level declarations.** The old "44" is not a number from this
tree. Spans run from each declaration to the next, so line counts are within a line or two.

| class | pieces | lines |
|---|---|---|
| pure render / UI | 32 | 771 |
| dispatch, no local state | 24 | 1145 |
| local state / hooks | 16 | 1085 |
| App orchestration / router | 1 | 228 |
| helpers, no JSX | 13 | 223 |

**The thing that moves the boundary:** `dispatch` is **imported from `state/store.js`**, not passed
as a prop (`App.jsx:3`). So a component that only calls `dispatch(...)` is exactly as extractable as
a pure one — it moves to its own file and imports `dispatch`, `theme` and whatever system functions
it names. `ui/components/Passport.jsx` is already this pattern and it works.

So **Wave 1 = pure render + dispatch-only = 56 pieces, 1916 lines, 55% of the file**, with no
context, no prop drilling and no change to the store.

A sensible first cut inside that, biggest first and all self-contained:
`CreditsList(151)`, `RoomModal(99)`, `MentalScreen(98)`, `FameScreen(89)`, `RespectScreen(85)`,
`RoomScreen(80)`, `GenreScreen(67)`, `DepressionCard(65)`, `StandingCard(59)`, `ProductionCard(53)`,
`FaceTab(50)`, `HomeTab(48)`, `StoryRoom(46)`, `EndOfLifeScreen(42)`, `DrinkButton(40)`,
`CampaignCard(40)`, `Heirs(38)`, `TrainingScreen(38)`, `EndorsementCard(37)`, `UltimatumModal(36)`,
`AskerShelf(35)`, `BubbleCard(35)`, `OnSetNow(32)`, `Tube(30)`, `LifeCard(30)` — 25 pieces,
~1374 lines, which is 40% of App.jsx on its own.

Left for Wave 2/3: the 16 hook-holding pieces (`PersonSheet 129`, `CreditRow 159`, `SceneModal 100`,
`CheckpointModal 92`, `EventsScreen 89`, `SettingsRow 81`, `CreatorScreen 80`, `Ladder 66`,
`HealthScreen 65`, `PeopleScreen 63`, `PartySection 42`, `TitleLine 28`, `OtherWork 28`,
`StyleScreen 26`, `CareerScreen 20`, `ScreenToast 17`) and `App` itself.

Note on the tooling: `node tests/run_all.mjs` does not parse `.jsx`. Only `node build-singlefile.mjs`
will catch a mistake in any of this, and `tests/test_screens.mjs` (27 screens) is the only thing that
would notice a screen going blank. Both should run after every extraction, not at the end.

---

## Backlog noted, not acted on

- **Social support is worth nothing at the top of the ladder.** `standingOf` gives "somebody close
  to you" 22 of 100, but the checkpoint odds clamp at 94 and meds + therapy + rest already come to
  78. Measured: 63% clean with somebody, 62% with nobody. The fourth part of the ladder only matters
  to a player who is not managing the first three — and even at 60 it does not reach the scar.
- **Genre mastery saturates for the maximiser.** 133 credits over 32 years puts every lane at +10,
  because XP caps at 20, gains 1–3 a credit and never fades. Normal and deliberate careers are fine
  (gap of 4 and 6 points). Open question, not a bug.
