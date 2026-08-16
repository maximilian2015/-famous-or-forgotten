import { HOUSING, HOUSING_ORDER } from '../../engine/economy.js';
export const FAME_TIERS = [
  { id: 'unknown', label: 'Unknown', min: 0, housingMax: 'studio' },
  { id: 'rising', label: 'Rising Star', min: 15, housingMax: 'studio' },
  { id: 'known', label: 'Known Face', min: 35, housingMax: 'flat' },
  { id: 'star', label: 'Star', min: 55, housingMax: 'house' },
  { id: 'alist', label: 'A-lister', min: 75, housingMax: 'penthouse' },
  { id: 'icon', label: 'Icon', min: 90, housingMax: 'penthouse' },
];
export function fameTier(fame) {
  let cur = FAME_TIERS[0];
  for (const t of FAME_TIERS) if ((fame || 0) >= t.min) cur = t;
  return cur;
}

// One multiplier could not do this job. A rising star is worth €25,000 an episode on a
// network drama and €500,000 for a studio picture — those are different ratios, because
// the rate depends on the MEDIUM as much as on the name. Daytime soap and prestige
// streaming are different businesses that happen to both be television.
//
// A zero means the door is shut: an unknown is not offered a studio feature at any price.
export const QUOTE = {
  tv_daytime:   { unknown: 900,   rising: 4000,   known: 12000,   star: 30000,    alist: 60000,    icon: 100000 },
  tv_network:   { unknown: 2500,  rising: 25000,  known: 70000,   star: 150000,   alist: 300000,   icon: 500000 },
  tv_prestige:  { unknown: 0,     rising: 60000,  known: 180000,  star: 400000,   alist: 800000,   icon: 1500000 },
  film_indie:   { unknown: 25000, rising: 120000, known: 300000,  star: 700000,   alist: 1500000,  icon: 3000000 },
  film_studio:  { unknown: 0,     rising: 500000, known: 1500000, star: 5000000,  alist: 12000000, icon: 20000000 },
  film_tentpole:{ unknown: 0,     rising: 0,      known: 4000000, star: 12000000, alist: 25000000, icon: 40000000 },
  ad:           { unknown: 6000,  rising: 40000,  known: 150000,  star: 600000,   alist: 2000000,  icon: 5000000 },
  gig:          { unknown: 350,   rising: 1200,   known: 4000,    star: 12000,    alist: 30000,    icon: 60000 },
};
export const MEDIA = Object.keys(QUOTE);

// What YOU are worth in this medium right now. Television returns a per-episode fee;
// film returns the fee for the whole picture.
export function quoteFor(s, medium) {
  const row = QUOTE[medium] || QUOTE.gig;
  return row[fameTier(s.fame).id] || 0;
}
// True when the medium will not have you at any price yet.
export function shutOutOf(s, medium) { return quoteFor(s, medium) === 0; }
export function setHousing(s, key) {
  if (!HOUSING[key]) return s;
  if (!s.hasApartment) { s.lastEvent = 'You still live with your parents.'; return s; }
  const tier = fameTier(s.fame);
  const allowedIdx = HOUSING_ORDER.indexOf(tier.housingMax);
  const wantIdx = HOUSING_ORDER.indexOf(key);
  if (wantIdx > allowedIdx) { s.lastEvent = `No landlord is handing that to a "${tier.label}". Get bigger first.`; return s; }
  if (s.housing === key) return s;
  const h = HOUSING[key];
  const deposit = Math.round(h.cost * 1.5);
  if ((s.cash || 0) < deposit) { s.lastEvent = `Moving in needs €${deposit.toLocaleString()} up front. You don't have it.`; return s; }
  s.cash -= deposit;
  s.housing = key;
  s.lastEvent = `You moved into a ${h.label.toLowerCase()} — €${h.cost.toLocaleString()}/month, €${deposit.toLocaleString()} deposit.`;
  return s;
}
