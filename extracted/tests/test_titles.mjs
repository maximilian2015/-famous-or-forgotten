import { refreshCastingPool } from '../src/systems/career/castings.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', ageY: 30, stage: 'career', dream: 'actor', hasApartment: true, housing: 'flat',
  cash: 50000, mental: 70, health: 85, acting: 80, singing: 0, charisma: 60, looks: 60, luck: 50, scandal: 0,
  fame: 62, respect: 55, ap: 100, year: 2060, month: 0, filmography: [], discography: [], releases: [], frozen: [],
  offers: [], genreXP: {}, timeline: [], ...over });

// Found by playing: "Late Echo" was on the board twice at once, on two different shelves.
let clashes = 0, boards = 0;
for (let i = 0; i < 400; i++) {
  const s = st(); refreshCastingPool(s, true);
  boards++;
  const titles = s.castingPool.map((c) => c.title);
  if (new Set(titles).size !== titles.length) clashes++;
}
ok('no two listings on the board share a name', clashes === 0, `${clashes}/${boards} boards had a duplicate`);

// and nothing is named after something you already made, are shooting, or have in post
let echoes = 0;
for (let i = 0; i < 400; i++) {
  const s = st({
    filmography: [{ title: 'Golden Echo', type: 'Feature Film', rating: 80, year: 2059 }],
    releases: [{ id: 'r', title: 'Silent River', due: 100 }],
    frozen: [{ id: 'f', title: 'Broken Harbor' }],
    offers: [{ id: 'o', projectTitle: '⭐ Neon City' }],
  });
  s.production = { title: 'Last Room' };
  refreshCastingPool(s, true);
  const clash = s.castingPool.some((c) => ['Golden Echo', 'Silent River', 'Broken Harbor', 'Neon City', 'Last Room'].includes(c.title));
  if (clash) echoes++;
}
ok('and never after something already in your life', echoes === 0, `${echoes}/400 boards re-used a name`);

// the board still fills every time — the uniqueness check must not starve it
let short = 0;
for (let i = 0; i < 400; i++) { const s = st(); refreshCastingPool(s, true); if (s.castingPool.length < 6) short++; }
ok('the board still fills', short === 0, `${short}/400 boards came up short`);

const sample = st(); refreshCastingPool(sample, true);
console.log('      a board — ' + sample.castingPool.map((c) => c.title).join(', '));

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
