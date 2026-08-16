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
// Every cell is a BAND, not a price. Two unknowns on the same soap are not paid the
// same, and neither are two icons — what you get inside your band is the negotiation
// you have not had yet. `null` means the door is shut: an unknown is not offered a
// studio feature at any figure, and the listing does not appear at all.
//
// The ladder is deliberately steeper than the real industry at the top. That is the
// point of the game: an icon is paid obscenely for anything, including daytime soap.
export const QUOTE = {
  tv_daytime:   { unknown: [900, 4000],    rising: [4000, 12000],     known: [12000, 100000],     star: [100000, 1500000],    alist: [1500000, 8000000],    icon: [10000000, 25000000] },
  tv_network:   { unknown: [2000, 8800],   rising: [8800, 26400],     known: [26400, 220000],     star: [220000, 3300000],    alist: [3300000, 17600000],   icon: [22000000, 55000000] },
  tv_prestige:  { unknown: null,           rising: [30000, 60000],    known: [60000, 350000],     star: [350000, 5250000],    alist: [5250000, 28000000],   icon: [35000000, 87500000] },
  film_indie:   { unknown: [25000, 60000], rising: [120000, 300000],  known: [300000, 800000],    star: [800000, 2500000],    alist: [2500000, 6000000],    icon: [6000000, 12000000] },
  film_studio:  { unknown: null,           rising: [500000, 1200000], known: [1500000, 4000000],  star: [5000000, 10000000],  alist: [12000000, 20000000],  icon: [20000000, 35000000] },
  film_tentpole:{ unknown: null,           rising: null,              known: [4000000, 8000000],  star: [12000000, 20000000], alist: [25000000, 40000000],  icon: [40000000, 80000000] },
  ad:           { unknown: [4000, 12000],  rising: [25000, 70000],    known: [100000, 400000],    star: [400000, 1500000],    alist: [1500000, 5000000],    icon: [5000000, 15000000] },
  gig:          { unknown: [250, 900],     rising: [900, 3000],       known: [3000, 12000],       star: [12000, 60000],       alist: [60000, 200000],       icon: [200000, 600000] },
};
export const MEDIA = Object.keys(QUOTE);

export function quoteBand(s, medium) {
  const row = QUOTE[medium] || QUOTE.gig;
  return row[fameTier(s.fame).id] || null;
}
// What YOU are worth in this medium right now — rolled inside the band, so two jobs
// at the same standing are not the same money. Television returns a per-episode fee;
// film returns the fee for the whole picture. Zero means they would not have you.
export function quoteFor(s, medium) {
  const band = quoteBand(s, medium);
  if (!band) return 0;
  return Math.round(band[0] + Math.random() * (band[1] - band[0]));
}
// True when the medium will not have you at any price yet.
export function shutOutOf(s, medium) { return quoteBand(s, medium) === null; }
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
