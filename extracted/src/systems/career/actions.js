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
  {
    id: 'practice', label: () => 'Practice your craft',
    desc: (s) => { const cap = skillCap(s); const key = s.dream === 'singer' ? 'singing' : 'acting'; if ((s[key] || 0) >= cap) return "You've hit your ceiling — real work will raise it"; return s.dream === 'singer' ? 'Improve singing' : 'Improve acting'; },
    when: (s) => s.stage !== 'child',
    run: (s) => {
      const key = s.dream === 'singer' ? 'singing' : 'acting'; const skill = s[key] || 0; const cap = skillCap(s);
      if (skill >= cap) { s.mental = clamp(s.mental - 1); return `You drill alone, but you've plateaued at ${skill}. Practice alone won't take you higher — you need real projects to grow.`; }
      let gain; if (skill < 40) gain = rint(3, 5); else if (skill < 65) gain = rint(2, 3); else if (skill < 80) gain = 1; else gain = Math.random() < 0.5 ? 1 : 0;
      if (s.discipline > 65) gain += 1; gain = Math.min(gain, cap - skill);
      s[key] = clamp(skill + gain); s.mental = clamp(s.mental - 2);
      if (gain === 0) return `You drill for hours but nothing clicks today. (Mental -2)`;
      return `You practiced. ${key === 'singing' ? 'Singing' : 'Acting'} +${gain}${s[key] >= cap ? " — you've hit your current ceiling" : ''}.`;
    },
  },
  { id: 'oddjob', label: () => 'Work an odd job', desc: () => 'Boring, but it pays the rent', when: (s) => s.stage === 'career',
    run: (s) => { const pay = rint(1500, 2800); earn(s, pay, 'Odd job'); s.mental = clamp(s.mental - 3); return `A dull month of shifts. Earned €${pay.toLocaleString()}, lost a little soul.`; } },
  { id: 'audition', label: () => 'Audition for a role', desc: () => 'Roll the dice on a small part', when: (s) => s.stage === 'career',
    run: (s) => {
      const skill = s.dream === 'singer' ? s.singing : s.acting; const odds = 28 + skill * 0.5 + s.charisma * 0.2 + s.looks * 0.1;
      if (chance(odds)) {
        const pay = rint(2000, 6000); const rating = clamp(40 + skill * 0.4 + rint(-10, 20));
        const A = ['Late','Quiet','Broken','Golden','Last','Neon','Paper','Winter']; const B = s.dream === 'singer' ? ['Nights','Echoes','Hearts','Feeling','Light','Noise'] : ['Summer','Room','Hour','Stranger','Corner','Promise'];
        const title = `${A[rint(0, A.length - 1)]} ${B[rint(0, B.length - 1)]}`;
        (s.filmography = s.filmography || []).unshift({ title, role: 'Supporting', type: s.dream === 'singer' ? 'Music Video' : 'Indie Film', salary: pay, rating, status: rating >= 70 ? 'Well-received' : 'Released', year: s.year });
        earn(s, pay, 'Booked a role'); s.fame = clamp(s.fame + rint(1, 3)); s.confidence = clamp(s.confidence + 2);
        return `You booked it! "${title}" — €${pay.toLocaleString()}, and your first real credit energy.`;
      }
      s.mental = clamp(s.mental - 2); s.confidence = clamp(s.confidence - 1);
      return "You didn’t get the part. \"We went another direction.\" You’ve heard it before.";
    } },
  { id: 'sidejob', label: () => 'Take a side job', desc: () => 'Bag groceries, wait tables — small money', when: (s) => s.stage === 'teen',
    run: (s) => { const pay = rint(200, 600); s.cash = (s.cash||0)+pay; s.mental = Math.max(0,(s.mental||50)-2); const msg = `You worked a shift after school. Earned €${pay.toLocaleString()}.`; s.lastEvent = msg; return msg; } },
  { id: 'extrawork', label: () => 'Try to be a TV extra', desc: () => 'Background roles — a taste of a set', when: (s) => s.stage === 'teen',
    run: (s) => {
      const key = s.dream === 'singer' ? 'singing' : 'acting';
      if (chance(55)) { const pay = rint(300, 800); s.cash = (s.cash||0)+pay; s[key] = Math.min(100, (s[key]||0)+1); s.fame = Math.min(100, (s.fame||0)+1); const msg = `You got booked as a background extra on a TV shoot! €${pay.toLocaleString()}, and you watched real actors work. (${key} +1, fame +1)`; s.lastEvent = msg; return msg; }
      s.mental = Math.max(0,(s.mental||50)-1); const msg = 'You showed up to the casting call for extras, waited three hours, and got sent home. Welcome to the industry.'; s.lastEvent = msg; return msg;
    } },
  { id: 'askmoney', label: () => 'Ask parents for money', desc: () => "They might help — if you're on good terms", when: (s) => (s.stage === 'teen' || s.stage === 'career') && (s.family||[]).some(p => (p.relation==='Mother'||p.relation==='Father') && p.alive),
    run: (s) => { askFamilyForMoney(s); return s.lastEvent; } },
  { id: 'meet', label: () => 'Go out & network', desc: () => 'Meet people — some open doors', when: (s) => s.stage === 'career',
    run: (s) => { meetPerson(s); return s.lastEvent; } },
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
