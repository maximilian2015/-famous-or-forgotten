// What a career's shelf looks like, on two trees: Asker nominations and wins, and the series award's.
// Written for the series award (20 Oct 2026): the Asker became films only, every series went to its own
// award. Same bot as probe_verdicts.mjs.
//   node tests/probes/probe_awards.mjs <path to extracted/src/> [careers] [label] [tv]
// "tv" plays a television career: the bot reads for series and takes series when it can — the
// ordinary bot takes the best-paid offer, which is nearly always a film, and a television road
// shows up five careers in forty.
import { pathToFileURL } from 'node:url';
const P = pathToFileURL(process.argv[2]).href;
const CAREERS = Number(process.argv[3] || 40), LABEL = process.argv[4] || '', TV = process.argv[5] === 'tv';
const isTv = (x) => ['episode', 'recurring', 'prestige'].includes(x.scale);
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const PR = await import(P + 'systems/career/production.js');
const K = await import(P + 'systems/career/castings.js');
const T = await import(P + 'systems/career/training.js');
const W = await import(P + 'systems/life/work.js');
const rows = [];
for (let k = 0; k < CAREERS; k++) {
  let s = createInitialState({ name: 'Vera Sol', dream: 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 24, year: 2050, month: 0, hasApartment: true, housing: 'flat', cash: 20000, alive: true, ap: 100, apMax: 100, apMaxEff: 100,
    acting: 40, fame: 0, peakFame: 0, respect: 20, offers: [], castingPool: [], submissions: [], running: [], releases: [], laterOffers: [], frozen: [] });
  for (let m = 0; m < 34 * 12; m++) {
    s.bigMoment = null; s.pendingArc = null;
    if (!s.job && (s.fame || 0) < 22) { const j = W.availableJobs(s).filter((x) => x.slots === 1).slice(-1)[0]; if (j) W.takeJob(s, j.id); }
    if (s.job && (s.fame || 0) > 35) W.quitJob(s);
    const best = [...T.SCHOOLS].reverse().find((sc) => (s.cash || 0) > sc.cost * 4);
    if (best && (s.ap || 0) > 1) T.train(s, best.id);
    K.refreshCastingPool(s);
    if (!s.production && !(s.offers || []).length && !(s.submissions || []).length) {
      const pool = (s.castingPool || []).map((c) => ({ c, o: K.castingChance(s, c) + (TV && isTv(c) ? 1000 : 0) })).sort((a, b) => b.o - a.o);
      if (pool[0] && (s.ap || 0) > 0) K.auditionFor(s, pool[0].c.id, 78);
    }
    if ((s.offers || []).length && !s.production) { const o = [...s.offers].sort((a, b) => (TV ? isTv(b) - isTv(a) : 0) || (b.salary || 0) - (a.salary || 0))[0]; PR.startProduction(s, o); s.offers = s.offers.filter((x) => x.id !== o.id); }
    let g = 0; while ((s.ap || 0) > 0 && g++ < 5) { if (s.production) PR.rehearse(s); else break; }
    s = advanceMonth(s);
    if (!s.alive) break;
  }
  const tvShare = (s.filmography || []).filter((c) => !c.minor && ['episode', 'recurring', 'prestige'].includes(c.scale)).length / Math.max(1, (s.filmography || []).filter((c) => !c.minor).length);
  const a = s.awards || {}, z = s.seriesAwards || {};
  // Each series record by the kind of show it was for, and the category.
  const kind = (title) => { const c = (s.filmography || []).find((x) => x.title === title) || {};
    return c.type === 'Soap Opera' ? 'soap' : c.scale === 'prestige' ? 'prestige' : c.scale === 'episode' ? 'guest spot' : c.scale === 'recurring' ? 'network' : 'other'; };
  const tag = (list) => (list || []).map((e) => ({ kind: kind(e.title), category: e.category }));
  // What could have been up at all: series credits over the floor, by show and category (the instrument's check).
  const could = (s.filmography || []).filter((c) => !c.minor && (c.rating || 0) >= 70 && isTv(c))
    .map((c) => ({ kind: kind(c.title), category: (c.tier === 'supporting' || c.role === 'Supporting' || /Guest|Episode|Background/.test(c.role || '')) ? 'supporting' : 'lead' }));
  const guests = (s.filmography || []).filter((c) => c.scale === 'episode');
  rows.push({ guests: guests.length, guestsMinor: guests.filter((c) => c.minor).length, guestBest: Math.max(0, ...guests.map((c) => c.rating || 0)), zCould: could, zNoms: tag(z.nominations), zWins: tag(z.wins), tvShare, askerNoms: (a.nominations || []).length, askerWins: (a.wins || []).filter((w) => w.category !== 'picture').length,
    seriesNoms: (z.nominations || []).length, seriesWins: (z.wins || []).filter((w) => w.category !== 'picture').length, fame: s.fame || 0 });
}
const sum = (f, l = rows) => l.reduce((n, r) => n + f(r), 0);
const show = (name, l) => console.log(`  ${name.padEnd(28)} careers ${String(l.length).padStart(2)} · Asker noms ${sum((r) => r.askerNoms, l)} wins ${sum((r) => r.askerWins, l)} (careers with a win ${l.filter((r) => r.askerWins).length}) · series noms ${sum((r) => r.seriesNoms, l)} wins ${sum((r) => r.seriesWins, l)} (careers with a win ${l.filter((r) => r.seriesWins).length})`);
console.log(`AWARDS ${LABEL} · ${CAREERS} careers × 34 years`);
show('all', rows);
show('mostly film (TV < 25%)', rows.filter((r) => r.tvShare < 0.25));
show('a real TV share (≥ 25%)', rows.filter((r) => r.tvShare >= 0.25));
// The series award in detail (Maxi, 20 Oct): per career, by kind of show, lead against supporting.
const per = rows.map((r) => r.seriesNoms).sort((x, y) => x - y);
const winners = rows.filter((r) => r.seriesWins).map((r) => r.seriesWins).sort((x, y) => y - x);
console.log(`  series award per career: nominations median ${per[per.length >> 1]} · max ${per[per.length - 1]} · careers with one ${rows.filter((r) => r.seriesNoms).length}/${rows.length} · winning careers ${winners.length} (wins each: ${winners.join(' ') || '—'})`);
const table = (key) => { const m = {}; for (const r of rows) for (const e of r[key]) { const k = e.kind; m[k] = m[k] || { lead: 0, supporting: 0, picture: 0 }; m[k][e.category] = (m[k][e.category] || 0) + 1; }
  return Object.entries(m).sort((x, y) => (y[1].lead + y[1].supporting + y[1].picture) - (x[1].lead + x[1].supporting + x[1].picture)).map(([k, v]) => `${k} ${v.lead}/${v.supporting}/${v.picture}`).join(' · '); };
console.log(`  series credits over the floor, lead/supporting:          ${table('zCould')}`);
console.log(`  guest spots: ${sum((r) => r.guests)} (minor ${sum((r) => r.guestsMinor)}), the best rated ${Math.round(Math.max(0, ...rows.map((r) => r.guestBest)))}`);
console.log(`  series nominations by show, lead/supporting/best series: ${table('zNoms')}`);
console.log(`  series wins by show, lead/supporting/best series:        ${table('zWins') || '—'}`);
