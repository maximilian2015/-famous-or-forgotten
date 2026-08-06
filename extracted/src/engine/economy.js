import { addTimeline } from './timeline.js';
// Concrete places to live rather than an abstract "lifestyle" slider — a room and a penthouse
// are things a player can picture, and the rent IS the lifestyle cost.
// Priced off real Amsterdam rents so the early squeeze feels honest.
export const HOUSING = {
  room:      { label: 'Rented room',      blurb: 'A room in a shared flat. Thin walls.',            cost: 750 },
  studio:    { label: 'Studio flat',      blurb: 'Small, yours, and the door locks.',               cost: 1450 },
  flat:      { label: 'Two-bed apartment', blurb: 'Space to breathe. A view of something.',         cost: 2900 },
  house:     { label: 'Canal house',       blurb: 'Old brick, tall windows, serious money.',        cost: 7500 },
  penthouse: { label: 'Penthouse',        blurb: 'The city underneath you, and everyone knows it.', cost: 15000 },
};
export const HOUSING_ORDER = ['room', 'studio', 'flat', 'house', 'penthouse'];
const HOUSING_PERK = { room: {}, studio: {}, flat: { mental: 1 }, house: { mental: 2, confidence: 1 }, penthouse: { mental: 2, confidence: 2 } };

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
  const perk = HOUSING_PERK[s.housing || 'room'] || {};
  if (perk.mental) s.mental = Math.max(0, Math.min(100, (s.mental || 0) + perk.mental));
  if (perk.confidence) s.confidence = Math.max(0, Math.min(100, (s.confidence || 0) + perk.confidence));
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
