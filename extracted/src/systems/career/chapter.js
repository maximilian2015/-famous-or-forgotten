// Where the thing you are in goes next, and how it comes back after a long time away.
//
// Maxi, three things in one message:
//   "there should be a short story for the seasons — what happens next, about whom, about
//    what; they send you a summary and you either approve it, or there are 3–4 variants of
//    your own development and you choose one and propose it"
//   "if you are a star from A-class and above you can propose the development yourself"
//   "when seasons have a three-year gap there should be some buzz in the news — if the
//    ratings were good they should offer a campaign before the season, digital or press,
//    to remind people"
//
// Until now a renewal was a fee and a number of episodes. The show had an arc — ARCS in
// franchise.js — and it was rolled behind your back, and then overwritten by a bug two
// lines later, so it never did anything at all. This is that arc, out in the open, with
// your hand on it.
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { setRespect } from '../meta/status.js';
import { COST, canAfford, spend, tooTired } from '../../engine/energy.js';
import { spent } from '../../engine/economy.js';

const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ── where it goes ─────────────────────────────────────────────────────────────
// The same four fields the day-one argument uses (story.js TAKES), because they are the
// same four questions: is it bigger, is it about something, how wide can it land, and
// what does the audience do about it.
//   prestige — the material the Askers read
//   bump     — the finished thing, directly
//   appeal   — the money, or the audience for a season
//   swing    — how far either way it can land
//   hold     — what the audience does between the first episode and the last
export const DIRECTIONS = {
  raise: {
    id: 'raise', label: 'Raise the stakes',
    blurb: 'Bigger, further, more of them. Everybody understands this one and nobody remembers it.',
    line: (n) => `${n} goes wider: more money on the screen, more people in danger, and the thing that made it good in the first place gets less of the running time.`,
    prestige: -5, bump: -3, appeal: 1.28, swing: 2, hold: 0.03, arc: 'holds',
  },
  deeper: {
    id: 'deeper', label: 'Go further into the people',
    blurb: 'Slow it down, stay with them. It is the one critics write about and the one some of the audience leaves.',
    line: (n) => `${n} stays small: what it did to them, what it costs to carry it, and no explosion to hide behind.`,
    prestige: 9, bump: 6, appeal: 0.8, swing: 3, hold: -0.06, arc: 'climbs',
  },
  turn: {
    id: 'turn', label: 'Turn it on its head',
    blurb: 'Change what the thing is. Either it is the one people talk about for twenty years, or it is the one that ended it.',
    line: (n) => `${n} breaks its own format — a different shape, a different point of view, and half the audience finding out in week one.`,
    prestige: 4, bump: 0, appeal: 1.04, swing: 9, hold: -0.02, arc: null,
  },
  safe: {
    id: 'safe', label: 'Give them what they liked',
    blurb: 'The same thing again, a little smoother. Nobody gets fired for this and nobody gets remembered for it.',
    line: (n) => `${n} does what it did before, tidied up: the same shape, the same beats, the bits that tested well made longer.`,
    prestige: -2, bump: 1, appeal: 1.06, swing: 0, hold: 0, arc: 'slides',
  },
  // Yours. Maxi: a star can propose the development. It is the best version and the worst
  // one, and unlike the other four it is yours when it fails.
  mine: {
    id: 'mine', label: 'Pitch your own',
    blurb: 'Your idea for where it goes. If it works it is your show; if it does not, everybody in that room remembers whose idea it was.',
    line: (n) => `${n} goes where you said it should go. Your name is on that decision in every meeting from now on.`,
    prestige: 11, bump: 7, appeal: 0.95, swing: 7, hold: -0.02, arc: 'climbs', yours: true,
  },
};
export const DIRECTION_ORDER = ['safe', 'raise', 'deeper', 'turn'];
// Your own idea is a thing you can only do once people have to listen to you. A-list, or a
// standing that makes a room go quiet.
export const PITCH_FAME = 75;
export function canPitch(s) { return (s.fame || 0) >= PITCH_FAME || (s.respect || 0) >= 55; }
export function pitchWhy(s) {
  if (canPitch(s)) return '';
  const f = Math.max(0, PITCH_FAME - (s.fame || 0)), r = Math.max(0, 55 - (s.respect || 0));
  return `They do not take story notes from the cast. A-list does it — ${f} more fame — or a standing they cannot ignore, ${r} more respect.`;
}

