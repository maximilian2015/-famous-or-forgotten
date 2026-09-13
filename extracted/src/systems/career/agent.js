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

const FIRST = ['Lena', 'Marcus', 'Ines', 'Theo', 'Priya', 'Jonas', 'Ruth', 'Casper', 'Amara', 'Felix'];
const LAST = ['Voss', 'Adeyemi', 'Kowalski', 'Brandt', 'Okafor', 'Lindqvist', 'Moreau', 'Haddad', 'Nakamura', 'Steen'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

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
  return { name: `${pick(FIRST)} ${pick(LAST)}`, tier };
}
export function signAgent(s, o) {
  const tier = (o && o.tier) || tierFor(s) || 'novice';
  s.agent = { name: (o && o.name) || offerAgent(s).name, tier, level: 1, since: (s.year || 0) * 12 + (s.month || 0) };
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
  s.agent = null;
  s._agentCool = (s.year || 0) * 12 + (s.month || 0) + 3;
  return s;
}
// Work money, net of the agent's cut. Wages from a day job are not agented.
export function paid(s, amount, note) {
  const cut = agentCut(s);
  if (!cut || amount <= 0) { earn(s, amount, note); return amount; }
  const net = Math.round(amount * (1 - cut));
  earn(s, net, `${note} (after ${s.agent.name}'s ${Math.round(cut * 100)}%)`);
  return net;
}
// Monthly. The agent leaves the liability, and moves you up a desk when you have earned it.
export function agentTick(s) {
  if (!hasAgent(s)) return;
  if (agentDropped(s)) {
    const name = s.agent.name;
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
