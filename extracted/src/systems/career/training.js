import { rint } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { skillCap } from './actions.js';
const clamp = (v) => Math.max(0, Math.min(100, v));

// Practice used to be free and instant. Real training costs money — that's the point:
// early on you must choose between rent and getting better.
export const SCHOOLS = [
  { id: 'self', label: 'Drill alone', blurb: 'A mirror and a lot of stubbornness.', cost: 0, gain: [1, 2], mental: -3 },
  { id: 'group', label: 'Evening class', blurb: 'A church hall, twelve hopefuls, one tired teacher.', cost: 300, gain: [2, 4], mental: -1 },
  { id: 'coach', label: 'Private coach', blurb: 'Someone who tells you the truth for money.', cost: 1200, gain: [4, 6], mental: 0 },
  { id: 'academy', label: 'Conservatory intensive', blurb: 'The kind of place casting directors have heard of.', cost: 4000, gain: [6, 9], mental: 1, respect: 1 },
];
export function trainingKey(s) { return s.dream === 'singer' ? 'singing' : 'acting'; }
export function train(s, id) {
  const sc = SCHOOLS.find((x) => x.id === id); if (!sc) return s;
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  if ((s.cash || 0) < sc.cost) { s.lastEvent = `${sc.label} costs €${sc.cost.toLocaleString()}. You can't cover it.`; return s; }
  s.ap = (s.ap || 0) - 1;
  s.cash = (s.cash || 0) - sc.cost;

  const key = trainingKey(s); const skill = s[key] || 0; const cap = skillCap(s);
  if (skill >= cap) {
    s.mental = clamp((s.mental || 50) - 1);
    s.lastEvent = `You've plateaued at ${skill}. No teacher can take you further — only real work raises the ceiling now.`;
    return s;
  }
  let gain = rint(sc.gain[0], sc.gain[1]);
  if ((s.discipline || 0) > 65) gain += 1;
  // Diminishing returns as you approach mastery — the last ten points are the hardest.
  if (skill >= 70) gain = Math.ceil(gain * 0.5);
  gain = Math.max(1, Math.min(gain, cap - skill));
  s[key] = clamp(skill + gain);
  if (sc.mental) s.mental = clamp((s.mental || 50) + sc.mental);
  if (sc.respect) s.respect = clamp((s.respect || 0) + sc.respect);
  const hitCap = s[key] >= cap;
  s.lastEvent = `${sc.label}${sc.cost ? ` — €${sc.cost.toLocaleString()}` : ''}. ${key === 'singing' ? 'Singing' : 'Acting'} +${gain}${hitCap ? " — and that's your ceiling until you work more" : ''}.`;
  if (sc.cost >= 4000) addTimeline(s, `Studied at a conservatory intensive. ${key === 'singing' ? 'Singing' : 'Acting'} +${gain}.`);
  return s;
}
