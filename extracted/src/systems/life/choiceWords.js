// The words under a choice on the event screen (App.jsx ArcModal). Two kinds of event use that
// screen and keep what a choice does in two different ways: a life or on-set event (arcs.js)
// and a childhood one (youth.js) carry it as numbers, fx, that resolveArc applies; a story beat
// (stories.js) does it in a function and says it alongside, in `shows`, in the same shape. Both
// are put into words here, so the screen speaks one language whichever it is.
//
// Plain words and arrows, not the numbers: the player needs to know which way a thing moves and
// whether it moves a lot. ↑↑ and ↓↓ are a change of ten or more.
// Imports only the two write points, so arcs.js and stories.js can both use it without
// importing each other.
import { setFame, setRespect } from '../meta/status.js';
export const STAT = { respect: 'Standing', fame: 'Fame', media: 'Hype', scandal: 'Scandal', mental: 'Mental', health: 'Health',
  confidence: 'Confidence', discipline: 'Discipline', charisma: 'Charisma', acting: 'Acting', singing: 'Singing', looks: 'Looks', strain: 'Strain' };
export const BIG = 10;
export const arrow = (d) => { const a = d > 0 ? '↑' : '↓'; return Math.abs(d) >= BIG ? a + a : a; };
// An event (arcs.js resolveArc) softens a loss of fame or standing at the bottom of a career:
// nobody is made less famous than unknown by one bad choice. One formula, used there and here.
export function softenLoss(s, k, d) {
  return (k === 'fame' || k === 'respect') && d < 0 ? Math.max(d, -Math.max(1, (s[k] || 0) * 0.22)) : d;
}
const clamp = (v) => Math.max(0, Math.min(100, v));
// What a change of `d` to `k` really does to this actor now, written the way the game writes
// it: fame and standing through their single write points (fame also stops at the ceiling the
// career has earned), money without a limit, everything else held to 0..100. Confidence at 100
// cannot go up; the screen used to say "Confidence ↑" anyway.
export function realDelta(s, k, d, soften) {
  if (!s || k === 'cash') return d;
  if (soften) d = softenLoss(s, k, d);
  if (k === 'fame' || k === 'respect') { const t = { ...s }; (k === 'fame' ? setFame : setRespect)(t, (s[k] || 0) + d); return (t[k] || 0) - (s[k] || 0); }
  return clamp((s[k] || 0) + d) - (s[k] || 0);
}
// [{ t, good }] — good is true when it is good for you, false when it costs, null when it is
// neither (hype is attention, of any kind). Given the actor, a change that would do nothing to
// them (already at the top, already at the bottom) is left out, and the arrow is the size of
// what would really happen.
export function fxWords(fx, s, soften) {
  const out = [];
  for (const k of Object.keys(fx || {})) {
    const d = s ? realDelta(s, k, fx[k], soften) : fx[k]; if (!d) continue;
    if (k === 'cash') { out.push({ t: `${d > 0 ? '+' : '−'}€${Math.abs(Math.round(d)).toLocaleString('en-US')}`, good: d > 0 }); continue; }
    const bad = k === 'scandal' || k === 'strain';
    out.push({ t: `${STAT[k] || k[0].toUpperCase() + k.slice(1)} ${arrow(d)}`, good: k === 'media' ? null : bad ? d < 0 : d > 0 });
  }
  return out;
}
// A story beat's `shows`: { fx, more } for what happens, or { odds, stat, good, bad } for a roll.
export function showWords(x, s) { return [...fxWords((x && x.fx) || {}, s), ...((x && x.more) || [])]; }
