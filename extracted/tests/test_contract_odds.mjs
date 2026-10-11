// The contract room prints a chance next to every ask. It used to print the studio's starting
// figure ("~22%") while the answer was rolled against that figure times your leverage, a third
// less every round after the first. Here the printed number is held to the roll itself: the
// answer is forced just under it and just over it, and must come back yes and no.
import { draftContract, markClause, sendContract, contractsTick, askOdds, askChance, askRound, HALFWAY, openAsks } from '../src/systems/career/contract.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', name: 'Mira Vale', ageY: 34, stage: 'career', dream: 'actor', fame: 60, respect: 40, acting: 70, charisma: 50, looks: 50, luck: 50,
  scandal: 0, media: 0, mental: 60, cash: 100000, year: 2050, month: 2, timeline: [], filmography: [], productions: [], production: null, inbox: [], people: [], ...over });
const film = (over) => ({ id: 'o1', projectTitle: 'Light and Rain III', role: 'Lead', type: 'Feature Film', genre: 'Musical', tier: 'lead', scale: 'blockbuster',
  months: 8, salary: 20000000, deadline: 3, prestigeScore: 55, stability: 90, via: 'studio', ...over });
const setUp = (over, offer) => { const s = st({ ...over, offers: [film(offer)] }); const o = s.offers[0]; draftContract(s, o); return { s, o }; };
const clause = (o, id) => o.contract.clauses.find((c) => c.id === id);
const realRandom = Math.random;
// Send the paper with `id` asked for, and force the answer's roll to land at `roll` (0..100).
const answerAt = (s, o, roll) => { sendContract(s, o.id); s.month += 1; Math.random = () => roll / 100; try { contractsTick(s); } finally { Math.random = realRandom; } };

// ── the number printed is the number rolled ─────────────────────────────────
{
  const { s, o } = setUp();
  markClause(s, o.id, 'merch', 'two');
  const c = clause(o, 'merch'), op = c.options[0];
  const shown = askChance(s, o, c, op).yes;
  const rolled = askOdds(s, o, op, askRound(o));
  ok('the room shows the chance the answer will be rolled against', shown === Math.round(rolled), `${shown} vs ${rolled}`);
  ok('and it is not the studio\'s starting figure', shown !== op.odds, `${shown} vs base ${op.odds}`);
  const yes = setUp(); markClause(yes.s, yes.o.id, 'merch', 'two'); answerAt(yes.s, yes.o, rolled - 0.05);
  ok('a roll just under it is a yes', clause(yes.o, 'merch').result === 'agreed', clause(yes.o, 'merch').result);
  const no = setUp(); markClause(no.s, no.o.id, 'merch', 'two'); answerAt(no.s, no.o, rolled + 0.05);
  ok('and a roll just over it is a no', clause(no.o, 'merch').result === 'refused', clause(no.o, 'merch').result);

  // ── after a no, the next round's number, at once ──────────────────────────
  const r1 = askChance(no.s, no.o, clause(no.o, 'merch'), clause(no.o, 'merch').options[0]).yes;
  markClause(no.s, no.o.id, 'merch', 'two');
  const c2 = clause(no.o, 'merch'), r2odds = askOdds(no.s, no.o, c2.options[0], askRound(no.o));
  const r2 = askChance(no.s, no.o, c2, c2.options[0]).yes;
  ok('after a no, the paper is on round 2', askRound(no.o) === 2, String(askRound(no.o)));
  ok('and the chance printed drops by the third the roll takes off', r2 === Math.round(r2odds) && Math.abs(r2odds - rolled * 0.7) < 0.001 && r2 < shown, `${shown} → ${r2} (${r1})`);
  const yes2 = no; answerAt(yes2.s, yes2.o, r2odds - 0.05);
  ok('and round 2 is rolled against that lower number', clause(yes2.o, 'merch').result === 'agreed');
}
// ── who you are moves it ─────────────────────────────────────────────────────
{
  const star = setUp({ fame: 60 }), icon = setUp({ fame: 95, agent: { name: 'Ava Stone', level: 4, tier: 'legend' } });
  const a = askChance(star.s, star.o, clause(star.o, 'merch'), clause(star.o, 'merch').options[0]).yes;
  const b = askChance(icon.s, icon.o, clause(icon.o, 'merch'), clause(icon.o, 'merch').options[0]).yes;
  ok('a bigger name with a better agent is shown a better chance, because it has one', b > a, `${a} vs ${b}`);
  const shaky = setUp({ fame: 60 }, { stability: 50 });
  ok('and a production that needs somebody gives more ground', askChance(shaky.s, shaky.o, clause(shaky.o, 'merch'), clause(shaky.o, 'merch').options[0]).yes > a);
}
// ── the fee, which can also come back halfway ────────────────────────────────
{
  const { s, o } = setUp();
  const fee = clause(o, 'fee'); const op = fee && fee.options[0];
  if (op) {
    const odds = askOdds(s, o, op, askRound(o)); const ch = askChance(s, o, fee, op);
    ok('on the fee the room also says how often they meet you halfway', ch.halfway === Math.round(Math.min(100, odds * HALFWAY) - Math.min(100, odds)) && ch.halfway > 0, JSON.stringify(ch));
    markClause(s, o.id, 'fee', op.id); answerAt(s, o, odds + 0.05);
    ok('and a roll in that band is halfway', clause(o, 'fee').result === 'counter', clause(o, 'fee').result);
  } else ok('a blockbuster has a fee to discuss', false);
  const m = setUp(); const mc = clause(m.o, 'merch');
  ok('nothing but the fee promises halfway', askChance(m.s, m.o, mc, mc.options[0]).halfway === 0);
}
// ── what they already gave is not offered again ─────────────────────────────
// Maxi, 11 Oct: back end agreed at 5%, and Discuss still offered "Ask for 5%" at 18%; the same on
// pay-or-play. An ask they said yes to is the paper now. An ask they refused can be made again.
{
  const { s, o } = setUp({ fame: 90 });   // back end is for the A-list
  const asked = ['backend', 'payOrPlay', 'merch'].filter((id) => clause(o, id) && clause(o, id).options.length);
  ok('an A-lister\'s blockbuster paper has back end, pay-or-play and merchandise to discuss', asked.length === 3, asked.join(','));
  for (const id of ['backend', 'payOrPlay']) markClause(s, o.id, id, clause(o, id).options[0].id);
  markClause(s, o.id, 'merch', 'two');
  // Yes to the first two, no to the merchandise: the roll is forced per clause, in order.
  sendContract(s, o.id); s.month += 1;
  const rolls = [0, 0, 0.999]; let n = 0; Math.random = () => rolls[Math.min(n++, rolls.length - 1)];
  try { contractsTick(s); } finally { Math.random = realRandom; }
  for (const id of ['backend', 'payOrPlay']) {
    const c = clause(o, id);
    ok(`${id}: agreed, and nothing left to ask for`, c.result === 'agreed' && openAsks(c).length === 0, `${c.result} · ${openAsks(c).map((x) => x.label).join('|')}`);
    const before = c.stance; markClause(s, o.id, id, c.options[0].id);
    ok(`${id}: asking again for what the paper says is refused, out loud`, c.stance === before && /already says/.test(s.lastEvent || ''));
  }
  const m = clause(o, 'merch');
  ok('merchandise: refused, and still there to ask for next round', m.result === 'refused' && openAsks(m).length === 1);
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
