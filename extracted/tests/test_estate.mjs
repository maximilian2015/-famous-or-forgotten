import { inheritFrom } from '../src/systems/life/family.js';
import { applyMonthly, monthlyCosts, homeIllness } from '../src/engine/economy.js';
import { rentApartment } from '../src/systems/life/stages.js';
import { CLASSES, CLASS_ORDER } from '../src/systems/life/origin.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const mum = (over) => ({ id: 'f1', name: 'Karen Bon', relation: 'Mother', age: 70, alive: true, relationship: 75, job: 'nurse', health: 40, ...over });
const dad = (over) => ({ id: 'f2', name: 'David Bon', relation: 'Father', age: 74, alive: true, relationship: 70, ...over });
const st = (over) => ({ version: 'x', ageY: 40, stage: 'career', hasApartment: true, housing: 'studio',
  cash: 5000, mental: 60, health: 70, diet: 'cook', family: [mum()], timeline: [], flags: {},
  familyClass: 'comfortable', familyEstate: CLASSES.comfortable.estate, familyLeavesHome: false, ...over });

// every class declares an estate
ok('every class declares an estate', CLASS_ORDER.every((k) => Array.isArray(CLASSES[k].estate) && typeof CLASSES[k].leavesHome === 'boolean'));
let rising = true;
for (let i = 1; i < CLASS_ORDER.length; i++) {
  if (CLASSES[CLASS_ORDER[i]].estate[1] <= CLASSES[CLASS_ORDER[i - 1]].estate[1]) rising = false;
}
ok('richer families leave more', rising);

// closeness decides everything
const cold = st(); const gotCold = inheritFrom(cold, mum({ relationship: 10 }));
ok('a distant parent leaves you nothing', gotCold.cash === 0 && cold.cash === 5000, gotCold.note);
ok('and the game says why', /left everything to someone else/.test(gotCold.note));
// Single draws overlap between bands, so this has to be an average, not one roll.
const avgAt = (rel) => { let t = 0; for (let i = 0; i < 300; i++) { const s = st(); inheritFrom(s, mum({ relationship: rel })); t += s.cash - 5000; } return Math.round(t / 300); };
const at45 = avgAt(45), at85 = avgAt(85), at95 = avgAt(95);
ok('being in touch gets you a share', at45 > 0, '€' + at45);
ok('being close gets you more', at85 > at45 * 1.4, `${at45} vs ${at85}`);
ok('ninety and up gets the lot', at95 > at85 * 1.4, `${at85} vs ${at95}`);
console.log(`      average by closeness — 45: €${at45.toLocaleString()}, 85: €${at85.toLocaleString()}, 95: €${at95.toLocaleString()}`);

// class decides how much
const avg = (cls) => { let t = 0; for (let i = 0; i < 200; i++) { const s = st({ familyClass: cls, familyEstate: CLASSES[cls].estate }); inheritFrom(s, mum()); t += s.cash - 5000; } return Math.round(t / 200); };
const poorLeft = avg('struggling'), richLeft = avg('rich');
ok('a poor family leaves almost nothing', poorLeft < 2000, '€' + poorLeft);
ok('a rich family leaves a fortune', richLeft > 200000, '€' + richLeft);
console.log(`      average inheritance — ${CLASS_ORDER.map((c) => `${c} €${avg(c).toLocaleString()}`).join(', ')}`);

// grandparents leave less than parents
// The estate is a wide range, so one draw at 35% can beat one draw at 100%. Averaged.
let gpTotal = 0, parTotal = 0;
for (let i = 0; i < 300; i++) {
  const g = st(); inheritFrom(g, { id: 'g', name: 'Olga', relation: 'Grandmother', relationship: 85 });
  const p = st(); inheritFrom(p, mum({ relationship: 85 }));
  gpTotal += g.cash - 5000; parTotal += p.cash - 5000;
}
ok('a grandparent leaves less than a parent', gpTotal < parTotal,
  `€${Math.round(gpTotal / 300).toLocaleString()} vs €${Math.round(parTotal / 300).toLocaleString()} on average`);
