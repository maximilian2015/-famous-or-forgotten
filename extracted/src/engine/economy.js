import { addTimeline } from './timeline.js';
// Concrete places to live rather than an abstract "lifestyle" slider — a room and a penthouse
// are things a player can picture, and the rent IS the lifestyle cost.
// Priced off real Amsterdam rents so the early squeeze feels honest.
// Rent has to buy something you can feel, or trading €750 for €1,450 is just a worse
// number. Every tier moves five things: how you sleep (mental), how the body holds up
// (health), how often you fall ill, how much of the month you actually get (energy),
// and whether the place is somewhere you can bring people — or raise a child.
export const HOUSING = {
  room: {
    label: 'Rented room', blurb: 'A room in a shared flat. Thin walls.', cost: 750,
    mental: -0.6, health: -0.3, ill: 7, ap: 0, bond: 0.8, kids: false,
    perk: 'Someone else’s dishes and someone else’s hours. You sleep badly and catch everything going round.',
  },
  studio: {
    label: 'Studio flat', blurb: 'Small, yours, and the door locks.', cost: 1450,
    mental: 0.2, health: 0, ill: 2, ap: 0, bond: 1, kids: false,
    perk: 'Yours, and the door locks. That is the whole of it — but it is not nothing.',
  },
  flat: {
    label: 'Two-bed apartment', blurb: 'Space to breathe. A view of something.', cost: 2900,
    mental: 1, health: 0.2, ill: -3, ap: 0, bond: 1.25, kids: true,
    perk: 'Room to breathe and a second bedroom. People can stay, and a child could grow up here.',
  },
  house: {
    label: 'Canal house', blurb: 'Old brick, tall windows, serious money.', cost: 7500,
    mental: 1.8, health: 0.35, ill: -7, ap: 1, bond: 1.5, kids: true,
    perk: 'Quiet, warm and yours. You wake with an extra hour in you every month.',
  },
  penthouse: {
    label: 'Penthouse', blurb: 'The city underneath you, and everyone knows it.', cost: 15000,
    mental: 2.4, health: 0.5, ill: -10, ap: 1, bond: 1.7, kids: true,
    perk: 'The address is part of the name now. An extra hour a month, and nobody sleeps better than you.',
  },
};
export const HOUSING_ORDER = ['room', 'studio', 'flat', 'house', 'penthouse'];
export function home(s) { return HOUSING[s.housing || 'room'] || HOUSING.room; }
// Read by systems/life/health.js — a damp shared room is a real reason to fall ill.
export function homeIllness(s) { return s.hasApartment ? (home(s).ill || 0) : 0; }
// Read by engine/time.js — space and quiet give you back part of the month.
export function homeEnergy(s) { return s.hasApartment ? (home(s).ap || 0) : 0; }
// Read wherever you spend time with someone — you cannot host anyone in a rented room.
export function homeBond(s) { return s.hasApartment ? (home(s).bond ?? 1) : 1; }
export function canRaiseChild(s) { return !!(s.hasApartment && home(s).kids); }

