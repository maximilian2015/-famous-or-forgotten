// Hype. Being talked about, this month. Maxi: "what does hype give? It can last years — a
// series like Friends — what does it bring to the game?" And the review of the first
// design: hype is not a number that adds fame, it is ACCESS, DEMAND and PRICE — the rooms
// you can get into, how often the phone rings, what you can ask for — and it comes from
// somewhere: a hit, an award, a viral night, a scandal. Where it came from matters: the
// tabloid kind opens the brand shelf and shuts the serious one.
//
// The field is still `s.media` underneath (every save has it); everything above the state
// calls it hype. Bursts replace rather than stack — a second hit does not add seventy to
// seventy — and small things (a show, a post, a reply in the trades) add a little, less
// each time. It decays by a tenth a month and a point, so a hit is a year of being asked
// about and a show is a fortnight.
import { chance } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);

export const SOURCES = {
  hit: { label: 'a hit', line: 'The film is what people are talking about, and you are in the sentence.' },
  award: { label: 'the Askers', line: 'The season. Your name is on the lists, and the lists are what the rooms read.' },
  viral: { label: 'a night that went everywhere', line: 'Forty seconds of you, and everybody has seen it. It will not last; use it.' },
  scandal: { label: 'the tabloids', line: 'The wrong kind. The brands do not mind; the serious rooms do.' },
};
export function hype(s) { return s.media || 0; }
export function hypeSource(s) { return hype(s) >= 12 ? (s.hypeSource || null) : null; }
export function hypeLine(s) { const src = hypeSource(s); return src ? SOURCES[src].line : hype(s) >= 12 ? 'People are talking about you a little. Nobody could say why.' : 'Nobody is talking about you this month. That is not an insult; it is most months.'; }

// A burst: max, not sum. A bigger story replaces a smaller one and takes the label.
export function addHype(s, amount, source) {
  const publicist = !!(s.staff && s.staff.publicist);
  let a = amount;
  if (source === 'scandal' && publicist) a = Math.round(a * 0.6);   // the statement out before lunch
  const was = hype(s);
  s.media = clamp(Math.max(was, a));
  if (a >= was || !s.hypeSource) { s.hypeSource = source; s.hypeSince = stamp(s); }
  return s;
}
// The small things add, a little, and less each time in a year (SHOW_STEPS).
export function bumpHype(s, by) { s.media = clamp(hype(s) + by); return s; }
export const SHOW_STEPS = [10, 6, 2, 0];
export function showsThisYear(s) { return (s._shows || []).filter((t) => stamp(s) - t < 12).length; }
export function showBump(s) {
  const n = showsThisYear(s);
  const by = SHOW_STEPS[Math.min(n, SHOW_STEPS.length - 1)];
  s._shows = [...(s._shows || []).filter((t) => stamp(s) - t < 12), stamp(s)];
  bumpHype(s, by);
  return by;
}
// Monthly: ×0.9 and −1. From seventy it is a year to nothing.
export function hypeTick(s) {
  s.peakHype = Math.max(s.peakHype || 0, hype(s));   // read by meta/ambition.js
  if (hype(s) > 0) s.media = Math.max(0, hype(s) * 0.9 - 1);
  if (hype(s) < 12) { s.hypeSource = null; }
  return s;
}

// ── what it buys ────────────────────────────────────────────────────────────────
// Access: the rooms read a name they have heard this month as a bigger name. castings.js reach().
export function hypeReach(s) { return hypeSource(s) === 'scandal' ? 0 : hype(s) / 8; }
// Demand: the phone rings more. offers.js maybeGenerateOffer. The tabloid kind rings the
// brands, not the studios — that is the day-work shelf (castings.js), not this.
export function hypeDemand(s) { return hypeSource(s) === 'scandal' ? 1 : 1 + hype(s) / 100; }
// Price: what you can ask for while they are asking about you. status.js quoteFor.
export function hypePrice(s) { return hypeSource(s) === 'scandal' ? 1 : 1 + hype(s) / 250; }
// The brand shelf: the tabloid kind sells, the serious kind sells a little. castings.js day work.
export function hypeBrands(s) { const h = hype(s); return h < 20 ? 1 : hypeSource(s) === 'scandal' ? 1.6 : 1.25; }

// A flop after a hit: the sentence changes. Scaled by the part — the lead carries a bomb,
// a supporting part is not blamed for one (release.js closeRun).
export function flopHype(s, tier) {
  const by = tier === 'supporting' ? 10 : tier === 'tentpole' ? 35 : 25;
  s.media = Math.max(0, hype(s) - by);
  return s;
}
// A month out of sight (actions.js): phone off, no board, no parties. Hype and the scandal
// come down hard; the name comes down a little.
export function canGoQuiet(s) { return hype(s) >= 35 || (s.scandal || 0) >= 25; }
export function goQuiet(s) {
  s.hiding = stamp(s) + 1;
  s.media = Math.max(0, hype(s) - 30);
  s.scandal = clamp((s.scandal || 0) - 5);
  s.mental = clamp((s.mental || 50) + 4);
  addTimeline(s, 'A month out of sight. Phone off, nothing on the board, nobody at the door.');
  return s;
}
