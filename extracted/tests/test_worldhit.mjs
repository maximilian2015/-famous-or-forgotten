// When a film becomes one of the few everybody has heard of.
//
// It used to be decided on the SET. production.js rolled a die at wrap, on the rating, and wrote
// 'World Hit' onto the credit months before release — and that flag is the largest single reward
// in the game: fame +25 where a smash gives +8, eighty-five of hype, four hundred legacy points
// each where an ordinary hit gives twenty-five, the icon room, the gold border in the
// filmography, and the press calling it the film of the year.
//
// So a €1.163bn picture rated 7.7 could never be one, and a festival film rated 9.2 that took
// forty million always could. The game's idea of an enormous film was the critics' idea of a
// good one, settled before anybody had seen it.
//
// It is settled after the run now, from the final worldwide gross and what the crowd made of it.
// The roll at wrap is kept — it is the only thing that says a shoot was exceptional — but it no
// longer claims to know what the world will do.
import { isWorldHit, breakEvenFor, verdictOf } from '../src/systems/career/release.js';
import fs from 'fs';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

// ── 1. it cannot be awarded before release ────────────────────────────────────
// Not by assertion but by reading the source: wrapProduction must not be able to write the
// status or the counter, because everything downstream trusts them.
{
  const prod = fs.readFileSync(new URL('../src/systems/career/production.js', import.meta.url), 'utf8');
  ok('the set cannot declare a world hit', !/'World Hit'/.test(prod), "production.js still writes the status");
  ok('and the set cannot count one', !/worldHits\s*=\s*\(s\.worldHits/.test(prod), 'production.js still increments the counter');
  const rel = fs.readFileSync(new URL('../src/systems/career/release.js', import.meta.url), 'utf8');
  ok('the run is what counts them', /worldHits = \(s\.worldHits \|\| 0\) \+ 1/.test(rel));
  // And nothing unopened can qualify: no gross, no phenomenon.
  ok('a film that has not opened is not one', isWorldHit({ boxOffice: 0, audience: 95, rating: 95 }, { scale: 'blockbuster', rating: 95 }) === false);
  ok('nor is one with no box office at all', isWorldHit({ audience: 99, rating: 99 }, { scale: 'blockbuster', rating: 99 }) === false);
}

// ── 2. the picture this was found on ──────────────────────────────────────────
// Midnight Talker: a €220m blockbuster, 7.7 from the column, 8.0 from the room, €1.163bn.
{
  const credit = { boxOffice: 1163e6, rating: 77, audience: 80, needed: breakEvenFor({ scale: 'blockbuster', campaignTier: 'event' }) };
  const rel = { scale: 'blockbuster', campaignTier: 'event', rating: 77, reception: 80 };
  ok('€1.163bn at 7.7 is a world hit', isWorldHit(credit, rel) === true);
}

// ── 3. a very profitable small film is not automatically one ──────────────────
// Ten times its money is a triumph and the card says so. It is not the film of the year.
{
  const needed = breakEvenFor({ scale: 'indie', campaignTier: 'standard' });
  const credit = { boxOffice: needed * 10, rating: 82, audience: 86, needed };
  const rel = { scale: 'indie', campaignTier: 'standard', rating: 82, reception: 86 };
  ok('a small film at ten times its costs is not a world hit', isWorldHit(credit, rel) === false,
    `€${Math.round(credit.boxOffice / 1e6)}m on a €${Math.round(needed / 1e6)}m bar`);
  // ...but the route exists, and a real phenomenon takes it: twelve times, past a hundred and
  // fifty million, and a crowd that sent their friends. That is how a five-million comedy takes
  // four hundred, and refusing it would be the same mistake in the other direction.
  const big = { boxOffice: 400e6, rating: 84, audience: 90, needed };
  ok('but a small film that went enormous and was loved IS one', isWorldHit(big, { scale: 'indie', campaignTier: 'standard', rating: 84, reception: 90 }) === true);
}

// ── 4. money alone does not make it prestigious, and does not make it one ─────
{
  const credit = { boxOffice: 1100e6, rating: 41, audience: 38, needed: breakEvenFor({ scale: 'blockbuster', campaignTier: 'event' }) };
  const rel = { scale: 'blockbuster', campaignTier: 'event', rating: 41, reception: 38 };
  ok('a billion that everybody disliked is not a world hit', isWorldHit(credit, rel) === false);
  // And the thing the brief actually asks: a huge gross must not make a picture good. isWorldHit
  // returns a boolean and touches nothing; the rating is the rating.
  ok('and nothing about it touches the rating', credit.rating === 41 && rel.rating === 41);
  // The old system did the opposite — it FORCED the rating to 96 whenever it fired. That is
  // what made this a semantic bug rather than a tuning one.
  const prod = fs.readFileSync(new URL('../src/systems/career/production.js', import.meta.url), 'utf8');
  ok('and no commercial result can raise a score any more', !/if \(worldHit\) rating = Math\.max/.test(prod));
}

// ── 5. flop / hit / smash is untouched ────────────────────────────────────────
// The financial verdict is a different system and must read exactly as it did.
{
  const bar = breakEvenFor({ scale: 'feature', campaignTier: 'standard' });
  const V = (x) => verdictOf({ scale: 'feature', campaignTier: 'standard', rating: 70, boxOffice: x, type: 'Feature Film' });
  ok('under the bar is still a bomb', V(bar * 0.6) === 'bomb');
  ok('around the bar is still breaking even', V(bar * 0.9) === 'broke even');
  ok('well over is still profitable', V(bar * 1.4) === 'profitable');
  ok('twice over is still a smash', V(bar * 2.2) === 'smash');
  // The two systems are asked separately and answer separately. A blockbuster at €900m against
  // a €512m bar is 1.76x — profitable, not a smash — and is a world hit all the same.
  const credit = { boxOffice: 900e6, rating: 80, audience: 86, needed: breakEvenFor({ scale: 'blockbuster', campaignTier: 'major' }) };
  const rel = { scale: 'blockbuster', campaignTier: 'major', rating: 80, reception: 86 };
  ok('a world hit need not be a smash', isWorldHit(credit, rel) === true
    && verdictOf({ scale: 'blockbuster', campaignTier: 'major', rating: 80, boxOffice: 900e6, type: 'Blockbuster' }) === 'profitable');
  // And the other way, which is the commoner one by far: a feature at three times its costs is
  // a smash by any measure the business uses, and nobody outside the trade has heard of it.
  const barFeat = breakEvenFor({ scale: 'feature', campaignTier: 'standard' });
  const smash = { boxOffice: Math.round(barFeat * 3), rating: 84, audience: 88, needed: barFeat };
  ok('and a smash need not be a world hit', verdictOf({ scale: 'feature', campaignTier: 'standard', rating: 84, boxOffice: smash.boxOffice, type: 'Feature Film' }) === 'smash'
    && isWorldHit(smash, { scale: 'feature', campaignTier: 'standard', rating: 84, reception: 88 }) === false,
    `€${Math.round(smash.boxOffice / 1e6)}m on a €${Math.round(barFeat / 1e6)}m bar`);
  // One property worth stating rather than hiding: in this model a world hit has ALWAYS made its
  // money back, because the scale bar (€700m) sits above the largest break-even there is (€578m
  // for a blockbuster on an event campaign). A billion-euro picture that lost money is a real
  // thing in life and is not reachable here. If that is ever wanted it is a budget question, not
  // a question about this rule.
  const barBig = breakEvenFor({ scale: 'blockbuster', campaignTier: 'event' });
  ok('the scale bar sits above every break-even in the game', 700e6 > barBig, `€700m vs €${Math.round(barBig / 1e6)}m`);
}

// ── how often, which is the number that decides whether this is a career highlight ──
{
  const GENRES = ['Drama', 'Crime', 'Romance', 'Musical', 'Thriller', 'Sci-Fi', 'Comedy', 'Horror'];
  const MIX = ['small', 'small', 'small', 'festival', 'festival', 'indie', 'indie', 'indie', 'indie',
    'prestige', 'prestige', 'feature', 'feature', 'feature', 'feature', 'feature', 'blockbuster', 'blockbuster'];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const m = await import('../src/systems/career/release.js');
  let hits = 0, tent = 0, tentHits = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const scale = pick(MIX);
    const rating = 30 + Math.round(Math.random() * 62);
    const rel = { scale, genre: pick(GENRES), rating, part: 1, appealMod: 1,
      campaignTier: scale === 'blockbuster' ? pick(['major', 'event', 'event']) : pick(['minimal', 'standard', 'standard', 'major']) };
    rel.reception = Math.max(0, Math.min(100, rating + (Math.random() * 24 - 12)));
    const s = { fame: 10 + Math.round(Math.random() * 85), media: Math.round(Math.random() * 40), year: 2066,
      month: Math.floor(Math.random() * 12), hypeSource: null, typecast: { scores: {}, active: [] }, acting: 60 };
    const d = m.demandFor(s, rel);
    const gross = Math.round(m.openingFor(s, rel, d) * m.legsFor(rel) * m.expansionFor(rel) * 1e6);
    const credit = { boxOffice: gross, rating, audience: rel.reception, needed: breakEvenFor(rel) };
    const w = isWorldHit(credit, rel);
    if (w) hits++;
    if (scale === 'blockbuster') { tent++; if (w) tentHits++; }
  }
  console.log(`      ${hits} of ${N} pictures (${(hits / N * 100).toFixed(2)}%) · of ${tent} blockbusters, ${tentHits} (${(tentHits / tent * 100).toFixed(1)}%)`);
  ok('a world hit is rare across everything that gets made', hits / N < 0.05, `${(hits / N * 100).toFixed(2)}%`);
  ok('but it is not impossible', hits > 0, String(hits));
  ok('and it is something a tentpole can actually reach', tentHits / tent > 0.03, `${(tentHits / tent * 100).toFixed(1)}%`);
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
