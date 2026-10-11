# Relationships 2.0 — audit, 11 Oct 2026

Read-only. No code changed. The question, from Maxi and his reviewer: **what can each person in
the game want independently of the player, and what existing state can remember how the player
answered?** Not a list of buttons.

Method: the code, and a scratch probe (not in the repo) that lived eight 40-year lives — working,
dating the partner, marrying, trying for children, one interaction a month — and collected every
field that ends up on every kind of person.

## What a person is today

| | Stored on them | Wants, on their own | Their own life | What they remember of you | What it does later |
|---|---|---|---|---|---|
| **Partner** (`s.partner`, `life/dating.js`) | relationship, dates, **wants** (quiet · the life · a family · their own thing), **patience**, means, job, age, charm | the *want* changes which dates they like, the wedding odds, and how fame lands; nothing else | none — the job never changes | the relationship number | once a year: under a bar set by patience, they leave (55%) |
| **Spouse / ex** (`s.family`, relation Spouse/Ex-spouse) | the partner's wants, patience, means, marriedOn, prenup, livingTogether | nothing new — **"wants a family" never asks for a child** | none | the number | once a year: divorce risk by the number (and drink) |
| **Friend / contact** (`s.people`, `life/relationships.js`) | relationship, **regard** (what they think of your work), role, industryWeight, fromSet, lastSeen, cold, **owes** | nothing | none | the number; regard; cold; `owes` (written, **read by nothing**) | favours and collaborations use the number and weight |
| **Parent / sibling / grandparent** (`life/family.js`) | relationship, age, health, **ill**, job, retired, supported | nothing | **yes** — fall ill, lose and find work, retire, die, parents divorce | the number; `supported` | a parent takes you in when you are evicted (relationship above −20) |
| **Child** (`life/children.js`) | relationship, talent, schooled, **path**, ownFame, raisedBy, backed | at 11 a line ("wants to know everything", or "stopped asking") | **yes** — school, university (paid automatically), a career of their own at 20, fame | the number (−2 every month you are on a set) | whether they go into the business; university |
| **Director / crew** (`p.crew`, `meta/yourDirectors.js`, `career/demands.js`) | bond per set, regard, cold, **grudges** (who, what, until when) | **yes, on a set** — the 14 demands (nights, a stunt, a cut, a junket…) | their films (world) | **grudges with dates**; the set's log; story chains (refused, recast) | they cast you or do not; the room; the trades |

**Unprompted messages** (`social/sms.js`): somebody saw your film; a contact who went cold says so;
the partner asks you over (more often while you shoot — "On my way" +5, "Can't" −3); a parent saw
the papers; somebody is proud of a nomination; a friend wants a drink.

## The answer to the question

**Only two kinds of people want anything of their own: the partner, a little, and the director
on a set.** The partner's *want* tints the dating and the wedding; it never becomes a demand. The
set's demands are the one place in the game where somebody asks you for something in a currency
of their choosing and your answer matters — `career/demands.js` is the pattern to copy.

**Family lives a life, but it never reaches you as a choice.** A mother falling ill is a line in
the timeline. University is paid out of your account without asking.

**Memory is almost only a number.** One relationship value per person, drifting every month.
What exists beyond it:
- grudges (directors) — real memory, with a cause and an end date;
- `regard` — what they think of your work, apart from what they think of you;
- `supported`, `backed`, `cold`, `rebuffedAt`, `lastSeen`;
- **`owes`** — set when you put in a word for somebody, commented "the quests read this", and read
  by nothing: the debt is recorded and never called in.
Nothing remembers *what* you did — that you missed the surgery, that you promised the summer,
that you blamed them for the film.

## The three known findings, and one more

1. **`scenes.js` reads `p.stance`** (the removed work style) in `autoQuality`. **Not a relationship
   matter.** It belongs to the set, and the set's answer to "how did the month go" is now
   `demands.js`. Delete it in a cleanup; do not carry it into Relationships 2.0.
