// Runs every test_*.mjs in this folder and prints one line per file. Exit code 1 if any
// failed. test_people.mjs is skipped unless --people is passed (it needs jsdom and a fresh
// dist/game.html). Three files — test_story, test_awards, test_franchise, test_health —
// sit on random thresholds and can fail one run in twenty; rerun before believing them.
//
//   node tests/run_all.mjs
//   node tests/run_all.mjs --people
import { readdirSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const withPeople = process.argv.includes('--people');
const files = readdirSync(here).filter((f) => /^test_.*\.mjs$/.test(f) && (withPeople || f !== 'test_people.mjs')).sort();
let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(here, f)], { encoding: 'utf8', timeout: 180000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const ok = /all passed/.test(out);
  if (!ok) failed++;
  const fails = out.split('\n').filter((l) => /^FAIL|Error/.test(l)).slice(0, 4).join('\n      ');
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${f}${ok ? '' : '\n      ' + fails}`);
}
console.log(`\n${files.length - failed}/${files.length} passed`);
process.exit(failed ? 1 : 0);
