// The month on a set, now that it is a question rather than a dial.
//
// What was there: coast / turn up prepared / all in, at 0, 15 and 35 energy. Maxi, three
// pictures in: "я вообще не хочу эту систему, надо убрать всё и предложи что-то другое вообще."
// The diagnosis is arithmetic, not taste — all three options did the same thing, meter up and
// bonds up, more for more, so the top one won at every moment you could afford it. A choice
// where one option is simply better whenever you can afford it is not a choice; it is a price.
//
// What this checks is the property that failure had, because it is the one that is easy to
// rebuild by accident: that no answer is simply better than the others, and that saying no is
// a real answer rather than a punishment.
import { DEMANDS, DEMAND_IDS, rollDemand, answerDemand, demandOf, optionsFor, expireDemands } from '../src/systems/career/demands.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

const SET = () => ({ id: 'p1', title: 'Buried Hunger', months: 6, monthsLeft: 4, prepLeft: 0, meter: 50, stability: 80,
  crew: [{ id: 'c0', name: 'Vera Salazar', role: 'Director', bond: 50, bond0: 50 },
    { id: 'c1', name: 'Zora Sorensen', role: 'Co-star', bond: 45, bond0: 45 },
    { id: 'c2', name: 'Ivo Prins', role: 'Producer', bond: 48, bond0: 48 }] });
const ST = (p) => ({ year: 2066, month: 3, mental: 60, health: 80, strain: 10, cash: 200000, ap: 100,
  acting: 60, media: 0, respect: 50, fame: 40, production: p, productions: [p] });

// ── every demand is answerable, and every answer says something ───────────────
{
  let bad = 0;
  for (const id of DEMAND_IDS) {
    const d = DEMANDS[id];
    if (!d.options || d.options.length < 2) { bad++; console.log('FAIL  ' + id + ' has fewer than two answers'); }
    if (!d.options.some((o) => o.passive)) { bad++; console.log('FAIL  ' + id + ' has no answer for never answering'); }
    for (const o of d.options) {
      if (!o.hint) { bad++; console.log('FAIL  ' + id + '/' + o.id + ' does not say what it costs'); }
      if (typeof o.fx !== 'function' || !o.said) { bad++; console.log('FAIL  ' + id + '/' + o.id + ' does nothing or says nothing'); }
    }
  }
  ok(`all ${DEMAND_IDS.length} of them are shaped like a question with answers`, bad === 0, String(bad));
}

// ── the price is on the control, before it is pressed ─────────────────────────
{
  let missing = 0;
  for (const id of DEMAND_IDS) {
    const p = SET(); p.demand = { id, at: 2066 * 12 + 3 };
    for (const o of optionsFor(ST(p), p)) if (typeof o.hint !== 'string' || !o.hint.trim()) missing++;
  }
  ok('every answer prints its price as readable text', missing === 0, String(missing));
}

// ── and nothing throws, whatever you answer ───────────────────────────────────
{
  let threw = '';
  for (const id of DEMAND_IDS) {
    for (const o of DEMANDS[id].options) {
      for (let i = 0; i < 40 && !threw; i++) {
        const p = SET(); const s = ST(p); p.demand = { id, at: 2066 * 12 + 3 };
        try { answerDemand(s, 'p1', o.id); } catch (e) { threw = `${id}/${o.id}: ${e.message}`; }
        if (p.demand) threw = `${id}/${o.id} left the question on the card`;
        if (!s.lastEvent) threw = `${id}/${o.id} said nothing`;
      }
    }
  }
  ok('every answer to every demand resolves and says so', !threw, threw);
}

// ── THE ONE THAT MATTERS: no answer is simply better ──────────────────────────
// The stance failed exactly here. "All in" raised the meter AND the bonds and cost only energy,
// so there was never a reason to pick anything else. An answer that takes nothing from you in
// any currency and gives more meter than the alternatives is that bug rebuilt.
{
  const CUR = ["meter", "mental", "health", "strain", "cash", "ap", "bondDir", "bondCo", "bondCam", "media"];
  const measure = (id, optId) => {
    const got = Object.fromEntries(CUR.map((k) => [k, 0]));
    const N = 160;
    for (let i = 0; i < N; i++) {
      const p = SET(); const s = ST(p); p.demand = { id, at: 2066 * 12 + 3 };
      answerDemand(s, 'p1', optId);
      got.meter += p.meter - 50; got.mental += s.mental - 60; got.health += s.health - 80;
      got.strain += s.strain - 10; got.cash += (s.cash - 200000) / 1000; got.ap += s.ap - 100;
      got.bondDir += p.crew[0].bond - 50; got.bondCo += p.crew[1].bond - 45; got.bondCam += p.crew[2].bond - 48;
      got.media += s.media - 0;
    }
    for (const k of CUR) got[k] /= N;
    return got;
  };
  let dominant = [];
  for (const id of DEMAND_IDS) {
    const rows = DEMANDS[id].options.map((o) => ({ id: o.id, v: measure(id, o.id) }));
    for (const a of rows) {
      for (const b of rows) {
        if (a.id === b.id) continue;
        // a dominates b if it is at least as good on every currency and better on one.
        // strain is the only one where up is bad.
        const better = (k, x, y) => (k === 'strain' ? x < y - 0.01 : x > y + 0.01);
        const worse = (k, x, y) => (k === 'strain' ? x > y + 0.01 : x < y - 0.01);
        const noneWorse = CUR.every((k) => !worse(k, a.v[k], b.v[k]));
        const oneBetter = CUR.some((k) => better(k, a.v[k], b.v[k]));
        if (noneWorse && oneBetter) dominant.push(`${id}: "${a.id}" is simply better than "${b.id}"`);
      }
    }
  }
  ok('no answer is simply better than another on every count', dominant.length === 0, dominant.slice(0, 3).join(' | '));
}

