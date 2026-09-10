// Why your head is where it is.
//
// Mental is read by five different systems — it slows recovery from illness, it adds to the
// yearly decline, it makes every month on set cost more strain, below 35 it makes the work
// harder and below 22 it gets you fired — and the player was shown a bare number that only
// ever went down. Across a fifty-month playtest it fell from 80 to 10 and the game said
// nothing at all.
//
// Everything below is the REAL monthly arithmetic, read out of the same places that
// actually run it. Nothing here is a plausible-sounding story: if this panel says the room
// is taking 0.6 a month, that is because engine/economy.js takes 0.6 a month. A screen that
// invents a nice explanation is worse than no screen, because the player will plan around it.

import { home } from '../../engine/economy.js';
import { level as drinkLevel } from './drink.js';
import { onMeds } from './depression.js';
import { hasStaff, owns, STAFF, THINGS } from './money.js';
import { jobSlots } from './work.js';
import { monthlyStrain, strainBand } from './strain.js';

// One line of the report. `per` is what it does to mental every month, signed.
const line = (id, label, per, why) => ({ id, label, per, why });

export function mentalReport(s) {
  const up = [], down = [], notes = [];
  // Neutral rows are shown but never counted — they explain something without changing it.
  const push = (l) => (l.per > 0 ? up : l.per < 0 ? down : notes).push(l);

  // ── where you sleep ── engine/economy.js applyMonthly
  if (s.homeless) {
    push(line('street', 'Sleeping rough', -4, 'Every month out here takes something you do not get back.'));
  } else if (!s.hasApartment) {
    push(line('parents', 'Back at your parents’', -0.4, 'Your old room, at your age. It is not nothing.'));
  } else {
    const h = home(s);
    if (h.mental) push(line('home', h.label, h.mental, h.perk));
  }

  // ── money trouble ── the letter, then the locks
  if ((s.rentMissed || 0) > 0) push(line('rent', 'Rent you could not cover', -3, 'A letter came, and then another one.'));

  // ── the work ──
  // A shoot does NOT take mental every month — checked, and it does not. What it fills is
  // the other meter, and that one ends in a collapse that takes sixteen points at once.
  // Saying "the shoot is costing you 1.5 a month" would have been a nice-sounding invention,
  // and a player would have planned around it.
  if (s.production) {
    const fills = monthlyStrain(s.production, s.strain || 0);
    const band = strainBand(s.strain || 0);
    push(line('shoot', `Shooting ${s.production.title}`, 0,
      `Not taking your head directly — it is filling the other meter, at ${Math.round(fills * 10) / 10} a month. `
      + `You are ${band.label.toLowerCase()}, and it is a collapse that costs you sixteen at once.`));
  }
  const slots = jobSlots(s);
  if (slots > 1) push(line('job', s.job ? `${s.job.title} at ${s.job.employer}` : 'The day job', -1, 'The grind wears, and it wears quietly.'));
  if (s.burnout && s.burnout.left > 0) {
    push(line('signedoff', 'Signed off', 3, `${s.burnout.left} more month${s.burnout.left === 1 ? '' : 's'} of nothing. It is working, whether it feels like it or not.`));
  }

  // ── the illness that does not lift ── systems/life/depression.js
  if (s.depression) {
    const close = closestPerson(s);
    const base = close ? -1.2 : -2.2;
    const meds = onMeds(s) ? 1.2 : 0;
    push(line('depression', 'It has not lifted', base + meds,
      close ? `${close.name.split(' ')[0]} is still there, and that is the difference between −2.2 and −1.2 a month.`
        : 'There is nobody close enough to notice, and that is costing you a point a month on its own.'));
    if (!meds) push(line('nomeds', 'Not on anything', 0, 'Nothing about this moves until you are. The script is in the Shop.'));
  }

  // ── the other way out ──
  const lv = drinkLevel(s);
  if (lv >= 78) push(line('drink', 'Drinking', -2.5, 'It stopped being the thing that helped a while ago.'));
  else if (lv >= 45) push(line('drink', 'Drinking', 0, 'Not costing you yet. It is the next step that does.'));

  // ── what you have bought that helps ──
  if (hasStaff(s, 'household')) push(line('staff', 'Trainer and a cook', 0.2, STAFF.household.blurb));
  if (owns(s, 'boat')) push(line('boat', 'Somewhere to disappear', THINGS.boat.mental, THINGS.boat.blurb));
  if ((s.diet || 'cook') === 'fine') push(line('diet', 'Eating properly', 0.5, 'Somebody else cooks, and it shows.'));

  // ── people ──
  const close = closestPerson(s);
  if (close && (close.relationship || 0) >= 55) {
    push(line('close', `${close.name.split(' ')[0]}`, 0, 'Somebody who would notice. That is worth more than a number.'));
  } else if (!close) {
    push(line('alone', 'Nobody close', 0, 'There is no one you would ring at two in the morning. It shows up everywhere else.'));
  }

  const net = [...up, ...down].reduce((n, l) => n + l.per, 0);
  return { up, down, notes, net: Math.round(net * 10) / 10 };
}

