import { addTimeline } from '../../engine/timeline.js';
import { rint, chance } from '../../engine/rng.js';
import { markRested } from '../life/strain.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
export function skillCap(s) {
  const credits = (s.filmography || []).length + (s.discography || []).length;
  const hits = [...(s.filmography || []), ...(s.discography || [])].filter((x) => (x.rating || 0) >= 70).length;
  return Math.min(100, 50 + credits * 6 + hits * 4);
}
// Everything that exists elsewhere has been moved out and must NOT come back here:
// askmoney is on the parent's card in People; networking is Career → Events; practice is
// paid training in Career → Training; odd jobs are shifts in the Work app; extra work is
// the OpenCall app. What is left are the beats that live nowhere else.
export const ACTIONS = [
  { id: 'schoolplay', label: () => 'Audition for the school play', desc: () => 'A stage, a hundred parents, and nerves', when: (s) => s.stage === 'teen',
    run: (s) => {
      const key = s.dream === 'singer' ? 'singing' : 'acting';
      const odds = 40 + (s.confidence || 0) * 0.3 + (s.charisma || 0) * 0.15;
      if (chance(odds)) {
        const g = rint(2, 4);
        s[key] = Math.min(100, (s[key] || 0) + g);
        s.confidence = clamp(s.confidence + rint(2, 5));
        return `You got the part. Standing in that light, something clicked. (${key} +${g}, confidence +)`;
      }
      s.confidence = clamp(s.confidence - rint(1, 3)); s.mental = clamp(s.mental - 2);
      return 'You did not get the part. Someone louder did. You told yourself you did not care.';
    } },
  { id: 'sneakout', label: () => 'Sneak out to a gig', desc: () => 'Out the window, back before six', when: (s) => s.stage === 'teen',
    run: (s) => {
      s.charisma = clamp(s.charisma + rint(1, 4));
      if (chance(35)) {
        const parent = (s.family || []).find((p) => (p.relation === 'Mother' || p.relation === 'Father') && p.alive);
        if (parent) parent.relationship = clamp(parent.relationship - rint(6, 14));
        s.mental = clamp(s.mental - 3);
        return 'Caught on the stairs at 4am. It was worth it, and it cost you at home.';
      }
      s.confidence = clamp(s.confidence + rint(2, 4)); s.mental = clamp(s.mental + rint(2, 5));
      return 'Nobody heard a thing. The band was loud and you were somewhere else entirely.';
    } },
  { id: 'rest', label: () => 'Rest & recover', desc: (s) => (s.strain || 0) >= 60 ? 'You need this more than you think' : 'Recover mental and health', when: () => true,
    run: (s) => { s.mental = clamp(s.mental + rint(6, 12)); s.health = clamp(s.health + rint(3, 8));
      // Resting properly is the only thing that pulls the strain down faster than time does.
      markRested(s);
      return 'You took time for yourself. Mind and body thank you.'; } },
  { id: 'school', label: () => 'Focus on school', desc: () => 'Build discipline for the road ahead', when: (s) => s.stage === 'teen' || s.stage === 'child',
    run: (s) => { const g = rint(1, 3); s.discipline = clamp(s.discipline + g); return `You put in the work at school. Discipline +${g}.`; } },
];
export function runAction(s, id) {
  const a = ACTIONS.find((x) => x.id === id);
  if (!a || (a.when && !a.when(s))) return s;
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit — time gives you room to act again.'; return s; }
  s.ap = (s.ap || 0) - 1;
  const msg = a.run(s); s.lastEvent = msg; addTimeline(s, msg);
  return s;
}
export function availableActions(s) { return ACTIONS.filter((a) => !a.when || a.when(s)); }
