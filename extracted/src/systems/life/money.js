import { setRespect } from '../meta/status.js';
// What money is FOR.
//
// Measured across forty lives: the median actor holds €152k in their twenties, €26m in
// their thirties, €90m in their forties and €342m at seventy. The most expensive thing the
// game sold was a penthouse at €15,000 a month. So the number the player checks first,
// every month, printed in gold at the top of the screen, stopped meaning anything at about
// thirty and never meant anything again.
//
// One rule for everything in here: it has to hook into a system that already exists. A
// collection screen where a number goes down and a name appears in a list is not spending,
// it is a receipt. So —
//
//   · a home you OWN kills the rent, and your children inherit it
//   · people you PAY buy back Energy, which is the scarcest thing in the game
//   · things you own can be SOLD, which is what actually happens when somebody falls
//   · what you give away moves the only numbers money should not be able to move easily
//
// Prices are anchored to that wealth curve: the first flat is reachable in your twenties,
// the entourage costs about €1.7m a year to keep, and nothing here is a rounding error.

import { rint, chance } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { HOUSING, HOUSING_ORDER } from '../../engine/economy.js';
import { applyBond } from './bonds.js';
import { inCareer } from '../../engine/stage.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
export const money = (n) => (Math.abs(n) >= 1e6 ? '€' + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'm' : '€' + Math.round(n).toLocaleString());

// ── the roof over your head ───────────────────────────────────────────────────────────
// Renting forever is what somebody who has not made it does. Buying is the first thing
// anybody does with real money, and it is the one purchase that outlives you.
export const HOME_PRICE = { studio: 290000, flat: 620000, house: 1900000, penthouse: 4200000 };
export function canBuyHome(s) {
  const key = s.housing || 'room';
  if (!s.hasApartment) return { ok: false, why: 'You would need a place of your own first.' };
  if (s.owns === key) return { ok: false, why: 'You already own this one.' };
  const price = HOME_PRICE[key];
  if (!price) return { ok: false, why: 'Nobody sells a room in a shared flat. Move up first.' };
  if ((s.cash || 0) < price) return { ok: false, why: `That is ${money(price)}, and you are ${money(price - (s.cash || 0))} short.` };
  return { ok: true, why: '', price };
}
export function buyHome(s) {
  const fit = canBuyHome(s);
  if (!fit.ok) { s.lastEvent = fit.why; return s; }
  const h = HOUSING[s.housing];
  s.cash -= fit.price;
  // Selling the old one back gets you most of it — you are moving, not being repossessed.
  if (s.owns && HOME_PRICE[s.owns]) { const back = Math.round(HOME_PRICE[s.owns] * 0.92); s.cash += back; }
  s.owns = s.housing;
  s.lastEvent = `You bought it. ${h.label}, ${money(fit.price)}, and no rent again as long as you keep it.`;
  addTimeline(s, `Bought the ${h.label.toLowerCase()} outright — ${money(fit.price)}.`);
  return s;
}
// The other direction, which is the whole reason owning matters. A forced sale is a forced
// sale: you get about three quarters of it and everybody knows why you are selling.
export function sellHome(s) {
  if (!s.owns || !HOME_PRICE[s.owns]) { s.lastEvent = 'You do not own anything to sell.'; return s; }
  const back = Math.round(HOME_PRICE[s.owns] * 0.76);
  const label = (HOUSING[s.owns] || {}).label || 'the place';
  s.cash = (s.cash || 0) + back;
  s.owns = null;
  s.lastEvent = `You sold ${label.toLowerCase()} for ${money(back)}. You are renting again, and the rent starts next month.`;
  addTimeline(s, `Sold the ${label.toLowerCase()}. ${money(back)}, and questions.`, true);
  return s;
}
// Read by engine/economy.js — you do not pay rent on a house you own.
export function rentDue(s) {
  if (!s.hasApartment) return 0;
  if (s.owns && s.owns === s.housing) return 0;
  return (HOUSING[s.housing || 'room'] || HOUSING.room).cost;
}

