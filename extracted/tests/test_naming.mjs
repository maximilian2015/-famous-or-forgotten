import { rename, canRename, whyNot, renameable, TITLE_MAX } from '../src/systems/career/naming.js';
import { startProduction, productionTick } from '../src/systems/career/production.js';
import { scheduleRelease, releaseTick, runTick } from '../src/systems/career/release.js';
import { maybeContinue } from '../src/systems/career/franchise.js';
import { signContract, startSigned } from '../src/systems/career/contract.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', name: 'Mira Vale', ageY: 30, stage: 'career', dream: 'actor', fame: 50, respect: 30, acting: 60, charisma: 50, looks: 50, luck: 50, scandal: 0, media: 0, mental: 60, year: 2050, month: 2, timeline: [], filmography: [], productions: [], offers: [], inbox: [], releases: [], peakFame: 50, hasApartment: true, housing: 'room', ap: 100, apMax: 100, cash: 100000, genreXP: {}, quote: 0, people: [], ...over });
const offer = (over) => ({ id: 'o1', via: 'casting', projectTitle: 'Golden Echo', role: 'Lead', type: 'Feature Film', genre: 'Thriller', salary: 300000, months: 4, tier: 'lead', scale: 'feature', prestigeScore: 60, stability: 95, deadline: 3, ...over });
const run = (s, n) => { for (let i = 0; i < n; i++) { s.month += 1; if (s.month > 11) { s.month = 0; s.year += 1; } releaseTick(s); runTick(s); } };

// ── the set ────────────────────────────────────────────────────────────────────
{
  const s = st(); s.offers = [offer()]; startProduction(s, s.offers[0]); const p = s.productions[0];
  ok('a set you are on can be named', canRename(s, 'set', p.id).ok && renameable(s).some((x) => x.kind === 'set' && x.what === 'shooting'));
  rename(s, 'set', p.id, '  The  Weight of Water ');
  ok('the name is yours, tidied', p.title === 'The Weight of Water' && p.named === true, p.title);
  ok('the paper follows it', s.offers[0].projectTitle === 'The Weight of Water');
  ok('and the timeline says so', s.timeline.some((x) => /is called "The Weight of Water" now/.test(x.text)));
  ok('two letters is not a name', whyNot(s, 'set', p.id, 'A') === 'It needs a name.');
  ok('a poster is only so wide', /characters/.test(whyNot(s, 'set', p.id, 'x'.repeat(TITLE_MAX + 1))));
  s.filmography = [{ title: 'Old Thing', year: 2048 }];
  ok('you cannot make two of the same name', /already made something/.test(whyNot(s, 'set', p.id, 'old thing')));
  ok('but keeping its own name is fine', whyNot(s, 'set', p.id, 'The Weight of Water') === null);
}
// ── the paper you signed, before cameras ───────────────────────────────────────
{
  const s = st(); const now = s.year * 12 + s.month;
  s.offers = [offer({ id: 'sg', kind: 'sequel', part: 2, signed: true, waitsForWrap: true, startAt: now + 5, projectTitle: '⭐ Golden Echo II' })];
  ok('a signed paper is renameable', renameable(s).some((x) => x.kind === 'offer' && x.what === 'signed'), JSON.stringify(renameable(s)));
  rename(s, 'offer', 'sg', 'The Long Way Down');
  ok('renamed, and the studio keeps its star', s.offers[0].projectTitle === '⭐ The Long Way Down' && s.offers[0].named);
  // and when the cameras roll, the set carries the name you gave it
  s.offers[0].startAt = now; s.offers[0].waitsForWrap = false;
  startSigned(s);
  ok('the shoot starts under your name', (s.productions[0] || {}).title === 'The Long Way Down', (s.productions[0] || {}).title);
  // renaming the set moves the paper too, when both exist
  const u = st(); u.offers = [offer({ id: 'o9' })];
  signContract(u, 'o9');
  const p = u.productions[0];
  rename(u, 'set', p.id, 'Second Thoughts');
  ok('paper and set stay one project', p.title === 'Second Thoughts' && (!u.offers.length || u.offers[0].projectTitle === 'Second Thoughts'));
}
// ── in post, and never after it opens ──────────────────────────────────────────
{
  const s = st();
  const job = { title: 'Golden Echo', role: 'Lead', type: 'Feature Film', genre: 'Thriller', salary: 300000, months: 4, scale: 'feature', tier: 'lead', prestigeScore: 60, part: 1, season: 0, episodes: 0, episodeFee: 0, potential: 'open', crew: [{ id: 'c', name: 'Mira Croft', role: 'Director', bond: 50 }] };
  scheduleRelease(s, { title: 'Golden Echo', role: 'Lead', type: 'Feature Film', genre: 'Thriller', salary: 300000, rating: 76, status: 'Well-received', year: 2050, season: 0, part: 1, episodes: 0 }, job);
  const r = s.releases[0];
  ok('a picture in post can still be named', canRename(s, 'release', r.id).ok && renameable(s).some((x) => x.what === 'in post'));
  rename(s, 'release', r.id, 'Low Tide');
  ok('renamed, and the job it came from too', r.title === 'Low Tide' && r.job.title === 'Low Tide');
  run(s, 30);
  const c = s.filmography.find((x) => x.title === 'Low Tide');
  ok('it opens under the name you gave it', !!c && !c.running, s.filmography.map((x) => x.title).join(','));
  ok('and once it is out, there is nothing left to rename', !renameable(s).length);
}
// ── a show that has been on has a name ─────────────────────────────────────────
{
  const s = st();
  const job = { title: 'Careless Border', seriesTitle: 'Careless Border', role: 'Lead', type: 'Drama Series', genre: 'Drama', salary: 600000, months: 5, scale: 'recurring', tier: 'lead', prestigeScore: 55, part: 1, season: 1, episodes: 10, episodeFee: 60000, crew: [{ id: 'c', name: 'A', role: 'Director', bond: 50 }] };
  scheduleRelease(s, { title: 'Careless Border', role: 'Lead', type: 'Drama Series', genre: 'Drama', salary: 600000, rating: 74, status: 'Well-received', year: 2050, season: 1, part: 1, episodes: 10 }, job);
  ok('a first season is still a working title', canRename(s, 'release', s.releases[0].id).ok);
  rename(s, 'release', s.releases[0].id, 'Small Wedding');
  ok('named', s.releases[0].title === 'Small Wedding' && s.releases[0].job.seriesTitle === 'Small Wedding');
  run(s, 30);
  // season two, shooting
  const p2 = { ...job, title: 'Small Wedding · season 2', seriesTitle: 'Small Wedding', season: 2 };
  startProduction(s, { id: 'o2', projectTitle: 'Small Wedding · season 2', seriesTitle: 'Small Wedding', season: 2, role: 'Lead', type: 'Drama Series', genre: 'Drama', salary: 600000, months: 5, tier: 'lead', scale: 'recurring', episodes: 10, episodeFee: 60000, prestigeScore: 55, stability: 90 });
  const set2 = s.productions[0];
  const fit = canRename(s, 'set', set2.id);
  ok('once a season has aired, the show has a name', !fit.ok && /has a name now/.test(fit.why), JSON.stringify(fit));
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
