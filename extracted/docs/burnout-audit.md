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

## 12. Final refinements — design closed until Step 3b (Maxi/ChatGPT, 27 Oct)

**Four corrections:**
1. **The MENTAL tile's second line says "Load: running on empty",** never "MENTAL 53 · …". The two numbers are different things.
2. **The agent speaks only when it matters:** a contract that raises the load a lot, or creates a dangerous overlap. *"You're already filming two projects. Taking this one means six months without a break. I'm concerned."* The forecast line stays on every offer, marked approximate: *"≈62 → 88"*.
3. **Incidents on set are events with choices,** not silent point losses.
   - *The Fifth Take*: try again / ask for a short recovery break / tell the director you are exhausted.
   - The director's reaction reads his trait and the schedule.
   - Illness itself never makes you unprofessional; an insult you choose to throw is a personal matter with that person.
4. **One chain of consequence, never three penalties.** High load → a good scene is harder to play → your contribution to the film is lower → the reviews and the result follow from that. No separate penalty on each.

**Negotiating the shoot** — not a new system; strain, the calendar, the contract, the director's trait, the producers, insurability. It opens only at high load or a medical crisis.

| Choice | What it buys | What it costs |
|---|---|---|
| Carry on | the short-term gain | the load keeps building |
| Finish your scenes early | out sooner | needs the production's yes; more load for weeks, fewer takes; a perfectionist may refuse; easier for a supporting part than for the lead of an 8-month film |
| Postpone your scenes 1–2 months | time to recover | schedule, a possible later release, some goodwill or a bonus |
| A lighter schedule | less risk to health | the shoot runs longer |
| A medical pause | the doctor's call, always possible | — health is never traded for reputation |

- **A postponement is a request, not a right.** The studio says yes more readily the first time and asks more the second. A third serious stop opens the production crisis below.
- **Money:** never a fine for illness.
  - Contract penalties only for knowingly broken obligations (incompatible contracts signed on purpose).
  - A requested easier schedule can cost a bonus, by agreement.

**Forced recovery — the rare climax of sustained overload, not a separate system.**

The path: 82+ first real effects → 95+ for months, the doctor advises → you carry on → the chance of a forced stop rises with how long → **production crisis** → recovery and a comeback.

**The studio decides by how much is shot and how big your part is:**
- **freeze your scenes** 1–3 months, if they can wait;
- **rewrite and finish without some scenes**, if most is shot;
- **replace you**, if it is early or nobody can wait.

The existing `replacementThreat` event is the starting point for this. A safely financed studio film is still finished — in the extreme case, with another actor.

**What follows:**
- **Health:** a forced pause, no new shoots for a while, a slow recovery.
- **Production:** the schedule broken, costs, other films delayed, perhaps the role lost.
- **Insurability:** temporary limits on big projects, which lift after recovery and good work.
- **Standing:** illness never lowers it. One producer's trust can change through the real production risk.
- **Money:** losing an €8m lead is the consequence. Nothing else is taken.

**The screen:** a greyed, muted look while it lasts. Temporary, and it can be switched off. Time keeps running, with the doctor, the production news and the decisions — **the game is never locked**.

**Depression is not burnout.** It exists (`life/depression.js`: therapy, medication) and today it **starts automatically on the fourth burnout** (`strain.js`, `DEPRESSION_AT = 4`). That automatic rule goes. A long exhaustion can *sometimes* meet the existing depression; it never equals it.

**The test for Step 3b:** on Alex Moon, does the player get a real reason to say *"they offer ten million for this one, and I will turn it down"*?

## 13. High-stakes contracts and real dilemmas — matched against the code (Maxi/ChatGPT, 27 Oct)

Source: Maxi's brief "Burnout, High-Stakes Contracts & Hollywood Intrigues".
- Most of it is already in §7–12 and is not repeated.
- Below: what the code does today in the areas the brief asks about, what is new, and where each new piece belongs.
- No code was changed.

### 13.1 What the code does today (read from the handlers)

