import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { enshrine } from '../meta/legacy.js';
const clamp = (v) => Math.max(0, Math.min(100, v));

// The body sends the bill eventually. Nothing aged the player before — a life only
// ended when you pressed the button, which made the Hall of Fame feel weightless.
export function agingTick(s) {
  const age = s.ageY || 0;
  if (age < 35) return;
  let decline = age >= 75 ? rint(2, 5) : age >= 60 ? rint(1, 3) : age >= 48 ? (chance(60) ? 1 : 0) : (chance(30) ? 1 : 0);
  if ((s.mental || 50) < 30) decline += 1;                       // burnout wears you down
  if (['flat', 'house', 'penthouse'].includes(s.housing)) { if (chance(45)) decline = Math.max(0, decline - 1); }
  if (decline > 0) s.health = clamp((s.health || 100) - decline);
  if (age === 40 || age === 55 || age === 70) {
    addTimeline(s, age === 40 ? 'Forty. The mirror is starting to make comments.'
      : age === 55 ? 'Fifty-five. Recovery takes longer than it used to.'
      : 'Seventy. Every year from here is a gift you have to look after.');
  }
}

const CAUSES_OLD = ['peacefully, at home', 'in their sleep', 'after a short illness, surrounded by family'];
const CAUSES_ILL = ['after a long illness', 'from a heart that finally gave out', 'after their health failed for good'];

export function mortalityCheck(s) {
  if (!s.alive) return false;
  const age = s.ageY || 0, h = s.health || 100;
  const byAge = age >= 95 ? 45 : age >= 88 ? 25 : age >= 80 ? 13 : age >= 70 ? 6 : age >= 60 ? 2 : age >= 45 ? 0.6 : 0;
  const byHealth = h < 15 ? 15 : h < 30 ? 5 : h < 45 ? 1.5 : 0;
  const odds = byAge + byHealth;
  if (odds <= 0 || !chance(odds)) return false;
  die(s, h < 30 ? pick(CAUSES_ILL) : pick(CAUSES_OLD));
  return true;
}

export function die(s, cause) {
  s.alive = false;
  s.deathAge = s.ageY;
  s.deathYear = s.year;
  s.deathCause = cause || 'quietly';
  s.production = null;
  s.pendingArc = null;
  addTimeline(s, `${s.name} died at ${s.ageY}, ${s.deathCause}.`, true);
  try { enshrine(s); } catch (e) {}
  return s;
}
