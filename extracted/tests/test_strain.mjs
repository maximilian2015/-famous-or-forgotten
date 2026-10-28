import { strainTick, canWork, burnedOut, strainBand, markRested, monthlyStrain, REST_GAIN, IDLE_GAIN }
  from '../src/systems/life/strain.js';
import { startProduction, productionTick } from '../src/systems/career/production.js';
import { releaseTick } from '../src/systems/career/release.js';
import { refreshCastingPool, auditionFor } from '../src/systems/career/castings.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', ageY: 32, gender: 'male', stage: 'career', dream: 'actor',
  hasApartment: true, housing: 'flat', cash: 500000, mental: 78, health: 85, acting: 85, singing: 0,
  charisma: 65, looks: 62, luck: 50, scandal: 0, fame: 60, respect: 65, ap: 100, quote: 0,
  year: 2060, month: 0, strain: 0, burnout: null, filmography: [], discography: [], releases: [],
  frozen: [], offers: [], people: [], family: [], genreXP: {}, timeline: [], castingPool: [],
  awards: { losses: 0, wins: [], nominations: [], pending: null, history: [] }, alive: true, ...over });
const shoot = (s, scale = 'feature', months = 5) => {
  startProduction(s, { id: 'x', projectTitle: 'P' + Math.random().toString(36).slice(2, 6), role: 'Lead',
    type: 'Feature Film', genre: 'Drama', salary: 2000000, months, tier: 'lead', scale,
    prestigeScore: 70, stability: 92 });
  s.production.meter = 80;
};

// ── shooting costs you, resting gives it back ─────────────────────────────────
ok("a big shoot costs more than a small one", monthlyStrain({ scale: "blockbuster" }, 40) > monthlyStrain({ scale: "small" }, 40));
ok("and a tired month costs more than a rested one", monthlyStrain({ scale: "feature" }, 80) > monthlyStrain({ scale: "feature" }, 10) * 1.6, `${monthlyStrain({ scale: "feature" }, 10).toFixed(1)} rested vs ${monthlyStrain({ scale: "feature" }, 80).toFixed(1)} tired`);
const busy = st(); shoot(busy);
for (let m = 0; m < 5; m++) strainTick(busy);
ok('five months on set leaves a mark', busy.strain > 20, busy.strain.toFixed(0));
const resting = st({ strain: busy.strain });
for (let m = 0; m < 5; m++) strainTick(resting);
ok('five months off gives it back', resting.strain < busy.strain, `${busy.strain.toFixed(0)} → ${resting.strain.toFixed(0)}`);
ok('resting properly beats idling', REST_GAIN > IDLE_GAIN);
const restedOne = st({ strain: 50 }); markRested(restedOne); strainTick(restedOne);
const idledOne = st({ strain: 50 }); strainTick(idledOne);
ok('and the Rest action is the faster way down', restedOne.strain < idledOne.strain,
  `rested ${restedOne.strain.toFixed(1)} vs idle ${idledOne.strain.toFixed(1)}`);

// ── one project a year never comes near it ────────────────────────────────────
function normalCareer(years, gapMonths) {
  const s = st(); let gap = 0, peak = 0, collapses = 0;
  for (let m = 0; m < years * 12; m++) {
    s.month++; if (s.month > 11) { s.month = 0; s.year++; s.ageY++; }
    if (!s.production && !burnedOut(s) && ++gap >= gapMonths) { gap = 0; shoot(s); }
    strainTick(s);
    if (s.production) productionTick(s);
    releaseTick(s);
    if ([s.bigMoment, ...(s.moments || [])].some((m) => m && m.id === 'burnout')) collapses++;
    s.bigMoment = null; s.moments = [];   // the player dismisses what comes up; moments queue now
    peak = Math.max(peak, s.strain || 0);
    s.ap = 100;
  }
  return { peak, collapses, credits: s.filmography.length };
}
const sane = normalCareer(30, 12);
ok('a film a year never burns you out', sane.collapses === 0, `${sane.collapses} collapses, peak strain ${sane.peak.toFixed(0)}`);
console.log(`      one film a year for thirty years — peak strain ${sane.peak.toFixed(0)}, ${sane.credits} credits, ${sane.collapses} collapses`);

