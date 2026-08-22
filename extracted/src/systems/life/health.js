import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { die } from './mortality.js';
import { homeIllness } from '../../engine/economy.js';
const clamp = (v) => Math.max(0, Math.min(100, v));

// Health is immunity. A body at 60 catches things constantly; a body at 15 is defenceless.
// Illness has a real duration, blocks the calendar, and can be shortened by money or by
// pushing through it yourself.
export const ILLNESSES = {
  minor: [
    { id: 'flu', name: 'A bad flu', drain: 3, cure: 180, months: 1 },
    { id: 'stomach', name: 'Stomach trouble', drain: 3, cure: 260, months: 1 },
    { id: 'back', name: 'Back trouble', drain: 2, cure: 420, months: 2 },
    { id: 'burnout', name: 'Exhaustion', drain: 3, cure: 500, months: 2 },
  ],
  serious: [
    { id: 'pneumonia', name: 'Pneumonia', drain: 6, cure: 2800, months: 3, freezes: true },
    { id: 'ulcer', name: 'An ulcer', drain: 5, cure: 3800, months: 4, freezes: true },
    { id: 'heart', name: 'Heart trouble', drain: 7, cure: 9500, months: 5, freezes: true },
  ],
};

// Insurance is the same bet as in life: a monthly bill against a bill you can't predict.
export const INSURANCE = {
  none:  { label: 'No cover', premium: 0, covers: 0 },
  basic: { label: 'Basic cover', premium: 140, covers: 0.5 },
  full:  { label: 'Full cover', premium: 380, covers: 0.9 },
};
export function setInsurance(s, key) {
  if (!INSURANCE[key] || s.insurance === key) return s;
  s.insurance = key;
  const i = INSURANCE[key];
  s.lastEvent = key === 'none' ? 'You dropped your health cover. Fingers crossed.'
    : `You took out ${i.label.toLowerCase()} — €${i.premium}/month, covers ${Math.round(i.covers * 100)}% of treatment.`;
  return s;
}
export function treatmentCost(s, ill) {
  const cover = INSURANCE[s.insurance || 'none'].covers;
  return Math.round((ill?.cure || 0) * (1 - cover));
}

// Immunity IS health: at 90 you shrug things off, at 25 you catch everything going.
// One definition, used by the monthly roll AND by the number shown on the health screen —
// the two used to be written out separately and had already drifted apart.
export function infectionOdds(s) {
  const h = s.health || 100;
  let odds = h <= 15 ? 99 : Math.max(2, 100 - h * 1.05);
  if (s.diet === 'fast') odds += 6;
  if (s.diet === 'fine') odds -= 5;
  if (s.gym) odds -= 5;
  if ((s.ageY || 0) >= 55) odds += 5;
  if ((s.ageY || 0) >= 70) odds += 8;
  odds += homeIllness(s);   // thin walls and damp are a reason to be ill
  return clamp(odds);
}

// What a body of this age can hold when nothing is wrong with it. Recovery runs up to
// here and no further; the long decline of agingTick still pulls the ceiling down.
export function naturalCeiling(s) {
  // Every collapse past the first takes a little off the top permanently. You do not get
  // all of it back.
  const worn = Math.min(14, Math.max(0, (s.burnouts || 0) - 1) * 3.5);
  return Math.max(40, 96 - Math.max(0, (s.ageY || 0) - 25) * 0.6 - worn);
}
// Immunity: your body fights the same thing off for a while after beating it.
export function isIll(s) { return !!s.illness; }
export function illnessBlocks(s) { return !!(s.illness && s.illness.freezes); }

