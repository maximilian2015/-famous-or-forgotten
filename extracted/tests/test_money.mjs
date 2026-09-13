// The spending layer: a home you own, an entourage you pay, things you can sell, and what
// happens when the money runs out with all of it on your back.
import { createInitialState } from '../src/state/initialState.js';
import { beginLife } from '../src/systems/life/origin.js';
import { advanceMonth } from '../src/engine/time.js';
import { monthlyCosts } from '../src/engine/economy.js';
import * as M from '../src/systems/life/money.js';

let fails = 0;
function born() { const s = createInitialState({ name: 'M', dream: 'actor', created: true }); beginLife(s); return s; }
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => Object.assign(born(), {
  stage: 'career', ageY: 40, year: 2070, month: 0, hasApartment: true, livingWith: 'own_place',
  housing: 'house', cash: 12000000, fame: 80, peakFame: 80, alive: true, ap: 3, apMax: 3, apMaxEff: 3,
  filmography: [{ title: 'x', rating: 88, tier: 'lead', role: 'Lead', year: 2068 }],
}, over);

// ── the roof ──
{
  const s = st();
  const rentBefore = monthlyCosts(s).rent;
  M.buyHome(s);
  ok('you can buy the place you rent', s.owns === 'house', String(s.owns));
  ok('and it costs what it says', s.cash === 12000000 - M.HOME_PRICE.house, s.cash.toLocaleString());
  ok('and the rent stops', monthlyCosts(s).rent === 0, `${rentBefore} → ${monthlyCosts(s).rent}`);
  ok('and it is in the estate', M.estateValue(s) > 1000000, M.estateValue(s).toLocaleString());
  const cash = s.cash;
  M.sellHome(s);
  ok('selling it is a forced sale', s.cash > cash && s.cash - cash < M.HOME_PRICE.house, `+€${(s.cash - cash).toLocaleString()}`);
  ok('and you are renting again', monthlyCosts(s).rent > 0);
}
// ── the entourage ──
{
  const s = st();
  M.hire(s, 'assistant');
  ok('an assistant is an extra Energy', M.staffEnergy(s) === 1);
  ok('and shows up in the monthly bill', monthlyCosts(s).team === M.STAFF.assistant.cost, String(monthlyCosts(s).team));
  const t = advanceMonth(s);
  ok('and is billed exactly once a month', 12000000 - t.cash === monthlyCosts(s).total, `€${(12000000 - t.cash).toLocaleString()} vs €${monthlyCosts(s).total.toLocaleString()}`);
  ok('and the month is worth more', t.apMaxEff >= 5, String(t.apMaxEff));
}
{
  const s = st({ fame: 20 });
  M.hire(s, 'publicist');
  ok('nobody works for a name that small', !M.hasStaff(s, 'publicist'), s.lastEvent);
}
// ── things ──
{
  const s = st();
  M.buyThing(s, 'watch');
  ok('a watch is a thing you own', M.owns(s, 'watch'));
  ok('and it is worth less the moment you leave the shop', M.resaleOf(s, 'watch') < M.THINGS.watch.price);
  const cash = s.cash;
  M.sellThing(s, 'watch');
  ok('and selling it gets some of it back', s.cash > cash && !M.owns(s, 'watch'));
  const s2 = st({ year: 2070 });
  M.buyThing(s2, 'art');
  const now = M.resaleOf(s2, 'art');
  s2.year = 2090;
  ok('a painting is worth more twenty years later', M.resaleOf(s2, 'art') > now,
    `€${now.toLocaleString()} → €${M.resaleOf(s2, 'art').toLocaleString()}`);
}
// ── the fall ──
{
  // Everything on your back and nothing coming in: the payroll goes first, then the things.
  const s = st({ cash: 300000 });
  M.hire(s, 'assistant'); M.hire(s, 'household'); M.hire(s, 'publicist');
  M.buyThing(s, 'watch');
  let t = s, lostStaff = 0, lostThings = 0;
  for (let m = 0; m < 40; m++) {
    const staffBefore = Object.keys(t.staff || {}).length, thingsBefore = Object.keys(t.things || {}).length;
    t = advanceMonth(t);
    lostStaff += Math.max(0, staffBefore - Object.keys(t.staff || {}).length);
    lostThings += Math.max(0, thingsBefore - Object.keys(t.things || {}).length);
    if (!t.alive) break;
  }
  ok('an entourage you cannot pay leaves', lostStaff > 0, `${lostStaff} let go`);
  ok('and the game says so', /could not|payroll/i.test(String(t.lastEvent) + (t.timeline || []).map((x) => x.text).join(' ')));
}
// ── giving ──
{
  const s = st();
  const mum = (s.family || []).find((p) => p.relation === 'Mother');
  if (mum) {
    const before = mum.relationship || 0, cash = s.cash;
    M.support(s, mum.id);
    ok('setting your family up moves the bond and the money', mum.supported && mum.relationship > before && s.cash < cash,
      `${before} → ${mum.relationship}`);
    ok('and what it costs scales with what you have', M.supportCost(st({ cash: 40000000 })) > M.supportCost(st({ cash: 400000 })));
  } else ok('a mother exists to give money to', false);
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
