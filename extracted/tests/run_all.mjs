// Runs every test_*.mjs in this folder and prints one line per file. Exit code 1 if any
// failed. test_people.mjs is skipped unless --people is passed (it needs jsdom and a fresh
// dist/game.html). Three files — test_story, test_awards, test_franchise, test_health —
// sit on random thresholds and can fail one run in twenty; rerun before believing them.
//
//   node tests/run_all.mjs
//   node tests/run_all.mjs --people
//
// test_scales is the slow one: about 100 seconds on its own and more under load, which is
// why the per-file timeout is 300s. A file that reports FAIL with no message underneath it
// timed out rather than failed.
import { readdirSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const withPeople = process.argv.includes('--people');
const files = readdirSync(here).filter((f) => /^test_.*\.mjs$/.test(f) && (withPeople || f !== 'test_people.mjs')).sort();
let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(here, f)], { encoding: 'utf8', timeout: 300000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const ok = /all passed/.test(out);
  if (!ok) failed++;
  const fails = out.split('\n').filter((l) => /^FAIL|Error/.test(l)).slice(0, 4).join('\n      ');
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${f}${ok ? '' : '\n      ' + fails}`);
}
console.log(`\n${files.length - failed}/${files.length} passed`);

// ── and the linter, which was here all along and nobody ran ───────────────────
// oxlint has been a devDependency with an npm script since the start of this project. The first
// time anybody ran it, it found 314 things — including TWO whole features switched off behind
// `false &&` that no player could reach, and one of them (the awards campaign) had just been
// rebuilt without anybody noticing the door was locked. It had been telling the truth into an
// empty room for a year. A check nobody runs is not a check, so it runs here.
//
// .oxlintrc.json keeps only the rules that catch a real mistake and turns the matters-of-taste
// off, because a warning nobody acts on teaches you to scroll past the output.
const lint = spawnSync('npx', ['oxlint'], { cwd: path.join(here, '..'), encoding: 'utf8', shell: true, timeout: 180000 });
const lintOut = (lint.stdout || '') + (lint.stderr || '');
const lintBad = / error /.test(lintOut) || /Found \d+ error/.test(lintOut);
console.log(`${lintBad ? 'FAIL' : 'PASS'}  lint`);
if (lintBad) console.log('      ' + lintOut.split('\n').filter((l) => / error /.test(l)).slice(0, 6).join('\n      '));

// ── and one life, played through the real interface ──────────────────────────
// Every other test in here calls engine functions directly, and so do all 44 probes. Not one
// of them touches a screen — which is why the whole suite was green on the day a negotiation
// room had four buttons that did nothing at all. This presses them. Eighteen seconds for one
// life of about 130 screens; `node tests/autoplay.mjs 5 600` for a longer look.
const play = spawnSync(process.execPath, [path.join(here, 'autoplay.mjs'), '1', '200'],
  { encoding: 'utf8', timeout: 180000 });
const playOut = (play.stdout || '') + (play.stderr || '');
const playBad = play.status !== 0 || /THINGS THAT THREW/.test(playOut);
console.log(`${playBad ? 'FAIL' : 'PASS'}  autoplay`);
if (playBad) console.log('      ' + playOut.split('\n').slice(-14).join('\n      '));

process.exit(failed || lintBad || playBad ? 1 : 0);
