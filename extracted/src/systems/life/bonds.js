// Closeness used to be a number that only went up, and clicking seven different
// friendly buttons in one month was a valid strategy. It is now a living thing:
// it fades when you are not there, it resists being farmed in a single evening,
// and it can go below zero, where people start acting like it.
import { rint } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { monthStamp } from '../../engine/cooldown.js';

export const REL_MIN = -100, REL_MAX = 100;
export const clampRel = (v) => Math.max(REL_MIN, Math.min(REL_MAX, v));

// One name for each stretch of the scale, so the UI and the systems agree.
export const BANDS = [
  { min: 80, id: 'close', label: 'Inseparable', tone: 'good' },
  { min: 55, id: 'warm', label: 'Close', tone: 'good' },
  { min: 25, id: 'intouch', label: 'In touch', tone: 'plain' },
  { min: 1, id: 'thin', label: 'Barely in touch', tone: 'plain' },
  { min: -24, id: 'cold', label: 'Cold', tone: 'bad' },
  { min: -59, id: 'bad', label: 'Bad blood', tone: 'bad' },
  { min: REL_MIN, id: 'enemy', label: 'They hate you', tone: 'bad' },
];
export function relBand(v) { const n = Number(v) || 0; return BANDS.find((b) => n >= b.min) || BANDS[BANDS.length - 1]; }

// How fast someone forgets you when you do not turn up. Blood is slowest, the
// industry is fastest — a casting director who has not heard from you in a year
// does not remember you fondly, they do not remember you.
const FADE = { parent: 0.7, spouse: 1.1, child: 0.8, sibling: 1.1, grandparent: 0.9, partner: 1.6, contact: 2.4 };

// Repeat attention in the same month is worth less each time. This is the whole
// answer to "you can just keep clicking".
const REPEAT = [1, 0.55, 0.3, 0.15];
function repeatFactor(n) { return REPEAT[n] ?? 0.08; }

// The only way closeness should ever move from an interaction.
export function applyBond(s, p, raw) {
  const now = monthStamp(s);
  if (p.touchedMonth !== now) { p.touchedMonth = now; p.touched = 0; }
  const factor = raw > 0 ? repeatFactor(p.touched) : 1;   // you can always make it worse
  p.touched = (p.touched || 0) + 1;
  p.lastSeen = now;
  // Going up gets harder the higher you already are; going down never does.
  const resistance = raw > 0 ? 1 - Math.max(0, (p.relationship || 0)) / 150 : 1;
  const applied = raw > 0 ? Math.max(1, Math.round(raw * factor * resistance)) : Math.round(raw);
  const before = p.relationship || 0;
  p.relationship = clampRel(before + applied);
  return p.relationship - before;
}

function fadeOne(s, p, rel, now) {
  if (p.lastSeen === undefined) { p.lastSeen = now; return null; }
  const missed = now - p.lastSeen;
  if (missed < 2) return null;                       // one quiet month is nothing
  const cur = p.relationship || 0;
  if (cur <= 0) return null;                          // it cannot fade below indifference on its own
  const rate = FADE[rel] ?? 1;
  const drift = Math.max(1, Math.round((0.5 + cur / 45) * rate));
  const before = cur;
  p.relationship = clampRel(cur - drift);
  // The moment someone stops being close is worth telling the player about.
  if (before >= 55 && p.relationship < 55) return `${p.name} feels further away than they used to.`;
  if (before >= 25 && p.relationship < 25) return `You and ${p.name} have not really spoken in a long time.`;
  return null;
}

// Runs every month. Anyone you did not reach out to drifts, and industry people
// who have gone cold eventually stop being in your phone at all.
export function bondsTick(s) {
  const now = monthStamp(s);
  const notes = [];
  for (const p of (s.family || [])) {
    if (!p.alive) continue;
    const r = p.relation || '';
    const rel = r === 'Spouse' ? 'spouse' : (r === 'Mother' || r === 'Father') ? 'parent'
      : (r === 'Brother' || r === 'Sister') ? 'sibling' : r === 'Child' ? 'child' : 'grandparent';
    const note = fadeOne(s, p, rel, now); if (note) notes.push(note);
  }
  if (s.partner) { const note = fadeOne(s, s.partner, 'partner', now); if (note) notes.push(note); }

  const kept = [];
  for (const p of (s.people || [])) {
    const note = fadeOne(s, p, 'contact', now); if (note) notes.push(note);
    // Nobody in this business keeps a name they have no reason to keep.
    if ((p.relationship || 0) <= 0 && (now - (p.lastSeen ?? now)) >= 10) {
      addTimeline(s, `${p.name} stopped returning your calls.`, true);
      continue;
    }
    kept.push(p);
  }
  s.people = kept;
  if (notes.length) addTimeline(s, notes[0]);
  return s;
}

// Below this a parent will not open the door to you again.
export const SHELTER_FLOOR = -20;
export function willTakeYouIn(p) { return (p.relationship || 0) > SHELTER_FLOOR; }
