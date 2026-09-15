import { awardStrength, ASKER_GENRE, ASKER_SCALE, FLOOR, oddsFor, pickWinner, weightOf,
  overdueFactor, campaignFactor, standingFactor, runNominations, ceremonyTick, askerStanding, branchOf }
  from '../src/systems/career/awards.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', ageY: 34, stage: 'career', dream: 'actor', name: 'Iris Kane',
  cash: 500000, fame: 55, peakFame: 55, respect: 55, mental: 70, health: 85, quote: 1000000,
  filmography: [], discography: [], timeline: [], year: 2062, month: 0, alive: true,
  awards: { losses: 0, wins: [], nominations: [], pending: null, history: [] }, ...over });
const work = (over) => ({ title: 'The Quiet Hours', role: 'Lead', type: 'Feature Film', genre: 'Drama',
  scale: 'feature', tier: 'lead', prestigeScore: 70, rating: 88, year: 2061, salary: 900000, ...over });

// ── the whole point: awards follow the score, not the money ───────────────────
ok('nothing under the floor is in the conversation', awardStrength(work({ rating: FLOOR - 1 })) === 0);
ok('and the floor is a real bar', FLOOR >= 65 && FLOOR <= 75, String(FLOOR));
const blockbuster = awardStrength(work({ genre: 'Sci-Fi', scale: 'blockbuster', rating: 74 }));
const indie = awardStrength(work({ genre: 'Drama', scale: 'indie', rating: 91 }));
ok('a good indie beats a merely-fine blockbuster by miles', indie > blockbuster * 8,
  `indie ${indie.toFixed(0)} vs blockbuster ${blockbuster.toFixed(0)}`);
const greatBlockbuster = awardStrength(work({ genre: 'Sci-Fi', scale: 'blockbuster', rating: 94 }));
ok('but a genuinely great blockbuster is in the room', greatBlockbuster > 0 && greatBlockbuster > blockbuster * 4,
  greatBlockbuster.toFixed(0));

// the genre table must be the MIRROR of the one that sells tickets
ok('drama wins and horror does not', ASKER_GENRE.Drama > ASKER_GENRE.Horror * 2,
  `${ASKER_GENRE.Drama} vs ${ASKER_GENRE.Horror}`);
ok('scale runs the other way to the box office', ASKER_SCALE.indie > ASKER_SCALE.blockbuster * 1.8,
  `${ASKER_SCALE.indie} vs ${ASKER_SCALE.blockbuster}`);
const horror90 = awardStrength(work({ genre: 'Horror', rating: 90 }));
const drama82 = awardStrength(work({ genre: 'Drama', rating: 82 }));
ok('a drama at 8.2 out-argues a horror at 9.0', drama82 > horror90, `${drama82.toFixed(0)} vs ${horror90.toFixed(0)}`);
console.log('      strength — drama 9.1 indie ' + indie.toFixed(0) + ' · horror 9.0 feature ' + horror90.toFixed(0)
  + ' · sci-fi 7.4 blockbuster ' + blockbuster.toFixed(0));
console.log('      television is judged apart — ' + branchOf('prestige') + ' vs ' + branchOf('feature'));

// ── the three things that move a vote ─────────────────────────────────────────
ok('a campaign helps but cannot buy it', campaignFactor(1) > 1.3 && campaignFactor(1) < 1.7, String(campaignFactor(1)));
ok('standing matters', standingFactor(90) > standingFactor(30));
ok('losing builds up credit', overdueFactor(4) > overdueFactor(0), `${overdueFactor(0)} → ${overdueFactor(4)}`);
ok('but being overdue is not a guarantee', overdueFactor(20) <= 1.5, String(overdueFactor(20)));

// ── the draw ──────────────────────────────────────────────────────────────────
const field = [
  { name: 'You', strength: 100, respect: 60, losses: 0, campaign: 0, them: false },
  { name: 'A', strength: 70, respect: 50, losses: 0, them: true },
  { name: 'B', strength: 55, respect: 50, losses: 0, them: true },
  { name: 'C', strength: 40, respect: 50, losses: 0, them: true },
  { name: 'D', strength: 30, respect: 50, losses: 0, them: true },
];
const odds = oddsFor(field);
ok('the odds add up to about a hundred', Math.abs(odds.reduce((a, b) => a + b, 0) - 100) <= 2, odds.join('+'));
ok('the favourite is shown as the favourite', odds[0] === Math.max(...odds), odds.join(', '));
let wins = 0;
for (let i = 0; i < 4000; i++) if (!pickWinner(field).them) wins++;
const rate = wins / 40;
ok('the favourite wins more often than anyone else', rate > odds[0] - 12 && rate < odds[0] + 12,
  `shown ${odds[0]}%, actual ${rate.toFixed(1)}%`);