// ── people you pay ────────────────────────────────────────────────────────────────────
// The best thing money can buy in this game is a month with more of it in. Energy is what
// actually limits a career — three slots, and everything costs one — so the assistant is
// the single most valuable purchase in the game, and it is priced like it.
export const STAFF = {
  assistant: { label: 'Personal assistant', cost: 12000, minFame: 30, ap: 1,
    blurb: 'Somebody else reads the mail, books the flights and remembers the names.',
    perk: 'An extra Energy every month, for as long as you keep them.' },
  household: { label: 'Trainer and a cook', cost: 18000, minFame: 25, health: 0.9, ill: -8,
    blurb: 'Two people whose entire job is that you are in shape on the day.',
    perk: 'Health goes up every month and you stop catching things.' },
  publicist: { label: 'Publicist', cost: 40000, minFame: 45, scandal: 2.4,
    blurb: 'A story is a story until somebody whose job it is gets on the phone.',
    perk: 'Bad press dies about three times as fast.' },
  security:  { label: 'Driver and security', cost: 75000, minFame: 62, safe: true,
    blurb: 'Nobody gets close enough for the night to go wrong.',
    perk: 'The nights that go badly go less badly.' },
};
export const STAFF_ORDER = ['assistant', 'household', 'publicist', 'security'];
export function hasStaff(s, id) { return !!(s.staff && s.staff[id]); }
export function staffBill(s) { return STAFF_ORDER.reduce((n, id) => n + (hasStaff(s, id) ? STAFF[id].cost : 0), 0); }
export function canHire(s, id) {
  const st = STAFF[id];
  if (!st) return { ok: false, why: '' };
  if (hasStaff(s, id)) return { ok: false, why: 'Already on the payroll.' };
  if ((s.fame || 0) < st.minFame) return { ok: false, why: `Nobody works for a name this size yet. Fame ${st.minFame}.` };
  // Three months up front, so hiring an entourage you cannot keep is your own doing.
  if ((s.cash || 0) < st.cost * 3) return { ok: false, why: `You would want three months behind you — ${money(st.cost * 3)}.` };
  return { ok: true, why: '' };
}
export function hire(s, id) {
  const fit = canHire(s, id);
  if (!fit.ok) { s.lastEvent = fit.why; return s; }
  (s.staff = s.staff || {})[id] = true;
  s.lastEvent = `${STAFF[id].label} starts on Monday. ${money(STAFF[id].cost)} a month.`;
  addTimeline(s, `Took on ${STAFF[id].label.toLowerCase()}.`);
  return s;
}
export function fire(s, id) {
  if (!hasStaff(s, id)) return s;
  delete s.staff[id];
  s.lastEvent = `You let the ${STAFF[id].label.toLowerCase()} go.`;
  addTimeline(s, `Let the ${STAFF[id].label.toLowerCase()} go.`);
  return s;
}
// Read by engine/time.js — this is the number that makes an entourage worth having.
export function staffEnergy(s) {
  let n = hasStaff(s, 'assistant') ? STAFF.assistant.ap : 0;
  if (owns(s, 'jet')) n += 1;
  return n;
}
// Read by systems/life/health.js.
export function staffIllness(s) { return hasStaff(s, 'household') ? STAFF.household.ill : 0; }
// Read by engine/economy.js — a publicist is the difference between a bad week and a bad year.
export function scandalRelief(s) { return hasStaff(s, 'publicist') ? STAFF.publicist.scandal : 1; }
// Read by systems/social/events.js and party.js.
export function protected_(s) { return hasStaff(s, 'security'); }

