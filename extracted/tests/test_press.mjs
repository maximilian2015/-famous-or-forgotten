import { piecesFor, pressTick, answerPiece, pressUnread } from '../src/systems/meta/press.js';
import { laterOffersTick, SEQUEL_LEAD } from '../src/systems/career/franchise.js';
import { draftContract, signContract } from '../src/systems/career/contract.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', name: 'Mira Vale', ageY: 30, stage: 'career', fame: 40, respect: 20, charisma: 50, scandal: 0, mental: 60, cash: 50000,
  year: 2050, month: 5, timeline: [], filmography: [], offers: [], productions: [], production: null, ...over });

// ── what they write ──────────────────────────────────────────────────────────
// Maxi: "the News is stuck — it keeps writing the same thing about a film from two years ago."
{
  const s = st({ filmography: [{ title: 'Radiant Signal', verdict: 'smash', rating: 77 }] });
  const p = piecesFor(s, ['"Radiant Signal" finished its run. 7.7/10 · €40.1m on a €12m film, 9 weeks · smash.']);
  ok('a hit run gets a piece of praise', p.length === 1 && p[0].tone === 'praise' && /Radiant Signal/.test(p[0].head), JSON.stringify(p));
  const bomb = piecesFor(st(), ['"Late Orbit" finished its run. 3.9/10 · €1.1m on a €12m film, 3 weeks · bomb.']);
  ok('a bomb gets a pan you can answer', bomb.length === 1 && bomb[0].tone === 'pan' && bomb[0].react);
  const gossip = piecesFor(st(), ['Started seeing Piet Marchetti.', 'A night at The Old Bank you do not remember. The phone is gone; the pictures are not.']);
  ok('a new partner and a lost night are gossip', gossip.length === 2 && gossip.every((x) => x.tone === 'gossip'));
  ok('a nobody is not written about for dating', piecesFor(st({ fame: 5 }), ['Started seeing Piet Marchetti.']).length === 0);
  const prize = piecesFor(st(), ['"Salt Country" won at Park City.']);
  ok('a festival prize is the discovery', prize.length === 1 && /discovery/.test(prize[0].head));
  const many = piecesFor(st(), ['"A" finished its run. 8.6/10 · €1m on a €1m film, 3 weeks · profitable.', '"B" opened.', 'Married Ada Vance.', 'Walked off "C". They recast within the week. Everybody heard.', '"D" went out.']);
  ok('at most three a month, the loud ones first', many.length === 3 && many[0].tone === 'praise' && many[1].tone === 'pan', many.map((x) => x.tone).join(','));
  ok('nothing happened, nothing written', piecesFor(st(), ['Corner Coffee wages: +€1,200.', 'Read for Anchor.']).length === 0);
}
// ── the month's pieces, once ───────────────────────────────────────────────────
{
  const s = st({ timeline: [{ text: '"Radiant Signal" finished its run. 7.7/10 · €40.1m on a €12m film, 9 weeks · smash.', when: 'Jun 2050', bad: false }], filmography: [{ title: 'Radiant Signal', verdict: 'smash', rating: 77 }] });
  pressTick(s);
  ok('the tick writes the piece', (s.press || []).length === 1 && s.press[0].outlet && s.press[0].at === 2050 * 12 + 5, JSON.stringify(s.press));
  ok('and it counts as unread this month', pressUnread(s) === 1);
  pressTick(s);
  ok('the same line is never written twice', s.press.length === 1);
  s.month = 6; pressTick(s);
  ok('nor the month after', s.press.length === 1);
  // two years later the piece is still in the pile, but nothing new pretends to be new
  s.year = 2052; pressTick(s);
  ok('a quiet month adds nothing', s.press.length === 1 && pressUnread(s) === 0);
}
// ── the right of reply ────────────────────────────────────────────────────────
{
  const s = st({ press: [{ id: 'a', at: 2050 * 12 + 5, tone: 'pan', react: true, acted: false, head: 'x', body: 'y', outlet: 'The Ledger' }, { id: 'b', at: 2050 * 12 + 5, tone: 'gossip', react: true, acted: false, head: 'x', body: 'y', outlet: 'Funtimes' }] });
  answerPiece(s, 'a', 'quiet');
  ok('you can let a story burn out', s.press[0].acted === 'quiet' && /burns out/.test(s.lastEvent));
  answerPiece(s, 'b', 'reply');
  ok('but only once a month', s.press[1].acted === false && /once this month/.test(s.lastEvent), s.lastEvent);
}
// ── the sequel's paper comes before its cameras ───────────────────────────────
// Maxi: "if a sequel is happening, the contract for part two should come six months before".
{
  const now = 2050 * 12 + 5;
  const s = st({ laterOffers: [{ due: now + 10, offer: { id: 'seq1', kind: 'sequel', part: 2, projectTitle: 'Radiant Signal II', role: 'Supporting', type: 'Feature Film', genre: 'Crime', salary: 400000, months: 5, tier: 'supporting', scale: 'feature', prestigeScore: 60, stability: 88, deadline: 2, waitsForWrap: true, medium: 'film_studio' } }] });
  laterOffersTick(s);
  ok('ten months out, nothing yet', !(s.offers || []).length && s.laterOffers.length === 1);
  s.month += 4;   // six months before the cameras
  laterOffersTick(s);
  ok(`the paper arrives ${SEQUEL_LEAD} months before the cameras`, s.offers.length === 1 && s.laterOffers.length === 0, JSON.stringify(s.offers.map((o) => o.projectTitle)));
  const o = s.offers[0];
  ok('with the studio\'s date on it', o.startAt === now + 10 && o.deadline === 3, JSON.stringify({ startAt: o.startAt, deadline: o.deadline }));
  const k = draftContract(s, o);
  const sched = k.clauses.find((c) => c.id === 'schedule');
  ok('the schedule says the date, and is not a hold', sched.value.start === now + 10 && /studio's date/.test(sched.text) && !sched.must, sched.text);
  signContract(s, o.id);
  ok('signed, it waits for its month', o.signed && o.waitsForWrap && o.startAt === now + 10, s.lastEvent);
  // and on a set that wraps before then: still nothing to ask
  const t = st({ respect: 5, productions: [{ id: 'p', title: 'Other', months: 6, monthsLeft: 2, salary: 1, crew: [] }], laterOffers: [] });
  t.production = t.productions[0];
  t.offers = [{ ...o, id: 'seq2', signed: false, contract: null, waitsForWrap: false, startAt: (2050 * 12 + 9) + 6 }];
  const k2 = draftContract(t, t.offers[0]);
  const s2 = k2.clauses.find((c) => c.id === 'schedule');
  ok('on a set that wraps first, the date stands and nothing is asked', !s2.must && /wrap "Other" before then/.test(s2.text), s2.text);
  signContract(t, 'seq2');
  ok('and it signs and waits', t.offers[0].signed && t.offers[0].waitsForWrap, t.lastEvent);
  // but a set that runs past the date is the old quest
  const u = st({ respect: 5, productions: [{ id: 'p', title: 'Long', months: 12, monthsLeft: 10, salary: 1, crew: [] }] });
  u.production = u.productions[0];
  u.offers = [{ ...o, id: 'seq3', signed: false, contract: null, waitsForWrap: false, startAt: (2050 * 12 + 5) + 6 }];
  const s3 = draftContract(u, u.offers[0]).clauses.find((c) => c.id === 'schedule');
  ok('a set that runs past the date means hold it or walk', s3.must && s3.options.some((x) => x.id === 'hold'), s3.text);
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
