import { rint, chance, pick } from '../../engine/rng.js';
import { onCooldown, markUsed } from '../../engine/cooldown.js';
import { addTimeline } from '../../engine/timeline.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
const MFIRST = ['James','Michael','David','Robert','Daniel','Andrew','Thomas','Marcus','Viktor','Sergei'];
const FFIRST = ['Mary','Linda','Susan','Karen','Elena','Anna','Sofia','Olga','Nina','Claire'];
const JOBS = ['teacher','nurse','accountant','shop manager','mechanic','office clerk','chef','driver','engineer','cleaner'];
function person(role, relation, gender, age, surname) {
  const name = (gender === 'm' ? pick(MFIRST) : pick(FFIRST));
  return { id: 'fam' + Math.random().toString(36).slice(2, 8), name: `${name} ${surname}`, relation, gender, age,
    alive: true, health: rint(60, 95), relationship: rint(55, 85),
    job: relation === 'grandparent' ? 'retired' : (age < 5 ? 'infant' : age < 16 ? 'in school' : (age < 23 ? 'student' : (chance(80) ? pick(JOBS) : 'unemployed'))),
    retired: relation === 'grandparent' };
}
export function makeFamily(s) {
  const surname = (s.name || 'Alex Moon').split(' ').slice(1).join(' ') || 'Moon';
  const fam = [];
  fam.push(person('parent', 'Mother', 'f', rint(26, 38), surname));
  fam.push(person('parent', 'Father', 'm', rint(28, 42), surname));
  if (chance(85)) fam.push(person('grandparent', 'Grandmother', 'f', rint(58, 74), surname));
  if (chance(70)) fam.push(person('grandparent', 'Grandfather', 'm', rint(60, 78), surname));
  if (chance(60)) fam.push(person('grandparent', "Grandma (dad's side)", 'f', rint(60, 76), surname));
  const sibs = rint(0, 2);
  for (let i = 0; i < sibs; i++) { const g = chance(50) ? 'm' : 'f'; fam.push(person('sibling', g === 'm' ? 'Brother' : 'Sister', g, rint(0, 8), surname)); }
  s.family = fam; s.parentsMarried = true; return s;
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
  const amount = parent.job === 'unemployed' ? rint(100, 400) : rint(300, 1200);
  s.cash = (s.cash || 0) + amount; parent.relationship = clamp(parent.relationship - rint(3, 8));
  s.lastEvent = `Your ${parent.relation.toLowerCase()} helped you out with €${amount.toLocaleString()}. They love you, but don't push it.`;
  return s;
}
