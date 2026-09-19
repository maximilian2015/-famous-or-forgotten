import { COST, canAfford, spend, tooTired } from '../../engine/energy.js';
import { uid } from '../../engine/id.js';
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { personName, namesInUse } from '../world/names.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
// How old a contact is. Newer ones carry the year they were born; older saves carry nothing,
// and a contact with no age is simply somebody whose age you never asked.
export function contactAge(s, p) {
  if (!p) return null;
  if (p.born) return (s.year || 0) - p.born;
  return p.age != null ? p.age : null;
}
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
  // A name from the world's lists, with the gender it came from kept on the person, so the
  // face drawn for them is the face the name says. Maxi: "Piet is a man and it drew a woman."
  const gender = chance(50) ? 'female' : 'male';
  return { id: uid(s, 'p'), name: personName(gender, namesInUse(s)), gender, born: (s.year || 2040) - Math.max(22, (s.ageY || 30) + rint(-6, 20)),
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
  // Charisma is exactly this: the ability to hold your own in a room you weren't born into.
  // High charisma shrinks the status gap between you and someone far above you.
  const rawGap = Math.max(0, (p.industryWeight || 30) - (s.fame || 0));
  const gap = Math.max(0, rawGap - Math.max(0, (s.charisma || 0) - 50) * 0.6);
  const status = 1 - Math.min(0.62, gap / 150);
  return Math.max(1, Math.round(base * fade * status));
}
export function deepenRelationship(s, id) {
  const p = (s.people || []).find((x) => x.id === id); if (!p) return s;
  if (!canAfford(s, COST.meet)) { s.lastEvent = tooTired(s, COST.meet); return s; }
  spend(s, COST.meet);
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
