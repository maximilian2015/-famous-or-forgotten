// The month you signed for, and the set that ran long.
//
// Maxi, holding a letter from business affairs about a part he had signed for and could not
// start: "я подписал свой месяц и потом возможности нет вернуться, и они ждут, а потом пишут.
// я не понимаю как это работает."
//
// He had it exactly right. proposeStart refuses once the paper is signed — silently, with an
// early return — so the month picked at the table was the last word anybody got on it. The set
// you were on ran long, which you did not choose either, and the letter that followed had one
// button on it that said "Understood". Not a refusal. A dead end, in the one month where a
// person would really be on the phone.
//
// askToPush is the phone call. This checks the three things that make it an honest one: that it
// is there when you are stuck, that it is not there when you are not, and that it can be used
// once rather than ground.
import { pushState, askToPush } from '../src/systems/career/contract.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

const NOW = 2066 * 12 + 3;
const SET = { id: 'p1', title: 'Buried Hunger', months: 8, monthsLeft: 6, prepLeft: 0, exclusive: true };
const state = (over = {}) => ({
  year: 2066, month: 3, fame: 40, respect: 50, cash: 100000, inbox: [], timeline: [], offers: [],
  // engine/sets.js keeps s.production and s.productions in step and CLEARS the list when the
  // first is missing — a fixture that set only the array read as an actor on no set at all, and
  // every check here passed nothing. Both, or neither.
  production: SET, productions: [SET],
  ...over,
});
const offer = (over = {}) => ({
  id: 'o1', projectTitle: 'Sisters and Liars', type: 'Feature Film', genre: 'Drama', tier: 'lead',
  months: 3, salary: 400000, signed: true, startAt: NOW - 1, ...over,
});

// ── it is there when you are stuck ────────────────────────────────────────────
{
  const s = state(); s.offers = [offer()];
  const ps = pushState(s, s.offers[0]);
  ok('a signed part you cannot start has an ask on it', !!ps);
  ok('and it says when you would actually be free', ps.free > NOW, `free at ${ps.free}, now ${NOW}`);
  ok('and how much past their hold that is', ps.extra > 0, String(ps.extra));
  ok('and why you are not free, in words', /exclusive|respect|three sets/i.test(ps.why || ''), ps.why || '(nothing)');
  ok('with odds that are a real number, not a certainty', ps.odds > 0 && ps.odds < 100, String(ps.odds));
}

// ── and not there when you are not stuck ──────────────────────────────────────
{
  const s = state({ production: null, productions: [] }); s.offers = [offer()];
  ok('nothing to ask for when you are free', pushState(s, s.offers[0]) === null);
}
{
  const s = state(); s.offers = [offer({ signed: false })];
  ok('and nothing to ask for before you have signed — that is the negotiation', pushState(s, s.offers[0]) === null);
}

// ── asking does one of two things and says which ──────────────────────────────
{
  let moved = 0, refused = 0;
  for (let i = 0; i < 400; i++) {
    const s = state(); s.offers = [offer()];
    const before = s.offers[0].startAt;
    askToPush(s, 'o1');
    const o = s.offers[0];
    if (o._pushed === 'yes') { moved++; if (o.startAt <= before) { fails++; console.log('FAIL  a yes did not move the date'); break; } }
    if (o._pushed === 'no') { refused++; if (o.startAt !== before) { fails++; console.log('FAIL  a no moved the date anyway'); break; } }
  }
  ok('they sometimes move it', moved > 20, `${moved}/400`);
  ok('and sometimes they will not', refused > 20, `${refused}/400`);
  ok('every ask is answered one way or the other', moved + refused === 400, `${moved + refused}/400`);
}

// ── once ──────────────────────────────────────────────────────────────────────
{
  const s = state(); s.offers = [offer()];
  askToPush(s, 'o1');
  const after = s.offers[0].startAt;
  const first = s.offers[0]._pushed;
  askToPush(s, 'o1');
  ok('asking twice does nothing but say so', s.offers[0].startAt === after && s.offers[0]._pushed === first);
  ok('and the refusal is on the screen rather than in a silence', /already asked/i.test(s.lastEvent || ''), s.lastEvent || '');
  ok('and the card knows it has been asked', (pushState(s, s.offers[0]) || {}).asked === first);
}

// ── a show that is about you is waited for ────────────────────────────────────
// theShowIsYou already decides this for the negotiation; the ask must read the same scale
// rather than inventing a second one.
{
  const mine = state(); mine.offers = [offer({ kind: 'renewal', tier: 'lead' })];
  const notmine = state(); notmine.offers = [offer({ kind: 'sequel', tier: 'support' })];
  const a = pushState(mine, mine.offers[0]).odds, b = pushState(notmine, notmine.offers[0]).odds;
  ok('they wait longer for a show that is about you', a > b, `${a}% vs ${b}%`);
}

// ── a yes does not quietly become a part you still cannot take ────────────────
{
  const s = state(); s.offers = [offer()];
  for (let i = 0; i < 60 && s.offers[0]._pushed !== 'yes'; i++) { s.offers[0]._pushed = null; askToPush(s, 'o1'); }
  if (s.offers[0]._pushed === 'yes') {
    const ps = pushState(s, s.offers[0]);
    ok('after a yes, the new date is one you can actually make', !ps || ps.extra === 0, ps ? `still ${ps.extra} short` : '');
  } else ok('after a yes, the new date is one you can actually make', false, 'never got a yes in 60 tries');
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
