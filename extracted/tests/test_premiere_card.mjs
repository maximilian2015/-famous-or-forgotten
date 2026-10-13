// Opening night is the film: its poster, what kind of picture, who you played, who made it with
// you, and what is really known tonight — and never the money (career/release.js premiereCard).
// Maxi, at the old card: one generic cinema, a paragraph and a button, "it does not feel like an
// event". The rule he kept: only what the game knows. Every line on the card is checked here
// against the field it claims to read, on a release that really opened.
import { scheduleRelease, releaseTick, windowWord, CAMPAIGN } from '../src/systems/career/release.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (o = {}) => ({ version: 'x', name: 'Alex Moon', ageY: 30, stage: 'career', dream: 'actor', fame: 60, respect: 40, acting: 70, charisma: 50, looks: 50, luck: 50, scandal: 0, media: 0, mental: 60,
  year: 2050, month: 2, timeline: [], filmography: [], productions: [], offers: [], inbox: [], releases: [], peakFame: 60, hasApartment: true, housing: 'room', ap: 100, apMax: 100, cash: 100000,
  genreXP: {}, people: [], family: [], moments: [], events: [], castingPool: [], ...o });
// Opens the release and hands back the premiere moment and the release itself.
function openIt(s, credit, job) {
  const rel = scheduleRelease(s, credit, job);
  for (let i = 0; i < 24 && !(s.filmography || []).some((c) => c.title === credit.title); i++) {
    s.month += 1; if (s.month > 11) { s.month = 0; s.year += 1; }
    releaseTick(s);
  }
  const m = [s.bigMoment, ...(s.moments || [])].filter(Boolean).find((x) => x.id === 'premiere' && x.title === credit.title);
  return { m, rel, month: s.month };
}
const credit = (o = {}) => ({ title: 'My Crazy Family', role: 'Lead', type: 'Feature Film', genre: 'Comedy', salary: 900000, rating: 61, status: 'Released',
  year: 2050, season: 0, part: 1, episodes: 0, scale: 'feature', director: 'Ines Kalder', ...o });
const job = (o = {}) => ({ title: 'My Crazy Family', role: 'Lead', type: 'Feature Film', genre: 'Comedy', scale: 'feature', salary: 900000, months: 4, tier: 'lead',
  prestigeScore: 55, stability: 90, character: { name: 'Nora Hale', what: 'the one who stayed' }, with: 'Teo Albright', withFame: 70, campaignTier: 'major', ...o });

// ── a studio comedy ───────────────────────────────────────────────────────────
{
  const s = st({ media: 30 });
  const { m, rel, month } = openIt(s, credit({ rating: 80 }), job());   // rated 80: the night's own noise lifts the talk past 45
  ok('the film opened with a card on its night', !!m && !!m.card, m ? Object.keys(m).join(',') : 'no premiere');
  const c = (m && m.card) || { tonight: [] };
  ok('what kind of picture, as the game has it', c.type === 'Feature Film' && c.genre === 'Comedy' && c.role === 'Lead', JSON.stringify([c.type, c.genre, c.role]));
  ok('who you played, by name', c.you === 'Alex Moon' && c.character === 'Nora Hale', JSON.stringify([c.you, c.character]));
  ok('who made it with you', c.director === 'Ines Kalder' && c.with === 'Teo Albright');
  const line = (k) => (c.tonight.find((l) => l.k === k) || {}).t || '';
  ok('the campaign is the one the studio bought', line('campaign').includes(CAMPAIGN.major.label.toLowerCase()), line('campaign'));
  ok('the date is the month it opened in', line('date') === `The date: ${windowWord(month)}.`, line('date') + ' / ' + windowWord(month));
  ok('what opened against it is the roll the money used', line('against') === (rel._against < 1 ? 'Something enormous opened the same weekend.' : 'Nothing big opened against it.'), line('against') + ' ' + rel._against);
  ok('the talk is what demand read, before the night\'s own noise', line('talk') === 'People are talking about you this month.' && s.media >= 45, line('talk'));
  const all = JSON.stringify(c) + ' ' + m.body;
  ok('and not a euro anywhere on it', !/€|\d+\s*m\b|million|box office|gross/i.test(all), all.slice(0, 200));
  ok('a short body, the kind of night it is', /full house/.test(m.body) && m.body.length < 220, m.body);
  ok('no sequel line on a first film', c.sequel === null);
}
// ── a scandal sells nothing, and the card says so ─────────────────────────────
{
  const s = st({ media: 60, hypeSource: 'scandal' });
  const { m } = openIt(s, credit({ title: 'Bad Week' }), job({ title: 'Bad Week' }));
  ok('a scandal month is called a scandal', /scandal/.test((m.card.tonight.find((l) => l.k === 'talk') || {}).t || ''));
}
// ── a sequel, from the part before it ────────────────────────────────────────
{
  const s = st({ year: 2054, filmography: [{ title: 'Iron Harbour', part: 1, year: 2050, rating: 72, audience: 74, scale: 'blockbuster', genre: 'Sci-Fi' }] });
  const { m } = openIt(s, credit({ title: 'Iron Harbour · Part 2', part: 2, scale: 'blockbuster', type: 'Blockbuster', genre: 'Sci-Fi' }),
    job({ title: 'Iron Harbour · Part 2', part: 2, scale: 'blockbuster', type: 'Blockbuster', genre: 'Sci-Fi', tier: 'tentpole', campaignTier: 'event' }));
  // Post-production on a tentpole is seven to twelve months, so it opens in 2054 or 2055.
  const gap = s.year - 2050;
  ok('the sequel says which part, how long ago, and how the room took the last one', m.card.sequel === `Part 2. The last one opened ${gap} years ago. The audience loved that one (7.4).`, m.card.sequel);
  ok('a tentpole night is a tentpole night', /studio that needs this one/.test(m.body), m.body);
}
// ── an old credit with nothing on it: lines left out, never guessed ──────────
{
  const s = st();
  const { m } = openIt(s, credit({ title: 'Plain Film', director: null }), job({ title: 'Plain Film', character: null, with: null }));
  const c = m.card;
  ok('no director, no co-star, no character: nothing invented', c.director === null && c.with === null && c.character === null, JSON.stringify(c));
}
// ── television has no campaign, no date, no weekend ──────────────────────────
{
  const s = st();
  const { m } = openIt(s, credit({ title: 'Night Shift', type: 'TV Series', scale: 'prestige', season: 1, episodes: 8 }),
    job({ title: 'Night Shift', type: 'TV Series', scale: 'prestige', season: 1, episodes: 8, campaignTier: null }));
  ok('a season going out gets the card and no film lines', !!m && !!m.card && m.card.tonight.length === 0 && m.tv === 'prestige', m && JSON.stringify(m.card));
}
// ── a festival picture nobody bought: the film, and nothing about a release ──
{
  let m = null;
  for (let k = 0; k < 60 && !(m && m.result === 'unsold'); k++) {
    const s = st({ fame: 0 });
    m = openIt(s, credit({ title: 'Salt Season', scale: 'festival', rating: 52, genre: 'Drama' }), job({ title: 'Salt Season', scale: 'festival', genre: 'Drama' })).m;
  }
  ok('unsold: the poster and the credits, and no campaign, date or weekend', m && m.result === 'unsold' && !!m.card && m.card.tonight.length === 0 && m.genre === 'Drama',
    m && JSON.stringify({ r: m.result, t: m.card && m.card.tonight }));
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
