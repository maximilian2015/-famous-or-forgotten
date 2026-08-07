import { rint, chance, pick } from '../../engine/rng.js';
import { onCooldown, markUsed } from '../../engine/cooldown.js';
import { addTimeline } from '../../engine/timeline.js';
import { homeBond, canRaiseChild, HOUSING } from '../../engine/economy.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
const MFIRST = ['Jonas','Marco','Idris','Felix','Ren','Cole','Adrian','Nico','Sami','Leo'];
const FFIRST = ['Sasha','Iris','Noor','Elin','Priya','Wren','Yara','Freya','Talia','Mira'];
const LAST = ['Vale','Kade','Roy','Mercer','Onyx','Frost','Dune','Salt','Wren','Bright','Hale'];
const JOBS = ['barista','architect','nurse','photographer','teacher','chef','personal trainer','graphic designer','musician','accountant'];

export function prospect(s) {
  const gender = chance(50) ? 'm' : 'f';
  const name = `${pick(gender === 'm' ? MFIRST : FFIRST)} ${pick(LAST)}`;
  const age = Math.max(18, Math.min(90, (s.ageY || 18) + rint(-4, 4)));
  return { id: 'date' + Date.now() + Math.floor(Math.random() * 10000), name, gender, age,
    job: pick(JOBS), charm: rint(30, 85), relationship: 0, dates: 0 };
}
export function refreshDatingPool(s, force) {
  s.datingPool = s.datingPool || [];
  if (!force && s.datingPool.length >= 4) return s;
  if (force) s.datingPool = [];
  while (s.datingPool.length < 4) s.datingPool.push(prospect(s));
  return s;
}
export function askOut(s, id) {
  if (s.partner) { s.lastEvent = "You're already seeing someone."; return s; }
  const p = (s.datingPool || []).find((x) => x.id === id); if (!p) return s;
  if (onCooldown(s, 'date:' + id)) { s.lastEvent = `You already saw ${p.name} this month. Give it some air.`; return s; }
  markUsed(s, 'date:' + id);
  const odds = clamp(30 + (s.charisma || 0) * 0.3 + (s.looks || 0) * 0.2 + p.charm * 0.2);
  if (chance(odds)) {
    p.dates += 1;
    p.relationship = clamp(p.relationship + rint(10, 20));
    if (p.dates >= 2 && p.relationship >= 40) {
      s.partner = { id: p.id, name: p.name, gender: p.gender, age: p.age, job: p.job, relationship: p.relationship, married: false, health: rint(70, 95) };
      s.datingPool = (s.datingPool || []).filter((x) => x.id !== id);
      s.lastEvent = `You and ${p.name} are official now. Butterflies and all.`;
      addTimeline(s, `Started dating ${p.name}.`);
    } else {
      s.lastEvent = `Great date with ${p.name}. You're seeing them again.`;
      addTimeline(s, `Went on a date with ${p.name}.`);
    }
  } else {
    p.relationship = clamp(p.relationship - rint(5, 10));
    s.mental = clamp((s.mental || 50) - 2);
    s.lastEvent = `The date with ${p.name} fizzled. No spark.`;
    addTimeline(s, `A date with ${p.name} went nowhere.`);
  }
  return s;
}
export function spendWithPartner(s) {
  if (!s.partner) return s;
  if (onCooldown(s, 'partner')) { s.lastEvent = `You've already had your evening with ${s.partner.name} this month.`; return s; }
  markUsed(s, 'partner');
  const gain = Math.round(rint(6, 14) * homeBond(s));
  s.partner.relationship = clamp(s.partner.relationship + gain);
  s.mental = clamp((s.mental || 50) + rint(2, 6));
  s.lastEvent = `You spent time with ${s.partner.name}. Relationship +${gain}.`;
  return s;
}
export function proposeMarriage(s) {
  if (!s.partner || s.partner.married) return s;
  if (s.partner.relationship < 65) { s.lastEvent = `Too soon. ${s.partner.name} isn't ready for that yet — keep growing closer.`; return s; }
  if (onCooldown(s, 'propose')) { s.lastEvent = `Asking twice in one month would not help your case.`; return s; }
  markUsed(s, 'propose');
  const odds = clamp(50 + (s.partner.relationship - 65));
  if (chance(odds)) {
    const partner = s.partner;
    (s.family = s.family || []).push({ id: 'fam' + Math.random().toString(36).slice(2, 8), name: partner.name, relation: 'Spouse', gender: partner.gender, age: partner.age, alive: true, health: partner.health, relationship: partner.relationship, job: partner.job, retired: false });
    s.lastEvent = `${partner.name} said yes! You're married.`;
    addTimeline(s, `Married ${partner.name}.`);
    s.partner = null;
  } else {
    s.mental = clamp((s.mental || 50) - 6);
    s.lastEvent = `${s.partner.name} needs more time to think. Awkward, but not over.`;
    addTimeline(s, `Proposed to ${s.partner.name} — they asked for time.`);
  }
  return s;
}
export function tryForBaby(s) {
  const spouse = (s.family || []).find((p) => p.relation === 'Spouse' && p.alive);
  if (!spouse) { s.lastEvent = 'You need a spouse first.'; return s; }
  // You cannot raise a child in a rented room, and both of you know it.
  if (!canRaiseChild(s)) { s.lastEvent = `There is nowhere to put a child. You need at least a ${HOUSING.flat.label.toLowerCase()} first.`; return s; }
  if (onCooldown(s, 'baby')) { s.lastEvent = 'Give it a month.'; return s; }
  markUsed(s, 'baby');
  if (chance(35)) {
    const surname = (s.name || 'Alex Moon').split(' ').slice(1).join(' ') || 'Moon';
    const gender = chance(50) ? 'm' : 'f';
    const name = `${pick(gender === 'm' ? MFIRST : FFIRST)} ${surname}`;
    (s.family = s.family || []).push({ id: 'fam' + Math.random().toString(36).slice(2, 8), name, relation: 'Child', gender, age: 0, alive: true, health: rint(85, 99), relationship: 70, job: 'infant', retired: false });
    s.mental = clamp((s.mental || 50) + 8);
    s.lastEvent = `You had a baby! Welcome, ${name.split(' ')[0]}.`;
    addTimeline(s, `Welcomed a new baby: ${name}.`);
  } else {
    s.lastEvent = 'Not this time. You keep trying.';
  }
  return s;
}
export function datingYear(s) {
  if (s.partner && !s.partner.married) {
    s.partner.age += 1;
    if (chance(8)) {
      addTimeline(s, `Broke up with ${s.partner.name}.`, true);
      s.mental = clamp((s.mental || 50) - 10);
      s.lastFamilyEvent = `${s.partner.name} broke things off. It happens.`;
      s.partner = null;
    }
  }
  if (s.datingPool && s.datingPool.length) s.datingPool = s.datingPool.filter(() => chance(70));
}
