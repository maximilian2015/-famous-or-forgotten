import { COST, canAfford, spend, tooTired } from '../../engine/energy.js';
// Two buttons on a person is not a relationship. This is the full menu: what you can
// say to someone, what it costs, and what it can cost you when it lands badly.
//
// Cost model follows the rest of the game: talking is free but you can only lean on the
// same person once a month (engine/cooldown.js); anything that eats an evening costs
// energy. Nothing here is a guaranteed win — that was the "just keep clicking" bug.
import { rint, chance, pick } from '../../engine/rng.js';
import { uid } from '../../engine/id.js';
import { addTimeline } from '../../engine/timeline.js';
import { onCooldown, markUsed } from '../../engine/cooldown.js';
import { homeBond, canRaiseChild, HOUSING } from '../../engine/economy.js';
import { askFamilyForMoney } from './family.js';
import { proposeMarriage, tryForBaby, WANTS } from './dating.js';
import { bondGain, contactAge } from './relationships.js';
import { genderOfName } from '../world/names.js';
import { applyBond } from './bonds.js';
import { canSupport, support, canBack, backChild, supportCost, backingCost } from './money.js';

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
// ── a contact becomes something else ─────────────────────────────────────────
// Maxi: "Piet, a director, closeness 94 — and there is nothing: no starting a relationship,
// no kiss, no moving in, no marrying. I thought all of that was already there." It was, for
// people from the Dating app. A director you spent six months with was a number and a
// favour. Now a contact can be flirted with, kissed, and asked out; if they say yes they
// become your partner — the same partner the Dating app makes, so moving in, the proposal
// and the wedding all work — and they keep their place in your phone as the director they
// are. A director or a producer on your arm is also somebody who can put you in a room
// (dating.js connected), and every set you get that way will know it.
const spouseOf = (s) => (s.family || []).find((x) => x.relation === 'Spouse' && x.alive);
const taken = (s) => !!(s.partner || spouseOf(s));
const takenWhy = (s) => { const who = s.partner || spouseOf(s); return who ? `You are with ${first(who)}.` : ''; };
const seeing = (s, p) => !!(s.partner && s.partner.contactId === p.id);
const abs = (s) => (s.year || 0) * 12 + (s.month || 0);
// Not for a year after a no. The person remembers.
const rebuffed = (s, p) => p.rebuffedAt != null && abs(s) - p.rebuffedAt < 12;
function partnerFromContact(s, p) {
  const weight = p.industryWeight || 30;
  const wants = /Director|Producer|Executive|Star|Icon/.test(p.role || '') ? (chance(55) ? 'ambitious' : pick(['thelife', 'quiet', 'family'])) : pick(Object.keys(WANTS));
  const means = weight >= 80 ? 'serious' : weight >= 60 ? 'money' : 'ordinary';
  const age = contactAge(s, p) ?? Math.max(18, (s.ageY || 25) + rint(-5, 12));
  const w = WANTS[wants];
  return {
    id: uid(s, 'date'), contactId: p.id, name: p.name, gender: p.gender || genderOfName(p.name) || 'female', age,
    job: String(p.role || 'in the business').toLowerCase(), charm: rint(45, 90),
    // You already know each other. This is not a first evening — it starts warm, not at zero.
    relationship: Math.round(Math.min(70, (p.relationship || 40) * 0.72)), dates: 2, means, wants,
    patience: rint(w.patience[0], w.patience[1]), livingTogether: false, married: false,
    industryWeight: weight, fromContact: true, since: abs(s),
  };
}
// How well something lands: partly you, partly how well they already know you.
function lands(s, p, base) {
  return chance(clamp(base + (s.charisma || 0) * 0.35 + (p.relationship || 0) * 0.18));
}
// Everything routes through applyBond so the diminishing-returns, resistance and
// decay rules cannot be sidestepped by adding a new interaction later.
function move(s, p, by) { return applyBond(s, p, by); }