ok('and still loses most nights', rate < 55, rate.toFixed(1) + '%');
console.log(`      a clear favourite: shown ${odds[0]}%, wins ${rate.toFixed(1)}% of 4000 ceremonies`);

// an outsider must be able to win, or the ceremony is a formality
const longshot = [
  { name: 'You', strength: 35, respect: 45, losses: 0, them: false },
  { name: 'A', strength: 110, respect: 70, losses: 0, them: true },
  { name: 'B', strength: 95, respect: 65, losses: 0, them: true },
  { name: 'C', strength: 80, respect: 60, losses: 0, them: true },
  { name: 'D', strength: 70, respect: 55, losses: 0, them: true },
];
let upsets = 0;
for (let i = 0; i < 4000; i++) if (!pickWinner(longshot).them) upsets++;
ok('an outsider can still take it', upsets > 100, `${(upsets / 40).toFixed(1)}% of the time`);
console.log(`      a rank outsider (shown ${oddsFor(longshot)[0]}%) wins ${(upsets / 40).toFixed(1)}% of the time`);

// ── a season, end to end ──────────────────────────────────────────────────────
function season(over, workOver) {
  const s = st(over);
  s.filmography = [work(workOver)];
  const p = runNominations(s);
  return { s, p };
}
let nominated = 0;
for (let i = 0; i < 400; i++) { const { p } = season({}, { rating: 90, genre: 'Drama', scale: 'indie' }); if (p) nominated++; }
// Annual seasons: each film's own chance is lower than it was biennially, and there are twice as many nights.
ok('a superb drama is usually nominated', nominated > 200, `${nominated}/400`);
let horrorNoms = 0;
for (let i = 0; i < 400; i++) { const { p } = season({}, { rating: 90, genre: 'Horror', scale: 'blockbuster' }); if (p) horrorNoms++; }
ok('a superb horror blockbuster rarely is', horrorNoms < 120 && horrorNoms > 10, `${horrorNoms}/400`);
console.log(`      rated 9.0 — indie drama nominated ${(nominated / 4).toFixed(0)}%, horror blockbuster ${(horrorNoms / 4).toFixed(0)}%`);
let weakNoms = 0;
for (let i = 0; i < 400; i++) { const { p } = season({}, { rating: 72 }); if (p) weakNoms++; }
ok('a merely-decent film almost never gets in', weakNoms < 60, `${weakNoms}/400`);

// nothing eligible, nothing happens
const empty = st(); empty.filmography = [];
ok('no work means no season', runNominations(empty) === null);
const advertOnly = st(); advertOnly.filmography = [work({ minor: true, rating: 95 })];
ok('an advert is never nominated', runNominations(advertOnly) === null);

// a nomination is itself worth something, immediately
const { s: nom } = (() => { for (let i = 0; i < 200; i++) { const r = season({}, { rating: 93, genre: 'Drama', scale: 'indie' }); if (r.p) return r; } return season({}, {}); })();
ok('a nomination raises what you can ask for', nom.quote > 1000000, '€' + nom.quote.toLocaleString());
ok('and buys respect', nom.respect > 55, String(nom.respect));
ok('it stops the game', nom.bigMoment && nom.bigMoment.id === 'nomination', JSON.stringify(nom.bigMoment && nom.bigMoment.id));
// The player is told where they stand in words, never as a percentage — a number is
// something you can do arithmetic against, and that is what kills the night.
ok('the read is in words, not a percentage', !/%/.test((nom.bigMoment.lines || []).join(' ')), (nom.bigMoment.lines || [])[0]);
ok('but it does say where you stand', /favourite|conversation|yours|betting|prize/i.test((nom.bigMoment.lines || []).join(' ')),
  (nom.bigMoment.lines || [])[0]);

// ── the ceremony ──────────────────────────────────────────────────────────────
function toCeremony(s) {
  for (let m = 0; m < 12 && s.awards.pending; m++) {
    s.month += 1; if (s.month > 11) { s.month = 0; s.year += 1; }
    ceremonyTick(s);
  }
  return s;
}
let won = 0, lost = 0, quoteUp = 0;
for (let i = 0; i < 300; i++) {
  const r = season({}, { rating: 93, genre: 'Drama', scale: 'indie' });
  if (!r.p) continue;
  const before = r.s.quote;
  toCeremony(r.s);
  if ((r.s.awards.wins || []).length) { won++; if (r.s.quote > before) quoteUp++; } else lost++;
}
ok('the ceremony always resolves', won + lost > 0 && won > 0 && lost > 0, `${won} won, ${lost} lost`);
ok('a win raises the quote again', quoteUp === won, `${quoteUp}/${won}`);
console.log(`      of ${won + lost} seasons that reached a ceremony, ${won} were won`);

