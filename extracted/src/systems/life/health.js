import { inCareer } from '../../engine/stage.js';
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
// Being run down makes you ill. It must not make you ill so much more that there is no way
// back — which is what `100 - health * 1.05` did: at 60 health it was a 44% chance EVERY
// month of an illness that drains 3 a month for three months, against a recovery of 1.3.
// Every point of health you lost bought you more illness, which cost more health. Nobody
// escaped it. Simulated over thirty careers, thirty of them died, the median at 38, with
// health between 4 and 8 — while the same character doing nothing at all sat at 96 forever.
// The slope is gentle now and the whole thing is capped.
export function infectionOdds(s) {
  const h = s.health || 100;
  let odds = Math.max(2, (100 - h) * 0.42);
  if (s.diet === 'fast') odds += 6;
  if (s.diet === 'fine') odds -= 5;
  if (s.gym) odds -= 5;
  if ((s.ageY || 0) >= 55) odds += 5;
  if ((s.ageY || 0) >= 70) odds += 8;
  odds += homeIllness(s);   // thin walls and damp are a reason to be ill
  // A hard ceiling, so no combination of bad luck turns into a month-after-month certainty.
  return Math.max(0, Math.min(48, odds));
}

// What a body of this age can hold when nothing is wrong with it. Recovery runs up to
// here and no further; the long decline of agingTick still pulls the ceiling down.
export function naturalCeiling(s) {
  // Every collapse past the first takes a little off the top permanently. You do not get
  // all of it back.
  const worn = Math.min(14, Math.max(0, (s.burnouts || 0) - 1) * 3.5);
  // And so does the drinking, which is the only way it can actually cost you anything.
  // Taking it off your health each month did nothing: the monthly +1.3 recovery cancelled
  // the −1.2 bite almost exactly, so five years of it left a man at sixty-nine. What it has
  // to do instead is lower the roof — you stop being able to get well, which is the shape
  // the burnouts already use and the true shape of this.
  const lv = s.drink?.worstLevel || s.drink?.level || 0;
  const soaked = lv >= 78 ? 34 : lv >= 45 ? 20 : lv >= 20 ? 7 : 0;
  // The gym and what you eat raise the ROOF. They used to only cut how often you fell ill,
  // and once recovery scaled with how far down you were, everybody climbed back to the same
  // ceiling anyway — a life in the gym on good food ended at 72 health and a life of
  // takeaways ended at 72. What you do with your body has to change what it can hold.
  const kept = (s.gym ? 4 : 0) + (s.diet === 'fine' ? 3 : s.diet === 'fast' ? -5 : 0);
  return Math.max(22, 96 - Math.max(0, (s.ageY || 0) - 25) * 0.6 - worn - soaked + kept - (s.untreated || 0));
}
// Immunity: your body fights the same thing off for a while after beating it.
export function isIll(s) { return !!s.illness; }
export function illnessBlocks(s) { return !!(s.illness && s.illness.freezes); }

export function healthTick(s) {
  if (!inCareer(s) || !s.alive) return;
  const h = s.health || 100;

  if (s.illness) {
    s.illness.months += 1;
    s.health = clamp(h - s.illness.drain);
    s.mental = clamp((s.mental || 50) - (s.illness.freezes ? 2 : 1));
    if (s.illness.months >= s.illness.left) {
      // Ran its course on its own — and something you sat out rather than treated leaves a
      // mark. Once illness became rarer and recovery scaled, a doctor stopped being worth
      // paying for: whatever an untreated month cost you, you simply climbed back. What it
      // costs now is the roof, permanently, and only a serious one does it.
      const was = s.illness.name;
      s.untreated = Math.min(14, (s.untreated || 0) + (s.illness.serious ? 1.6 : 0.32));
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
    // And the further below your ceiling you are, the faster the body climbs back — which is
    // both true and the other half of breaking the spiral. A flat +1.3 could not out-earn
    // the illnesses that being low health invited, so low health was a one-way door.
    const roof = naturalCeiling(s);
    if ((s.health || 0) < roof) {
      const gap = roof - (s.health || 0);
      const back = 1.3 + Math.min(1.9, gap * 0.05) + ((s.mental || 50) > 70 ? 0.4 : 0);
      s.health = clamp(Math.min(roof, (s.health || 0) + back));
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
    // And if it was the drinking that got you here, say so. This is the second way out of
    // a life and it was the coy one: mortalityCheck names the drinking, and then most of
    // the actual deaths came through here instead and called it bad luck.
    if (chance(6)) {
      const drunk = (s.drink?.worstLevel || 0) >= 45;
      die(s, drunk ? 'of liver failure, which surprised nobody who had seen them'
        : 'suddenly — the body simply quit');
      return;
    }
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
  // Nobody is prescribing a name in this business a generic and a follow-up in six weeks.
  // It is a private psychiatrist, a monthly review and a repeat script, and it is priced
  // like everything else that comes to your door.
  antidep:     { label: 'Antidepressants', blurb: 'Private script, monthly review. A month at a time.', cost: 2400, scales: true },
};

// Nobody in this business gets better on the public system, and nobody quotes a star the
// same number they quote anyone else. What the money is actually buying is not the drug —
// it is the psychiatrist who comes to the house, the review nobody minutes, and the fact
// that it never reaches a single person who would sell it. That is priced off what you
// have, because the people selling it can see exactly what you have.
//
// It is deliberately worst when you can least carry it: the illness has already taken two
// of your three Energy, so you are earning least in the months it charges most.
export const TREATMENT_SHARE = 0.04;        // of everything you have, per month
export const TREATMENT_CAP = 400000;
export function priceOf(s, key) {
  const p = PILLS[key]; if (!p) return 0;
  if (!p.scales) return p.cost;
  return Math.max(p.cost, Math.min(TREATMENT_CAP, Math.round((Math.max(0, s.cash || 0) * TREATMENT_SHARE) / 100) * 100));
}

export function buyPills(s, key, qty = 1) {
  const p = PILLS[key]; if (!p) return s;
  const cost = priceOf(s, key) * qty;
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
