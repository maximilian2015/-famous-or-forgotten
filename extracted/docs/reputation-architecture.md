# On-set conflicts, professional reputation, and memory — architecture proposal

Proposal only. **No code has been changed for this.** Read from the code on 24 Oct 2026.

## 1. What already exists — and it is more than it looks

The game already keeps the two kinds of reputation apart:
- **Public scandal** — `s.scandal`, hype from a scandal source.
- **Professional standing** — `s.respect`, shown as Standing.

| Piece | Where | What it already does |
|---|---|---|
| **Standing rungs** (fame × standing) | `meta/standing.js comboOf` | "The face" (*everyone knows the name, nobody good wants it on their film* — Alex Moon is on it right now), "difficult", "liability", "tale". Crews arrive colder (−12), casting rooms have heard (×0.85), prestige work shuts, insurance shuts for the liability, the agent drops you. **This is the Lohan arc, and it is already in the game.** |
| **Insurability** | `life/strain.js` | Falls with each shoot that stopped because you burned out, and with heavy drinking. Multiplies casting odds and tentpole chances; "the bond company has a file". |
| **Walk-offs** | `production.js walkOffSet` → `s.walkedOff` | Remembered 36 months; risk "a lawyer has the paper"; −15 on the studios reading; **a grudge** for that director. |
| **Grudges** | `meta/stories.js` | `{ who, title, until }`. A grudge closes that person's offers, the tentpole board and "directs you again" until it expires. A two-beat chain ("The one you passed on") offers a reconciliation: write to them, on charisma. |
| **The rumour** | `meta/trouble.js startRumour` | A director who went cold at wrap "tells people you were difficult": six months, casting reads ×0.82, risk "Difficult". |
| **Box-office poison** | `s.poisonUntil` | Two bombs, or losing a standoff badly: 12 months of closed doors. |
| **The press on a set** | `meta/press.js setPieces` | A cold set (director below 30, bad work, two months in) has a 35% chance of a gossip piece if you are famous enough. The media does **not** know every private conflict. |
| **Risk warnings** | `meta/risk.js` | Every trouble is announced on the main screen at least a month before it can land. |

## 2. What is missing

1. **Nobody remembers a deed, only a number.** Apart from a walk-off grudge, "Ulrich remembers Vanished Margo" cannot be written.
2. **The four director traits (`perfectionist`, `chill`, `difficult`, `diva`) are shown on the crew card and read by nothing.**
3. **A creative fight and unreliability are the same thing to the game.** Both are just "the bond went down".
4. **The rumour is global and the same size for everybody.** A minor director's word weighs what a legend's does, and it does not travel through the people who actually know him.
5. **Insurability never recovers.** `s.burnouts` only ever goes up, so three bad years at 30 still cost you at 60. There is no "prove it on a small film" way back.
6. **Co-stars below 60 are forgotten completely**, so a co-star cannot remember anything.
7. **The reasons are not on the screen where they matter.** The offer card does not say who is behind a door, or why it is shut.

## 3. The architecture — one ledger, no new scale

### 3.1 The ledger: `s.memory`

One list of deeds, keyed by the person (a name, plus `worldId` for actors of the world):

```
{ who, worldId?, kind, title, year, weight, public }
```

**Written by the moments that already happen.** Every one of these already writes a log line today:
- the on-set asks (`demands.js`);
- a walk-off;
- a set stopped by burnout;
- a scene fight, a pushed script;
- a great day that saved a shoot.

Lazily created, so old saves keep loading (the `marketOf(s)` pattern).

**Three families of deed:**

| Family | Examples | Who cares |
|---|---|---|
| **Creative** | fought for the scene, pushed your version, improvised against direction | the director — for or against you, depending on the trait and on whether it worked |
| **Reliability** | walked off, the shoot stopped because of you, drunk on set, lost days | everybody with money in it: the director, producers, insurers |
| **Loyalty** | covered for a co-star, reported a co-star, backed the director against the money | the co-star and the director, in opposite directions |

**A deed cools.** Half its weight every three years, so nothing is forever.

### 3.2 The trait decides how a deed weighs — and the player sees it first

| Trait | Creative fight | Unreliability | Covering for a co-star |
|---|---|---|---|
| perfectionist | ×1 if the scene got better, ×2 against you if it did not | **×2** | ×1.5 against you |
| chill | ×0.5 | ×0.5 | forgiven (×0.3) |
| difficult | ×1.5 against you | ×1 | uses your admission against you |
| diva | ×2 against you if you upstaged them | ×1 | ×1 |

Before the choice, the option's hint reads the trait and the ledger. For example: *"Ulrich is a perfectionist, and this would be the second schedule problem he has seen from you."*

### 3.3 What reads the ledger — every door is an existing one

