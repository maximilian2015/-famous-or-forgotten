import { applyBond, bondsTick, relBand, BANDS, REL_MIN, REL_MAX } from '../src/systems/life/bonds.js';
import { interact, interactionsFor } from '../src/systems/life/interactions.js';
import { inheritFrom } from '../src/systems/life/family.js';
import { applyMonthly } from '../src/engine/economy.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const mum = (over) => ({ id: 'f1', name: 'Karen Bon', relation: 'Mother', age: 60, alive: true, relationship: 50, job: 'nurse', health: 70, ...over });
const st = (over) => ({ version: 'x', ageY: 30, stage: 'career', hasApartment: true, housing: 'flat',
  cash: 30000, mental: 60, health: 70, charisma: 50, ap: 100, year: 2030, month: 0,
  family: [mum()], people: [], timeline: [], _cool: {}, familyEstate: [14000, 55000], ...over });

// scale and bands
ok('the scale runs both ways', REL_MIN === -100 && REL_MAX === 100);
ok('bands cover the whole scale', [-100, -60, -30, 0, 10, 30, 60, 90].every((v) => !!relBand(v)));
ok('high is good, low is bad', relBand(90).tone === 'good' && relBand(-70).tone === 'bad');
ok('no duplicate band labels', new Set(BANDS.map((b) => b.label)).size === BANDS.length);

// clicking the same person all month gets you less each time
const farm = st(); const p = farm.family[0];
const gains = [];
for (let i = 0; i < 5; i++) gains.push(applyBond(farm, p, 10));
ok('repeat attention is worth less each time', gains[0] > gains[1] && gains[1] > gains[2] && gains[3] <= gains[2], gains.join(','));
ok('but never nothing', gains[4] >= 1, gains.join(','));
const total = gains.reduce((a, b) => a + b, 0);
ok('five clicks are worth far less than five separate months', total < 10 * 5 * 0.6, 'total ' + total);
// a new month resets the repeat budget. (It is not identical to the first gain —
// closeness is higher now, and height always costs. It just is not the 55% penalty.)
const fresh = st(); const q = fresh.family[0];
const firstGain = applyBond(fresh, q, 10);
fresh.month = 1;
const nextMonth = applyBond(fresh, q, 10);
const sameMonth = st(); const r = sameMonth.family[0];
applyBond(sameMonth, r, 10);
const secondSameMonth = applyBond(sameMonth, r, 10);
ok('a new month resets the repeat penalty', nextMonth > secondSameMonth, `next month ${nextMonth} vs second click ${secondSameMonth}`);
ok('and is close to the first', nextMonth >= firstGain - 1, `${firstGain} then ${nextMonth}`);

// the higher you are the harder it gets
const low = st({ family: [mum({ relationship: 0 })] });
const high = st({ family: [mum({ relationship: 90 })] });
ok('the same effort moves less at the top', applyBond(high, high.family[0], 10) < applyBond(low, low.family[0], 10));
// and damage is never softened
const hurt = st({ family: [mum({ relationship: 90 })] });
ok('a fight always lands in full', applyBond(hurt, hurt.family[0], -20) === -20);

// it can go under zero
const enemy = st({ family: [mum({ relationship: 5 })] });
applyBond(enemy, enemy.family[0], -40);
ok('closeness can go negative', enemy.family[0].relationship < 0, String(enemy.family[0].relationship));
ok('and it is named', relBand(enemy.family[0].relationship).tone === 'bad', relBand(enemy.family[0].relationship).label);
const floorTest = st({ family: [mum({ relationship: -95 })] });
applyBond(floorTest, floorTest.family[0], -50);
ok('it stops at minus a hundred', floorTest.family[0].relationship === -100);