| Area | Today |
|---|---|
| **Burnout stop** | `strain.js` puts every running set into `s.frozen` with `byYou: true` and a patience window by fame (`stability.js patienceFor`: 14 months for an unknown, about 52 for an icon). The studio waits; when the window runs out, the film is recast or written off. Nothing in between: no rescheduling around you, no rewrite without your scenes. The decision does not read lead vs supporting or how much is shot. |
| **A burnout counted as blame** | When a burnout-frozen film dies, `stability.js` takes **Standing −6, or −9 if the window ran out**, and writes "it stopped because of you". That is illness charged as unreliability. §6 did not list this one; it found only `burnouts`, insurability and the "Difficult" risk. |
| **Signed off = no paper at all** | `offers.js` checks `canWork`. While you are signed off you cannot accept **any** offer, even one that starts in nine months. The brief wants the agent to close a film that starts after you recover; that is impossible today. |
| **replacementThreat** | `arcs.js`. It fires only when the shoot's **meter is under 25**, i.e. bad dailies, not health. Choices: promise to turn it around; fight for the part (a confidence roll); walk with a **30% kill fee**. It never reads strain. |
| **Walking off** | `production.js walkOffSet`. Only by choice, for a bigger picture. Costs Standing −7 (TV) or −9 (film), a five-year grudge with the director, and `walkedOff` for the lawyer (`risk.js`). It is a choice, so a penalty is right. |
| **Pay-or-play** | `contract.js`, films only. You get the whole fee if the picture is recast because of your schedule or if it collapses (`stability.js`). |
| **Exclusivity** | A contract clause on big films. You can try to strike it: 22% on a blockbuster, 45% otherwise. An exclusive set takes all three slots, even a day's work. |
| **Schedule clash** | Signing while busy: you ask them to hold the part, or, for a bigger picture, walk off the current one. A held part waits two months past its date, and the agent can ask once to move it. After that it is recast. Pay-or-play is honoured, and a lost sequel or season is told by `continuation.js`. |
| **Series** | `standoff.js` already has season options (cut or strike), an exit after season three, the right to work between seasons, being **written out** (`writeOut`, `canBeWrittenOut`), and `replacementCost`/`dependency`. `continuation.js` already tells the season that runs without you. Missing: a rule for **your long absence while under contract**. A burnout simply freezes the show like a film. |
| **Money against the actor** | **None.** No liability, no per-month delay charge, no clawback of an advance. The only money that moves is in your favour (pay-or-play, the kill fee). |
| **Bonuses tied to conditions** | None. The back end (points), points-for-pay on small films and merchandise all pay on the result; none pays for keeping a schedule. |
| **Agent at high strain** | Says nothing about the load (§11). |

### 13.2 New requirements (not in §7–12)

**A. Step 3b — on existing mechanics, small extensions**