// And a child inherits nothing at all — the adults raising you handle it.
const kid = st({ ageY: 9 }); inheritFrom(kid, mum({ relationship: 95 }));
ok('a child inherits nothing', kid.cash === 5000, '€' + (kid.cash - 5000));
ok('a sibling leaves nothing at all', inheritFrom(st(), { id: 'b', name: 'Sam', relation: 'Brother', relationship: 90 }) === null);

// the house: only well-off, only the last parent, only if you were close
const noHouse = st({ familyLeavesHome: false, family: [mum()] });
inheritFrom(noHouse, mum({ relationship: 90 }));
ok('an ordinary family leaves no house', !noHouse.inheritedHome);
const stillOne = st({ familyLeavesHome: true, family: [mum(), dad()] });
inheritFrom(stillOne, mum({ relationship: 90 }));
ok('no house while a parent is still alive', !stillOne.inheritedHome);
const last = st({ familyLeavesHome: true, family: [mum({ alive: false })], housing: 'room' });
const gotHouse = inheritFrom(last, mum({ relationship: 90 }));
ok('the last parent leaves the house', last.inheritedHome && last.housing === 'house', JSON.stringify(gotHouse));
ok('an inherited house has no rent', monthlyCosts(last).rent === 0, '€' + monthlyCosts(last).rent);
ok('a rented one does', monthlyCosts(st({ housing: 'house' })).rent > 0);
const distantHeir = st({ familyLeavesHome: true, family: [mum({ alive: false })] });
inheritFrom(distantHeir, mum({ relationship: 40 }));
ok('a distant child gets money but not the keys', !distantHeir.inheritedHome && distantHeir.cash > 5000);

// eviction: two missed months
const broke = st({ cash: -1, housing: 'room', family: [mum()] });
applyMonthly(broke);
ok('one missed month is a warning', broke.hasApartment && broke.rentMissed === 1, String(broke.rentMissed));
ok('and it says so', /Miss it again/.test(broke.lastEvent || ''), broke.lastEvent);
applyMonthly(broke);
ok('two missed months and you are out', !broke.hasApartment, String(broke.rentMissed));
ok('with a parent you go home, not to the street', !broke.homeless && broke.livingWith === 'parents');
const alone = st({ cash: -1, housing: 'room', family: [mum({ alive: false })] });
applyMonthly(alone); applyMonthly(alone);
ok('with nobody left you end up on the street', alone.homeless && alone.livingWith === 'street');
const paid = st({ cash: 40000, housing: 'room' });
applyMonthly(paid); applyMonthly(paid); applyMonthly(paid);
ok('paying rent never gets you evicted', paid.hasApartment && paid.rentMissed === 0);
const owned = st({ cash: -9999, inheritedHome: true, housing: 'house' });
applyMonthly(owned); applyMonthly(owned); applyMonthly(owned);
ok('you cannot be evicted from a house you own', owned.hasApartment && !owned.homeless);

// the street bills you
const street = st({ homeless: true, hasApartment: false, mental: 60, health: 70 });
applyMonthly(street);
ok('the street costs mental and health', street.mental < 60 && street.health < 70, `${street.mental}/${street.health}`);
ok('the street has no rent to pay', monthlyCosts(street).total === 0);
ok('and it makes you ill', homeIllness(street) > homeIllness(st({ housing: 'room' })), `${homeIllness(street)} vs ${homeIllness(st({ housing: 'room' }))}`);
ok('months on the street are counted', street.monthsOnStreet === 1);
// and you can climb back out
const back = st({ homeless: true, hasApartment: false, cash: 900, ageY: 30, stage: 'moving_out' });
rentApartment(back);
ok('renting a room ends it', back.hasApartment && !back.homeless && back.monthsOnStreet === 0, back.lastEvent);
const skint = st({ homeless: true, hasApartment: false, cash: 100, ageY: 30, stage: 'moving_out' });
rentApartment(skint);
ok('but not without the money', skint.homeless && !skint.hasApartment);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