// The person most likely to notice. Used by the report and by the phone call below.
export function closestPerson(s) {
  const all = [
    ...(s.partner ? [s.partner] : []),
    ...((s.family || []).filter((p) => p.alive !== false)),
    ...((s.people || [])),
  ];
  let best = null;
  for (const p of all) if (!best || (p.relationship || 0) > (best.relationship || 0)) best = p;
  return best && (best.relationship || 0) > 0 ? best : null;
}

// ── two things you can do about it that the game did not have ─────────────────────────
// Both are small on purpose. Neither of them fixes a depression — only the months and the
// hour a week do that — but a bad month is a different thing from an illness, and there was
// nothing at all to do about a bad month.

export function canCall(s) {
  const p = closestPerson(s);
  if (!p) return { ok: false, why: 'There is nobody to ring.' };
  if ((s.ap || 0) <= 0) return { ok: false, why: 'No energy left this period.' };
  if (s._calledMonth === stamp(s)) return { ok: false, why: `You already rang ${p.name.split(' ')[0]} this month.` };
  return { ok: true, why: '', p };
}
export function callSomebody(s) {
  const fit = canCall(s);
  if (!fit.ok) { s.lastEvent = fit.why; return s; }
  const p = fit.p;
  s.ap = (s.ap || 0) - 1;
  s._calledMonth = stamp(s);
  // How much it helps is how close they actually are — which is the whole argument for
  // keeping people, and the game had no place to make it.
  const warmth = Math.max(0, Math.min(1, (p.relationship || 0) / 90));
  const lift = Math.round(3 + warmth * 9);
  s.mental = clamp(s.mental + lift);
  s.lastEvent = warmth > 0.6
    ? `An hour on the phone with ${p.name.split(' ')[0]}. Nothing was solved and you feel better anyway. (mental +${lift})`
    : `You rang ${p.name.split(' ')[0]}. It was a bit stilted, and it still helped. (mental +${lift})`;
  return s;
}

export const AWAY_MONTHS = 4;
export function canGetAway(s) {
  if (!owns(s, 'boat')) return { ok: false, why: 'You have nowhere to go that nobody can reach.' };
  if ((s.ap || 0) <= 0) return { ok: false, why: 'No energy left this period.' };
  const since = stamp(s) - (s._awayAt ?? -99);
  if (since < AWAY_MONTHS) return { ok: false, why: `You were away ${since} month${since === 1 ? '' : 's'} ago. It stops working if you never come back.` };
  return { ok: true, why: '' };
}
export function getAway(s) {
  const fit = canGetAway(s);
  if (!fit.ok) { s.lastEvent = fit.why; return s; }
  s.ap = (s.ap || 0) - 1;
  s._awayAt = stamp(s);
  s.mental = clamp(s.mental + 14);
  s.health = clamp((s.health || 0) + 3);
  s.lastEvent = 'Two weeks where the phone did not work and nobody knew where you were. You came back a different person. (mental +14)';
  return s;
}

function stamp(s) { return (s.year || 0) * 12 + (s.month || 0); }
function clamp(v) { return Math.max(0, Math.min(100, v)); }