- **A grudge.** When the cooled weight of a person's deeds passes a line, that person's existing grudge is created, with the deed as its reason. The grudge already closes their offers, the board, and "directs you again" — nothing new.
- **Influence.** The existing rumour starts from deeds, not only a cold wrap, and its reach is the teller's `industryWeight`:
  - minor — his own projects only;
  - a heavyweight — the casting rooms (the existing ×0.82) and colder crews.
  - It does not travel through a contact graph, because the game has none — people in your phone are not linked to each other. Building one would be a new system; using the weight is not.
- **Insurability.** Reliability deeds from the last few years replace the permanent burnout count. So it falls with what you did lately and comes back when you stop.
- **Standing.** It moves through `setRespect`, as it does now, and only from reliability deeds. A creative fight that worked can even raise it with a director who respects that.
- **The press.** A deed is `public` only if it stopped a production or happened in front of the crew of a famous enough picture. The existing `setPieces` writes it up then, and only then. A private disagreement never reaches the papers.
- **The screen.**
  - The offer card gets one line of history ("Ulrich Beaumont asked for you — he remembers how you saved Vanished Margo").
  - A shut door says why on the Directors screen and on the control itself: "Ulrich will not work with you: the dispute on Vanished Margo (2074)."

### 3.4 The way back

- **Time.** Deeds cool, grudges expire (they already have `until`).
- **Reconciliation.** The existing "write to them" beat, opened to every grudge, not only the one from a part you passed on.
- **Proof.** A finished shoot with no reliability deed raises insurability. A small, cheap film is the fastest proof — that is the Lohan comeback, built from the same ledger.
- **Somebody vouches.** A heavyweight in your phone at 75+ who has a good deed of yours on record weakens a rumour from somebody lighter.

## 4. One full example

**2074 · Vanished Margo** — Ulrich Beaumont directing (perfectionist, industry weight 88).
- Month 3, the on-set ask: *"They have lost four days to weather and want six-day weeks."* You hold them to five.
  - Today this is a bond move and nothing more.
  - With the ledger, the hint before the choice reads: *"Ulrich is a perfectionist. Your contract says five, and he will remember that you used it."*
  - Deed: `reliability`, weight 1 — the contract, not a failure — ×2 for a perfectionist.
- Month 5, a scene day: you argue for your version, and the take is worse.
  - Deed: `creative`, failed, ×2 for a perfectionist.
- Wrap: Ulrich is at 24.
  - The existing rumour starts, with weight 88, so the casting rooms hear it for six months.
  - The ledger total passes the line, and a grudge is created: *"the dispute on Vanished Margo"*.
  - The set had been cold for two months and you are famous: 35% chance of the existing gossip piece. If it runs, it is the only public trace.

**2078 · four years later.**
- Ulrich's new picture is on the board. You fit it.
- The row on the board says: *"Ulrich Beaumont will not work with you — the dispute on Vanished Margo (2074)."* The existing `onTheBoard` already says no; now it says why.
- The deeds have cooled to about 40% of what they were.

**2079 · the way back.**
- You make a small film with a chill director and nothing goes wrong. Insurability recovers.
- The "write to them" beat opens for this grudge. The odds are on charisma, plus the cooled weight, plus whether a heavyweight in your phone has a good deed of yours.
  - **If it lands:** the grudge ends; Ulrich's next offer arrives with *"He has not forgotten Vanished Margo. He has decided it was the film's fault."*
  - **If it does not:** it stays, and the reason stays on the screen.

## 5. Co-stars and long memory

- An actor of the world (`worldId`) gets a ledger entry even below 60 — the deed is remembered even if the friendship is not.
- **Where it can show, through existing doors:**
  - the star co-star the game puts beside you on a supporting part (`production.js`) — a star with a grudge is not cast, and the offer says so;
  - the two-hander offer (`stories.js` rival chain, `costarId`);
  - asking a star to co-star (`collab.js`), which already reads the relationship and can read the reason;
  - parties (`night.js`).
- **The cover chain:**
  - covering → the co-star's deed `loyalty +`, and a hidden risk;
  - one or two beats later, through the career-story mechanism, the lie can come out → the director's deed `reliability −`;
  - years later, the co-star (now bigger, or not) is the one who asks for you — or does not.

## 6. In what order to build it

1. The ledger and the trait weights, written by the existing on-set asks. No new screens, just the reasons on the existing controls and in the grudge text.
2. The grudge from deeds, and the reason on the board and the Directors screen.
3. Insurability from recent deeds instead of the permanent burnout count (the way back).
4. The cover chain, with the co-star's memory.
5. Rumour reach by `industryWeight`; the press only for public deeds.

**Nothing in this adds a new scale.** Every consequence goes through a door that already exists: grudges, `onTheBoard`, `sendsOffers`, `rumourFactor`, `insurability`, `coldStart`, `setRespect`, `setPieces`.
