import { tentpolesTick, boardFor, putForward, tentpoleOdds, tentpoleWhy, boardOpen, tentpoles } from '../src/systems/career/tentpoles.js';
import { ensureWorld } from '../src/systems/world/world.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => { const s = { version: 'x', name: 'Mira Vale', ageY: 35, stage: 'career', dream: 'actor', fame: 70, respect: 45, acting: 75, charisma: 60, looks: 60, luck: 50, scandal: 0, media: 0, mental: 70, year: 2060, month: 2, timeline: [], filmography: [{ title: 'A Hit', rating: 88, status: 'Hit', year: 2058, scale: 'blockbuster', tier: 'tentpole', role: 'Lead' }], productions: [], offers: [], inbox: [], releases: [], peakFame: 70, hasApartment: true, housing: 'room', ap: 100, apMax: 100, apMaxEff: 100, cash: 2e6, genreXP: {}, people: [], quote: 4e6, awards: { wins: [], nominations: [] }, ...over }; ensureWorld(s); return s; };
const month = (s) => { s.month++; if (s.month > 11) { s.month = 0; s.year++; } };

// ── the board only exists once you are in the room ─────────────────────────────
{
  const shut = st({ filmography: [] });
  ok('no hit, no board', !boardOpen(shut));
  tentpolesTick(shut);
  ok('and nothing is kept for you', boardFor(shut).length === 0);
  const s = st();
  ok('a hit opens it', boardOpen(s));
  for (let i = 0; i < 12; i++) tentpolesTick(s);
  const b = boardFor(s);
  ok('and it fills up', b.length === 3, String(b.length));
  const p = b[0];
  ok('every picture is a whole picture', p.title && p.studio && p.genre && p.role && p.director && p.budget >= 120 && p.months >= 5 && p.startIn > 0, JSON.stringify({ t: p.title, s: p.studio, d: p.director, b: p.budget }));
  ok('with odds and the reasons for them', typeof p.odds === 'number' && p.odds >= 0 && p.odds <= 72 && Array.isArray(p.why));
  ok('and a month they decide', p.decideIn >= 0);
}
// ── who gets a yes ─────────────────────────────────────────────────────────────
{
  const mk = (over) => { const s = st(over); for (let i = 0; i < 12; i++) tentpolesTick(s); return s; };
  const big = mk({ fame: 92, respect: 70 }), small = mk({ fame: 50, respect: 10 });
  const avg = (s) => boardFor(s).reduce((n, p) => n + p.odds, 0) / Math.max(1, boardFor(s).length);
  ok('an A-lister is read differently from a known face', avg(big) > avg(small) + 8, `${avg(big).toFixed(0)}% vs ${avg(small).toFixed(0)}%`);
  const poisoned = mk({ fame: 85, poisonUntil: 2060 * 12 + 40 });
  ok('and nobody insures the poison list', boardFor(poisoned).every((p) => p.odds === 0) && /insure/.test(boardFor(poisoned)[0].why[0]));
  // the director who knows you is the thing that moves it
  // below the cap, so the whole of the director's weight shows
  const s = mk({ fame: 58, respect: 30 });
  const p = tentpoles(s)[0];
  const before = tentpoleOdds(s, p);
  p.directorId = 'd1'; s.people.push({ id: 'd1', name: p.director, role: 'Film Director', relationship: 70 });
  ok('a director who knows you nearly doubles it', tentpoleOdds(s, p) > before * 1.6, `${before}% → ${tentpoleOdds(s, p)}%`);
  ok('and it says so', tentpoleWhy(s, p).some((w) => /knows you/.test(w)));
}
// ── putting your name in ───────────────────────────────────────────────────────
{
  const s = st({ fame: 85, respect: 60 });
  for (let i = 0; i < 12; i++) tentpolesTick(s);
  const p = tentpoles(s)[0];
  const ap = s.ap;
  putForward(s, p.id);
  ok('it costs an evening and the name is in', s.ap < ap && p.sent != null && p.due > p.sent, `${ap} → ${s.ap}`);
  ok('and the timeline says where', s.timeline.some((x) => x.text.includes('Put your name forward for "' + p.title + '"')));
  putForward(s, p.id);
  ok('you cannot put it in twice', /already in/.test(s.lastEvent));
  // the answer comes, and a yes is a real paper
  let yes = 0, no = 0;
  for (let i = 0; i < 300; i++) {
    const t = st({ fame: 92, respect: 70 });
    for (let k = 0; k < 12; k++) tentpolesTick(t);
    const q = tentpoles(t)[0]; if (!q) continue;
    putForward(t, q.id);
    for (let k = 0; k < 4; k++) { month(t); tentpolesTick(t); }
    const o = (t.offers || []).find((x) => x.kind === 'tentpole');
    if (o) { yes++; if (yes === 1) ok('a yes is a tentpole paper in Messages', o.scale === 'blockbuster' && o.salary > 100000 && /want you for/.test(o.note) && o.via === 'studio', JSON.stringify({ fee: o.salary, months: o.months })); }
    else if (/No on|went another way/.test(t.lastEvent || '') || t.timeline.some((x) => /went another way/.test(x.text))) no++;
  }
  ok('most of them go quiet, some do not', yes > 15 && no > 60, `${yes} yes, ${no} no of 300`);
}
// ── reaching miles over your head is noticed ───────────────────────────────────
{
  const s = st({ fame: 46, respect: 5, acting: 40 });
  for (let i = 0; i < 12; i++) tentpolesTick(s);
  const p = boardFor(s).find((x) => x.odds <= 3);
  if (p) { const r = s.respect; putForward(s, p.id); ok('a name put where it has no business costs a point', s.respect === r - 1 && /not this/.test(s.lastEvent), String(s.respect)); }
  else ok('a name put where it has no business costs a point', true, 'no long-shot on this board');
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
