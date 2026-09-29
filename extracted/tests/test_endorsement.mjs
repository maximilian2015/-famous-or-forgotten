// Being somebody's face, which is a year rather than a cheque.
//
// Maxi: "a hundred energy is enough for everything, it makes no challenge." Measured: a
// player who spends nothing ends 175 months out of 180 completely full, while a genuinely
// busy month costs between 95 and 190 of it. The energy was never too plentiful — in an
// ordinary month there were only two or three things worth pressing, so the surplus had
// nowhere to go. This is demand, on dates somebody else chose.
//
// And the rest of what he asked for: "if you break the contract, a fine. You are the face of
// this, so you cannot do horror and cannot take other brands."
import { signEndorsement, endorsement, endorsementTick, dutiesDue, dutiesAhead,
  attendDuty, clauseBlocks, clauseTaken, breachEndorsement, liveEndorsement,
  DUTIES, CLAUSES, STRIKES_OUT, BREACH_SHARE } from '../src/systems/career/endorsement.js';
import { ensureWorld } from '../src/systems/world/world.js';

let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.log('  FAIL: ' + msg); fails++; } };

const st = (more = {}) => {
  const s = { version: 'x', name: 'M', gender: 'female', ageY: 36, stage: 'career', dream: 'actor',
    fame: 75, respect: 55, acting: 70, charisma: 60, looks: 70, luck: 50, scandal: 0, media: 40,
    mental: 70, health: 92, strain: 10, year: 2070, month: 0, timeline: [], filmography: [],
    productions: [], offers: [], releases: [], inbox: [], peakFame: 75, hasApartment: true,
    housing: 'flat', ap: 100, apMax: 100, apMaxEff: 100, cash: 5000000, genreXP: {}, people: [],
    quote: 3000000, awards: { wins: [], nominations: [] }, alive: true, cooldowns: {}, ...more };
  ensureWorld(s); return s;
};
const deal = (more = {}) => ({ id: 'b1', kind: 'brand', from: 'Maison Cassel',
  projectTitle: 'Maison Cassel — a fragrance', salary: 3000000, brandFor: 12, ...more });
const month = (s) => { s.month++; if (s.month > 11) { s.month = 0; s.year++; } };

// ── the paper is longer than the fee ──────────────────────────────────────────
{
  const s = st();
  signEndorsement(s, deal());
  const e = endorsement(s);
  ok(!!e, 'signing one creates the contract behind it');
  ok(e.duties.length >= 2, `and it has dates in it: ${e.duties.length}`);
  ok(e.duties.every((d) => d.due > (s.year * 12 + s.month)), 'all of them ahead of you');
  const months = new Set(e.duties.map((d) => d.due));
  ok(months.size === e.duties.length, 'and never two in the same month');
  ok(dutiesAhead(s).length === e.duties.length, 'the calendar can see all of them');
}

// ── turning up costs the month something ──────────────────────────────────────
{
  const s = st();
  signEndorsement(s, deal());
  const e = endorsement(s);
  const first = e.duties[0];
  // Walk to the month it falls in.
  while ((s.year * 12 + s.month) < first.due) month(s);
  const due = dutiesDue(s);
  ok(due.length === 1, 'the date arrives: ' + due.length);
  const ap0 = s.ap;
  attendDuty(s, first.id);
  ok(ap0 - s.ap === DUTIES[first.kind].ap, `and turning up costs the month ${DUTIES[first.kind].ap}: took ${ap0 - s.ap}`);
  ok(endorsement(s).duties[0].done, 'and it is done');
  ok(dutiesDue(s).length === 0, 'and not asked for twice');
}

// ── not turning up ────────────────────────────────────────────────────────────
{
  const s = st();
  signEndorsement(s, deal());
  const e = endorsement(s);
  // Walk past the first date without doing anything.
  while ((s.year * 12 + s.month) <= e.duties[0].due) { month(s); endorsementTick(s); }
  ok(endorsement(s) && endorsement(s).strikes === 1, 'a date you did not keep is a strike');
  ok((s.timeline || []).some((x) => /did not turn up/.test(x.text)), 'and it is said out loud');
}
{
  // Two of them and they tear it up, with a real fine.
  const s = st();
  signEndorsement(s, deal());
  const cash0 = s.cash;
  for (let i = 0; i < 14; i++) { month(s); endorsementTick(s); }
  ok(!endorsement(s), 'miss enough of them and the deal is gone');
  ok(s.cash < cash0, `and it costs money going out: €${(cash0 - s.cash).toLocaleString()}`);
}

// ── the clause ────────────────────────────────────────────────────────────────
{
  // A house that sells a fragrance does not want you covered in blood.
  let s = null;
  for (let i = 0; i < 60 && !s; i++) {
    const t = st();
    signEndorsement(t, deal());
    if ((endorsement(t) || {}).clause === 'nothingNasty') s = t;
  }
  ok(!!s, 'a fragrance house asks for something in return');
  if (s) {
    const horror = { id: 'o9', kind: 'casting', genre: 'Horror', projectTitle: 'The Cellar', role: 'Lead' };
    const hit = clauseBlocks(s, horror);
    ok(!!hit, 'and the screen says so before you take the part');
    ok(hit && hit.fine > 0, `and names the price: €${hit ? hit.fine.toLocaleString() : 0}`);
    const drama = { id: 'o8', kind: 'casting', genre: 'Drama', projectTitle: 'The Quiet', role: 'Lead' };
    ok(!clauseBlocks(s, drama), 'and says nothing about a part it does not mind');

    const cash0 = s.cash, resp0 = s.respect;
    clauseTaken(s, horror);
    ok(!endorsement(s), 'taking it anyway ends the deal');
    ok(s.cash === cash0 - Math.round(3000000 * BREACH_SHARE), `and the fine is ${Math.round(BREACH_SHARE * 100)}% of the fee: €${(cash0 - s.cash).toLocaleString()}`);
    ok(s.respect < resp0, 'and it is read as walking out of a contract');
  }
}
{
  // A campaign nobody at home will see has no clause, because nobody at home is watching.
  let away = null;
  for (let i = 0; i < 40 && !away; i++) {
    const t = st();
    signEndorsement(t, deal({ abroad: 'Japan' }));
    away = t;
  }
  ok(endorsement(away) && !endorsement(away).clause, 'a foreign-only campaign asks nothing of what you film at home');
}

// ── the year runs out ─────────────────────────────────────────────────────────
{
  const s = st();
  signEndorsement(s, deal());
  const e = endorsement(s);
  for (const d of e.duties) d.done = true;
  for (let i = 0; i < 13; i++) { month(s); endorsementTick(s); }
  ok(!endorsement(s), 'a year is a year');
  ok((s.timeline || []).some((x) => /would have you back/.test(x.text)), 'and keeping every date is remembered');
}

// ── what the screen gets ──────────────────────────────────────────────────────
{
  const s = st();
  signEndorsement(s, deal());
  const live = liveEndorsement(s);
  ok(!!live && live.house === 'Maison Cassel', 'the card knows whose face you are');
  ok(live.total >= 2 && live.done === 0, `and how much of it is left: ${live.done} of ${live.total}`);
  ok(!!live.next, 'and what is coming');
}

if (fails) { console.log('test_endorsement: ' + fails + ' failed'); process.exit(1); }
console.log('test_endorsement: all passed');
