# Work relationships — what the numbers actually change

Read from the code on 24 Oct 2026 (branch story-v1, same as main for everything below). Read only — nothing changed.
For each relationship: where it goes up, where it goes down, **what it changes**, and what is decoration.

## 1. The director on the set (`p.crew[0].bond`)

**Goes up / down.** Answering the production's asks (`career/demands.js`), scene days (`career/scenes.js`), the director's monthly read of your work (`production.js productionTick`), "have a word" (`career/favours.js`, costs standing).

**Really changes:**
- **How well your work goes each month.** Warmth is added to the picture's meter (`production.js shootTick`).
- **"Fight for the scene"** works only if the director is at 50+ (`demands.js`).
- **The bold scene approach** needs 62+ (`scenes.js`). Below that the button is shown as locked.
- **Odds of pushing your version of the script** (`story.js pushOdds`: (bond − 40) × 0.55).
- **At wrap:**
  - 70+ (or a great set at 40+) → +3 standing and "tells anyone who'll listen how good you were";
  - colder by 12+, ending at 25 or below, on a bad set → −3 standing.
- **Walking off the set** → a grudge with the film's title, which closes this director's offers for years (`stories.js holdsAGrudge`).
- **Into your phone** if 60+ at wrap (`production.js keepTheCrew`). Then see section 3.

**Decoration:**
- **The director's character.** Every crew member has a trait — `diva`, `perfectionist`, `chill`, `difficult` (`production.js makeCrew`). It is printed on the crew card ("Director · perfectionist · bond 42"). **No line of code reads it.** The exact thing the review asks for (different directors react differently, known before the choice) is already in the game, unused.
- **What you did, as opposed to how much.** Apart from a walk-off grudge, a director keeps only a number. "He remembers you covered for a co-star on Vanished Margo" cannot be written, because the deed is not kept on the person.
  - It IS written down — `demands.js` logs "You covered for X for a fortnight and nobody ever knew" into the shoot's log, which becomes the credit's on-set story — but only as text on the film, not as something the director remembers.

## 2. The co-star (`p.crew[1].bond`, sometimes a real actor of the world via `worldId`)

**Goes up / down.** `demands.js` (cover for them, report them, upstaged), scene days, chemistry rolls.

**Really changes:**
- The wrap line: 70+ "you have something on screen", 28 or less "never quite found it". Text only.
- **Into your phone if 60+ at wrap.** Below 60 they are forgotten completely: no record, no memory.

**Decoration:**
- **Co-star chemistry has no effect on the film.** No read of the co-star's bond touches the meter, the rating or the box office.
- **No memory, so no return.** "You covered for him, three years later he has the lead and decides whether to work with you" cannot happen: below 60 the person is gone, and the world's actors keep only a "worked with you" flag on their credits (`world.js withYou`), not an attitude towards you.
- **Covering for a co-star can never be found out.** `cover` moves the numbers once and is over.

## 3. People in your phone — directors, stars, producers (`s.people[].relationship`, `industryWeight`)

**Goes up / down.** Calls, lunches, parties (`life/interactions.js`, `social/night.js`), the shoot you just did (`keepTheCrew` overwrites it with the wrap bond), fading if you never ring.

**Really changes:**
- **Offers.** A director in the phone above 15, not cold, without a grudge, sends you work (`offers.js sendsOffers`).
- **The tentpole board.** Above 35 (`tentpoles.js onTheBoard`).
- **Access to the top tier.** Somebody with weight 80+ at 60+ opens it (`access.js`, `relationships.js`).
- **Asking a star to co-star with you.** 50+, and the odds grow with it (`collab.js`).
- **Who you can reach at a party** (`night.js`).
- **The Directors screen and the "directors" reading on the Passport.** It reads all of the above and says why.

**Decoration / gaps:**
- The offer card does not say who is behind it or why ("Ulrich asked for you — he remembers Vanished Margo"). The reason exists in the code — `fromSet` is the film you met on — but it is not shown at the moment it matters.
- There is no "role without an audition" for somebody who owes you, and no "they would rather not" short of a full grudge.

## 4. The agent (`s.agent`, and the agent as a person in the phone)

**Really changes (through the agent's TIER, not the relationship):**
- the cut;
- reach for offers (`offers.js agentReach`);
- reach at the table (`negotiate.js`);
- the agent drops you when your standing falls (`meta/standing.js agentDropped`).

**Decoration:**
- **The agent's relationship.** It is set to 50 when they sign you, capped at 30 when they leave, and **never read for anything the agent does.** Every social system explicitly skips the agent (`!p.agent`). Being good or bad to your agent changes nothing.

## 5. Studios

There is **no relationship with a studio.** "The studios" on the Passport is a reading (`meta/factions.js`): standing × 0.4 + fame, times insurability, −30 when you are box-office poison, −15 after a recent walk-off. The things it reads are real — insurability and poison do close offers elsewhere. But no studio remembers you: there is no "Meridian Pictures will not work with you after the reshoot fight". Read only by `Passport.jsx` and `DirectorsScreen.jsx`.

## 6. The rest of the crew

The camera operator (`crew[2]`) has a bond and a trait, both shown on the crew card. **Neither is read by anything** except the general "the set warms to you" check in life arcs. Decoration.

---

## Summary

| Relationship | Changes something real | Decoration |
|---|---|---|
| Director on set | work quality, two locked options, script push, ±3 standing at wrap, grudge on walk-off | **trait (perfectionist / chill / difficult / diva)**; deeds not remembered |
| Co-star | phone entry at 60+ | **chemistry has no effect on the film**; forgotten below 60; cover can never be found out |
| People in phone | offers, tentpole board, top-tier access, co-star asks, parties | the offer does not say who is behind it or why |
| Agent | (tier only) | **the agent relationship** |
| Studios | (a reading of standing, fame, poison) | no studio memory at all |
| Rest of crew | — | bond and trait |

## What would make each one real (proposal, not built)

1. **Deeds, not only numbers.** A person keeps a short list: `{ what: 'covered', title, year, weight }`.
   - Written by the on-set asks, which already log the sentence.
   - Read by: the offer card ("Director's history"), option availability with the reason on the button ("Ulrich will not change the scene — Vanished Margo"), "a part without an audition" for somebody you saved a shoot for.
   - Weight cools with the years, the way grudges already expire.
2. **Make the traits work, and show them before the choice.**
   - Perfectionist: lateness and lost days weigh double.
   - Chill: a covered co-star gets a second chance.
   - Difficult: uses what you admitted.
   - Diva: hates being upstaged.
   - The option's hint says it: "Ulrich is a perfectionist — this will matter to him."
3. **Co-stars who are real actors remember you** — `worldId` is already there, even if they never enter your phone. A rival or an ally years later, through the existing offers and the `collab.js` ask.
4. **Cover can be found out**, as a two- or three-beat chain on the mechanism that already exists for career stories (`meta/stories.js`).
5. **Co-star chemistry touches the film**, a little, the way the director's warmth already does.
6. **Agent and studios.** Either give them a memory, or make sure no screen shows a number for them as if it mattered (not checked screen by screen in this audit).

The order I would build it in: 1 and 2 on the single `cover` situation, end to end, with the return years later. Then the other asks.
