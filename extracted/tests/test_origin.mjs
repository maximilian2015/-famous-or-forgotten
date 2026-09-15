import { beginLife, allowanceTick, classOf, CLASSES, CLASS_ORDER } from '../src/systems/life/origin.js';
import { askFamilyForMoney } from '../src/systems/life/family.js';
import { interact } from '../src/systems/life/interactions.js';
import { createInitialState } from '../src/state/initialState.js';

let fails = 0;
const ok = (name, cond, extra = '') => { if (!cond) { fails++; console.log('FAIL  ' + name + (extra ? ' :: ' + extra : '')); } else console.log('ok    ' + name); };
const born = (opts) => { const s = createInitialState({ name: 'Mila Bon', city: 'Amsterdam', startYear: 2026, created: true, ...opts }); beginLife(s); return s; };

ok('newborn owns nothing', createInitialState().cash === 0);

// 400 births — distribution, structure, and that nothing throws
const seen = {}; let noStory = 0, badSib = 0, singles = 0, noMum = 0, storyHasUndefined = 0;
const lives = [];
for (let i = 0; i < 400; i++) {
  const s = born(); lives.push(s);
  seen[s.familyClass] = (seen[s.familyClass] || 0) + 1;
  if (!s.originStory || s.originStory.length < 60) noStory++;
  if (/undefined|NaN|\[object/.test(s.originStory)) storyHasUndefined++;
  const mum = s.family.find((p) => p.relation === 'Mother');
  if (!mum) noMum++;
  if (!s.family.find((p) => p.relation === 'Father')) singles++;
  // siblings must be older than a newborn
  if (s.family.some((p) => (p.relation === 'Brother' || p.relation === 'Sister') && p.age < 1)) badSib++;
}
ok('every life gets a story', noStory === 0, 'empty=' + noStory);
ok('no undefined leaks into the story', storyHasUndefined === 0, 'bad=' + storyHasUndefined);
ok('every life has a mother', noMum === 0);
ok('siblings are older than the newborn', badSib === 0, 'bad=' + badSib);
ok('all five classes appear', CLASS_ORDER.every((k) => seen[k] > 0), JSON.stringify(seen));
ok('rich is rare', seen.rich / 400 < 0.12, 'rich=' + (seen.rich / 400 * 100).toFixed(1) + '%');
// Distribution needs a bigger sample than 400 to judge — check the shape, not the winner.
const big = {}; const N = 6000;
for (let i = 0; i < N; i++) { const s = born(); big[s.familyClass] = (big[s.familyClass] || 0) + 1; }
const share = (k) => big[k] / N * 100;
const weightPct = (k) => CLASSES[k].weight / CLASS_ORDER.reduce((n, x) => n + CLASSES[x].weight, 0) * 100;
const off = CLASS_ORDER.map((k) => Math.abs(share(k) - weightPct(k)));
ok('classes come out at their weights', Math.max(...off) < 2.5, CLASS_ORDER.map((k) => `${k} ${share(k).toFixed(1)}% (want ${weightPct(k).toFixed(0)}%)`).join(', '));
ok('the middle two are most of all lives', share('getting_by') + share('comfortable') > 55, (share('getting_by') + share('comfortable')).toFixed(1) + '%');
const singlePct = singles / 400 * 100;
ok('single parents happen but are the minority', singlePct > 2 && singlePct < 25, singlePct.toFixed(1) + '%');

// the story must agree with the family that exists
let mismatch = 0;
for (const s of lives.slice(0, 120)) {
  const mum = s.family.find((p) => p.relation === 'Mother');
  const dad = s.family.find((p) => p.relation === 'Father');
  if (!s.originStory.includes(mum.name)) mismatch++;
  if (dad && !s.originStory.includes(dad.name)) mismatch++;
  if (!dad && /and .* married/.test(s.originStory)) mismatch++;
}
ok('story names the real parents', mismatch === 0, 'mismatches=' + mismatch);

// English, checked against every job in every class
const articleBugs = [];
for (const s of lives) {
  const m = s.originStory.match(/\ban? [a-z ]+?(?=[,.])/g) || [];
  for (const phrase of m) {
    if (/^an (?:uni|eu|use|one)/.test(phrase)) articleBugs.push(phrase);
    if (/^a [aeiou]/.test(phrase) && !/^a (?:uni|eu|use|one)/.test(phrase)) articleBugs.push(phrase);
  }
}
ok('a vs an is right', articleBugs.length === 0, [...new Set(articleBugs)].join(' | '));
let dupName = 0, dupJob = 0;
for (const s of lives) {
  const first = s.family.map((p) => p.name.split(' ')[0]);
  if (new Set(first).size !== first.length) dupName++;
  const parentJobs = s.family.filter((p) => p.relation === 'Mother' || p.relation === 'Father').map((p) => p.job).filter((j) => j !== 'unemployed');
  if (new Set(parentJobs).size !== parentJobs.length) dupJob++;
}
ok('no two relatives share a first name', dupName === 0, 'clashes=' + dupName);
ok('parents do not share a job', dupJob === 0, 'clashes=' + dupJob);
const years = new Set(lives.map((s) => (s.originStory.match(/married (\w+) years/) || [])[1]).filter(Boolean));
ok('marriage length varies', years.size > 4, [...years].join(','));

// parent jobs come from the class pool
let wrongJob = 0;
for (const s of lives) {
  const pool = classOf(s).jobs;
  for (const p of s.family.filter((x) => x.relation === 'Mother' || x.relation === 'Father')) {
    if (p.job !== 'unemployed' && !pool.includes(p.job)) wrongJob++;
  }
}
ok('parent jobs match the family class', wrongJob === 0, 'wrong=' + wrongJob);

// the inherited gift actually moves a stat
let moved = 0;
for (const s of lives.slice(0, 200)) {
  const fresh = createInitialState();
  if (['singing', 'acting', 'looks', 'charisma', 'discipline', 'confidence'].some((k) => s[k] > fresh[k])) moved++;
}
ok('every life inherits something', moved === 200, moved + '/200');

// allowance: only between 6 and 17, and it scales with class
const gate = born(); gate.ageY = 3; allowanceTick(gate);
ok('under six gets nothing', gate.cash === 0);
gate.ageY = 19; allowanceTick(gate);
ok('an adult gets no pocket money', gate.cash === 0);

function raise(cls) {
  const s = born(); s.familyClass = cls;
  s.family.filter((p) => p.relation === 'Mother' || p.relation === 'Father').forEach((p) => { p.job = CLASSES[cls].jobs[0]; });
  for (let a = 6; a < 18; a++) { s.ageY = a; allowanceTick(s); }
  return s.cash;
}
const poor = raise('struggling'), mid = raise('getting_by'), rich = raise('rich');
ok('a poor childhood ends near broke', poor > 200 && poor < 1600, '€' + poor);
ok('middle sits in the middle', mid > poor && mid < 5000, '€' + mid);
ok('rich starts far ahead', rich > mid * 5, '€' + rich);
console.log(`      childhood savings by 18 — struggling €${poor}, getting by €${mid}, rich €${rich}`);

// unemployed parents cut the allowance
const outOfWork = born(); outOfWork.familyClass = 'getting_by';
outOfWork.family.filter((p) => p.relation === 'Mother' || p.relation === 'Father').forEach((p) => { p.job = 'unemployed'; });
let unemployedTotal = 0;
for (let a = 6; a < 18; a++) { outOfWork.ageY = a; const before = outOfWork.cash; allowanceTick(outOfWork); unemployedTotal += outOfWork.cash - before; }
ok('no wages at home means less pocket money', unemployedTotal < mid * 0.7, '€' + unemployedTotal + ' vs €' + mid);

// asking parents scales with what they have
function beg(cls) {
  const s = born(); s.familyClass = cls; s.familyAsk = CLASSES[cls].ask; s.ageY = 20; s.stage = 'moving_out';
  const parent = s.family.find((p) => p.relation === 'Mother' || p.relation === 'Father');
  parent.relationship = 80; parent.job = CLASSES[cls].jobs[0];
  let total = 0;
  for (let i = 0; i < 40; i++) { s.ap = 100; s.cash = 0; parent.relationship = 80; askFamilyForMoney(s); total += s.cash; }
  return Math.round(total / 40);
}
const begPoor = beg('struggling'), begRich = beg('rich');
ok('poor parents give little', begPoor < 400, '€' + begPoor);
ok('rich parents give a lot more', begRich > begPoor * 5, '€' + begRich);
console.log(`      average handout — struggling €${begPoor}, rich €${begRich}`);

// no money changes hands without energy — the ask goes through the person sheet, which
// is where the energy is charged (family.js no longer charges it a second time)
const noAp = born(); noAp.ageY = 20; noAp.stage = 'career'; noAp.ap = 0; noAp.cash = 0;
const noApParent = noAp.family.find((p) => p.relation === 'Mother' || p.relation === 'Father');
noApParent.relationship = 80;
interact(noAp, noApParent.id, 'money');
ok('no energy, no handout', noAp.cash === 0, '€' + noAp.cash);
const oneAsk = born(); oneAsk.ageY = 20; oneAsk.stage = 'career'; oneAsk.ap = 100; oneAsk.cash = 0;
const oneParent = oneAsk.family.find((p) => p.relation === 'Father') || oneAsk.family.find((p) => p.relation === 'Mother');
oneParent.relationship = 80;
interact(oneAsk, oneParent.id, 'money');
ok('one ask costs energy once', oneAsk.ap === 90, 'ap ' + oneAsk.ap);
ok('the parent you asked is the one who answers', oneAsk.lastEvent.includes('Your ' + oneParent.relation.toLowerCase()), oneAsk.lastEvent);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
