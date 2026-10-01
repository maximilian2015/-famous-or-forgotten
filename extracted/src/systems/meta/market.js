// ── what the audience currently has an appetite for ───────────────────────────
//
// This replaces the thing that used to answer that question, which was:
//
//   hotGenre(s) = GENRES[((s.year * 12) + s.month) % GENRES.length]
//
// A calendar. It walked the list one genre per month, forever, in a fixed order, and handed
// whatever landed on it a flat bonus. A player could count the months and know which date to
// open on. There was no market in it, no memory, and nothing anybody did could move it.
//
// Two numbers per genre instead, and they pull opposite ways:
//
//   trend  — the appetite. Moves over YEARS. A genre that has been delivering drags the whole
//            town towards itself, because everybody copies what worked.
//   glut   — how much of it has just come out. Every release adds to it; it halves each year.
//
// The appetite you actually get is what is left of the trend after the glut: appetiteFor().
//
// The cycle nobody had to write: a hit lifts the appetite → the appetite pulls the studios in →
// the studios make too many → the glut eats the appetite → the genre is dead for a few years →
// it rests, the glut drains, and somebody makes one again. Measured over twenty-five simulated
// years: after a year with five or more pictures in a genre, its appetite fell over the next two
// years in 95% of cases, by 24% on average. After a lean year it rose. The gap between making
// too many and making too few is 27 points of appetite, and not one line of that is scripted.
//
// Three things had to be got right before it did any of that, and each one was wrong first:
//
//   1. Glut has to be measured RELATIVE to what everything else is supplying. In absolute
//      releases it sat near its ceiling permanently — twenty-two pictures a year across eight
//      genres is nearly three of everything every year — so every genre was always "tired" and
//      the number was a flat tax rather than a cycle. What tires an audience is not that horror
//      films exist. It is that this year there were nine of them.
//   2. The trend has to move on EVIDENCE, once a year, not be nudged up by each film that turned
//      a profit. Nudging ratcheted it: the appetite climbed to its ceiling and a genre stayed hot
//      for twenty-five years, which makes the word "hot" meaningless.
//   3. And the evidence has to be RELATIVE too — a genre rises by doing better than the rest of
//      the market, never against an absolute. Judged against break-even the term is almost always
//      negative, because the median picture loses money here exactly as it does in life, so the
//      whole market drained to the floor just as surely as it had ratcheted to the roof.
//
// Attention is finite. That is the frame, and the last line of marketYear enforces it rather
// than hoping for it: without that the mean appetite leaked down to 0.82 over a dozen years, and
// an unknown actor's picture failed four times in five for no reason anybody could point at.
//
// This module imports nothing. Every other system can read the market without a cycle.

export const GENRES = ['Drama', 'Thriller', 'Comedy', 'Sci-Fi', 'Romance', 'Horror', 'Musical', 'Crime'];

// Lazily made, because a save from before any of this existed has no market in it.
export function marketOf(s) {
  if (!s) return null;
  if (!s.market || !s.market.trend) {
    const m = { trend: {}, glut: {}, tally: {}, total: 1 };
    for (const g of GENRES) { m.trend[g] = 0.9 + Math.random() * 0.2; m.glut[g] = 0; }
    s.market = m;
  }
  if (s.market.total == null) s.market.total = 1;    // saves made before there was a total
  return s.market;
}

// ── how many people are going to the cinema AT ALL ────────────────────────────
// A relayed note, and a correct one: genre share being perfectly zero-sum says the audience
// always has exactly the same amount of attention to give, and it does not. Some years everybody
// goes and some years the theatrical market is simply weaker. Keeping the two apart also leaves
// the door open for the things that really move it — a streaming boom, a strike, a recession,
// something nobody has a word for yet — without any of them having to pretend to be a genre.
//
// So: genres compete for SHARE, which is conserved. The size of the thing they are competing
// for is its own number, and it drifts.
export function totalDemand(s) { const m = marketOf(s); return m ? (m.total ?? 1) : 1; }
export function totalWord(s) {
  const t = totalDemand(s);
  if (t >= 1.14) return 'everybody is going to the cinema this year';
  if (t >= 1.05) return 'a good year for cinemas';
  if (t >= 0.95) return 'an ordinary year';
  if (t >= 0.86) return 'a thin year for cinemas';
  return 'nobody is going to the cinema this year';
}
// The share alone, for anybody who needs to say which genres are up against which.
export function genreShare(s, genre) {
  const m = marketOf(s);
  if (!m || !genre) return 1;
  return Math.max(0.5, (m.trend[genre] || 1) * (1 - fatigueOf(s, genre)));
}

