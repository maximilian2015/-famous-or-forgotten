# Burnout & Recovery — audit (no code changed)

Read from the code and measured on 27 Oct 2026.
- Question: Alex Moon, 54, an A-lister working every year, shows no accumulated tiredness, and the calendar for June 2080 starts two eight-month shoots at once.

## 1. What already exists — and what it really changes

There is **one** tiredness scale, and it is the right one: **`s.strain`** (life/strain.js), 0–100, shown as Rested / Working hard / Tired / Running on empty. A second scale is not needed.

| Mechanism | What it does now |
|---|---|
| **Strain grows on a set** | Each month on a set adds wear, more when you are already tired (a feature at strain 60 adds ~9 a month). A second and third set add 0.7× each. Low mental or low health add more. |
| **Strain falls off a set** | −3.5 a month doing nothing, −5.5 with "Rest & recover". Each past burnout makes recovery slower. |
| **What high strain changes** | Scene days: from 55 up, −0.25 quality per point (at 100: −11), and harder ("you are worn out"). Energy refill −20 a month above 60. Mental drains every month above 60. You look a year older above 75. The risk card "No month off" warns at 60 and 82. |
| **What it does NOT change** | Health, illness odds, the film's overall performance meter, production trouble. Illness reads health, diet, the gym and age (+5 from 55, +8 from 70), not strain. |
| **Burnout (collapse)** | After 6 months at 82+, a chance each month: 0.4% + 0.09% per point over 88 (at 100: ~1.5%). The shoots freeze, 2–5 months off (longer each time), then a 24-month shield. |
| **What a burnout counts as** | `s.burnouts` +1, **forever**. From the second, insurability falls (×0.86 each, floor 0.45), which multiplies casting and tentpole odds. "Three shoots have stopped because of you" — the risk card "Difficult" lights from 2. |
| **Age** | The health ceiling falls slowly with age: −0.6 a year after 25, about −17 at 54. Illness odds +5 at 55. Strain itself is not age-dependent. |

## 2. The 12–36 months question

Strain is a stock, so it does carry the last months in it. But it **saturates**: once at 100 it cannot say "four years without a break" any differently from "four months".

Measured, 20 careers × 30 years, a player who takes the next film as soon as one ends and never presses Rest:

| | in the red (82+) | at 99–100 | longest red run (median) | burnouts in 30 years |
|---|---|---|---|---|
| one set at a time | **62% of months** | **46%** | **105 months** | 3.1 |
| up to three sets | 73% | 60% | 128 months | 2.7 |

So the bar sits at the ceiling for years and very little happens — exactly what Maxi saw on Alex Moon.
- Alex's save in `saves/` (April 2079): **strain 100, burnouts 0**.
- The collapse needs six red months and then a ~1.5% monthly roll.
- Strain's own comment says "a normal career of one project a year never comes near it". But a normal player takes the next offer the month the last one wraps, and that is two a year, not one.

## 3. Two long shoots in the same months — not a bug, a rule that needs a second look

