import { healthTick, naturalCeiling, infectionOdds, seeDoctor, ILLNESSES }
  from '../src/systems/life/health.js';
import { agingTick, mortalityCheck } from '../src/systems/life/mortality.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', ageY: 30, stage: 'career', dream: 'actor', hasApartment: true,
  housing: 'flat', diet: 'cook', gym: false, cash: 50000, mental: 75, health: 88, looks: 60, charisma: 60,
  confidence: 50, acting: 60, singing: 0, luck: 50, scandal: 0, fame: 40, respect: 50, ap: 3, meds: {},
  filmography: [], releases: [], frozen: [], offers: [], timeline: [], alive: true, year: 2060, month: 0,
  strain: 0, burnout: null, awards: { losses: 0, wins: [], nominations: [], pending: null, history: [] }, ...over });

// ── the body puts itself back together ────────────────────────────────────────
// Found by simulating three hundred lives: illness drained health every month and
// nothing but money ever put it back, so one bad run started a spiral nobody escaped.
ok('a young body can hold nearly full health', naturalCeiling(st({ ageY: 25 })) > 90, naturalCeiling(st({ ageY: 25 })).toFixed(0));
ok('an old one cannot', naturalCeiling(st({ ageY: 80 })) < 70, naturalCeiling(st({ ageY: 80 })).toFixed(0));
ok('and the ceiling only falls with age', naturalCeiling(st({ ageY: 40 })) > naturalCeiling(st({ ageY: 60 })));

const hurt = st({ health: 45 });
for (let m = 0; m < 12; m++) { hurt.immuneUntil = 99999; healthTick(hurt); }   // no new illness, just recovery
ok('health climbs back on its own', hurt.health > 55, `45 → ${hurt.health.toFixed(0)} in a year`);
ok('but only up to what the body can hold', hurt.health <= naturalCeiling(hurt) + 0.1,
  `${hurt.health.toFixed(0)} vs ceiling ${naturalCeiling(hurt).toFixed(0)}`);
const old = st({ ageY: 78, health: 40 });
for (let m = 0; m < 60; m++) { old.immuneUntil = 99999; healthTick(old); }
ok('an old body does not climb back to a young one', old.health < 70, old.health.toFixed(0));

// ── which means being ill is no longer a spiral ───────────────────────────────
ok('being unhealthy is what makes you ill', infectionOdds(st({ health: 30 })) > infectionOdds(st({ health: 85 })) * 3,
  `${infectionOdds(st({ health: 85 })).toFixed(0)}% at 85 vs ${infectionOdds(st({ health: 30 })).toFixed(0)}% at 30`);

function lifetime(seesDoctor) {
  let reached = 0, ages = [];
  for (let i = 0; i < 250; i++) {
    const s = st({ ageY: 19, cash: seesDoctor ? 500000 : 0 });
    for (let m = 0; m < 66 * 12; m++) {
      s.month++; if (s.month > 11) { s.month = 0; s.year++; s.ageY++; agingTick(s); if (mortalityCheck(s)) break; }
      healthTick(s);
      if (!s.alive) break;
      if (seesDoctor && s.illness) seeDoctor(s);
    }
    if (s.alive) reached++; else ages.push(s.ageY);
  }
  return { reached, avg: ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : 85 };
}
const neglected = lifetime(false), treated = lifetime(true);
ok('someone who never sees a doctor still gets a life', neglected.avg > 55,
  `dies at ${neglected.avg.toFixed(0)} on average, ${neglected.reached}/250 reach 85`);
// How many reach 85 is the honest measure. The average age of the ones who DIED is not:
// the better a group does, the more of its survivors leave the average, so a group where
// far more people live to 85 can show a LOWER mean death age. It measured the wrong half.
// Noisy — 250 lives against a base that swings between 22 and 42, so the margin has to be
// wider than the noise or a working design fails one run in three.
ok('and someone who looks after themselves does better', treated.reached > neglected.reached * 1.12,
  `${treated.avg.toFixed(0)} vs ${neglected.avg.toFixed(0)}, ${treated.reached} vs ${neglected.reached} reaching 85`);
console.log(`      never sees a doctor — dies at ${neglected.avg.toFixed(0)}, ${neglected.reached}/250 reach 85`);
console.log(`      sees a doctor      — dies at ${treated.avg.toFixed(0)}, ${treated.reached}/250 reach 85`);

// ── an illness still costs you while it lasts ─────────────────────────────────
const ill = st({ health: 80 });
ill.illness = { ...ILLNESSES.serious[0], serious: true, months: 0, left: 3 };
const start = ill.health;
healthTick(ill);
ok('an illness still takes health while you have it', ill.health < start, `${start} → ${ill.health}`);
ok('and recovery does not run while you are ill', ill.health === start - ill.illness.drain);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
