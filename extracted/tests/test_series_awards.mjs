// The series award (career/awards.js SERIES): the Asker is the Oscar and films only; every series —
// network, prestige, soap, and streaming when it comes — is up for its own award, on the Asker's
// engine, with its own calendar (the list in May, the night in August). An old save's series that
// were up for Askers move across when they can be tied to the exact credit, and nothing else does.
import { createInitialState } from '../src/state/initialState.js';
import { runNominations, ceremonyTick, ASKER, SERIES, trackOfWork, settleSeriesAwards, seriesLine, askerLine } from '../src/systems/career/awards.js';
import { hitWeight } from '../src/systems/meta/knownFor.js';
import { computeLegacy } from '../src/systems/meta/legacy.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
// Every die at zero: every nomination roll succeeds and the first name on the field — yours — wins.
const fixed = (fn) => { const r = Math.random; Math.random = () => 0; try { return fn(); } finally { Math.random = r; } };
const st = (over = {}) => ({ ...createInitialState({ created: true }), stage: 'career', name: 'Audit Actor', year: 2070, month: 0,
  fame: 60, respect: 50, filmography: [], moments: [], timeline: [], ...over });
const at = (s, month) => { s.month = month; return s; };
const film = (o = {}) => ({ id: 'f1', title: 'A Quiet Country', type: 'Feature Film', scale: 'feature', genre: 'Drama', tier: 'lead', role: 'Lead',
  rating: 93, prestigeScore: 85, year: 2070, running: false, ...o });
const show = (o = {}) => ({ id: 's1', title: 'Harbour Lights · season 2', type: 'Prestige Series', scale: 'prestige', genre: 'Drama', tier: 'lead', role: 'Lead',
  rating: 93, prestigeScore: 85, season: 2, year: 2070, running: false, ...o });

// ── who is up for what ───────────────────────────────────────────────────────
{
  const s = st();
  ok('a film is up for the Asker', trackOfWork(s, film()) === 'film');
  ok('a festival picture too', trackOfWork(s, film({ scale: 'festival', type: 'Festival Film' })) === 'festival');
  ok('a prestige series is up for the series award', trackOfWork(s, show()) === 'series');
  ok('a network series and a soap too', trackOfWork(s, show({ type: 'Network Drama', scale: 'recurring' })) === 'series'
    && trackOfWork(s, show({ type: 'Soap Opera', scale: 'recurring' })) === 'series');
  ok('an advert for nothing', trackOfWork(s, { type: 'Commercial', scale: 'oneoff', minor: true }) === 'none');
}

// ── a series is never in the Askers ──────────────────────────────────────────
{
  const s = st({ filmography: [show({ closedAt: 2070 * 12 + 6 })] });
  fixed(() => runNominations(at(s, 8)));
  ok('a masterpiece of a series is not nominated for an Asker', !(s.awards.nominations || []).length && !s.filmography[0].nominated,
    JSON.stringify(s.awards.nominations));
}
{
  const s = st({ year: 2071, filmography: [show({ closedAt: 2071 * 12 + 2 })] });
  fixed(() => runNominations(at(s, SERIES.nomsMonth), SERIES));
  const S = s.seriesAwards || {};
  ok('it is nominated for the series award in May', (S.nominations || []).length >= 1 && s.filmography[0].seriesNominated >= 1, JSON.stringify(S.nominations));
  ok('in the series categories', (S.pending || []).some((p) => !p.theirs && p.category === 'lead'));
  // The first big moment of a month is s.bigMoment; anything after it waits in s.moments.
  ok('the morning says which award', [s.bigMoment, ...(s.moments || [])].some((m) => m && m.id === 'nomination' && m.award === SERIES.plural && /Emmet/.test(m.title)));
  ok('the name says nominee', /Emmet nominee/.test((seriesLine(s) || {}).text || ''));
  const due = S.pending[0].due;
  s.year = Math.floor(due / 12); s.month = due % 12;
  ok('the night is in August', s.month === 7, String(s.month));
  const fame0 = s.fame;
  fixed(() => ceremonyTick(s, SERIES));
  ok('it can win', (s.seriesAwards.wins || []).filter((w) => w.category !== 'picture').length === 1 && s.filmography[0].seriesAward === 1);
  ok('and the Asker shelf is untouched', !(s.awards && (s.awards.wins || []).length) && !s.filmography[0].asker);
  ok('a win moves the name', s.fame > fame0);
  ok('the night says which award', [s.bigMoment, ...(s.moments || [])].some((m) => m && m.id === 'ceremony' && m.award === SERIES.plural));
  ok('and the name says winner', /Emmet winner/.test((seriesLine(s) || {}).text || '') && !askerLine(s));
  ok('Known For counts it', hitWeight(s.filmography[0], s) >= 3.2);
  ok('and the stone does', computeLegacy(s).seriesWins === 1);
}
{
  const s = st({ filmography: [film({ closedAt: 2070 * 12 + 6 })] });
  fixed(() => runNominations(at(s, 8)));
  ok('a film is still up for the Asker in September', (s.awards.nominations || []).length >= 1);
  fixed(() => runNominations(at(st({ year: 2071, filmography: [film({ closedAt: 2071 * 12 + 2 })] }), SERIES.nomsMonth), SERIES));
}

