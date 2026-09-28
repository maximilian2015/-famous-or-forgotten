# Brief for a coding agent — Famous or Forgotten

You have the repository. Read this file first and nothing else in the root: the root is
where this project keeps its old archives, installers and recordings, and none of it is
current. **All the code is in `extracted/`.**

Anything in the root that looks like a briefing — `START_HERE_GPT.md`, `HANDOFF_FOR_GPT.md`,
`FOR_CHATGPT.md`, `TASKS_FOR_GPT.md` — is from an older workflow where the game was handed
over as a zip attachment. It is stale. Ignore it.

`extracted/DESIGN.md` is the design bible and is genuinely useful for *why* numbers are what
they are — but it was last updated on 2026-09-13 and does not know about nine systems added
since: `career/collab.js`, `career/chapter.js`, `career/bubble.js`, `career/scenework.js`,
`world/directors.js`, `career/youngblood.js`, `meta/aftermath.js`, `social/posting.js`,
`life/regard.js`. Trust the code over the document wherever they disagree, and do not
"correct" code to match it.

---

## What this is

A single-player life simulation about an acting career, played a month at a time from
childhood to death. It builds to **one self-contained `game.html`** with no server and no
network calls. Around 133 source files, 57 test files.

The game is in English. The person who owns it writes in Russian; you do not need to.

---

## Getting it running

```bash
cd extracted
npm install
node tests/run_all.mjs          # 56 test files, ~2 minutes. Must print "56/56 passed"
node build-singlefile.mjs       # writes dist/game.html
```

The build is Vite + React, bundled to a single IIFE with everything inlined.

### The one rule that will catch you out

**The tests never parse `.jsx`.** They import from `src/systems/` and `src/engine/` only. A
syntax error, a bad import or an undefined variable anywhere in `src/App.jsx`,
`src/ui/**`, or `src/phone/**` will pass all 56 test files and then produce a blank screen.

So: **run `node build-singlefile.mjs` after every change that touches a `.jsx` file.** If it
builds, the JSX parses. If you changed UI behaviour, also open `dist/game.html` in a browser
and look at it — a build success does not mean the component renders.

---

## Layout

```
extracted/
  src/
    engine/      time, rng, energy, cooldowns, ids, timeline, sets, economy, stage
    state/       the store and the save
    systems/
      career/    offers, castings, contracts, production, scenes, release, awards,
                 franchise, bubble, collab, chapter, favours, agent, typecast-adjacent
      life/      family, dating, children, health, money, bonds, regard, interactions
      meta/      status (fame/respect/quote), hype, press, standing, typecast, aftermath
      social/    spotlight (school), posting (the account)
      world/     the world outside you: rivals, directors, titles, yearbook
    ui/          shared components and theme
    phone/       the in-game phone and its apps
    App.jsx      the screens
  tests/         test_*.mjs plus tests/probes/
```

### Architecture rules, which are enforced by convention and not by a linter

- `engine/` imports nothing from `systems/`. If you need to break this, you have the design
  wrong.
- `systems/` may import `engine/` and other `systems/`. Watch for cycles: several files
  (`career/bubble.js`, `career/trouble.js`, `career/risk.js`) deliberately **duplicate a
  small table** rather than import it back from a module that imports them. There is a
  comment at each one saying so. Keep that pattern.
- UI imports systems. Systems never import UI.
- **Single write points.** Fame, standing and your fee are only ever written through
  `setFame`, `setRespect` and `setQuote` in `systems/meta/status.js`. Closeness is only ever
  written through `applyBond` in `systems/life/bonds.js`. Assigning `s.fame = ...` directly
  anywhere is a bug even if the number comes out right.

---

## What counts as a bug here

Real, and worth reporting:

- a number that can run away, compound, or go negative where it should not
- a value read before it is written, or written and never read
- state that persists across a life, a save, or a `JSON.parse` round trip when it should not
  (the save is plain JSON — object identity is **never** preserved; anything matched by
  reference after a reload is a bug, and there is history of exactly this)
- a deadline, cooldown or counter that is displayed but never decremented
- a branch that cannot be reached, or a feature with no UI surface at all
- text that prints `undefined`, `NaN`, `[object Object]`, or a doubled pronoun
- an offer, moment or modal that can be created but never dismissed

**Not** a bug, and please do not "fix" these:

- deliberate harshness. A career is meant to be mostly disappointment. Films flop, people
  drift away, the Askers are meant to be rare. Before calling a probability wrong, read the
  comment above it — the reasoning and usually the measurement is written there.
- the prose. Every string is written in a specific voice on purpose. Do not tighten it,
  do not make it neutral, do not remove the commas.
- long comments. They carry the reasoning and the measurements. They are load-bearing.
- English spelling and the em dashes.

---

## How to find bugs here, in the way that has actually worked

Reading for it is slow. Measuring is fast. The method:

1. Write a throwaway probe as an `.mjs` file that imports the systems directly, runs a few
   hundred simulated careers or a few thousand ticks, and prints a distribution.
2. Look for the impossible value, not the average: the maximum, the minimum, the count of
   zeroes, the number that only ever goes up.
3. **Check your probe before you believe it.** More than half the "bugs" found this way have
   turned out to be the probe measuring the wrong field. If a result is surprising, verify
   the probe reproduces a known-good number first.
4. For dead code, run the suite under V8 coverage:
   `NODE_V8_COVERAGE=cov node tests/run_all.mjs` and look for functions at zero — then check
   by hand whether the UI calls them, because the tests do not import `.jsx`.

`tests/probes/` has existing examples of the shape.

---

## Already known — do not report these as findings

- **Money compounds.** A well-played career ends around €1bn across ~100 credits. The cause
  is known: there is no limit on how many films you can make, so volume, not fee, is the
  problem. A redesign is planned.
- **The Asker campaign is being rebuilt.** As it stands you buy it on the offer, before the
  film is shot, it costs 15% of the fee, and it does not affect the nomination at all — only
  the win, by about six points. Yes, that is nearly worthless. It is known and it is being
  replaced.
- **The television release model is flavour text.** `release.js` prints a different premiere
  line for a soap, a prestige series and everything else, and it has no mechanical effect.
  Known; being built.
- `advanceUntilSomething` for childhood and `liveUntilSomething` for the rest of life look
  duplicative. They are: one steps by year, the other by month. Leave both.

---

## Reporting

For each finding: **the file and line, the cause in one sentence, and how to reproduce it** —
ideally a probe or a failing test I can run. A claim without a reproduction is not useful
here, and a confident wrong claim costs more than silence.

Then propose the **smallest** fix. If a fix needs a number changed, say what you measured
before and after.

If you change code: run the tests, run the build, and say plainly what passed and what did
not. Never report something as working without having run it.
