// Two buttons on a person is not a relationship. This is the full menu: what you can
// say to someone, what it costs, and what it can cost you when it lands badly.
//
// Cost model follows the rest of the game: talking is free but you can only lean on the
// same person once a month (engine/cooldown.js); anything that eats an evening costs
// energy. Nothing here is a guaranteed win — that was the "just keep clicking" bug.
import { rint, chance } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { onCooldown, markUsed } from '../../engine/cooldown.js';
import { homeBond, canRaiseChild, HOUSING } from '../../engine/economy.js';
import { askFamilyForMoney } from './family.js';
import { proposeMarriage, tryForBaby } from './dating.js';
import { bondGain } from './relationships.js';

const clamp = (v) => Math.max(0, Math.min(100, v));
const first = (p) => String(p.name || '').split(' ')[0];

// Where a person actually lives on the state, and what they are to you.
export function findPerson(s, id) {
  if (s.partner && s.partner.id === id) return { p: s.partner, kind: 'partner', rel: 'partner' };
  const f = (s.family || []).find((x) => x.id === id && x.alive);
  if (f) {
    const r = f.relation || '';
    const rel = r === 'Spouse' ? 'spouse'
      : (r === 'Mother' || r === 'Father') ? 'parent'
      : (r === 'Brother' || r === 'Sister') ? 'sibling'
      : r === 'Child' ? 'child' : 'grandparent';
    return { p: f, kind: 'family', rel };
  }
  const c = (s.people || []).find((x) => x.id === id);
  if (c) return { p: c, kind: 'contact', rel: 'contact' };
  return null;
}

const isRomantic = (rel) => rel === 'partner' || rel === 'spouse';
// How well something lands: partly you, partly how well they already know you.
function lands(s, p, base) {
  return chance(clamp(base + (s.charisma || 0) * 0.35 + (p.relationship || 0) * 0.18));
}
function move(p, by) { p.relationship = clamp((p.relationship || 0) + by); return by; }

export const GROUPS = [
  { id: 'friendly', label: 'Friendly', tone: 'good' },
  { id: 'romantic', label: 'Romantic', tone: 'love' },
  { id: 'practical', label: 'Practical', tone: 'plain' },
  { id: 'mean', label: 'Mean', tone: 'bad' },
];

