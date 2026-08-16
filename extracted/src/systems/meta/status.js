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
// TELEVISION IS PER EPISODE AND FILM IS PER PICTURE, so these bands are NOT comparable
// side by side. They were calibrated backwards from what a whole project should pay,
// against the typical episode count of each format — otherwise a soap season at
// thirty-three episodes out-earned a blockbuster ten to one and film became pointless.
// The more episodes a format runs, the lower its rate per episode has to be.
//
// The ladder is still far steeper at the top than the real industry. That is the point:
// an icon is paid obscenely for anything. But film stays the biggest single prize.
export const QUOTE = {
  tv_daytime:   { unknown: [900, 2500],    rising: [2500, 9000],      known: [9000, 45000],       star: [45000, 200000],      alist: [200000, 550000],      icon: [550000, 900000] },
  tv_network:   { unknown: [1500, 4500],   rising: [4500, 25000],     known: [25000, 130000],     star: [130000, 600000],     alist: [600000, 1800000],     icon: [1800000, 3500000] },
  tv_prestige:  { unknown: null,           rising: [25000, 60000],    known: [60000, 320000],     star: [320000, 1500000],    alist: [1500000, 4000000],    icon: [4000000, 8000000] },
  film_indie:   { unknown: [25000, 60000], rising: [120000, 300000],  known: [300000, 800000],    star: [800000, 2500000],    alist: [2500000, 6000000],    icon: [6000000, 12000000] },
  film_studio:  { unknown: null,           rising: [500000, 1200000], known: [1500000, 4000000],  star: [5000000, 10000000],  alist: [12000000, 20000000],  icon: [20000000, 35000000] },
  film_tentpole:{ unknown: null,           rising: null,              known: [4000000, 8000000],  star: [12000000, 20000000], alist: [25000000, 40000000],  icon: [40000000, 80000000] },
  ad:           { unknown: [4000, 12000],  rising: [25000, 70000],    known: [100000, 400000],    star: [400000, 1500000],    alist: [1500000, 5000000],    icon: [5000000, 15000000] },
  gig:          { unknown: [250, 900],     rising: [900, 3000],       known: [3000, 12000],       star: [12000, 60000],       alist: [60000, 200000],       icon: [200000, 600000] },
};

// A band is quoted against a format's TYPICAL season length. A longer order pays more
// in total but less per episode — the studio is buying in bulk. The exponent keeps it
// from being a pure wash: 33% more episodes is about 11% more money, not 33%.
export function episodeRate(baseRate, typicalEpisodes, actualEpisodes) {
  if (!actualEpisodes || !typicalEpisodes) return baseRate;
  return Math.round(baseRate * Math.pow(typicalEpisodes / actualEpisodes, 0.65));
}
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
