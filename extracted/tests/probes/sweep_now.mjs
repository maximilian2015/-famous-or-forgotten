// A bug hunt over the systems added since the last sweep: the story room, submissions,
// delayed sequels, films in cinemas, the casting board and the inbox. Plays long lives
// doing everything at random and audits the save after EVERY month.
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const K = await import(P + 'systems/career/castings.js');
const PR = await import(P + 'systems/career/production.js');
const ST = await import(P + 'systems/career/story.js');
const E = await import(P + 'systems/meta/email.js');
const T = await import(P + 'systems/career/training.js');
const W = await import(P + 'systems/life/work.js');
const L = await import(P + 'systems/life/dating.js');
const C = await import(P + 'systems/life/children.js');

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

// Everything that must be true of a save, every month, forever.
function audit(s) {
  const bad = [];
  // A month that ends in a death returns early and never reaches the housekeeping, so a
  // corpse legitimately has a stale board. Nothing below applies to one.
  if (!s.alive) return bad;
  const now = (s.year || 0) * 12 + (s.month || 0);

  // ── the story room ──────────────────────────────────────────────────────────
  if (s.production && s.production.take && !ST.TAKES[s.production.take]) bad.push('unknown take: ' + s.production.take);
  if (s.production && !s.production.premise) bad.push('a shoot with nothing to be about');
  for (const c of [...(s.filmography || []), ...(s.discography || [])]) {
    if (c.take && !ST.TAKES[c.take]) bad.push('credit carries an unknown take: ' + c.take);
    if (c.score != null && (c.score < 0 || c.score > 10)) bad.push(`${c.title} scored ${c.score}`);
    if (c.running && c.weeks > c.weeksTotal) bad.push(`${c.title} ran past its own run`);
    if (!c.running && c.score == null && !c.minor) bad.push(`${c.title} finished with no score`);
    if ((c.boxOffice || 0) < 0) bad.push(`${c.title} took negative money`);
  }
  // ── the run ─────────────────────────────────────────────────────────────────
  const shelf = [...(s.filmography || []), ...(s.discography || [])];
  for (const id of (s.running || [])) {
    if (typeof id !== 'string') bad.push('running holds an object, not an id');
    else if (!shelf.some((c) => c.id === id)) bad.push('running points at a credit that is gone');
  }
  // ── waiting to hear ─────────────────────────────────────────────────────────
  for (const x of (s.submissions || [])) {
    if (!x.casting || !x.title) bad.push('a submission with nothing in it');
    if (!Number.isFinite(x.odds) || x.odds < 0 || x.odds > 100) bad.push('submission odds ' + x.odds);
    if (x.due - now > 6) bad.push(`answer due ${x.due - now} months out`);
  }
  if ((s.submissions || []).length > 12) bad.push('submissions piling up: ' + s.submissions.length);
  // ── sequels announced years ago ─────────────────────────────────────────────
  for (const x of (s.laterOffers || [])) {
    if (!x.offer || !x.offer.projectTitle) bad.push('a later offer with no project');
    if (x.due - now > 70) bad.push(`a sequel ${Math.round((x.due - now) / 12)} years out`);
  }
  // ── the board ───────────────────────────────────────────────────────────────
  const titles = (s.castingPool || []).map((c) => c.title);
  if (new Set(titles).size !== titles.length) bad.push('two listings with the same name');
  for (const c of (s.castingPool || [])) {
    if ((c._expires || 0) <= now) bad.push(`${c.title} is on the board past its own expiry`);
    if (!Number.isFinite(c.salary) || c.salary < 0) bad.push(`${c.title} pays ${c.salary}`);
    if (!c.shelf) bad.push(`${c.title} sits on no shelf`);
  }
  if ((s.castingPool || []).length > 20) bad.push('the board is enormous: ' + s.castingPool.length);
  // ── the inbox ───────────────────────────────────────────────────────────────
  const tags = (s.inbox || []).filter((m) => m.kind === 'invite').map((m) => m.tag);
  if (new Set(tags).size !== tags.length) bad.push('two of the same invitation at once');
  if ((s.inbox || []).length > 14) bad.push('inbox flooding: ' + s.inbox.length);
  // ── the ordinary things ─────────────────────────────────────────────────────
  if (!Number.isFinite(s.cash)) bad.push('cash is not a number');
  if (!Number.isFinite(s.fame) || s.fame < 0 || s.fame > 100) bad.push('fame ' + s.fame);
  if (!Number.isFinite(s.acting) || s.acting < 0 || s.acting > 100) bad.push('acting ' + s.acting);
  if ((s.apMaxEff || 0) < 0) bad.push('negative Energy');
  if (s.production && s.production.monthsLeft < 0) bad.push('a shoot with negative months');
  return bad;
}

