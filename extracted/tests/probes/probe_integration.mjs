// A whole career, through everything that came in together (decline preview, the premiere card,
// film stories, the cover): `node tests/probes/probe_integration.mjs [careers] [years]`.
//
// A bot lives each month the way an ordinary player would — auditions, takes what it gets, answers
// what the set asks (and covers for a co-star more often than not, so the story gets exercised),
// plays the scene days at a random quality, answers every event and story beat, and saves and
// reloads every two years. After every month it checks what must never be true, and prints the
// first time each one happens. It also counts how often each new thing actually ran: a check on
// a feature that never ran is not a check (CLAUDE.md, "check the probe before believing it").
//
// And one old life: Alex Moon's save, loaded the way the game loads it, played ten more years.
import '../helpers/seeded.mjs';           // the same lives every run, so a finding can be replayed
import fs from 'node:fs';
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const K = await import(P + 'systems/career/castings.js');
const PR = await import(P + 'systems/career/production.js');
const ST = await import(P + 'systems/career/story.js');
const W = await import(P + 'systems/life/work.js');
const EM = await import(P + 'systems/meta/email.js');
const D = await import(P + 'systems/career/demands.js');
const SC = await import(P + 'systems/career/scenes.js');
const SW = await import(P + 'systems/career/scenework.js');
const A = await import(P + 'systems/life/arcs.js');
const { CHAINS } = await import(P + 'meta/stories.js'.replace('meta/', 'systems/meta/'));