// ── things ────────────────────────────────────────────────────────────────────────────
// The point of these is not owning them. It is that when it goes wrong you sell them, and
// the game notices — which is the oldest story in this business and the game had no way to
// tell it. Art holds its value and a car does not, exactly like life.
export const THINGS = {
  watch:  { label: 'A watch that says something', price: 140000, minFame: 20, looks: 1, resale: 0.7,
    blurb: 'Nobody asks what it cost. Everybody who matters already knows.' },
  car:    { label: 'A car people photograph', price: 480000, minFame: 35, looks: 1, night: 4, resale: 0.45, upkeep: 2200,
    blurb: 'You arrive differently. That is the entire purchase.' },
  boat:   { label: 'Something to disappear on', price: 2600000, minFame: 55, mental: 0.7, resale: 0.5, upkeep: 14000,
    blurb: 'Two weeks where nobody can reach you, whenever you want them.' },
  art:    { label: 'A painting somebody argued about', price: 5500000, minFame: 60, respect: 2, resale: 0.95,
    blurb: 'You did not buy it to look at. You bought it because of who you are now.' },
  jet:    { label: 'A share in a jet', price: 11000000, minFame: 75, resale: 0.4, upkeep: 60000,
    blurb: 'Three continents in a week stops being a thing you dread.',
    perk: 'An extra Energy every month.' },
};
export const THING_ORDER = ['watch', 'car', 'boat', 'art', 'jet'];
export function owns(s, id) { return !!(s.things && s.things[id]); }
export function upkeepBill(s) { return THING_ORDER.reduce((n, id) => n + (owns(s, id) ? (THINGS[id].upkeep || 0) : 0), 0); }
export function canBuyThing(s, id) {
  const t = THINGS[id];
  if (!t) return { ok: false, why: '' };
  if (owns(s, id)) return { ok: false, why: 'You have one.' };
  if ((s.fame || 0) < t.minFame) return { ok: false, why: `Not at your level. Fame ${t.minFame}.` };
  if ((s.cash || 0) < t.price) return { ok: false, why: `${money(t.price)}. You are ${money(t.price - (s.cash || 0))} short.` };
  return { ok: true, why: '' };
}
export function buyThing(s, id) {
  const fit = canBuyThing(s, id);
  if (!fit.ok) { s.lastEvent = fit.why; return s; }
  const t = THINGS[id];
  s.cash -= t.price;
  (s.things = s.things || {})[id] = { paid: t.price, since: (s.year || 0) };
  if (t.looks) s.looks = clamp((s.looks || 0) + t.looks);
  if (t.respect) setRespect(s, (s.respect || 0) + t.respect);
  s.lastEvent = `${t.label}. ${money(t.price)}.`;
  addTimeline(s, `Bought ${t.label.toLowerCase()} — ${money(t.price)}.`);
  return s;
}
export function resaleOf(s, id) {
  const t = THINGS[id];
  if (!t || !owns(s, id)) return 0;
  // A painting is worth more the longer you have had it. A car is worth less every year.
  const held = Math.max(0, (s.year || 0) - (s.things[id].since || s.year || 0));
  const drift = id === 'art' ? 1 + Math.min(1.4, held * 0.045) : Math.max(0.45, 1 - held * 0.02);
  return Math.round(t.price * t.resale * drift);
}
export function sellThing(s, id) {
  if (!owns(s, id)) return s;
  const t = THINGS[id];
  const back = resaleOf(s, id);
  s.cash = (s.cash || 0) + back;
  delete s.things[id];
  if (t.looks) s.looks = clamp((s.looks || 0) - t.looks);
  if (t.respect) setRespect(s, (s.respect || 0) - t.respect);
  const lost = t.price - back;
  s.lastEvent = back >= t.price
    ? `You sold ${t.label.toLowerCase()} for ${money(back)} — ${money(back - t.price)} more than you paid.`
    : `You sold ${t.label.toLowerCase()} for ${money(back)}. You paid ${money(t.price)} for it.`;
  addTimeline(s, `Sold ${t.label.toLowerCase()} for ${money(back)}.`, lost > t.price * 0.3);
  return s;
}
// Read by systems/social/events.js — arriving in something matters on a carpet.
export function arrivalBonus(s) { return owns(s, 'car') ? THINGS.car.night : 0; }
// Read by systems/meta/legacy.js — what is actually left when you go.
export function estateValue(s) {
  let n = s.owns && HOME_PRICE[s.owns] ? Math.round(HOME_PRICE[s.owns] * 0.92) : 0;
  for (const id of THING_ORDER) if (owns(s, id)) n += resaleOf(s, id);
  return n;
}

// ── what you give away ────────────────────────────────────────────────────────────────
// The one place money should work badly. You can lift your family out of where you came
// from with a cheque, and it is a real thing to be able to do — but a cheque is not the
// same as turning up, and the game should not pretend otherwise.
export function supportCost(s) {
  // Scaled to what you have, so it is always a decision and never loose change.
  return Math.max(40000, Math.round(Math.min(2500000, (s.cash || 0) * 0.07)));
}
export function canSupport(s, p) {
  if (!p || p.alive === false) return { ok: false, why: '' };
  if (!['Mother', 'Father', 'Brother', 'Sister', 'Child'].includes(p.relation || '')) return { ok: false, why: 'This is for family.' };
  if (p.supported) return { ok: false, why: `${p.name.split(' ')[0]} is already set up. They do not need it twice.` };
  const cost = supportCost(s);
  if ((s.cash || 0) < cost) return { ok: false, why: `That would be ${money(cost)}, and you do not have it.` };
  return { ok: true, why: '', cost };
}
export function support(s, id) {
  const p = (s.family || []).find((x) => x.id === id);
  const fit = canSupport(s, p);
  if (!fit.ok) { s.lastEvent = fit.why || 'Not now.'; return s; }
  s.cash -= fit.cost;
  p.supported = true;
  // It genuinely changes their life, and it genuinely does not fix everything.
  if (p.job === 'unemployed') p.job = 'retired';
  applyBond(s, p, rint(14, 24));
  const first = p.name.split(' ')[0];
  s.lastEvent = `You bought ${first} out of it. ${money(fit.cost)}, and they will never quite know how to say thank you.`;
  addTimeline(s, `Set ${first} up for good — ${money(fit.cost)}.`);
  return s;
}

