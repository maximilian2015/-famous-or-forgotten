// One project, one identity (Media Ecosystem stage 1). A piece of work is born once, when it is
// taken, and every boundary after that carries its id: the set, the release, the job the next
// season is built from, the credit on opening night, the close, the next season, a thaw. Real
// systems, seeded draws, JSON round trips — the same harness as test_contract_continuity.
import assert from 'node:assert/strict';
import { career, renewal, withSeed, roundTrip, nextMonth } from './helpers/contracts.mjs';
import { startProduction } from '../src/systems/career/production.js';
import { scheduleRelease, releaseTick, runTick } from '../src/systems/career/release.js';
import { maybeContinue } from '../src/systems/career/franchise.js';
import { freezeProject, frozenTick } from '../src/systems/career/stability.js';
import { acceptOffer } from '../src/systems/career/offers.js';
import { describeProject, getProject, projectOf, payMarketOf, settleProjects } from '../src/systems/career/project.js';

let failed = 0;
function test(name, fn) {
  try { withSeed(7, fn); console.log('ok    ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + ' :: ' + e.message); }
}
const soap = (over = {}) => renewal({ id: 'soap1', kind: undefined, via: 'casting', projectTitle: 'Stars and Light', seriesTitle: 'Stars and Light',
  type: 'Soap Opera', scale: 'recurring', season: 1, episodes: 30, episodeFee: 20000, salary: 600000, payMarket: 'tv_daytime', ...over });
// Shoot it, put it out, and run it to the close: the whole road a season takes.
function throughTheRun(s) {
  const p = s.productions[0];
  const rel = scheduleRelease(s, { title: p.title, type: p.type, genre: p.genre, role: p.role, salary: p.salary, rating: 80, status: 'Well-received', year: s.year, projectId: p.projectId }, p);
  s.productions = []; s.production = null;
  s.year = Math.floor(rel.due / 12); s.month = rel.due % 12; releaseTick(s);
  for (let n = 0; n < 40 && s.filmography[0].running; n++) { nextMonth(s); runTick(s); }
  return { p, rel, credit: s.filmography[0] };
}

test('a project is born when the work is taken, and says what it is', () => {
  const s = career(); startProduction(s, soap());
  const p = s.productions[0], pr = getProject(s, p.projectId);
  assert.ok(pr, 'no project on the set');
  assert.equal(pr.medium, 'television'); assert.equal(pr.format, 'soap'); assert.equal(pr.outlet, 'daytime');
  assert.equal(pr.payMarket, 'tv_daytime'); assert.equal(pr.route, 'open_call'); assert.equal(pr.awardsTrack, 'television');
  assert.equal(pr.seriesId, pr.id, 'a show is a series from its first season');
});

test('its id survives the release, the job, opening night and the close — and a save between', () => {
  let s = career(); startProduction(s, soap());
  const id = s.productions[0].projectId;
  s = roundTrip(s);
  const { rel, credit } = throughTheRun(s);
  assert.equal(rel.projectId, id, 'release'); assert.equal(rel.job.projectId, id, 'job');
  assert.equal(credit.projectId, id, 'credit');
  assert.ok(getProject(roundTrip(s), credit.projectId), 'the registry survives a save');
});

test('the next season is a new project in the same show, priced as daytime television', () => {
  const s = career({ fame: 60 }); startProduction(s, soap());
  const { rel, credit } = throughTheRun(s);
  const o = maybeContinue(s, { ...credit, viewers: 5, endViewers: 5 }, rel.job, true);
  assert.ok(o, 'no renewal');
  assert.equal(o.parentProjectId, rel.projectId, 'the renewal knows its show');
  assert.equal(payMarketOf(o), 'tv_daytime', 'a soap renewal was priced as ' + payMarketOf(o));
  startProduction(s, o);
  const child = getProject(s, s.productions[0].projectId), parent = getProject(s, rel.projectId);
  assert.equal(child.parentId, parent.id); assert.equal(child.seriesId, parent.seriesId);
  assert.equal(child.route, 'continuation'); assert.equal(child.format, 'soap');
});

test('a soap renews an A-lister — at the top of daytime, never at network rates', () => {
  // Access rules govern new work; a show you are already on follows its own renewal rules (Maxi).
  for (const fame of [70, 95]) {
    const s = career({ fame, peakFame: fame }); startProduction(s, soap({ episodeFee: 200000, salary: 6000000 }));
    const { rel, credit } = throughTheRun(s);
    const o = maybeContinue(s, { ...credit, viewers: 5, endViewers: 5 }, rel.job, true);
    assert.ok(o, `fame ${fame}: the show let you go`);
    assert.ok(o.episodeFee <= 30000 * 1.5, `fame ${fame}: €${o.episodeFee} an episode on a soap`);
  }
});

test('a frozen set that thaws is the project it always was', () => {
  let s = career(); startProduction(s, soap({ kind: undefined, projectTitle: 'Black Harbor', type: 'Drama Series', payMarket: 'tv_network' }));
  const p = s.productions[0], id = p.projectId;
  freezeProject(s, p); s = roundTrip(s); nextMonth(s); nextMonth(s);
  const random = Math.random;
  try { Math.random = () => 0; frozenTick(s); } finally { Math.random = random; }
  const o = s.offers.find((x) => x.kind === 'thaw');
  assert.ok(o, 'fixture: no thaw'); startProduction(s, o);
  assert.equal(s.productions[0].projectId, id);
});

test('a day of work done in one click has a project too, outside the three markets', () => {
  const s = career({ offers: [{ id: 'ad1', via: 'brand', projectTitle: 'Maison Lune — a fragrance', role: 'The face', type: 'Commercial',
    genre: 'Commercial', scale: 'oneoff', tier: 'supporting', months: 1, salary: 50000, fame: 1, prestigeScore: 20, payMarket: 'ad' }] });
  acceptOffer(s, 'ad1');
  const c = s.filmography[0];
  assert.ok(c.minor, 'fixture: not a day of work');
  const pr = getProject(s, c.projectId);
  assert.ok(pr); assert.equal(pr.medium, 'other'); assert.equal(pr.format, 'commercial'); assert.equal(pr.awardsTrack, null);
});

test('prestige is a style, never a medium', () => {
  const tv = describeProject({ type: 'Prestige Series', scale: 'prestige', payMarket: 'tv_prestige' });
  assert.equal(tv.medium, 'television'); assert.equal(tv.style, 'prestige');
  const film = describeProject({ type: 'Prestige Drama', scale: 'indie', payMarket: 'film_indie' });
  assert.equal(film.medium, 'theatrical'); assert.equal(film.style, 'prestige');
});

test('an old save gets the projects it would have had, joined, and nothing is lost', () => {
  const s = career({ filmography: [
    { title: 'Light and Rain II', type: 'Feature Film', scale: 'feature', part: 2, year: 2066, rating: 70 },
    { title: 'Stars and Light · season 2', type: 'Soap Opera', scale: 'recurring', season: 2, year: 2064, rating: 60 },
    { title: 'Light and Rain', type: 'Feature Film', scale: 'feature', part: 0, year: 2062, rating: 80 },
    { title: 'Stars and Light', type: 'Soap Opera', scale: 'recurring', season: 1, year: 2060, rating: 55 },
  ], offers: [{ id: 'r3', kind: 'renewal', seriesTitle: 'Stars and Light', projectTitle: 'Stars and Light · season 3', medium: 'tv_daytime', type: 'Soap Opera', scale: 'recurring' }],
  castingPool: [{ id: 'l1', title: 'Glow', type: 'Brand Campaign', medium: 'ad', scale: 'oneoff' }] });
  delete s.projects;
  const before = JSON.stringify(s.filmography.map(({ projectId, ...c }) => c));
  settleProjects(s);
  const [part2, season2, part1, season1] = s.filmography.map((c) => getProject(s, c.projectId));
  assert.ok(part2 && season2 && part1 && season1, 'a credit without a project');
  assert.equal(season2.parentId, season1.id, 'season 2 does not know season 1');
  assert.equal(season2.seriesId, season1.seriesId);
  assert.equal(season1.payMarket, 'tv_daytime', 'an old soap is daytime television');
  assert.equal(part2.parentId, part1.id, 'the sequel does not know the first part');
  assert.equal(s.offers[0].parentProjectId, season2.id, 'the waiting renewal does not know its show');
  assert.equal(s.offers[0].payMarket, 'tv_daytime'); assert.equal(s.offers[0].medium, 'tv_daytime', 'the old field was deleted');
  assert.equal(payMarketOf(s.castingPool[0]), 'ad');
  assert.equal(JSON.stringify(s.filmography.map(({ projectId, ...c }) => c)), before, 'a credit changed');
  const once = JSON.stringify(s); settleProjects(s); assert.equal(JSON.stringify(s), once, 'not idempotent');
  assert.equal(projectOf(s, { type: 'Network Drama', scale: 'recurring' }).medium, 'television', 'the lazy fallback');
});

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
