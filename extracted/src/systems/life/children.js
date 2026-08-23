// A child was a line that aged one number a year. This gives them a life: a childhood that
// notices where you were, a school report, a decision at eighteen, and — if they want it and
// you left them the name — a career of their own that you get to watch from the good seats
// or from a long way away, depending on how the first eighteen years went.
//
// And it is where the game stops being one life. When you die, a grown child can be the one
// you play next, and everything you did to them by then is what they start with.
import { rint, chance, pick } from '../../engine/rng.js';
import { onCooldown, markUsed } from '../../engine/cooldown.js';
import { addTimeline } from '../../engine/timeline.js';
import { canRaiseChild, HOUSING } from '../../engine/economy.js';
import { applyBond } from './bonds.js';
import { dependent } from './drink.js';

const clamp = (v) => Math.max(0, Math.min(100, v));
const MFIRST = ['Jonas','Marco','Idris','Felix','Ren','Cole','Adrian','Nico','Sami','Leo'];
const FFIRST = ['Sasha','Iris','Noor','Elin','Priya','Wren','Yara','Freya','Talia','Mira'];
const JOBS = ['barista','architect','nurse','photographer','teacher','chef','graphic designer','accountant','engineer','physiotherapist'];
const GRAD_JOBS = ['architect','doctor','lawyer','engineer','economist','psychologist','journalist','curator'];

export function childrenOf(s) { return (s.family || []).filter((p) => p.relation === 'Child'); }
export function livingChildren(s) { return childrenOf(s).filter((p) => p.alive !== false); }

// ── whether there can be one at all ───────────────────────────────────────────
// Somebody has to be carrying it, and biology has an opinion about when. A 35% flat roll
// meant a first child at fifty-four, which is not a thing that happens.
export function motherAge(s, spouse) {
  const you = s.ageY || 0;
  const them = spouse ? (spouse.age || 0) : you;
  const youAreTheMother = s.gender === 'female' || s.gender === 'f';
  return youAreTheMother ? you : them;
}
export function fertility(s, spouse) {
  const age = motherAge(s, spouse);
  let base = age <= 34 ? 32 : age <= 39 ? 22 : age <= 42 ? 12 : age <= 45 ? 5 : age <= 47 ? 2 : 0;
  base -= livingChildren(s).length * 6;
  if (dependent(s)) base -= 6;
  if ((s.health || 0) < 45) base -= 5;
  return Math.max(0, Math.round(base));
}
export function fertilityNote(s, spouse) {
  const age = motherAge(s, spouse);
  if (age >= 48) return 'Not on your own, and everybody involved knows it. There are other ways to have a child.';
  if (age >= 43) return 'It is very late for this. It happens, and it mostly does not.';
  if (age >= 40) return 'Later than either of you meant to leave it.';
  return '';
}

function babyName(s, gender) {
  const surname = (s.name || 'Alex Moon').split(' ').slice(1).join(' ') || 'Moon';
  const taken = new Set(childrenOf(s).map((k) => (k.name || '').split(' ')[0]));
  const pool = (gender === 'm' ? MFIRST : FFIRST).filter((n) => !taken.has(n));
  return `${pick(pool.length ? pool : (gender === 'm' ? MFIRST : FFIRST))} ${surname}`;
}
function newChild(s, over = {}) {
  const gender = chance(50) ? 'm' : 'f';
  return { id: 'fam' + Math.random().toString(36).slice(2, 8), name: babyName(s, gender),
    relation: 'Child', gender, age: 0, alive: true, health: rint(85, 99), relationship: 80,
    job: 'infant', retired: false, bornOn: (s.year || 0) * 12 + (s.month || 0), raisedBy: 'you',
    // Their own life, filled in as it happens. See childYear below.
    talent: rint(20, 75), schooled: false, ownFame: 0, path: null, ...over };
}

export function spouseOf(s) { return (s.family || []).find((p) => p.relation === 'Spouse' && p.alive) || null; }

