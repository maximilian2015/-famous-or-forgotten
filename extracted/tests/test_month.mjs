import { startProduction, shootTick, rehearse, rehearsalsThisMonth } from '../src/systems/career/production.js';
import { draftContract, signContract, startSigned, contractsTick } from '../src/systems/career/contract.js';
import { AMBITIONS, AMBITION_ORDER, ambitionProgress, ambitionVerdict } from '../src/systems/meta/ambition.js';
import { YOUTH_EVENTS } from '../src/systems/life/youth.js';
import { resolveArc } from '../src/systems/life/arcs.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', name: 'Mira Vale', ageY: 30, stage: 'career', dream: 'actor', fame: 40, respect: 30, acting: 60, charisma: 50, looks: 50, luck: 50, scandal: 0, media: 0, mental: 60, year: 2050, month: 2, timeline: [], filmography: [], productions: [], offers: [], inbox: [], releases: [], peakFame: 40, hasApartment: true, housing: 'room', ap: 100, apMax: 100, apMaxEff: 100, cash: 100000, genreXP: {}, quote: 0, people: [], strain: 10, ...over });
const offer = (over) => ({ id: 'o1', via: 'casting', projectTitle: 'Golden Echo', role: 'Lead', type: 'Feature Film', genre: 'Thriller', salary: 300000, months: 4, tier: 'lead', scale: 'feature', prestigeScore: 60, stability: 90, deadline: 3, ...over });
const month = (s) => { s.month++; if (s.month > 11) { s.month = 0; s.year++; } };

// ── the month's work, which is not a decision ───────────────────────────────────
// This block used to test the STANCE: coast / turn up prepared / all in, at 0, 15 and 35
// energy. Maxi: "я вообще не хочу эту систему, надо убрать всё." The three differed only in
// price and the dearest won whenever you could afford it, so the card never asked anything.
// What is left is the half of it that was never a decision in the first place — an actor does
// not choose whether to act — and it must cost nothing, because being charged for turning up
// is what made the dial look like a choice. The choice is career/demands.js now.
{
  const s = st(); startProduction(s, offer()); const p = s.productions[0];
  const m0 = p.meter; s.ap = 100;
  shootTick(s);
  ok('the month does its own work and the picture moves', p.meter > m0, String(p.meter - m0));
  // And it does NOT count as having put something in. That distinction is the whole of the new
  // model: the picture gets made whether or not you engage with it, and the director notices
  // the actor who only turns up. A scene day stamps this, and so does answering them.
  ok('but turning up is not the same as working, and the month does not pretend it is', !p._workedMonth);
  ok('and it takes no energy, because turning up is the job', s.ap === 100);
  const m1 = p.meter; s.ap = 100; rehearse(s, p.id);
  ok('and you can still put a morning into it on top', p.meter > m1 && rehearsalsThisMonth(s, p.id) === 1);
  // A better actor gets more out of the same month. This is what carries a picture now that
  // nobody is paying energy for it, so it has to actually depend on the craft.
  const gain = (acting) => { let t = 0; for (let i = 0; i < 160; i++) { const u = st({ acting }); startProduction(u, offer()); const q = u.productions[0]; const b = q.meter; shootTick(u); t += q.meter - b; } return t / 160; };
  const poor = gain(20), good = gain(90);
  ok('and a better actor gets more out of the same month', good > poor + 1.5, `${poor.toFixed(1)} vs ${good.toFixed(1)}`);
  // The director's opinion belongs to productionTick, which reads the work. shootTick must not
  // have a second quiet channel into it — the first version did, at +0..2 a month, and it beat
  // the rule that was supposed to own it.
  let moved = 0;
  for (let i = 0; i < 200; i++) { const u = st(); startProduction(u, offer()); const q = u.productions[0]; const b = q.crew[0].bond; shootTick(u); if (q.crew[0].bond !== b) moved++; }
  ok('and the month itself never touches what the director thinks of you', moved === 0, String(moved));
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