1. **The studio's decision when you stop.** One resolver on top of the existing freeze. It reads:
   - lead or supporting;
   - how much is shot;
   - fame, and whether you are the franchise face;
   - the budget;
   - the contract.

   Outcomes:
   - reschedule around you;
   - freeze your part (today's freeze);
   - cut or rewrite the rest;
   - recast: the last resort for a franchise face, but still possible.

   It replaces the single patience number. That number stays as the fallback for old frozen entries.
2. **Remove the Standing charge when a burnout-frozen film dies** (13.1, second row). This follows from §6 and §9.8. What you lose is the role, never Standing.
3. **Paper during a medical stop.**
   - You can sign work that starts after your expected return.
   - The agent can ask for a later start, a lighter schedule or an exception from exclusivity.
   - No set starts before you are cleared.
   - `canWork` splits in two: "can start work" and "can sign".
4. **replacementThreat also opens from sustained exhaustion** (95+ for months, §12), not only from a meter under 25. It stays the same event: a new way in, and choices that read strain. **The Studio's Ultimatum** (quest B) is this event at strain 94:
   - fewer days, and lose a bonus;
   - speed up and risk it;
   - rearrange, and lose another project;
   - a medical pause.
5. **A crisis remembers the choice before it.** If you chose to speed up, the next crisis reads that choice. The place to keep it is the rep-cover memory ledger (`s.memory`). No independent random second crisis.
6. **Series: a long absence under contract.** The show can go on without you:
   - the season is delayed or shortened;
   - the character is written out for a while (the existing `writeOut`);
   - the storyline moves to someone else;
   - the season's result is simulated the way `continuation.js` already does it.

   If the show does **better** without you, the next renewal can offer **fewer episodes**. That is **quest C, The Replacement**:
   - accept the smaller part;
   - refuse and go back to film;
   - argue for a bigger line;
   - invoke a guarantee you negotiated.

   It is judged on the show's own result and your contract, never as a penalty for being ill.
7. **Losses you feel without fines** (brief §8). Most already happen and only need to be **said**:
   - offers keep arriving and lapse unanswered while you are signed off;
   - a sequel or season can be lost;
   - living costs keep running.

   New: a **temporary** insurability limit on the biggest productions after a medical stop. It lifts after recovery and good work, and it rides on Step 4's recoverable insurability.
8. **The agent's three levels** (60 / 82 / 95). §12 already agreed that the agent speaks only when it matters. New here: the wording at 95+ and the future-start negotiation from item 3. The agent never signs anything for you.

**B. Contract terms: in 3b only where burnout needs them; the rest after Step 4**

These build on the existing clause list in `contract.js draftContract`: fee, exclusivity, preparation, back end, option, seasons, exit, pay-or-play. **No second contract system.**

| New clause | Where | Note |
|---|---|---|
| A **schedule bonus**, paid for finishing on the agreed dates | 3b | What a requested lighter schedule or a postponement can cost (§12). One clause, shown before signing. |
| **Postponement terms**: how many times, how long | 3b | Puts "a postponement is a request, not a right" on the paper. |
| **Liability for a proven breach**, capped, with an optional per-month figure | after Step 4 | Only for breaches the code can **prove were chosen**: walking off, a hidden conflicting contract, drink. Never for a medical stop. It needs Step 4's four categories first, or illness leaks into it. |
| **Clawback of an unearned advance** | after Step 4 | Same reason. |
| **Limits on conflicting projects** beyond exclusivity | after Step 4 | Feeds quest A. |

Every clause is on the paper **before** signing. Not every big contract carries the dangerous clauses: they depend on the deal (the studio, the scale, your record).

**C. Hollywood Intrigues: a later step, not 3b**

These are real dilemmas between two things the player wants, and NPCs who push. They build on:
- the career-story chains (`meta/stories.js`);
- the memory ledger;
- director traits;
- the contract.

**Quest A, The Offer of a Lifetime.**
- Already exists: the clash between two signed or offered contracts (schedule clash, hold, walk off).
- New:
  - a legendary director's one-time offer that will not move;
  - the agent buying out part of the obligation for money;
  - leaving by agreement.

**NPC manipulation:**
- a rival producer's offer at the worst moment;
- a reshoot that clashes with another job;
- an agent working for another client;
- a co-star shifting the blame;
- a rival's false rumour about your reliability (the rumour pieces exist: `rumour`, press, scandal).

The rule: an NPC's malice never becomes the player's proven fault.

**The quality bar** for every quest: two things the player wants, and no option that is both safe and free. The brief's weak examples are dropped: leaking the NDA script, and secretly signing a forbidden contract.

### 13.3 Boundaries

- **Step 3b:** everything in §7–12, plus 13.2-A items 1–8, plus two contract clauses (the schedule bonus and postponement terms). No liability, no clawback, no NPC intrigue.
- **Step 4 (reputation):** recoverable insurability and the four categories. This is the precondition for charging the actor any money.
- **Hollywood Intrigues**, a new step after Step 5:
  - the liability and clawback clauses;
  - limits on conflicting projects;
  - quest A;
  - NPC manipulation;
  - long career-conflict chains.
- **Balance:** the three-career check (§9.10) now also counts:
  - roles lost and replacements;
  - offers missed while signed off;
  - medical pauses;
  - schedule bonuses lost.

  Alex Moon's save is the named test.

### 13.4 Priority (Maxi's first paste, 27 Oct)

Maxi and ChatGPT looked at Alex Moon still shooting at strain 100 and Mental 33. Their conclusion: the core of burnout should come **earlier**. The core is:
- sustained 95–100 leads to a real production crisis;
- the studio decides;
- recovery has consequences.

**Proposal, awaiting Maxi's word:** move 3b part 1 (Burnout: the §12 path plus 13.2-A items 1–5) **ahead of Step 3** (the minigames).
- It touches scene days only through the existing quality penalty, so the minigame rework does not block it.
- Recovery, overexposure and the balance pass keep their order after it.

**Decided (Maxi/ChatGPT, 27 Oct).** Burnout, recovery and the production crises become **Step 1b, Burnout Core**. It comes right after Step 1, before the stories and the minigames. "Step 3b" in this document now means Burnout Core.
- **Moved out:** audience overexposure, to Step 6.
- **Fixed already in Step 1, main `a24cbdd`:** the Standing charge for a film that a burnout stopped.
- **Also agreed:** the 52-month patience goes. The studio decides by the circumstances (§13.2-A item 1).
