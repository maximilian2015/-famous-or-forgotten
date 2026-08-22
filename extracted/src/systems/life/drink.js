// The other way out, and the reason the good one has to be worth taking.
//
// A depression takes two hours of your month. You can have them back tonight — the
// calendar opens, you book what you like, nobody has to know. It works. That is the whole
// problem with it: it works every single month, and it keeps working right up until the
// thing it costs is the only thing you were ever selling.
//
// What it takes is the craft. Acting comes off a fraction every month and does not come
// back on its own, and the room can tell. What it demands is that you keep doing it: once
// you are properly into it, a month without is worse than the depression was.
import { rint, chance } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

export const DEPENDENT_AT = 45;
export const BANDS = [
  { min: 78, id: 'gone', label: 'It has you', note: 'Everyone on set knows. Some of them have stopped mentioning it.' },
  { min: DEPENDENT_AT, id: 'dependent', label: 'You need it now', note: 'A month without is worse than what you started drinking about.' },
  { min: 20, id: 'heavy', label: 'Most nights', note: 'It is doing what you wanted it to do, and it is asking for more.' },
  { min: 1, id: 'some', label: 'Some nights', note: 'It opens the month up. That is all it is, so far.' },
  { min: 0, id: 'dry', label: 'Dry', note: '' },
];
export function level(s) { return s.drink?.level || 0; }
export function band(s) { for (const b of BANDS) if (level(s) >= b.min) return b; return BANDS[BANDS.length - 1]; }
export function dependent(s) { return level(s) >= DEPENDENT_AT; }
export function drankThisMonth(s) { return !!s.drink?.thisMonth; }

// Whether tonight buys back the hours the illness took. It always does — that is the trap.
export function drinkingCoversSlots(s) { return drankThisMonth(s); }

export function drinkThrough(s) {
  if (drankThisMonth(s)) { s.lastEvent = 'You have already had tonight.'; return s; }
  s.drink = s.drink || { level: 0, months: 0, dryMonths: 0, worstLevel: 0 };
  s.drink.thisMonth = true;
  s.drink.months = (s.drink.months || 0) + 1;
  s.drink.dryMonths = 0;
  const before = s.drink.level || 0;
  // It escalates faster once it has a hold, which is the only honest curve for it.
  s.drink.level = clamp(before + (before >= DEPENDENT_AT ? rint(5, 9) : rint(4, 7)));
  s.drink.worstLevel = Math.max(s.drink.worstLevel || 0, s.drink.level);
  s.mental = clamp((s.mental || 0) + (before >= DEPENDENT_AT ? 1 : 4));
  if (before < DEPENDENT_AT && s.drink.level >= DEPENDENT_AT) {
    addTimeline(s, 'It stopped being a decision you make in the evening. You need it now to get through a month at all.', true);
    s.bigMoment = {
      id: 'dependent', kind: 'bad', title: 'You need it now',
      body: 'It gave you your months back and you took every one of them. Somewhere in the middle of that it stopped '
        + 'being the thing you reach for and started being the thing you need. A month without it now is worse than '
        + 'the months you started drinking to get through — and it is still taking your craft, a little at a time, '
        + 'every single month.',
    };
  }
  s.lastEvent = before >= DEPENDENT_AT
    ? 'You drank because you had to. The month is open again.'
    : 'You drank, and the month opened up. It is that easy, which is the problem.';
  return s;
}

// Runs monthly.
export function drinkTick(s) {
  const d = s.drink;
  if (!d) return s;
  const drank = !!d.thisMonth;
  d.thisMonth = false;

  if (drank) {
    // What it is actually costing: the only thing you had to sell.
    const key = s.dream === 'singer' ? 'singing' : 'acting';
    const bite = d.level >= 78 ? 1.1 : d.level >= DEPENDENT_AT ? 0.7 : 0.35;
    s[key] = clamp((s[key] || 0) - bite);
    s.health = clamp((s.health || 0) - (d.level >= DEPENDENT_AT ? 0.8 : 0.3));
    if (d.level >= DEPENDENT_AT) s.respect = clamp((s.respect || 0) - 0.35);
    if (d.level >= 78 && chance(6)) {
      s.scandal = clamp((s.scandal || 0) + rint(6, 14));
      addTimeline(s, 'Somebody filmed you outside a restaurant and it is everywhere by lunchtime.', true);
      s.lastEvent = 'Somebody filmed you. You do not remember the restaurant.';
    }
  } else {
    d.dryMonths = (d.dryMonths || 0) + 1;
    if (dependent(s)) {
      // Stopping on your own, at this point, does not work — and it costs you the month.
      s.mental = clamp((s.mental || 0) - 7);
      s.health = clamp((s.health || 0) - 1.5);
      if (d.dryMonths === 1) {
        s.lastEvent = 'You did not drink. You also did not do anything else — the whole month went sideways.';
        addTimeline(s, 'Tried to stop on your own. The month went sideways.', true);
      }
      d.level = clamp(d.level - 0.6);
    } else {
      d.level = clamp(d.level - 2.2);
      if (d.level <= 0) { s.drink = null; return s; }
    }
  }
  return s;
}

// A month you drank through is a month you were not really there for. The shoot notices.
export function shootPenalty(s) {
  if (!drankThisMonth(s)) return 0;
  return level(s) >= DEPENDENT_AT ? 4 : 2;
}

// ── the clinic ────────────────────────────────────────────────────────────────
// Six months if you caught it early, up to two years if you did not — and longer again
// if you were drinking on top of a depression, because that is two things to undo.
export function rehabMonthsFor(s) {
  const lv = s.drink?.worstLevel || level(s);
  let months = lv >= 78 ? 20 : lv >= DEPENDENT_AT ? 13 : 6;
  if (s.depression) months = Math.round(months * 1.5);
  return Math.min(24, months);
}
export function rehabCostFor(s) { return 42000 + rehabMonthsFor(s) * 6500; }
