// Trouble you did not ask for. Maxi: "reputation only goes bad from my own actions — the
// world never comes for you; a careful player is never in trouble." Twenty perfect lives
// measured: never once a rumour that stuck, never a night that turned into a story, never
// a year the phone rang less because somebody younger was ringing more.
//
// Three things here, all rolls, all with a way to make them worse or better:
//   · a rumour — a director who went cold tells people, and for half a year the room has
//     heard it before you read (castings.js);
//   · a story — the drink, the party, the lawyer: real scandal, with a publicist to blunt it;
//   · being overtaken — the year somebody younger takes your place on the list, the phone
//     rings less (offers.js), and the trades say so.
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { setRespect } from './status.js';
import { level as drinkLevel } from '../life/drink.js';
import { inCareer } from '../../engine/stage.js';

const clamp = (v) => Math.max(0, Math.min(100, v));
const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const RUMOUR_MONTHS = 6;

// A director who went cold on you has started telling people. Set at wrap (production.js).
export function startRumour(s, who) {
  s.rumour = { until: stamp(s) + RUMOUR_MONTHS, who };
  addTimeline(s, `${who} is telling people you were difficult. The story will do the rounds for a while.`, true);
}
export function rumourOn(s) { return !!(s.rumour && s.rumour.until > stamp(s)); }
// The room has heard: reads are harder while it lasts. Read by castings.js.
export function rumourFactor(s) { return rumourOn(s) ? 0.82 : 1; }

// Real scandal, once you are somebody. A publicist halves what sticks.
const STORIES = [
  { id: 'dui', when: (s) => drinkLevel(s) >= 18, odds: (s) => 0.8 + drinkLevel(s) / 40,
    scandal: [10, 18], respect: 4, line: 'Pulled over at two in the morning. The photograph from the station is everywhere by six.' },
  { id: 'recording', when: (s) => (s._wentOut || 0) >= stamp(s) - 1, odds: () => 1.2,
    scandal: [6, 12], respect: 2, line: 'A recording from the party. You do not remember saying it; the internet does not need you to.' },
  { id: 'lawsuit', when: (s) => (s.fame || 0) >= 45, odds: () => 0.6,
    scandal: [4, 8], respect: 1, cash: [0.03, 0.08], line: 'A lawsuit — an old contract, a producer, a number with a lot of zeros. Your lawyer says it is nothing. Your lawyer bills for saying it.' },
  { id: 'cofact', when: (s) => (s.fame || 0) >= 30 && (s.productions || []).length > 0, odds: () => 0.9,
    scandal: [5, 10], respect: 3, line: 'A co-star, an interview, and a sentence about you that the headline is built from. "Difficult" is in quotation marks, which changes nothing.' },
  { id: 'photo', when: (s) => (s.fame || 0) >= 35, odds: () => 0.9,
    scandal: [4, 9], respect: 0, line: 'A photograph you did not pose for, taken from a car. The caption is worse than the picture.' },
];
export function storyTick(s) {
  if (!inCareer(s) || (s.fame || 0) < 20) return;
  const live = STORIES.filter((st) => st.when(s));
  if (!live.length) return;
  const st = pick(live);
  if (!chance(st.odds(s))) return;
  const publicist = !!(s.staff && s.staff.publicist);
  const sc = rint(st.scandal[0], st.scandal[1]) * (publicist ? 0.5 : 1);
  s.scandal = clamp((s.scandal || 0) + sc);
  if (st.respect) setRespect(s, (s.respect || 0) - st.respect * (publicist ? 0.5 : 1));
  if (st.cash) { const amt = Math.round((s.cash || 0) * (st.cash[0] + Math.random() * (st.cash[1] - st.cash[0]))); if (amt > 0) { s.cash -= amt; addTimeline(s, `€${amt.toLocaleString()} to the lawyers.`, true); } }
  s.media = clamp((s.media || 0) + 4);
  addTimeline(s, `${st.line}${publicist ? ' Your publicist had a statement out before lunch.' : ''}`, true);
  s.lastEvent = st.line + (publicist ? ' Your publicist was on it by lunch, which is what you pay them for.' : ' Nobody is on it. That is what a publicist is for.');
  s._lastStory = stamp(s);
}

// Overtaken. Once a year the business ranks everybody (world.js). If you fell more than a
// few places, the phone rings less this year and the trades have a name for who took yours.
export function overtakenTick(s) {
  const r = s.world && s.world.rank && s.world.rank.you;
  if (!r) return;
  if (s._rankLastYear && r > s._rankLastYear + 4 && r <= 60) {
    s.overtakenUntil = stamp(s) + 12;
    const above = ((s.world && s.world.actors) || []).find((a) => a.rank === s._rankLastYear && a.alive && !a.retired);
    addTimeline(s, `The year's list is out: you were #${s._rankLastYear}, you are #${r}.${above ? ` ${above.name} has your old chair.` : ''} The phone rings less when the number goes the wrong way.`, true);
  }
  s._rankLastYear = r;
}
export function overtaken(s) { return (s.overtakenUntil || 0) > stamp(s); }
