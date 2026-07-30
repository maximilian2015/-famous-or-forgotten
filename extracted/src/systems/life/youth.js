import { addTimeline } from '../../engine/timeline.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
export const YOUTH_EVENTS = [
  { age: 6, id: 'firstStage', build: () => ({ speaker: 'The school play', text: `Your class is putting on a play. The teacher asks who wants the lead. Your heart pounds. Little hand — up or down?`,
    choices: [ { label: 'Raise your hand — take the lead', fx: { confidence: 6, acting: 3 }, reply: 'You forget two lines and love every second. Something just woke up in you.' },
      { label: 'Too scared, stay backstage', fx: { discipline: 3, acting: 1 }, reply: 'You paint the sets instead. Safer. But you watch the lead and wonder "what if".' } ] }) },
  { age: 10, id: 'dreamChoice', build: () => ({ speaker: "A daydream that won't leave", text: `You're ten, and you've decided what you want to be when you grow up. It's all you think about. Which dream grabs you?`,
    choices: [ { label: 'A movie star — acting', fx: { acting: 5, confidence: 3 }, set: { dream: 'actor' }, reply: 'Acting. You start watching films differently — studying faces, not just stories.' },
      { label: 'A music star — singing', fx: { singing: 5, charisma: 3 }, set: { dream: 'singer' }, reply: "Music. You sing in the shower like it's Wembley. One day, maybe it will be." } ] }) },
  { age: 14, id: 'talentShow', build: (s) => ({ speaker: 'The school talent show', text: `There's a talent show, and for once you could actually be seen. Your friends dare you to sign up. Do you?`,
    choices: [ { label: 'Sign up and perform', check: { stat: 'confidence', diff: 45 }, good: { fx: { confidence: 6, charisma: 4, [s.dream === 'singer' ? 'singing' : 'acting']: 4 }, reply: "You nail it. For a week, the whole school knows your name. You'll chase that feeling forever." }, bad: { fx: { confidence: -3, mental: -2 }, reply: 'You choke halfway through. The laughter still echoes sometimes. But you survived — and you learned.' } },
      { label: 'Chicken out', fx: { mental: 1, confidence: -1 }, reply: "You don't sign up. Relief, then a small quiet regret that lingers." } ] }) },
  { age: 16, id: 'firstCrush', build: () => ({ speaker: 'Sixteen', text: `There's someone. Your stomach flips when they're around. First real crush — and it's terrifying. What do you do?`,
    choices: [ { label: 'Tell them how you feel', check: { stat: 'charisma', diff: 45 }, good: { fx: { confidence: 5, mental: 4 }, reply: 'They feel the same. Your first taste of being chosen. You walk on air for months.' }, bad: { fx: { mental: -4, confidence: -2 }, reply: 'They let you down gently. It stings like nothing has before. You write a lot of bad poetry.' } },
      { label: 'Keep it to yourself', fx: { mental: -1, discipline: 2 }, reply: 'You say nothing and pour it into your dream instead. Heartache makes good fuel.' } ] }) },
  { age: 17, id: 'parentsDoubt', build: () => ({ speaker: 'Your parents', text: `Graduation is close. Your parents sit you down: "This acting-slash-singing thing... it's a nice hobby. But shouldn't you have a real backup plan?" How do you answer?`,
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
