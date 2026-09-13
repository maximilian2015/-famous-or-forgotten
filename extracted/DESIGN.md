# Famous or Forgotten — design bible

*Для Макси: это документ для передачи проекта — любому человеку или ИИ. Здесь карта всех
систем, ключевые цифры и ПОЧЕМУ они такие. Правила игры для игрока лежат в самой игре:
Phone → Guide. Этот файл — про то, что под капотом.*

A BitLife-style life sim about a celebrity: born, raised, a career from open castings to
the A-list — or to being forgotten. Built as one HTML file (React + Vite → `game.html`).
The concept, approved by Maxi and not up for revision: **the career is the centre, life is
around it, and knowing the right people opens doors that fame alone does not.**

The game is meant to be **hard**: "a person should get hooked for days and try to grow
their character". Difficulty is measured, not felt — see *Baselines* below.

---

## 1. Build, run, test

```
cd extracted
node build-singlefile.mjs        # ONLY way to build: writes dist/game.html
cp dist/game.html ../game.html   # the file Maxi plays
node tests/run_all.mjs           # 37 tests, one line each — must be 37/37 before a commit
node tests/probes/probe_combo.mjs   # the three bot players, 25 careers each — balance
npm run dev                      # Vite dev server on :5173 for a live look
```

Two rules that have bitten every time they were skipped:

1. **Tests never parse `.jsx`.** A green battery does not mean the screen renders. Build,
   then open the game (a save can be injected into `localStorage['fof_react_save']`).
2. **Measure before believing.** Every number in this game was tuned against the probes.
   A plausible change to one term moved the whole ladder more than once (see §9).

---

## 2. Map

```
src/
  engine/        no imports from systems/ — ever. Cycles are the reason.
    time.js        the month: every *Tick in order. Read this first.
    economy.js     rent, food, staff, upkeep, relevance drift (being forgotten), hostOf
    combo.js       comboOf(s): which Fame × Respect combination you are in (rule only)
    stage.js       inCareer(s) — "the career half of the game is on"; NOT s.stage
    cooldown.js, rng.js, id.js (uid), text.js (an, count), timeline.js
  state/         initialState.js (every field), store.js (localStorage, dispatch)
  systems/
    career/      castings (the board), production (the set), release (opening),
                 story (day-one argument), stability (the money behind a picture),
                 awards (the Askers), franchise (sequels/seasons), offers, negotiate,
                 access (the two doors), agent, age, genres, training, actions
    life/        origin, youth, stages, family, children, dating, bonds, interactions,
                 relationships (industry contacts), work (day jobs), money (staff, things,
                 homes), health, mortality, depression, drink, strain, party, mood,
                 appearance, arcs
    meta/        status (the two ladders, single write points), standing (the matrix),
                 email, news, legacy
    social/      sms (texts from people), events, spotlight (school friends)
  phone/         the Phone apps: OpenCall, Messages, Email, Dating, Guide, AAA, Work,
                 News, Shopping, Spotlight, Arcade; registry.js lists them
  ui/            theme/skins (live `theme` object), chrome (fonts), sfx, components
                 (Poster = generated SVG film posters)
  App.jsx        every screen: Home, Career (Calendar/Training/Filmography/Events),
                 People, Style, Legacy; the ladder screens (Fame, Respect, Mental)
```

Conventions: state is a plain object mutated by systems; `dispatch(fn, ...args)` from the
UI. **Single write points**: `setFame`, `setRespect`, `setQuote` in status.js — never write
`s.fame`/`s.respect` directly (an email once clamped standing at zero because it did).
Every rule change gets a comment saying what was measured and why.

---

## 3. The month

`advanceMonth` (engine/time.js): the calendar moves, then in order — stages, economy
(rent, drift), bonds fade, children, health, work, rehab, strain, drink, **production**
(the set), release, run (box office weeks), submissions (casting answers), frozen
projects, sequels, ceremonies, events, offers, agent, standing (combo announcements),
email, sms, icon/quote ticks, money (staff), cooldowns. `productionTick` runs *after* the
month increments — a check about "last month" is `stamp - 1`.

Energy: `ap` = 3 + home bonus + staff − day job − burnout, refilled monthly. Everything a
player does costs energy or money or both.

---

## 4. Fame (status.js)

Tiers: Unknown 0 · Rising Star 15 · Known Face 35 · Star 55 · A-lister 75 · Icon 90.
Each rung opens real gates (`TIER_OPENS` is hand-kept and must match castings.js minFame,
housing ceilings, access.js).

- **Getting known is ordinary work** — anybody who works twenty years becomes a face.
  Release fame: tentpole 9 / lead 5 / supporting 2, +4 for 85+, +25 world hit, verdict
  bonuses; `headroom` compresses above 55 hard (0.577·((104−f)/49)^1.9, floor 0.03).
