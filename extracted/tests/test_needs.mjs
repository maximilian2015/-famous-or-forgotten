// Relationships 2.0 V1 (life/needs.js): the foundation, and the first need played through.
//   foundation — a need comes from the person's state; one live need per person and one put
//   to you at a time; a deadline, and not answering is an answer; a cooldown; a memory of facts
//   capped at eight; old saves load; a save and reload in the middle of it changes nothing.
//   the rent  — a close friend cannot pay it: pay, lend, put them up, or no; each remembered;
//   the loan comes back; and when it is you who is short, the friend who owes you covers you.
import { needsTick, openNeed, resolveNeed, NEEDS, SPACING, MEMORY_CAP, remember, memoryOf, memoryLines, needCards, closeFriend } from '../src/systems/life/needs.js';
import { arcCard, resolveArc } from '../src/systems/life/arcs.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const realRandom = Math.random;
const forced = (v, fn) => { Math.random = () => v; try { return fn(); } finally { Math.random = realRandom; } };
const friend = (over) => ({ id: 'f1', name: 'Maya Ortiz', role: 'Fellow Actor', industryWeight: 30, relationship: 50, ...over });
const st = (over) => ({ alive: true, stage: 'career', name: 'Alex Moon', year: 2071, month: 3, cash: 60000, ap: 100, apMax: 100, hasApartment: true, livingWith: 'own_place',
  timeline: [], people: [friend()], family: [], ...over });
const month = (s) => { s.month += 1; if (s.month > 11) { s.month = 0; s.year += 1; } };
const stamp = (s) => s.year * 12 + s.month;
const ask = (s) => forced(0, () => needsTick(s));   // every chance in the month comes up yes
const choose = (s, id) => { openNeed(s, 'f1'); const i = s.pendingArc.choices.findIndex((c) => c.label.toLowerCase().startsWith(id)); return resolveArc(s, i); };