// Which offers have a next chapter at all: something that continues.
export function continues(o) { return !!o && (o.kind === 'renewal' || o.kind === 'sequel'); }
export function thingName(o) {
  if (!o) return 'it';
  if (o.kind === 'renewal') return `Season ${o.season}`;
  return `Part ${o.part}`;
}
// The brief they send. One paragraph: what it is, who it is about, and where the room
// currently thinks it goes — which is the thing you are being asked to approve.
export function briefFor(s, o) {
  if (!continues(o)) return null;
  const c = o.character;
  const who = c ? `${c.name} is back — ${c.what}.` : 'Your character is back.';
  const chosen = o.direction ? DIRECTIONS[o.direction] : null;
  const where = chosen ? chosen.line(thingName(o)) : DIRECTIONS.safe.line(thingName(o));
  return { who, where, premise: o.premise || null, settled: !!o.direction };
}
// The three they will put in front of you, plus your own if anybody would listen.
export function directionsFor(s, o) {
  if (!continues(o)) return [];
  // Three of the four, always including the safe one, so the choice is never only between
  // two kinds of brave.
  const rest = DIRECTION_ORDER.filter((id) => id !== 'safe');
  const seed = String(o.id || '').split('').reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const two = [rest[seed % rest.length], rest[(seed + 1) % rest.length]];
  const ids = ['safe', ...two];
  const out = ids.map((id) => ({ ...DIRECTIONS[id], chosen: o.direction === id, open: true, why: '' }));
  out.push({ ...DIRECTIONS.mine, chosen: o.direction === 'mine', open: canPitch(s), why: pitchWhy(s) });
  return out;
}
export function chooseDirection(s, offerId, id) {
  const o = (s.offers || []).find((x) => x.id === offerId);
  const d = DIRECTIONS[id];
  if (!o || !d || !continues(o)) return s;
  if (o.signed || (o.contract && o.contract.sent)) { s.lastEvent = 'The paper has gone. Whatever it is now, it is that.'; return s; }
  if (d.yours && !canPitch(s)) { s.lastEvent = pitchWhy(s); return s; }
  // Changing your mind is free until the paper goes back; the material moves with it.
  const was = o.direction ? DIRECTIONS[o.direction] : null;
  const base = o._prestige0 != null ? o._prestige0 : (o._prestige0 = o.prestigeScore || 50);
  o.direction = id;
  o.prestigeScore = clamp(Math.round(base + d.prestige), 8, 96);
  if (d.arc) o.arc = d.arc;
  s.lastEvent = d.yours
    ? `You told them where it should go, and they wrote it down. ${d.line(thingName(o))}`
    : `${d.label}. ${d.line(thingName(o))}`;
  if (was && was.id !== id) return s;
  return s;
}
export function directionOf(p) { return p && p.direction ? DIRECTIONS[p.direction] : null; }
export function dirBump(p) { const d = directionOf(p); return d ? d.bump : 0; }
export function dirSwing(p) { const d = directionOf(p); return d ? d.swing : 0; }
export function dirAppeal(p) { const d = directionOf(p); return d ? d.appeal : 1; }
export function dirHold(p) { const d = directionOf(p); return d ? d.hold : 0; }
// Your idea, afterwards. A season you pitched that worked is worth more than a season you
// were handed; one that did not is a thing people bring up.
export function pitchAftermath(s, credit, p) {
  if (!p || p.direction !== 'mine') return;
  const good = (credit.rating || 0) >= 68;
  setRespect(s, (s.respect || 0) + (good ? 4 : -5));
  addTimeline(s, good
    ? `"${credit.title}" went where you said it should go, and it worked. That was your idea.`
    : `"${credit.title}" went where you said it should go, and it did not work. That was your idea too.`, !good);
}

