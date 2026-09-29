// The contract behind the money.
//
// Maxi, having played a while: "a hundred energy is enough for everything, it makes no
// challenge at all." Measured, and he is righter than he knew — a player who spends nothing
// ends a hundred and seventy-five months out of a hundred and eighty completely full. But
// the cause is not that there is too much energy. A genuinely busy month costs between
// ninety-five and a hundred and ninety of it. The cause is that in an ordinary month there
// are only two or three things worth pressing, so the surplus has nowhere to go.
//
// So the fix is demand, not supply. And he named exactly the right source of it:
//
//   "if you break the contract, a fine. You are the face of this, so you cannot do horror
//    and cannot take other brands. And the fee means you have to turn up at this party and
//    that gala — it is all in the contract, and then it is in your calendar."
//
// That is precisely how an endorsement works and none of it was here. The money arrived, the
// campaign shot for a month, and nothing was ever asked of you again. Now a deal is twelve
// months of being somebody's face:
//
//   · DUTIES — three or four dated things across the year. A launch, a gala, a store opening
//     in another country, a day of press. They appear in the calendar, they cost energy in
//     the month they fall, and they compete with the set you are on.
//   · A CLAUSE — what you cannot be seen doing while you are their face. A couture house
//     does not want you in a slasher; a family supermarket does not want you in anything
//     with a certificate. Taking the part anyway is a breach.
//   · EXCLUSIVITY — no other brand for the year, which was already true.
//   · THE FINE — a breach costs a share of the fee back, the deal, and some standing. A
//     contract you can walk out of for nothing is not a contract.
import { uid } from '../../engine/id.js';
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { inCareer } from '../../engine/stage.js';
import { COST, canAfford, spend, tooTired } from '../../engine/energy.js';
import { setRespect } from '../meta/status.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);

// What they will want from you, and what it takes out of the month. None of it is hard.
// All of it is on a date somebody else chose, which is the point.
export const DUTIES = {
  launch: { label: 'The launch', ap: 20, line: 'A room, a step-and-repeat, four hundred people and a speech somebody else wrote.' },
  gala: { label: 'The gala', ap: 25, line: 'Black tie, a table you did not choose, and photographs from the moment the car door opens.' },
  store: { label: 'The opening, abroad', ap: 25, line: 'A flight, a ribbon, six hundred people behind a barrier, and a flight back.' },
  press: { label: 'A day of press', ap: 15, line: 'Eleven interviews in a hotel suite, all of them the same interview.' },
  shoot: { label: 'The second shoot', ap: 20, line: 'They want new pictures for the spring. One day, and the light is somebody else’s problem.' },
};
export const DUTY_IDS = Object.keys(DUTIES);

// What you may not be seen doing while you are their face. It comes from what they sell.
export const CLAUSES = {
  nothingNasty: { label: 'Nothing with blood in it', blocks: /Horror|Thriller/, why: 'a house that sells a fragrance does not want you covered in blood' },
  nothingRude: { label: 'Nothing with a certificate', blocks: /Horror|Crime|Thriller/, why: 'a family name on the front of the shop means a family face on the front of the campaign' },
  nothingFunny: { label: 'Nothing that makes you the joke', blocks: /Comedy/, why: 'they are paying for the face on the poster, not the one in the pratfall' },
};
export const CLAUSE_IDS = Object.keys(CLAUSES);
function clauseFor(what) {
  if (/supermarket|bank|soft drink|airline/.test(what || '')) return 'nothingRude';
  if (/fragrance|fashion|watch/.test(what || '')) return chance(60) ? 'nothingNasty' : 'nothingFunny';
  return chance(45) ? 'nothingNasty' : null;
}

// ── signing ───────────────────────────────────────────────────────────────────
// Called from offers.js when a brand offer is accepted. The dates are theirs.
export function signEndorsement(s, o) {
  const what = String(o.projectTitle || '').split('— ')[1] || 'something';
  const months = o.brandFor || 12;
  const now = stamp(s);
  // Three or four of them, spread across the year, never two in the same month.
  const n = o.salary >= 2000000 ? rint(3, 4) : rint(2, 3);
  const taken = new Set();
  const duties = [];
  const pool = o.abroad ? ['press', 'shoot', 'store', 'launch'] : DUTY_IDS;
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let tries = 0; tries < 12; tries++) { m = rint(1, months - 1); if (!taken.has(m)) break; }
    if (taken.has(m)) continue;
    taken.add(m);
    duties.push({ id: uid(s, 'duty'), kind: pick(pool), due: now + m, done: false, missed: false });
  }
  duties.sort((a, b) => a.due - b.due);
  s.endorsement = {
    id: uid(s, 'end'), house: o.from || 'The brand', what, fee: o.salary || 0,
    since: now, until: now + months, abroad: o.abroad || null,
    clause: o.abroad ? null : clauseFor(what),   // nobody at home is watching a foreign campaign
    duties, strikes: 0, broken: false,
  };
  const c = s.endorsement.clause;
  addTimeline(s, `Signed with ${s.endorsement.house} — ${what}, a year of it, ${duties.length} appearance${duties.length === 1 ? '' : 's'} in the paper.`);
  s.lastEvent = `The paper is longer than the fee. ${duties.length} appearance${duties.length === 1 ? '' : 's'} across the year, on dates they choose${c ? `, and ${CLAUSES[c].label.toLowerCase()} while it runs — ${CLAUSES[c].why}` : ''}. Walking out of it costs you ${Math.round(BREACH_SHARE * 100)}% of the fee.`;
  return s;
}
export function endorsement(s) { const e = s.endorsement; return e && !e.broken && stamp(s) < e.until ? e : null; }