// ── where a need comes from ──────────────────────────────────────────────────
{
  const s = st(); ask(s);
  ok('a close friend who is a fellow actor, while you are doing well, can ask', !!s.people[0].need && s.people[0].need.id === 'rent');
  for (const [why, over, me] of [['cold', { cold: true }], ['drifted', { drifted: true }], ['not close (30)', { relationship: 30 }], ['an agent', { agent: true }], ['a director', { role: 'Film Director' }]]) {
    const t = st({ people: [friend(over)] }); ask(t);
    ok(`nobody asks if they are ${why}`, !t.people[0].need);
  }
  const poor = st({ cash: 5000 }); ask(poor);
  ok('and nobody asks you for rent money you do not have', !poor.people[0].need);
  ok('a close friend is the rule the texts already use: 40 and not cold', closeFriend(friend()) && !closeFriend(friend({ relationship: 39 })));
}
// ── one at a time, and not too often ─────────────────────────────────────────
{
  const s = st({ people: [friend(), friend({ id: 'f2', name: 'Theo Lark' })] }); ask(s);
  ok('two friends who could both ask: only one does', s.people.filter((p) => p.need).length === 1);
  month(s); ask(s);
  ok('and the other does not ask while one is waiting', s.people.filter((p) => p.need).length === 1);
  const who = s.people.find((p) => p.need); choose(s, 'pay');
  month(s); ask(s);
  ok(`after an answer, nobody asks again for ${SPACING} months`, s.people.every((p) => !p.need));
  for (let i = 0; i < SPACING; i++) { month(s); ask(s); }
  const next = s.people.find((p) => p.need);
  ok('then somebody can', !!next && next !== who, next ? next.name : 'nobody');
  ok('and the one who was answered waits their own cooldown', (who.needCool || 0) - stamp(s) > 10);
}
// ── the deadline: not answering is an answer ─────────────────────────────────
{
  const s = st(); ask(s); const p = s.people[0]; const before = p.relationship, seen = p.lastSeen;
  ok('the card says how long they will wait', needCards(s)[0] && /2071/.test(needCards(s)[0].until));
  month(s); ask(s);
  ok('a month later it is still waiting', !!p.need);
  month(s); month(s); ask(s);
  ok('past the deadline it is gone, and remembered as ignored', !p.need && memoryOf(p).some((m) => m.k === 'rent' && m.a === 'ignored'));
  ok('it cost the friendship, and it was not contact', p.relationship < before && p.lastSeen === seen && p.neglect === 1);
}
// ── the memory is facts, and it stops at eight ───────────────────────────────
{
  const p = friend(); const s = st();
  for (let i = 0; i < 12; i++) remember(s, p, { k: 'rent', a: 'refused' });
  ok(`at most ${MEMORY_CAP} things remembered`, memoryOf(p).length === MEMORY_CAP);
  ok('each one a fact with a month, no prose stored', memoryOf(p).every((m) => typeof m.at === 'number' && !('text' in m)));
  ok('and the words are made from it when shown', /asked for help with the rent in Apr 2071\. You said no\./.test(memoryLines(p)[0]), memoryLines(p)[0]);
}
// ── old saves, and a save in the middle of it ────────────────────────────────
{
  const old = JSON.parse(JSON.stringify(st()));   // nothing new on anybody
  let threw = null; try { needsTick(old); openNeed(old, 'f1'); } catch (e) { threw = e.message; }
  ok('a save from before this loads and ticks', !threw, threw || '');
  const s = st(); ask(s);
  const back = JSON.parse(JSON.stringify(s));        // what localStorage holds
  ok('a live need survives a save and reload', back.people[0].need && back.people[0].need.id === 'rent' && back.people[0].need.data.amount === s.people[0].need.data.amount);
  choose(back, 'lend');
  const again = JSON.parse(JSON.stringify(back));
  ok('and so does the memory of the answer, with its due date', memoryOf(again.people[0]).some((m) => m.a === 'lent' && m.due === stamp(back) + 12));
}
// ── the rent, every answer ───────────────────────────────────────────────────
{
  const s = st(); ask(s); const p = s.people[0]; const n = p.need.data.amount;
  openNeed(s, 'f1');
  const card = arcCard(s, s.pendingArc);
  const words = (c) => (c.tags || []).map((x) => x.t).join('|');
  ok('the screen puts it as the friend asking', /a friend/.test(card.choices && s.pendingArc.speaker));
  ok('paying says what it costs and that they will owe you', new RegExp(`−€${n.toLocaleString('en-US')}`).test(words(card.choices[0])) && /owes you/.test(words(card.choices[0])), words(card.choices[0]));
  const cash = s.cash; resolveArc(s, 0);
  ok('pay: the money goes, they owe you, it is remembered', s.cash === cash - n && p.owes === true && memoryOf(p).some((m) => m.a === 'paid' && m.n === n) && !p.need);
  const t = st(); ask(t); const q = t.people[0]; const rel = q.relationship; choose(t, 'i cannot');
  ok('no: closeness down, one more neglect, remembered', q.relationship < rel && q.neglect === 1 && memoryOf(q).some((m) => m.a === 'refused'));
  const u = st(); ask(u); const r = u.people[0]; choose(u, 'let me think');
  ok('"let me think": the screen closes and they keep waiting', !u.pendingArc && !!r.need);
  const tired = st({ ap: 0 }); ask(tired); openNeed(tired, 'f1');
  const host = arcCard(tired, tired.pendingArc).choices.find((c) => /Stay at mine/.test(c.label));
  ok('putting them up when you have no energy left is locked, and says why', host && host.locked && /energy/i.test(host.locked), host && host.locked);
  const i = tired.pendingArc.choices.findIndex((c) => /Stay at mine/.test(c.label)); resolveArc(tired, i);
  ok('and pressing it does nothing but say so: the need is still there', !!tired.people[0].need);
  const noRoof = st({ livingWith: 'parents' }); ask(noRoof); openNeed(noRoof, 'f1');
  ok('nobody is offered your sofa when you live at your parents\'', !noRoof.pendingArc.choices.some((c) => /Stay at mine/.test(c.label)));
}
// ── later: the loan comes back, and the debt is called in when you are short ─
{
  const s = st(); ask(s); const p = s.people[0]; const n = p.need.data.amount; choose(s, 'lend');
  const cash = s.cash;
  for (let i = 0; i < 11; i++) { month(s); needsTick(s); }
  ok('the loan is not back before the year is up', s.cash === cash);
  month(s); needsTick(s);
  ok('a year on, it is paid back, and remembered', s.cash === cash + n && memoryOf(p).some((m) => m.a === 'repaid') && memoryLines(p).some((l) => /paid it back in Apr 2072/.test(l)) && memoryLines(p).length === 1);
  const t = st(); ask(t); const q = t.people[0]; choose(t, 'pay');
  for (let i = 0; i < 5; i++) { month(t); needsTick(t); }
  t.cash = -900; month(t); needsTick(t);
  ok('short yourself, the friend who owes you covers you — once', t.cash > 0 && q.owes === false && memoryOf(q).some((m) => m.k === 'favour' && m.a === 'returned'));
  ok('and says why, from the memory', /You paid my rent in Apr 2071\. My turn\./.test(t.lastEvent || ''), t.lastEvent);
  t.cash = -500; month(t); needsTick(t);
  ok('the debt is paid: they do not do it twice', t.cash === -500);
}
// ── the next time opens with the last time ───────────────────────────────────
{
  const s = st(); ask(s); const p = s.people[0]; choose(s, 'i cannot');
  p.needCool = 0; s.needAt = null; p.relationship = 50;   // let them ask again now
  ask(s); openNeed(s, 'f1');
  ok('they remember the no', /I know what you said last time/.test(s.pendingArc.text), s.pendingArc.text.slice(0, 80));
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
