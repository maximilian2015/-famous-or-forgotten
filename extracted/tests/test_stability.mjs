import { rollStability, stabilityBand, feeFactor, riskPrestige, roughness, volatility, volatileSwing,
  troubleOdds, productionTrouble, freezeProject, collapseProject, frozenTick, thawOdds, deathOdds, riskCostFor }
  from '../src/systems/career/stability.js';
import { startProduction, productionTick } from '../src/systems/career/production.js';
import { refreshCastingPool } from '../src/systems/career/castings.js';
import { negotiationFor } from '../src/systems/career/negotiate.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', ageY: 30, stage: 'career', dream: 'actor', cash: 0, fame: 40, respect: 40,
  mental: 70, acting: 70, singing: 0, looks: 50, charisma: 50, luck: 50, scandal: 0, confidence: 40, ap: 100,
  quote: 0, genreXP: {}, filmography: [], discography: [], offers: [], releases: [], frozen: [], timeline: [],
  year: 2030, month: 0, ...over });
const prod = (over) => ({ title: 'Golden Echo', role: 'Lead', type: 'Feature Film', genre: 'Thriller',
  salary: 900000, months: 6, monthsLeft: 4, paid: 300000, scale: 'feature', tier: 'lead', prestigeScore: 60,
  stability: 45, crew: [{ id: 'c', name: 'Mira Croft', role: 'Director', bond: 50 }], meter: 40, ...over });
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;

// ── the ladder of backing ─────────────────────────────────────────────────────
const rolls = {};
for (let i = 0; i < 400; i++) for (const sc of ['blockbuster', 'feature', 'recurring', 'prestige', 'indie', 'small', 'oneoff']) {
  (rolls[sc] = rolls[sc] || []).push(rollStability(sc));
}
ok('a studio tentpole is iron', avg(rolls.blockbuster) > 88, avg(rolls.blockbuster).toFixed(1));
ok('an indie is not', avg(rolls.indie) < 60, avg(rolls.indie).toFixed(1));
ok('a feature sits between them', avg(rolls.feature) > avg(rolls.indie) && avg(rolls.feature) < avg(rolls.blockbuster));
ok('a day of work cannot fall apart', Math.min(...rolls.oneoff) >= 88, String(Math.min(...rolls.oneoff)));
ok('an indie can occasionally be properly funded', Math.max(...rolls.indie) >= 70, String(Math.max(...rolls.indie)));
ok('a blockbuster is never fragile', Math.min(...rolls.blockbuster) >= 74, String(Math.min(...rolls.blockbuster)));
console.log('      backing by scale — ' + Object.keys(rolls).sort().map((k) => `${k} ${avg(rolls[k]).toFixed(0)}`).join(', '));

// every band is reachable and reads in the right direction
ok('the top band is Locked', stabilityBand(95).id === 'locked');
ok('the bottom band is fragile', stabilityBand(35).id === 'fragile');
ok('every band explains itself', [95, 80, 60, 35].every((v) => stabilityBand(v).note.length > 20));
const bandsSeen = new Set();
for (const sc of Object.keys(rolls)) for (const v of rolls[sc]) bandsSeen.add(stabilityBand(v).id);
ok('all four bands actually appear in play', bandsSeen.size === 4, [...bandsSeen].join(','));

// ── risk is paid for ──────────────────────────────────────────────────────────
// Shaky money pays LESS, not more. It has none — that is why it is shaky. What it has
// to offer instead is the part and the chance the finished thing is something.
ok('a locked project pays the plain rate', feeFactor(95) > 0.99 && feeFactor(95) <= 1, feeFactor(95).toFixed(3));
ok('a broke one pays about half', feeFactor(35) < 0.56, feeFactor(35).toFixed(3));
ok('the discount moves smoothly', feeFactor(45) < feeFactor(65) && feeFactor(65) < feeFactor(85));
ok('nothing ever pays over the rate for being risky', [95, 80, 62, 45, 32].every((v) => feeFactor(v) <= 1));
ok('shaky money buys better material', riskPrestige(40) > riskPrestige(85), `${riskPrestige(40)} vs ${riskPrestige(85)}`);
console.log(`      fee — locked ×${feeFactor(95).toFixed(2)}, shaky ×${feeFactor(62).toFixed(2)}, no real money ×${feeFactor(35).toFixed(2)}`);
ok('and a broke production is rougher for it', roughness(35) > roughness(85), `${roughness(35).toFixed(1)} vs ${roughness(85).toFixed(1)} rating points`);
ok('locked money is not rough at all', roughness(90) === 0);

