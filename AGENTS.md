# Famous or Forgotten — for Codex

Read three files, in this order:
1. `CODEX.md`, the brief: what the game is, how to run it, where things are. Its test counts are old: the suite is now 102 files plus a played-through life and a played-through career.
2. `CLAUDE.md`, the rules, whoever writes the code: the architecture boundaries, the single write points, old saves that must keep loading, and "Rules that cost something to learn".
3. `extracted/docs/ROADMAP.md`, the plan and what comes next.

This file only adds how two agents share one repository.

**GitHub is behind on purpose.** Maxi allows each push himself, so the local `main` is often a few commits ahead of `origin/main`. The local repository is the truth. `burnout-core` is an old, merged branch, not the current one.

## Sharing the folder with Claude (Maxi, 2 Nov)

One folder, `C:\Users\maximilian\Desktop\game`, and one order of work: **Claude changes the code
and commits → you review → Claude checks and integrates what you found or fixed.** Claude stays
responsible for what goes into `main`.

### Two modes (Maxi, 2 Nov). The task says which; if it does not, it is AUDIT ONLY.

**AUDIT ONLY** — you change no code. Read, run the tests and the build, play, investigate, and
propose fixes in the report. Do not edit anything under `extracted/src/` or `extracted/tests/`.

**AUDIT + SMALL FIXES** — you may fix a bug yourself when all of these hold:
- you reproduced it, and the report shows how;
- the fix is small and local, and does not change a mechanic or the balance;
- you add a regression test, and say whether it fails on the code before your fix;
- you leave the change **uncommitted** in the working tree, with a report: the cause, the files
  changed, the tests, and the risks;
- you do not commit, merge or push, and you do not change the branch.
Claude then checks it independently (reads the diff, runs your test against the old code, runs
the suite) and only then commits it to `main`.

**Always propose, never implement** — even in the second mode: architecture, a new mechanic, a
change to the balance, contract rules, and anything about saves (what is stored, how old saves
load). Write the proposal in the report.

**One working tree, so one writer at a time.** Before you edit, `git status` must show no changes
to tracked files: if it does, Claude is working — do not edit, report only. Claude does not start
on code while your uncommitted fix is waiting; it reviews yours first.
- **Your reports go in `codex-reports/`** at the repository root, one file per review, named by
  date and the commit you reviewed, e.g. `codex-reports/2026-11-02-ed86a87.md`. Name the commit
  at the top. For each finding give the file and line, what happens, and how you saw it. Claude
  reads the folder and commits the reports.
- **Never touch git state.** No checkout, switch, pull, merge, reset, stash or commit. Changing the
  branch or the files changes them for Claude in the middle of its work. If `git status` shows
  uncommitted changes, Claude is working: wait, or review the last commit (`git show`, `git diff
  HEAD~1`) without touching the working tree.
- **Building writes `extracted/dist/game.html`.** Do not build while Claude is building. Never copy
  anything to the root `game.html`: that is the shipped game.
- **Never push.** Maxi allows each push himself.
- **The plan is `extracted/docs/ROADMAP.md`.** Before reporting something as missing, search for
  the existing one: `heatOf`, `typeFit`, the minigames and the freeze/thaw in
  `career/stability.js` all existed when a brief asked for them again. A finding that is already
  planned says which step.
- **Already done, do not repeat:** the on-set audit of 23 Oct (all 16 scenes, keep 8 / redesign 5 /
  2 to story choices / remove 1) is the basis of ROADMAP Step 3.
- **Saves:** never edit the untracked `saves/` folder. Copy a save out to test with it.

## How to check

```
cd extracted
node tests/run_all.mjs                        # the suite, lint, a played-through life and career
node build-singlefile.mjs                     # the only check that parses .jsx
node tests/autoplay_career.mjs stress 5 1200  # random careers through the real interface
```

Then play the changed screen in `extracted/dist/game.html`. A green suite does not prove a screen
says anything (see CLAUDE.md). A finding without the way to see it is not a finding.

## Reports

They go to Maxi, a producer, not a programmer, and to Claude, who fixes them. Write them in Russian,
short and in plain words. Open with the commit you reviewed and the verdict; then each finding with
how serious it is, the file and line, and how to see it; then what you checked and found fine.
