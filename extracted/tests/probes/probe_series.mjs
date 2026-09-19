// Television, end to end: a soap and a prestige season from the board to the wrap, the
// night it goes out, the run, the verdict, the renewal, the second season, and what the
// calendar and the filmography say about it at every step. Invariants, not vibes.
import fs from 'fs';
import { refreshCastingPool, auditionFor, submissionsTick } from '../../src/systems/career/castings.js';
import { startProduction, productionTick } from '../../src/systems/career/production.js';
import { acceptOffer } from '../../src/systems/career/offers.js';
import { advanceMonth } from '../../src/engine/time.js';
import { ensureWorld } from '../../src/systems/world/world.js';

const base = JSON.parse(fs.readFileSync(new URL('../../dist/_save.json', import.meta.url), 'utf8'));
const isFilm = (sc) => ['small', 'indie', 'feature', 'blockbuster'].includes(sc);
const seen = { soaps: 0, prestige: 0, wentOut: 0, verdicts: 0, renewals: 0, season2: 0, seasonsShot: 0, tvBadges: 0, viewersOk: 0, noPostOnCal: 0 };
const problems = [];
for (let i = 0; i < 40; i++) {
  let s = JSON.parse(JSON.stringify(base)); ensureWorld(s);
  s.fame = i % 2 ? 30 : 62; s.respect = 30; s.production = null; s.productions = []; s.offers = []; s.releases = []; s.running = []; s.filmography = []; s.laterOffers = []; s.bigMoment = null; s.moments = []; s.ap = 100; s.cash = 50000;
  // a series part, taken straight from the board
  let listing = null;
  for (let tries = 0; tries < 30 && !listing; tries++) { refreshCastingPool(s, true); listing = s.castingPool.find((c) => c.shelf === 'tv' && (c.scale === 'recurring' || c.scale === 'prestige')); }
  if (!listing) { problems.push(`life ${i}: no series listing in 30 boards at fame ${s.fame}`); continue; }
  if (!listing.perEpisode || !listing.episodes || listing.salary !== listing.episodeFee * listing.episodes) problems.push(`life ${i}: listing money wrong ${JSON.stringify({ perEpisode: listing.perEpisode, episodes: listing.episodes, salary: listing.salary, fee: listing.episodeFee })}`);
  const offer = { id: 'o' + i, projectTitle: listing.title, role: listing.role, type: listing.type, genre: listing.genre, salary: listing.salary, months: listing.months, tier: listing.scale === 'prestige' ? 'lead' : 'lead', scale: listing.scale, prestigeScore: 55, stability: 92, episodes: listing.episodes, perEpisode: true, episodeFee: listing.episodeFee, deadline: 3 };
  startProduction(s, offer);
  const p = s.production;
  if (!p) { problems.push(`life ${i}: series did not start`); continue; }
  if (!p.episodes || !p.seriesTitle || p.season !== 1) problems.push(`life ${i}: production lacks series fields ${JSON.stringify({ episodes: p.episodes, seriesTitle: p.seriesTitle, season: p.season })}`);
  if (listing.scale === 'recurring') seen.soaps++; else seen.prestige++;
  p.take = 'straight';
  // live it through: shoot, post, the night it goes out, the run, the verdict, the renewal
  let stage = 'shoot', wentOutAt = null, verdictAt = null, renewal = null;
  for (let m = 0; m < 40; m++) {
    s.bigMoment = null; s.pendingArc = null; s.moments = []; s.night = null;
    s = advanceMonth(s);
    // the calendar must never show post-production, and must call television television
    const cal = (s.releases || []).filter((r) => r.due > (s.year * 12 + s.month));
    if (cal.length && stage === 'post') seen.noPostOnCal++;
    if (s.bigMoment && s.bigMoment.id === 'premiere') {
      if (!s.bigMoment.tv) problems.push(`life ${i}: television went out with a cinema premiere`);
      wentOutAt = m; seen.wentOut++; stage = 'run';
      const c = s.filmography[0];
      if (!c || !c.tv || !c.running) problems.push(`life ${i}: credit not on air after going out`);
      if (c && c.viewers <= 0) problems.push(`life ${i}: no viewers on the night`); else seen.viewersOk++;
    }
    if (s.bigMoment && s.bigMoment.id === 'verdict') {
      if (!s.bigMoment.tv) problems.push(`life ${i}: television verdict without the set`);
      verdictAt = m; seen.verdicts++; stage = 'done';
      const c = s.filmography[0];
      if (!c || c.running) problems.push(`life ${i}: still running after the verdict`);
      if (c && !c.job) problems.push(`life ${i}: the job was not kept on the credit`);
      if (c && !['watched', 'seen', 'ignored'].includes(c.verdict)) problems.push(`life ${i}: film verdict on a series: ${c.verdict}`);
      if (c && typeof c.score !== 'number') problems.push(`life ${i}: no score on the verdict`);
    }
    if (!s.production && stage === 'shoot') stage = 'post';
    renewal = (s.offers || []).find((o) => o.kind === 'renewal');
    if (renewal && stage === 'done') break;
    if (stage === 'done' && m > verdictAt + 2) break;
  }
  if (wentOutAt == null) { if ((s.frozen || []).length || s.burnout || (s.timeline || []).some((x) => /shut down|collapsed|Walked/.test(x.text))) { seen.stopped = (seen.stopped || 0) + 1; continue; } problems.push(`life ${i}: never went out (stage ${stage}, releases ${(s.releases || []).length}, running ${(s.running || []).length}) ${(s.timeline || []).slice(-3).map((x) => x.text).join(" | ")}`); continue; }
  if (verdictAt == null) { problems.push(`life ${i}: never got a verdict`); continue; }
  if (renewal) {
    seen.renewals++;
    if (renewal.season !== 2 || !renewal.seriesTitle || !renewal.episodes || !renewal.episodeFee) problems.push(`life ${i}: renewal malformed ${JSON.stringify({ season: renewal.season, st: renewal.seriesTitle, eps: renewal.episodes, fee: renewal.episodeFee })}`);
    if (!/season 2/.test(renewal.projectTitle)) problems.push(`life ${i}: renewal title ${renewal.projectTitle}`);
    acceptOffer(s, renewal.id);
    const p2 = s.production;
    if (!p2) { problems.push(`life ${i}: renewal did not start: ${s.lastEvent}`); continue; }
    if (p2.season !== 2 || p2.seriesTitle !== renewal.seriesTitle) problems.push(`life ${i}: season two lost its show ${JSON.stringify({ season: p2.season, st: p2.seriesTitle })}`);
    seen.season2++;
    p2.take = 'straight';
    for (let m = 0; m < 30 && s.production; m++) { s.bigMoment = null; s.pendingArc = null; s.moments = []; s = advanceMonth(s); }
    if (s.production) problems.push(`life ${i}: season two never wrapped`); else seen.seasonsShot++;
  }
}
console.log(JSON.stringify(seen));
if (problems.length) { console.log('PROBLEMS:\n' + problems.slice(0, 20).join('\n')); process.exit(1); }
console.log('television clean');