// ── and it can blow up, which is the point ────────────────────────────────────
ok('a locked picture barely swings', volatility(95) <= 1, String(volatility(95)));
ok('a fragile one swings hard', volatility(35) >= 15, String(volatility(35)));
let swings = [];
for (let i = 0; i < 600; i++) swings.push(volatileSwing(35));
ok('the swing goes both ways', Math.min(...swings) < -12 && Math.max(...swings) > 12, `${Math.min(...swings)}..${Math.max(...swings)}`);
ok('and averages out to nothing', Math.abs(avg(swings)) < 2, avg(swings).toFixed(2));

// An indie really can become the film of the year. Measured end to end, through the
// actual wrap, not through the helper.
function shootOut(stability, prestige) {
  const s = st({ acting: 62, fame: 30 });
  startProduction(s, { id: 'x', projectTitle: 'Paper Line', role: 'Lead', type: 'Indie Film', genre: 'Drama',
    salary: 200000, months: 3, tier: 'lead', scale: 'indie', prestigeScore: prestige, stability });
  s.production.meter = 62;
  s.production.stability = stability;   // pin it, we are measuring the swing not the roll
  for (let i = 0; i < 6 && s.production; i++) productionTick(s);
  return s.releases[0] ? s.releases[0].rating : null;
}
let breakout = 0, disaster = 0, safeBreak = 0, ran = 0;
for (let i = 0; i < 500; i++) {
  const risky = shootOut(38, 62);
  if (risky != null) { ran++; if (risky >= 85) breakout++; if (risky < 45) disaster++; }
  const safe = shootOut(95, 62);
  if (safe != null && safe >= 85) safeBreak++;
}
ok('a risky indie can be the film of the year', breakout > 0, `${breakout}/${ran} came out at 85+`);
ok('and can be nothing at all', disaster > 0, `${disaster}/${ran} came out under 45`);
ok('a locked project of the same material does neither as often', breakout > safeBreak, `risky ${breakout} vs locked ${safeBreak}`);
console.log(`      same script, same actor — shaky money: ${breakout} hits and ${disaster} disasters in ${ran}; locked money: ${safeBreak} hits`);

// ── projects actually stop ────────────────────────────────────────────────────
ok('a locked project effectively never dies', troubleOdds({ stability: 95 }) < 0.05, troubleOdds({ stability: 95 }).toFixed(3) + '%/mo');
ok('a fragile one is a genuine gamble', troubleOdds({ stability: 35 }) > 2, troubleOdds({ stability: 35 }).toFixed(2) + '%/mo');
console.log('      trouble per month — ' + [95, 80, 62, 45, 35].map((v) => `${v}: ${troubleOdds({ stability: v }).toFixed(2)}%`).join(', '));

// over a whole shoot, how often does a fragile project reach its last day?
function runToEnd(stability, months) {
  const s = st({ cash: 0 });
  startProduction(s, { id: 'x', projectTitle: 'Paper Line', role: 'Lead', type: 'Indie Film', genre: 'Drama',
    salary: 200000, months, tier: 'lead', scale: 'indie', prestigeScore: 50, stability });
  for (let i = 0; i < months + 2 && s.production; i++) productionTick(s);
  return s.releases.length ? 'finished' : s.frozen.length ? 'frozen' : 'collapsed';
}
const outcome = { finished: 0, frozen: 0, collapsed: 0 };
for (let i = 0; i < 800; i++) outcome[runToEnd(36, 4)]++;
ok('most fragile shoots still finish', outcome.finished > 500, JSON.stringify(outcome));
ok('but a real slice does not', outcome.frozen + outcome.collapsed > 60, JSON.stringify(outcome));
ok('freezing is commoner than dying', outcome.frozen > outcome.collapsed, `${outcome.frozen} frozen vs ${outcome.collapsed} dead`);
console.log(`      a 4-month shoot on fragile money (800 runs) — ${outcome.finished} finished, ${outcome.frozen} frozen, ${outcome.collapsed} collapsed`);
const solidOut = { finished: 0, frozen: 0, collapsed: 0 };
for (let i = 0; i < 800; i++) solidOut[runToEnd(90, 4)]++;
ok('a locked shoot of the same length essentially always finishes', solidOut.finished > 790, JSON.stringify(solidOut));

