# Relationships 2.0 V1 — design, 11 Oct 2026

Design only. No code. Built on the audit (`2026-10-11-relationships-2-audit.md`). The loop:

**person → need (from their state) → they come to you → you choose → it is remembered → it comes back**

Scope: partner/spouse, close friend, parent. Eight needs in all. No new buttons in People, no new
currency. Children, coworkers and the set stay as they are.

## The pieces, and what they reuse

| Piece | New or existing |
|---|---|
| **The choice** | existing event screen (`ArcModal`): a need arrives as `s.pendingArc = { need, pid, … }`, resolved by `resolveNeed` the way a story beat is resolved by `resolveStory`. Every answer carries `shows`, so the screen prints its consequences and, for a roll, the chance. |
| **The need** | new, on the person: `p.need = { id, since, until, data }`. One at a time. |
| **The memory** | new, on the person: `p.memory = [{ k, at, a, ok, until }]` — kind, month, answer, kept or broken, a promise's end. At most eight; the oldest goes. Facts, not prose: every line is generated from them. |
| **Debt** | existing `p.owes` (written by "put in a word", read by nothing today). V1 writes it from more answers and reads it. |
| **Friendship drift** | existing `p.drifted` (read by the night's guest list, written by nothing). V1 writes it, from behaviour. Plus a small counter, `p.neglect`. |
| **Partner's wish and patience** | existing `wants` (quiet · the life · a family · their own thing) and `patience`, which `datingYear` already reads to decide whether they leave. |
| **Family state** | existing `health`, `ill`, `job`, `retired`, `supported`, `familyClass`. |
| **Being on a set** | existing `s.production` / `sets(s)`, `monthsLeft`; production pause already exists (`p.paused`, used for illness and burnout rest). |
| **Months away** | new, small: `s.awayLog`, the last twelve months, on a set or not. Nothing in the game counts this today (only months *without* work). |
| **Rules for frequency** | new: `s.needAt` (the last month any need was put to you) and `p.needCool` per person. |

## Not spamming the player

- At most **one need put to you every three months**, across everybody. Never while another event,
  a scene, a negotiation or the first day is on the screen.
- At most **one live need per person**. Each has a deadline (`until`, two or three months). Left
  unanswered it **expires as an answer** — remembered as `ignored`, which is itself the most
  telling thing you can do.
- Each person has a cooldown after a need, twelve to twenty-four months.
- When several are ready, the most urgent goes first: health, then promises falling due, then the rest.

## The eight needs

### Partner / spouse

**1. Time — "You've been gone all year."**
- *Trigger:* partner or spouse, relationship 30 or more (they still care); on a set in 7 or more
  of the last 12 months (`awayLog`); no promise of theirs live; cooldown 12 months. Wants
  `quiet` or `family` make it likelier, `ambitious` less.
- *Choices:*
  - **Promise them the next three months** — remembered `promise {until}`. If you start a shoot
    inside that window, the promise is broken: memory `ok: false`, patience −15, and their next
    need comes early and opens with it.
  - **Take them with you** — money (the bill for a flat near the set), relationship up; not open
    for `quiet`.
  - **"This is the job."** — relationship down, patience −10; remembered `refused`.
- *Read later by:* the next Time need ("You said last summer would be different."), `datingYear`
  through patience (already decides whether they leave), the divorce line.

**2. A family — "I want to know if we're having children."**
- *Trigger:* spouse (married), wants `family`, married 18 months or more, no living children,
  relationship 40 or more, fertility not closed (`children.js`); cooldown 18 months.
- *Choices:* **Try for a baby** (the existing `tryForBaby`) · **Adopt** (existing `applyToAdopt`,
  money) · **Not yet** (remembered `deferred {until 18 months}`; asked again then, with it) ·
  **No** (relationship falls hard; remembered `refused`).
- *Read later by:* the next Family need, the divorce reason ("You said not yet, twice."), and a
  child's line when one comes.

**3. Their own chance — "I've been offered a year in [city]."**
- *Trigger:* partner or spouse with wants `ambitious` (or a professional job), relationship 35 or
  more, about one chance in four a year, cooldown 24 months.
- *Choices:* **Go with them** (a year abroad: offers thin out, as `hiding` and the agent factor
  already do elsewhere — the price is your career) · **Long distance** (they go; patience −15; the
  "come over" texts stop; they come back in twelve months with a line) · **Ask them to stay**
  (they stay; remembered `gave_up_for_you` — no cost now, a debt for later).
- *Read later by:* every later conflict with them ("I turned down New York for you."), divorce.

### Close friend

A close friend is a contact with relationship 40 or more who is not cold and not drifted — the
game already uses this exact rule for who texts you.

**4. Support — "I'm behind on the rent."**
- *Trigger:* close friend who is a Fellow Actor (the contacts the game pays least), your cash
  well above theirs (you have 20,000 or more), cooldown 18 months.
- *Choices:* **Pay it** (money; `owes` set; remembered `helped`) · **Let them stay at yours** (if
  you have a home; energy; `owes`) · **Can't right now** (relationship down a little; `neglect` +1;
  remembered `refused`).
