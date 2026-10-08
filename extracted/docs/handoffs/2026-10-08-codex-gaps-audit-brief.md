# Audit brief: gaps, bugs and dead features — Famous or Forgotten

You are auditing, not fixing. Find what is broken, what is lost, and what is dead, prove each
finding with the real code, and report. **Do not change anything under `extracted/src/`.**

## Before you start

1. Read root `CODEX.md`, then `CLAUDE.md`, then `extracted/DESIGN.md` (DESIGN.md is out of date
   in places — trust the code over it, and note where they disagree).
2. Base: `origin/main`. Record the exact commit you start from at the top of your report. It must
   be `30ac735` or later; if it is older, stop and say so — you would be auditing code that has
   already been fixed.
3. Work on a new branch `audit/gaps`. All commands run from `extracted/`:
   `npm install`, `node build-singlefile.mjs`, `node tests/run_all.mjs` (expect all green before
   you begin; if not, report that first).

## What to look for

**1. State lost in transitions — the most important area.** This codebase has repeatedly lost
data when an object is rebuilt by hand at a boundary: a field exists during a scene and is gone
after the next step. Trace every boundary below with the real functions and seeded JSON
round-trips, and list every field that is set before and missing or reset after:
- offer → contract paper → signing → production (`contract.js`, `standoff.js`, `production.js`)
- production → wrap → release in post → opening → closed credit (`production.js`, `release.js`)
- credit → sequel / renewal / next season offer (`franchise.js`, `chapter.js`, `bubble.js`)
- freeze → thaw, collapse, recast (`stability.js`, `contract.js`)
- event / story → timeline → filmography (`meta/stories.js`, `meta/aftermath.js`, `meta/press.js`)
- night out / party → lead → offer (`social/night.js`)
- save → load (`state/store.js` `normalize`): what an old save is missing that new code assumes

**2. Dead features.**
- Fields written and never read; fields read and never written. `tests/probes/probe_state.mjs`
  is a lead generator, not a verdict: it reports false positives for object shorthand, spread and
  fields that arrive from a save. Confirm each one by hand.
- UI that promises something the simulation never does: a button, a line of copy or an option
  whose stated effect has no code behind it. (Example already found: five contract perks that
  were stored and never read — now hidden; see "Already known".)
- Exported functions nothing calls; branches that can never be reached; `false &&`; handlers
  that return early in silence so a button does nothing.

**3. Two sources of truth.** The same rule computed in two places that can disagree (example
already fixed: the billion club read the flag in one screen and the money in another; directors'
work routes that checked `cold` but not the grudge). Find the remaining ones.

**4. Text that says something false.** Copy that states a rule, a date, a cause or a consequence
the code does not implement (example already fixed: "will not call you again" for a grudge that
ended in two years). Write rules off the handler, not off the comment above it.

**5. Old-save gaps.** Features that only exist on objects created after the feature was added
(example: of 52 credits in a long real life, only 4 have `character`, 2 have `critical`/`career`).
Say which gaps are derivable from data the save already has and which are not.

## How to prove a finding

- Reproduce it with the real systems in node (seeded `Math.random`, JSON round-trips) or through
  the built game in jsdom (the `tests/test_screens.mjs` pattern: real `dist/game.html`, real
  buttons). No finding from reading alone if it can be run.
- Measure it: "lost in 300 of 300 seeded runs", "4 of 52 credits", not "sometimes".
- Check the probe before believing it: a number that comes out identical three runs running, or a
  100% rate, is a reason to check the instrument first (see CLAUDE.md, "Check the probe").
- Real data you may read (do not modify): `playtest/directors-4.json` (in the repo), and
  `famous-Alex-Moon-53-2079.json` — a long real life, not in git; use it if the owner attached it.
- Commit each reproduction as a probe in `extracted/tests/probes/` that prints its measurement and
  exits 0. Probes describe the current behaviour; they are not fixes.

## Already known — do not report again

Fixed: contract settlement and TV continuation (your previous patch), the meeting season number,
"Discuss" after a handshake, legacy billion-club flags, the directors' grudge across every work
route, the Directors bar sentence, ratings with a decimal comma.
Known and parked: the five hidden contract perks (`standoff.js` `NOT_YET`) and their missing
effects; `wrappedAt` (the wrap-party text only fires for brand campaigns); `runStory` and the best
set `moments` discarded when a run closes; `meterAtClose`, `take` and the sequel `direction` not
shown in the filmography; DESIGN.md's "smash = 4× budget" (the code uses 2× what the film
needed); casting directors counted as directors; the autoplay check failing on jsdom's harmless
"navigation to another Document" message.

## Out of scope

Balance and probability changes, rewriting prose or voice, the App.jsx split ("Wave 2"), new
features, and any edit under `extracted/src/`.

## Deliverable

1. `extracted/docs/handoffs/<date>-gaps-audit.md`:
   - first, **a short summary in Russian** for the owner: the ten worst things a player would
     notice, in plain words, one line each;
   - then one table per area (1–5 above) with columns:
     `ID | severity | where (file:line) | what the player sees | how to reproduce (command, seed) | measured | smallest fix | risk of the fix`.
     Severity: **wrong** (the game does the wrong thing), **lost** (a choice or fact silently
     disappears), **dead** (code or UI with no effect), **false text**, **cosmetic**;
   - then the top 10 across all areas, ranked by what a player would actually notice.
2. The probes under `extracted/tests/probes/`.
3. `node tests/run_all.mjs` still green, and `git diff --stat` showing no change under `src/`.
4. Deliver as `git format-patch` against your base commit, as last time.