export const INTERACTIONS = [
  // ── friendly ────────────────────────────────────────────────────────────────
  { id: 'chat', group: 'friendly', label: 'Chat', blurb: 'Nothing in particular. That is the point.',
    when: () => true,
    run: ({ s, p }) => { const g = move(p, rint(2, 5)); s.mental = clamp(s.mental + 1); return `You and ${first(p)} talked about nothing much. (+${g})`; } },

  { id: 'joke', group: 'friendly', label: 'Tell a joke', blurb: 'Lands or it does not — that is on you',
    when: () => true,
    run: ({ s, p }) => {
      if (lands(s, p, 34)) { const g = move(p, rint(4, 9)); s.mental = clamp(s.mental + 2); return `${first(p)} actually laughed. (+${g})`; }
      const g = move(p, -rint(1, 3)); return `It did not land. ${first(p)} smiled the way people do. (${g})`;
    } },

  { id: 'compliment', group: 'friendly', label: 'Say something kind', blurb: 'Small, sincere, and it works',
    when: () => true,
    run: ({ s, p }) => { const g = move(p, rint(3, 6)); return `You told ${first(p)} something true and kind. (+${g})`; } },

  { id: 'advice', group: 'friendly', label: 'Ask their advice', blurb: 'They have lived longer than this year',
    when: ({ p }) => (p.relationship || 0) >= 25,
    run: ({ s, p }) => {
      const g = move(p, rint(2, 4));
      const key = chance(50) ? 'discipline' : 'confidence';
      s[key] = clamp((s[key] || 0) + rint(1, 3));
      return `${first(p)} told you what they would have done. (${key} +, +${g})`;
    } },

  { id: 'gift', group: 'friendly', label: 'Buy them something', blurb: 'Money into goodwill, honestly',
    cost: ({ kind }) => (kind === 'contact' ? 600 : kind === 'family' ? 220 : 350),
    when: () => true,
    run: ({ s, p, cost }) => { s.cash -= cost; const g = move(p, rint(8, 15)); return `You bought ${first(p)} something they did not expect. €${cost.toLocaleString()}. (+${g})`; } },

  { id: 'evening', group: 'friendly', label: 'Spend the evening together', blurb: 'A whole evening, and it shows', ap: 1,
    when: ({ p }) => (p.relationship || 0) >= 20,
    run: ({ s, p, kind }) => {
      const raw = kind === 'contact' ? bondGain(s, p) : Math.round(rint(5, 11) * homeBond(s));
      const g = move(p, raw); s.mental = clamp(s.mental + rint(2, 5));
      return `A long evening with ${first(p)}. You both needed it. (+${g})`;
    } },

  { id: 'deep', group: 'friendly', label: 'Talk about something real', blurb: 'The conversation you have been avoiding', ap: 1,
    when: ({ p }) => (p.relationship || 0) >= 40,
    run: ({ s, p }) => {
      if (lands(s, p, 45)) { const g = move(p, rint(9, 16)); s.mental = clamp(s.mental + 4); return `You told ${first(p)} the truth about something. It went well. (+${g})`; }
      const g = move(p, -rint(2, 6)); s.mental = clamp(s.mental - 3);
      return `You opened up and ${first(p)} did not know what to do with it. (${g})`;
    } },

  // ── romantic ────────────────────────────────────────────────────────────────
  { id: 'flirt', group: 'romantic', label: 'Flirt', blurb: 'Test the water',
    applies: ({ rel }) => isRomantic(rel),
    run: ({ s, p }) => {
      if (lands(s, p, 30)) { const g = move(p, rint(6, 12)); s.mental = clamp(s.mental + 2); return `${first(p)} flirted right back. (+${g})`; }
      const g = move(p, -rint(2, 5)); return `You misread the room. ${first(p)} changed the subject. (${g})`;
    } },

  { id: 'kiss', group: 'romantic', label: 'Kiss them', blurb: 'No words involved',
    applies: ({ rel }) => isRomantic(rel), when: ({ p }) => (p.relationship || 0) >= 40,
    run: ({ s, p }) => { const g = move(p, rint(5, 10)); s.mental = clamp(s.mental + 3); return `You kissed ${first(p)}. (+${g})`; } },

  { id: 'night', group: 'romantic', label: 'Spend the night together', blurb: 'Needs a place of your own', ap: 1,
    applies: ({ rel }) => isRomantic(rel),
    when: ({ p, s }) => (p.relationship || 0) >= 55 && s.hasApartment,
    lockedWhy: ({ s, p }) => (!s.hasApartment ? 'Not under your parents’ roof — you need a place of your own.'
      : (p.relationship || 0) < 55 ? 'You are not there yet.' : ''),
    run: ({ s, p }) => {
      const g = move(p, Math.round(rint(10, 18) * homeBond(s)));
      s.mental = clamp(s.mental + rint(4, 8));
      return `The night was yours. (+${g})`;
    } },

  { id: 'propose', group: 'romantic', label: 'Propose', blurb: 'The whole question, out loud', ap: 1,
    applies: ({ rel }) => rel === 'partner', when: ({ p }) => (p.relationship || 0) >= 65,
    run: ({ s }) => { proposeMarriage(s); return s.lastEvent; } },

  { id: 'baby', group: 'romantic', label: 'Try for a baby', blurb: 'Needs a room to put them in', ap: 1,
    applies: ({ rel }) => rel === 'spouse',
    lockedWhy: ({ s }) => (!canRaiseChild(s) ? `Not until you have at least a ${HOUSING.flat.label.toLowerCase()}.` : ''),
    run: ({ s }) => { tryForBaby(s); return s.lastEvent; } },

  // ── practical ───────────────────────────────────────────────────────────────
  { id: 'money', group: 'practical', label: 'Ask for money', blurb: 'They will remember that you asked', ap: 1,
    applies: ({ rel }) => rel === 'parent', when: ({ s }) => s.stage !== 'child',
    lockedWhy: ({ s }) => (s.stage === 'child' ? 'You are too young to be asking for cash.' : ''),
    run: ({ s }) => { askFamilyForMoney(s); return s.lastEvent; } },

  { id: 'favour', group: 'practical', label: 'Ask them to put in a word', blurb: 'Spend the goodwill you built', ap: 1,
    applies: ({ kind }) => kind === 'contact', when: ({ p }) => (p.relationship || 0) >= 50,
    run: ({ s, p }) => {
      move(p, -rint(4, 9));   // a favour costs goodwill whether it works or not
      if (chance(clamp(25 + (p.industryWeight || 30) * 0.4 + (p.relationship || 0) * 0.2))) {
        s.flags = s.flags || {}; s.flags.wordPut = (s.flags.wordPut || 0) + 1;
        s.castingBoost = (s.castingBoost || 0) + 1;
        return `${first(p)} made a call for you. Somebody will be expecting your name.`;
      }
      return `${first(p)} said they would see what they could do. They will not.`;
    } },

  // ── mean ────────────────────────────────────────────────────────────────────
  { id: 'argue', group: 'mean', label: 'Pick a fight', blurb: 'Say the thing you have been holding',
    when: () => true,
    run: ({ s, p }) => { const g = move(p, -rint(8, 16)); s.mental = clamp(s.mental - 3); return `You and ${first(p)} said things. (${g})`; } },

  { id: 'blame', group: 'mean', label: 'Blame them', blurb: 'For how any of this turned out',
    when: ({ p }) => (p.relationship || 0) >= 20,
    run: ({ s, p }) => { const g = move(p, -rint(14, 25)); s.mental = clamp(s.mental - 6); return `You told ${first(p)} it was their fault. Some of it was. (${g})`; } },

  { id: 'cutoff', group: 'mean', label: 'Cut them out of your life', blurb: 'Gone, and not coming back',
    applies: ({ kind }) => kind === 'contact',
    run: ({ s, p }) => { s.people = (s.people || []).filter((x) => x.id !== p.id); addTimeline(s, `Cut ${p.name} out of your life.`, true); return `${p.name} is out of your life.`; } },
];