function liveOne(years = 50) {
  const s = createInitialState({ name: 'Sweep One', dream: Math.random() < 0.2 ? 'singer' : 'actor', created: true });
  beginLife(s);
  Object.assign(s, { stage: 'career', ageY: 20, year: 2050, month: 0, hasApartment: true,
    housing: 'room', cash: 8000, alive: true, ap: 100, apMax: 100, apMaxEff: 100 });
  const problems = [];
  let t = s;
  for (let m = 0; m < years * 12; m++) {
    const r = Math.random();
    try {
      t.bigMoment = null; t.pendingArc = null;
      // answer the room on day one, at random
      if (t.production && !t.production.take) {
        const opts = ST.takesFor(t.production);
        ST.pushTake(t, opts[Math.floor(Math.random() * opts.length)]);
      }
      // a job, training, a read
      if (!t.job && (t.fame || 0) < 22 && r < 0.3) { const j = W.availableJobs(t)[0]; if (j) W.takeJob(t, j.id); }
      if (r < 0.25 && (t.ap || 0) > 1) { const sc = T.SCHOOLS[Math.floor(Math.random() * T.SCHOOLS.length)]; T.train(t, sc.id); }
      K.refreshCastingPool(t);
      if (r < 0.6 && (t.ap || 0) > 0 && (t.castingPool || []).length) {
        const c = t.castingPool[Math.floor(Math.random() * t.castingPool.length)];
        if (r < 0.2) K.prepareFor(t, c.id); else K.auditionFor(t, c.id, Math.round(Math.random() * 100));
      }
      if (r > 0.9 && K.canReroll(t)) K.rerollBoard(t);
      // take an offer if there is one
      if ((t.offers || []).length && !t.production) {
        const o = t.offers[Math.floor(Math.random() * t.offers.length)];
        PR.startProduction(t, o); t.offers = t.offers.filter((x) => x.id !== o.id);
      }
      // answer the post
      const inv = (t.inbox || [])[0];
      if (inv && r > 0.5) E.emailAct(t, inv.id, Math.random() < 0.5 ? 0 : 1);
      // a life outside it
      if (!t.partner && !C.spouseOf(t) && r > 0.7) {
        L.refreshDatingPool(t);
        const who = (t.datingPool || [])[0];
        if (who) L.goOnDate(t, L.DATE_ORDER[Math.floor(Math.random() * 4)], who.id);
      }
      // spend what is left
      let g = 0;
      while ((t.ap || 0) > 0 && g++ < 5) { if (t.production) PR.rehearse(t); else break; }
      t = advanceMonth(t);
    } catch (e) {
      problems.push('THREW at month ' + m + ': ' + e.message);
      break;
    }
    const bad = audit(t);
    if (bad.length) { problems.push(`month ${m} (age ${t.ageY}): ${bad[0]}`); break; }
    if (!t.alive) break;
  }
  return { s: t, problems };
}

const all = [];
let shot = 0, opened = 0, seq = 0, seasons = 0, tookTake = 0, invites = 0, died = 0;
const N = 90;
for (let i = 0; i < N; i++) {
  const { s, problems } = liveOne();
  all.push(...problems);
  const credits = [...(s.filmography || []), ...(s.discography || [])];
  if (credits.length) opened += credits.length;
  if (credits.some((c) => c.take && c.take !== 'straight')) tookTake++;
  if (credits.some((c) => (c.part || 0) > 1)) seq++;
  if (credits.some((c) => (c.season || 0) > 1)) seasons++;
  if ((s.timeline || []).some((x) => /talk show|carpet|list/i.test(x.text || x))) invites++;
  if (!s.alive) died++;
  shot++;
}
console.log(`\n      ${N} lives of fifty years, doing everything at random:`);
console.log(`        credits made ${opened} · a version argued for in ${tookTake} lives · sequels in ${seq} · second seasons in ${seasons} · died ${died}`);
ok('no life reaches a state that could not happen', all.length === 0, all.slice(0, 5).join('  |  '));
ok('and the systems are actually being exercised', opened > 400 && tookTake > 40,
  `${opened} credits, ${tookTake} lives that argued`);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
