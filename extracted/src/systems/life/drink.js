import { setRespect } from '../meta/status.js';
import { count } from '../../engine/text.js';
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
// Once it has had you it has had you, and the current number does not get to say otherwise.
// Dependence used to be read straight off the level, and the level falls 0.6 in a dry month
// — so somebody who had just crossed the line was out of it again in two months, with the
// withdrawal switching itself off on the way. Crossing sets a flag, and only getting all
// the way to zero clears it.
export function hooked(s) { return !!s.drink?.hooked; }
export function dependent(s) { return level(s) >= DEPENDENT_AT || hooked(s); }
export function band(s) {
  const floor = hooked(s) ? DEPENDENT_AT : 0;
  const lv = Math.max(level(s), floor);
  for (const b of BANDS) if (lv >= b.min) return b;
  return BANDS[BANDS.length - 1];
}
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
  // Early on it genuinely lifts the evening, which is the entire reason anybody starts.
  // Once it has you it stops lifting anything — it only stops the withdrawal, and a
  // dependent drinker used to sit pinned at a hundred mental for the rest of their life,
  // which quietly cancelled the biggest pressure in the game.
  s.mental = clamp((s.mental || 0) + (hooked(s) ? 0 : 4));
  if (before < DEPENDENT_AT && s.drink.level >= DEPENDENT_AT) {
    s.drink.hooked = true;
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
  const owed = s.depression ? ((s.depression.passed || 0) >= 1 ? 1 : 2) : (s.scarred || 0);
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
  // Anything that judges this month has to run before the flag is cleared.
  promiseTick(s);
  const said = maybeUltimatum(s);
  if (said) d.pending = said;
  d.thisMonth = false;

  // The shoot has to be told here, not in productionTick. The monthly order is drinkTick
  // then productionTick, so by the time the production asked whether you had been drinking
  // the flag had already been cleared — and every film shot drunk came out unpunished.
  if (drank && s.production) s.production.drunkMonths = (s.production.drunkMonths || 0) + 1;

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
    // And past the point where everyone can see it, it is a depressant and nothing else.
    if (d.level >= 78) s.mental = clamp((s.mental || 0) - 2.5);
    if (d.level >= DEPENDENT_AT) setRespect(s, (s.respect || 0) - 0.35 * b.seen);
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
      // Six tenths a month. The door out on your own is open and it is a decade long, which
      // is the honest length of it and the reason the clinic exists.
      if (d.level <= 0) {
        const years = Math.round((d.dryMonths || 0) / 12);
        s.drink = null;
        addTimeline(s, `${count(d.dryMonths, 'month')} dry, without a clinic and without anybody making you.`);
        s.lastEvent = 'You did it the long way, on your own, and it took years.';
        s.bigMoment = { id: 'dryalone', kind: 'good', title: 'You did it on your own',
          body: `${count(d.dryMonths, 'month')}. No clinic, no announcement, nobody driving you anywhere — just every `
            + `single month for ${years > 1 ? `${count(years, 'year')}` : 'a year'} deciding it again. Your craft is where `
            + 'you left it, which is a long way down from where it was, and none of that is coming back by itself. '
            + 'But it is not going any further down either.' };
        return s;
      }
    } else {
      d.level = clamp(d.level - 2.2);
      if (d.level <= 0) { s.drink = null; return s; }
    }
  }
  return s;
}

// ── the person who notices ────────────────────────────────────────────────────
// Nobody in this game reacted to any of it. You could drink for four years next to someone
// who loved you and the only number that moved was your own. So: the closest person to you
// says something, once, at the point where it stops being an evening habit.
//
// If there is nobody close, nobody says it. That is not a gap — it is the answer. What
// stops you then is the work drying up instead, which is a colder wall and a later one.
export const ULTIMATUM_AT = DEPENDENT_AT;
export const GRACE_MONTHS = 6;

