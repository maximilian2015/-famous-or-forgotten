// Using your name.
//
// Standing was a ladder you could only climb. Maxi: "respect as a currency — spend it:
// lean on a director for the lead, push a sequel, make a drunk month go away." So it
// spends — and it is not bought, it is USED, which is the difference. Every ask here costs
// standing whether it works or not, because the cost is the asking: you leaned on your
// name, and the business noticed you had to. Spend enough and you drop a rung, and the
// rungs are where the doors are (status.js). That is the whole decision.
//
// Nothing here is a second currency. There is one number, it is the one on the Respect
// screen, and it goes down when you use it.

import { setRespect, quoteFor } from '../meta/status.js';
import { addTimeline } from '../../engine/timeline.js';
import { rint, chance } from '../../engine/rng.js';
import { applyBond } from '../life/bonds.js';
import { maybeContinue } from './franchise.js';
import { comboOf } from '../../engine/combo.js';

const clamp = (v) => Math.max(0, Math.min(100, v));

export const FAVOURS = {
  lead: { id: 'lead', label: 'Ask for the lead', cost: 6, min: 30,
    blurb: 'They have you down for the supporting part. Your name says you could carry it — say so. It costs you the asking either way.' },
  sequel: { id: 'sequel', label: 'Push for a sequel', cost: 8, min: 40,
    blurb: 'The studio said no. A name in the room can change that — if the numbers were close. It costs you the asking either way.' },
  smooth: { id: 'smooth', label: 'Have a word', cost: 5, min: 20,
    blurb: 'The director has gone cold on you this shoot. A conversation, and a little of your name, puts it back where it was.' },
  vouch: { id: 'vouch', label: 'Put in a word for them', cost: 3, min: 25,
    blurb: 'You get them onto something. They will not forget it, and neither will the people you asked.' },
  shelf: { id: 'shelf', label: 'A word with the studio', cost: 10, min: -30,
    blurb: 'The prestige shelf is closed to you. Ten points of what is left of your name opens it once.' },
};
export const FAVOUR_ORDER = ['lead', 'sequel', 'smooth', 'vouch', 'shelf'];

// Can you afford to ask — the rung, and something left to spend.
export function canUse(s, id) {
  const f = FAVOURS[id]; if (!f) return { ok: false, why: '' };
  const r = s.respect || 0;
  if (r < f.min) return { ok: false, why: `Nobody takes that call from a name under ${f.min}.` };
  if (r - f.cost < -40) return { ok: false, why: 'There is nothing left of your name to spend.' };
  return { ok: true, why: '' };
}
function spend(s, id, what) {
  const f = FAVOURS[id];
  setRespect(s, (s.respect || 0) - f.cost);
  s.nameSpent = (s.nameSpent || 0) + f.cost;
  addTimeline(s, `${what} — ${f.cost} standing.`);
}

// ── Ask for the lead: a supporting listing on the board becomes a lead ──
export function askForLead(s, castingId) {
  const c = (s.castingPool || []).find((x) => x.id === castingId);
  if (!c || c.role === 'Lead' || c.perEpisode) { s.lastEvent = 'There is no lead to ask for on that one.'; return s; }
  const fit = canUse(s, 'lead'); if (!fit.ok) { s.lastEvent = fit.why; return s; }
  spend(s, 'lead', `Asked to be read for the lead on ${c.title}`);
  // Your standing is the argument; a name under forty is arguing uphill.
  const odds = clamp(30 + ((s.respect || 0) + 6 - 40) * 1.2);
  if (!chance(odds)) {
    s.lastEvent = `You asked. They said no — politely, and they will remember you asked. The supporting part is still yours to read for.`;
    return s;
  }
  c.role = 'Lead'; c.share = 1; c.askedLead = true;
  c.salary = Math.round((quoteFor(s, c.medium) || c.salary) * (c.feeFactor || 1));
  s.lastEvent = `They will read you for the lead on ${c.title}. The part is bigger, and so is the fee.`;
  addTimeline(s, `${c.title}: they agreed to read you for the lead.`);
  return s;
}

