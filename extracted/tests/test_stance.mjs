import { startProduction, stanceTick, setStance, stanceOf, STANCES, rehearse, rehearsalsThisMonth } from '../src/systems/career/production.js';
import { draftContract, signContract, startSigned, contractsTick } from '../src/systems/career/contract.js';
import { AMBITIONS, AMBITION_ORDER, ambitionProgress, ambitionVerdict } from '../src/systems/meta/ambition.js';
import { YOUTH_EVENTS } from '../src/systems/life/youth.js';
import { resolveArc } from '../src/systems/life/arcs.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', name: 'Mira Vale', ageY: 30, stage: 'career', dream: 'actor', fame: 40, respect: 30, acting: 60, charisma: 50, looks: 50, luck: 50, scandal: 0, media: 0, mental: 60, year: 2050, month: 2, timeline: [], filmography: [], productions: [], offers: [], inbox: [], releases: [], peakFame: 40, hasApartment: true, housing: 'room', ap: 100, apMax: 100, apMaxEff: 100, cash: 100000, genreXP: {}, quote: 0, people: [], strain: 10, ...over });
const offer = (over) => ({ id: 'o1', via: 'casting', projectTitle: 'Golden Echo', role: 'Lead', type: 'Feature Film', genre: 'Thriller', salary: 300000, months: 4, tier: 'lead', scale: 'feature', prestigeScore: 60, stability: 90, deadline: 3, ...over });
const month = (s) => { s.month++; if (s.month > 11) { s.month = 0; s.year++; } };

// ── the stance does the month's work ────────────────────────────────────────────
{
  const s = st(); startProduction(s, offer()); const p = s.productions[0];
  ok('a set turns up prepared by default', stanceOf(p) === 'steady');
  const m0 = p.meter, b0 = p.crew[0].bond; s.ap = 100;
  stanceTick(s);
  ok('the top of the month: energy taken, quality up, the director warmer', s.ap === 100 - STANCES.steady.cost && p.meter > m0 && p.crew[0].bond > b0 && p._workedMonth === s.year * 12 + s.month, `${s.ap} ${p.meter - m0}`);
  ok('it counts as the first rehearsal', rehearsalsThisMonth(s, p.id) === 1);
  const m1 = p.meter; rehearse(s, p.id);
  ok('and you can still push past it', p.meter > m1 && rehearsalsThisMonth(s, p.id) === 2);
  setStance(s, p.id, 'coast'); s.ap = 100; p._workedMonth = null; stanceTick(s);
  ok('coast: nothing taken, nothing done', s.ap === 100 && !p._workedMonth);
  setStance(s, p.id, 'allin'); s.ap = 100; const b1 = p.crew[2].bond; const st0 = s.strain; stanceTick(s);
  ok('all in: the crew too, and it costs', s.ap === 100 - STANCES.allin.cost && p.crew[2].bond > b1 && s.strain > st0);
  s.ap = 10; stanceTick(s);
  ok('a month you cannot afford is a month you coasted, and it says so', s.ap === 10 && p._stanceDone === 'broke' && (s.apWhy || []).some((w) => /coasted/.test(w)));
}
// ── the date on the paper is the month the shoot starts ─────────────────────────
{
  const s = st(); const o = offer(); s.offers = [o];
  const k = draftContract(s, o); const sc = k.clauses.find((c) => c.id === 'schedule');
  ok('free: the paper says this month, and cameras roll this month', sc.value.start === s.year * 12 + s.month && /from Mar 2050/.test(sc.text), sc.text);
  signContract(s, 'o1');
  ok('signed and started', s.productions.length === 1 && !s.offers.length);
  // a studio date months out
  const t = st(); const now = t.year * 12 + t.month;
  const seq = offer({ id: 'seq', kind: 'sequel', part: 2, projectTitle: 'Golden Echo II', startAt: now + 4, waitsForWrap: true }); t.offers = [seq];
  const k2 = draftContract(t, seq); const sc2 = k2.clauses.find((c) => c.id === 'schedule');
  ok('the studio’s date is the date', sc2.value.start === now + 4 && /the studio's date/.test(sc2.text));
  signContract(t, 'seq');
  ok('signed: it waits for the date', seq.signed && seq.waitsForWrap && !t.productions.length);
  for (let i = 0; i < 3; i++) { month(t); startSigned(t); }
  ok('the month before, nothing', !t.productions.length);
  month(t); startSigned(t);
  ok('the studio’s month: cameras roll', t.productions.length === 1 && t.productions[0].title === 'Golden Echo II');
  // a second paper that runs past the first one's date is warned about, and the signed one goes live on the paper
  const u = st({ respect: 10 }); const nu = u.year * 12 + u.month;   // no second set at ten: the sequel has to wait
  const seq2 = offer({ id: 'seq2', kind: 'sequel', part: 2, projectTitle: 'Golden Echo II', startAt: nu + 2, waitsForWrap: true, exclusive: true }); u.offers = [seq2];
  draftContract(u, seq2); signContract(u, 'seq2');
  const other = offer({ id: 'oth', projectTitle: 'Apartment 45', months: 7 }); u.offers.push(other);
  const k3 = draftContract(u, other); const sc3 = k3.clauses.find((c) => c.id === 'schedule');
  ok('a shoot that runs past a signed date is warned about on the paper', /⚠ You are signed for "Golden Echo II"/.test(sc3.text) && /will not hold it past/.test(sc3.text), sc3.text);
  signContract(u, 'oth');
  month(u); month(u); startSigned(u);
  const k4 = draftContract(u, seq2); const sc4 = k4.clauses.find((c) => c.id === 'schedule');
  ok('the signed paper says where it stands now, not the month it was drafted', /after "Apartment 45" wraps/.test(sc4.text) && /They expected you in May/.test(sc4.text), sc4.text);
  month(u); month(u); contractsTick(u);
  ok('two months past the date they recast', !u.offers.some((x) => x.id === 'seq2') && u.timeline.some((x) => /they held it as long as they could/.test(x.text)));
}
// ── the ambition at ten ────────────────────────────────────────────────────────
{
  const ev = YOUTH_EVENTS.find((e) => e.id === 'dreamChoice'); const built = ev.build({});
  ok('five things to want at ten', built.choices.length === 5 && AMBITION_ORDER.every((id) => AMBITIONS[id].label && AMBITIONS[id].want));
  const s = st({ ageY: 10, stage: 'child', dream: null }); s.pendingArc = { id: 'dreamChoice', youth: true, speaker: built.speaker, text: built.text, choices: built.choices };
  resolveArc(s, AMBITION_ORDER.indexOf('tv'));
  ok('chosen: remembered, and the road is still acting', s.ambition === 'tv' && s.dream === 'actor');
  s.filmography = Array.from({ length: 8 }, (_, i) => ({ title: 'Show', episodes: 10, scale: 'recurring', season: i + 1, year: 2050 + i, rating: 70 })); s.peakFame = 60;
  const p = ambitionProgress(s);
  ok('eight seasons: the television face got it', p && p.met && /8 seasons/.test(p.line), p && p.line);
  ok('and the stone says so', /and you were/.test(ambitionVerdict(s).text) && ambitionVerdict(s).points === 150);
  const w = st({ ambition: 'star' }); ok('a movie star with nothing to show: it went another way', /another way/.test(ambitionVerdict(w).text));
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
