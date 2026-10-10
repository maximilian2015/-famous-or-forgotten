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
// It was meant to be what the doors are on, and it never was: `opensDoors` was written with it
// and never called by anything (ca0d0aa). Every work route — an offer, the tentpole board, a
// director coming back, a pitch, a word put in — has only ever read closeness. So the card
// promised casting ("Would cast you tomorrow", "would still cast you") that the game did not do,
// and the Directors screen and the person's card disagreed about the same person. Until somebody
// decides to put the doors on regard — a balance decision, not a fix — it says what it is: an
// opinion of your work, and nothing about what they will do. (transition audit, 10 Oct 2026)
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

// What they think of the work — not what they will do about it; see the note at the top.
export const BANDS = [
  { min: 82, label: 'Thinks you are the real thing', tone: 'good' },
  { min: 64, label: 'Rates your work highly', tone: 'good' },
  { min: 46, label: 'Rates your work', tone: 'plain' },
  { min: 28, label: 'Not sold on your work', tone: 'plain' },
  { min: 12, label: 'Does not rate you', tone: 'bad' },
  { min: 0, label: 'Thinks little of your work', tone: 'bad' },
];
export function regardBand(v) { return BANDS.find((b) => (v || 0) >= b.min) || BANDS[BANDS.length - 1]; }

// The sentence that makes the gap legible, and it only appears when the two numbers
// disagree — which is the only time it is interesting.
export function regardNote(p) {
  const warm = p.relationship || 0, pro = regardOf(p);
  if (warm >= 60 && pro <= 35) return 'Genuinely fond of you. Not sold on the work.';
  if (warm >= 45 && pro <= 30) return 'Likes you. Does not rate you, and would be mortified if you knew.';
  if (pro >= 65 && warm <= 25) return 'Rates your work and has no interest in knowing you.';
  if (pro >= 55 && warm <= 15) return 'Cannot stand you, and still rates the work.';
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
    if (before < 64 && p.regard >= 64) addTimeline(s, `${p.name} rates your work now. They saw it up close.`);
    if (before >= 46 && p.regard < 46) addTimeline(s, `${p.name} watched you work and thought less of you for it.`, true);
  }
  return s;
}

// Everybody hears, and everybody adjusts a little, and none of them will say so.
export function regardScandal(s, by = 1) {
  for (const p of (s.people || [])) p.regard = clamp(regardOf(p) - by * (p.workedWith ? 1.4 : 2.6));
  return s;
}