// The closest living person, wherever they live in the save. Partner first — they are the
// one in the house.
export function closestPerson(s) {
  const pool = [];
  if (s.partner) pool.push({ ref: s.partner, id: s.partner.id, where: 'partner', name: s.partner.name, rel: s.partner.relationship || 0 });
  for (const p of (s.family || [])) if (p.alive !== false) pool.push({ ref: p, id: p.id, where: 'family', name: p.name, rel: p.relationship || 0, relation: p.relation });
  for (const p of (s.people || [])) if (p.alive !== false) pool.push({ ref: p, id: p.id, where: 'people', name: p.name, rel: p.relationship || 0 });
  pool.sort((a, b) => b.rel - a.rel);
  // Somebody you live with notices whatever the number says — a bond drifts −3 every month
  // you do not spend an evening on it, which meant a partner reliably fell out of "close"
  // in the eight months the drinking took to escalate, and nobody was ever there to say it.
  // Anybody else has to actually still be in your life.
  const best = pool[0];
  if (!best) return null;
  if (best.where === 'partner' || best.rel >= 50) return best;
  return null;
}
// Once somebody has sat you down it has to stay THAT person. Re-asking "who is closest"
// months later meant a partner who drifted under the 55 line during the promise quietly
// stopped counting, and the promise resolved against nobody — nobody left, nobody forgave.
export function personById(s, id) {
  if (!id) return null;
  if (s.partner && s.partner.id === id) return { ref: s.partner, id, where: 'partner', name: s.partner.name, rel: s.partner.relationship || 0 };
  for (const p of (s.family || [])) if (p.id === id && p.alive !== false) return { ref: p, id, where: 'family', name: p.name, rel: p.relationship || 0 };
  for (const p of (s.people || [])) if (p.id === id && p.alive !== false) return { ref: p, id, where: 'people', name: p.name, rel: p.relationship || 0 };
  return null;
}

// Raised once, the month you cross the line, and never again — this is not a nag.
export function maybeUltimatum(s) {
  const d = s.drink;
  if (!d || d.ultimatum || level(s) < ULTIMATUM_AT) return null;
  const who = closestPerson(s);
  d.ultimatum = who ? 'asked' : 'nobody';
  if (!who) return null;
  d.who = who.name; d.whoId = who.id;
  return {
    id: 'ultimatum', kind: 'bad', title: `${who.name} is waiting up`,
    who: who.name,
    body: `${who.name} is sitting in the kitchen with the light on, and they have clearly been there a while. `
      + 'They know how many months this has been going on. They are not angry, which is worse, and they have '
      + 'already said the part they came to say: they cannot keep doing this next to you.',
  };
}

// Three answers, and the game holds you to all of them.
export function answerUltimatum(s, choice) {
  const d = s.drink; if (!d) return s;
  const who = personById(s, d.whoId);
  d.ultimatum = 'answered';
  d.pending = null;
  if (choice === 'clinic') {
    // The UI sends them to the clinic itself; here we only record that they went willingly.
    d.promised = false;
    if (who) { who.ref.relationship = clamp((who.ref.relationship || 0) + 8); }
    s.lastEvent = who ? `${who.name} drove you there and did not let go of your hand in the car park.` : 'You went.';
    return s;
  }
  if (choice === 'promise') {
    // A promise made to nobody is not a promise, and it must not later cost you a person
    // who was never in the room.
    if (!who) { s.lastEvent = 'There was nobody to promise.'; return s; }
    d.promised = (s.year || 0) * 12 + (s.month || 0) + GRACE_MONTHS;
    s.lastEvent = who ? `You promised ${who.name}. They wanted to believe it, so they did.` : 'You promised.';
    addTimeline(s, `Promised ${who ? who.name : 'them'} you would stop.`);
    return s;
  }
  // Told them to leave it alone. They do.
  if (who) leave(s, who, 'You told them it was not their business. They did not argue. They just went.');
  else s.lastEvent = 'There was nobody to have that conversation with.';
  return s;
}

// A promise you break costs you the person, which is the only way a promise means anything.
export function promiseTick(s) {
  const d = s.drink;
  if (!d || !d.promised) return s;
  const now = (s.year || 0) * 12 + (s.month || 0);
  if (d.thisMonth) {
    const who = personById(s, d.whoId);
    d.promised = false;
    if (who) leave(s, who, `${who.name} found the bottle. They did not shout, and they did not stay.`);
    return s;
  }
  if (now >= d.promised) {
    d.promised = false;
    const who = personById(s, d.whoId);
    if (who) {
      who.ref.relationship = clamp((who.ref.relationship || 0) + 10);
      addTimeline(s, `Six months dry. ${who.name} has started sleeping properly again.`);
      s.lastEvent = `Six months. ${who.name} has stopped checking the recycling.`;
    }
  }
  return s;
}

function leave(s, who, line) {
  if (who.where === 'partner') s.partner = null;
  else who.ref.relationship = clamp((who.ref.relationship || 0) - 60);
  s.mental = clamp((s.mental || 0) - 12);
  s.lastEvent = line;
  addTimeline(s, `${who.name} is gone.`, true);
  s.bigMoment = { id: 'theyleft', kind: 'bad', title: `${who.name} is gone`,
    body: line + ' The flat is very quiet now, and there is nobody left who is going to ask you '
      + 'how you are — which means there is nobody left whose asking could have helped.' };
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