// ── back to back does ─────────────────────────────────────────────────────────
// Averaged, because a single career swings between none and five. Maxi's target: three
// or four across a lifetime if you take too much, none at all if you pace yourself.
// It used to fire eleven times in thirty years and twenty-eight across a full life.
function avgCareer(years, gap, runs = 120) {
  let col = 0, cr = 0;
  for (let i = 0; i < runs; i++) { const r = normalCareer(years, gap); col += r.collapses; cr += r.credits; }
  return { collapses: col / runs, credits: cr / runs };
}
const grind = avgCareer(30, 0);
ok('shooting back to back does', grind.collapses > 1.5, `${grind.collapses.toFixed(1)} collapses in thirty years`);
// Burnout Core (27 Oct): never once stopping for thirty years, never resting and never
// answering the doctor, is the extreme the step exists for — every few years, not every year,
// and each one now costs parts as well as months (life/burnout.js). With the Rest action and a
// break it is none (tests/probes/probe_burnout.mjs, "ambitious").
ok('but every few years, not every year', grind.collapses < 12,
  `${grind.collapses.toFixed(1)} in thirty years of never once stopping`);
ok('and it still caps how much you can make', grind.credits < 80, `${grind.credits.toFixed(0)} credits`);
const paced = avgCareer(30, 4);
const sensible = avgCareer(30, 12);
ok('pacing yourself avoids it entirely', sensible.collapses < 0.4, sensible.collapses.toFixed(2));
console.log(`      no gaps at all      — ${grind.credits.toFixed(0)} credits, ${grind.collapses.toFixed(1)} collapses`);
console.log(`      four-month breather — ${paced.credits.toFixed(0)} credits, ${paced.collapses.toFixed(1)} collapses`);
console.log(`      one film a year     — ${sensible.credits.toFixed(0)} credits, ${sensible.collapses.toFixed(1)} collapses`);

// ── what a collapse actually does ─────────────────────────────────────────────
// The collapse is a roll — a 1.5% monthly risk at maximum strain means two hundred red
// months usually break somebody but are not obliged to, and the assertions below then read
// a null burnout and take the whole suite down with a TypeError. Start again if it holds.
let burnt, guard = 0;
for (let attempt = 0; attempt < 12; attempt++) {
  burnt = st({ strain: 99 }); shoot(burnt);
  burnt.production.paid = 400000;
  guard = 0;
  while (!burnedOut(burnt) && guard++ < 200) strainTick(burnt);
  if (burnedOut(burnt)) break;
}
ok('it eventually stops you', burnedOut(burnt), `after ${guard} months at the top`);
ok('for months, not weeks', burnt.burnout.left >= 2, String(burnt.burnout.left));
// Burnout Core (life/burnout.js): no freezer and no endless wait. The production decides on the
// day — a well-funded lead with a name is held for a while, or finished without your last scenes,
// or recast — and the decision is said at once.
ok('nothing goes into the freezer', (burnt.frozen || []).length === 0, JSON.stringify(burnt.frozen));
ok('the production decided, and it is on the screen', burnt.bigMoment && burnt.bigMoment.id === 'burnout'
  && /wait for you|shoot around you|without your last scenes|recast/.test(burnt.bigMoment.body), burnt.bigMoment && burnt.bigMoment.body);
ok('and it costs you', burnt.mental < 78 && burnt.health < 85);
ok('but never your standing — illness is not a breach', burnt.respect === 65, String(burnt.respect));
const heldSet = (burnt.productions || [])[0];

// ── and you cannot work while signed off ──────────────────────────────────────
ok('you are told you cannot work', !canWork(burnt).ok && /signed off/.test(canWork(burnt).why), canWork(burnt).why);
burnt.ap = 3; burnt.castingPool = [];
refreshCastingPool(burnt, true);
const before = burnt.ap, setsBefore = (burnt.productions || []).length;
auditionFor(burnt, burnt.castingPool[0].id, 90);
ok('auditioning is refused without spending the month', (burnt.productions || []).length === setsBefore && burnt.ap === before, burnt.lastEvent);
ok('and the refusal explains itself', /signed off/.test(burnt.lastEvent), burnt.lastEvent);

// ── it ends, and you come back ────────────────────────────────────────────────
let months = 0;
while (burnedOut(burnt) && months++ < 24) strainTick(burnt);
ok('the time off runs out', !burnedOut(burnt), `${months} months`);
// Rested, out of the red — but not wiped to 30 on the day you are cleared: the months off take off
// what they take at the pace the 36-month load allows (28 Oct; the reset made a two-month pause a
// better rest than a year away).
ok('and you come back rested, not where you left off', (burnt.strain || 0) < 70, burnt.strain.toFixed(0));
ok('you can work again', canWork(burnt).ok);
ok('and the game says so', /cleared to work/i.test(burnt.lastEvent), burnt.lastEvent);
if (heldSet) ok('a part they held for you starts again when you are cleared', !((heldSet.heldUntil || 0) > burnt.year * 12 + burnt.month), String(heldSet.heldUntil));