const CAREERS = +process.argv[2] || 20, YEARS = +process.argv[3] || 20;
const first = {};                       // the first time each broken rule was seen
const broke = (rule, where) => { if (!first[rule]) first[rule] = where; first[rule + '#'] = (first[rule + '#'] || 0) + 1; };
const ran = {};                          // how often each new thing actually happened
const count = (k, n = 1) => { ran[k] = (ran[k] || 0) + n; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const finite = (v) => v == null || Number.isFinite(v);

function month(t, life, m, plots) {
  const where = `life ${life}, ${t.year}/${t.month + 1}`;
  t.bigMoment = null;
  // an event or a story beat: answer it
  for (let k = 0; k < 4 && t.pendingArc; k++) {
    const arc = t.pendingArc; const n = (arc.choices || []).length || 1;
    const before = t.respect || 0; const i = Math.floor(Math.random() * n);
    const label = arc.choices && arc.choices[i] ? arc.choices[i].label : '';
    if (arc.story === 'cover') count('cover beat: ' + arc.beat);
    A.resolveArc(t, i);
    if (arc.story === 'cover' && arc.beat === 'found' && (t.respect || 0) !== before) broke('the lie moved Standing', where + ' · ' + label);
    if (t.pendingArc === arc) { t.pendingArc = null; break; }
  }
  // the scene day, if one is waiting
  if (t.scene) {
    count('scene day'); if (t.scene.page) count('scene day with a page of the story');
    if (t.scene.game === 'chrono') { const p = (t.productions || []).find((x) => x.id === t.scene.setId); const c = p && SW.chronologyFor(t, p, 1); if (c && c.ask) count('"Out of order" from the story'); }
    SC.resolveScene(t, 20 + Math.random() * 80);
  }
  // what the set is asking for
  for (const p of t.productions || []) {
    if (!p.demand) continue;
    const opts = D.optionsFor(t, p); if (!opts.length) continue;
    const o = p.demand.id === 'cover' && Math.random() < 0.7 ? opts.find((x) => x.id === 'cover') || pick(opts) : pick(opts);
    if (p.demand.id === 'cover' && o.id === 'cover') count('covered for a co-star');
    D.answerDemand(t, p.id, o.id);
  }
  for (const p of t.productions || []) if (!p.take) { const opts = ST.takesFor(p); if (opts.length) ST.pushTake(t, pick(opts)); }
  if (!t.job && (t.fame || 0) < 20) { const j = W.availableJobs(t)[0]; if (j) W.takeJob(t, j.id); }
  if (t.job && (t.fame || 0) > 35) W.quitJob(t);
  K.refreshCastingPool(t);
  if ((t.productions || []).length < 1 && (t.ap || 0) >= 30 && (t.castingPool || []).length) {
    const c = pick(t.castingPool);
    if (Math.random() < 0.4) K.prepareFor(t, c.id);
    K.auditionFor(t, c.id, 45 + Math.random() * 40);
  }
  for (const o of t.offers || []) if (o.plot) {
    count('offer with a story');
    if (o.premise && o.premise.includes(o.plot.twist.slice(0, 30))) broke('the twist is on the offer', where + ' · ' + o.projectTitle);
    if (/[{}]/.test(o.premise + ' ' + ((o.character || {}).what || ''))) broke('an unfilled word on the offer', where + ' · ' + o.premise);
  }
  if ((t.offers || []).length && (t.productions || []).length < 2) { const o = t.offers[0]; PR.startProduction(t, o); t.offers = t.offers.filter((x) => x.id !== o.id); }
  if ((t.productions || []).length && Math.random() < 0.5) PR.rehearse(t);
  t = advanceMonth(t);
  const L = (t.inbox || []).find((x) => x.tag === 'agent'); if (L) EM.emailAct(t, L.id, 0);
  // the rules
  for (const k of ['fame', 'respect', 'cash', 'media', 'scandal', 'mental', 'health']) if (!finite(t[k])) broke(`${k} is not a number`, where);
  for (const st of t.stories || []) if (!CHAINS[st.id]) broke('a story the game does not know', where + ' · ' + st.id);
  for (const g of t.grudges || []) if ('why' in g && typeof g.why !== 'string') broke('a grudge with a broken reason', where);
  for (const g of t.grudges || []) if (g.why) count('grudge with its reason (months held)');
  for (const x of [...(t.offers || []), ...(t.laterOffers || []).map((l) => l.offer).filter(Boolean), ...(t.productions || []), ...(t.releases || []), ...(t.filmography || [])]) {
    if (!x.plot) continue;
    const key = x.title || x.projectTitle; const now = JSON.stringify(x.plot);
    const what = `${x.kind || (x.projectTitle ? 'offer' : 'project')}:${x.id || '-'}:${x.via || ''}`;
    if (plots.has(key) && plots.get(key).plot !== now) broke('a film was given a second story', `${where} · ${key} · first ${plots.get(key).what}, now ${what}`);
    if (!plots.has(key)) plots.set(key, { plot: now, what });
  }
  if (t.memory) count('memory events (months)', 0), (ran['memory events (largest)'] = Math.max(ran['memory events (largest)'] || 0, t.memory.events.length));
  // save and reload, as a phone would, every two years
  if (process.env.TRACE) { const T = process.env.TRACE; const at = (l) => (l || []).filter((x) => x && (x.title || x.projectTitle) === T).map((x) => `${x.kind || ''}/${x.id}/${x.plot ? x.plot.shape + ':' + x.plot.hero.slice(0, 25) : 'no plot'}/${(x.premise || '').slice(0, 30)}`);
    const line = { offers: at(t.offers), later: at((t.laterOffers || []).map((l) => l.offer)), prod: at(t.productions), frozen: at(t.frozen), rel: at(t.releases), film: at(t.filmography) };
    if (Object.values(line).some((v) => v.length)) console.log(where, JSON.stringify(line)); }
  if (m % 24 === 23) t = JSON.parse(JSON.stringify(t));
  return t;
}

function career(life) {
  let t = createInitialState({ name: 'P' + life, dream: 'actor', created: true, gender: life % 2 ? 'female' : 'male' });
  beginLife(t);
  Object.assign(t, { stage: 'career', ageY: 22, year: 2050, month: 0, hasApartment: true, housing: 'room', cash: 9000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, fame: 0, peakFame: 0 });
  const plots = new Map();
  for (let m = 0; m < YEARS * 12 && t.alive !== false; m++) {
    try { t = month(t, life, m, plots); } catch (e) { broke('it threw', `life ${life}, ${t.year}/${t.month + 1}: ${e.message}\n      ${(e.stack || '').split('\n')[1]}`); return; }
  }
  count('films with a story at the end', [...plots.keys()].length);
  count('credits', (t.filmography || []).filter((c) => !c.minor).length);
}

const t0 = Date.now();
for (let i = 0; i < CAREERS; i++) career(i);

// The old life: Alex Moon's save, loaded as the game loads it, ten more years.
const SAVE = new URL('../../../saves/famous-Alex-Moon-53-2079.json', import.meta.url);
if (fs.existsSync(SAVE)) {
  const store = new Map([['fof_react_save', fs.readFileSync(SAVE, 'utf8')]]);
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const { getState } = await import(P + 'state/store.js');
  let t = JSON.parse(JSON.stringify(getState()));
  if (t.name !== 'Alex Moon') broke('the old save did not load', t.lastEvent);
  else {
    const before = new Map((t.filmography || []).map((c) => [c.title, JSON.stringify([c.premise, c.plot || null])]));
    const plots = new Map();
    for (let m = 0; m < 120 && t.alive !== false; m++) {
      try { t = month(t, 'Alex Moon', m, plots); } catch (e) { broke('it threw', `Alex Moon, ${t.year}/${t.month + 1}: ${e.message}\n      ${(e.stack || '').split('\n')[1]}`); break; }
    }
    for (const c of t.filmography || []) if (before.has(c.title) && before.get(c.title) !== JSON.stringify([c.premise, c.plot || null])) broke('an old film was re-told', 'Alex Moon · ' + c.title);
    count('Alex Moon: old films still as they were', [...before.keys()].filter((k) => (t.filmography || []).some((c) => c.title === k)).length);
    count('Alex Moon: years played', Math.round((t.year - 2079)));
  }
}

console.log(`${CAREERS} careers × ${YEARS} years, and Alex Moon's save for ten more — ${Math.round((Date.now() - t0) / 1000)} s\n`);
console.log('What ran:');
for (const [k, v] of Object.entries(ran).sort()) console.log(`  ${String(v).padStart(7)}  ${k}`);
const rules = Object.keys(first).filter((k) => !k.endsWith('#'));
console.log(rules.length ? '\nBROKEN:' : '\nNothing broken.');
for (const r of rules) console.log(`  ${r} (${first[r + '#']}×) — first: ${first[r]}`);
process.exit(rules.length ? 1 : 0);