- **Two doors** (`ALIST_WALL = 74`, `ICON_WALL = 89`): fame stops at 74 without *a hit
  you carried (lead/tentpole, 85+) or a nomination*; at 89 without *a world hit or an
  Asker*. Points alone never get you in.
- **Being forgotten** (economy.js relevanceDrift): proportional, `fame/55` a month after
  four idle months, + scandal/45, × 0.45 if something is in post, × (1 − media/130).
  Once an Icon, fame never drops below 75.
- **Forgotten** is a state: peak ≥ 35 and fame < 15. Board thinned to 5. A comeback is a
  jump: one film rated ≥ 70 → straight to Known Face (35), once per life.

## 5. Standing / Respect (status.js)

`RESPECT_FLOOR = −40`. Tiers: Avoided −40 · Careful −15 · Unproven 0 · Reliable 30 ·
Taken seriously 40 · A name in the room 60 · Spoken of 80. Every positive rung has a
"shadow" line (what it costs), every negative rung has real mechanics.

Sources (`RESPECT_MOVES`): film ≥ 85 → +5, ≥ 70 → +2, < 45 → −4 × expected (expected =
(r+5)/45, so bad work alone bottoms out around −5); director's word at wrap ±3; arguing
the version and winning +1; conservatory +1; nomination +6, win +6 +15 Asker; walking off
−9, refusing to finish −5, walking out of an optioned sequel −6. Gains above ~30 are
scaled by `soft(112, r)`; losses are whole. **Nothing here can be bought.**

The set (production.js) is where standing is *earned by preparing* (§6). Before that fix
the director's +3 fired zero times in fifteen perfect careers.

## 6. Fame × Respect (standing.js, combo.js)

Eleven combinations, five bad, each doing something somewhere else:

| id | when | does |
|---|---|---|
| beginning | nothing decided | — |
| difficult | Avoided (< −15), fame < 55 | auditions ×0.85; crews start 12 colder |
| craft | standing ≥ 40, fame < 35 | reach +(r−40)·0.6 (cap 20); agent at standing 50 |
| working | fame 35–54, standing ≥ 30 | — |
| face | fame ≥ 55, standing < 30 | prestige shelf shut; scandal fades ×0.6 |
| liability | fame ≥ 55 and Avoided | + studio shelf shut; agent leaves; cold crews; harder room |
| star | fame ≥ 55, standing 30–59 | — |
| real | fame ≥ 55, standing ≥ 60 | forgotten ×0.8 |
| faded | Forgotten, −15..39 | board thinned, comeback 70 |
| tale | Forgotten and Avoided | comeback 80 |
| asked | Forgotten, standing ≥ 40 | board NOT thinned, comeback 60 |

The trap opens at **Avoided (−15), not zero**: opened at zero it caught every actor at
24 and put the ordinary player forty years at the floor. A combination that has held two
months is announced once (`standingTick`).

## 7. The set (production.js, story.js)

A shoot is N months. Meter starts 20; Rehearse +4..9 (1 energy), Risky take (minigame)
−12..+22, Bond with crew +6..14. Day one: four versions of the film, odds of being
listened to = 20 + standing·0.46 + fame·0.34 + director bond·0.55 + genre XP − push.

Director (crew[0]) bond starts 30–55 (−12 if Avoided; a known director starts at your
relationship). Each month you turned up (`_workedMonth`) on a set ≥ 55 warms +2..3, ≥ 80
+3..5. A month you skipped on a set < 55 cools (0, then 3–5, then 5–8). A month drunk
cools 6–10. A party during a shoot: meter −3..12, bond −4..16.

Wrap: good word (+3·room) if bond ≥ 70 **or** meter ≥ 85 with bond ≥ 40; cold word (−3)
if bond ≤ 25 *and* below where they started. Director/co-star with bond ≥ 60 become
contacts (`keepTheCrew`); a known director returns one shoot in three.

Rating = 20 + skill·0.30 + (meter−40)·0.45 − roughness(stability) − drunk·1.6 +
material·0.18 + looks + genre + rint(−16,12) + swing(stability) + version shifts; then
`bottomOut` below 28 and `topOut` above 86. **The script decides most of it** — small
films cap material at 15–30, prestige at 70–88. The weight 0.45 on the meter is
calibrated into every threshold in the game (85 hit, 70 good, 45 bad); changing it moved
the whole scale (§9).

## 8. Release, money, sequels

`scheduleRelease` at wrap → opens after post (1–12 months by scale) → `runTick` weeks of
box office → `closeRun`: score, verdict (smash ≥ 4× budget, profitable ≥ 2.2×, broke
even ≥ 1.1×, bomb), respect, quote, sequel/season decision (`maybeContinue`: money first,
reviews second; a franchise has a character — holds/slides/collapses).

