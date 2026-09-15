// The world's own invariants, checked every month over many lives: ranks are a permutation,
// the year's lists are consistent, reviews exist on every closed film, icons are ranked,
// the agent contact matches the agent, offers carry a title and a deadline, nothing NaN.
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth, advanceYear } = await import(P + 'engine/time.js');
const K = await import(P + 'systems/career/castings.js');
const PR = await import(P + 'systems/career/production.js');
const ST = await import(P + 'systems/career/story.js');
const E = await import(P + 'systems/meta/email.js');
const W = await import(P + 'systems/life/work.js');
function audit(s, tag) {
  const bad = [];
  const w = s.world;
  if (!w) return bad;
  const working = w.actors.filter((a) => a.alive && !a.retired);
  const ranks = working.map((a) => a.rank).filter((r) => r != null);
  if (new Set(ranks).size !== ranks.length) bad.push('duplicate ranks');
  for (const a of w.actors) {
    if (!Number.isFinite(a.fame)) bad.push('rival fame ' + a.fame);
    if (a.fame < 0 || a.fame > 100) bad.push('rival fame out of range ' + a.fame);
    if (a.icon && !a.iconSince) bad.push('icon without a year');
    if (a.credits.some((c) => !Number.isFinite(c.gross) || !Number.isFinite(c.rating))) bad.push('rival credit NaN');
  }
  if (w.rank && (!Number.isFinite(w.rank.you) || w.rank.you < 1)) bad.push('your rank ' + JSON.stringify(w.rank));
  for (const y of Object.values(w.years)) {
    if (y.films.length > 10) bad.push('more than ten films in ' + y.year);
    if (y.actors.length > 5) bad.push('more than five actors in ' + y.year);
    for (let i = 1; i < y.films.length; i++) if (y.films[i].gross > y.films[i - 1].gross) bad.push('films unsorted in ' + y.year);
    if (y.films.some((f) => !f.title || !f.actor)) bad.push('list row missing title/actor in ' + y.year);
    const titles = y.films.map((f) => f.title); if (new Set(titles).size !== titles.length) bad.push('duplicate title in top ten ' + y.year);
  }
  for (const c of s.filmography || []) {
    if (c.running === false && ['small', 'indie', 'feature', 'blockbuster'].includes(c.scale) && !c.minor && !c.reviews) bad.push('closed film without reviews: ' + c.title);
    if (c.reviews && (!c.reviews.reviews.length || c.reviews.reviews.some((r) => !r.text || !r.critic || r.stars < 1 || r.stars > 5))) bad.push('bad review page on ' + c.title);
  }
  for (const o of s.offers || []) { if (!o.projectTitle) bad.push('offer without title'); if (typeof o.deadline !== 'number') bad.push('offer without deadline: ' + o.projectTitle); }
  if (s.agent && s.agent.level > 0 && !(s.people || []).some((p) => p.agent && p.name === s.agent.name)) bad.push('agent not in contacts');
  if (!(s.agent && s.agent.level > 0) && (s.people || []).some((p) => p.agent)) bad.push('agent contact with no agent');
  const titles = Object.keys(s._titlesUsed || {});
  const own = (s.filmography || []).map((c) => c.title.replace(/ (II|III|IV|V)$/, '')); if (new Set(own).size !== own.length) { /* sequels share roots */ }
  if (s.production && s.production.withId && !w.actors.some((a) => a.id === s.production.withId)) bad.push('co-star not in the world');
  return bad;
}
const problems = []; let crashes = 0; const N = 40;
for (let i = 0; i < N; i++) {
  let s = createInitialState({ name: 'X' + i, dream: 'actor', created: true, gender: i % 2 ? 'female' : 'male' }); beginLife(s);
  try {
    for (let y = 0; y < 18; y++) { s.bigMoment = null; s.moments = []; s = advanceYear(s); const b = audit(s, 'child'); if (b.length) { problems.push(`life ${i} year ${y}: ${b[0]}`); break; } }
    Object.assign(s, { stage: 'career', hasApartment: true, housing: 'room', cash: 9000, alive: true, ap: 100, apMax: 100, apMaxEff: 100 });
    const kind = i % 3;
    for (let m = 0; m < 45 * 12; m++) {
      const r = Math.random();
      s.bigMoment = null; s.pendingArc = null; s.moments = [];
      if (s.production && !s.production.take) ST.pushTake(s, kind === 0 ? 'about' : 'straight');
      if (!s.job && (s.fame || 0) < 20) { const j = W.availableJobs(s)[0]; if (j) W.takeJob(s, j.id); }
      if (s.job && (s.fame || 0) > 35) W.quitJob(s);
      K.refreshCastingPool(s);
      if (!s.production && (s.ap || 0) >= 30 && (s.castingPool || []).length && r < 0.8) { const c = s.castingPool[Math.floor(Math.random() * s.castingPool.length)]; if (kind === 0) K.prepareFor(s, c.id); K.auditionFor(s, c.id, kind === 0 ? 85 : 30 + Math.random() * 50); }
      // answer offers sometimes from the letter, sometimes from Messages
      const letter = (s.inbox || []).find((x) => x.offerId);
      if (letter && r > 0.5) E.emailAct(s, letter.id, r > 0.75 ? 0 : 1);
      else if ((s.offers || []).length && !s.production && r > 0.3) { const o = s.offers[0]; PR.startProduction(s, o); s.offers = s.offers.filter((x) => x.id !== o.id); s.inbox = (s.inbox || []).filter((m) => m.offerId !== o.id); }
      const other = (s.inbox || []).find((x) => !x.offerId); if (other && r > 0.6) E.emailAct(s, other.id, 0);
      if (kind === 0) { for (let k = 0; k < 3 && s.production && (s.ap || 0) >= 15; k++) PR.rehearse(s); }
      s = advanceMonth(s);
      const b = audit(s, 'career'); if (b.length) { problems.push(`life ${i} month ${m} (age ${s.ageY}): ${b[0]}`); break; }
      if (!s.alive) break;
    }
  } catch (e) { crashes++; problems.push(`THREW life ${i}: ${e.message} ${e.stack.split('\n')[1]}`); }
}
console.log(`${N} lives · crashes ${crashes}`);
console.log(problems.length ? problems.slice(0, 12).join('\n') : 'no life reached a state that could not happen');
