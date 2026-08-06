import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { die } from './mortality.js';
const clamp = (v) => Math.max(0, Math.min(100, v));

// Health works like it does in life: run yourself down and the body starts sending
// invoices — small ones first, then serious ones, then the final notice.
export const ILLNESSES = {
  minor: [
    { id: 'flu', name: 'A bad flu', drain: 2, cure: 150 },
    { id: 'back', name: 'Back trouble', drain: 1, cure: 350 },
    { id: 'stomach', name: 'Stomach trouble', drain: 2, cure: 250 },
    { id: 'burnout', name: 'Exhaustion', drain: 2, cure: 400 },
  ],
  serious: [
    { id: 'pneumonia', name: 'Pneumonia', drain: 5, cure: 2500 },
    { id: 'ulcer', name: 'An ulcer', drain: 4, cure: 3500 },
    { id: 'heart', name: 'Heart trouble', drain: 6, cure: 9000 },
  ],
};

export function healthTick(s) {
  if (s.stage !== 'career' || !s.alive) return;
  const h = s.health || 100;

  if (s.illness) {
    // Untreated, it eats you — and a small thing ignored long enough becomes a big one.
    s.illness.months += 1;
    s.health = clamp(h - s.illness.drain);
    s.mental = clamp((s.mental || 50) - 1);
    if (!s.illness.serious && s.illness.months >= 3 && chance(15)) {
      const up = pick(ILLNESSES.serious);
      s.illness = { ...up, serious: true, months: 0 };
      s.lastEvent = `Ignored too long, it turned into something real: ${up.name.toLowerCase()}.`;
      addTimeline(s, `It got worse: ${up.name.toLowerCase()}.`, true);
    }
  } else {
    // Catching something scales with how run-down you are.
    let odds = h >= 75 ? 1.5 : h >= 55 ? 4 : h >= 35 ? 9 : 16;
    if (s.diet === 'fast') odds += 2;
    if ((s.ageY || 0) >= 55) odds += 2;
    if ((s.ageY || 0) >= 70) odds += 3;
    if (chance(odds)) {
      const serious = h < 35 ? chance(45) : chance(10);
      const ill = pick(serious ? ILLNESSES.serious : ILLNESSES.minor);
      s.illness = { ...ill, serious, months: 0 };
      s.lastEvent = `You've come down with something: ${ill.name.toLowerCase()}. A doctor can fix it — €${ill.cure.toLocaleString()}.`;
      addTimeline(s, `Fell ill: ${ill.name.toLowerCase()}.`, true);
    }
  }

  // The cliff edge. At ten health the body can simply quit — or drop you in a hospital bed.
  if ((s.health || 0) <= 10) {
    if (chance(6)) { die(s, 'suddenly — the body simply quit'); return; }
    if (chance(22)) {
      const bill = 6000;
      s.cash = (s.cash || 0) - bill;
      s.health = clamp((s.health || 0) + 14);
      s.ap = 0;
      s.lastEvent = `You collapsed. The hospital pulled you back — €${bill.toLocaleString()}, and the month is gone.`;
      addTimeline(s, `Collapsed. Hospital took €${bill.toLocaleString()} and the rest of the month.`, true);
    }
  }
}

export function seeDoctor(s) {
  if (!s.illness) { s.lastEvent = 'The doctor finds nothing to treat.'; return s; }
  const cost = s.illness.cure;
  if ((s.cash || 0) < cost) { s.lastEvent = `Treatment costs €${cost.toLocaleString()} and you don't have it. It keeps eating at you.`; return s; }
  s.cash -= cost;
  s.health = clamp((s.health || 0) + (s.illness.serious ? rint(8, 14) : rint(4, 8)));
  s.lastEvent = `Treated. ${s.illness.name} is behind you — €${cost.toLocaleString()}.`;
  addTimeline(s, `Saw a doctor — ${s.illness.name.toLowerCase()} cured.`);
  s.illness = null;
  return s;
}
