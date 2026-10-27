# The cover — first end-to-end prototype of on-set memory

Branch `rep-cover`, from main. Not merged.

## What it is

One decision on a set: a co-star "has not been right for a fortnight", and you cover for them. It
now does four things, through the systems the game already has:
- it changes relationships now;
- it comes back as a story months later;
- it can close a director's door, with the reason on it;
- it is remembered by the same people years later — with a way back.

## Before the choice

The option says what kind of director this is, from the trait that was on the crew card and read by nothing:

> **Cover for them** — Your days get longer and the film gets worse. If it comes out: *Ulrich is a perfectionist: a lie about the schedule is the one thing he takes personally.*

Each kind reads differently: perfectionist, difficult ("what you admit, he will use"), diva, easy-going ("he would rather know than not, and will shrug").

## The four outcomes

The outcome is rolled from the director's character, and a lie told twice is likelier to come out.

| Outcome | What happens | Who changes |
|---|---|---|
| **They straighten out** | "I owe you one." | The co-star owes you. The director never knew. |
| **They miss the call again** | You choose: cover again (riskier), tell the first AD now, or stay out of it. | Covering again: the co-star trusts you more, and discovery gets likelier. Telling: the co-star will not forgive it; the director trusts you more. |
| **It comes out** | You choose: own it, or say it was the co-star's idea. | The director, by trait: a perfectionist turns, an easy-going one shrugs. Blaming costs you the co-star. Twice over to a perfectionist, or to a difficult director: **his door shuts** — an existing grudge, with the reason written on it. |
| **Nothing** | The shoot moves on and nobody ever says a word. | Only the co-star remembers. |

**What it never touches.** Standing, insurability and the film's stability. A lie is personal (ChatGPT's line, and it is right). Telling the first AD the truth is not punished either; the co-star resents it, the director respects it.

## Years later

- **The Directors screen.** *"Grudge · Until you put it right — You lied to him for Joaquin Kowalczyk on Vanished Margo. You can still contact Ulrich, but work together is blocked until the grudge ends."*
- **The way back, a year and a half later.** *"Ulrich Beaumont is casting again. Your name came up in the room, and the room went quiet."*
  - Write to him: a charisma roll.
  - Or ask a heavyweight in your phone to put in a word: costs a favour (−2 Standing, said on the button).
  - Or let it lie.
  - Nothing ends the grudge by itself; something you do does.
- **His offer, when it comes.** *"History: Ulrich Beaumont remembers Vanished Margo (2079): that you lied to him for Joaquin Kowalczyk, and owned it when it came out — and that you wrote to him afterwards."*
- **On his set.** He keeps his character — before, a director who came back was rolled a new trait. The crew row says what he remembers, and so does the first-day message.
- **A co-star who is a real actor of the world** remembers too, even if they never entered your phone. On the next shoot together they start where it left off, warmer or colder, and say why.

## How it is built — no new scale

- **`meta/memory.js`** — one ledger, created lazily so old saves load untouched.
  - **People:** keyed by a permanent id — the phone's person, or the world's actor — never a name.
  - **Events:** the act, the film and year, the witnesses, and how **each** person took it, with the reason in words. One cover is a kindness to the co-star and a lie to the director.
- **`career/cover.js`** — the story, run by the existing career-story mechanism.
- **Doors** — only the existing grudge (`sendsOffers`, the board, "directs you again"). One event changes Standing at most once, and the lie never does.
- **Bugs found and fixed on the way:**
  - a director who came back got a new random character;
  - the phone said "warm, 52" while the set said 34 and the grudge was open;
  - the screen created the ledger just by being looked at;
  - the Directors screen would have filed this grudge as "turned down a part".

## Tests

- `tests/test_cover.mjs` — every outcome, every kind of director, the door and its reason, the way back, the meeting years later, a save in between, an old save with no ledger.
- `tests/test_arcs.mjs` now also runs every choice of the chain and holds what it does to what it says. Checked by breaking it on purpose: it caught a door that shut without saying so.
- Full suite 97/97.

## Screenshots

Taken in the real game, on a copy of Alex Moon's save, in `screenshots/`:
- `cover-1-the-ask.jpg`
- `cover-2-it-comes-out.jpg`
- `cover-3-the-door-shut.jpg`
- `cover-4-years-later-offer.jpg`
