# Famous or Forgotten — for Codex

Read three files, in this order:
1. `CODEX.md`, the brief: what the game is, how to run it, where things are. Its test counts are old: the suite is now 101 files.
2. `CLAUDE.md`, the rules, whoever writes the code: the architecture boundaries, the single write points, old saves that must keep loading, and "Rules that cost something to learn".
3. `extracted/docs/ROADMAP.md`, the plan and what comes next.

This file only adds how two agents share one repository.

**GitHub is behind on purpose.** Maxi allows each push himself, so the local `main` is often a few commits ahead of `origin/main`. The local repository is the truth. `burnout-core` is an old, merged branch, not the current one.

## Sharing the repository with Claude

- **Your folder is `C:\Users\maximilian\Desktop\game-codex`**, a git worktree on its own branch
  (`codex/ui`). Work there. `C:\Users\maximilian\Desktop\game` is Claude's checkout. Do not edit
  files in it.
- **One branch per task**, cut from `main`. Never commit to `main`, never merge into it, never
  push. Maxi decides what is merged and when, and only he allows a push.
- **The plan is `extracted/docs/ROADMAP.md`.** A new idea goes into a section of it, not into a
  parallel system. Before building something, search for the existing one (`heatOf`, `typeFit`,
  the minigames and the freeze/thaw in `career/stability.js` all existed when a brief asked for
  them again).
- **Your area is the interface**: how screens look and read. Game rules, numbers, events and NPCs
  live in `src/systems/` and `src/engine/`. If a screen needs a rule changed, write down what and
  why in your report instead of changing it.
- **Saves:** never edit the untracked `saves/` folder. Copy a save out to test with it.

## Before you call something done

```
cd extracted
node tests/run_all.mjs          # the suite, lint and one played-through life
node build-singlefile.mjs       # the only check that parses .jsx
```

Then open `dist/game.html` and play the screen you changed. A green suite does not prove a screen
says anything (see CLAUDE.md).

## Reports

They go to Maxi, a producer, not a programmer. Write them in Russian, short and in plain words.
Cover what changed, the tests, and what is still broken.
