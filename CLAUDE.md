# Famous or Forgotten

A browser actor-career simulation. One life from birth to whatever it becomes. Plain React with
inline styles, no Tailwind, no component library, no runtime dependency except React itself. It
ships as a single HTML file.

## Commands

```
cd extracted
node build-singlefile.mjs      # -> dist/game.html, then cp dist/game.html ../game.html
node tests/run_all.mjs         # 60 test files + lint + a played-through life
npm run dev                    # vite on :5173
node tests/autoplay.mjs 4 600  # four lives, 600 clicks each, through the real interface
```

The game Maxi plays is `game.html` at the repo root. A build that is not copied there has not
shipped. Saves live in the browser's localStorage under `fof_react_save` and are per-origin:
opening `game.html` from disk and opening `localhost:5173` are two different saves.

## Architecture

- `engine/` imports nothing from `systems/`. `systems/` imports from `engine/`. UI imports
  systems and never the other way round.
- Single write points: `setFame`, `setRespect`, `setQuote`, `applyBond`. Nothing else assigns
  those fields.
- Some tables are duplicated on purpose to avoid an import cycle, and say so in a comment.
  Do not "fix" one by importing across the boundary.
- Old saves must keep loading. New state is created lazily (`marketOf(s)` is the pattern).

## What the stats mean

- **Fame** — how many people know your name. Awareness, nothing more.
- **Hype** (`s.media`) — what is being said this month. Scandal hype does not sell tickets.
- **Respect** — prestige. Critics, awards, the people who can give you work you want.
- **Heat** — `heatOf()` in `world/world.js`: recent gross and quality over a three-year window,
  plus awards, minus age. It drives world rank. **Fame is not Heat.**
- Commercial, critical and career outcomes are three separate verdicts and are shown apart. A
  film is allowed to lose money, be the best-reviewed thing of its year, and make your career.

## Rules that cost something to learn

**Look for the existing one first.** This codebase is larger than it reads. `heatOf` already
existed when a brief asked for Heat. `typeFit` already existed when one asked for casting fit.
Sixteen minigames already existed when one asked for minigames. A second implementation of
something becomes a second source of truth and drifts within a month.

**The tests do not parse `.jsx`.** Only `node build-singlefile.mjs` catches a JSX error. Build
before claiming a UI change works.

**Check the probe before believing it.** Measurement has been wrong more often than the model
this week: a harness that recorded a genre's appetite after that year's releases reported a
boom where there was a slump; one that pinned a film's rating at 92 reported a 100% hit rate;
one that scraped a year off the screen reported every life reaching "2048", which is the arcade
game in the phone. A number that comes out the same three runs running is a reason to check the
instrument.

**Patch by exact string match.** A script that deleted dead one-line functions by walking to the
closing brace at the same indentation sailed past a function that closes on its own line and
deleted the next one with it — an exported handler, gone, with a green build and 60/60 tests.
Prefer the Edit tool. Never brace-walk.

**A button that does nothing is worse than a button that refuses.** Several handlers returned
early and silently when their object was missing, so the screen looked broken. If an action
cannot happen, say why on the control, before it is pressed, not in a footnote underneath.

**`false &&` is not how a feature is switched off.** Two whole features were unreachable this
way for a year, one of them rebuilt in the meantime without anybody noticing the door was
locked. Delete it, or fix it.

**Write the rules off the component, never off the comment above it.** Explaining the fourteen
minigames, I wrote six of them from memory: a long-press that does not exist, a probe that does
not exist, training that widens the timing band when it is difficulty, "one bad take ends the
scene" for a game that scores it zero, a motive puzzle described as one question when it is a
consistency test across three. A wrong rule is worse than no rule — the player trusts it and
loses the scene by it. Open the file and read what the handler does.

## Working style

- Be concise after tool use. Do not paste raw test or simulation output; print a summary and
  keep the detail in the probe.
- Read the file or the range, do not ask for whole files to be pasted in.
- Do not re-audit a system that is not being touched.
- Do not redesign an unrelated system during a feature task.
- Game-logic changes run the full suite. UI changes also build and open in the browser.
- Reports: what changed, tests, what is still broken. Short.
