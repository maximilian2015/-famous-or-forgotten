import { rint, chance, pick } from '../../engine/rng.js';
import { onCooldown, markUsed } from '../../engine/cooldown.js';
import { addTimeline } from '../../engine/timeline.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
const MFIRST = ['James','Michael','David','Robert','Daniel','Andrew','Thomas','Marcus','Viktor','Sergei'];
const FFIRST = ['Mary','Linda','Susan','Karen','Elena','Anna','Sofia','Olga','Nina','Claire'];
const JOBS = ['teacher','nurse','accountant','shop manager','mechanic','office clerk','chef','driver','engineer','cleaner'];
function person(role, relation, gender, age, surname, opts = {}) {
  const taken = opts.taken || new Set();
  let pool = (opts.jobs || JOBS).filter((j) => !taken.has('job:' + j));
  if (!pool.length) pool = opts.jobs || JOBS;
  // No two people in one household share a first name — a brother called James when
  // your father is James reads like a bug, because it is one.
  const names = (gender === 'm' ? MFIRST : FFIRST).filter((n) => !taken.has('name:' + n));
  const name = pick(names.length ? names : (gender === 'm' ? MFIRST : FFIRST));
  taken.add('name:' + name);
  const employed = !chance(opts.unemployedOdds ?? 20);
  const p = { id: 'fam' + Math.random().toString(36).slice(2, 8), name: `${name} ${surname}`, relation, gender, age,
    alive: true, health: rint(60, 95), relationship: rint(55, 85),
    job: role === 'grandparent' ? 'retired' : (age < 5 ? 'infant' : age < 16 ? 'in school' : (age < 23 ? 'student' : (employed ? pick(pool) : 'unemployed'))),
    retired: role === 'grandparent' };
  // Grandparents have a past, and the birth story wants to name it.
  if (role === 'grandparent') p.formerJob = pick(pool);
  if (role === 'parent' && p.job !== 'unemployed') taken.add('job:' + p.job);
  return p;
}
// opts comes from systems/life/origin.js: which jobs this class does, how likely a parent
// is out of work, and whether there is a father in the picture at all.
export function makeFamily(s, options = {}) {
  const surname = (s.name || 'Alex Moon').split(' ').slice(1).join(' ') || 'Moon';
  const opts = { ...options, taken: new Set() };
  const fam = [];
  fam.push(person('parent', 'Mother', 'f', rint(24, 38), surname, opts));
  if (!opts.singleParent) fam.push(person('parent', 'Father', 'm', rint(26, 42), surname, opts));
  if (chance(85)) fam.push(person('grandparent', 'Grandmother', 'f', rint(58, 74), surname, opts));
  if (chance(70)) fam.push(person('grandparent', 'Grandfather', 'm', rint(60, 78), surname, opts));
  if (chance(60)) fam.push(person('grandparent', "Grandma (dad's side)", 'f', rint(60, 76), surname, opts));
  // You are the newborn, so any siblings were already here.
  const sibs = rint(0, 2);
  for (let i = 0; i < sibs; i++) { const g = chance(50) ? 'm' : 'f'; fam.push(person('sibling', g === 'm' ? 'Brother' : 'Sister', g, rint(1, 10), surname, opts)); }
  s.family = fam;
  return s;
}
export function familyYear(s) {
  if (!s.family) return;
  const events = [];
  s.family.forEach((p) => {
    if (!p.alive) return;
    p.age += 1;
    const decline = p.age > 70 ? rint(2, 7) : p.age > 55 ? rint(0, 3) : (chance(20) ? rint(0, 2) : 0);
    p.health = clamp(p.health - decline);
    if (p.health < 40 && chance(30) && !p.ill) { p.ill = true; events.push(`${p.name} (${p.relation.toLowerCase()}) has fallen ill.`); }
    else if (p.ill && p.health > 55) { p.ill = false; }
    if (p.job === 'infant' && p.age >= 5) p.job = 'in school';
    if (p.job === 'in school' && p.age >= 16) p.job = 'student';
    if (p.job === 'student' && p.age >= 23) { p.job = chance(80) ? pick(JOBS) : 'unemployed'; if (p.job !== 'unemployed') events.push(`${p.name} started working as a ${p.job}.`); }
    if (!p.retired && p.age >= 23 && p.age < 65 && p.job !== 'in school' && p.job !== 'student') {
      if (p.job !== 'unemployed' && chance(6)) { p.job = 'unemployed'; events.push(`${p.name} lost their job.`); }
      else if (p.job === 'unemployed' && chance(35)) { p.job = pick(JOBS); events.push(`${p.name} found work as a ${p.job}.`); }
    }
    if (!p.retired && p.age >= 65) { p.retired = true; p.job = 'retired'; events.push(`${p.name} retired.`); }
    const deathChance = p.age > 85 ? 22 : p.age > 78 ? 12 : p.age > 70 ? 6 : (p.health < 20 ? 8 : 0);
    if (chance(deathChance)) { p.alive = false; p.deathAge = p.age; events.push(`💔 ${p.name}, your ${p.relation.toLowerCase()}, has passed away at ${p.age}.`); s.mental = clamp((s.mental || 50) - (p.relation === 'Mother' || p.relation === 'Father' ? 15 : 8)); }
  });
  if (s.parentsMarried && (s.ageY || 0) < 20 && chance(3)) { s.parentsMarried = false; events.push('Your parents are getting divorced.'); s.mental = clamp((s.mental || 50) - 10); }
  events.forEach((e) => addTimeline(s, e, /passed away|lost their job|divorc|ill/.test(e)));
  if (events.length) s.lastFamilyEvent = events[0];
}
export function spendWithFamily(s, id) {
  const p = (s.family || []).find((x) => x.id === id && x.alive);
  if (!p) return s;
  if (onCooldown(s, 'fam:' + id)) { s.lastEvent = `You've already seen ${p.name} this month.`; return s; }
  markUsed(s, 'fam:' + id);
  p.relationship = clamp(p.relationship + rint(4, 10)); s.mental = clamp((s.mental || 50) + rint(2, 5));
  s.lastEvent = `You spent time with ${p.name}. It was good for both of you. (Closeness +, Mental +)`;
  return s;
}
export function askFamilyForMoney(s) {
  const parent = (s.family || []).find((x) => x.relation === 'Mother' || x.relation === 'Father');
  if (!parent || !parent.alive) { s.lastEvent = 'No parents around to ask.'; return s; }
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  s.ap = (s.ap || 0) - 1;
  if (parent.relationship < 40) { s.lastEvent = `You asked for money. "${parent.name.split(' ')[0]}" is not happy. "You need to stand on your own feet." Nothing given.`; return s; }
  // What they can give depends on what they have. Set at birth by systems/life/origin.js
  // and carried on state so this module needs no import back into it.
  const scale = s.familyAsk || 1;
  const amount = Math.round((parent.job === 'unemployed' ? rint(60, 220) : rint(250, 900)) * scale);
  s.cash = (s.cash || 0) + amount; parent.relationship = clamp(parent.relationship - rint(3, 8));
  s.lastEvent = `Your ${parent.relation.toLowerCase()} helped you out with €${amount.toLocaleString()}. They love you, but don't push it.`;
  return s;
}
