// The agent.
//
// Five places in the game read `s.agent` and not one of them ever wrote it. The Known
// Face rung promised "an agent starts bringing you things at 40", the negotiation had
// four tiers of agent reach, Messages named the agent as the sender of every offer, and
// access.js gated the good offers on `agentReach` — and no player in the history of the
// game has ever had an agent, because there was no way to get one. The actor's actor's
// "an agent will take you at standing 50" was a promise about a door that did not exist.
//
// So: an agent approaches you when you are worth representing, and asks. They take a cut
// of every fee, they bring offers (offers.js reads agentReach), they reach further at the
// table (negotiate.js reads the tier), and they leave when you become the liability —
// nobody keeps a client the studios will not insure. When you are off that rung, somebody
// else asks.

import { earn } from '../../engine/economy.js';
import { addTimeline } from '../../engine/timeline.js';
import { agentTakesYou, agentDropped, comboOf } from '../meta/standing.js';
import { hasHit } from './access.js';

// The four desks, from negotiate.js's AGENT_REACH. `cut` is what they take.
export const AGENT_TIERS = {
  novice: { label: 'A small agency', cut: 0.10, blurb: 'Two rooms above a dry cleaner. They answer the phone, which is more than you had.' },
  solid:  { label: 'A proper agency', cut: 0.10, blurb: 'A desk with your name on it, and a person whose job is saying it in rooms you are not in.' },
  strong: { label: 'The big agency', cut: 0.12, blurb: 'They package films. Your name goes in the package.' },
  legend: { label: 'The desk at the top', cut: 0.15, blurb: 'One agent, nine clients, and every studio head has their number.' },
};
const ORDER = ['novice', 'solid', 'strong', 'legend'];

import { personName, namesInUse } from '../world/names.js';
import { uid } from '../../engine/id.js';

