import { addTimeline } from '../../engine/timeline.js';
import { AMBITIONS, AMBITION_ORDER } from '../meta/ambition.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
export const YOUTH_EVENTS = [
  { age: 6, id: 'firstStage', build: () => ({ speaker: 'The school play', text: `Your class is putting on a play. The teacher asks who wants the lead. Your heart pounds. Little hand — up or down?`,
    choices: [ { label: 'Raise your hand — take the lead', fx: { confidence: 6, acting: 3 }, reply: 'You forget two lines and love every second. Something just woke up in you.' },
      { label: 'Too scared, stay backstage', fx: { discipline: 3, acting: 1 }, reply: 'You paint the sets instead. Safer. But you watch the lead and wonder "what if".' } ] }) },
  // The ambition. Every road is acting (the singer road is kept for old saves and nothing
  // else), but what you want FROM it is chosen here and remembered: it leans the stories a
  // little and the Legacy page answers it at the end — did you get what you wanted, which
  // is a different question from whether you got a lot. See meta/ambition.js.
  { age: 10, id: 'dreamChoice', build: () => ({ speaker: "A daydream that won't leave", text: `You're ten, and you've decided what you want to be when you grow up. It's all you think about. Which dream grabs you?`,
    choices: AMBITION_ORDER.map((id) => ({ label: `${AMBITIONS[id].label} — ${AMBITIONS[id].want}`, fx: AMBITIONS[id].fx, set: { dream: 'actor', ambition: id },
      reply: { star: 'Films. The big ones. You start watching them differently — studying faces, not just stories, and the size of the name on the poster.',
        serious: 'The stage, and the films that feel like it. Two hours a night with nowhere to hide, and you cannot imagine wanting anything else.',
        tv: 'A show. The same faces every week, in every house. You want to be one of the faces.',
        face: 'Famous. You are not sure for what yet, and you are not sure it matters.',
        working: 'Work. Not the poster, not the speech — the call sheet, every year, for the rest of your life. It is more than most people get.' }[id] })) }) },
  { age: 14, id: 'talentShow', build: (s) => ({ speaker: 'The school talent show', text: `There's a talent show, and for once you could actually be seen. Your friends dare you to sign up. Do you?`,
    choices: [ { label: 'Sign up and perform', check: { stat: 'confidence', diff: 45 }, good: { fx: { confidence: 6, charisma: 4, [s.dream === 'singer' ? 'singing' : 'acting']: 4 }, reply: "You nail it. For a week, the whole school knows your name. You'll chase that feeling forever." }, bad: { fx: { confidence: -3, mental: -2 }, reply: 'You choke halfway through. The laughter still echoes sometimes. But you survived — and you learned.' } },
      { label: 'Chicken out', fx: { mental: 1, confidence: -1 }, reply: "You don't sign up. Relief, then a small quiet regret that lingers." } ] }) },
  { age: 16, id: 'firstCrush', build: () => ({ speaker: 'Sixteen', text: `There's someone. Your stomach flips when they're around. First real crush — and it's terrifying. What do you do?`,
    choices: [ { label: 'Tell them how you feel', check: { stat: 'charisma', diff: 45 }, good: { fx: { confidence: 5, mental: 4 }, reply: 'They feel the same. Your first taste of being chosen. You walk on air for months.' }, bad: { fx: { mental: -4, confidence: -2 }, reply: 'They let you down gently. It stings like nothing has before. You write a lot of bad poetry.' } },
      { label: 'Keep it to yourself', fx: { mental: -1, discipline: 2 }, reply: 'You say nothing and pour it into your dream instead. Heartache makes good fuel.' } ] }) },
  { age: 17, id: 'parentsDoubt', build: () => ({ speaker: 'Your parents', text: `Graduation is close. Your parents sit you down: "This acting thing... it's a nice hobby. But shouldn't you have a real backup plan?" How do you answer?`,
    choices: [ { label: '"This IS my plan. All in."', fx: { confidence: 6, discipline: 3, mental: -2 }, reply: "They sigh, worried. But they see the fire in your eyes and stop arguing. It's your life now." },
      { label: "\"You’re right, I’ll have a backup.\"", fx: { discipline: 5, mental: 3, confidence: -2 }, reply: 'You promise to be sensible. It calms them — and plants a small seed of doubt in you.' } ] }) },
];
export function maybeYouthEvent(s) {
  if (s.pendingArc) return;
  const done = s._youthDone || [];
  const ev = YOUTH_EVENTS.find((e) => e.age === s.ageY && !done.includes(e.id));
  if (!ev) return;
  const built = ev.build(s);
  s.pendingArc = { id: ev.id, youth: true, speaker: built.speaker, text: built.text, choices: built.choices };
  (s._youthDone = s._youthDone || []).push(ev.id);
}
