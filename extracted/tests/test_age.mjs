import { ageFit, seenForIt, bandFor, agingNote, womensPenalty, SEEN_AT }
  from '../src/systems/career/age.js';
import { refreshCastingPool, castingChance, boardSize } from '../src/systems/career/castings.js';
import { agingTick } from '../src/systems/life/mortality.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (age, over) => ({ version: 'x', ageY: age, gender: 'male', stage: 'career', dream: 'actor',
  hasApartment: true, housing: 'flat', cash: 2000000, mental: 75, health: 85, acting: 88, singing: 0,
  charisma: 65, looks: 62, luck: 50, scandal: 0, fame: 70, respect: 75, ap: 100, year: 2060, month: 0,
  filmography: [], discography: [], releases: [], frozen: [], offers: [], genreXP: {}, timeline: [],
  awards: { losses: 0, wins: [], nominations: [], pending: null, history: [] }, ...over });

// ── parts have ages ───────────────────────────────────────────────────────────
ok('a leading part is cast young and closes', ageFit(st(30), 'Lead') === 1 && ageFit(st(70), 'Lead') === 0,
  `30: ${ageFit(st(30), 'Lead')}, 70: ${ageFit(st(70), 'Lead')}`);
ok('and it tapers rather than slamming shut', ageFit(st(50), 'Lead') > 0 && ageFit(st(50), 'Lead') < 1,
  ageFit(st(50), 'Lead').toFixed(2));
ok('a horror victim is cast very young', ageFit(st(22), 'Victim') === 1 && ageFit(st(45), 'Victim') === 0);
ok('a voice job never closes', ageFit(st(75), 'Voice') > 0.3, ageFit(st(75), 'Voice').toFixed(2));
ok('a character lead does not exist before you are old enough', ageFit(st(30), 'Character lead') === 0);
ok('and it is the part of your fifties and beyond', ageFit(st(60), 'Character lead') === 1);
ok('every band opens before it closes', Object.keys({ Lead: 1, Victim: 1, Supporting: 1, 'Character lead': 1 })
  .every((r) => { const b = bandFor(r); return b[0] < b[1] && b[1] < b[2]; }));

// ── being at the edge costs you the room ──────────────────────────────────────
const young = st(32), old = st(56);
ok('at the edge of a part your odds drop', castingChance(old, { role: 'Lead' }) < castingChance(young, { role: 'Lead' }),
  `${castingChance(young, { role: 'Lead' })}% at 32 vs ${castingChance(old, { role: 'Lead' })}% at 56`);
ok('but a part written for you does not', castingChance(old, { role: 'Supporting' }) > castingChance(old, { role: 'Lead' }));

// ── the board gets smaller, which is the real shape of it ─────────────────────
// The board is not a fixed six any more — a name gets sent more, so this checks the shape
// (young and known has plenty) rather than one number. See systems/career/castings.js.
ok('there is plenty of work when you are young', boardSize(st(30)) >= 6, String(boardSize(st(30))));
ok('and less of it later', boardSize(st(70)) < boardSize(st(30)), `${boardSize(st(30))} → ${boardSize(st(70))}`);
ok('but never nothing', boardSize(st(85)) >= 2, String(boardSize(st(85))));
console.log('      listings on the board — ' + [25, 40, 50, 60, 70, 85].map((a) => `${a}y: ${boardSize(st(a))}`).join(', '));

// ── it turns earlier for women, and the game says so ──────────────────────────
ok('a leading part closes earlier for women', ageFit(st(50, { gender: 'female' }), 'Lead') < ageFit(st(50), 'Lead'),
  `${ageFit(st(50, { gender: 'female' }), 'Lead').toFixed(2)} vs ${ageFit(st(50), 'Lead').toFixed(2)}`);
ok('the board thins earlier too', boardSize(st(46, { gender: 'female' })) <= boardSize(st(46)));
ok('but it does not touch character work', womensPenalty(st(50, { gender: 'female' }), 'Character lead') === 0);
ok('the game says it out loud rather than quietly lowering the odds',
  /earlier to women/.test(agingNote(st(39, { gender: 'female' })) || ''), (agingNote(st(39, { gender: 'female' })) || '').slice(0, 60));
ok('and it says something to men too, later', /different shelf/.test(agingNote(st(45)) || ''));
ok('and nothing at all in an ordinary year', agingNote(st(41)) === null);

// ── the late shelf actually appears ───────────────────────────────────────────
function rolesAt(age, gender) {
  const seen = new Set();
  for (let i = 0; i < 300; i++) { const s = st(age, { gender }); refreshCastingPool(s, true); s.castingPool.forEach((c) => seen.add(c.role)); }
  return seen;
}
const at28 = rolesAt(28, 'male'), at62 = rolesAt(62, 'male');
ok('a young actor is not offered the elder parts', !at28.has('Character lead') && !at28.has('The matriarch'), [...at28].join(','));
ok('an older one is', at62.has('Character lead') || at62.has('Elder statesman') || at62.has('The matriarch'), [...at62].join(','));
ok('and is no longer sent horror-victim sides', !at62.has('Victim'), [...at62].join(','));
console.log('      at 28: ' + [...at28].join(', '));
console.log('      at 62: ' + [...at62].join(', '));

// nobody is ever left with an empty board
for (const a of [19, 25, 35, 45, 55, 65, 75, 85]) {
  const s = st(a); refreshCastingPool(s, true);
  ok(`there is work at ${a}`, s.castingPool.length >= 2, `${s.castingPool.length} listings`);
}

// ── craft slips late, and has a floor ─────────────────────────────────────────
const late = st(64, { acting: 92 });
for (let y = 0; y < 25; y++) { late.ageY++; agingTick(late); }
ok('craft slips after sixty-six', late.acting < 92, late.acting.toFixed(1));
ok('but a great actor at eighty-nine is still a great actor', late.acting > 50, late.acting.toFixed(1));
console.log(`      acting 92 at 64 → ${late.acting.toFixed(0)} at ${late.ageY}`);
const notLate = st(40, { acting: 80 });
for (let y = 0; y < 20; y++) { notLate.ageY++; agingTick(notLate); }
ok('and nothing slips before then', notLate.acting === 80, String(notLate.acting));

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