const winner = (() => { for (let i = 0; i < 400; i++) {
  const r = season({}, { rating: 95, genre: 'Drama', scale: 'indie' }); if (!r.p) continue;
  toCeremony(r.s); if ((r.s.awards.wins || []).length) return r.s; } return null; })();
ok('a win is stamped on the credit forever', winner && winner.filmography[0].asker >= 1, String(winner && winner.filmography[0].asker));
ok('a win stops the game', winner.bigMoment.id === 'ceremony' && winner.bigMoment.kind === 'good');
ok('a win opens doors that fame had shut', askerStanding(winner) >= 22, String(askerStanding(winner)));
ok('and a bare nomination opens fewer', askerStanding(nom) > 0 && askerStanding(nom) < 22, String(askerStanding(nom)));
ok('the diary records the win', /Won the Asker/.test(JSON.stringify(winner.timeline)));

// A night where you won nothing at all — not even the film's Best Picture, which is a
// good night that is not your statuette.
const loser = (() => { for (let i = 0; i < 600; i++) {
  const r = season({}, { rating: 82, genre: 'Drama', scale: 'indie' }); if (!r.p) continue;
  toCeremony(r.s);
  if (!(r.s.awards.wins || []).length && r.s.awards.losses === 1) return r.s; } return null; })();
