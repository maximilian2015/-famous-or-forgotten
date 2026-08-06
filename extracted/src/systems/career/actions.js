import { addTimeline } from '../../engine/timeline.js';
import { earn } from '../../engine/economy.js';
import { rint, chance } from '../../engine/rng.js';
import { meetPerson } from '../life/relationships.js';
import { askFamilyForMoney } from '../life/family.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
export function skillCap(s) {
  const credits = (s.filmography || []).length + (s.discography || []).length;
  const hits = [...(s.filmography || []), ...(s.discography || [])].filter((x) => (x.rating || 0) >= 70).length;
  return Math.min(100, 50 + credits * 6 + hits * 4);
}
export const ACTIONS = [
  { id: 'sidejob', label: () => 'Take a side job', desc: () => 'Bag groceries, wait tables — small money', when: (s) => s.stage === 'teen',
    run: (s) => { const pay = rint(200, 600); s.cash = (s.cash||0)+pay; s.mental = Math.max(0,(s.mental||50)-2); const msg = `You worked a shift after school. Earned €${pay.toLocaleString()}.`; s.lastEvent = msg; return msg; } },
  { id: 'extrawork', label: () => 'Try to be a TV extra', desc: () => 'Background roles — a taste of a set', when: (s) => s.stage === 'teen',
    run: (s) => {
      const key = s.dream === 'singer' ? 'singing' : 'acting';
      if (chance(55)) { const pay = rint(300, 800); s.cash = (s.cash||0)+pay; s[key] = Math.min(100, (s[key]||0)+1); s.fame = Math.min(100, (s.fame||0)+1); const msg = `You got booked as a background extra on a TV shoot! €${pay.toLocaleString()}, and you watched real actors work. (${key} +1, fame +1)`; s.lastEvent = msg; return msg; }
      s.mental = Math.max(0,(s.mental||50)-1); const msg = 'You showed up to the casting call for extras, waited three hours, and got sent home. Welcome to the industry.'; s.lastEvent = msg; return msg;
    } },
  // askmoney lives on the parent's card in People; networking lives in Career → Events;
  // practice became paid training in Career → Training; odd jobs became shifts in the Work app.
  { id: 'rest', label: () => 'Rest & recover', desc: () => 'Recover mental and health', when: () => true,
    run: (s) => { s.mental = clamp(s.mental + rint(6, 12)); s.health = clamp(s.health + rint(3, 8)); return 'You took time for yourself. Mind and body thank you.'; } },
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