`engine/sets.js`:
- up to **three sets at once** (Maxi's own rule: "actors shoot three pictures at once");
- a second long set opens at Standing 25, a third at 50;
- a short job (≤2 months) is always allowed beside one set;
- an exclusive contract takes all three.

Alex is at Standing 29, so two long shoots are allowed.

The likely picture for June 2080:
- both offers were signed while busy, and they wait (`laterOffers`, "starts when a set frees up");
- both start in the first month a slot is free;
- Standing allows two, so both start at once.

That is the rule working as written, not a scheduling bug. I could not open the April 2080 save itself — the file in `saves/` is April 2079 — so this is read from the rule, not from that save.

**What is wrong with it:**
- Two eight-month **features** at once costs only +70% wear, and nothing on the offer says so before you sign.
- A real actor can stack a guest spot or a TV season on a film. Two location features in the same eight months is rare and should be expensive and said out loud.

## 4. Absence — what a break does today

- **There is no break of 3–24 months as a decision.** The pieces are:
  - "Rest & recover" — one month, energy;
  - "A month out of sight" — one month, for scandal;
  - "Take the month off" — from the risk card;
  - "▶▶ Live until something happens" — skips quiet months, but nothing calls them a break.
- **While you do not work:**
  - fame drifts (relevance);
  - Standing slips without recent work;
  - hype decays;
  - the board thins;
  - films already shot keep coming out on their dates.
- **People:** contacts drift if you do not call, faster the more famous you are.
- **The game reads a break as "idle".** It walks the decline states — cooling → fading → former → forgotten — and opens the declining market (conventions, cheap sequels, the rare great script from a first-time director). A chosen sabbatical and being forgotten are the same thing to the code. A legend's year off cannot raise interest.

## 5. Recovering without stopping

Today: no. Strain only falls in a month with **no** set. A light year — one short job a quarter — still never lets it fall, because any set month adds and does not subtract.

## 6. Illness vs unprofessional — the line is crossed today

- **A burnout is counted against you as unreliability:** permanent `burnouts`, insurability, "three shoots have stopped because of you", the "Difficult" risk. That breaks the rule agreed for reputation: illness is not a breach.
- **An illness that freezes work** (`illness.freezes`) does not count against you. That part is right.
- **Refusing overload is already free:** saying no to six-day weeks or night shoots costs the film something, not your standing (`demands.js`). Keep that.

## 7. Proposed model — one scale, made to mean something

All on `s.strain`, no second scale.

1. **Load, not just level.**
   - Keep a 36-month **load record**: months on set weighted by scale and overlap. It is the thing that makes "four years without a break" different from "a hard spring".
   - Strain's ceiling behaviour reads it: past a load line, recovery slows and the red band does more.
   - The record is lazy, so old saves start with their last 36 months read off the filmography.
2. **Four states with distinct effects:** tired, overloaded, burnt out, exhausted.
   - **Tired** (60+): energy, mood. This exists.
   - **Overloaded** (82+): scene days worse (exists); new, a small monthly drag on the shoot's meter, said on the set card.
   - **Burnt out:** motivation and conflicts — the director's patience is shorter, through the existing bond.
   - **Exhausted:** a doctor's stop. The production **pauses**, never cancels a safely financed studio film (the stability rule holds).
3. **The risk before you sign.**
   - The offer card says what this does to you: "With Light and Rain III this would be two eight-month shoots at once — your load goes from heavy to dangerous."
   - The agent says it in words, using the existing agent.
   - Two long features at once: allowed, priced in the open, and the second one's wear raised from 0.7.
4. **A break as a decision:**
   - "Step away for 3 / 6 / 12 / 24 months" — one choice, the months pass in one go with a summary, not by clicking.
   - Films keep releasing; contacts get a note; strain and load recover fast.
   - The decline states read a **chosen** break apart from being forgotten. For a big name, the return is an event — the comeback offer, interest, the press — through the existing decline/comeback machinery.
5. **Recovering by working less:** a month with only a short job counts as half a rest; a TV season at low intensity as light work. Strain can fall slowly while you keep a hand in.
6. **Illness is not a breach.**
   - A burnout is recorded as what it is — health — and kept apart from reliability.
   - Insurability reads **recent** reliability deeds (the reputation ledger), not a permanent count of collapses.
   - "Three shoots stopped because of you" becomes true only for shoots stopped by choices: walking off, drink.
7. **Age is not a penalty.** Wear and recovery read load, sleep, health and housing, not age. The existing slow health ceiling stays; nothing new by age.
8. **The A-list test** Maxi describes — the hardest skill at the top is saying no — falls out of 3 and 4. The offer says what it costs you; the break is a real option with a real return.

## 8. Place in the roadmap

After the on-set minigames (Step 3) and before relationships: **Step 3b — Burnout & Recovery**.
- It shares the set calendar with Step 3.
- Its "illness is not a breach" piece is the precondition for Step 4's insurability.
- **Done when:**
  - the measured share of red months for an ordinary player falls to an honest minority;
  - a 30-year career has a real reason to take breaks;
  - every overload is said before signing;
  - illness never lowers insurability;
  - the stability guarantee holds (test_stability).

## 9. Accepted, with principles (Maxi/ChatGPT, 27 Oct) — no code before Step 3b

1. Decades at the ceiling with nothing to show for it must not be possible.
2. The last months count, and recovery counts too: work five years ago does not punish forever.
3. Several shoots at once stay. They are a strategy, not a bug. The overlap of long shoots costs something real and is shown on the offer before signing: the months that overlap, and the risk.
4. Light work lets you recover slowly; not only a fully empty month.
5. A break of 3, 6, 12 or 24 months is a real career decision. The world, the family, the films and the career go on during it, lived in one step with a summary of what mattered.
6. A break does not wipe a famous actor's fame: films already shot, prestige and coming releases keep it.
7. No automatic penalty for age; a young actor can burn out too.
8. Illness and a lawful refusal of overload are not unprofessional. Medical and production risk are kept apart from blame. Insurability can recover.
9. Recovery is never a compulsory year off after N films. Several strategies must be viable.
10. **Before building, balance on three careers** — the careful actor, the always-busy star, the one who overloads on purpose. Show 10–20 years of consequences, and check that no strategy is automatically best.

## 10. The audience's side of working too much — overexposure (Maxi, 27 Oct)

Alex Moon has five releases in 2080. Even if they were shot at different times, the audience sees the same face five times in a year. The game has no such effect.

**What already exists:**
- genre glut: too many horrors this year (`meta/market.js fatigueOf`);
- franchise fatigue: the fifth instalment (`theatrical.js`);
- a streaming show's season fatigue (`streaming.js`).

**What does not:** the actor's own overexposure. A star's fifth film of the year draws the same crowd as her first.

**Proposal** — the same kind as the existing glut, no new scale:
- A star's **releases in the last 12 months** (by release date, not shooting) lower the draw her name adds to each new one.
- **What it touches:** the cinema demand, a streaming opening, hype.
- **What it does not touch:** critics or quality. A great film is still great; people are just tired of the poster.
- **The lead counts most:** a supporting part or a cameo counts little, a TV season apart from cinema.
- **It recovers by itself.** A year with one release restores it.
- **It is said on the offer:** "Three of your films already open this year".

It belongs to Step 3b because it is the same decision as burnout — how much work to take — seen from the audience. The three-career balance above has to include it. Otherwise the always-busy star pays only in body and never in box office.

## 11. Where the burnout bar goes (Maxi, 27 Oct: "куда вставить шкалу")

**Today strain has no bar anywhere**, only a word in three places:
- the home screen's life card, "Energy · Running on empty", shown only from 34;
- the passport, "Body · 100 · running on empty";
- the risk card, "No month off".

The life card also shows **"Energy 85/85"** a few lines away. That is the monthly action energy (`ap`), a different thing, so two different "Energy" sit side by side.

**Decided (Maxi, 27 Oct): the load lives in the Mental screen, not a new tile.**

1. **The MENTAL tile.** It stays, and gains a second line when the load is high: *"MENTAL 53 · running on empty"*. It is seen from the home screen without a tap.
2. **The Mental screen ("Your head")**, which already has *What is pulling you down*, *What is holding you up* and *What you can do this month*, gets a **Load** block at the top:
   - the bar 0–100 and the state word;
   - what it is doing now;
   - the last 36 months of work;
   - the two ways down: work less, or step away.
3. **The offer and the contract:** the forecast line, *"Load 62 → 88 if you sign. Two months overlap with Light and Rain III."*
4. **The set card:** one line when it matters.
5. **Rename the life card's strain row** from "Energy" to "Load", apart from action energy.

**How burnout shows (the plan for Step 3b; "exists" marks today's behaviour):**

| State | What the player feels |
|---|---|
| Rested (to ~33) | Nothing; full strength. |
| Busy (34–59) | Almost nothing. |
| Overworked (60–81) | Action energy −20 a month (exists); scene days harder and worse (exists); mood drains (exists); the agent warns on every new offer (new). |
| Burning out (82–94) | Your work on set grows more slowly, and the film's meter suffers. The director's patience is shorter after a bad day. Incidents on set: a forgotten line, a snap at the AD. Health slips and illness risk rises. |
| Exhausted (95–100, sustained) | A doctor's event with a choice: finish and rest after, pause the shoot now (a pause, never a cancellation), or ignore it. Ignoring raises the chance of a forced break every month, by how long you have been there — not today's flat ~1.5%. |

Every state is recorded as health, never as unprofessionalism. Refusing overload stays free.

Nowhere else. The passport keeps its word.