export function fatigueOf(s, genre) {
  const m = marketOf(s);
  if (!m) return 0;
  const all = GENRES.reduce((n, k) => n + (m.glut[k] || 0), 0);
  const usual = Math.max(0.6, all / GENRES.length);
  return Math.max(0, Math.min(0.45, ((m.glut[genre] || 0) / usual - 1) * 0.42));
}

// What the appetite is worth right now: 0.5 dead, 1.0 ordinary, 1.5 everybody wants one.
// What the appetite is worth right now: the genre's share of attention, times how much
// attention there is to go round. 0.5 dead, 1.0 ordinary, 1.5 everybody wants one.
export function appetiteFor(s, genre) {
  if (!genre) return totalDemand(s);
  return Math.max(0.42, genreShare(s, genre) * totalDemand(s));
}

// The hottest thing in town. Same signature as the old hotGenre, so every screen that asked
// the calendar now asks the market — and the answer means something.
export function hotGenre(s) {
  let best = GENRES[0], top = -1;
  for (const g of GENRES) { const v = appetiteFor(s, g); if (v > top) { top = v; best = g; } }
  return best;
}
export function coldGenre(s) {
  let worst = GENRES[0], low = 9;
  for (const g of GENRES) { const v = appetiteFor(s, g); if (v < low) { low = v; worst = g; } }
  return worst;
}

// For the screen, because a number out of nowhere is not information.
export function appetiteWord(s, genre) {
  const v = appetiteFor(s, genre);
  if (v >= 1.22) return 'everybody wants one';
  if (v >= 1.08) return 'on the way up';
  if (v >= 0.94) return 'steady';
  if (v >= 0.78) return 'gone quiet';
  if (v >= 0.65) return 'nobody is buying';
  return 'dead for now';
}
// And whether that is because the audience moved on or because the town drowned it.
export function appetiteWhy(s, genre) {
  const f = fatigueOf(s, genre);
  const m = marketOf(s);
  if (f >= 0.22) return 'too many of them came out';
  if ((m.trend[genre] || 1) >= 1.15) return 'the last few worked';
  if ((m.trend[genre] || 1) <= 0.82) return 'the audience moved on';
  return null;
}

// One picture opens: it uses its genre up a little, and the year remembers how it did. The
// appetite itself is settled once a year on the evidence, never film by film.
const WEIGHT = { blockbuster: 2.4, feature: 1.4, prestige: 0.7, indie: 0.5, festival: 0.3, small: 0.2 };
// What tires an audience is not a count of films. Seven tiny horror pictures that opened on
// forty screens between them are not the same event as four superhero sequels with a hundred
// million of television behind each — and counted as releases they were identical. So it is
// weighted by how much of it anybody actually SAW: how big the release was, how loudly it was
// sold, and whether it was the fourth one of those. Exposure, not arithmetic.
export function exposureOf(scale, campaignShare = 0.35, part = 1) {
  const size = WEIGHT[scale] ?? 0.5;
  const loud = 0.55 + Math.min(1.1, campaignShare) * 1.1;   // 0.72 at minimal, 1.38 at event
  // The fourth one of a thing is more tiring than the first, because it is the same thing.
  const again = 1 + Math.min(0.5, Math.max(0, (part || 1) - 1) * 0.14);
  return size * loud * again;
}
export function marketAfterRelease(s, genre, scale, ratio, campaignShare, part) {
  const m = marketOf(s);
  if (!m || !genre || !GENRES.includes(genre)) return s;
  m.glut[genre] = (m.glut[genre] || 0) + exposureOf(scale, campaignShare ?? 0.35, part ?? 1);
  if (Number.isFinite(ratio)) {
    const t = (m.tally[genre] = m.tally[genre] || { n: 0, sum: 0 });
    t.n++; t.sum += ratio;
  }
  return s;
}

