// What they think of you as an actor, which is not what they think of you.
//
// Maxi, looking at a diagram with five relationship axes on it: "let us work on this." Five
// is a spreadsheet. But one of them is real, and it is the one this game is actually about:
//
//   They can be very fond of you and still not put you in their film. And a director who
//   finds you tiresome will cast you tomorrow if you are right for it.
//
// Until now a person was one number. Buy them dinner often enough and every door they had
// opened. That is not the business and it is not any business — the warmth and the work are
// two different ledgers, kept by the same people, about the same you.
//
// So: REGARD, alongside closeness. It does not move for chat, jokes, presents, dinners or
// evenings, and no amount of any of those will ever move it. It moves for work:
//
//   · a picture you were good in, that they were on         — the biggest single thing
//   · the standing the whole business has decided you have  — a slow drift, always running
//   · a scandal                                             — everybody hears, everybody adjusts
//   · walking off a set, or a director who went cold        — handled where those happen
//
// And it is what the doors are actually on. A producer at closeness 80 and regard 30 is
// somebody who will take your call, mean every word, and cast somebody else — and the game
// now lets you feel exactly that, which is the most common experience in this profession
// and was completely missing.
import { addTimeline } from '../../engine/timeline.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

// Somebody you have just met has no opinion of your work. They have an impression of your
// CV, which is not the same thing and is mostly other people's opinions.
export function startingRegard(s) {
  return clamp(Math.round(28 + (s.respect || 0) * 0.25 + (s.fame || 0) * 0.12 + Math.random() * 10));
}
export function regardOf(p) { return p && p.regard != null ? p.regard : 35; }

// Where the business as a whole would put you. Standing is what other people in the trade
// think; fame gets you in the door but does not survive contact with the work.
export function regardTarget(s) {
  return clamp(Math.round(20 + (s.respect || 0) * 0.55 + (s.fame || 0) * 0.18 - (s.scandal || 0) * 0.35));
}

export const BANDS = [
  { min: 82, label: 'Would build a film around you', tone: 'good' },
  { min: 64, label: 'Would cast you tomorrow', tone: 'good' },
  { min: 46, label: 'Would read you for it', tone: 'plain' },
  { min: 28, label: 'Thinks of you for other things', tone: 'plain' },
  { min: 12, label: 'Does not rate you', tone: 'bad' },
  { min: 0, label: 'Would not have you on it', tone: 'bad' },
];
export function regardBand(v) { return BANDS.find((b) => (v || 0) >= b.min) || BANDS[BANDS.length - 1]; }

// The sentence that makes the gap legible, and it only appears when the two numbers
// disagree — which is the only time it is interesting.
export function regardNote(p) {
  const warm = p.relationship || 0, pro = regardOf(p);
  if (warm >= 60 && pro <= 35) return 'Genuinely fond of you. Has never once thought of you for anything.';
  if (warm >= 45 && pro <= 30) return 'Likes you. Does not rate you, and would be mortified if you knew.';
  if (pro >= 65 && warm <= 25) return 'Rates your work and has no interest in knowing you. That is enough.';
  if (pro >= 55 && warm <= 15) return 'Cannot stand you and would still cast you, because you are right for it.';
  return null;
}

// ── what moves it ─────────────────────────────────────────────────────────────
// The slow one. Everybody's opinion drifts toward what the business has decided, because
// almost nobody forms their own — they read the same trades as each other.
export const DRIFT = 0.12;
export function regardTick(s) {
  const target = regardTarget(s);
  for (const p of (s.people || [])) {
    if (p.regard == null) p.regard = startingRegard(s);
    const gap = target - p.regard;
    // Somebody who has actually worked with you has their own opinion and holds it harder.
    const stubborn = p.workedWith ? 0.45 : 1;
    p.regard = clamp(p.regard + gap * DRIFT * stubborn);
  }
  return s;
}

// The fast one, and the only one that really counts: they were on it, and they watched you
// do it. A good picture you were good in is worth years of drift. A bad one you were bad in
// costs the same, which is why people are careful.
export function regardAfterWorking(s, names, rating, meter) {
  const list = (s.people || []).filter((p) => names.includes(p.name));
  if (!list.length) return s;
  // The picture is half of it; what you were like on it is the other half. A film that did
  // not work, carried by somebody who was good in it every day, still moves this the right
  // way — everybody on that set knows who was working.
  const work = ((rating || 50) - 52) * 0.30 + ((meter || 45) - 45) * 0.26;
  for (const p of list) {
    const before = regardOf(p);
    p.regard = clamp(before + work);
    p.workedWith = true;
    if (before < 64 && p.regard >= 64) addTimeline(s, `${p.name} would cast you tomorrow now. They saw the work.`);
    if (before >= 46 && p.regard < 46) addTimeline(s, `${p.name} watched you work and thought less of you for it.`, true);
  }
  return s;
}

// Everybody hears, and everybody adjusts a little, and none of them will say so.
export function regardScandal(s, by = 1) {
  for (const p of (s.people || [])) p.regard = clamp(regardOf(p) - by * (p.workedWith ? 1.4 : 2.6));
  return s;
}

// ── what it is for ────────────────────────────────────────────────────────────
// The doors are on this now, not on whether they like you. Closeness gets you the meeting;
// this decides whether the meeting is about anything.
export const OPENS_AT = 58;
export function opensDoors(s, p) { return regardOf(p) >= OPENS_AT; }
export function whyClosed(p) {
  const pro = regardOf(p);
  if (pro >= OPENS_AT) return '';
  if ((p.relationship || 0) >= 55) return `${String(p.name || 'They').split(' ')[0]} would do almost anything for you. Putting you in something is not on that list yet.`;
  return 'Not somebody who would put you in something. Not yet.';
}
