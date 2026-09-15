import { drinkThrough, drinkTick, level, band, dependent, drankThisMonth, drinkingCoversSlots,
  rehabMonthsFor, DEPENDENT_AT, buyBottle, bottlesInHouse, BOTTLES } from '../src/systems/life/drink.js';
import { slotsLost, enterRehab, rehabTick, rehabMonths, rehabCost, inRehab }
  from '../src/systems/life/depression.js';
import { startProduction, productionTick } from '../src/systems/career/production.js';
import { releaseTick } from '../src/systems/career/release.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const dep = () => ({ since: 0, sessions: 0, checks: 0, passed: 0, windowMonths: 0, windowSessions: 0,
  windowRests: 0, medMonths: 0, medsThisMonth: false, pending: null });
const st = (over) => ({ version: 'x', ageY: 40, gender: 'male', stage: 'career', dream: 'actor',
  hasApartment: true, housing: 'flat', cash: 400000, mental: 50, health: 75, acting: 85, singing: 0,
  charisma: 60, looks: 58, luck: 50, scandal: 0, fame: 60, respect: 60, ap: 100, apMax: 100, quote: 0,
  year: 0, month: 0, strain: 30, burnout: null, burnouts: 4, scarred: 0, scarTherapy: 0, rehab: null,
  drink: null, meds: {}, bottles: { cheap: 9999, good: 0, fine: 0 }, family: [], people: [], filmography: [], discography: [], releases: [], frozen: [],
  offers: [], timeline: [], genreXP: {}, castingPool: [], alive: true, depression: dep(), ...over });

// ── it works, which is the whole problem ──────────────────────────────────────
const s1 = st();
ok('the illness is taking two hours', slotsLost(s1) === 2);
drinkThrough(s1);
ok('and a drink buys them straight back', slotsLost(s1) === 0 && drinkingCoversSlots(s1));
ok('you cannot have the same night twice', (drinkThrough(s1), s1.drink.months === 1), String(s1.drink.months));
drinkTick(s1);
ok('and by next month you owe them again', slotsLost(s1) === 2);

// ── what it takes ─────────────────────────────────────────────────────────────
const s2 = st({ acting: 90 });
for (let m = 0; m < 24; m++) { drinkThrough(s2); drinkTick(s2); }
ok('two years of it eats the craft', s2.acting < 84, `90 → ${s2.acting.toFixed(1)}`);
ok('and it gets a hold', dependent(s2), `level ${level(s2).toFixed(0)}`);
ok('and standing goes with it', s2.respect < 60, s2.respect.toFixed(0));
console.log(`      two years drinking through it — acting 90 → ${s2.acting.toFixed(0)}, level ${level(s2).toFixed(0)} (${band(s2).label})`);

// ── once it has you, stopping on your own does not work ───────────────────────
const s3 = st();
for (let m = 0; m < 12; m++) { drinkThrough(s3); drinkTick(s3); }
ok('a year in and it has you', dependent(s3), String(level(s3).toFixed(0)));
const mentalBefore = s3.mental;
drinkTick(s3);
ok('a dry month costs you the month', s3.mental < mentalBefore, `${mentalBefore.toFixed(0)} → ${s3.mental.toFixed(0)}`);
ok('and barely moves it', level(s3) > DEPENDENT_AT - 2, level(s3).toFixed(0));
ok('the game says what happened', /went sideways/.test(s3.lastEvent), s3.lastEvent);

// early on, you can just stop
const s4 = st();
drinkThrough(s4); drinkTick(s4);
for (let m = 0; m < 6; m++) drinkTick(s4);
ok('early on you can simply stop', !s4.drink || level(s4) === 0, String(level(s4)));

// ── the footage knows ─────────────────────────────────────────────────────────
function shootWhile(drinking) {
  const s = st({ acting: 88, depression: null, drink: drinking ? { level: 60, months: 20, worstLevel: 60 } : null });
  startProduction(s, { id: 'x', projectTitle: 'P', role: 'Lead', type: 'Feature Film', genre: 'Drama',
    salary: 2000000, months: 5, tier: 'lead', scale: 'feature', prestigeScore: 70, stability: 95 });
  s.production.meter = 82;
  for (let m = 0; m < 6 && s.production; m++) { if (drinking) drinkThrough(s); productionTick(s); if (drinking) drinkTick(s); }
  return s.releases[0] ? s.releases[0].rating : null;
}
let drunkAvg = 0, soberAvg = 0, n = 0;
for (let i = 0; i < 300; i++) { const a = shootWhile(true), b = shootWhile(false); if (a != null && b != null) { drunkAvg += a; soberAvg += b; n++; } }
ok('a film shot drunk comes out worse', drunkAvg / n < soberAvg / n - 4,
  `sober ${(soberAvg / n).toFixed(0)} vs drunk ${(drunkAvg / n).toFixed(0)}`);
console.log(`      same actor, same film — sober ${(soberAvg / n).toFixed(0)}, drinking through it ${(drunkAvg / n).toFixed(0)}`);

// ── the clinic, and how long it takes ─────────────────────────────────────────
ok('caught early it is six months', rehabMonthsFor(st({ drink: { level: 20, worstLevel: 20 }, depression: null })) === 6);
ok('and left alone it is much longer', rehabMonthsFor(st({ drink: { level: 85, worstLevel: 85 }, depression: null })) >= 18);
ok('drinking on top of a depression takes longer again',
  rehabMonths(st({ drink: { level: 85, worstLevel: 85 } })) > rehabMonths(st({ drink: { level: 85, worstLevel: 85 }, depression: null })),
  `${rehabMonths(st({ drink: { level: 85, worstLevel: 85 }, depression: null }))} vs ${rehabMonths(st({ drink: { level: 85, worstLevel: 85 } }))}`);
