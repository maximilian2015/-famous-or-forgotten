import { ACTIONS, availableActions, runAction } from '../src/systems/career/actions.js';
import { SHIFTS, availableShifts, pickShift, doShift } from '../src/systems/life/work.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', ageY: 15, stage: 'teen', ap: 100, cash: 0, mental: 60, health: 80,
  confidence: 40, charisma: 40, discipline: 40, acting: 0, singing: 0, fame: 0, dream: 'actor',
  family: [{ id: 'p1', relation: 'Mother', alive: true, relationship: 70 }], timeline: [], ...over });

// the duplicates are gone for good
const ids = ACTIONS.map((a) => a.id);
ok('side job is gone from Home', !ids.includes('sidejob'), ids.join(','));
ok('TV extra is gone from Home', !ids.includes('extrawork'), ids.join(','));
const teen = availableActions(st()).map((a) => a.id);
ok('a teen sees the school play', teen.includes('schoolplay'), teen.join(','));
ok('a teen sees sneaking out', teen.includes('sneakout'), teen.join(','));
ok('a teen still has rest and school', teen.includes('rest') && teen.includes('school'));
ok('no money is handed out on Home any more', availableActions(st()).every((a) => {
  const s = st(); runAction(s, a.id); return s.cash === 0;
}));
const kid = availableActions(st({ ageY: 8, stage: 'child' })).map((a) => a.id);
ok('a child gets neither teen beat', !kid.includes('schoolplay') && !kid.includes('sneakout'), kid.join(','));
const adult = availableActions(st({ ageY: 30, stage: 'career' })).map((a) => a.id);
ok('an adult only gets rest on Home', adult.join(',') === 'rest', adult.join(','));

// the school play actually swings both ways
let got = 0, missed = 0;
for (let i = 0; i < 400; i++) { const s = st(); runAction(s, 'schoolplay'); if (s.acting > 0) got++; else missed++; }
ok('the play can be won and lost', got > 40 && missed > 40, `got ${got}, missed ${missed}`);
const bold = st({ confidence: 95, charisma: 90 }); let boldWins = 0;
for (let i = 0; i < 400; i++) { const s = st({ confidence: 95, charisma: 90 }); runAction(s, 'schoolplay'); if (s.acting > 0) boldWins++; }
ok('confidence helps you get the part', boldWins > got, `${boldWins} vs ${got}`);
const singer = st({ dream: 'singer' }); runAction(singer, 'schoolplay');
ok('a singer trains singing, not acting', singer.acting === 0);

// sneaking out has a real downside
let caught = 0;
for (let i = 0; i < 400; i++) { const s = st(); runAction(s, 'sneakout'); if (s.family[0].relationship < 70) caught++; }
ok('sneaking out gets caught sometimes', caught > 80 && caught < 200, 'caught=' + caught);

// energy is still the gate
const spent = st({ ap: 0 }); const before = spent.confidence;
runAction(spent, 'schoolplay');
ok('no energy, no action', spent.confidence === before && spent.ap === 0);

// shifts are age gated now
ok('a 13-year-old is offered no shift', availableShifts(st({ ageY: 13 })).length === 0);
ok('a 15-year-old gets the flyers job only', availableShifts(st({ ageY: 15 })).map((s) => s.id).join(',') === 'promo');
ok('a 16-year-old gets more', availableShifts(st({ ageY: 16 })).length === 3);
ok('an adult gets all of them', availableShifts(st({ ageY: 20 })).length === SHIFTS.length);
ok('pickShift respects age', (() => { for (let i = 0; i < 50; i++) { const p = pickShift(st({ ageY: 16 })); if (p && p.minAge > 16) return false; } return true; })());
ok('pickShift returns nothing for a child', pickShift(st({ ageY: 12 })) === null);
const young = st({ ageY: 14 }); doShift(young, 'bar', 90);
ok('an underage shift pays nothing', young.cash === 0 && /have to be 18/.test(young.lastEvent), young.lastEvent);
const legal = st({ ageY: 18 }); doShift(legal, 'bar', 90);
ok('a legal shift pays', legal.cash > 0, '€' + legal.cash);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
