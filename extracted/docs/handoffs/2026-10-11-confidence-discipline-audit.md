# Confidence and Discipline — audit, 11 Oct 2026

Read-only. No code changed. Why now: since `1170fe0` the event screen says "It comes down to your
confidence" and "Confidence ↑", and no screen in the game shows the player a confidence or a
discipline number.

## Confidence (`s.confidence`)

**Starts** at 40 (`state/initialState.js`); +6 if the origin gift is the grandfather who read to
you (`systems/life/origin.js`).

**Goes up**, and nothing takes it back down over time (no decay anywhere):
- +2 for every production that wraps (`career/production.js`), every one-day job or advert
  (`career/offers.js`), every casting-board job paid (`career/castings.js`);
- +2…+6 from childhood and life choices (`life/youth.js`, `life/arcs.js` fx; 12 choices raise it);
- +2…+5 from the teen school play and a night sneaking out (`career/actions.js`);
- +1…+3 from asking a friend's advice (`life/interactions.js`, half the time).

**Goes down** only in five choices, by 1–3 (fearing the first credit is the last, chickening out
of the talent show or failing it, a crush that says no, "you're right, I'll have a backup"), and
by 1–3 when the teen school-play audition goes badly.

**Is read** in five places, all of them a roll at `30 + confidence × 0.6` (54% at 40, 90% at 100):
- three adult events: *A problem on set* → "Call it out in front of everyone",
  *The studio* → "Fight for the part", *A brand deal* → "Negotiate creative control";
- one childhood moment: the talent show at 14;
- the teen school-play audition (`40 + confidence × 0.3 + charisma × 0.15`).

**What happens to it in a life.** A scratch probe (not in the repo; 20 and 60 careers from 20 to
60, every event answered at random) had every career at confidence 100 by age 27–36. That probe
player is hyperactive — a median of 76 films and 18 day jobs — so it is early; but the arithmetic
holds for anybody: 40 → 100 is thirty jobs at +2, so an ordinary working actor is at the ceiling
by mid-career. From then on every confidence roll is 90%, and every "Confidence ↑" on a choice
does nothing.

**Is shown** nowhere as a number. Two timeline lines say "confidence +".

## Discipline (`s.discipline`)

**Starts** at 40; +8 if the origin gift is the grandmother who would not give up.

**Goes up**: the teen "Focus on school" action (+2…+4, once a year), childhood choices (+2…+5),
four adult choices (+2…+5), a friend's advice (+1…+3). **Never goes down.** No decay.

**Is read** in exactly one place: a paid training session teaches one point more if discipline
is above 65 (`career/training.js`).

**What happens to it in a life.** In the probe (which starts at 20 and skips childhood) no
career ever passed 65 — 237 samples, the 90th percentile 55 — so the one thing it does never
happened. A player who does the school action every teen year and picks the disciplined answers
as a child can pass 65; that path was not measured.

**Is shown** nowhere. Three lines of text name it ("Discipline +3").

## What this means

Neither is a characteristic the player plays with. Confidence is an internal modifier on five
rolls that fills up and stops mattering; discipline is a one-point training bonus most lives
never reach. Two new bars in the Passport would show a number that is 100 for half the game and
a number that does nothing for most of it.

Options, for a decision — none of them is done:
1. **Show it where it is used, not in the Passport.** The roll line on the event screen:
   "It comes down to your confidence — 58." The training screen: "Discipline 45 · above 65 a
   session teaches one more point." Small, honest, no balance change.
2. **Confidence that can be lost.** If it should matter, it needs a way down — a flop, a bad
   review, being recast, a long gap without work — or the +2 per job has to shrink. Balance
   change; needs measuring.
3. **Discipline: give it a job or let it go.** It could be what training, preparation months
   and the craft scenes read; or it could fold into something that already exists. Design
   decision.

Recommendation: 1 now (it closes the gap the event screen opened), 2 and 3 as one decision later.