// Backing a child who wants what you had. Coaching, the right school, the right rooms —
// which is exactly how it works, and the game had no way to spend money on it at all.
export function backingCost(s) { return Math.max(60000, Math.round(Math.min(900000, (s.cash || 0) * 0.03))); }
export function canBack(s, k) {
  if (!k || k.alive === false) return { ok: false, why: '' };
  if (k.relation !== 'Child') return { ok: false, why: '' };
  if ((k.age || 0) < 8) return { ok: false, why: `${k.name.split(' ')[0]} is too small for any of that.` };
  if ((k.backed || 0) >= 3) return { ok: false, why: 'There is nothing left to buy them. The rest is theirs.' };
  const cost = backingCost(s);
  if ((s.cash || 0) < cost) return { ok: false, why: `That would be ${money(cost)}.` };
  return { ok: true, why: '', cost };
}
export function backChild(s, id) {
  const k = (s.family || []).find((x) => x.id === id);
  const fit = canBack(s, k);
  if (!fit.ok) { s.lastEvent = fit.why || 'Not now.'; return s; }
  s.cash -= fit.cost;
  k.backed = (k.backed || 0) + 1;
  k.talent = clamp((k.talent || 0) + rint(7, 13));
  applyBond(s, k, rint(3, 7));
  const first = k.name.split(' ')[0];
  s.lastEvent = `Coaching, the right school, the right rooms. ${money(fit.cost)} on ${first}, and they are better than they were.`;
  addTimeline(s, `Paid for ${first} to be taught properly.`);
  return s;
}

// ── the monthly bill ──────────────────────────────────────────────────────────────────
// Runs every month. An entourage is not a purchase, it is a standing cost, and that is the
// whole reason it makes a fall hurt.
export function moneyTick(s) {
  if (!inCareer(s)) return;
  const bill = staffBill(s) + upkeepBill(s);
  if (!bill) return;
  // The money itself is taken by engine/economy.js applyMonthly, along with the rent and
  // the food — it belongs in the one place the "Out each month" panel adds up, or the
  // player is shown a number that is not what leaves their account. (It was briefly taken
  // in BOTH places, which billed the entourage twice a month.) What happens here is the
  // effects, and what happens when the money is not there.
  if ((s.cash || 0) >= 0) {
    if (hasStaff(s, 'household')) {
      s.health = clamp((s.health || 0) + STAFF.household.health);
      s.mental = clamp((s.mental || 0) + 0.2);
    }
    if (owns(s, 'boat')) s.mental = clamp((s.mental || 0) + THINGS.boat.mental);
    return;
  }
  // You cannot pay them. They do not wait, and it is not quiet.
  const gone = STAFF_ORDER.filter((id) => hasStaff(s, id));
  if (gone.length) {
    const id = gone[gone.length - 1];
    delete s.staff[id];
    s.lastEvent = `You could not make the payroll. The ${STAFF[id].label.toLowerCase()} is gone.`;
    addTimeline(s, `Could not pay the ${STAFF[id].label.toLowerCase()}. They left.`, true);
    if (chance(35)) s.scandal = clamp((s.scandal || 0) + rint(2, 6));
    return;
  }
  // Nothing left but the things, and those have to go one at a time.
  const owned = THING_ORDER.filter((id) => owns(s, id));
  if (owned.length) {
    const id = owned[owned.length - 1];
    const back = resaleOf(s, id);
    sellThing(s, id);
    s.lastEvent = `The upkeep caught up with you. ${THINGS[id].label} had to go — ${money(back)}.`;
  }
}