// What you eat is a monthly standing choice, and the body keeps score.
// (Long-term illness from years of fast food is planned on top of this.)
export const DIET = {
  fast: { label: 'Fast food', blurb: 'Cheap, quick, and it shows eventually.', cost: 250 },
  cook: { label: 'Cooking at home', blurb: 'Groceries and a pan. Decent, takes effort.', cost: 420 },
  fine: { label: 'Chef & restaurants', blurb: 'Someone else worries about the vegetables.', cost: 2200 },
};
export const GYM_COST = 90;
// Mirrors INSURANCE in systems/life/health.js — kept here so monthlyCosts stays dependency-free.
const INSURANCE_PREMIUM = { none: 0, basic: 140, full: 380 };
export function setDiet(s, k) {
  if (!DIET[k] || s.diet === k) return s;
  s.diet = k;
  s.lastEvent = `You now eat like this: ${DIET[k].label.toLowerCase()} — €${DIET[k].cost.toLocaleString()}/month.`;
  return s;
}
export function toggleGym(s) {
  s.gym = !s.gym;
  s.lastEvent = s.gym ? `You joined a gym — €${GYM_COST}/month. Your looks will thank you slowly.` : 'You cancelled the gym membership.';
  return s;
}
export function monthlyCosts(s) {
  // Rent is the housing tier — no separate abstract "lifestyle" charge on top of it.
  const rent = s.hasApartment ? (HOUSING[s.housing || 'room']?.cost || 0) : 0;
  const food = s.hasApartment ? (DIET[s.diet || 'cook']?.cost || 0) : 0;
  const gym = s.hasApartment && s.gym ? GYM_COST : 0;
  const team = (s.retainers ? Object.values(s.retainers).filter(Boolean).length : 0) * 1500;
  const insurance = s.hasApartment ? (INSURANCE_PREMIUM[s.insurance || 'none'] || 0) : 0;
  return { rent, food, gym, insurance, team, total: rent + food + gym + insurance + team };
}
export function wealthTax(s) {
  const cash = s.cash || 0;
  if (cash < 3_000_000) return 0;
  const over = cash - 3_000_000;
  let tax;
  if (over <= 5_000_000) tax = over * 0.015;
  else if (over <= 17_000_000) tax = 75_000 + (over - 5_000_000) * 0.025;
  else tax = 375_000 + (over - 17_000_000) * 0.04;
  return Math.round(tax);
}
export function applyMonthly(s) {
  const c = monthlyCosts(s); if (c.total > 0) s.cash -= c.total;
  // Where you sleep is a monthly drip in both directions — a bad room takes from you.
  if (s.hasApartment) {
    const h = home(s);
    if (h.mental) s.mental = Math.max(0, Math.min(100, (s.mental || 0) + h.mental));
    if (h.health) s.health = Math.max(0, Math.min(100, (s.health || 0) + h.health));
  }
  // Diet and gym work in months, not clicks — slow drifts you only notice over years.
  if (s.hasApartment) {
    const diet = s.diet || 'cook';
    if (diet === 'fast') s.health = Math.max(0, (s.health || 100) - 0.4);
    if (diet === 'cook' && (s.health || 0) < 85) s.health = Math.min(85, (s.health || 0) + 0.15);
    if (diet === 'fine') { if ((s.health || 0) < 95) s.health = Math.min(95, (s.health || 0) + 0.4); s.mental = Math.min(100, (s.mental || 0) + 0.5); }
    if (s.gym) { if ((s.looks || 0) < 78) s.looks = Math.min(78, (s.looks || 0) + 0.5); if ((s.health || 0) < 92) s.health = Math.min(92, (s.health || 0) + 0.2); }
  }
  checkInsolvency(s);
}
// The whole point of the title: stop working and the world forgets you.
// Nothing here ran before — fame only ever went up, so every life ended a Legend.
export function relevanceDrift(s) {
  if (s.stage !== 'career') return;
  // Shooting counts as working, and a fresh credit buys you a few quiet months.
  if (s.production) { s._idleMonths = 0; } else { s._idleMonths = (s._idleMonths || 0) + 1; }
  // Old news fades whether you like it or not.
  if ((s.scandal || 0) > 0) s.scandal = Math.max(0, s.scandal - 0.4);
  if ((s._idleMonths || 0) < 4) return;
  const height = 0.35 + (s.fame || 0) / 95;      // the higher you are, the further there is to fall
  const noise = (s.scandal || 0) / 45;            // bad press speeds the slide
  s.fame = Math.max(0, Math.min(100, s.fame - (height + noise)));
  if ((s._idleMonths === 13 || s._idleMonths === 25) && (s.fame || 0) > 5) {
    addTimeline(s, s._idleMonths > 20
      ? 'Two years without work. People talk about you in the past tense now.'
      : 'A year with nothing released. The phone rings less than it used to.', true);
  }
}
export function markReleased(s) { s._idleMonths = 0; }
export function applyYearly(s) {
  const tax = wealthTax(s);
  if (tax > 0) { s.cash -= tax; addTimeline(s, `Wealth levy: the state taxed your idle fortune €${tax.toLocaleString()} this year. Money that sits still shrinks — put it to work.`, true); }
}
export function earn(s, amount, note) {
  s.cash = (s.cash || 0) + amount; s.incomeYear = (s.incomeYear || 0) + amount;
  if (note) addTimeline(s, `${note}: +€${Math.round(amount).toLocaleString()}.`);
}
function checkInsolvency(s) {
  if ((s.cash || 0) >= -2000) return;
  s.flags = s.flags || {}; s.flags.inDebt = (s.flags.inDebt || 0) + 1;
  s.mental = Math.max(0, (s.mental || 0) - 2);
  if (s.flags.inDebt === 1) addTimeline(s, 'Your account went red. Letters, calls, that tight feeling in your chest. Fix this before it fixes you.', true);
  if (s.flags.inDebt >= 3 && s.hasApartment) {
    s.hasApartment = false; s.livingWith = 'parents'; s.rent = 0; s.stage = 'moving_out'; s.flags.inDebt = 0;
    addTimeline(s, 'You lost the apartment. Back to your parents\' place, tail between your legs. The climb resets — but you know the way now.', true);
  }
}