// Which desk would take you today. The entry is fame 40 — or standing 50 for the actor's
// actor, who gets an agent before the public has heard of them.
export function tierFor(s) {
  const f = s.fame || 0;
  if (f >= 90 || (f >= 80 && hasHit(s))) return 'legend';
  if (f >= 75) return 'strong';
  if (f >= 55) return 'solid';
  if (f >= 40 || agentTakesYou(s)) return 'novice';
  return null;
}
export function hasAgent(s) { return !!(s.agent && s.agent.level > 0); }
export function agentCut(s) { return hasAgent(s) ? (AGENT_TIERS[s.agent.tier] || AGENT_TIERS.novice).cut : 0; }
// Somebody wants to represent you: worth a desk, not already represented, not the
// liability, and not asked in the last little while.
export function agentWantsYou(s) {
  if (hasAgent(s) || agentDropped(s)) return false;
  const now = (s.year || 0) * 12 + (s.month || 0);
  if ((s._agentCool || 0) > now) return false;
  return tierFor(s) != null;
}
export function offerAgent(s) {
  const tier = tierFor(s) || 'novice';
  return { name: personName(Math.random() < 0.5 ? 'female' : 'male', namesInUse(s)), tier };
}
// The agent is a person in your phone like anybody else — Contacts, under "Your agent" —
// so there is one place to find them, talk to them, and see what the desk is doing. Maxi:
// "where do I find the agent — in email, in messages, in People?" Here.
const AGENT_WEIGHT = { novice: 45, solid: 60, strong: 78, legend: 92 };
function agentIntoContacts(s) {
  s.people = (s.people || []).filter((p) => !p.agent);
  s.people.unshift({ id: uid(s, 'p'), name: s.agent.name, role: 'Agent', agent: true, industryWeight: AGENT_WEIGHT[s.agent.tier] || 45,
    relationship: 50, met: `${s.year}`, lastSeen: (s.year || 0) * 12 + (s.month || 0) });
}
function agentOutOfContacts(s, name) {
  const gone = (s.people || []).find((p) => p.agent);
  if (!gone) return;
  // A former agent stays a contact, colder, under their real role. The business is small.
  gone.agent = false; gone.role = 'Former agent'; gone.relationship = Math.min(gone.relationship || 40, 30);
}
export function signAgent(s, o) {
  const tier = (o && o.tier) || tierFor(s) || 'novice';
  s.agent = { name: (o && o.name) || offerAgent(s).name, tier, level: 1, since: (s.year || 0) * 12 + (s.month || 0) };
  agentIntoContacts(s);
  addTimeline(s, `${s.agent.name} is your agent now. ${AGENT_TIERS[tier].label}, ${Math.round(AGENT_TIERS[tier].cut * 100)}% of everything.`);
  return s;
}
export function declineAgent(s) {
  s._agentCool = (s.year || 0) * 12 + (s.month || 0) + 6;
  return s;
}
export function fireAgent(s) {
  if (!hasAgent(s)) return s;
  addTimeline(s, `You let ${s.agent.name} go.`);
  agentOutOfContacts(s, s.agent.name);
  s.agent = null;
  s._agentCool = (s.year || 0) * 12 + (s.month || 0) + 3;
  return s;
}
// Work money, net of the agent's cut. Wages from a day job are not agented.
// What a fee is worth once the agent and the taxman have had theirs. Income tax was never
// taken — a perfect player banked seven hundred million and money meant nothing. A third
// above a small threshold, the way a working actor's accountant would put it.
export const TAX_FREE = 30000, TAX_RATE = 0.34;
export function taxOn(amount) { return amount <= TAX_FREE ? 0 : Math.round((amount - TAX_FREE) * TAX_RATE); }
export function paid(s, amount, note) {
  const cut = agentCut(s);
  if (amount <= 0) { earn(s, amount, note); return amount; }
  const afterAgent = Math.round(amount * (1 - (cut || 0)));
  const tax = taxOn(afterAgent);
  const net = afterAgent - tax;
  s.taxPaid = (s.taxPaid || 0) + tax;
  const parts = [cut ? `${s.agent.name}'s ${Math.round(cut * 100)}%` : null, tax ? `${Math.round(tax / 1000).toLocaleString()}k tax` : null].filter(Boolean);
  earn(s, net, parts.length ? `${note} (after ${parts.join(' and ')})` : note);
  return net;
}
// Monthly. The agent leaves the liability, and moves you up a desk when you have earned it.
export function agentTick(s) {
  if (!hasAgent(s)) return;
  if (agentDropped(s)) {
    const name = s.agent.name;
    agentOutOfContacts(s, name);
    s.agent = null;
    s._agentCool = (s.year || 0) * 12 + (s.month || 0) + 4;
    addTimeline(s, `${name} has stopped returning your calls. Nobody keeps a client the studios will not insure.`, true);
    s.lastEvent = `${name} is not your agent any more. There was no conversation about it — the calls simply stopped being returned. Get off the Avoided rung and somebody else will ask.`;
    return;
  }
  const want = tierFor(s);
  if (want && ORDER.indexOf(want) > ORDER.indexOf(s.agent.tier)) {
    const from = AGENT_TIERS[s.agent.tier], to = AGENT_TIERS[want];
    s.agent.tier = want;
    const me = (s.people || []).find((p) => p.agent); if (me) me.industryWeight = AGENT_WEIGHT[want] || me.industryWeight;
    addTimeline(s, `${s.agent.name} moved you up: ${from.label.toLowerCase()} to ${to.label.toLowerCase()}.${to.cut !== from.cut ? ` They take ${Math.round(to.cut * 100)}% now.` : ''}`);
  }
}
// For the strip in Messages.
export function agentLine(s) {
  if (!hasAgent(s)) return null;
  const t = AGENT_TIERS[s.agent.tier] || AGENT_TIERS.novice;
  const c = comboOf(s);
  const doing = c === 'craft' ? 'sending you parts your fame does not justify yet'
    : (s.fame || 0) >= 40 ? 'bringing you offers, and reaching further at the table' : 'answering the phone';
  return { name: s.agent.name, desk: t.label, cut: Math.round(t.cut * 100), doing, blurb: t.blurb };
}
