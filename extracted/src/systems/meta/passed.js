// The parts you did not take, kept. The first step of Industry Watch (Maxi, 18 Oct 2026): a
// project you walk away from does not vanish — later the game can say who took your part, how
// it did, and what it did for them. None of that can be told about a project nobody wrote down.
//
// Before this, a refusal lived only as a director's grudge (stories.js noteRefusal) with its
// outcome rolled on the spot and the record deleted two to five years later, or as the
// "Without you" thread, which ends. This ledger keeps the facts that are known on the day, and
// the two stories that reveal what happened next write it back here. Nothing on the screen
// reads it yet.
//
// Only what matters goes in — a lead, a franchise, a tentpole, a prestige picture, a known
// director, a part you nearly signed. Forty of every small no would be bookkeeping.
import { theFive } from '../world/directors.js';

const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
export const PASSED_KEEP = 40;
const clean = (t) => String(t || '').replace(/^⭐\s*/, '');

// Why this one is worth remembering — empty means it is not.
export function passedWhy(s, o) {
  if (!o || o.kind === 'brand' || o.kind === 'thaw' || /Brand|Commercial|Jingle|Campaign/.test(o.type || '')) return [];
  const why = [];
  if (o.tier === 'lead' || o.tier === 'tentpole' || /^Lead\b|Season lead|Series lead/.test(o.role || '')) why.push('lead');
  if (o.kind === 'sequel' || o.kind === 'renewal') why.push('franchise');
  if (o.scale === 'blockbuster' || o.tier === 'tentpole') why.push('blockbuster');
  if (o.scale === 'prestige' || (o.prestigeScore || 0) >= 75) why.push('prestige');
  const known = o.director && ((s.people || []).some((p) => p.name === o.director) || theFive(s).some((d) => d.name === o.director));
  if (known) why.push('director');
  // Nearly yours: signed, the paper sent back at least once (contract.js k.round), or the
  // director's meeting after a first no (stories.js recast).
  if (o.signed || (o.contract && (o.contract.round || 0) > 0) || o.meeting) why.push('nearly');
  return why;
}
// `how`: passed (you said no), expired (you never answered), schedule (you were on another set),
// talks (the paper never agreed), meeting (you said no again after the director's meeting).
export function recordPassed(s, o, how) {
  const why = passedWhy(s, o);
  if (!why.length) return null;
  const title = clean(o.projectTitle);
  const list = (s.passedOn = s.passedOn || []);
  // The same part lost twice (a second no after the meeting) is one entry, updated.
  const prev = list.find((x) => x.offerId === o.id || (x.title === title && x.at >= stamp(s) - 6));
  const entry = prev || {};
  Object.assign(entry, {
    offerId: o.id, title, root: clean(o.seriesTitle) || title.replace(/\s+(II|III|IV|V|VI)$/, ''),
    kind: o.kind || 'film', type: o.type || null, genre: o.genre || null, scale: o.scale || null,
    role: o.role || null, tier: o.tier || null, director: o.director || null, with: o.withName || o.with || null,
    season: o.season || 0, part: o.part || 0, salary: o.salary || 0, startAt: o.startAt ?? null,
    at: stamp(s), how, why,
    // What became of it, filled in when a story tells it (stories.js). Unknown until then.
    replacedBy: entry.replacedBy || null, outcome: entry.outcome || null,
  });
  if (!prev) { list.push(entry); if (list.length > PASSED_KEEP) list.splice(0, list.length - PASSED_KEEP); }
  return entry;
}
// A story found out what happened: who has the part, and how it went. Matched on the title,
// newest first — the ledger and the story were both written from the same offer.
export function notePassedOutcome(s, title, facts) {
  const t = clean(title);
  const e = [...(s.passedOn || [])].reverse().find((x) => x.title === t || x.root === t);
  if (!e) return null;
  if (facts.replacedBy && !e.replacedBy) e.replacedBy = facts.replacedBy;
  e.outcome = { ...(e.outcome || {}), ...facts.outcome, at: stamp(s) };
  return e;
}
export function passedOn(s) { return s.passedOn || []; }
