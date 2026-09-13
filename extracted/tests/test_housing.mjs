import { HOUSING, HOUSING_ORDER, applyMonthly, homeIllness, homeEnergy, homeBond, canRaiseChild } from '../src/engine/economy.js';
import { infectionOdds } from '../src/systems/life/health.js';
import { spendWithFamily } from '../src/systems/life/family.js';
import { tryForBaby } from '../src/systems/life/dating.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (housing, over) => ({ version: 'x', ageY: 30, stage: 'career', hasApartment: true, housing,
  cash: 50000, mental: 50, health: 60, looks: 50, diet: 'cook', gym: false, ap: 3, apMax: 3,
  family: [], timeline: [], cooldowns: {}, ...over });

// every tier has to declare all five effects
ok('every tier declares its effects', HOUSING_ORDER.every((k) => {
  const h = HOUSING[k];
  return h.perk && typeof h.mental === 'number' && typeof h.health === 'number'
    && typeof h.ill === 'number' && typeof h.ap === 'number' && typeof h.bond === 'number' && typeof h.kids === 'boolean';
}));
// and each rung has to be strictly better than the one below, or the rent is a lie
let monotonic = true, detail = [];
for (let i = 1; i < HOUSING_ORDER.length; i++) {
  const lo = HOUSING[HOUSING_ORDER[i - 1]], hi = HOUSING[HOUSING_ORDER[i]];
  const better = hi.cost > lo.cost && hi.mental >= lo.mental && hi.health >= lo.health
    && hi.ill <= lo.ill && hi.ap >= lo.ap && hi.bond >= lo.bond;
  if (!better) { monotonic = false; detail.push(HOUSING_ORDER[i]); }
}
ok('paying more is always better', monotonic, detail.join(','));

// a rented room actively costs you
const room = st('room'); const m0 = room.mental, h0 = room.health;
applyMonthly(room);
ok('a rented room drains mental', room.mental < m0, `${m0} -> ${room.mental}`);
ok('a rented room drains health', room.health < h0, `${h0} -> ${room.health}`);
const pent = st('penthouse'); const pm = pent.mental;
applyMonthly(pent);
ok('a penthouse restores you', pent.mental > pm, `${pm} -> ${pent.mental}`);

// illness odds move with the address
const oddsRoom = infectionOdds(st('room')), oddsFlat = infectionOdds(st('flat')), oddsPent = infectionOdds(st('penthouse'));
ok('a room makes you ill more often', oddsRoom > oddsFlat && oddsFlat > oddsPent, `room ${oddsRoom}, flat ${oddsFlat}, penthouse ${oddsPent}`);
console.log(`      illness odds at health 60 — ${HOUSING_ORDER.map((k) => `${k} ${Math.round(infectionOdds(st(k)))}%`).join(', ')}`);
ok('living with parents has no housing penalty', infectionOdds({ ...st('room'), hasApartment: false }) < oddsRoom);

// energy
ok('a room gives no extra energy', homeEnergy(st('room')) === 0);
ok('a canal house gives an hour back', homeEnergy(st('house')) === 1);
ok('parents give nothing either', homeEnergy({ ...st('house'), hasApartment: false }) === 0);

// closeness scales with somewhere to sit down
const rel = (housing) => { const s = st(housing, { family: [{ id: 'f1', name: 'Karen', relation: 'Mother', alive: true, relationship: 50 }] });
  spendWithFamily(s, 'f1'); return s.family[0].relationship - 50; };
let roomGain = 0, pentGain = 0;
for (let i = 0; i < 300; i++) { roomGain += rel('room'); pentGain += rel('penthouse'); }
ok('closeness grows faster in a real home', pentGain > roomGain * 1.4, `room ${(roomGain / 300).toFixed(1)}, penthouse ${(pentGain / 300).toFixed(1)}`);

// children need a room of their own
ok('no child in a rented room', !canRaiseChild(st('room')));
ok('no child in a studio', !canRaiseChild(st('studio')));
ok('a two-bed will do', canRaiseChild(st('flat')));
const cramped = st('room', { family: [{ id: 'sp', name: 'Iris', relation: 'Spouse', alive: true, relationship: 80 }] });
tryForBaby(cramped);
ok('trying for a baby in a room is refused', cramped.family.length === 1 && /nowhere to put a child/.test(cramped.lastEvent), cramped.lastEvent);
const roomy = st('flat', { family: [{ id: 'sp', name: 'Iris', relation: 'Spouse', alive: true, relationship: 80 }] });
let born = 0;
for (let i = 0; i < 60; i++) { const s = st('flat', { family: [{ id: 'sp', name: 'Iris', relation: 'Spouse', alive: true, relationship: 80 }] }); tryForBaby(s); if (s.family.length > 1) born++; }
ok('a two-bed allows children', born > 5, born + '/60');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
