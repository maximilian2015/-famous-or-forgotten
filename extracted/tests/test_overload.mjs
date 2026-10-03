// What it costs to be somewhere else as well.
//
// Three pictures at once used to cost twenty energy each and nothing else. Measured across
// twelve played careers with craft held still, a film shot under three call sheets came out
// rated the same as one shot under none:
//
//   craft 70-84    0 sets 62.2 · 1 set 63.1 · 2 sets 57.6 · 3+ sets 65.7
//
// Flat. So an actor who took everything got three times the releases, three times the fame and
// three times the chances at an enormous hit, for a currency they had stopped being short of
// around year twelve — at three sets they ran out of energy in 5% of months against 29% at none,
// because by then the house and the staff give it back.
//
// The penalty lives on the WORK, in shootTick, and nowhere near the rating. The picture is worse
// because you were not there, and the reviews follow the way they always have: the meter enters
// the score at wrap as (meter − 45) × 0.32 and nothing new was added to that line.
import { shootTick, startProduction } from '../src/systems/career/production.js';
import fs from 'fs';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

const SET = (over = {}) => ({ id: 'p' + Math.random(), title: 'A Picture', type: 'Feature Film', genre: 'Drama',
  scale: 'feature', months: 5, monthsLeft: 4, prepLeft: 0, meter: 40, stability: 80, take: 'straight',
  crew: [{ id: 'c0', name: 'Vera Salazar', role: 'Director', bond: 45, bond0: 45 }], ...over });

const st = (prods) => ({ year: 2066, month: 3, acting: 70, mental: 60, health: 85, strain: 20,
  cash: 200000, ap: 100, apMaxEff: 100, production: prods[0], productions: prods, inbox: [], timeline: [] });

// A month of work on the FIRST set, with however many others running beside it.
const monthGain = (others = [], over = {}, runs = 3000) => {
  let total = 0;
  for (let i = 0; i < runs; i++) {
    const mine = SET(over);
    const s = st([mine, ...others.map((o) => SET(o))]);
    const before = mine.meter;
    // Nothing must fire a demand into this: it would move the meter for its own reasons.
    for (const p of s.productions) p._demandMonth = s.year * 12 + s.month;
    shootTick(s);
    total += mine.meter - before;
  }
  return total / runs;
};

// ── 1. one long set is not overload ───────────────────────────────────────────
const alone = monthGain([]);
ok('a picture you are only making one of has no penalty', alone > 5.5 && alone < 9.5, alone.toFixed(2));
{
  const mine = SET(); const s = st([mine]);
  for (const p of s.productions) p._demandMonth = s.year * 12 + s.month;
  shootTick(s);
  ok('and the month says so', mine.spreadThin === 0, String(mine.spreadThin));
}

// ── 2 and 3. two cost something, three cost more ──────────────────────────────
const two = monthGain([{}]);
const three = monthGain([{}, {}]);
console.log(`      a month of work: alone ${alone.toFixed(2)} · two sets ${two.toFixed(2)} · three sets ${three.toFixed(2)}`);
ok('two long sets at once cost you the work', two < alone - 1, `${alone.toFixed(2)} → ${two.toFixed(2)}`);
ok('and three cost more again', three < two - 0.5, `${two.toFixed(2)} → ${three.toFixed(2)}`);
// Not a cliff: an actor spread across three pictures is still working, not sabotaging them.
ok('but a third picture does not stop the work altogether', three > 1.5, three.toFixed(2));

// ── 4. a day's work is not what spreads anybody thin ──────────────────────────
// engine/sets.js: a set of two months or less is short. A commercial, a voice session, a guest
// spot. Those were always meant to fit around a picture and they still do.
const withShorts = monthGain([{ months: 2, monthsLeft: 1 }, { months: 1, monthsLeft: 1 }]);
ok('two short jobs on the side are not an overload', Math.abs(withShorts - alone) < 1, `${alone.toFixed(2)} vs ${withShorts.toFixed(2)}`);
{
  const mine = SET(); const s = st([mine, SET({ months: 2, monthsLeft: 1 }), SET({ months: 1, monthsLeft: 1 })]);
  for (const p of s.productions) p._demandMonth = s.year * 12 + s.month;
  shootTick(s);
  ok('and the month says that too', mine.spreadThin === 0, String(mine.spreadThin));
}
// A set still in preparation has not started and cannot be spreading you.
const withPrep = monthGain([{ prepLeft: 2 }]);
ok('a picture that has not started shooting does not count against you', Math.abs(withPrep - alone) < 1, `${alone.toFixed(2)} vs ${withPrep.toFixed(2)}`);

// ── a big picture feels it more ───────────────────────────────────────────────
// The same 1.25-ish weighting the month's mental cost already uses, rather than a second
// mechanic with its own opinion about what a big picture is.
{
  const bigTwo = monthGain([{}], { scale: 'blockbuster' });
  const smallTwo = monthGain([{}], { scale: 'feature' });
  ok('a blockbuster suffers more from being shared than a feature does', bigTwo < smallTwo, `${smallTwo.toFixed(2)} vs ${bigTwo.toFixed(2)}`);
}

// ── 5. the rating is not touched directly ─────────────────────────────────────
// The whole point of putting the penalty on the work: nothing may read the number of sets and
// subtract from a score. The meter is the only road from here to the reviews.
{
  const prod = fs.readFileSync(new URL('../src/systems/career/production.js', import.meta.url), 'utf8');
  const ratingBlock = prod.slice(prod.indexOf('let rating ='), prod.indexOf('let rating =') + 1400);
  ok('nothing in the rating reads how many sets you are on', !/sets\(s\)|spreadThin|longRunning/.test(ratingBlock),
    (ratingBlock.match(/sets\(s\)|spreadThin|longRunning/) || [''])[0]);
  ok('and the meter still enters the score the way it always did', /\(p\.meter - 45\) \* 0\.32/.test(prod));
  // And the penalty is applied in exactly one place, so there is no second opinion about it.
  ok('the workload is read in one place only', (prod.match(/spreadThin/g) || []).length <= 2,
    String((prod.match(/spreadThin/g) || []).length));
}

// ── and the dead stance reference is gone, without a new magic number ─────────
{
  const prod = fs.readFileSync(new URL('../src/systems/career/production.js', import.meta.url), 'utf8');
  ok('no code reads p.stance any more', !/p\.stance ===/.test(prod));
  // 0.7 was `steady`, which every production started on and most never left, so the month's
  // mental cost is unchanged to a tenth of a point. What used to vary it is demands.js now.
  ok('and the month still costs what a steady month cost', /0\.7 \* big \* many \* worn/.test(prod));
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
