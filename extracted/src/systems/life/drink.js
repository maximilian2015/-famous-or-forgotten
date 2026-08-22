// The other way out, and the reason the good one has to be worth taking.
//
// A depression takes two of your three Energy every month. You can have them back
// tonight — the calendar opens, you book what you like, nobody has to know. It works.
// That is the whole problem with it: it works every single month, and it keeps working
// right up until the thing it costs is the only thing you were ever selling.
//
// What it takes is the craft. Acting comes off a fraction every month and does not come
// back on its own, and the room can tell. What it demands is that you keep doing it: once
// you are properly into it, a month without is worse than the depression was.
//
// It is bought in the same shop as the medication, and that is the entire argument in one
// screen: the pills are priced off what you are worth and do nothing for six weeks. The
// bottle is thirty-five euros and works tonight. Nobody chooses wrong because they are
// stupid — they choose the one they can afford on the month they are actually having.
import { rint, chance } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

export const DRINK_AGE = 18;

// What is in the house. The expensive one is not safer — it climbs exactly the same,
// because the bottle has never been the thing that decides that. What money buys is how
// it looks: nobody calls a man with a cellar a drunk, they call him a collector. The
// cheap one is rougher on you and is the one people notice.
export const BOTTLES = {
  cheap: { label: 'Whatever is open', cost: 35, blurb: 'The shop by the flat, at the hour it was still open.', bite: 1.5, seen: 1.0 },
  good:  { label: 'A bottle with a name', cost: 190, blurb: 'The one you would put on a table if somebody came round.', bite: 1.0, seen: 0.55 },
  fine:  { label: 'Something from the cellar', cost: 1400, blurb: 'Bought at auction. It photographs as a hobby.', bite: 0.75, seen: 0.3 },
};
export const BOTTLE_ORDER = ['cheap', 'good', 'fine'];
export function bottlesInHouse(s) { return BOTTLE_ORDER.reduce((n, k) => n + ((s.bottles || {})[k] || 0), 0); }

export function buyBottle(s, key, qty = 1) {
  const b = BOTTLES[key]; if (!b) return s;
  const cost = b.cost * qty;
  if ((s.cash || 0) < cost) { s.lastEvent = `That costs €${cost.toLocaleString()} and you're short.`; return s; }
  s.cash -= cost;
  (s.bottles = s.bottles || {})[key] = (s.bottles[key] || 0) + qty;
  s.lastEvent = `You put it in the cupboard. €${cost.toLocaleString()}.`;
  return s;
}
// You drink the good one first. That is what everybody does, and it is why the good one
// runs out and the cheap one is what is left by the end.
function takeBottle(s) {
  for (const k of ['fine', 'good', 'cheap']) {
    if (((s.bottles || {})[k] || 0) > 0) { s.bottles[k] -= 1; return k; }
  }
  return null;
}

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

// Whether tonight buys back the Energy the illness took. It always does — that is the trap.
export function drinkingCoversSlots(s) { return drankThisMonth(s); }

export function drinkThrough(s) {
  if ((s.ageY || 0) < DRINK_AGE) { s.lastEvent = `You are ${s.ageY}.`; return s; }
  if (drankThisMonth(s)) { s.lastEvent = 'You have already had tonight.'; return s; }
  const key = takeBottle(s);
  if (!key) { s.lastEvent = 'There is nothing in the house. The shop is on your phone.'; return s; }
  s.drink = s.drink || { level: 0, months: 0, dryMonths: 0, worstLevel: 0 };
  s.drink.lastBottle = key;
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
  // The whole promise is that the calendar opens TONIGHT, not next month. apMaxEff is only
  // recomputed on the month roll, so without this the Energy came back one month after the
  // drink that bought it and the button was lying about what it did.
  //
  // The owed count is worked out here rather than imported: depression.js already imports
  // this file to ask whether tonight covers the month, and systems do not import in circles.
  const owed = s.depression ? Math.max(0, 2 - (s.depression.passed || 0)) : (s.scarred || 0);
  if (owed > 0) {
    s.apMaxEff = (s.apMaxEff || s.apMax || 3) + owed;
    s.ap = (s.ap || 0) + owed;
  }
  s.lastEvent = before >= DEPENDENT_AT
    ? (s.depression ? 'You drank because you had to. The month is open again.' : 'You drank because you had to.')
    : s.depression ? 'You drank, and the month opened up. It is that easy, which is the problem.'
    : 'A quiet evening on your own. Nothing happened, which was the idea.';
  return s;
}

// Runs monthly.
export function drinkTick(s) {
  const d = s.drink;
  if (!d) return s;
  const drank = !!d.thisMonth;
  d.thisMonth = false;

  if (drank) {
    // What it is actually costing: the only thing you had to sell. The bottle changes how
    // hard it lands and who notices — it does not change that it lands.
    // Past a point the label stops covering for you. What people see is the state you are
    // in, and no cellar has ever explained that away.
    const raw = BOTTLES[d.lastBottle] || BOTTLES.good;
    const b = d.level >= 78 ? { bite: raw.bite, seen: 1 } : raw;
    const key = s.dream === 'singer' ? 'singing' : 'acting';
    const bite = d.level >= 78 ? 1.1 : d.level >= DEPENDENT_AT ? 0.7 : 0.35;
    s[key] = clamp((s[key] || 0) - bite * b.bite);
    s.health = clamp((s.health || 0) - (d.level >= DEPENDENT_AT ? 0.8 : 0.3) * b.bite);
    if (d.level >= DEPENDENT_AT) s.respect = clamp((s.respect || 0) - 0.35 * b.seen);
    if (d.level >= 78 && chance(6 * b.seen)) {
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
