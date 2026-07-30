import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
export const ARCS = [
  { id: 'firstCredit', once: true, when: (s) => (s.filmography || []).length + (s.discography || []).length === 1 && s.fame < 20,
    build: () => ({ speaker: 'A quiet realization', text: `Your first credit is out in the world. It's small. Almost nobody saw it. But it exists now — proof you're not just dreaming. How do you carry this?`,
      choices: [ { label: 'Let it fuel you', fx: { confidence: 6, discipline: 3 }, reply: 'You pin it to the wall. Next one will be bigger. You believe that now.' },
        { label: 'Already chasing the next', fx: { discipline: 5, mental: -2 }, reply: "No time to celebrate. You're already reading for the next room." },
        { label: "Quietly terrified it's the only one", fx: { mental: -4, confidence: -2 }, reply: "One credit. What if it’s the last? The fear is its own kind of fuel." } ] }) },
  { id: 'brokeMonth', when: (s) => s.stage === 'career' && (s.cash || 0) < 0 && (s.fame || 0) < 30,
    build: () => ({ speaker: 'Rock bottom', text: `Your account is empty and rent is coming. A friend offers you a stable, boring job with a real salary. Take it and the dream gets quieter. Refuse and you keep gambling on yourself.`,
      choices: [ { label: 'Take the day job (safe)', fx: { cash: 4000, mental: 4, discipline: 2, fame: -1 }, reply: "Steady money, steady life. The dream doesn't die — it just waits in the evenings." },
        { label: 'Refuse — all in on the dream', fx: { mental: -3, confidence: 4 }, reply: "You say no. Terrifying. But you didn't come this far to fold now." } ] }) },
  { id: 'firstScandal', once: true, when: (s) => (s.fame || 0) >= 40 && (s.scandal || 0) < 15,
    build: () => ({ speaker: 'Your publicist', text: `A photo is circulating — nothing career-ending, but embarrassing, and it's spreading. The press wants a comment. Your publicist needs a decision in the next hour.`,
      choices: [ { label: 'Get ahead of it — own it', check: { stat: 'charisma', diff: 50 }, good: { fx: { respect: 4, media: 4, scandal: -2 }, reply: 'You address it head-on with humor. The story flips — people respect the honesty.' }, bad: { fx: { scandal: 6, media: 5, mental: -3 }, reply: 'Your statement reads as defensive. It pours fuel on the fire.' } },
        { label: 'Deny everything', fx: { scandal: 4, media: 3 }, reply: 'You deny it. Some believe you. The internet does not forget, though.' },
        { label: 'Say nothing, let it pass', fx: { scandal: 2, mental: -1 }, reply: 'You go quiet. It stings for a week, then a bigger story buries it.' } ] }) },
  { id: 'sellOut', once: true, when: (s) => (s.fame || 0) >= 55 && (s.respect || 0) >= 30,
    build: () => ({ speaker: 'A brand deal', text: `A huge company offers you a fortune to be the face of a product you'd never actually use. Easy money and massive exposure — but the artists you admire would smirk.`,
      choices: [ { label: 'Take the money', fx: { cash: 80000, fame: 3, respect: -5, media: 4 }, reply: 'The check clears. The billboard goes up. You try not to read the comments.' },
        { label: 'Decline — protect your name', fx: { respect: 6, confidence: 2 }, reply: 'You pass. Your team is baffled. But your credibility is worth more than one check.' },
        { label: 'Negotiate creative control', check: { stat: 'confidence', diff: 55 }, good: { fx: { cash: 60000, fame: 3, respect: 2 }, reply: 'You reshape the campaign into something you can stand behind. Best of both worlds.' }, bad: { fx: { cash: 40000, respect: -3 }, reply: 'They smile, nod, and ignore your notes. You took the money and the compromise.' } } ] }) },
  { id: 'mentor', once: true, when: (s) => (s.fame || 0) >= 30 && (s.people || []).some((p) => (p.industryWeight || 0) >= 70),
    build: (s) => { const m = (s.people || []).find((p) => (p.industryWeight || 0) >= 70); return { speaker: m ? m.name : 'A veteran', text: `${m ? m.name : 'Someone established'} takes you aside: "You've got something. But this industry eats people who don't watch themselves. Let me give you one piece of advice — and you decide what to do with it."`,
      choices: [ { label: 'Listen and take it to heart', fx: { discipline: 5, confidence: 3, mental: 2 }, reply: 'You absorb every word. Having someone in your corner changes how the climb feels.' },
        { label: 'Thank them but trust your gut', fx: { confidence: 5, mental: -1 }, reply: "You nod politely and do it your way. Maybe that's brave. Maybe that's a mistake." } ] }; } },
  { id: 'burnout', when: (s) => s.stage === 'career' && (s.mental || 0) < 25,
    build: () => ({ speaker: 'Your body, finally', text: `You can't sleep. You dread the work you used to love. Everything is heavy. This is burnout, and it won't fix itself. Something has to give.`,
      choices: [ { label: 'Step back and actually rest', fx: { mental: 20, health: 10, fame: -3 }, reply: 'You cancel everything and disappear for a while. The industry moves on without you — and you come back whole.' },
        { label: 'Push through, ignore it', fx: { mental: -6, health: -8 }, reply: "You keep going. The work suffers, and so do you. This road ends badly if you don't turn off it." },
        { label: 'Get real help', fx: { mental: 15, cash: -3000 }, reply: "You find a professional. It costs money and pride. It's the best decision you've made in months." } ] }) },
];
export function maybeStartArc(s) {
  if (s.pendingArc || s.stage === 'child') return;
  const done = s._arcsDone || [];
  const eligible = ARCS.filter((a) => { if (a.once && done.includes(a.id)) return false; try { return a.when(s); } catch (e) { return false; } });
  if (!eligible.length) return;
  if (!chance(35)) return;
  const arc = pick(eligible); const built = arc.build(s);
  s.pendingArc = { id: arc.id, speaker: built.speaker, text: built.text, choices: built.choices };
  (s._arcsDone = s._arcsDone || []).push(arc.id);
}
export function resolveArc(s, i) {
  const arc = s.pendingArc; if (!arc) return s;
  const c = arc.choices[i]; if (!c) return s;
  let out = c, head = '';
  if (c.check) { const odds = 30 + (s[c.check.stat] || 0) * 0.6; const ok = chance(odds); out = ok ? c.good : c.bad; head = ok ? '✅ ' : '❌ '; }
  const fx = out.fx || {};
  Object.keys(fx).forEach((k) => { if (k === 'cash') s.cash = (s.cash || 0) + fx[k]; else s[k] = clamp((s[k] || 0) + fx[k]); });
  if (out.set || c.set) { const setter = out.set || c.set; Object.keys(setter).forEach((k) => { s[k] = setter[k]; }); }
  s.lastEvent = `${arc.speaker}\n\n${head}${out.reply || c.label}`;
  addTimeline(s, `${arc.speaker}: ${c.label}.`, (fx.mental || 0) < -3 || (fx.scandal || 0) > 3);
  s.pendingArc = null;
  return s;
}