// ── Push for a sequel: the studio said no; a name in the room says otherwise ──
export function canPushSequel(s, creditId) {
  const c = (s.filmography || []).find((x) => x.id === creditId);
  return !!(c && c.pushable && c.job && !c.pushed);
}
export function pushSequel(s, creditId) {
  const c = (s.filmography || []).find((x) => x.id === creditId);
  if (!c || !c.pushable || !c.job) { s.lastEvent = 'There is nothing to push for there.'; return s; }
  const fit = canUse(s, 'sequel'); if (!fit.ok) { s.lastEvent = fit.why; return s; }
  spend(s, 'sequel', `Pushed the studio for a sequel to ${c.title}`);
  c.pushed = true;
  // Close numbers can be pushed over the line. A bomb cannot.
  const odds = c.verdict === 'bomb' ? 8 : c.verdict === 'broke even' ? 45 : 70;
  if (!chance(odds)) { s.lastEvent = `You pushed. The studio was kind about it, and the answer was still no.`; return s; }
  const next = maybeContinue(s, c, c.job, true);
  if (next) (s.offers = s.offers || []).push(next);
  s.lastEvent = `You pushed, and it worked: ${c.title} is getting another one. It will be years, like they all are.`;
  c.pushable = false;
  return s;
}

// ── Have a word: a director who cooled this shoot, warmed back ──
export function canSmooth(s) {
  const p = s.production; if (!p) return false;
  const lead = (p.crew || [])[0];
  return !!(lead && lead.bond < (lead.bond0 ?? lead.bond) && !p._smoothed);
}
export function smoothOver(s) {
  if (!canSmooth(s)) { s.lastEvent = 'There is nothing to smooth over.'; return s; }
  const fit = canUse(s, 'smooth'); if (!fit.ok) { s.lastEvent = fit.why; return s; }
  const p = s.production, lead = p.crew[0];
  spend(s, 'smooth', `Had a word with ${lead.name} about the set`);
  lead.bond = Math.max(lead.bond, lead.bond0 ?? lead.bond);
  p._winged = 0; p._smoothed = true;
  s.lastEvent = `Dinner, an apology that did not use the word, and ${lead.name} is back where they were with you. Once per shoot.`;
  return s;
}

// ── Put in a word: somebody you know gets onto something ──
export function vouchFor(s, personId) {
  const p = (s.people || []).find((x) => x.id === personId);
  if (!p) return s;
  if (p.vouchedAt && (s.year || 0) * 12 + (s.month || 0) - p.vouchedAt < 24) { s.lastEvent = `You already did that for ${p.name.split(' ')[0]}. Twice in two years is a pattern.`; return s; }
  const fit = canUse(s, 'vouch'); if (!fit.ok) { s.lastEvent = fit.why; return s; }
  spend(s, 'vouch', `Put in a word for ${p.name}`);
  p.vouchedAt = (s.year || 0) * 12 + (s.month || 0);
  p.owes = true;   // the quests read this
  const moved = applyBond(s, p, rint(10, 16));
  s.lastEvent = `You got ${p.name.split(' ')[0]} onto something. They know exactly what it cost you. (+${moved})`;
  return s;
}

// ── A word with the studio: the face buys one prestige listing ──
export function canOpenShelf(s) { return comboOf(s) === 'face' && !(s.castingPool || []).some((c) => c.openedByName); }
export function openShelf(s, addPrestige) {
  if (!canOpenShelf(s)) { s.lastEvent = 'The shelf is open to you already, or it is not that kind of closed.'; return s; }
  const fit = canUse(s, 'shelf'); if (!fit.ok) { s.lastEvent = fit.why; return s; }
  spend(s, 'shelf', 'Had a word with the studio about the prestige shelf');
  const c = addPrestige(s);
  if (c) { c.openedByName = true; s.lastEvent = `One prestige listing, on the board because you asked: ${c.title}. Nobody is pretending otherwise.`; }
  else s.lastEvent = 'They took the call. There was nothing on the shelf this month.';
  return s;
}