// ── what a freeze and a collapse do to you ────────────────────────────────────
const fz = st({ mental: 70 });
fz.production = prod();
const frozen = freezeProject(fz, fz.production);
ok('a freeze empties the calendar', fz.production === null && fz.frozen.length === 1);
ok('you keep what you were paid', frozen.paid === 300000 && frozen.owed === 600000, JSON.stringify({ paid: frozen.paid, owed: frozen.owed }));
ok('it remembers what is left to shoot', frozen.monthsLeft === 4);
ok('a freeze stops the game', fz.bigMoment && fz.bigMoment.id === 'shutdown' && fz.bigMoment.frozen === true);
ok('and says why', /financier|bond|fund|studio|producer/.test(fz.bigMoment.reason), fz.bigMoment.reason);
ok('it costs you something', fz.mental < 70, String(fz.mental));
ok('the diary records it', /freeze/.test(JSON.stringify(fz.timeline)), JSON.stringify(fz.timeline));

const cl = st({ mental: 70 });
cl.production = prod();
collapseProject(cl, cl.production);
ok('a collapse leaves nothing behind', cl.production === null && cl.frozen.length === 0 && cl.releases.length === 0);
ok('a collapse stops the game too', cl.bigMoment.id === 'shutdown' && cl.bigMoment.frozen === false);
ok('and hurts more than a freeze', cl.mental < fz.mental, `${cl.mental} vs ${fz.mental}`);

// ── the long wait ─────────────────────────────────────────────────────────────
ok('nothing thaws the month it stops', thawOdds({ since: 0, stability: 60 }, 1) === 0);
ok('and nobody kills it inside the first year', deathOdds({ since: 0, stability: 60 }, 11) === 0);
ok('a better project is likelier to be rescued', thawOdds({ since: 0, stability: 80 }, 4) > thawOdds({ since: 0, stability: 40 }, 4),
  `${thawOdds({ since: 0, stability: 80 }, 4).toFixed(2)}% vs ${thawOdds({ since: 0, stability: 40 }, 4).toFixed(2)}%`);
ok('the longer it sits the deader it gets', deathOdds({ since: 0 }, 40) > deathOdds({ since: 0 }, 14));
// month zero is a real month — `since: 0` must not be read as "no date"
ok('a project frozen in month zero still ages', thawOdds({ since: 0, stability: 60 }, 6) > 0);

function waitOut() {
  const s = st();
  s.production = prod({ stability: 50 });
  freezeProject(s, s.production);
  for (let m = 0; m < 120 && s.frozen.length; m++) {
    s.month += 1; if (s.month > 11) { s.month = 0; s.year += 1; }
    frozenTick(s);
  }
  const months = (s.year - 2030) * 12 + s.month;
  return { thawed: s.offers.length > 0, months, offer: s.offers[0] };
}
const RUNS = 800;
let thawed = 0, died = 0, waits = [];
for (let i = 0; i < RUNS; i++) { const r = waitOut(); if (r.thawed) { thawed++; waits.push(r.months); } else died++; }
const rate = thawed / RUNS;
// Close to a coin toss now that the production only holds your part open for as long as
// your name is worth holding it for. At fame 40 they wait about two and a half years.
ok('a frozen project is roughly a coin toss', rate > 0.42 && rate < 0.68, `${(rate * 100).toFixed(1)}% came back`);
ok('but a real share never do', died / RUNS > 0.2, `${((died / RUNS) * 100).toFixed(1)}% were written off`);
ok('and it always resolves eventually', thawed + died === RUNS);
console.log(`      frozen on 50 backing (${RUNS} runs) — ${thawed} came back after ${avg(waits).toFixed(1)} months on average, ${died} written off`);
const back = waitOut();
if (back.thawed) {
  ok('the thaw arrives as a playable offer', back.offer.months >= 1 && back.offer.salary > 0 && back.offer.deadline > 0, JSON.stringify(back.offer));
  ok('it pays only what was still owed', back.offer.salary === 600000, '€' + back.offer.salary.toLocaleString());
  ok('and whoever rescued it has better money', back.offer.stability > 50, String(back.offer.stability));
  ok('the offer explains itself', /found the money|money came back/.test(back.offer.note), back.offer.note);
} else { ok('the thaw arrives as a playable offer', true, 'this run was abandoned'); }

