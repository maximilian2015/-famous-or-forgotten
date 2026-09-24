// The Mental screen's arithmetic. The whole point of that screen is that it reports the
// REAL monthly sum, so the test that matters is: does the number it prints match what a
// month actually does to you?
import { createInitialState } from '../src/state/initialState.js';
import { beginLife } from '../src/systems/life/origin.js';
import { advanceMonth } from '../src/engine/time.js';
import * as MD from '../src/systems/life/mood.js';
import * as MN from '../src/systems/life/money.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
function born(over) {
  const s = createInitialState({ name: 'H', dream: 'actor', created: true });
  beginLife(s);
  return Object.assign(s, { stage: 'career', ageY: 34, year: 2064, month: 0, hasApartment: true,
    livingWith: 'own_place', housing: 'room', cash: 500000, mental: 50, health: 80, alive: true,
    ap: 100, apMax: 100, apMaxEff: 100, fame: 40, diet: 'cook',
    filmography: [{ title: 'x', rating: 80, tier: 'lead', role: 'Lead', year: 2062 }] }, over);
}

// ── the sum is the real sum ──
{
  // A rented room takes 0.6 a month and nothing else is running. One month should land
  // within rounding of what the panel promised.
  const s = born();
  const said = MD.mentalReport(s).net;
  const before = s.mental;
  const t = advanceMonth(s);
  const actual = t.mental - before;
  ok('the panel predicts what a quiet month actually does', Math.abs(actual - said) < 0.35,
    `said ${said}, month did ${actual.toFixed(2)}`);
}
{
  // And in the other direction: a penthouse and somebody cooking for you should be positive.
  const s = born({ housing: 'penthouse', diet: 'fine', mental: 40, fame: 80, cash: 9000000 });
  MN.hire(s, 'household');
  const said = MD.mentalReport(s).net;
  ok('a good life reads as a gain', said > 2, String(said));
  const before = s.mental, t = advanceMonth(s);
  ok('and the month agrees', t.mental - before > 1.5, (t.mental - before).toFixed(2));
}
// ── what it lists ──
{
  const s = born({ housing: 'room' });
  const r = MD.mentalReport(s);
  ok('the room is named as a drain', r.down.some((l) => l.id === 'home' && l.per < 0), JSON.stringify(r.down.map((l) => l.id)));
  const shoot = born({ production: { title: 'Q', monthsLeft: 3, months: 6, meter: 40, scale: 'feature', crew: [{ name: 'A', bond: 50 }] } });
  const sr = MD.mentalReport(shoot);
  // A shoot takes something every month now — the hours and the waiting, scaled by how you
  // are taking it and how worn you already are (production.js). It has to be NAMED and
  // COUNTED, or the panel promises a month that does not happen.
  ok('a shoot is named and counted as a drain', sr.down.some((l) => l.id === 'shoot' && l.per < 0),
    JSON.stringify({ notes: sr.notes.map((l) => l.id), down: sr.down.map((l) => l.id) }));
  {
    const before = shoot.mental, t2 = advanceMonth(shoot);
    ok('and a month of shooting matches what the panel promised', Math.abs((t2.mental - before) - sr.net) < 0.4,
      'said ' + sr.net + ', month did ' + (t2.mental - before).toFixed(2));
  }
  const street = born({ hasApartment: false, homeless: true, livingWith: 'street' });
  ok('the street is the biggest drain there is', MD.mentalReport(street).down.some((l) => l.id === 'street' && l.per <= -4));
}
// ── ringing somebody ──
{
  const s = born({ mental: 30 });
  const close = MD.closestPerson(s);
  ok('there is somebody to ring', !!close, String(close && close.name));
  if (close) close.relationship = 85;
  const before = s.mental, ap = s.ap;
  MD.callSomebody(s);
  ok('a call lifts you', s.mental > before, `${before} → ${s.mental}`);
  ok('and it costs energy', s.ap === ap - 5, String(ap - s.ap));
  const again = s.mental;
  MD.callSomebody(s);
  ok('and only once a month', s.mental === again, s.lastEvent);
}
{
  // How much it helps is how close they are — that is the whole argument for keeping people.
  const warm = born({ mental: 30 }); const cold = born({ mental: 30 });
  for (const p of warm.family) p.relationship = 90;
  for (const p of cold.family) p.relationship = 5;
  warm.partner = null; cold.partner = null; warm.people = []; cold.people = [];
  MD.callSomebody(warm); MD.callSomebody(cold);
  ok('somebody close is worth more than somebody distant', warm.mental > cold.mental,
    `${warm.mental} vs ${cold.mental}`);
}
// ── getting away ──
{
  const s = born({ mental: 40, cash: 9000000, fame: 80 });
  ok('you cannot get away with nowhere to go', !MD.canGetAway(s).ok, MD.canGetAway(s).why);
  MN.buyThing(s, 'boat');
  ok('and you can once you have somewhere', MD.canGetAway(s).ok);
  const before = s.mental;
  MD.getAway(s);
  ok('and it is worth a lot', s.mental > before + 10, `${before} → ${s.mental}`);
  s.ap = 100;
  const after = s.mental;
  MD.getAway(s);
  ok('but it stops working if you never come back', s.mental === after, s.lastEvent);
}
// ── the streak ──
{
  let t = born({ mental: 20 });
  for (let m = 0; m < 4; m++) t = advanceMonth(t);
  ok('the game counts how long you have been down', (t._lowMonths || 0) >= 3, String(t._lowMonths));
  t.mental = 90;
  t = advanceMonth(t);
  ok('and resets it when you are not', (t._lowMonths || 0) === 0, String(t._lowMonths));
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