// Two different kinds of "no", and the difference matters:
//   applies — this could never make sense for this person (romance at your mother). Hidden.
//   when    — it makes sense but is not open yet. SHOWN, greyed, with the reason, because
//             "you need a place of your own" is a goal, and hiding it teaches nothing.
export function interactionsFor(s, id) {
  const found = findPerson(s, id);
  if (!found) return [];
  const ctx = { s, ...found };
  return INTERACTIONS.filter((a) => !a.applies || a.applies(ctx)).map((a) => {
    const cost = typeof a.cost === 'function' ? a.cost(ctx) : (a.cost || 0);
    const open = !a.when || a.when(ctx);
    let why = '';
    if (!open) why = (a.lockedWhy && a.lockedWhy(ctx)) || 'Not yet — get closer first.';
    else if (a.lockedWhy && a.lockedWhy(ctx)) why = a.lockedWhy(ctx);
    else if (cost && (s.cash || 0) < cost) why = `You need €${cost.toLocaleString()}.`;
    else if (a.ap && (s.ap || 0) <= 0) why = 'No energy left this period.';
    else if (onCooldown(s, `int:${a.id}:${id}`)) why = 'Already, this month.';
    return { id: a.id, label: a.label, blurb: a.blurb, group: a.group, cost, ap: a.ap || 0, open, why };
  });
}

export function interact(s, personId, actionId) {
  const found = findPerson(s, personId);
  const a = INTERACTIONS.find((x) => x.id === actionId);
  if (!found || !a) return s;
  const ctx = { s, ...found };
  if (a.applies && !a.applies(ctx)) return s;
  if (a.when && !a.when(ctx)) { s.lastEvent = (a.lockedWhy && a.lockedWhy(ctx)) || 'Not yet.'; return s; }
  const cost = typeof a.cost === 'function' ? a.cost(ctx) : (a.cost || 0);
  if (a.lockedWhy && a.lockedWhy(ctx)) { s.lastEvent = a.lockedWhy(ctx); return s; }
  if (cost && (s.cash || 0) < cost) { s.lastEvent = `That costs €${cost.toLocaleString()} and you do not have it.`; return s; }
  if (a.ap && (s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  const key = `int:${a.id}:${personId}`;
  if (onCooldown(s, key)) { s.lastEvent = `You already did that with ${first(found.p)} this month.`; return s; }
  markUsed(s, key);
  if (a.ap) s.ap = (s.ap || 0) - 1;
  const msg = a.run({ ...ctx, cost });
  if (msg) s.lastEvent = msg;
  return s;
}