// ── the listing tells you before you sign ─────────────────────────────────────
const shop = st({ fame: 70 });
refreshCastingPool(shop, true);
ok('every listing declares its backing', shop.castingPool.every((c) => typeof c.stability === 'number' && c.stability > 0), JSON.stringify(shop.castingPool.map((c) => c.stability)));
ok('and none of them pays over the rate for being risky', shop.castingPool.every((c) => c.feeFactor > 0 && c.feeFactor <= 1));
// A risky job must still be negotiable — arguing against the plain band would leave a
// fragile indie with nothing to ask for.
let risky = null;
for (let i = 0; i < 400 && !risky; i++) { const s = st({ fame: 70 }); refreshCastingPool(s, true); risky = s.castingPool.find((c) => c.stability < 55 && !c.perEpisode); if (risky) risky._s = s; }
if (risky) {
  const n = negotiationFor(risky._s, risky);
  ok('a risky job is still worth arguing about', n && n.asks.length >= 2, JSON.stringify(n && n.asks.map((a) => a.amount)));
  ok('and its ceiling clears what they opened with', n.ceiling > n.quoted, `€${n.quoted.toLocaleString()} → €${n.ceiling.toLocaleString()}`);
} else { ok('a risky job is still worth arguing about', false, 'no fragile film listing generated'); }

// ── the risk means different things to different people ───────────────────────
ok('a nobody is told they have nothing to lose', riskCostFor(st({ fame: 8 }), 45).id === 'nothing', riskCostFor(st({ fame: 8 }), 45).line);
ok('a star is told it is a real gamble', riskCostFor(st({ fame: 80 }), 45).id === 'real', riskCostFor(st({ fame: 80 }), 45).line);
ok('and a locked project says nothing at all', riskCostFor(st({ fame: 80 }), 95).id === 'none');
ok('nor does solid money — that is not a gamble', riskCostFor(st({ fame: 80 }), 80).id === 'none');

// A job that resolves the same evening cannot fall apart, so it is never priced as if
// it might — a one-day short paying a risk premium would be free money.
let sameDay = 0, sameDayRisky = 0;
for (let i = 0; i < 200; i++) {
  const s = st({ fame: 40 }); refreshCastingPool(s, true);
  for (const c of s.castingPool) if ((c.months || 1) < 2) { sameDay++; if (stabilityBand(c.stability).id !== 'locked') sameDayRisky++; }
}
ok('one-day work is always locked money', sameDay > 0 && sameDayRisky === 0, `${sameDayRisky} risky out of ${sameDay} same-day listings`);

// ── THE POINT: neither option may dominate ────────────────────────────────────
// Before this, the shaky project paid more AND gave better material AND was the only
// route to a hit — so there was nothing to decide. Safe money has to win at something.
function playOut(stability, runs = 3000) {
  const out = { never: 0, flop: 0, ok: 0, hit: 0, cash: 0 };
  for (let i = 0; i < runs; i++) {
    const s = st({ acting: 80, fame: 55, cash: 0 });
    startProduction(s, { id: 'x', projectTitle: 'P', role: 'Lead', type: 'Indie Film', genre: 'Drama',
      salary: Math.round(400000 * feeFactor(stability)), months: 4, tier: 'lead', scale: 'indie',
      prestigeScore: 50 + riskPrestige(stability), stability });
    s.production.meter = 72;
    for (let m = 0; m < 6 && s.production; m++) productionTick(s);
    out.cash += s.cash;
    if (!s.releases.length) { out.never++; continue; }
    const r = s.releases[0].rating;
    if (r >= 85) out.hit++; else if (r >= 55) out.ok++; else out.flop++;
  }
  return out;
}
const safe = playOut(95), gamble = playOut(38);
ok('safe money pays better', safe.cash > gamble.cash * 1.6,
  `€${Math.round(safe.cash / 3000).toLocaleString()} vs €${Math.round(gamble.cash / 3000).toLocaleString()}`);
ok('safe money always delivers a film', safe.never === 0 && gamble.never > 300,
  `locked ${safe.never}/3000 lost, no-money ${gamble.never}/3000 lost`);
ok('but only shaky money can break you out at this level', gamble.hit > safe.hit * 4,
  `${(gamble.hit / 30).toFixed(1)}% vs ${(safe.hit / 30).toFixed(1)}% hits`);
ok('and it can also embarrass you', gamble.flop > safe.flop,
  `${(gamble.flop / 30).toFixed(1)}% vs ${(safe.flop / 30).toFixed(1)}% flops`);
console.log(`      the actual choice, same part, actor 80 —`);
console.log(`        Locked        €${Math.round(safe.cash / 3000).toLocaleString().padStart(7)} · no film ${(safe.never / 30).toFixed(1)}% · flop ${(safe.flop / 30).toFixed(1)}% · hit ${(safe.hit / 30).toFixed(1)}%`);
console.log(`        No real money €${Math.round(gamble.cash / 3000).toLocaleString().padStart(7)} · no film ${(gamble.never / 30).toFixed(1)}% · flop ${(gamble.flop / 30).toFixed(1)}% · hit ${(gamble.hit / 30).toFixed(1)}%`);