// ── coming back after a long time away ────────────────────────────────────────
// Maxi: a three-year gap should make noise, and if the last one was good they should be
// selling it before it is back. Two ways to do that, and they cost different things.
export const GAP_YEARS = 3;
export const REMINDERS = {
  digital: {
    id: 'digital', label: 'A digital campaign', short: 'digital',
    blurb: 'Trailers everywhere for six weeks, the old one back in front of people, the algorithm paid to remember you.',
    money: true, lift: 1.22, holdBonus: -0.02,
    line: 'Bought attention. It works — the first night is enormous, and the people it brings are the people who leave first.',
  },
  press: {
    id: 'press', label: 'A round of press', short: 'press',
    blurb: 'You do the work yourself: the retrospectives, the anniversary pieces, the interview where you talk about what it meant.',
    energy: true, lift: 1.12, holdBonus: 0.05,
    line: 'You went out and reminded people yourself. Slower, cheaper, and the ones who come back stay.',
  },
};
export const REMINDER_ORDER = ['digital', 'press'];
// What the push costs in money: it scales with the thing, because a campaign for a
// tentpole is not a campaign for a network drama.
export function remindCost(o) {
  const big = o.scale === 'blockbuster' || o.tier === 'tentpole' ? 3 : o.scale === 'prestige' ? 1.6 : 1;
  return Math.round(180000 * big);
}
// Years since the last one, and whether it was any good — a push on something nobody liked
// is money into a hole, and they will not offer it.
export function gapOf(s, o) {
  if (!continues(o)) return null;
  const root = String(o.seriesTitle || o.projectTitle || '').replace(/(\s*·\s*(season|part)\s+\d+)+\s*$/i, '').trim();
  const prev = (s.filmography || []).find((c) => {
    const t = String(c.title || '').replace(/(\s*·\s*(season|part)\s+\d+)+\s*$/i, '').trim();
    return t === root && !c.running;
  });
  if (!prev) return null;
  return { years: (s.year || 0) - (prev.year || 0), rating: prev.rating || 0, title: prev.title };
}
export function remindersFor(s, o) {
  const g = gapOf(s, o);
  if (!g || g.years < GAP_YEARS || g.rating < 62) return null;
  const cost = remindCost(o);
  return {
    years: g.years, was: g.rating,
    line: `${g.years} years since "${g.title}". People liked it; whether they remember it is a different question, and it is the question the first night answers.`,
    options: REMINDER_ORDER.map((id) => {
      const r = REMINDERS[id];
      const can = r.money ? (s.cash || 0) >= cost : canAfford(s, COST.tour);
      return { ...r, cost: r.money ? cost : 0, ap: r.money ? 0 : COST.tour,
        open: can && !o.remind, chosen: o.remind === id,
        why: o.remind ? 'Already decided.' : can ? '' : r.money ? `You need €${cost.toLocaleString()}.` : tooTired(s, COST.tour) };
    }),
  };
}
export function buyReminder(s, offerId, id) {
  const o = (s.offers || []).find((x) => x.id === offerId);
  const r = REMINDERS[id];
  if (!o || !r || o.remind) return s;
  if (!remindersFor(s, o)) { s.lastEvent = 'Nobody is selling this one back to anybody.'; return s; }
  if (r.money) {
    const cost = remindCost(o);
    if ((s.cash || 0) < cost) { s.lastEvent = `That costs €${cost.toLocaleString()} and you do not have it.`; return s; }
    spent(s, 'career', cost);
    s.cash = (s.cash || 0) - cost;
  } else {
    if (!canAfford(s, COST.tour)) { s.lastEvent = tooTired(s, COST.tour); return s; }
    spend(s, COST.tour);
    s.strain = clamp((s.strain || 0) + 3, 0, 100);
  }
  o.remind = id;
  addTimeline(s, `Started selling "${String(o.projectTitle || '').replace('⭐ ', '')}" back to people: ${r.short}.`);
  s.lastEvent = r.line;
  return s;
}
export function reminderOf(p) { return p && p.remind ? REMINDERS[p.remind] : null; }
export function remindLift(p) { const r = reminderOf(p); return r ? r.lift : 1; }
export function remindHold(p) { const r = reminderOf(p); return r ? r.holdBonus : 0; }

// ── the season, measured ──────────────────────────────────────────────────────
// Maxi: "how are seasons measured — how many people watched at the start and how many at
// the end, and then they decide whether to renew?" Exactly that. The opening is what the
// name and the last season bought you. What happens between the first episode and the
// last is the season itself, and that is the number the network actually decides on.
export function holdFactor(rating, p) {
  const base = rating >= 85 ? 1.1 : rating >= 72 ? 1.0 : rating >= 60 ? 0.9 : rating >= 45 ? 0.78 : 0.64;
  return Math.max(0.4, base + dirHold(p) + remindHold(p) + (Math.random() - 0.5) * 0.06);
}
export function retentionLine(open, end) {
  if (!open || !end) return null;
  const pct = Math.round((end / open) * 100);
  return pct >= 108 ? `Started at ${open}m and finished at ${end}m — it grew while it was on, which almost nothing does.`
    : pct >= 95 ? `Started at ${open}m, finished at ${end}m. It held the people it opened with.`
    : pct >= 80 ? `Started at ${open}m and finished at ${end}m. The usual drift.`
    : `Started at ${open}m and finished at ${end}m. They came for the first one and did not stay.`;
}