export const GROUPS = [
  { id: 'friendly', label: 'Friendly', tone: 'good' },
  { id: 'romantic', label: 'Romantic', tone: 'love' },
  { id: 'practical', label: 'Practical', tone: 'plain' },
  { id: 'mean', label: 'Mean', tone: 'bad' },
];

export const INTERACTIONS = [
  // ── friendly ────────────────────────────────────────────────────────────────
  { id: 'chat', group: 'friendly', label: 'Chat', blurb: 'Nothing in particular. That is the point.', ap: COST.chat,
    when: () => true,
    run: ({ s, p }) => { const g = move(s, p,rint(2, 5)); s.mental = clamp(s.mental + 1); return `You and ${first(p)} talked about nothing much. (+${g})`; } },

  { id: 'joke', group: 'friendly', label: 'Tell a joke', blurb: 'Lands or it does not — that is on you', ap: COST.joke,
    when: () => true,
    run: ({ s, p }) => {
      if (lands(s, p, 34)) { const g = move(s, p,rint(4, 9)); s.mental = clamp(s.mental + 2); return `${first(p)} actually laughed. (+${g})`; }
      const g = move(s, p,-rint(1, 3)); return `It did not land. ${first(p)} smiled the way people do. (${g})`;
    } },

  { id: 'compliment', group: 'friendly', label: 'Say something kind', blurb: 'Small, sincere, and it works', ap: COST.kind,
    when: () => true,
    run: ({ s, p }) => { const g = move(s, p,rint(3, 6)); return `You told ${first(p)} something true and kind. (+${g})`; } },

  { id: 'advice', group: 'friendly', label: 'Ask their advice', blurb: 'They have lived longer than this year', ap: COST.advice,
    when: ({ p }) => (p.relationship || 0) >= 25,
    run: ({ s, p }) => {
      const g = move(s, p,rint(2, 4));
      const key = chance(50) ? 'discipline' : 'confidence';
      s[key] = clamp((s[key] || 0) + rint(1, 3));
      return `${first(p)} told you what they would have done. (${key} +, +${g})`;
    } },

  // A €220 present from somebody with nine million in the bank is not a present, it is an
  // insult with a ribbon on. What you spend scales with what you have — and so does what it
  // moves, up to a point, because past that point it stops being about the money.
  { id: 'gift', group: 'friendly', label: 'Buy them something', blurb: 'Money into goodwill, honestly',
    cost: ({ s, kind }) => {
      const base = kind === 'contact' ? 600 : kind === 'family' ? 220 : 350;
      return Math.max(base, Math.round(Math.min(120000, (s.cash || 0) * 0.004)));
    },
    when: () => true,
    run: ({ s, p, cost }) => {
      s.cash -= cost;
      // Generosity is worth something and it is not worth everything: the extra a fortune
      // buys you tops out fast, and applyBond's resistance takes most of the rest.
      const lavish = Math.min(6, Math.round(Math.log10(Math.max(1, cost / 300)) * 4));
      const g = move(s, p, rint(8, 15) + lavish);
      return `You bought ${first(p)} something they did not expect. €${cost.toLocaleString()}. (+${g})`;
    } },

  { id: 'evening', group: 'friendly', label: 'Spend the evening together', blurb: 'A whole evening, and it shows', ap: COST.evening,
    when: ({ p }) => (p.relationship || 0) >= 20,
    run: ({ s, p, kind }) => {
      const raw = kind === 'contact' ? bondGain(s, p) : Math.round(rint(5, 11) * homeBond(s));
      const g = move(s, p,raw); s.mental = clamp(s.mental + rint(2, 5));
      return `A long evening with ${first(p)}. You both needed it. (+${g})`;
    } },

  { id: 'deep', group: 'friendly', label: 'Talk about something real', blurb: 'The conversation you have been avoiding', ap: COST.realTalk,
    when: ({ p }) => (p.relationship || 0) >= 40,
    run: ({ s, p }) => {
      if (lands(s, p, 45)) { const g = move(s, p,rint(9, 16)); s.mental = clamp(s.mental + 4); return `You told ${first(p)} the truth about something. It went well. (+${g})`; }
      const g = move(s, p,-rint(2, 6)); s.mental = clamp(s.mental - 3);
      return `You opened up and ${first(p)} did not know what to do with it. (${g})`;
    } },

  // ── romantic ────────────────────────────────────────────────────────────────
  { id: 'flirt', group: 'romantic', label: 'Flirt', blurb: 'Test the water', ap: COST.chat,
    applies: ({ rel }) => isRomantic(rel),
    run: ({ s, p }) => {
      if (lands(s, p, 30)) { const g = move(s, p,rint(6, 12)); s.mental = clamp(s.mental + 2); return `${first(p)} flirted right back. (+${g})`; }
      const g = move(s, p,-rint(2, 5)); return `You misread the room. ${first(p)} changed the subject. (${g})`;
    } },

  { id: 'kiss', group: 'romantic', label: 'Kiss them', blurb: 'No words involved', ap: COST.chat,
    applies: ({ rel }) => isRomantic(rel), when: ({ p }) => (p.relationship || 0) >= 40,
    run: ({ s, p }) => { const g = move(s, p,rint(5, 10)); s.mental = clamp(s.mental + 3); return `You kissed ${first(p)}. (+${g})`; } },

  { id: 'night', group: 'romantic', label: 'Spend the night together', blurb: 'Needs a place of your own', ap: COST.evening,
    applies: ({ rel }) => isRomantic(rel),
    when: ({ p, s }) => (p.relationship || 0) >= 55 && s.hasApartment,
    lockedWhy: ({ s, p }) => (!s.hasApartment ? 'Not under your parents’ roof — you need a place of your own.'
      : (p.relationship || 0) < 55 ? 'You are not there yet.' : ''),
    run: ({ s, p }) => {
      const g = move(s, p,Math.round(rint(10, 18) * homeBond(s)));
      s.mental = clamp(s.mental + rint(4, 8));
      return `The night was yours. (+${g})`;
    } },

  // A contact. Three steps, each one a question they can say no to, and a year's silence
  // after a no. Once they say yes, the rest of it lives on the partner (the Dating app and
  // this same menu): the evenings, moving in, the proposal.
  { id: 'flirtContact', group: 'romantic', label: 'Flirt', blurb: 'See if there is anything there', ap: COST.chat,
    applies: ({ kind, s, p }) => kind === 'contact' && !seeing(s, p),
    when: ({ s, p }) => !taken(s) && !rebuffed(s, p) && (p.relationship || 0) >= 30,
    lockedWhy: ({ s, p }) => (taken(s) ? takenWhy(s) : rebuffed(s, p) ? `${first(p)} said no. Not for a while.` : (p.relationship || 0) < 30 ? 'You barely know each other.' : ''),
    run: ({ s, p }) => {
      if (lands(s, p, 24 + (s.looks || 0) * 0.15)) { p.spark = (p.spark || 0) + 1; const g = move(s, p, rint(4, 9)); s.mental = clamp(s.mental + 2); return `${first(p)} held the look a second longer than they needed to. (+${g})`; }
      const g = move(s, p, -rint(1, 4)); return `${first(p)} laughed — kindly, and moved on. (${g})`;
    } },

  { id: 'kissContact', group: 'romantic', label: 'Kiss them', blurb: 'After the wrap party, or somewhere like it', ap: COST.chat,
    applies: ({ kind, s, p }) => kind === 'contact' && !seeing(s, p),
    when: ({ s, p }) => !taken(s) && !rebuffed(s, p) && (p.relationship || 0) >= 60,
    lockedWhy: ({ s, p }) => (taken(s) ? takenWhy(s) : rebuffed(s, p) ? `${first(p)} stepped back last time. Not for a while.` : (p.relationship || 0) < 60 ? 'Not there yet. Sixty, and a flirt that landed.' : ''),
    run: ({ s, p }) => {
      if (lands(s, p, 8 + (p.spark || 0) * 12 + (s.looks || 0) * 0.15)) { p.kissed = true; const g = move(s, p, rint(6, 12)); s.mental = clamp(s.mental + 4); return `You kissed ${first(p)}, and ${first(p)} kissed you back. (+${g})`; }
      p.rebuffedAt = abs(s); const g = move(s, p, -rint(6, 12)); s.mental = clamp(s.mental - 3);
      addTimeline(s, `${p.name} stepped back. It is going to be strange on set for a while.`, true);
      return `${first(p)} stepped back. Kindly, but back. (${g})`;
    } },

  { id: 'askOutContact', group: 'romantic', label: 'Ask them out', blurb: 'Properly. Not a drink after work', ap: COST.ask,
    applies: ({ kind, s, p }) => kind === 'contact' && !seeing(s, p),
    when: ({ s, p }) => !taken(s) && !rebuffed(s, p) && (p.kissed || (p.relationship || 0) >= 85),
    lockedWhy: ({ s, p }) => (taken(s) ? takenWhy(s) : rebuffed(s, p) ? `${first(p)} said no. Not for a while.` : !(p.kissed || (p.relationship || 0) >= 85) ? 'A kiss first — or be so close it does not need one.' : ''),
    run: ({ s, p }) => {
      if (lands(s, p, (p.kissed ? 30 : 10) + (s.looks || 0) * 0.1)) {
        s.partner = partnerFromContact(s, p);
        const g = move(s, p, rint(4, 8));
        addTimeline(s, `Started seeing ${p.name} — ${String(p.role || '').toLowerCase()}.`);
        return `${first(p)} said yes. You are seeing each other now — and the whole business will know by Thursday. (+${g})`;
      }
      p.rebuffedAt = abs(s); const g = move(s, p, -rint(4, 9)); s.mental = clamp(s.mental - 4);
      return `${first(p)} thought about it, and said it would be a mistake. (${g})`;
    } },

  { id: 'propose', group: 'romantic', label: 'Propose', blurb: 'The whole question, out loud', ap: COST.ask,
    applies: ({ rel }) => rel === 'partner', when: ({ p }) => (p.relationship || 0) >= 65,
    run: ({ s }) => { proposeMarriage(s); return s.lastEvent; } },

  { id: 'baby', group: 'romantic', label: 'Try for a baby', blurb: 'Needs a room to put them in', ap: COST.ask,
    applies: ({ rel }) => rel === 'spouse',
    lockedWhy: ({ s }) => (!canRaiseChild(s) ? `Not until you have at least a ${HOUSING.flat.label.toLowerCase()}.` : ''),
    run: ({ s }) => { tryForBaby(s); return s.lastEvent; } },

  // ── practical ───────────────────────────────────────────────────────────────
  // The two things real money can do for the people you came from. Both are one-off, both
  // are scaled to what you have, and neither of them is a substitute for turning up — see
  // systems/life/money.js.
  { id: 'setup', group: 'practical', label: 'Set them up for life', blurb: 'They never have to worry about it again',
    applies: ({ kind, rel }) => kind === 'family' && ['parent', 'sibling', 'child'].includes(rel),
    cost: ({ s }) => supportCost(s),
    when: ({ s, p }) => canSupport(s, p).ok || !!p.supported,
    lockedWhy: ({ s, p }) => (p.supported ? `${first(p)} is already set up.` : canSupport(s, p).why),
    run: ({ s, p }) => { support(s, p.id); return s.lastEvent; } },

  { id: 'teach', group: 'practical', label: 'Pay for them to be taught properly', blurb: 'Coaching, the right school, the right rooms',
    applies: ({ rel }) => rel === 'child',
    cost: ({ s }) => backingCost(s),
    when: ({ s, p }) => canBack(s, p).ok,
    lockedWhy: ({ s, p }) => canBack(s, p).why,
    run: ({ s, p }) => { backChild(s, p.id); return s.lastEvent; } },

  { id: 'money', group: 'practical', label: 'Ask for money', blurb: 'They will remember that you asked', ap: COST.ask,
    applies: ({ rel }) => rel === 'parent', when: ({ s }) => s.stage !== 'child',
    lockedWhy: ({ s }) => (s.stage === 'child' ? 'You are too young to be asking for cash.' : ''),
    run: ({ s, p }) => { askFamilyForMoney(s, p.id); return s.lastEvent; } },

  { id: 'favour', group: 'practical', label: 'Ask them to put in a word', blurb: 'Spend the goodwill you built', ap: COST.ask,
    applies: ({ kind }) => kind === 'contact', when: ({ p }) => (p.relationship || 0) >= 50,
    run: ({ s, p }) => {
      move(s, p,-rint(4, 9));   // a favour costs goodwill whether it works or not
      if (chance(clamp(25 + (p.industryWeight || 30) * 0.4 + (p.relationship || 0) * 0.2))) {
        s.flags = s.flags || {}; s.flags.wordPut = (s.flags.wordPut || 0) + 1;
        s.castingBoost = (s.castingBoost || 0) + 1;
        return `${first(p)} made a call for you. Somebody will be expecting your name.`;
      }
      return `${first(p)} said they would see what they could do. They will not.`;
    } },

  // ── mean ────────────────────────────────────────────────────────────────────
  { id: 'argue', group: 'mean', label: 'Pick a fight', blurb: 'Say the thing you have been holding', ap: COST.apology,
    when: () => true,
    run: ({ s, p }) => { const g = move(s, p,-rint(8, 16)); s.mental = clamp(s.mental - 3); return `You and ${first(p)} said things. (${g})`; } },

  { id: 'blame', group: 'mean', label: 'Blame them', blurb: 'For how any of this turned out', ap: COST.chat,
    when: ({ p }) => (p.relationship || 0) >= 20,
    run: ({ s, p }) => { const g = move(s, p,-rint(14, 25)); s.mental = clamp(s.mental - 6); return `You told ${first(p)} it was their fault. Some of it was. (${g})`; } },

  { id: 'cutoff', group: 'mean', label: 'Cut them out of your life', blurb: 'Gone, and not coming back',
    applies: ({ kind }) => kind === 'contact',
    run: ({ s, p }) => {
      // Cutting your agent out of your life is firing them, with the same cooling-off.
      if (p.agent && s.agent) { s.agent = null; s._agentCool = (s.year || 0) * 12 + (s.month || 0) + 3; }
      s.people = (s.people || []).filter((x) => x.id !== p.id); addTimeline(s, `Cut ${p.name} out of your life.`, true); return `${p.name} is out of your life.`; } },
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
    else if (a.ap && !canAfford(s, a.ap)) why = tooTired(s, a.ap);
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
  if (a.ap && !canAfford(s, a.ap)) { s.lastEvent = tooTired(s, a.ap); return s; }
  const key = `int:${a.id}:${personId}`;
  if (onCooldown(s, key)) { s.lastEvent = `You already did that with ${first(found.p)} this month.`; return s; }
  markUsed(s, key);
  // You saw them. The drift (meta/price.js) leaves alone anybody you have been in touch
  // with in the last half-year — which is the whole answer to it.
  (s._seen = s._seen || {})[personId] = (s.year || 0) * 12 + (s.month || 0);
  if (a.ap) spend(s, a.ap);
  const msg = a.run({ ...ctx, cost });
  if (msg) s.lastEvent = msg;
  return s;
}