// The mean must NOT move — shaky money widens the result, it does not raise or lower it.
function meanRating(stability, runs = 4000) {
  let sum = 0, n = 0, lo = 100, hi = 0;
  for (let i = 0; i < runs; i++) {
    const s = st({ acting: 80, fame: 55 });
    startProduction(s, { id: 'x', projectTitle: 'P', role: 'Lead', type: 'Indie Film', genre: 'Drama',
      salary: 200000, months: 4, tier: 'lead', scale: 'indie', prestigeScore: 50 + riskPrestige(stability), stability });
    s.production.meter = 72;
    for (let m = 0; m < 6 && s.production; m++) productionTick(s);
    if (!s.releases.length) continue;
    const r = s.releases[0].rating; sum += r; n++; lo = Math.min(lo, r); hi = Math.max(hi, r);
  }
  return { avg: sum / n, lo, hi };
}
const mSafe = meanRating(95), mRisk = meanRating(38);
ok('shaky money does not change what you deserve on average', Math.abs(mSafe.avg - mRisk.avg) < 4,
  `locked ${mSafe.avg.toFixed(1)} vs no-money ${mRisk.avg.toFixed(1)}`);
// A locked picture can lose it in the edit too, just far less often — so the safe range is
// no longer a narrow band and the multiple between them is smaller than it was.
ok('it only widens the result', (mRisk.hi - mRisk.lo) > (mSafe.hi - mSafe.lo) * 1.35,
  `locked ${Math.round(mSafe.lo)}–${Math.round(mSafe.hi)} vs no-money ${Math.round(mRisk.lo)}–${Math.round(mRisk.hi)}`);
console.log(`      same actor — Locked lands ${Math.round(mSafe.lo)}–${Math.round(mSafe.hi)} (avg ${mSafe.avg.toFixed(0)}), No real money lands ${Math.round(mRisk.lo)}–${Math.round(mRisk.hi)} (avg ${mRisk.avg.toFixed(0)})`);

// ── how long they will hold your part open ────────────────────────────────────
// Maxi: a financier waits years for a name and recasts an unknown. Either way it runs out.
import { patienceFor } from '../src/systems/career/stability.js';
ok('a nobody is recast within a year or so', patienceFor(0) <= 18, patienceFor(0) + ' months');
ok('an icon is waited for, for years', patienceFor(92) >= 48, patienceFor(92) + ' months');
ok('and everyone runs out of patience eventually', patienceFor(100) < 120, patienceFor(100) + ' months');
console.log('      they hold it — ' + [0, 25, 50, 75, 92].map((f) => `fame ${f}: ${patienceFor(f)} mo`).join(', '));

const held = { since: 0, stability: 70, patience: 24 };
ok('nothing thaws once the window has gone', thawOdds(held, 30) === 0, String(thawOdds(held, 30)));
ok('and it is certainly dead by then', deathOdds(held, 30) === 100, String(deathOdds(held, 30)));
ok('but it is alive inside the window', thawOdds(held, 10) > 0);

// letting one die costs you, and costs more if you were the reason
function abandon(byYou) {
  const s = st({ respect: 60, fame: 40 });
  s.frozen = [{ id: 'f', title: 'The Quiet Hours', role: 'Lead', type: 'Feature Film', genre: 'Drama',
    scale: 'indie', monthsLeft: 3, stability: 50, since: 0, patience: 12, owed: 200000, paid: 100000,
    byYou, why: 'x' }];
  s.year = 0; s.month = 40;   // long past the window
  frozenTick(s);
  return s;
}
const theirFault = abandon(false), yourFault = abandon(true);
// The old rule charged you for a film the FINANCIER let die — −3, and −6 with the line "you
// never went back", when a way back is offered a few per cent of months and usually never.
// Measured on a perfect player it was the single biggest reason standing sat below zero for
// a decade. The money dying is not your fault, and the game says so now.
ok('a film the money let die costs you nothing', theirFault.respect === 60, String(theirFault.respect));
ok('and the diary does not blame you for it', /nobody blames you/.test(JSON.stringify(theirFault.timeline)), JSON.stringify(theirFault.timeline.slice(-1)));
ok('but one that died because you walked off it does cost you', yourFault.respect < 60, String(yourFault.respect));
ok('and more again when they held it open and you never went back', yourFault.respect <= 60 - 9 && /recast/.test(JSON.stringify(yourFault.timeline)),
  `${yourFault.respect} · ${JSON.stringify(yourFault.timeline.slice(-1))}`);
ok('and it is gone from the freezer', theirFault.frozen.length === 0 && yourFault.frozen.length === 0);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