// ── an old save ──────────────────────────────────────────────────────────────
{
  const s = st({ filmography: [
    show({ year: 2065, asker: 1, nominated: 2, bestPicture: true, askerPicture: 1 }),
    film({ year: 2065, asker: 1, nominated: 1 }),
  ] });
  s.awards = { losses: 1,
    nominations: [{ title: 'Harbour Lights · season 2', category: 'lead', year: 2066 }, { title: 'Harbour Lights · season 2', category: 'picture', year: 2066 },
      { title: 'A Quiet Country', category: 'lead', year: 2066 }, { title: 'Nobody Remembers This', category: 'lead', year: 2060 }],
    wins: [{ title: 'Harbour Lights · season 2', category: 'lead', year: 2067 }, { title: 'A Quiet Country', category: 'lead', year: 2067 }],
    history: [{ category: 'lead', title: 'Harbour Lights · season 2', creditId: 's1', won: true, winner: 'Audit Actor', year: 2067 },
      { category: 'lead', title: null, won: false, winner: 'Mara Vance', work: 'Small Mercies', theirs: true, year: 2067 }],
    pending: null };
  s.world = { years: { 2067: { askers: [{ category: 'lead', name: 'Audit Actor', work: 'Harbour Lights · season 2', you: true }, { category: 'picture', name: 'Cato Byrne', work: 'Bitter Water' }] } } };
  settleSeriesAwards(s);
  const S = s.seriesAwards || {};
  ok('the series nominations move to the series award', (S.nominations || []).length === 2 && s.awards.nominations.length === 2, JSON.stringify(s.awards.nominations));
  ok('the series win moves; the film win stays', (S.wins || []).length === 1 && s.awards.wins.length === 1 && s.awards.wins[0].title === 'A Quiet Country');
  ok('a record that cannot be tied to a credit is not guessed', s.awards.nominations.some((n) => n.title === 'Nobody Remembers This'));
  ok('your history moves, theirs stays', (S.history || []).length === 1 && s.awards.history.length === 1 && s.awards.history[0].theirs);
  const [sh, fl] = s.filmography;
  ok('the show wears the series award', sh.seriesAward === 1 && sh.seriesNominated === 2 && sh.bestSeries && sh.seriesBest === 1 && !sh.asker && !sh.nominated && !sh.bestPicture);
  ok('the film keeps its Asker', fl.asker === 1 && fl.nominated === 1);
  ok('the year list moves your series win', s.world.years[2067].series.length === 1 && s.world.years[2067].askers.length === 1);
  const once = JSON.stringify(s); settleSeriesAwards(s);
  ok('and doing it again changes nothing', JSON.stringify(s) === once);
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
