// A hunt for the bug that has bitten three times: a function the player triggers that returns
// early and silently, so the screen does nothing and they conclude it is broken. The awards
// campaign, the negotiation room and chooseApproach were all this.
//
//   node tests/probe_silent.mjs
//
// It reads source, so it is a lead generator, not a verdict: every hit needs looking at. What it
// looks for is an exported function whose first argument is the state — the shape every player
// action has in this codebase — containing a `return s` that is not preceded by anything being
// said (s.lastEvent, addTimeline, a thrown value) anywhere in its guard.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(fileURLToPath(new URL('../', import.meta.url)), 'src');
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.jsx?$/.test(e.name)) files.push(p);
  }
})(root);

// Actions the UI can dispatch: exported, and the first parameter is the state.
const ACTION = /^export function (\w+)\(s(?:,|\))/;
const hits = [];
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  let fn = null, start = 0, depth = 0;
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    const m = L.match(ACTION);
    if (m && !fn) { fn = m[1]; start = i; depth = 0; }
    if (!fn) continue;
    depth += (L.match(/\{/g) || []).length - (L.match(/\}/g) || []).length;
    // A guard: a condition on one line that returns the state without saying anything.
    if (/\bif\s*\(/.test(L) && /return s;/.test(L)
      && !/lastEvent|addTimeline|showMoment|throw|=|\breturn s;\s*\}\s*$/.test(L.replace(/return s;/, ''))) {
      // `if (!x) return s;` with nothing else on the line.
      const bare = /^\s*if\s*\([^)]*\)\s*return s;\s*$/.test(L);
      if (bare) hits.push({ file: path.relative(root, f).replace(/\\/g, '/'), line: i + 1, fn, text: L.trim() });
    }
    if (depth <= 0 && i > start) fn = null;
  }
}

// Not every one of these is a bug. A guard that fires only when the UI could not have offered
// the action is fine — the point is to look at them, which nobody had.
// A monthly tick is not a button. It is SUPPOSED to return without a word when there is
// nothing to do, twelve times a year, for sixty years. Only things a player presses count.
const KNOWN_OK = /Tick$|Year$|^(?:marketAfterRelease|applyFilmToActor|normalize|migrate)$/;
const real = hits.filter((h) => !KNOWN_OK.test(h.fn));

console.log('ACTIONS THAT CAN RETURN WITHOUT SAYING ANYTHING\n');
const byFn = {};
for (const h of real) (byFn[h.file + ' · ' + h.fn] = byFn[h.file + ' · ' + h.fn] || []).push(h);
const sorted = Object.entries(byFn).sort((a, b) => b[1].length - a[1].length);
for (const [k, list] of sorted.slice(0, 24)) {
  console.log('  ' + k + '  (' + list.length + ')');
  for (const h of list.slice(0, 2)) console.log('      ' + String(h.line).padStart(4) + '  ' + h.text.slice(0, 96));
}
console.log(`\n${real.length} silent guards across ${sorted.length} actions.`);
console.log('Each one is a button that can do nothing. Most are harmless; the ones that are not');
console.log('are the ones where the UI offers the action and the guard can still fire.');
