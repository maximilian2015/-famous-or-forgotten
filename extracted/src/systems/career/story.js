// What the film is actually ABOUT, and the argument you have about it on day one.
//
// Until now a shoot was a slider: rehearse enough months and the meter went up. That is not
// a decision, it is a chore with a number attached. This is the decision — and it is not
// "choose the plot", because an actor does not choose the plot. It is the room on the first
// day, where somebody says what they think the film is, and you either have the standing to
// be listened to or you do not.
//
// The whole thing hangs off an opposition the game already has and has never used against
// the player: what SELLS and what WINS run in exactly opposite directions.
//
//   APPEAL      (release.js) — Horror 1.35 … Drama 0.70
//   ASKER_GENRE (awards.js)  — Drama 1.40 … Horror 0.55
//
// So "make it bigger" literally costs you the Asker and "make it about something" literally
// costs you the money. Neither is the right answer, because there is no right answer until
// you decide what you want out of a life.
import { rint, chance, pick } from '../../engine/rng.js';
import { hotGenre } from '../meta/news.js';
import { genreXP } from './genres.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

// ── the premise ───────────────────────────────────────────────────────────────
// One line that reads like a film rather than a genre label. Three tables, because two
// makes everything sound the same and four stops sounding like a sentence.
const WHERE = [
  'A harbour town out of season', 'A vineyard nobody can afford to keep', 'A night bus across a border',
  'A hospital on the last week before it closes', 'A radio station at four in the morning',
  'A boarding school in the fog', 'A block of flats due for demolition', 'An island with one ferry a day',
  'A recording studio nobody has paid for', 'A city under snow that will not stop',
  'A courthouse in a town of nine hundred people', 'A hotel kept open for one guest',
];
const WHAT = [
  'a body in the water', 'a letter that arrives forty years late', 'a fire nobody reported',
  'a child who will not speak', 'a debt somebody finally came to collect', 'a confession on tape',
  'a woman who came back', 'a photograph that should not exist', 'a strike going into its ninth week',
  'a wedding that has to happen on Friday', 'a disappearance everyone agreed to forget',
  'a diagnosis kept from the family',
];
const WHO = [
  'and the detective is the dead man’s brother', 'and the only witness is nine years old',
  'and the person who knows is the one being asked', 'and everybody involved used to be in love',
  'and the man in charge is lying to himself first', 'and the two of them have not spoken in twenty years',
  'and it is your character who started it', 'and the town has already decided who did it',
  'and neither of them will say the thing out loud', 'and the money ran out in the first week',
];
export function makePremise() { return `${pick(WHERE)}, ${pick(WHAT)}, ${pick(WHO)}.`; }

// ── the takes ─────────────────────────────────────────────────────────────────
// bump     : moves the finished film directly. The material weight is only 0.18, so a
//            twenty-point shift in prestige is +/-3.6 rating against a luck term of +/-16 —
//            it vanished. Re-weighting prestige globally was not an option: every threshold
//            in the game is calibrated against that scale. So the version you shot moves
//            the film directly, and moves the material separately for the awards.
// prestige : moves the material, which the Asker reads
// appeal   : multiplies the box office directly. It has to be LARGE, because the money
//            already follows the rating hard — qualityPull turns a 6.4 into 0.80 and an
//            8.4 into 1.60. At a modest multiplier the two effects cancelled exactly and
//            all four versions made the same money, which killed the whole trade. What it
//            represents is the release: four thousand screens instead of eight hundred.
// aim      : re-points the film at another genre, changing BOTH tables at once
// swing    : how much wider the result can land, in either direction
// apart    : how much likelier it is to lose itself in the edit
// push     : how hard this is to argue for. Zero means nobody has to be convinced.
export const TAKES = {
  straight: {
    id: 'straight', label: 'Play it as written',
    blurb: 'You say nothing. It is a perfectly good script and somebody else has already thought about it.',
    said: 'Nobody had to be talked into anything. You shot the film that was on the page.',
    prestige: 2, bump: 0, appeal: 1, swing: 0, apart: 0, push: 0,
  },
  bigger: {
    id: 'bigger', label: 'Make it bigger',
    blurb: 'Open it up. More of everything, fewer of the quiet bits. It will sell, and nobody will remember it.',
    said: 'They opened it up. Twice the scale, half the film, and a trailer that plays.',
    prestige: -21, bump: -8, appeal: 2.05, swing: 2, apart: -3, push: 24,
  },
  about: {
    id: 'about', label: 'Make it about something',
    blurb: 'Slow it down and let it be about the thing underneath. This is how people win awards and lose money.',
    said: 'You argued it down to the thing underneath, and they let you.',
    prestige: 19, bump: 8, appeal: 0.5, aim: 'Drama', swing: 3, apart: 2, push: 32,
  },
  strange: {
    id: 'strange', label: 'Do the strange thing',
    blurb: 'The version nobody has the nerve for. It is either the best thing any of you ever make or it is unwatchable.',
    said: 'You talked them into the strange version. Everyone on that set knew it could go either way.',
    prestige: 9, bump: 1, appeal: 0.85, swing: 15, apart: 11, push: 42,
  },
};
export const TAKE_ORDER = ['straight', 'bigger', 'about', 'strange'];