// ── you do not go through it twice in a row ───────────────────────────────────
// Same roll, same retry — see above.
let twice, first = 0;
for (let attempt = 0; attempt < 12; attempt++) {
  twice = st({ strain: 100 }); shoot(twice);
  first = 0;
  while (!burnedOut(twice) && first++ < 300) { twice.strain = 100; strainTick(twice); }
  if (burnedOut(twice)) break;
}
const when = (twice.year || 0) * 12 + (twice.month || 0);
// The risk roll is a roll: 300 red months usually collapse somebody but are not obliged to.
// Without this line the shield assertion below quietly measured a character who never did.
ok('three hundred red months do collapse you', burnedOut(twice), `still standing after ${first}`);
ok('a collapse leaves you shielded for a while afterwards', (twice._burntUntil || 0) > when + 12,
  `${(twice._burntUntil || 0) - when} months of cover`);
let second = 0;
while (burnedOut(twice) && second++ < 30) strainTick(twice);
twice.strain = 100; shoot(twice);
let again = 0;
while (!burnedOut(twice) && again++ < 24) { twice.strain = 100; strainTick(twice); }
ok('and it cannot happen again immediately', again >= 12, `${again} months before it could recur`);

// ── it takes months of ignoring it, not one bad month ─────────────────────────
const oneBad = st({ strain: 95 }); shoot(oneBad);
strainTick(oneBad); strainTick(oneBad);
ok('two months in the red is not enough to collapse', !burnedOut(oneBad));

// ── the bands read in the right order ─────────────────────────────────────────
ok('the bands climb', strainBand(10).id === 'rested' && strainBand(45).id === 'working'
  && strainBand(70).id === 'tired' && strainBand(90).id === 'burning');


// ── and what the insurers do with it ──────────────────────────────────────────
// It was a permanent count of collapses: ×0.86 each for life, "three shoots stopped because of
// you", the Difficult risk. Illness is not a breach (burnout-audit §6, §13): a RECENT medical stop
// costs the biggest rooms some confidence, a forced one more than a chosen one, and it fades.
import { insurability, unreliable } from '../src/systems/life/strain.js';
import { castingChance as cc } from '../src/systems/career/castings.js';
import { naturalCeiling } from '../src/systems/life/health.js';
const at = 2060 * 12;
ok('a count of old collapses alone costs nothing', insurability(st({ burnouts: 5 })) === 1);
ok('a forced stop this year costs some confidence', insurability(st({ medical: [{ at, forced: true }] })) < 0.92,
  insurability(st({ medical: [{ at, forced: true }] })).toFixed(2));
ok('a pause you chose costs less', insurability(st({ medical: [{ at, forced: false }] })) > insurability(st({ medical: [{ at, forced: true }] })));
ok('and three years later it is gone', insurability(st({ medical: [{ at: at - 37, forced: true }] })) === 1);
ok('even three stops in three years never shut you out', insurability(st({ medical: [0, 1, 2].map((k) => ({ at: at - k, forced: true })) })) >= 0.7);
ok('the life card says "on file", not "because of you"', unreliable(st({ medical: [{ at, forced: true }] })) && !unreliable(st({ burnouts: 4 })));
ok('it shows in the room while it lasts', cc(st({ medical: [{ at, forced: true }, { at: at - 2, forced: true }] }), { role: 'Lead' }) < cc(st(), { role: 'Lead' }));
ok('and the body keeps a little of it forever', naturalCeiling(st({ ageY: 40, burnouts: 4 })) < naturalCeiling(st({ ageY: 40, burnouts: 0 })));
// Depression is not burnout: it does not start because a counter reached four.
const fourth = st({ strain: 100, burnouts: 3, mental: 70, _redMonths: 40 }); shoot(fourth);
for (let k = 0; k < 400 && !burnedOut(fourth); k++) { fourth.strain = 100; fourth.mental = 70; strainTick(fourth); }
ok('a fourth collapse with your head above water is not depression', burnedOut(fourth) && !fourth.depression);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