// fading
const quiet = st({ family: [mum({ relationship: 80, lastSeen: 2030 * 12 })] });
quiet.month = 6;
bondsTick(quiet);
ok('people you do not call drift away', quiet.family[0].relationship < 80, String(quiet.family[0].relationship));
const seen = st({ family: [mum({ relationship: 80 })] });
applyBond(seen, seen.family[0], 1);
bondsTick(seen);
ok('people you did see do not', seen.family[0].relationship >= 80);
const recent = st({ family: [mum({ relationship: 80, lastSeen: 2030 * 12 })] });
recent.month = 1; bondsTick(recent);
ok('one quiet month is forgiven', recent.family[0].relationship === 80);
// industry fades faster than blood
function drift(kind) {
  const s = kind === 'contact'
    ? st({ family: [], people: [{ id: 'c1', name: 'Rita', role: 'Casting Director', industryWeight: 70, relationship: 80, lastSeen: 2030 * 12 }] })
    : st({ family: [mum({ relationship: 80, lastSeen: 2030 * 12 })] });
  s.month = 6; bondsTick(s);
  return 80 - (kind === 'contact' ? s.people[0].relationship : s.family[0].relationship);
}
ok('the industry forgets faster than family', drift('contact') > drift('parent'), `contact -${drift('contact')}, parent -${drift('parent')}`);
// A cold contact stops returning calls — and STAYS in your phone, marked cold. They used to
// be deleted, which is why the People screen was always nearly empty (Maxi: "few people,
// they keep disappearing"). A phone keeps the number; warming them back is your problem.
const dropped = st({ family: [], people: [{ id: 'c1', name: 'Rita', role: 'Casting Director', industryWeight: 70, relationship: 0, lastSeen: 2030 * 12 }] });
dropped.month = 11; bondsTick(dropped);
ok('a contact you never call stops returning calls', dropped.people.length === 1 && dropped.people[0].cold === true);
ok('and it is written down', /stopped returning/.test(JSON.stringify(dropped.timeline)));

// nothing decays below zero on its own
const cold = st({ family: [mum({ relationship: -30, lastSeen: 2030 * 12 })] });
cold.month = 9; bondsTick(cold);
ok('indifference does not rot further by itself', cold.family[0].relationship === -30);

// interactions go through the same gate
const viaSheet = st();
const before = viaSheet.family[0].relationship;
interact(viaSheet, 'f1', 'chat'); interact(viaSheet, 'f1', 'compliment'); interact(viaSheet, 'f1', 'joke');
ok('the sheet cannot bypass the rules', viaSheet.family[0].touched === 3, String(viaSheet.family[0].touched));
// Three small deltas can occasionally sum to nothing, so this is measured over many
// runs rather than one — the claim is that the sheet moves the needle, not that every
// single evening does.
let sheetMoved = 0;
for (let i = 0; i < 60; i++) {
  const v = st(); const b0 = v.family[0].relationship;
  interact(v, 'f1', 'chat'); interact(v, 'f1', 'compliment'); interact(v, 'f1', 'joke');
  if (v.family[0].relationship !== b0) sheetMoved++;
}
ok('and it still moved', sheetMoved > 44, `${sheetMoved}/60 evenings changed the relationship`);

// inheritance now wants a life, not a season
// The estate itself is a range, so one roll at 40 can beat one roll at 95. Average it.
const bands = [20, 40, 75, 95].map((rel) => {
  let t = 0; for (let i = 0; i < 300; i++) { const s = st(); inheritFrom(s, mum({ relationship: rel })); t += s.cash - 30000; }
  return { rel, cash: Math.round(t / 300) };
});
ok('under thirty still gets nothing', bands[0].cash === 0);
ok('forty gets a sliver', bands[1].cash > 0);
ok('seventy-five gets more than forty', bands[2].cash > bands[1].cash);
ok('ninety-plus gets the most', bands[3].cash > bands[2].cash, JSON.stringify(bands.map((b) => `${b.rel}:${b.cash}`)));
console.log('      inheritance by closeness — ' + bands.map((b) => `${b.rel} €${b.cash.toLocaleString()}`).join(', '));
const houseAt75 = st({ familyLeavesHome: true, family: [mum({ alive: false })] });
inheritFrom(houseAt75, mum({ relationship: 75 }));
ok('seventy-five is not enough for the house', !houseAt75.inheritedHome);
const houseAt95 = st({ familyLeavesHome: true, family: [mum({ alive: false })] });
inheritFrom(houseAt95, mum({ relationship: 95 }));
ok('ninety-five is', houseAt95.inheritedHome);

// a parent you fought with will not take you back
const estranged = st({ cash: -1, housing: 'room', family: [mum({ relationship: -45 })] });
applyMonthly(estranged); applyMonthly(estranged);
ok('a parent you burned will not open the door', estranged.homeless === true, JSON.stringify({ homeless: estranged.homeless, ev: estranged.lastEvent }));
ok('and the game says exactly that', /would not open the door/.test(estranged.lastEvent), estranged.lastEvent);
const kind = st({ cash: -1, housing: 'room', family: [mum({ relationship: 40 })] });
applyMonthly(kind); applyMonthly(kind);
ok('a parent you kept close does', !kind.homeless && kind.livingWith === 'parents');
ok('eviction raises a big moment', kind.bigMoment && kind.bigMoment.id === 'evicted', JSON.stringify(kind.bigMoment));

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
