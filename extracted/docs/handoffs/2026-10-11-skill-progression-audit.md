# Skill progression (Acting) — audit, 11 Oct 2026

Read-only. No code changed. Asked after the Confidence/Discipline audit found that training's
"halving past 70" can never run. The question: what really raises Acting, where are the ceilings,
what happens after 40, and what else is dead.

(Singing follows the same code through `s.dream === 'singer'`; the singer road is kept only for
old saves, so everything below says Acting.)

## The two ceilings

- **Lessons stop at 40** — `career/actions.js` `LESSON_CAP = 40`, deliberate and commented ("Past
  forty it is sets, and sets take you to what you were born with"). Training refuses at 40 or
  above, before charging anything.
- **Talent** — `skillCap(s) = max(40, min(100, s.talent || 70))`, rolled once at birth
  (`life/origin.js`). Sets, scenes and readings stop at it. The player is told it in words
  (`talentHint` on the Training screen) and sees a gold line on the bar once they reach it.

## What raises it

| Source | How much | Stops at |
|---|---|---|
| Training, any of the four schools (`career/training.js`) | +1–2 … +6–9 a session, +1 with discipline above 65 | 40 (lessons) |
| Every shoot that wraps (`career/production.js` `learnOnSet`) | `(1 − skill/104) × 2.6 × length × how well the set went × (1, or 0.6 supporting)` — a lot early, little late | talent |
| A great day on set, quality 80+ (`career/scenes.js`) | +1 on a hard scene, +0.5 otherwise | talent |
| A reading in town (`life/town.js`) | +1, on about a third of readings (fewer the more charisma you have — that third goes to meeting people) | talent |
| **A stage run, offered when the career is in decline** (`career/decline.js` `laterOutcome('stage')`) | **+2–4** | **0–100 only — not the talent ceiling** |
| Teen school play (`career/actions.js`) | +2–4 when you get the part | 100 |
| Childhood moments, the ambition at ten, a birth gift (`youth.js`, `meta/ambition.js`, `origin.js`) | +1…+6 | 100 |

## What lowers it

- **Age**, once a year from 66 (`life/mortality.js` `agingTick`): −0.7 a year, −1.4 from 76,
  never below `min(58, 62% of the best you ever were)`.
- **Drink** (`life/drink.js`): every month you drink, more the further gone.

## What it looks like in a life

A scratch probe (not in the repo; 30 lives each, every event answered at random):
- **A player who trains** (lessons while under 40, coach when they can afford it): 40 by 25, then
  sets carry it up — median 55 at 40, 64 at 50, at their own ceiling by 60. 22 of 30 reached it.
- **A player who never trains** and takes half the offers: median 9 at 40, 19 at 70; none reached
  their ceiling. Small parts teach almost nothing (about 0.7 a film at the bottom), so without
  lessons the climb never starts.
- Nobody in the probe went above their ceiling — but the probe never takes a stage run (below).
- Talent ceilings rolled: 55–97 (10th–90th percentile), median ~70.

## Dead or inconsistent

1. **Training's "halving past 70" is dead.** Training refuses at 40, so a skill of 70 never
   reaches it. It survives in `training.js` `sessionGain` (moved there unchanged on 11 Oct so the
   screen and the session read one function). Likely left from before the lesson cap was lowered.
2. **The stage run ignores the talent ceiling.** It is the one route above what you were born
   with: +2–4 each time, clamped only to 100. Every other source after 40 stops at `skillCap`.
   Either it should stop there too, or it is the intended exception (theatre makes you better
   than film can) and should say so.
3. **The teen school play caps at 100, not 40**, unlike lessons. Harmless in practice (a teen is
   nowhere near 40 from it), but the same rule written two ways.

## Not dead

- The Training screen's "As good as you will get" (skill at the talent ceiling) is reachable
  after sets carry a trained actor up — 22 of 30 in the probe.
- `peakSkill` is read by the ageing floor.

## Decisions, none taken

- Remove the dead halving, or make it mean something (it would only matter if lessons went past 70).
- Stage run: cap it at talent, or keep it as the exception and say so on the offer.
- Whether a player who never trains should be stuck near zero for a whole life, or whether the
  smallest parts should teach a little more.

## Status

- 1 — the dead halving is removed (`training.js` `sessionGain`); no session changes, because no
  lesson is ever given past 40.
- 2 — the stage run now stops at the talent ceiling like every other source, and its offer only
  promises "better" to somebody with room left to grow (`decline.js`).
- 3 — left as it is, on purpose: a balance question. Next: a simulation of trained against
  untrained careers and a proposed catch-up for low Acting that does not lift mid and late careers.
