import { COST, canAfford, spend, tooTired } from '../../engine/energy.js';
import { setRespect } from '../meta/status.js';
import { rint } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { lessonCap } from './actions.js';
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
// Discipline's one job in the game: above this line, every session — any of the four, the free
// one too — teaches a point more. The training screen says so; nothing else shows discipline
// (docs/handoffs/2026-10-11-confidence-discipline-audit.md).
export const DISCIPLINE_LINE = 65;
export function disciplineBonus(s) { return (s.discipline || 0) > DISCIPLINE_LINE ? 1 : 0; }
// What a session teaches once the roll of `g` is in: discipline, then no further than the
// lesson cap. The skill itself can be fractional (a set teaches in tenths), so the gap to the
// cap is rounded up — "+2.7739696411595958" was on somebody's timeline. train() and the
// screen's ranges (gainRange) both read this. There used to be a halving past 70 here; lessons
// stop at 40, so it could never run, and it went (11 Oct skill audit).
export function sessionGain(s, g) {
  const skill = s[trainingKey(s)] || 0;
  g += disciplineBonus(s);
  return Math.max(1, Math.min(g, Math.ceil(lessonCap() - skill)));
}
export function gainRange(s, sc) { return [sessionGain(s, sc.gain[0]), sessionGain(s, sc.gain[1])]; }
export function train(s, id) {
  const sc = SCHOOLS.find((x) => x.id === id); if (!sc) return s;
  if (!canAfford(s, COST.train)) { s.lastEvent = tooTired(s, COST.train); return s; }
  if ((s.cash || 0) < sc.cost) { s.lastEvent = `${sc.label} costs €${sc.cost.toLocaleString()}. You can't cover it.`; return s; }
  const key = trainingKey(s); const skill = s[key] || 0; const cap = lessonCap();
  // Said before anything is charged. A conservatory used to take €4,000 and the month's
  // energy to tell you it could not teach you anything.
  if (skill >= cap) {
    s.mental = clamp((s.mental || 50) - 1);
    s.lastEvent = `Nobody can teach you past ${cap}. It is sets from here — and what you were born with.`;
    return s;
  }
  spend(s, COST.train);
  s.cash = (s.cash || 0) - sc.cost;
  const gain = sessionGain(s, rint(sc.gain[0], sc.gain[1]));
  s[key] = clamp(Math.min(cap, skill + gain));
  if (sc.mental) s.mental = clamp((s.mental || 50) + sc.mental);
  if (sc.respect) setRespect(s, (s.respect || 0) + sc.respect);
  const hitCap = s[key] >= cap;
  s.lastEvent = `${sc.label}${sc.cost ? ` — €${sc.cost.toLocaleString()}` : ''}. ${key === 'singing' ? 'Singing' : 'Acting'} +${gain}${hitCap ? " — and that's your ceiling until you work more" : ''}.`;
  if (sc.cost >= 4000) addTimeline(s, `Studied at a conservatory intensive. ${key === 'singing' ? 'Singing' : 'Acting'} +${gain}.`);
  return s;
}
