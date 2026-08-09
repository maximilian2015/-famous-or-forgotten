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

// The same part pays scale to a nobody and pays a fortune to a name — that gap IS the
// career. Every fee in the game is a base rate for an unknown, multiplied by this.
const FEE_MULT = { unknown: 1, rising: 1.8, known: 4, star: 12, alist: 35, icon: 80 };
export function feeMultiplier(s) { return FEE_MULT[fameTier(s.fame).id] || 1; }
export function feeFor(s, base) { return Math.round((base || 0) * feeMultiplier(s)); }
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