export function tryForBaby(s) {
  const spouse = spouseOf(s);
  if (!spouse) { s.lastEvent = 'You need a spouse first.'; return s; }
  if (!canRaiseChild(s)) { s.lastEvent = `There is nowhere to put a child. You need at least a ${HOUSING.flat.label.toLowerCase()} first.`; return s; }
  if (onCooldown(s, 'baby')) { s.lastEvent = 'Give it a month.'; return s; }
  markUsed(s, 'baby');
  const odds = fertility(s, spouse);
  if (odds <= 0) { s.lastEvent = fertilityNote(s, spouse); return s; }
  if (chance(odds)) {
    const kid = newChild(s);
    (s.family = s.family || []).push(kid);
    s.mental = clamp((s.mental || 50) + 8);
    s.lastEvent = `You had a baby. Welcome, ${kid.name.split(' ')[0]}.`;
    addTimeline(s, `Welcomed a new baby: ${kid.name}.`);
    s.bigMoment = { id: 'baby', kind: 'good', title: kid.name.split(' ')[0],
      body: 'You have a child. Everything you do from here happens in front of somebody who is watching to find out how it is done.' };
  } else s.lastEvent = 'Not this time. You keep trying.';
  return s;
}

// ── adoption ──────────────────────────────────────────────────────────────────
// The other way, and it is not a consolation prize — it is slower, it costs money, and the
// child arrives already a person, with a life before you that you did not get to see.
export const ADOPT_MONTHS = 14;
export function adoptCost(s) { return Math.round(28000 * (1 + Math.min(2.5, (s.fame || 0) / 60))); }
export function adoptionOdds(s) {
  const spouse = spouseOf(s);
  let v = spouse ? 78 : 52;                       // they prefer two of you, they do not require it
  if ((s.scandal || 0) > 40) v -= 25;
  if (dependent(s)) v -= 35;
  if ((s.respect || 0) > 60) v += 8;
  return Math.max(5, Math.min(95, Math.round(v)));
}
export function applyToAdopt(s) {
  if (s.adoption) { s.lastEvent = 'Your application is already in.'; return s; }
  if (livingChildren(s).length >= 5) { s.lastEvent = 'They will tell you, politely, that you have enough.'; return s; }
  if (!canRaiseChild(s)) { s.lastEvent = `Nowhere to put a child. You need at least a ${HOUSING.flat.label.toLowerCase()} first.`; return s; }
  const cost = adoptCost(s);
  if ((s.cash || 0) < cost) { s.lastEvent = `The process costs €${cost.toLocaleString()} and you cannot cover it.`; return s; }
  s.cash -= cost;
  s.adoption = { left: ADOPT_MONTHS, months: ADOPT_MONTHS, odds: adoptionOdds(s) };
  s.lastEvent = `The application is in. €${cost.toLocaleString()}, and now you wait about ${ADOPT_MONTHS} months.`;
  addTimeline(s, 'Applied to adopt.');
  return s;
}
export function adoptionTick(s) {
  if (!s.adoption) return s;
  s.adoption.left -= 1;
  // They keep looking at you the whole way through, and a bad year is a bad year.
  if (dependent(s) || (s.scandal || 0) > 55) s.adoption.odds = Math.max(3, s.adoption.odds - 4);
  if (s.adoption.left > 0) return s;
  const odds = s.adoption.odds;
  s.adoption = null;
  if (!chance(odds)) {
    s.mental = clamp((s.mental || 50) - 10);
    s.lastEvent = 'The application came back declined. There is a letter, and it is very polite.';
    addTimeline(s, 'The adoption was declined.', true);
    s.bigMoment = { id: 'adoptno', kind: 'bad', title: 'Declined',
      body: 'Somebody in an office read everything about your life and decided against it. They do not have to '
        + 'tell you which part it was, and the letter does not.' };
    return s;
  }
  const age = rint(2, 9);
  const kid = newChild(s, { age, job: age < 5 ? 'infant' : 'in school',
    // They do not know you yet. That is the whole difference, and it is the part you fix.
    relationship: rint(28, 45), adopted: true });
  (s.family = s.family || []).push(kid);
  s.mental = clamp((s.mental || 50) + 10);
  s.lastEvent = `${kid.name.split(' ')[0]} is ${age}, and as of this morning ${kid.gender === 'm' ? 'he' : 'she'} lives with you.`;
  addTimeline(s, `Adopted ${kid.name}, age ${age}.`);
  s.bigMoment = { id: 'adopted', kind: 'good', title: kid.name.split(' ')[0],
    body: `${kid.name.split(' ')[0]} is ${age} years old and has a whole life you were not there for. `
      + 'They are polite with you, in the way children are polite with adults they are not sure about yet. '
      + 'That is the part you get to change.' };
  return s;
}

