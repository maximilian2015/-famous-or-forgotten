// The price of the name. Maxi: "there is no bad side to being a star at all, or it never
// shows." And he is right — the game had a ceiling, a drift and a scandal meter, and none
// of them is a cost you FEEL. A star's actual complaint is not that the work dries up. It
// is that the ordinary hour stops being ordinary: you cannot sit in a bar, you cannot post
// a photograph, a walk is a transaction, and the people who knew you before slowly stop
// ringing because they assume you are busy and they are tired of feeling small.
//
// Three costs, all of them proportional to the name, all of them visible the month they
// happen, and all of them with something you can do about it:
//   · the lens   — an ordinary hour in public is a photograph (town.js, events)
//   · the drift  — the people who knew you before fade unless you call them
//   · the quiet  — a famous life with nobody close in it wears on you
import { addTimeline } from '../../engine/timeline.js';
import { rint, chance, pick } from '../../engine/rng.js';
import { inCareer } from '../../engine/stage.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);

// How recognisable you are in a room that did not expect you. Security keeps the worst of
// it off; a face nobody has seen for years is left alone.
export function recognised(s) {
  const f = s.fame || 0;
  if (f < 45) return 0;
  let v = (f - 45) / 55;                                   // 0 at Known Face, 1 at a hundred
  if (s.staff && s.staff.security) v *= 0.55;
  if ((s.media || 0) >= 45) v *= 1.25;                      // a month everybody is talking about you
  return Math.max(0, Math.min(1, v));
}
// An ordinary hour in public, priced. Called by town.js and the parties: returns a line to
// show, or null when nobody bothered you.
export function theLens(s, what) {
  const r = recognised(s);
  if (!r || !chance(r * 62)) return null;
  const hard = chance(r * 45);
  if (hard) {
    s.scandal = clamp((s.scandal || 0) + rint(2, 5));
    s.mental = clamp((s.mental || 50) - rint(2, 4));
    const line = pick([
      'Somebody filmed you the whole time and did not pretend not to.',
      'A man with a camera followed you to the car and asked about your marriage until you answered.',
      'Three people wanted a photograph and the fourth wanted an argument.',
      'A table of strangers took turns taking pictures of you eating.',
    ]);
    addTimeline(s, `${line} You went home early.`, true);
    return `${line} You went home early — which is what ${what} costs now.`;
  }
  s.mental = clamp((s.mental || 50) - 1);
  const line = pick([
    'Two people asked for a photograph and one of them was kind about it.',
    'You were recognised at the door and the room changed temperature.',
    'Somebody said your name across the bar, and then everybody knew.',
  ]);
  return `${line} Not a bad evening. Not a private one either.`;
}

// Who is left. The people in your phone who are not industry — and the industry ones who
// were friends first — drift when you never call, and a famous life drifts faster because
// everybody assumes you are busy and nobody wants to be the one asking.
export function closeOnes(s) {
  return (s.people || []).filter((p) => (p.relationship || 0) >= 55 && !p.cold);
}
export function driftTick(s) {
  if (!inCareer(s)) return s;
  const f = s.fame || 0;
  if (f < 35) return s;
  const speed = 0.35 + (f - 35) / 120;                      // a point a month at the very top
  let faded = null;
  for (const p of s.people || []) {
    if (p.cold || (p.relationship || 0) <= 0) continue;
    const seen = (s._seen && s._seen[p.id]) || 0;
    if (stamp(s) - seen < 6) continue;                      // you have been in touch lately
    const was = p.relationship || 0;
    p.relationship = Math.max(0, was - speed);
    if (was >= 55 && p.relationship < 55 && !faded) faded = p;
  }
  if (faded) addTimeline(s, `${faded.name} has stopped ringing. Nobody fell out; you were busy every time, and eventually they believed you.`, true);
  return s;
}
// A famous life with nobody close in it. Not a spiral — a slow, nameable cost with an
// obvious answer: see somebody.
export function quietTick(s) {
  if (!inCareer(s)) return s;
  const f = s.fame || 0;
  if (f < 55) return s;
  const close = closeOnes(s).length + ((s.partner || (s.family || []).some((p) => p.relation === 'Spouse' && p.alive)) ? 2 : 0);
  if (close >= 2) return s;
  s.mental = clamp((s.mental || 50) - (f >= 80 ? 1.5 : 1));
  s._quietMonths = (s._quietMonths || 0) + 1;
  if (s._quietMonths === 6) addTimeline(s, 'Six months of rooms full of people who know your name and nobody who knows you. It is its own kind of tired.', true);
  if (s._quietMonths % 24 === 0) addTimeline(s, 'Another year of it. You have a lot of numbers in your phone and nobody to ring on a Tuesday.', true);
  return s;
}
export function priceTick(s) { driftTick(s); quietTick(s); return s; }
// For the main screen: what the name is costing you right now, or null.
export function priceLine(s) {
  const r = recognised(s);
  const close = closeOnes(s).length;
  if ((s.fame || 0) >= 55 && close === 0 && !s.partner) return { id: 'quiet', label: 'Nobody close', line: 'Rooms full of people who know the name. Nobody who knows you — and it is costing you a point of yourself a month.', fix: 'See somebody. Anybody you have not seen in a while, under People.' };
  if (r >= 0.5) return { id: 'lens', label: 'You cannot go anywhere', line: 'You are recognised the moment you walk in. An ordinary evening is a photograph and sometimes an argument.', fix: 'Security, under Style. Or stay in — but the quiet has its own bill.' };
  return null;
}
