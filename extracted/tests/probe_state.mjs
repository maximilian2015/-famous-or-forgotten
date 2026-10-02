// State that is read and never written, and state that is written and never read.
//
// The first kind is a condition that can never fire — a whole branch of the game nobody can
// reach. I shipped one of those myself a week ago: a line in the wrap report that read
// `p.lostDays`, a field that did not exist, so the sentence about a stunt costing the
// production days could never appear. It took being looked for to find.
//
// The second kind is a number the game maintains for nobody: not a bug, but it is either a
// feature somebody forgot to finish or dead weight in every save file.
//
//   node tests/probe_state.mjs
//
// It reads source, so it is a lead generator and not a verdict. Spread assignment, destructuring
// and anything that comes in off a save will show up as a false positive; the point is that
// somebody looks at the list, which is the thing that had not happened.
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

// The two objects the whole game is made of: the state, and a production.
const HOLDER = /\b(?:s|state|g|p|r|a|d|k|m|rel|o|c|src|credit|offer|partner|lead|crew|actor|person)\./;
const reads = new Map();   // field -> [where]
const writes = new Set();

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const rel = path.relative(root, f).replace(/\\/g, '/');
  src.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*(\/\/|\*)/.test(line)) return;       // a comment is not code
    // writes: x.foo = , x.foo ??= , x.foo += , and `foo:` inside an object literal
    for (const m of line.matchAll(/\b(?:s|state|g|p|r|a|d|k|m|rel|o|c|src|credit|offer|partner|lead|crew|actor|person)\.(\w+)\s*(?:=[^=]|\+\+|--|\?\?=|\|\|=|\+=|-=)/g)) writes.add(m[1]);
    for (const m of line.matchAll(/(?:^|[{,[(]\s*)(\w+):\s/g)) writes.add(m[1]);
    for (const m of line.matchAll(/\bdelete\s+\w+\.(\w+)/g)) writes.add(m[1]);
    // reads
    for (const m of line.matchAll(/\b(?:s|state|g|p|rel|o|c|credit|offer)\.(\w+)\b/g)) {
      if (!reads.has(m[1])) reads.set(m[1], []);
      if (reads.get(m[1]).length < 3) reads.get(m[1]).push(rel + ':' + (i + 1));
    }
  });
}

// Anything a browser or React hands us, and the handful of helpers that look like fields.
const NOT_STATE = new Set(['length', 'map', 'filter', 'find', 'push', 'slice', 'join', 'includes',
  'some', 'every', 'sort', 'reduce', 'forEach', 'indexOf', 'toFixed', 'replace', 'split', 'trim',
  'id', 'name', 'label', 'title', 'value', 'style', 'target', 'current', 'key', 'type', 'props',
  'toLocaleString', 'charCodeAt', 'startsWith', 'endsWith', 'test', 'match', 'concat', 'keys',
  'toUpperCase', 'toLowerCase', 'pop', 'shift', 'unshift', 'splice', 'has', 'get', 'set', 'add',
  'then', 'catch', 'bond', 'cost', 'why', 'ok', 'line', 'blurb', 'textContent', 'children']);

const never = [...reads.keys()].filter((k) => !writes.has(k) && !NOT_STATE.has(k) && k.length > 2);

console.log('READ, AND NEVER WRITTEN ANYWHERE');
console.log('A condition on one of these can never be true. Each needs looking at: the field may');
console.log('arrive off a save, or be spread in — or it may be a branch of the game nobody can get to.\n');
if (!never.length) console.log('  (none)');
for (const k of never.sort()) console.log('  ' + k.padEnd(22) + (reads.get(k) || []).join('  '));
console.log('\n' + never.length + ' fields.');