// A year passes. See the three corrections at the top — all of them live in here.
export function marketYear(s) {
  const m = marketOf(s);
  if (!m) return s;
  const fat = {};
  for (const g of GENRES) fat[g] = fatigueOf(s, g);     // measured BEFORE the glut decays
  const meanFat = GENRES.reduce((n, g) => n + fat[g], 0) / GENRES.length;
  let n = 0, sum = 0;
  for (const g of GENRES) { const t = m.tally[g]; if (t && t.n) { n += t.n; sum += t.sum; } }
  const marketMean = n ? sum / n : 1;
  for (const g of GENRES) {
    const t = m.tally[g];
    if (t && t.n) {
      // Did this genre do better than everything else did? That, and nothing absolute.
      const mine = t.sum / t.n;
      m.trend[g] += Math.max(-0.17, Math.min(0.19, (mine - marketMean) * 0.15));
    }
    // Fatigue eats the appetite. This is the one that turns a boom into a bust: too much
    // horror does not only make you skip this horror film, it stops you being somebody who
    // goes to horror, for a few years.
    m.trend[g] -= (fat[g] - meanFat) * 0.42;
    // And everything drifts back towards ordinary, slowly, because nothing stays anything.
    m.trend[g] = m.trend[g] * 0.988 + 1.0 * 0.012;
    m.trend[g] = Math.max(0.5, Math.min(1.6, m.trend[g] + (Math.random() - 0.5) * 0.06));
    m.glut[g] = (m.glut[g] || 0) * 0.5;
  }
  // Share is finite, enforced rather than hoped for. Only the SHAPE of it may move — the SIZE
  // of the thing being shared is the separate number below, which is the whole point of
  // splitting them: a genre can only get hot at another genre's expense, but the cinema as a
  // whole is free to have a good year or a bad one.
  const mean = GENRES.reduce((acc, g) => acc + m.trend[g], 0) / GENRES.length;
  if (mean > 0.01) for (const g of GENRES) m.trend[g] = Math.max(0.5, Math.min(1.6, m.trend[g] / mean));
  // How many people went this year against how many went last year. Slow, mean-reverting, and
  // once in a while something happens to the whole business at once.
  const swing = marketMean > 0 ? Math.max(-0.05, Math.min(0.06, (marketMean - 1) * 0.05)) : 0;
  m.total = (m.total ?? 1) * 0.94 + 1.0 * 0.06 + swing + (Math.random() - 0.5) * 0.045;
  if (Math.random() < 0.055) m.total += (Math.random() < 0.5 ? -1 : 1) * (0.07 + Math.random() * 0.1);
  m.total = Math.max(0.72, Math.min(1.28, m.total));
  m.tally = {};
  return s;
}

// A new career does not begin in a market that has never happened. Twelve quiet years of
// nobody in particular making pictures, so the genres start somewhere real instead of all
// sitting at 1.00 — which is also what stopped anything from ever being hot in the prototype.
export function ageMarket(s, years = 12) {
  const m = marketOf(s);
  if (!m) return s;
  for (let y = 0; y < years; y++) {
    const w = GENRES.map((g) => Math.pow(appetiteFor(s, g), 3.5));
    const tot = w.reduce((a, b) => a + b, 0) || 1;
    for (let i = 0; i < 22; i++) {
      let r = Math.random() * tot, g = GENRES[0];
      for (let j = 0; j < GENRES.length; j++) { r -= w[j]; if (r <= 0) { g = GENRES[j]; break; } }
      const scale = Math.random() < 0.25 ? 'blockbuster' : Math.random() < 0.45 ? 'feature' : 'indie';
      // A rough stand-in for how it did: the appetite it opened into, plus noise. Good enough
      // to give the trends a history, and none of it is ever shown to anybody.
      marketAfterRelease(s, g, scale, appetiteFor(s, g) * (0.6 + Math.random() * 0.9));
    }
    marketYear(s);
  }
  return s;
}
