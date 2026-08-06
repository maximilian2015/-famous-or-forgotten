import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { earn } from '../../engine/economy.js';
import { makePerson } from './relationships.js';
const clamp = (v) => Math.max(0, Math.min(100, v));

// A day job is the trade at the heart of the early game: steady money, but it eats your
// month. "slots" is how many of your three monthly actions the job takes off the table.
export const JOBS = [
  { id: 'barista', title: 'Barista', employer: 'Corner Coffee', pay: 1400, slots: 1, minAge: 16 },
  { id: 'retail', title: 'Shop assistant', employer: 'Nordfeld', pay: 1600, slots: 1, minAge: 16 },
  { id: 'runner', title: 'Casting office runner', employer: 'OpenCall', pay: 1900, slots: 1, minAge: 18, industry: true },
  { id: 'delivery', title: 'Delivery rider', employer: 'Swiftly', pay: 2000, slots: 1, minAge: 18 },
  { id: 'waiter', title: 'Waiter', employer: 'Villa Nord', pay: 2200, slots: 2, minAge: 18 },
  { id: 'assistant', title: "Producer's assistant", employer: 'Vega Pictures', pay: 2500, slots: 2, minAge: 20, industry: true },
  { id: 'bartender', title: 'Bartender', employer: 'The Loft', pay: 2800, slots: 2, minAge: 21 },
];
export function jobSlots(s) { return s.job ? s.job.slots : 0; }
export function availableJobs(s) { return JOBS.filter((j) => (s.ageY || 0) >= j.minAge); }

export function takeJob(s, id) {
  const j = JOBS.find((x) => x.id === id); if (!j) return s;
  if (s.job) { s.lastEvent = `You'd have to quit ${s.job.employer} first.`; return s; }
  if ((s.ageY || 0) < j.minAge) { s.lastEvent = `You need to be ${j.minAge} for that.`; return s; }
  s.job = { ...j, months: 0, pay: j.pay };
  s.lastEvent = `You start at ${j.employer} as a ${j.title.toLowerCase()} — €${j.pay.toLocaleString()}/month. It'll take ${j.slots === 1 ? 'a chunk' : 'most'} of your time.`;
  addTimeline(s, `Took a job at ${j.employer}: ${j.title}.`);
  return s;
}
export function quitJob(s) {
  if (!s.job) return s;
  const j = s.job;
  s.job = null;
  s.lastEvent = `You quit ${j.employer}. Your time is your own again — so is the rent.`;
  addTimeline(s, `Quit ${j.employer}.`);
  return s;
}

export function workTick(s) {
  const j = s.job; if (!j) return;
  j.months += 1;
  earn(s, j.pay, `${j.employer} wages`);
  s.mental = clamp((s.mental || 50) - (j.slots > 1 ? 1 : 0));   // the grind wears

  // Stick around and you get better at it — and paid for it.
  if (j.months % 18 === 0 && chance(55)) {
    const raise = Math.round(j.pay * (0.08 + Math.random() * 0.07));
    j.pay += raise;
    addTimeline(s, `${j.employer} gave you a raise — €${j.pay.toLocaleString()}/month now.`);
  }
  // A job near the business is worth more than the wage.
  if (j.industry && chance(7)) {
    const p = makePerson(s, pick(['Casting Director', 'Manager', 'Fellow Actor']));
    (s.people = s.people || []).push(p);
    s.lastEvent = `Someone worth knowing came through ${j.employer} today: ${p.name}, ${p.role.toLowerCase()}.`;
    addTimeline(s, `Met ${p.name} (${p.role}) through work.`);
  }
  // Falling apart shows up at work before it shows up anywhere else.
  if ((s.mental || 50) < 22 && chance(18)) {
    addTimeline(s, `${j.employer} let you go. You'd been sleepwalking through shifts for weeks.`, true);
    s.lastEvent = `${j.employer} let you go.`;
    s.job = null;
  }
}