ok('losing is a real ending too', loser && loser.bigMoment.kind === 'bad', loser && loser.bigMoment.title);
ok('and it names who took it', /for "/.test(loser.bigMoment.body), loser.bigMoment.body.slice(0, 80));

// ── an Asker makes you famous, which the first version got wrong ──────────────
// Maxi: "оскар в жизни делает тебя известней, гонорары растут, ты переходишь в А-лист."
// He is right. Winning one has to be a jump, not a nudge.
function winFrom(fame) {
  for (let i = 0; i < 600; i++) {
    const r = season({ fame, peakFame: fame, quote: 1000000 }, { rating: 95, genre: 'Drama', scale: 'indie' });
    if (!r.p) continue;
    toCeremony(r.s);
    if ((r.s.awards.wins || []).length) return r.s;
  }
  return null;
}
const fromNowhere = winFrom(28), fromStar = winFrom(58);
ok('a win lifts an unknown into the room', fromNowhere && fromNowhere.fame >= 62,
  `fame 28 → ${fromNowhere && Math.round(fromNowhere.fame)}`);
ok('and pushes a star toward the A-list', fromStar && fromStar.fame >= 74,
  `fame 58 → ${fromStar && Math.round(fromStar.fame)}`);
ok('peak fame keeps up', fromStar.peakFame >= fromStar.fame);
ok('and the fee roughly doubles across nomination and win', fromStar.quote > 2000000,
  '€1,000,000 → €' + fromStar.quote.toLocaleString());
console.log(`      an Asker win — fame 28 → ${Math.round(fromNowhere.fame)}, fame 58 → ${Math.round(fromStar.fame)}, quote ×${(fromStar.quote / 1000000).toFixed(2)}`);

// ── and it is the heaviest thing a legacy can carry ───────────────────────────
import { computeLegacy } from '../src/systems/meta/legacy.js';
const plain = computeLegacy(st({ peakFame: 70, respect: 60, filmography: [work({ rating: 88 })] }));
const laurelled = computeLegacy(st({ peakFame: 70, respect: 60, filmography: [work({ rating: 88 })],
  awards: { losses: 0, wins: [{ title: 'x', year: 2061 }], nominations: [{ title: 'x' }], pending: null, history: [] } }));
ok('a win is worth more than any single hit', laurelled.points - plain.points > 600,
  `${plain.points} → ${laurelled.points}`);
ok('and the legacy names it', laurelled.askerWins === 1 && laurelled.askerNoms === 1);

// ── nobody else wins for YOUR film ────────────────────────────────────────────
// Found live: the rival title generator produced "The Weight of" + "Water", so the
// ceremony announced someone else winning for the picture the player was nominated for.
let collisions = 0, checked = 0;
for (let i = 0; i < 500; i++) {
  const r = season({}, { title: 'The Weight of Water', rating: 93, genre: 'Drama', scale: 'indie' });
  if (!r.p) continue;
  for (const p of r.p) {
    checked++;
    const works = p.field.map((n) => n.work);
    if (works.filter((w) => w === 'The Weight of Water').length > 1) collisions++;
    if (new Set(works).size !== works.length) collisions++;
  }
}
ok('no two nominees are up for the same film', collisions === 0, `${collisions} collisions in ${checked} categories`);

// ── one to three in a lifetime, which is what real careers do ─────────────────
// Maxi: "в целом у людей-актёров 1, максимум 3 оскара за жизнь."
import { startProduction, productionTick } from '../src/systems/career/production.js';
import { releaseTick } from '../src/systems/career/release.js';
import { isSeasonYear, EVERY } from '../src/systems/career/awards.js';
import { closeYear } from '../src/systems/world/yearbook.js';
// Annual, now that the field is the world's real work and not five random names.
ok('the season is held every year', EVERY === 1 && isSeasonYear(2062) && isSeasonYear(2063));

function lifetime(acting, meter, scale, genre) {
  const s = st({ ageY: 25, fame: 45, peakFame: 45, respect: 60, acting, quote: 0, year: 2050,
    looks: 62, singing: 0, confidence: 60, dream: 'actor' });
  s.filmography = []; s.offers = []; s.releases = []; s.frozen = []; s.genreXP = {}; s.people = []; s.family = [];
  let gap = 0;
  for (let m = 0; m < 30 * 12; m++) {
    // The world publishes its year first — that is where the other four nominees come from.
    s.month++; if (s.month > 11) { s.month = 0; s.year++; s.ageY++; closeYear(s, s.year - 1); runNominations(s); }
    if (!s.production && ++gap >= 14) {
      gap = 0;
      startProduction(s, { id: 'x', projectTitle: 'P' + m, role: 'Lead', type: 'Feature Film',
        genre, salary: 2000000, months: 5, tier: 'lead', scale, prestigeScore: 70, stability: 90 });
      s.production.meter = meter;
    }
    if (s.production) productionTick(s);
    releaseTick(s); ceremonyTick(s);
  }
  return (s.awards.wins || []).length;
}
// A hundred and fifty lives, not forty: the true mean sits at about three and the old
// sample swung either side of the threshold, so a passing design failed roughly one run in
// five and told nobody anything.
function avgWins(...args) { let t = 0; for (let i = 0; i < 150; i++) t += lifetime(...args); return t / 150; }
const masterDrama = avgWins(95, 92, 'indie', 'Drama');
const goodDrama = avgWins(85, 78, 'indie', 'Drama');
const average = avgWins(72, 60, 'feature', 'Thriller');
ok('even a lifetime of superb dramas tops out around three', masterDrama <= 3.2 && masterDrama >= 1.2, masterDrama.toFixed(1));
ok('a good specialist gets one or two', goodDrama <= 2.4 && goodDrama >= 0.5, goodDrama.toFixed(1));
ok('and an ordinary career gets none', average < 0.4, average.toFixed(2));
console.log(`      Askers in a 30-year career — master/drama ${masterDrama.toFixed(1)}, good/drama ${goodDrama.toFixed(1)}, ordinary ${average.toFixed(2)}`);

// Best Picture belongs to the producers — it is a good night, not your statuette.
const pictureOnly = { category: 'picture', won: true, title: 'X', winner: 'You', work: 'X', odds: 40 };
ok('Best Picture is a category that exists', CATEGORIES.some((c) => c.id === 'picture'));
const withPic = st({ year: 2062 });
withPic.filmography = [work({ rating: 95, genre: 'Drama', scale: 'indie' })];
withPic.awards.pending = [{ category: 'picture', branch: 'film', title: withPic.filmography[0].title,
  field: [{ id: 'you', name: 'You', work: 'x', strength: 500, respect: 70, losses: 0, them: false }],
  odds: [100], yourOdds: 100, due: 2062 * 12 }];
withPic.month = 0; withPic.year = 2062;
ceremonyTick(withPic);
ok('winning Best Picture does not put a statuette on your shelf', (withPic.awards.wins || []).length === 0,
  JSON.stringify(withPic.awards.wins));
ok('but it is still marked on the film', withPic.filmography[0].bestPicture === true);
ok('and it is not counted as a loss either', withPic.awards.losses === 0, String(withPic.awards.losses));

import { CATEGORIES } from '../src/systems/career/awards.js';

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
