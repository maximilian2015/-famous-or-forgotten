// node tools/story-proto/flow.mjs [out.md] — three films through the real systems: the offer is
// dressed (career/script.js), the paper signed (contract.js), the actor reads the script
// (plot/sheet.js), three scene days fall at the start, the middle and the turn (scenes.js, with
// the "Out of order" day built from the story, scenework.js), each played at a set quality, and
// what the film keeps. Markdown.
import fs from 'node:fs';
import { createInitialState } from '../../src/state/initialState.js';
import { dressOffers } from '../../src/systems/career/script.js';
import { draftContract, signContract } from '../../src/systems/career/contract.js';
import { startProduction } from '../../src/systems/career/production.js';
import { maybeScene, resolveScene, SCENES } from '../../src/systems/career/scenes.js';
import { chronologyFor } from '../../src/systems/career/scenework.js';
import { sheetOf } from '../../src/systems/career/plot/sheet.js';

let seed = 11;
Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const career = (gender) => ({ ...createInitialState({ created: true }), name: 'Alex Moon', gender, ageY: 35, stage: 'career', hasApartment: true, livingWith: 'alone',
  fame: 70, peakFame: 70, respect: 50, acting: 75, cash: 5e6, year: 2060, month: 0, productions: [], inbox: [], people: [], filmography: [], ap: 100, apMax: 100, apMaxEff: 100, talent: 80, genreXP: {} });
const FILMS = [
  { gender: 'male', o: { projectTitle: 'Protocol 79', genre: 'Horror', tier: 'lead', role: 'Lead' }, days: [['mark', 90], ['order', 100], ['night', 60]] },
  { gender: 'female', o: { projectTitle: 'Midnight Talker', genre: 'Comedy', tier: 'supporting', role: 'Supporting' }, days: [['improv', 75], ['order', 50], ['read', 95]] },
  { gender: 'female', o: { projectTitle: 'Small Wedding', genre: 'Romance', tier: 'lead', role: 'Lead' }, days: [['reading', 80], ['tears', 95], ['order', 100]] },
];
let md = '# Three films, offer to result (story-v1, stage 2)\n\nRun through the real game systems by `tools/story-proto/flow.mjs`.\n';
for (const f of FILMS) {
  const s = career(f.gender);
  const o = { id: 'o-' + f.o.projectTitle, type: 'Feature Film', scale: 'feature', months: 6, salary: 400000, prestigeScore: 60, stability: 95, deadline: 3, ...f.o };
  s.offers = [o];
  dressOffers(s);
  md += `\n## ${o.projectTitle} — ${o.genre}, ${o.tier}, played by a ${f.gender === 'male' ? 'man' : 'woman'}\n\n`;
  md += `**1. The offer.** You: ${o.character.name} — ${o.character.what}\n\n> ${o.premise}\n\n`;
  draftContract(s, o); signContract(s, o.id);
  let p = (s.productions || [])[0];
  if (!p) { startProduction(s, o); p = s.productions[0]; }
  md += `**2. The paper is signed.** The shoot is ${p.months} months.\n\n`;
  const sh = sheetOf(p.plot, p.character, p.tier);
  md += `**3. The script (what the actor reads):**\n- You: ${sh.name} — ${sh.you}\n`;
  if (!sh.lead) md += `- Opposite: ${sh.heroName}, ${sh.hero.replace(/^./, (c) => c.toLowerCase())}\n`;
  md += `- ${sh.lead ? 'You want' : 'The hero wants'}: ${sh.wants}.\n- Around you: ${sh.people.join('; ')}.\n- What happens: ${sh.happens}\n- In the script, never in the trailer: ${sh.secret}\n- ${sh.learns}\n\n`;
  md += '**4. The scene days.**\n\n';
  p.prepLeft = 0;
  f.days.forEach(([id, q], i) => {
    p.monthsLeft = Math.round(p.months * (1 - [0.15, 0.5, 0.85][i]));
    p._sceneMonth = null; s.scene = null;
    const keep = Math.random; Math.random = () => 0.01;           // the day comes this month
    try { maybeScene(s); } finally { Math.random = keep; }
    Object.assign(s.scene, { id, game: SCENES[id].game, label: SCENES[id].label, line: SCENES[id].line(p) });
    md += `*Day ${i + 1} — ${s.scene.label}.* ${s.scene.page}\n\n`;
    if (SCENES[id].game === 'chrono') {
      const c = chronologyFor(s, p, 1);
      md += `> ${c.ask}\n>\n` + c.beats.map((b) => `> - ${b.pos > c.reveal ? '☑' : '☐'} ${b.text}`).join('\n') + '\n\n';
    }
    const before = (p.moments || []).length;
    resolveScene(s, q);
    md += `Played at ${q}. ${s.lastEvent.split('\n\n')[1] || ''}${(p.moments || []).length > before ? ` **The critics will have:** ${p.moments[p.moments.length - 1]}.` : ''}\n\n`;
  });
  md += `**5. What the film keeps.** Performance meter ${Math.round(p.meter)}. In the film now: ${(p.moments || []).join('; ') || 'nothing anybody will name'}. The public premise is still: "${p.premise}"\n`;
}
if (process.argv[2]) fs.writeFileSync(process.argv[2], md);
console.log(md);
