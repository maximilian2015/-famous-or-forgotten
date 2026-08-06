import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { earn } from '../../engine/economy.js';
import { makePerson } from './relationships.js';
const clamp = (v) => Math.max(0, Math.min(100, v));

// A day job is the trade at the heart of the early game: steady money, but it eats your
// month. "slots" is how many of your three monthly actions the job takes off the table.
// Pay sits around real Amsterdam service wages, so rent maths feels like rent maths.
export const JOBS = [
  { id: 'barista', title: 'Barista', employer: 'Corner Coffee', pay: 1900, slots: 1, minAge: 16 },
  { id: 'retail', title: 'Shop assistant', employer: 'Nordfeld', pay: 2100, slots: 1, minAge: 16 },
  { id: 'runner', title: 'Casting office runner', employer: 'OpenCall', pay: 2200, slots: 1, minAge: 18, industry: true },
  { id: 'delivery', title: 'Delivery rider', employer: 'Swiftly', pay: 2300, slots: 1, minAge: 18 },
  { id: 'waiter', title: 'Waiter', employer: 'Villa Nord', pay: 2700, slots: 2, minAge: 18 },
  { id: 'assistant', title: "Producer's assistant", employer: 'Vega Pictures', pay: 3000, slots: 2, minAge: 20, industry: true },
  { id: 'bartender', title: 'Bartender', employer: 'The Loft', pay: 3300, slots: 2, minAge: 21 },
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

// A one-off shift for whoever needs hands today — no commitment, and how well you do
// is on you. This replaced the old "work an odd job" button that just handed you cash.
export const SHIFTS = [
  { id: 'bar', title: 'Cover a bar shift', blurb: 'Friday night, three deep at the bar.', base: 900 },
  { id: 'moving', title: 'Help a removals crew', blurb: 'Stairs. So many stairs.', base: 1100 },
  { id: 'promo', title: 'Hand out flyers', blurb: 'A costume is involved. Nobody will know.', base: 700 },
  { id: 'catering', title: 'Waiter at a private event', blurb: 'Rich people, small plates, long night.', base: 1000 },
  { id: 'warehouse', title: 'Night at the warehouse', blurb: 'Scan, lift, repeat, until light.', base: 1200 },
];
export function pickShift() { return pick(SHIFTS); }
export function doShift(s, shiftId, quality = 50) {
  const sh = SHIFTS.find((x) => x.id === shiftId) || SHIFTS[0];
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  s.ap = (s.ap || 0) - 1;
  // Do it well and they tip, ask you back, round it up. Do it badly and you get docked.
  const mult = quality >= 80 ? 1.35 : quality >= 55 ? 1.1 : quality >= 30 ? 0.85 : 0.55;
  const pay = Math.round(sh.base * mult * (0.9 + Math.random() * 0.25));
  earn(s, pay, sh.title);
  s.mental = clamp((s.mental || 50) - (quality < 30 ? 4 : 2));
  s.lastEvent = quality >= 80
    ? `You worked it hard and they noticed. €${pay.toLocaleString()}, and they want you back.`
    : quality >= 55 ? `Solid shift. €${pay.toLocaleString()}.`
    : quality >= 30 ? `You got through it. €${pay.toLocaleString()}.`
    : `A mess of a shift. They paid you €${pay.toLocaleString()} and didn't take your number.`;
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