// Not every film offers every argument. A blockbuster is not going to become a chamber
// piece because you asked, and there is no money to make an indie bigger.
export function takesFor(p) {
  // A day as an extra has no room in it for an argument about what the film is.
  // Guarded separately: an offer without a stated length must not collapse to no choices
  // at all, which is what a combined check did.
  if (p.scale === 'oneoff') return ['straight'];
  if (p.months != null && p.months < 2) return ['straight'];
  const big = p.scale === 'blockbuster' || p.scale === 'feature';
  const tiny = p.scale === 'small';
  const out = ['straight'];
  if (big || (p.stability ?? 70) >= 74) out.push('bigger');
  if (!tiny) out.push('about');
  if (p.scale !== 'blockbuster') out.push('strange');
  return out;
}

// ── being listened to ─────────────────────────────────────────────────────────
// This is what respect has been FOR all along and has never once decided anything. A name
// nobody has heard of does not get to reshape a picture; somebody the money is there
// because of, does. The director matters as much as either — see the crew in production.js.
export function pushOdds(s, takeId, p) {
  const take = TAKES[takeId];
  if (!take || !take.push) return 100;
  const director = (p.crew || [])[0];
  const standing = (s.respect || 0) * 0.46 + (s.fame || 0) * 0.34;
  const ally = (((director && director.bond) || 40) - 40) * 0.55;
  // You can argue for a genre you actually know. Nobody listens to an opinion about a kind
  // of film you have never made.
  const known = take.aim ? Math.min(9, genreXP(s, take.aim) * 0.6) : Math.min(6, genreXP(s, p.genre) * 0.4);
  // A production with no money has nobody else to please. It is the one advantage of it.
  const broke = (p.stability ?? 70) < 55 ? 12 : 0;
  return Math.round(clamp(20 + standing + ally + known + broke - take.push, 3, 93));
}

// What the trend is doing, and the trap in it: you are choosing now for a film that opens
// in about two years. See release.js — post-production alone is five to twelve months.
export function trendNote(s, genre) {
  const hot = hotGenre(s);
  if (genre === hot) return `${genre} is what everyone is watching right now — and you open in about two years.`;
  return `${hot} is what everyone is watching right now. This is ${genre}.`;
}

// ── the room ──────────────────────────────────────────────────────────────────
export function openStoryRoom(s, p) {
  return {
    premise: p.premise || makePremise(),
    takes: takesFor(p).map((id) => ({ ...TAKES[id], odds: pushOdds(s, id, p) })),
    title: p.title, genre: p.genre,
    director: ((p.crew || [])[0] || {}).name || 'the director',
  };
}

// The player pushes for one. Costs the month's energy whether or not it lands, because
// the argument happened either way.
export function pushTake(s, takeId) {
  const p = s.production;
  if (!p || p.take) return s;
  const take = TAKES[takeId];
  if (!take || !takesFor(p).includes(takeId)) return s;
  const director = (p.crew || [])[0];
  if (takeId === 'straight') {
    p.take = 'straight'; p.takeWon = true;
    s.lastEvent = TAKES.straight.said;
    return s;
  }
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  s.ap -= 1;
  s.mental = clamp((s.mental || 50) - 2);
  const odds = pushOdds(s, takeId, p);
  if (chance(odds)) {
    p.take = takeId; p.takeWon = true;
    if (take.aim) p.genre = take.aim;
    s.respect = clamp((s.respect || 0) + 1);
    if (director) director.bond = clamp((director.bond || 40) + rint(2, 6));
    s.lastEvent = take.said;
    return s;
  }
  // You lost the argument. The film is what it was, and the room remembers you tried.
  p.take = 'straight'; p.takeWon = false; p.pushedFor = takeId;
  if (director) director.bond = clamp((director.bond || 40) - rint(1, 5));
  s.lastEvent = `You made the case for it. ${director ? director.name : 'The director'} heard you out and then `
    + 'shot it the way it was always going to be shot.';
  return s;
}

// ── what it does to the finished thing ────────────────────────────────────────
export function takeOf(p) { return TAKES[p && p.take] || null; }
export function prestigeShift(p) { const t = takeOf(p); return t && p.takeWon ? t.prestige : 0; }
export function ratingShift(p) { const t = takeOf(p); return t && p.takeWon ? (t.bump || 0) : 0; }
export function appealShift(p) { const t = takeOf(p); return t && p.takeWon ? (t.appeal ?? 1) : 1; }
export function swingShift(p) { const t = takeOf(p); return t && p.takeWon ? t.swing : 0; }
export function apartShift(p) { const t = takeOf(p); return t && p.takeWon ? t.apart : 0; }
