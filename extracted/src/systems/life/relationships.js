import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
const FIRST = ['Rita','Dorian','Mila','Ksen','Bruno','Ava','Theo','Nadia','Vic','Sol','Emre','Lena'];
const LAST = ['Vale','Kade','Roy','Mercer','Onyx','Frost','Dune','Salt','Wren','Cole'];
const ROLES = [
  { role: 'Casting Director', weight: [55, 75], unlocks: 'castingBoost' },
  { role: 'Film Director', weight: [70, 95], unlocks: 'aaa' },
  { role: 'Studio Producer', weight: [75, 95], unlocks: 'aaa' },
  { role: 'A-list Star', weight: [80, 98], unlocks: 'aaa' },
  { role: 'Music Producer', weight: [65, 90], unlocks: 'aaa' },
  { role: 'Journalist', weight: [40, 60], unlocks: 'press' },
  { role: 'Fellow Actor', weight: [20, 45], unlocks: null },
  { role: 'Manager', weight: [50, 70], unlocks: 'castingBoost' },
];
export function makePerson(s, forceRole) {
  const spec = forceRole ? ROLES.find((r) => r.role === forceRole) : pick(ROLES);
  return { id: 'p' + Date.now() + Math.floor(Math.random() * 1000), name: `${pick(FIRST)} ${pick(LAST)}`,
    role: spec.role, industryWeight: rint(spec.weight[0], spec.weight[1]), relationship: rint(20, 40), unlocks: spec.unlocks, met: `${s.year}` };
}
export function meetPerson(s) {
  const fameBonus = (s.fame || 0) >= 55;
  const p = fameBonus && chance(45) ? makePerson(s, pick(['Film Director','Studio Producer','A-list Star','Music Producer'])) : makePerson(s);
  (s.people = s.people || []).push(p);
  s.lastEvent = `You met ${p.name} — ${p.role}. Could be nothing. Could be everything.`;
  addTimeline(s, `Met ${p.name} (${p.role}).`);
  return s;
}
// Getting genuinely close to someone powerful is slow work, and slower the further above
// you they are. Flat gains made this a button you could just tap three times.
export function bondGain(s, p) {
  const base = rint(5, 11) + ((s.charisma || 0) > 60 ? 3 : 0);
  const fade = 1 - Math.min(0.75, (p.relationship || 0) / 130);
  const gap = Math.max(0, (p.industryWeight || 30) - (s.fame || 0));
  const status = 1 - Math.min(0.62, gap / 150);
  return Math.max(1, Math.round(base * fade * status));
}
export function deepenRelationship(s, id) {
  const p = (s.people || []).find((x) => x.id === id); if (!p) return s;
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  s.ap = (s.ap || 0) - 1;
  const gain = bondGain(s, p);
  const wasBelow = (p.relationship || 0) < 60;
  p.relationship = clamp(p.relationship + gain); s.mental = clamp(s.mental - 1);
  const nowOpens = p.unlocks === 'aaa' && p.industryWeight >= 80 && p.relationship >= 60 && wasBelow;
  const outOfLeague = (p.industryWeight || 30) - (s.fame || 0) > 45;
  s.lastEvent = nowOpens
    ? `You and ${p.name} are close now. "I've got a project you'd be perfect for," they say. A door just opened.`
    : `You spent time with ${p.name}. Relationship +${gain}.${outOfLeague && gain <= 3 ? ' They are still a long way above you — this takes time.' : ''}`;
  addTimeline(s, `Grew closer to ${p.name}${nowOpens ? ' — they can open real doors now' : ''}.`);
  return s;
}
