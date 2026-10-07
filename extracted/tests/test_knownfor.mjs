// The wall of five, and why each one is on it.
//
// Maxi, looking at a career with four billion-euro pictures: four lines reading "The one that
// printed money". The band came off the hit weight alone, and the weight cannot tell two
// €1.2bn films apart because there is nothing to tell — so the wall said one thing five times.
// `whyOf` already knew the numbers were different; only the sentence did not.
import { theHits, hitWeight, moneyVsReviews } from '../src/systems/meta/knownFor.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (films) => ({ year: 2066, world: { years: {} }, filmography: films });
const bn = (title, year, bo, extra = {}) => ({ title, year, boxOffice: bo, billion: bo >= 1e9,
  verdict: 'smash', rating: 70, part: 1, genre: 'Action', ...extra });

// The career that found it.
{
  const s = st([
    bn('Light and Rain', 2059, 1.62e9),
    bn('Light and Rain II', 2062, 1.31e9, { part: 2 }),
    bn('Midnight Talker', 2064, 1.16e9, { genre: 'Thriller' }),
    bn('Blue Roommate', 2065, 1.04e9, { genre: 'Comedy' }),
    { title: 'A Voice Above Your Door', year: 2061, boxOffice: 82e6, nominated: 1, verdict: 'profitable', rating: 85, genre: 'Drama' },
  ]);
  const hits = theHits(s);
  ok('five on the wall', hits.length === 5, String(hits.length));
  const bands = hits.map((h) => h.band);
  ok('and five different reasons', new Set(bands).size === 5, bands.join(' / '));
  ok('the biggest is named as the biggest', bands.includes('Your biggest picture'), bands.join(' / '));
  ok('the sequel is named as a sequel', hits.find((h) => h.title === 'Light and Rain II').band === 'The one they came back for',
    hits.find((h) => h.title === 'Light and Rain II').band);
  ok('the nomination is named as a performance', hits.find((h) => /Voice Above/.test(h.title)).band === 'The performance they nominated',
    hits.find((h) => /Voice Above/.test(h.title)).band);
  ok('and nothing says "printed money" four times', bands.filter((b) => b === 'The one that printed money').length <= 1, bands.join(' / '));
  // The ordinals are chronological, so a later picture that out-grosses an earlier one does not
  // renumber history.
  ok('billions are counted in the order they happened', /number 3/.test(hits.find((h) => h.title === 'Midnight Talker').band),
    hits.find((h) => h.title === 'Midnight Talker').band);
}
// A small career still gets a sentence, and it is not about money it did not make.
{
  const s = st([{ title: 'The Quiet Part', year: 2051, boxOffice: 9e6, rating: 88, verdict: 'profitable', genre: 'Drama' }]);
  const hits = theHits(s);
  ok('one good film is still a wall', hits.length === 1 && !!hits[0].band, JSON.stringify(hits));
  ok('and the reason is the work, not the gross', !/billion|printed money|biggest/i.test(hits[0].band), hits[0].band);
}
// Nothing at all is nothing at all.
ok('an empty career has an empty wall', theHits(st([])).length === 0);
// And the weight ladder underneath is untouched — the bands are a sentence, not a ranking.
{
  const s = st([bn('A', 2060, 1.2e9)]);
  ok('a billion is still weight 3 or better', hitWeight(s.filmography[0], s) >= 3, String(hitWeight(s.filmography[0], s)));
}
// ── "SMASH · poorly reviewed": why both are true, from the numbers on the credit ──
{
  const hungers = { title: 'HUNGERs', verdict: 'smash', critical: 'poorly reviewed', rating: 51.7, boxOffice: 68658572, needed: 24300000, reviews: { audience: 6.6 } };
  ok('a smash the critics did not like says why, in its own numbers', moneyVsReviews(hungers) === 'Bad reviews, good business. It made €68.7m against the €24.3m it needed — 2.8 times over. Critics 5.2, audience 6.6 — the people who paid liked it more than the people who wrote about it.', moneyVsReviews(hungers));
  const darling = { verdict: 'bomb', critical: 'acclaimed', rating: 88, boxOffice: 9e6, needed: 30e6, reviews: { audience: 7.1 } };
  ok('and so does a bomb the critics loved', moneyVsReviews(darling) === 'Good reviews, bad business. It made €9.0m against the €30.0m it needed. Critics 8.8, audience 7.1 — the column liked it more than the room did.', moneyVsReviews(darling));
  ok('when the money and the column agree there is nothing to explain', moneyVsReviews({ verdict: 'smash', critical: 'acclaimed' }) === null && moneyVsReviews({ verdict: 'bomb', critical: 'panned' }) === null && moneyVsReviews({ verdict: 'watched', critical: 'poorly reviewed' }) === null);
  ok('a credit from before the audience had a number gives the money and stops', /needed\.$/.test(moneyVsReviews({ verdict: 'profitable', critical: 'panned', rating: 30, boxOffice: 40e6, needed: 30e6 })));
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