ok('but never more than two years', rehabMonths(st({ drink: { level: 100, worstLevel: 100 } })) <= 24);
console.log(`      clinic — early ${rehabMonthsFor(st({ drink: { level: 20, worstLevel: 20 }, depression: null }))} mo · `
  + `bad ${rehabMonths(st({ drink: { level: 85, worstLevel: 85 }, depression: null }))} mo · `
  + `bad and depressed ${rehabMonths(st({ drink: { level: 85, worstLevel: 85 } }))} mo`);

const s5 = st({ drink: { level: 80, months: 30, worstLevel: 80 }, scarred: 2, cash: 900000 });
const months = rehabMonths(s5);
enterRehab(s5);
ok('it costs more when there is more to undo', s5.cash < 900000 - 90000, '€' + s5.cash.toLocaleString());
for (let i = 0; i < months; i++) rehabTick(s5);
ok('and it clears everything at once', !s5.drink && !s5.depression && s5.scarred === 0 && !inRehab(s5));
ok('it stops the game to say so', (s5.bigMoment || {}).id === 'rehab', (s5.bigMoment || {}).title);
ok('and the copy calls it what it is', /comeback/.test((s5.bigMoment || {}).body || ''));

// ── the comeback credit ───────────────────────────────────────────────────────
const back = st({ depression: null, year: 2070 });
back.filmography = [{ title: 'Old One', year: 2064, rating: 80, type: 'Feature Film', genre: 'Drama' }];
startProduction(back, { id: 'x', projectTitle: 'The Return', role: 'Lead', type: 'Feature Film', genre: 'Drama',
  salary: 1000000, months: 2, tier: 'lead', scale: 'feature', prestigeScore: 70, stability: 95 });
back.production.meter = 80;
for (let m = 0; m < 3 && back.production; m++) productionTick(back);
for (let m = 0; m < 24 && back.releases.length; m++) { back.month++; if (back.month > 11) { back.month = 0; back.year++; } releaseTick(back); }
ok('a film after years away is marked a comeback', back.filmography[0].comeback >= 3, String(back.filmography[0].comeback));
const steady = st({ depression: null, year: 2070 });
steady.filmography = [{ title: 'Last Year', year: 2069, rating: 80, type: 'Feature Film', genre: 'Drama' }];
startProduction(steady, { id: 'y', projectTitle: 'Next One', role: 'Lead', type: 'Feature Film', genre: 'Drama',
  salary: 1000000, months: 2, tier: 'lead', scale: 'feature', prestigeScore: 70, stability: 95 });
steady.production.meter = 80;
for (let m = 0; m < 3 && steady.production; m++) productionTick(steady);
for (let m = 0; m < 24 && steady.releases.length; m++) { steady.month++; if (steady.month > 11) { steady.month = 0; steady.year++; } releaseTick(steady); }
ok('and one after a normal gap is not', !steady.filmography[0].comeback);


// ── it is bought, not conjured ────────────────────────────────────────────────
const sh = st({ bottles: {}, cash: 5000 });
drinkThrough(sh);
ok('an empty house cannot drink', !drankThisMonth(sh) && /nothing in the house/i.test(sh.lastEvent), sh.lastEvent);
buyBottle(sh, 'cheap', 2);
ok('the shop sells it', bottlesInHouse(sh) === 2 && sh.cash === 5000 - BOTTLES.cheap.cost * 2, String(sh.cash));
drinkThrough(sh);
ok('and then you can', drankThisMonth(sh) && bottlesInHouse(sh) === 1);
const broke = st({ bottles: {}, cash: 10 });
buyBottle(broke, 'fine', 1);
ok('you cannot buy what you cannot afford', bottlesInHouse(broke) === 0 && broke.cash === 10);
const kid = st({ ageY: 15, bottles: { cheap: 5 } });
drinkThrough(kid);
ok('and you have to be old enough', !drankThisMonth(kid), kid.lastEvent);

// you reach for the good one first
const cellar = st({ bottles: { cheap: 1, good: 1, fine: 1 } });
drinkThrough(cellar);
ok('the good one goes first', cellar.drink.lastBottle === 'fine' && cellar.bottles.fine === 0);

// the label changes how hard it lands, not whether it lands
function twoYears(key) {
  const s = st({ acting: 90, bottles: { [key]: 9999 } });
  for (let m = 0; m < 24; m++) { drinkThrough(s); drinkTick(s); }
  return { acting: s.acting, level: level(s), respect: s.respect };
}
const rough = twoYears('cheap'), posh = twoYears('fine');
ok('the cheap stuff takes more of the craft', rough.acting < posh.acting - 4,
  `cheap ${rough.acting.toFixed(0)} vs cellar ${posh.acting.toFixed(0)}`);
ok('and money buys you nothing on the hold', Math.abs(rough.level - posh.level) < 6,
  `${rough.level.toFixed(0)} vs ${posh.level.toFixed(0)}`);
console.log(`      two years — cheap: acting ${rough.acting.toFixed(0)}, level ${rough.level.toFixed(0)}`
  + ` · cellar: acting ${posh.acting.toFixed(0)}, level ${posh.level.toFixed(0)}`);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