export function healthTick(s) {
  if (s.stage !== 'career' || !s.alive) return;
  const h = s.health || 100;

  if (s.illness) {
    s.illness.months += 1;
    s.health = clamp(h - s.illness.drain);
    s.mental = clamp((s.mental || 50) - (s.illness.freezes ? 2 : 1));
    if (s.illness.months >= s.illness.left) {
      // Ran its course on its own.
      const was = s.illness.name;
      s.illness = null;
      s.immuneUntil = (s.year || 0) * 12 + (s.month || 0) + rint(2, 4);
      s.lastEvent = `${was} has finally passed. You feel human again.`;
      addTimeline(s, `Recovered from ${was.toLowerCase()}.`);
    } else if (!s.illness.serious && s.illness.months >= 2 && chance(22)) {
      const up = pick(ILLNESSES.serious);
      s.illness = { ...up, serious: true, months: 0, left: up.months };
      s.lastEvent = `Left too long, it became something real: ${up.name.toLowerCase()}. Everything else stops.`;
      addTimeline(s, `It got worse: ${up.name.toLowerCase()}.`, true);
    }
  } else {
    // The body puts itself back together whenever nothing is wrong with it — including
    // the months right after an illness, which is exactly when it should. Without this
    // health only ever went down: every illness drained it, nothing but money put it
    // back, and since being unhealthy is what makes you ill, one bad run started a
    // spiral nobody escaped. Simulated over three hundred lives, ageing alone got people
    // to seventy-two and ageing with illness killed them at forty.
    if ((s.health || 0) < naturalCeiling(s)) {
      s.health = clamp(Math.min(naturalCeiling(s), (s.health || 0) + 1.3 + ((s.mental || 50) > 70 ? 0.4 : 0)));
    }
    const catchable = ((s.year || 0) * 12 + (s.month || 0)) >= (s.immuneUntil || 0);
    if (catchable && chance(infectionOdds(s))) {
      const serious = h < 35 ? chance(50) : chance(12);
      const ill = pick(serious ? ILLNESSES.serious : ILLNESSES.minor);
      s.illness = { ...ill, serious, months: 0, left: ill.months };
      s.lastEvent = `You've come down with something: ${ill.name.toLowerCase()}.${ill.freezes ? ' Work stops until you are through it.' : ''}`;
      addTimeline(s, `Fell ill: ${ill.name.toLowerCase()}.`, true);
    }
  }

  // The cliff. At ten health the body can simply quit.
  if ((s.health || 0) <= 10) {
    if (chance(6)) { die(s, 'suddenly — the body simply quit'); return; }
    if (chance(22)) {
      const bill = Math.round(6000 * (1 - INSURANCE[s.insurance || 'none'].covers));
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
  const cost = treatmentCost(s, s.illness);
  if ((s.cash || 0) < cost) { s.lastEvent = `Treatment costs €${cost.toLocaleString()} and you don't have it. It keeps eating at you.`; return s; }
  s.cash -= cost;
  const was = s.illness.name;
  s.health = clamp((s.health || 0) + (s.illness.serious ? rint(10, 16) : rint(5, 9)));
  s.illness = null;
  s.immuneUntil = (s.year || 0) * 12 + (s.month || 0) + rint(3, 5);
  s.lastEvent = `Treated. ${was} is behind you — €${cost.toLocaleString()}${cost === 0 ? ' (fully covered)' : ''}.`;
  addTimeline(s, `Saw a doctor — ${was.toLowerCase()} cured.`);
  return s;
}

// Push through it yourself: a minigame instead of a bill. Free, but you can make it worse.
export function pushThrough(s, quality = 50) {
  if (!s.illness) return s;
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  s.ap = (s.ap || 0) - 1;
  const was = s.illness.name;
  if (quality >= 75) {
    s.illness = null;
    s.immuneUntil = (s.year || 0) * 12 + (s.month || 0) + rint(2, 3);
    s.health = clamp((s.health || 0) + rint(3, 6));
    s.lastEvent = `Rest, fluids, stubbornness — and ${was.toLowerCase()} is gone without a bill.`;
    addTimeline(s, `Shook off ${was.toLowerCase()} without a doctor.`);
  } else if (quality >= 40) {
    s.illness.left = Math.max(s.illness.months + 1, s.illness.left - 1);
    s.lastEvent = `You managed it better this month. ${was} should pass sooner.`;
  } else {
    s.health = clamp((s.health || 0) - rint(2, 5));
    s.illness.left += 1;
    s.lastEvent = `You pushed too hard and set yourself back. ${was} is digging in.`;
  }
  return s;
}

// Pharmacy — bought in the Shopping app, used when you need them.
export const PILLS = {
  painkillers: { label: 'Painkillers', blurb: 'Takes the edge off. Buys you a working month.', cost: 60 },
  antibiotics: { label: 'Antibiotics', blurb: 'Cuts a minor illness short outright.', cost: 220 },
  vitamins:    { label: 'Vitamins', blurb: 'A slow nudge back toward healthy.', cost: 90 },
  sleeping:    { label: 'Sleeping pills', blurb: 'For the head, not the body.', cost: 110 },
  // Not a cure and not optional. Nothing else about a depression moves while you are not
  // on them, and they take weeks before they do anything at all.
  antidep:     { label: 'Antidepressants', blurb: 'A month at a time. Weeks before they do anything.', cost: 190 },
};
export function buyPills(s, key, qty = 1) {
  const p = PILLS[key]; if (!p) return s;
  const cost = p.cost * qty;
  if ((s.cash || 0) < cost) { s.lastEvent = `That costs €${cost.toLocaleString()} and you're short.`; return s; }
  s.cash -= cost;
  (s.meds = s.meds || {})[key] = (s.meds[key] || 0) + qty;
  s.lastEvent = `Bought ${p.label.toLowerCase()} — €${cost.toLocaleString()}.`;
  return s;
}
export function usePills(s, key) {
  const have = (s.meds || {})[key] || 0;
  if (have <= 0) { s.lastEvent = "You don't have any."; return s; }
  s.meds[key] = have - 1;
  if (key === 'antibiotics') {
    if (s.illness && !s.illness.serious) {
      const was = s.illness.name;
      s.illness = null;
      s.immuneUntil = (s.year || 0) * 12 + (s.month || 0) + rint(2, 3);
      s.lastEvent = `The antibiotics cleared ${was.toLowerCase()} in days.`;
      addTimeline(s, `Antibiotics cleared ${was.toLowerCase()}.`);
    } else if (s.illness) { s.illness.left = Math.max(s.illness.months + 1, s.illness.left - 1); s.lastEvent = 'Antibiotics helped, but this one needs a doctor.'; }
    else s.lastEvent = 'Nothing to treat — wasted.';
  } else if (key === 'painkillers') {
    if (s.illness && s.illness.freezes) { s.illness.freezes = false; s.lastEvent = 'Dosed up, you can work through it this month.'; }
    else s.lastEvent = 'The ache backs off for a while.';
    s.mental = clamp((s.mental || 50) + 2);
  } else if (key === 'vitamins') {
    s.health = clamp((s.health || 0) + rint(3, 6));
    s.lastEvent = 'A little better, day by day.';
  } else if (key === 'sleeping') {
    s.mental = clamp((s.mental || 50) + rint(6, 12));
    s.lastEvent = 'You finally slept properly.';
  } else if (key === 'antidep') {
    if (!s.depression) { s.lastEvent = 'You put them back in the drawer.'; s.meds[key] = have; return s; }
    if (s.depression.medsThisMonth) { s.lastEvent = 'You have taken them this month.'; s.meds[key] = have; return s; }
    s.depression.medsThisMonth = true;
    const m = (s.depression.medMonths || 0) + 1;
    s.lastEvent = m < 2 ? 'You started them. It will be weeks before they do anything.'
      : 'You kept taking them. Nothing dramatic — but nothing else works without them.';
  }
  return s;
}