// ── the childhood ─────────────────────────────────────────────────────────────
// A child raised by somebody who was always on a set does not hate you. They just do not
// know you very well, and that shows up eighteen years later as a number.
export function childhoodTick(s) {
  const kids = livingChildren(s).filter((p) => p.age < 18);
  if (!kids.length) return s;
  const away = !!s.production;
  for (const k of kids) {
    if (k.raisedBy === 'them') continue;          // not your month to miss
    if (away) applyBond(s, k, -2);
    if (dependent(s)) applyBond(s, k, -1);
  }
  return s;
}

// ── the life after that ───────────────────────────────────────────────────────
// Called once a year per child, from familyYear. Everything here is decided by two numbers:
// what they were born with, and whether you were there.
export function childYear(s, k) {
  if (!k.alive) return null;
  const close = k.relationship || 0;
  // Five, eleven, sixteen: the years a parent either turns up or does not.
  if (k.age === 5) return `${k.name.split(' ')[0]} started school.`;
  if (k.age === 11 && close >= 55) return `${k.name.split(' ')[0]} wants to know everything about what you do.`;
  if (k.age === 11 && close < 25) return `${k.name.split(' ')[0]} has stopped asking when you are home.`;

  if (k.age === 18) {
    // University is money and it is also whether anybody ever sat with them over homework.
    const bright = (k.talent || 0) + (close >= 55 ? 15 : close < 20 ? -15 : 0);
    const canPay = (s.cash || 0) > 40000;
    if (bright >= 55 && canPay) {
      k.schooled = true; k.job = 'at university'; s.cash -= rint(18000, 44000);
      return `${k.name.split(' ')[0]} got into university. You paid for it, and they let you.`;
    }
    k.job = chance(75) ? pick(JOBS) : 'looking for work';
    return `${k.name.split(' ')[0]} left school and went straight to work.`;
  }
  if (k.age === 22 && k.job === 'at university') {
    k.job = pick(GRAD_JOBS);
    return `${k.name.split(' ')[0]} graduated and is working as ${/^[aeiou]/i.test(k.job) ? 'an' : 'a'} ${k.job}.`;
  }

  // Twenty, and the ones who grew up in this house decide whether they want it too. Your
  // name is most of why the door opens, and every one of them knows it.
  //
  // ONE decision, not a roll every year from twenty to twenty-six: seven passes at even a
  // modest chance saturates, and a nobody's child was going into the business 169 times out
  // of 200 — the same as a star's. The odds here are the whole answer, so they are the odds.
  if (k.age === 20 && !k.path) {
    const yours = Math.max(s.peakFame || 0, s.fame || 0);
    const pull = Math.min(78, yours * 0.6 + (close >= 55 ? 10 : 0) + (k.talent || 0) * 0.18);
    if (chance(pull)) {
      k.path = 'industry'; k.job = 'actor';
      k.ownFame = Math.round(Math.min(30, yours / 5));
      return `${k.name.split(' ')[0]} is going up for parts. Every casting director in the city knows whose child they are.`;
    }
    k.path = 'ordinary';
  }
  if (k.path === 'industry') {
    // They rise or they do not, and it is mostly their own doing from here.
    const climb = (k.talent || 0) / 2 + (k.ownFame || 0) / 6;
    if (chance(Math.min(55, climb))) {
      const gain = rint(4, 13);
      k.ownFame = clamp((k.ownFame || 0) + gain);
      if (k.ownFame >= 70 && !k.starNoted) {
        k.starNoted = true;
        return `${k.name.split(' ')[0]} is a star in their own right now. They were asked about you in an interview and changed the subject.`;
      }
      if (gain >= 10) return `${k.name.split(' ')[0]} landed something good.`;
    } else if (k.age > 34 && chance(20)) {
      k.path = 'ordinary'; k.job = pick(JOBS);
      return `${k.name.split(' ')[0]} stopped going up for parts. They are ${/^[aeiou]/i.test(k.job) ? 'an' : 'a'} ${k.job} now, and happier.`;
    }
  }
  return null;
}