// ── saying no is an answer, not a fine ────────────────────────────────────────
// Every demand must have at least one answer that does not take anything out of the PERSON —
// the whole point of taking the dial out is that there is a version of a shoot you walk off
// in one piece. The film may be worse for it; you are not.
{
  let costsYouEverything = [];
  for (const id of DEMAND_IDS) {
    const free = DEMANDS[id].options.some((o) => {
      let hurt = 0;
      for (let i = 0; i < 60; i++) {
        const p = SET(); const s = ST(p); p.demand = { id, at: 2066 * 12 + 3 };
        answerDemand(s, 'p1', o.id);
        if (s.mental < 60 || s.health < 80 || s.strain > 10 || s.cash < 200000 || s.ap < 100) hurt++;
      }
      return hurt === 0;
    });
    if (!free) costsYouEverything.push(id);
  }
  ok('every demand has an answer that costs YOU nothing', costsYouEverything.length === 0, costsYouEverything.join(', '));
}

// ── nothing in here can cancel a film ─────────────────────────────────────────
// "Safe money always delivers a film" is a guarantee somebody paid for by taking the safe
// money. setlife.js broke it once by nudging stability and the test caught it at 1 lost in
// 3,000. Nothing here touches it at all.
{
  let moved = 0;
  for (const id of DEMAND_IDS) for (const o of DEMANDS[id].options) for (let i = 0; i < 30; i++) {
    const p = SET(); const s = ST(p); p.demand = { id, at: 2066 * 12 + 3 };
    answerDemand(s, 'p1', o.id);
    if ((p.stability ?? 80) !== 80) moved++;
  }
  ok('no answer can make a picture less likely to be finished', moved === 0, String(moved));
}

// ── it asks sometimes, and never twice running, and never twice at all ────────
{
  const now = 2066 * 12 + 3;
  let asked = 0;
  for (let i = 0; i < 500; i++) { const p = SET(); if (rollDemand(ST(p), p)) asked++; }
  ok('most months nobody asks you anything', asked < 300, `${asked}/500`);
  ok('and some months they do', asked > 100, `${asked}/500`);
  let after = 0;
  for (let i = 0; i < 200; i++) { const p = SET(); p._demandMonth = now - 1; if (rollDemand(ST(p), p)) after++; }
  ok('never two months running', after === 0, String(after));
  // and a shoot does not ask the same thing twice
  const p = SET(); const s = ST(p); const seen = [];
  for (let m = 0; m < 60; m++) {
    s.month = 3 + m; p._demandMonth = null; p.demand = null;
    const got = rollDemand(s, p);
    if (got) { if (seen.includes(got)) { fails++; console.log('FAIL  asked ' + got + ' twice on one shoot'); break; } seen.push(got); }
  }
  ok('and never the same thing twice on one picture', seen.length > 3, `${seen.length} different asks`);
  ok('nothing is asked before the first day', rollDemand(ST(SET()), { ...SET(), prepLeft: 2 }) === null);
}

// ── an unanswered month is answered for you, and says so ──────────────────────
{
  const p = SET(); const s = ST(p);
  p.demand = { id: 'nights', at: 2066 * 12 + 2 };   // asked last month
  expireDemands(s);
  ok('a question you ignored is taken as the passive answer', p.demand === null);
  ok('and the card says what they decided', /never gave them an answer/i.test(p._lastAnswer || ''), p._lastAnswer || '');
  const q = SET(); const s2 = ST(q);
  q.demand = { id: 'nights', at: 2066 * 12 + 3 };   // asked THIS month
  expireDemands(s2);
  ok('but this month’s question is still yours to answer', !!q.demand);
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
