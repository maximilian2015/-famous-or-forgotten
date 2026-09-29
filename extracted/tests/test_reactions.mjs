// What ordinary people say about it while it is on.
//
// Maxi asked whether there was activity at the premiere, during the run and at the end. Two
// of the three beats existed and the public voice did not: meta/aftermath.js gives the News
// app the trades and the memes, which is the business talking about itself, and nothing
// anywhere was people in their kitchens. The account did not know you had made anything.
//
// What is pinned here is that the feed says something true about the work:
//   · the tone follows how it was received, and never unanimously
//   · what they say about YOU is a separate conversation from what they say about IT
//   · television gets the middle of its run, which is the part a film never has
import { reactionsFor, liveWork, feedMood } from '../src/systems/social/reactions.js';

let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.log('  FAIL: ' + msg); fails++; } };

const st = (films) => ({ name: 'Mira Vale', year: 2070, month: 3, fame: 70, filmography: films });
const film = (o = {}) => ({ id: 'f1', title: 'The Picture', year: 2070, rating: 70, audience: 68,
  scale: 'feature', tier: 'lead', role: 'Lead', type: 'Feature Film', meterAtClose: 55, ...o });
const series = (o = {}) => film({ id: 't1', title: 'The Show', type: 'Prestige Series',
  scale: 'prestige', episodes: 8, season: 2, ...o });
const tones = (s) => reactionsFor(s, 9).filter((r) => r.about === 'it').map((r) => r.tone);

// ── nothing to say when there is nothing on ───────────────────────────────────
{
  ok(reactionsFor(st([])).length === 0, 'an empty shelf is a quiet feed');
  ok(feedMood(st([])) === null, 'and no line at the top of it');
  const old = st([film({ running: false, closedAt: 2070 * 12 + 3 - 9 })]);
  ok(reactionsFor(old).length === 0, 'and nobody is still posting about something from last year');
}

// ── the three beats ───────────────────────────────────────────────────────────
{
  const open = st([series({ running: true, weeks: 0, weeksTotal: 9 })]);
  const mid = st([series({ running: true, weeks: 4, weeksTotal: 9 })]);
  const end = st([series({ running: true, weeks: 8, weeksTotal: 9 })]);
  ok(liveWork(open)[0].beat === 'open', 'the first week is the opening: ' + liveWork(open)[0].beat);
  ok(liveWork(mid)[0].beat === 'mid', 'the middle is the middle: ' + liveWork(mid)[0].beat);
  ok(liveWork(end)[0].beat === 'end', 'the last week is the end: ' + liveWork(end)[0].beat);
  ok(/week between episodes/.test(feedMood(mid) || ''), 'and the middle is where a series lives: ' + feedMood(mid));
}
{
  // A film has no middle. It opens, and then it is over.
  const mid = st([film({ running: true, weeks: 3, weeksTotal: 8 })]);
  ok(reactionsFor(mid).length === 0, 'a film does not get a week between episodes');
}

// ── the tone follows the reception, and is never unanimous ────────────────────
{
  const loved = tones(st([series({ audience: 86, rating: 88, running: true, weeks: 4, weeksTotal: 9 })]));
  const hated = tones(st([series({ audience: 22, rating: 28, running: true, weeks: 4, weeksTotal: 9 })]));
  ok(loved.filter((t) => t === 'love').length >= 2, 'a loved thing is mostly loved: ' + loved.join(','));
  ok(hated.filter((t) => t === 'cruel').length >= 2, 'a hated thing is mostly not: ' + hated.join(','));
  ok(hated.some((t) => t !== 'cruel') || loved.some((t) => t !== 'love'),
    'and nothing is unanimous, which is the truest thing about putting work in front of people');
}

// ── nobody says the same sentence twice ───────────────────────────────────────
{
  for (const s of [st([series({ running: true, weeks: 4, weeksTotal: 9, audience: 82 })]),
    st([film({ running: true, weeks: 0, weeksTotal: 6, audience: 40 })]),
    st([film({ closedAt: 2070 * 12 + 2, audience: 60, meterAtClose: 84, rating: 44 })])]) {
    const said = reactionsFor(s, 9).map((r) => r.text);
    ok(new Set(said).size === said.length, 'no two people agree in identical words: ' + said.find((x, i) => said.indexOf(x) !== i));
  }
}

// ── you and the film are two conversations ────────────────────────────────────
{
  const s = st([film({ closedAt: 2070 * 12 + 2, rating: 44, audience: 41, meterAtClose: 84, verdict: 'bomb' })]);
  const all = reactionsFor(s, 9);
  ok(all.some((r) => r.about === 'you'), 'people talk about the person');
  ok(all.some((r) => r.about === 'it'), 'and about the thing');
  const you = all.filter((r) => r.about === 'you');
  ok(you.every((r) => /Mira/.test(r.text)), 'and they use your name: ' + you.map((r) => r.text).join(' | '));
  // Carried: bad film, and you were good in it every day. This is the most common sentence
  // in the business and the game could not say it before.
  ok(you.some((r) => /only good thing|deserved a better/.test(r.text)),
    'the best thing in a bad film is a thing people say: ' + you.map((r) => r.text).join(' | '));
}

// ── the same feed twice is the same feed ──────────────────────────────────────
{
  const s = st([series({ running: true, weeks: 4, weeksTotal: 9 })]);
  const a = reactionsFor(s, 6).map((r) => r.text).join('|');
  const b = reactionsFor(s, 6).map((r) => r.text).join('|');
  ok(a === b, 'nobody writes a new post because you looked at the screen again');
}

if (fails) { console.log('test_reactions: ' + fails + ' failed'); process.exit(1); }
console.log('test_reactions: all passed');