// ── the duties ────────────────────────────────────────────────────────────────
export function dutiesDue(s) {
  const e = endorsement(s);
  if (!e) return [];
  const now = stamp(s);
  return e.duties.filter((d) => !d.done && !d.missed && d.due === now)
    .map((d) => ({ ...d, ...DUTIES[d.kind], house: e.house, what: e.what }));
}
// Everything still ahead of you, for the calendar.
export function dutiesAhead(s) {
  const e = endorsement(s);
  if (!e) return [];
  const now = stamp(s);
  return e.duties.filter((d) => !d.done && !d.missed && d.due >= now)
    .map((d) => ({ ...d, ...DUTIES[d.kind], house: e.house }));
}
export function canAttend(s, id) {
  const d = dutiesDue(s).find((x) => x.id === id);
  if (!d) return { ok: false, why: '' };
  if (!canAfford(s, d.ap)) return { ok: false, why: tooTired(s, d.ap) };
  return { ok: true, why: '' };
}
export function attendDuty(s, id) {
  const e = endorsement(s);
  const d = e && e.duties.find((x) => x.id === id && !x.done && !x.missed);
  if (!d) return s;
  const spec = DUTIES[d.kind];
  const fit = canAttend(s, id);
  if (!fit.ok) { if (fit.why) s.lastEvent = fit.why; return s; }
  spend(s, spec.ap);
  d.done = true;
  addTimeline(s, `${spec.label} for ${e.house}.`);
  s.lastEvent = `${spec.line} ${e.house} are happy, which is the whole job.`;
  return s;
}

// ── the month ─────────────────────────────────────────────────────────────────
// A date you did not turn up on is a strike. Two strikes and they have had enough.
export const STRIKES_OUT = 2, BREACH_SHARE = 0.4;
export function endorsementTick(s) {
  if (!inCareer(s)) return s;
  const e = s.endorsement;
  if (!e || e.broken) return s;
  const now = stamp(s);
  if (now >= e.until) {
    const kept = e.duties.filter((d) => d.done).length;
    addTimeline(s, `The year with ${e.house} is up.${kept === e.duties.length ? ' They would have you back.' : ''}`);
    s.endorsement = null;
    return s;
  }
  // Anything whose month has gone by without you.
  for (const d of e.duties) {
    if (d.done || d.missed || d.due >= now) continue;
    d.missed = true;
    e.strikes += 1;
    addTimeline(s, `You did not turn up for ${e.house}. ${DUTIES[d.kind].label} went ahead without you.`, true);
    s.lastEvent = e.strikes >= STRIKES_OUT
      ? `${e.house} have stopped asking.`
      : `You missed ${DUTIES[d.kind].label.toLowerCase()} for ${e.house}. Nobody said anything, and everybody noticed. One more and the paper has a clause about it.`;
    if (e.strikes >= STRIKES_OUT) breachEndorsement(s, 'missed');
  }
  return s;
}

// ── breaking it ───────────────────────────────────────────────────────────────
export function breachEndorsement(s, why) {
  const e = s.endorsement;
  if (!e || e.broken) return s;
  const fine = Math.round((e.fee || 0) * BREACH_SHARE);
  e.broken = true;
  s.cash = (s.cash || 0) - fine;
  setRespect(s, (s.respect || 0) - 2);
  s._brandUntil = 0;                       // the exclusivity dies with the deal
  addTimeline(s, `${e.house} tore it up. €${fine.toLocaleString()} back, and the pictures come down.`, true);
  s.lastEvent = why === 'clause'
    ? `${e.house} read the trades this morning. The paper said what you could not be seen doing while you were their face, and you have been seen doing it. €${fine.toLocaleString()} back, and somebody else is on the wall by the spring.`
    : `${e.house} have had enough of the dates you did not keep. €${fine.toLocaleString()} back, and the pictures come down.`;
  return s;
}

// ── the clause, which is what makes it a decision ─────────────────────────────
// Asked before you take a part. It does not stop you — it tells you the price.
export function clauseBlocks(s, o) {
  const e = endorsement(s);
  if (!e || !e.clause || !o) return null;
  const spec = CLAUSES[e.clause];
  if (!spec.blocks.test(o.genre || '')) return null;
  return {
    house: e.house, label: spec.label, why: spec.why,
    fine: Math.round((e.fee || 0) * BREACH_SHARE),
    line: `${e.house} pay you to be their face, and the paper says ${spec.label.toLowerCase()} while it runs — ${spec.why}. Taking this costs you €${Math.round((e.fee || 0) * BREACH_SHARE).toLocaleString()} and the deal.`,
  };
}
// Called when a part that breaks the clause is actually taken.
export function clauseTaken(s, o) {
  const hit = clauseBlocks(s, o);
  if (!hit) return s;
  return breachEndorsement(s, 'clause');
}

// For the screen.
export function liveEndorsement(s) {
  const e = endorsement(s);
  if (!e) return null;
  const now = stamp(s);
  const next = e.duties.find((d) => !d.done && !d.missed);
  return {
    house: e.house, what: e.what, abroad: e.abroad,
    monthsLeft: Math.max(0, e.until - now),
    done: e.duties.filter((d) => d.done).length, total: e.duties.length,
    strikes: e.strikes,
    clause: e.clause ? CLAUSES[e.clause].label : null,
    next: next ? { ...next, ...DUTIES[next.kind], inMonths: Math.max(0, next.due - now) } : null,
  };
}
