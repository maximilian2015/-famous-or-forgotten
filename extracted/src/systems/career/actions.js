import { COST, canAfford, spend, tooTired } from '../../engine/energy.js';
import { addTimeline } from '../../engine/timeline.js';
import { rint, chance } from '../../engine/rng.js';
import { markRested } from '../life/strain.js';
import { onCooldown, markUsed } from '../../engine/cooldown.js';
import { inCareer } from '../../engine/stage.js';
import { canGoQuiet, goQuiet } from '../meta/hype.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
// What teaching can take you to. It has to be earned on real jobs, because the alternative
// is what this used to do: start every actor at a ceiling of 50 and count a deodorant
// commercial as worth as much as a lead — which put a player at acting 100 by twenty-four,
// with the whole training system finished before the career had started.
//
// A voice session is not a masterclass. Minor work is the same list the Hall of Fame
// already refuses to engrave. See systems/meta/legacy.js.
const MINOR = /^(Brand Campaign|Commercial|Jingle|Brand Song|TV Extra|Voice Session|Open Mic|Festival Slot|Session Work|Music Video)$/;
const isMinor = (c) => c.minor === true || (c.minor === undefined && MINOR.test(c.type || ''));
// Two ceilings. Teachers take you to forty, full stop — the panel always said so, and the
// number underneath it kept climbing with every credit, which is how a conservatory took a
// perfect player to a hundred by twenty-seven. Past forty it is sets, and sets take you to
// what you were born with (origin.js talentRoll): most people's ceiling is in the seventies,
// a natural's in the nineties, and the last few points of anybody's are the slowest.
export const LESSON_CAP = 40;
export function lessonCap() { return LESSON_CAP; }
export function skillCap(s) { return Math.max(LESSON_CAP, Math.min(100, s.talent || 70)); }
// What the teachers say about you, without the number: read on the Training panel.
export function talentHint(s) {
  const t = s.talent || 70;
  return t >= 86 ? 'a natural — the teachers use the word carefully, and they used it'
    : t >= 72 ? 'good, properly good, and it will show on the right sets'
    : 'solid — the parts that suit you are the ones to chase';
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
  // Maxi's review of the hype design: a way to put it down on purpose. Phone off, nothing
  // on the board, nobody at the door — the story finds somebody else (meta/hype.js).
  { id: 'quiet', label: () => 'A month out of sight', desc: (s) => ((s.scandal || 0) >= 25 ? 'Phone off. The story starves without you in it' : 'Phone off. The cameras go and find somebody else'), when: (s) => inCareer(s) && canGoQuiet(s) && !((s.hiding || 0) >= (s.year || 0) * 12 + (s.month || 0)),
    run: (s) => { goQuiet(s); return 'A month out of sight. Phone off, nothing on the board, nobody at the door. Whatever they were saying, they are saying it about somebody else by the end of it.'; } },
  { id: 'rest', label: () => 'Rest & recover', desc: (s) => (s.strain || 0) >= 60 ? 'You need this more than you think' : 'Recover mental and health', when: () => true,
    run: (s) => { s.mental = clamp(s.mental + rint(6, 12)); s.health = clamp(s.health + rint(3, 8));
      // Resting properly is the only thing that pulls the strain down faster than time does.
      markRested(s);
      return 'You took time for yourself. Mind and body thank you.'; } },
  // Twice a year, not six times. A hundred energy against fifteen a go meant six terms of
  // homework in every year of childhood, discipline maxed at eight, and six identical lines
  // on the timeline for each year — there was no choice left in it.
  { id: 'school', label: () => 'Focus on school', desc: (s) => onCooldown(s, 'school:2') ? 'That is this year’s homework done — go and be a kid' : 'Build discipline for the road ahead', when: (s) => s.stage === 'teen' || s.stage === 'child',
    blocked: (s) => (onCooldown(s, 'school:2') ? 'You have done this year’s work. The rest of it is being young.' : ''),
    run: (s) => {
      markUsed(s, onCooldown(s, 'school:1') ? 'school:2' : 'school:1');
      const g = rint(2, 4); s.discipline = clamp(s.discipline + g); return `You put in the work at school. Discipline +${g}.`; } },
];
export function runAction(s, id) {
  const a = ACTIONS.find((x) => x.id === id);
  if (!a || (a.when && !a.when(s))) return s;
  // Said before anything is charged, and not written to the timeline.
  const why = a.blocked ? a.blocked(s) : '';
  if (why) { s.lastEvent = why; return s; }
  if (!canAfford(s, COST.careerAction)) { s.lastEvent = tooTired(s, COST.careerAction); return s; }
  spend(s, COST.careerAction);
  const msg = a.run(s); s.lastEvent = msg; addTimeline(s, msg);
  return s;
}
export function availableActions(s) { return ACTIONS.filter((a) => !a.when || a.when(s)); }