2. **Only a parent takes you in** (`engine/economy.js`, inline `> -20`; `bonds.js`
   `SHELTER_FLOOR`/`willTakeYouIn` unused). **Fits exactly**: being taken in is the clearest thing a
   relationship can do for you, and it should be decided by who you have and what you did for
   them — a partner or spouse you live with, a sibling, a friend who `owes` you. It is also a debt
   the other way: they remember they took you in.
3. **`drifted` is never set** (`social/night.js` filters on it). **Fits**: it is the honest end of
   a friendship nobody answered — a friend who moved abroad, or whose need went unanswered long
   enough, drifts: out of the invitations, out of the night's guest list, still in the phone.
4. **`owes`** (above): the existing slot for a debt. It should be read.

## The smallest system that gives people a life

Four things, three of which the game already has an engine for:

1. **A need, on the person, decided by their state — not rolled from a list.** At most one live
   need per person, with the month it started and how long it can wait:
   `p.need = { id, since, until }`. It arises from what is already stored: a partner's *want* and
   your schedule, a parent's health and age, a child's age, a friend's weight and yours.
2. **It reaches you as a choice** — through the event screen that now prints every consequence
   (`ArcModal`, `shows`), the way a story beat does (`meta/stories.js` already has beats, due
   dates and per-story data). Two to four answers, each paid in a different currency — time on the
   set, money, standing with a director, the relationship — as `demands.js` does for the set.
3. **The answer is remembered on the person**: `p.memory = [{ at, need, answer }]`, a handful of
   entries, plus the slots that exist (`owes`, `supported`, `cold`, `drifted`).
4. **The memory comes back** — in the next need, in how they answer you, in who takes you in, in
   the lines at the end (a eulogy, a divorce, the Legacy page).

Needs come in **arcs that recur on the same person**, not one-off pop-ups: the partner who asked
you to choose last year asks again, and remembers.

## Examples

**Partner who wants a family** (`wants: 'family'`). Two years together, you shoot eight months of
each twelve.
- *Need:* "I want to know if this is ever going to be a home." — Move in together / Promise the
  summer off / Not this year / End it.
- *Memory:* `promised summer 2071`. If the summer comes and you sign a shoot over it, the promise
  is broken — the next need arrives early, patience drops, and the line says why.
- *Later:* married with that history, "wants a family" finally asks for a child; refused twice, it
  is the reason given in the divorce.

**Partner who has their own thing** (`wants: 'ambitious'`). Their job finally matters.
- *Need:* "I've been offered a year in New York." — Go with them (turn down work for a year) /
  Do it long-distance (patience halves) / Ask them to stay (they remember who asked).

**Friend** (a contact, `regard` high, `owes` set because you vouched for them).
- *Their life:* their career takes off — weight up, yours flat. Jealousy, or a door.
- *Need:* "Can you read for my film?" when you are at the top — Do it for nothing / Your fee / No.
- *Debt called in:* evicted at 51, the one who `owes` takes you in, and says so.
- *Or it drifts:* three needs unanswered — `drifted`, out of the invitations, still in the phone.

**Parent** (health under 40, you on a set).
- *Need:* "Your mother needs surgery next week." — Fly home (the set waits: director bond down,
  the shoot loses days) / Stay (the relationship falls hard; `memory: missed the surgery`) / Move
  the schedule (a roll on standing and the director's bond, with the chance printed).
- *Later:* at the funeral the line remembers which one you chose; a sibling who was there does too.

**Child** (18, university). Today it is paid automatically. As a need: "I got in." — Pay for it /
They take the loan / "Acting school instead?" — and at 20 the child who wants the business asks you
to open a door: the casting director you know, or "do it on your own name".

## What to build first, and what not

- **V1:** needs and memory on **partner, parent and one friend type** — the three examples above —
  through the event screen, with the existing `owes` read and `drifted` set. Shelter reads the
  memory. About eight needs in all, each with its cause in stored state.
- **Not yet:** children's needs beyond university; coworkers (the set already has demands);
  any new relationship buttons; any new stat.
- **Delete, separately:** the `p.stance` read in `scenes.js`.