Performance vs film: on a set you carried (meter ≥ 85) a bad film costs nothing and a
middling one is +1 ("the only good thing in it"). Via a lover's door: −5 at start, +6 if
≥ 75, −5 if < 55.

Options (email.js): while shooting a studio picture, an option on two sequels at the
current fee — 15% now, sequels guaranteed at that fee (normal raise 1.6×/2.2×/2.6×).

Money: rent by housing tier (HOUSING), food, gym, staff (assistant 12k … security 75k),
upkeep (car, boat, jet), agent cut 10–15% on work money. Being hosted by a rich partner:
rent 0, their tier. Insolvency: two missed rents → out.

## 9. Baselines — the contract

`node tests/probes/probe_combo.mjs`, 25 careers per player type, 45 years from 22:

| player | A-list | Icon | Askers | standing |
|---|---|---|---|---|
| perfect (prepares, rehearses everything, argues, trains) | 24–25/25 @ 40–44 | 21–24/25 @ 47–50 | 22/25 | ends 100, never below −1 |
| ordinary (sometimes) | 18–22/25 @ 43–45 | 1–3/25 | 1–2/25 | lowest −15, ends +5..+19; face ~50%, liability in ~11/25 lives and climbs out |
| drifting (presses the button) | 0/25 | 0/25 | 0/25 | −40, liability 60% |

If a change moves these, it is a balance change and needs a reason in the commit.
Known sensitivities, all measured: the meter weight (0.45) — 0.25 broke test_stability
/test_awards/test_story; the Avoided threshold — at 0 the ordinary player spiralled; the
comeback floor; `expected` on bad films — flat −4 dug a 21-year hole for the perfect
player; the agent does *not* move the ladder (measured with bots signing the letter).

## 10. Life

- **Dating** (dating.js): prospects have `wants` (quiet/thelife/family/ambitious — decides
  which evenings land and when they leave), `means` (broke/ordinary/money/serious — who
  pays, gifts, rent, hosting), 1 in 40 `connected` (industryWeight 80+: a power broker;
  the room → a Blockbuster lead offer at any fame, with the standing cost above). Evenings
  go through `applyBond`; the anniversary is on the calendar (+6 remembered / −9 forgot).
- **Bonds** (bonds.js): closeness −100..100, fades by relation type, repeat attention in a
  month is worth less, blood has floors (a mother never goes to zero from silence),
  contacts go `cold` at ≤ 0 after 10 months and are never deleted.
- **Texts** (sms.js): every text is triggered by state — a film closed, a contact went
  cold, the partner asks, a parent saw the papers, a nomination, a wrap, Sunday lunch,
  the anniversary, a rich partner's gift/rent/move-in, the room. ~12/yr social + events.
- **Email** (email.js): landlord (only when a payment bounced), invitations (sofa,
  carpet, the room) with cooling, the agent's letter, the option, fan/hate mail, spam.
- **Agent** (agent.js): asks at fame 40 (or standing 50 for the craft); four desks; cut
  10–15%; brings offers (0.14/mo vs 0.06), reaches further at the table; leaves the
  liability.
- **Health/drink/depression/strain** (life/): illness, treatment, burnouts (insurability
  falls), drinking (cools sets, drives people away), depression (energy slots lost),
  strain from stacking shoots.
- **Parties/events** (party.js, events.js): exist and work (meet people, bond, scandal,
  the morning after on set) — **Maxi wants to redesign these as a system and discuss it
  first.** Do not rework without him.

## 11. Deliberately hard — not bugs

- The first fifteen films of any career are bad (craft starts at 18). Standing sits near
  zero for years; that is why the trap is at −15.
- Icon needs something enormous, not volume. A-list needs a hit *you carried*.
- Forgotten is the other half of the title. Comebacks are a jump, once.
- The ordinary player spends decades below zero standing if they never rehearse. The exit
  (rehearse, turn up, Bond) is on the home screen.
- A part through a lover costs standing before it earns any.

## 12. Backlog (Maxi's list, in his order)

1. Parties and events as a system — **discuss with Maxi first**.
2. Stat tiles: Cash → statement, Looks → mirror, Health → untreated damage.
3. Audition minigames variety; written quests; a writers' room for series.
4. Save export/import.

## 13. If you change balance

Run `node tests/run_all.mjs` (37/37) and `node tests/probes/probe_combo.mjs` before and
after. Put the before/after in the commit message. If a test encodes the rule you
changed, update the test *with a comment saying why*, never delete it. Build and open the
game. Maxi's standing instruction: *"don't claim it works if you haven't actually checked."*
