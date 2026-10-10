// The words under a choice on the event screen (App.jsx ArcModal). Two kinds of event use that
// screen and keep what a choice does in two different ways: a life or on-set event (arcs.js)
// and a childhood one (youth.js) carry it as numbers, fx, that resolveArc applies; a story beat
// (stories.js) does it in a function and says it alongside, in `shows`, in the same shape. Both
// are put into words here, so the screen speaks one language whichever it is.
//
// Plain words and arrows, not the numbers: the player needs to know which way a thing moves and
// whether it moves a lot. ↑↑ and ↓↓ are a change of ten or more.
// Imports nothing, so arcs.js and stories.js can both use it without importing each other.
export const STAT = { respect: 'Standing', fame: 'Fame', media: 'Hype', scandal: 'Scandal', mental: 'Mental', health: 'Health',
  confidence: 'Confidence', discipline: 'Discipline', charisma: 'Charisma', acting: 'Acting', singing: 'Singing', looks: 'Looks', strain: 'Strain' };
export const BIG = 10;
export const arrow = (d) => { const a = d > 0 ? '↑' : '↓'; return Math.abs(d) >= BIG ? a + a : a; };
// [{ t, good }] — good is true when it is good for you, false when it costs, null when it is
// neither (hype is attention, of any kind).
export function fxWords(fx) {
  const out = [];
  for (const k of Object.keys(fx || {})) {
    const d = fx[k]; if (!d) continue;
    if (k === 'cash') { out.push({ t: `${d > 0 ? '+' : '−'}€${Math.abs(Math.round(d)).toLocaleString('en-US')}`, good: d > 0 }); continue; }
    const bad = k === 'scandal' || k === 'strain';
    out.push({ t: `${STAT[k] || k[0].toUpperCase() + k.slice(1)} ${arrow(d)}`, good: k === 'media' ? null : bad ? d < 0 : d > 0 });
  }
  return out;
}
// A story beat's `shows`: { fx, more } for what happens, or { odds, stat, good, bad } for a roll.
export function showWords(x) { return [...fxWords((x && x.fx) || {}), ...((x && x.more) || [])]; }
