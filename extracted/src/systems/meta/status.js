import { LIFESTYLE, LIFESTYLE_ORDER } from '../../engine/economy.js';
export const FAME_TIERS = [
  { id: 'unknown', label: 'Unknown', min: 0, lifestyleMax: 'broke' },
  { id: 'rising', label: 'Rising Star', min: 15, lifestyleMax: 'modest' },
  { id: 'known', label: 'Known Face', min: 35, lifestyleMax: 'modest' },
  { id: 'star', label: 'Star', min: 55, lifestyleMax: 'comfort' },
  { id: 'alist', label: 'A-lister', min: 75, lifestyleMax: 'lavish' },
  { id: 'icon', label: 'Icon', min: 90, lifestyleMax: 'lavish' },
];
export function fameTier(fame) {
  let cur = FAME_TIERS[0];
  for (const t of FAME_TIERS) if ((fame || 0) >= t.min) cur = t;
  return cur;
}
export function setLifestyle(s, key) {
  if (!LIFESTYLE[key]) return s;
  const tier = fameTier(s.fame);
  const allowedIdx = LIFESTYLE_ORDER.indexOf(tier.lifestyleMax);
  const wantIdx = LIFESTYLE_ORDER.indexOf(key);
  if (wantIdx > allowedIdx) { s.lastEvent = `Not there yet. At "${tier.label}" people would clock a lifestyle like that as fake.`; return s; }
  if (s.lifestyle === key) return s;
  s.lifestyle = key;
  s.lastEvent = `You start living ${LIFESTYLE[key].label.toLowerCase()} — €${LIFESTYLE[key].cost.toLocaleString()}/month.`;
  return s;
}
