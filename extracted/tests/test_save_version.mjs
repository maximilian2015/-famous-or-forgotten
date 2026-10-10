// A save from another version must never cost the player the life they are playing.
//
// It used to: normalize() starts a new life when the version differs, importSave() then set it
// and said "Loaded. Carry on.", and on startup the first action wrote the new life over the old
// save in the browser. Found by the state-transition audit (docs/handoffs/2026-10-10-…).
import fs from 'fs';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

const VERSION = (fs.readFileSync(new URL('../src/state/store.js', import.meta.url), 'utf8').match(/CURRENT_VERSION = '([^']+)'/) || [])[1];
const life = JSON.parse(fs.readFileSync(new URL('../../playtest/directors-4.json', import.meta.url), 'utf8'));
const older = { ...life, version: 'r0.7z' };

// The browser's storage, before the store module reads it: a save from another version.
const box = new Map([['fof_react_save', JSON.stringify(older)]]);
globalThis.localStorage = { getItem: (k) => (box.has(k) ? box.get(k) : null), setItem: (k, v) => box.set(k, String(v)), removeItem: (k) => box.delete(k) };
const store = await import('../src/state/store.js');

// ── on startup ─────────────────────────────────────────────────────────────────
{
  const g = store.getState();
  ok('a stored save of another version is not played as if it were this one', g.version === VERSION && g.name !== 'Mira Vale');
  const aside = box.get('fof_react_save_r0.7z');
  ok('it is kept aside, whole, under its own key', !!aside && JSON.parse(aside).name === 'Mira Vale' && JSON.parse(aside).ageY === 34);
  ok('and the new life says so', /another version of the game \(r0\.7z\)/.test(g.lastEvent || ''), g.lastEvent);
}
// ── loading a file ─────────────────────────────────────────────────────────────
{
  ok('a save of this version loads', store.importSave(JSON.stringify(life)) === null && store.getState().name === 'Mira Vale');
  const why = store.importSave(JSON.stringify(older));
  const g = store.getState();
  ok('a save of another version is refused, with the reason', /another version of the game \(r0\.7z; this one is /.test(why || ''), why);
  ok('and the life being played is untouched', g.name === 'Mira Vale' && g.ageY === 34 && g.stage === 'career', `${g.name} ${g.ageY} ${g.stage}`);
  ok('nor was it written over in storage', JSON.parse(box.get('fof_react_save')).name === 'Mira Vale');
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