- *Read later by:* shelter (they take you in), their break (#5), the drift rule.

**5. Their break — "I got the part. Will you read with me / come to the premiere / say my name?"**
- *Trigger:* close friend; once a year a chance their career turns (higher if their regard of you
  is high and you work together often); on a hit their industry weight rises — they become a
  contact who can open doors. Cooldown 24 months.
- *Choices:* **Put in a word** (the existing vouch — standing spent, `owes` set) · **Turn up** (energy)
  · **Not now** (`neglect` +1; remembered `refused`; their regard of you falls).
- *Read later by:* favours — a friend who `owes` you and has risen does you one back unasked
  (a casting boost, as their role already unlocks); the drift rule.

**6. The last call — "We never see each other any more."** *(the drift rule)*
- *Trigger, from behaviour, not a threshold:* `neglect` 3 or more (refused or ignored needs, and
  every "Rain check" on a drink) **and** no time together for 12 months (`lastSeen`).
- *Choices:* **Make time** (an evening; `neglect` reset; relationship up) · **Let it go** —
  `drifted`.
- *A drifted friend* stays in the phone, under "Drifted away — not really in each other's lives
  since 2047". They do not text, are not invited and do not come to nights (`night.js` already
  filters them), are not close friends, and cannot shelter you. A long evening together can bring
  them back (`neglect` reset, `drifted` cleared).

### Parent

**7. Health — "Your mother needs surgery next week."**
- *Trigger:* parent alive and `ill`, or health under 35; cooldown 24 months. Two versions:
  - *On a set* (`s.production`, a month or more left):
    - **Fly home** — the set waits a month (the existing pause), the director's bond falls; the
      parent's relationship rises; remembered `there`.
    - **Stay on set** — the relationship falls hard; remembered `missed`; a sibling remembers too.
    - **Ask to move the schedule** — a roll on standing and the director's bond, chance printed.
      Works: as Fly home without the bond lost. Fails: as Stay, and the director heard you ask.
  - *Off a set:* **Go** (energy) · **Pay for private care** (money; remembered `paid`).
- *Read later by:* the death line in `family.js` ("You were there for the surgery." / "You were in
  Prague for the surgery."), the inheritance note, the sibling's next need, Legacy.

**8. Help — "Dad lost his job." / "She shouldn't be living alone."**
- *Trigger:* parent alive, not `supported`, and either out of work under retirement age, or 75 or
  over and widowed; your cash 50,000 or more; cooldown 24 months.
- *Choices:* **Set them up** (the existing "set them up for life" — `supported`) · **Move them in**
  (if you own your home) · **Not now** (relationship down; remembered `refused`).
- *Read later by:* shelter (a parent you refused still takes you in, and says so), the death line.

## Shelter, read from all of it

On eviction, instead of "a parent above −20, or the street", the game looks at who you have:

- partner or spouse — no rent already if you live with them (`hostedBy`); if not, they offer;
- a parent or sibling — relationship above −20;
- a close friend — not drifted, not cold, relationship 50 or more;
- anybody who `owes` you, whatever the relationship now.

Each is scored by relationship plus what the memory says (+ helped them, − refused them, + they
owe you). Up to three offer; you choose on the event screen, and each offer says why, from the
memory: *"Maya says you can stay at hers. You paid her rent when she was broke in 2071."* You live
there rent-free through the existing `hostedBy`, extended from partner/spouse to anybody who
offered. Nobody offers → the street, as now. Being taken in is remembered by them too.

## What reads the memory (V1)

- **The needs themselves** — the next need from the same person opens with what you did last time.
- **`datingYear`** — through patience (broken promises, refusals).
- **Divorce** — its line gives the remembered reason.
- **A parent's death** (`family.js`) — the line remembers the surgery and the help.
- **Shelter** — who offers and why.
- **Drift** — `neglect` and `lastSeen`.
- **Favours** — a risen friend who `owes` you does one back.

## Save compatibility

- Everything new is created lazily, the way `marketOf(s)` is: `p.need`, `p.memory`, `p.neglect`,
  `p.needCool`, `s.needAt`, `s.awayLog`. An old save has none of them, and nothing reads them as
  required. No save version bump, no migration.
- `owes` and `drifted` already exist and keep their meaning; old saves have `owes` on some contacts
  already — those debts become callable.
- A partner who marries becomes a new family entry with a new id (`proposeMarriage`); their
  `memory`, `need` and `patience` are copied across. A partner who leaves takes their memory with
  them, unless they were a contact (`contactId`), whose entry keeps it.
- `hostedBy` today can only point at a partner or spouse; `hostOf` widens to any family member or
  contact. Old saves only ever have partner or spouse there.
- A need on the screen is `pendingArc.need`; old saves never have one. A save made with a need on
  the screen loads with it.
- `s.awayLog` starts empty, so the Time need cannot fire in the first year after an update. That
  is the honest price of counting from now.

## Also in V1, from the audit

- Delete the `p.stance` read in `scenes.js` (not a relationship matter).
- `bonds.js` `SHELTER_FLOOR` / `willTakeYouIn` become what shelter reads, instead of the `> -20`
  written out in `economy.js`.

## Not in V1

Children's needs, coworkers' needs, the set (it has demands), new People buttons, any new stat,
any random flavour event without a state behind it.
