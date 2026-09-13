# Tests and probes

Everything here runs on plain Node (v20+), no framework, straight against `../src`.

```
node tests/run_all.mjs          # the battery — every test_*.mjs, one line each
node tests/test_standing.mjs    # one file, every check named
node tests/probes/probe_combo.mjs   # a measurement, not a test (see below)
```

## What a test is

Each `test_*.mjs` builds a life with `createInitialState` + `beginLife`, sets it to a
known point, calls the system under test, and asserts with `ok(name, condition, evidence)`.
The names are sentences — read them as the spec. When a rule changes on purpose, the test
that encoded the old rule is updated with a comment saying why, never deleted.

The tests never parse `.jsx`. UI errors are caught only by `node build-singlefile.mjs`
and by opening the game. A green battery does not mean the screen renders.

Four files sit on random thresholds and fail roughly one run in twenty: `test_story`,
`test_awards`, `test_franchise`, `test_health`. Rerun before believing a failure there.

`test_people.mjs` renders the built `dist/game.html` in jsdom (`npm i` first, and build
first). `run_all.mjs` skips it unless you pass `--people`.

## What a probe is

`probes/` are measurements. They play whole careers with bots — `perfect` (prepares,
rehearses with everything, argues the version, trains), `ordinary` (sometimes), `drifting`
(presses the button) — and print the shape of the ladder: at what age the A-list and Icon
are reached and by how many of 25 lives, where standing bottoms out, which Fame × Respect
combinations a career passes through. **Every balance change in this game was checked
against `probe_combo.mjs` (the three players) before it was kept.** If you touch a number
in `castings.js`, `production.js`, `release.js`, `status.js` or `standing.js`, run it and
compare to the numbers in the commit messages.

The bots are crude on purpose: they never open email except the agent letter, never date,
never Bond with a crew. They measure the ladder, not the life.
