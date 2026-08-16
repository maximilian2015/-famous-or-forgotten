// Below a certain standing nobody asks you what you want — you are told the number.
// From Star upwards the number becomes an opening position, and the band that was
// already rolling your fee quietly becomes the thing you are arguing inside of.
//
// Nothing here invents new money. Your band is your band; negotiation decides where
// in it you land, and how far past it you dare to reach.
import { chance, rint } from '../../engine/rng.js';
import { fameTier, quoteBand } from '../meta/status.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Star and above. Under that you are not in a position to ask for anything.
export const NEGOTIATE_FROM = 'star';
export function canNegotiate(s) {
  const order = ['unknown', 'rising', 'known', 'star', 'alist', 'icon'];
  return order.indexOf(fameTier(s.fame).id) >= order.indexOf(NEGOTIATE_FROM);
}

// How far past the top of your own band you can reach. On your own you can lean on
// them a little; everything beyond that is what representation actually buys.
export const AGENT_REACH = { none: 1.15, novice: 1.3, solid: 1.45, strong: 1.7, legend: 2.2 };
export function reachOf(s) { return AGENT_REACH[s.agent?.tier] ?? AGENT_REACH.none; }

// Everything the UI needs to draw the negotiation, and everything haggle() needs to
// resolve it. `quoted` is what they opened with; `ceiling` is the most you could ever
// get out of them; `walkAway` is where they stop taking you seriously.
export function negotiationFor(s, job) {
  const band = quoteBand(s, job.medium);
  if (!band || !canNegotiate(s)) return null;
  const unit = job.perEpisode ? (job.episodeFee || 0) : (job.salary || 0);
  if (unit <= 0) return null;
  const share = job.share || 1;
  const bandTop = Math.round(band[1] * share);
  const ceiling = Math.round(bandTop * reachOf(s));
  return {
    quoted: unit, bandTop, ceiling,
    perEpisode: !!job.perEpisode,
    // Three real positions rather than a slider nobody understands. They are placed
    // against YOUR reachable range, so all three stay meaningful whoever you are:
    // a nudge, everything you are worth, and more than anyone can get you.
    asks: [
      { id: 'fair', label: 'Ask for a little more', amount: Math.max(unit + 1, Math.round((unit + bandTop) / 2)) },
      { id: 'push', label: 'Ask for everything you are worth', amount: Math.max(unit + 2, bandTop) },
      { id: 'star', label: 'Name a number nobody has paid you', amount: Math.max(unit + 3, Math.round(ceiling * 1.25)) },
    ].filter((a) => a.amount > unit),
  };
}

// The odds. Asking for what you are worth usually works; asking for more than anyone
// is worth usually does not, and the further past the ceiling you go the more likely
// they simply stop returning calls.
export function haggleOdds(s, job, amount) {
  const n = negotiationFor(s, job);
  if (!n) return { accept: 0, walk: 100 };
  const overQuote = (amount - n.quoted) / Math.max(1, n.ceiling - n.quoted);
  const overCeiling = Math.max(0, (amount - n.ceiling) / Math.max(1, n.ceiling));
  let accept = 88 - clamp(overQuote, 0, 1) * 46 - overCeiling * 90;
  accept += ((s.charisma || 0) - 50) * 0.22;
  accept += ((s.respect || 0) - 40) * 0.12;
  if ((s.scandal || 0) > 25) accept -= 10;
  // The bigger the machine, the less it needs you specifically.
  if (job.scale === 'blockbuster' || job.scale === 'prestige') accept -= 6;
  accept = clamp(Math.round(accept), 3, 96);
  // Walking away is a function of overreach, not of luck.
  const walk = clamp(Math.round(overCeiling * 150 + clamp(overQuote, 0, 1) * 12), 0, 80);
  return { accept, walk };
}

// Returns { outcome, amount, message }. Outcomes: 'agreed' | 'met' | 'held' | 'walked'.
export function haggle(s, job, amount) {
  const n = negotiationFor(s, job);
  if (!n) return { outcome: 'held', amount: n?.quoted ?? 0, message: 'Nobody is asking what you want yet.' };
  if (job.negotiated) return { outcome: 'held', amount: n.quoted, message: 'You have already been round this once.' };
  const { accept, walk } = haggleOdds(s, job, amount);

  if (chance(accept)) {
    return { outcome: 'agreed', amount,
      message: `They took it. €${amount.toLocaleString()}${n.perEpisode ? ' an episode' : ''}.` };
  }
  if (chance(walk)) {
    return { outcome: 'walked', amount: n.quoted,
      message: 'They stopped replying. The part went to somebody who asked for less.' };
  }
  // Sometimes they simply do not move, and that has to be a real ending too.
  if (chance(35)) return { outcome: 'held', amount: n.quoted, message: 'They did not move. The offer stands as it was.' };
  const met = Math.round(n.quoted + (amount - n.quoted) * (0.25 + Math.random() * 0.3));
  if (met > n.quoted) {
    return { outcome: 'met', amount: met,
      message: `They came back with €${met.toLocaleString()}${n.perEpisode ? ' an episode' : ''}. Take it or leave it.` };
  }
  return { outcome: 'held', amount: n.quoted, message: 'They did not move. The offer stands as it was.' };
}

// Applies a resolved negotiation to a casting listing. Kept here so the rules for
// what a haggle can change live in one place.
export function applyHaggle(s, id, amount) {
  const c = (s.castingPool || []).find((x) => x.id === id);
  if (!c) return s;
  const res = haggle(s, c, amount);
  c.negotiated = true;
  if (res.outcome === 'walked') {
    s.castingPool = (s.castingPool || []).filter((x) => x.id !== id);
    s.lastEvent = res.message;
    return s;
  }
  if (res.outcome === 'agreed' || res.outcome === 'met') {
    if (c.perEpisode) { c.episodeFee = res.amount; c.salary = res.amount * c.episodes; }
    else { c.salary = res.amount; }
    // What you got paid last time is what you are worth next time.
    s.quote = Math.max(s.quote || 0, c.salary);
  }
  s.lastEvent = res.message;
  return s;
}
