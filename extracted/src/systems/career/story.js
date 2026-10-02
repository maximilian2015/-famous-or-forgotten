import { COST, canAfford, spend, tooTired } from '../../engine/energy.js';
import { setRespect } from '../meta/status.js';
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
import { appetiteWord, appetiteWhy, totalDemand, totalWord } from '../meta/market.js';
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
// Maxi: the line should match the genre and the title. It did neither — every picture got the
// same three tables, so a musical and a horror film were both "a harbour town out of season, a
// body in the water". Titles are already built from the genre (world/titles.js shape()), so
// tying the premise to the genre ties it to the title as well.
//
// Per-genre first, the general tables as a fallback. Not every entry needs a genre of its own:
// a disappearance belongs to a thriller and to a drama both, and the tables above are good.
const G_WHERE = {
  Horror: ['A farmhouse eleven miles from the next one', 'A sleep clinic with one patient left',
    'A tunnel the council sealed in 1974', 'A village that empties every winter',
    'A lighthouse three days from the mainland', 'A care home with a corridor nobody uses',
    'A reservoir drained for the first time in sixty years', 'A chapel that was a plague pit',
    'A holiday park out of season', 'A tower block with one lift working',
    'A forestry road that is not on any map', 'A hotel closed for renovation since March'],
  Comedy: ['A wedding venue double-booked for the same Saturday', 'A failing garden centre',
    'A local radio phone-in nobody listens to', 'A suburban cul-de-sac at war over a hedge',
    'A village hall pantomime in its fortieth year', 'A funeral home with a new owner',
    'A caravan holiday nobody wanted to go on', 'An office that has merged with its rival',
    'A dog show with more money in it than anybody admits', 'A new-build estate with no shops',
    'A cruise ship on its last booking', 'A family restaurant two sons are fighting over'],
  Romance: ['A bookshop three weeks from closing', 'A night train with one sleeper carriage left',
    'A language school in a city neither of them knows', 'A wedding where they are both guests',
    'A hospital corridor at four in the morning', 'An island with one hotel and no season',
    'A rented flat with a month left on it', 'A market town neither of them meant to stop in',
    'A kitchen in a restaurant that is about to lose its star', 'A ferry delayed by weather',
    'An allotment at the end of a long summer', 'A flat above a shop that smells of bread'],
  Musical: ['A dance hall with a demolition notice on the door', 'A seaside pier out of season',
    'A church choir that has not been full since 1986', 'A pit band two players short',
    'A working club where the turn has not changed in years', 'A school with no music department left',
    'A bandstand nobody books any more', 'A recording studio with the power cut off',
    'A brass band in a town with no pit', 'A theatre kept open by one family',
    'A touring show on its ninth town', 'A cabaret room above a pub'],
  'Sci-Fi': ['A research station eight months from resupply', 'A city where the water is rationed by lottery',
    'An orbital hotel nobody can afford to run', 'A town built around a thing nobody is allowed to see',
    'A ship whose crew wake in shifts of two', 'A colony on its third generation and its first doubt',
    'A clinic that will print you a new one', 'An archive of people who agreed to be kept',
    'A border where the papers are biological', 'A greenhouse the size of a county',
    'A station that has stopped hearing from anybody', 'A city that moves twice a year'],
  Crime: ['A port where everything goes through two families', 'A betting shop that launders more than it takes',
    'A police station with one working cell', 'A scrapyard at the edge of the ring road',
    'A haulage firm with too many lorries for its contracts', 'A nightclub nobody has ever seen full',
    'A caravan site the law does not visit', 'A cash-and-carry that never runs out of stock',
    'A courtroom where everybody is related', 'A fishing fleet down to four boats',
    'A taxi rank that is also a market', 'A gym above a garage'],
  Thriller: ['A conference hotel with the wrong people in it', 'A ferry that cannot turn back',
    'A clinic where the files do not match the patients', 'A border crossing kept open an extra night',
    'A newsroom twelve hours from publication', 'A safe house that somebody else has keys to',
    'An airport closed by weather', 'A night shift in a building with no windows',
    'A convoy a day behind schedule', 'A hearing that was meant to be a formality',
    'A dig that has found something it was not looking for', 'A trial run nobody was meant to attend'],
  Drama: ['A farm being sold out from under three generations', 'A ward where the beds are being counted',
    'A pit village forty years after the pit', 'A family firm with one bad year left in it',
    'A terrace due for clearance', 'A school on its last inspection',
    'A fishing town with a new road to it', 'A house four people grew up in and nobody can keep'],
};
const G_WHAT = {
  Horror: ['something in the house that uses the children\u2019s voices', 'a sound under the floor that keeps time',
    'a photograph in which somebody is always closer', 'a door that is open when nobody opened it',
    'a child who came back wrong', 'a week in July that nobody in the village remembers',
    'a tape that plays something else each time', 'an animal that will not go in the room',
    'a name carved in a place nobody could reach', 'a smell that arrives before it does',
    'a hole that was not there last week', 'a guest who was invited by somebody who is dead'],
  Comedy: ['a funeral two families have booked at once', 'a lie that has to be kept going for one more day',
    'a prize nobody meant to win', 'a houseguest who will not say when they are leaving',
    'an inspection moved forward by a fortnight', 'a speech that has to be given in four hours',
    'a dog that has swallowed the ring', 'a parcel delivered to entirely the wrong life',
    'a reunion everybody lied about their job for', 'a car that must not be mentioned',
    'a letter sent in temper and not yet arrived', 'a stranger everybody has assumed is somebody else'],
  Romance: ['a letter neither of them sent', 'a marriage proposal made to the wrong person',
    'eleven years and a street neither of them crosses', 'a last night before a flight',
    'a wedding one of them is in and the other is at', 'a borrowed coat nobody returns',
    'a season of working the same shift', 'a promise made at nineteen and not cancelled',
    'a flat with one bed and two months left', 'a song that was theirs and now is not',
    'a funeral where they are seated two rows apart', 'a job offer in another country'],
  Musical: ['one night to fill a room that holds nine hundred', 'a song written for somebody who left',
    'a competition the town has not won since the war', 'a voice that goes at exactly the wrong moment',
    'a conductor who will not be argued with', 'a part given to somebody who cannot dance',
    'a hall booked for the week after the demolition', 'a record deal with one condition in it',
    'an understudy who is better', 'a band that has not spoken since the last tour',
    'a hymn nobody will sing the old way', 'a finale that needs eleven people and has seven'],
  'Sci-Fi': ['a message that takes nine years to answer', 'a copy of somebody who should not have one',
    'a machine that is right more often than the people', 'a rule that was never meant to apply to a person',
    'a child born where there is no law for it', 'a memory sold and then wanted back',
    'a vote on whether the thing is alive', 'a drift of four seconds that nobody can explain',
    'a body that was grown and a person who was not', 'a signal arriving in the wrong order',
    'a treatment that works and costs a decade', 'a door that only opens for one of them'],
  Crime: ['a shipment that was never on the manifest', 'a confession traded for somebody else\u2019s name',
    'money that has to move before Friday', 'an arrest that would end three careers',
    'a debt inherited with the business', 'a body that has to be somewhere else by morning',
    'a man released nine years early', 'a book of names that was meant to be burned',
    'a deal made with the wrong family', 'a van that comes back lighter than it went',
    'a witness who will be paid either way', 'a son who wants out and a father who cannot allow it'],
  Thriller: ['a name on a list that should not be there', 'forty minutes of missing footage',
    'a witness who changes their account every time', 'a bag left on purpose',
    'a drug trial with a second set of results', 'a plane that landed somewhere it did not take off for',
    'an account emptied in eleven minutes', 'a key that opens a door in a building that was sold',
    'a phone that answers in a different voice', 'a signature on a paper nobody admits writing',
    'an evacuation ordered an hour too early', 'a source who will only speak to one person'],
  Drama: ['a will that leaves it all to one of them', 'a diagnosis kept from the family',
    'a year of letters that stopped', 'a strike going into its ninth week',
    'a son who comes home after eleven years', 'a debt the family agreed never to discuss'],
};
const G_WHO = {
  Horror: ['and the one who sees it is the one nobody believes', 'and leaving is not the same as getting out',
    'and it has been patient about this for a very long time', 'and the house was never the thing to be afraid of',
    'and every one of them agreed to it once', 'and the youngest has stopped being frightened'],
  Comedy: ['and every single one of them is lying about something small', 'and nobody will be the first to say it is absurd',
    'and the only honest person present is eleven', 'and it would all be fine if anyone would just leave',
    'and by Thursday it is a matter of principle', 'and the vicar has opinions'],
  Romance: ['and neither of them is free to say so', 'and the timing was never going to be kind',
    'and one of them has already decided', 'and they are very good at being almost friends',
    'and everyone around them worked it out years ago', 'and it is nobody\u2019s fault, which is worse'],
  Musical: ['and the one who can actually sing it will not', 'and the whole town has decided it is already over',
    'and the money is in the room and will not stay', 'and the best voice in it belongs to somebody not in it',
    'and the only rehearsal left is the performance', 'and the man who built the place is in the front row'],
  'Sci-Fi': ['and the answer costs more than the question was worth', 'and nobody can agree what counts as a person',
    'and the law was written for a world that has gone', 'and the one who understands it is not permitted to say',
    'and the decision has to be made by people who will not live with it', 'and it has already happened once'],
  Crime: ['and the one holding it together is the one who will go down', 'and loyalty here has a price list',
    'and the police are the smallest problem in it', 'and the family will decide before the court does',
    'and everybody is waiting for somebody else to move first', 'and the one who talks will be the one who had least to gain'],
  Thriller: ['and the person asking already knows', 'and there are two days before anybody notices',
    'and the one who warned them has gone quiet', 'and the safest thing to do is also the worst',
    'and somebody has been ahead of them the whole way', 'and the deadline is not the real deadline'],
  Drama: ['and nobody in the room will say the thing out loud', 'and the one who stayed is the one who is blamed',
    'and it is too late to be fair about it', 'and they are all, in their way, right'],
};
// Leaning is lower than it was and the tables are much bigger, because the first version got
// this backwards: four places, four events and TWO endings per genre meant thirty-two sentences
// when all three leaned, and MEASURED it was worse than no genre at all — 242 distinct lines in
// 400 draws against 343 for the general tables. More flavour, less repetition, not a trade.
const lean = (g, table, all) => (g && table[g] && Math.random() < 0.88 ? pick(table[g]) : pick(all));
export function makePremise(genre) {
  return `${lean(genre, G_WHERE, WHERE)}, ${lean(genre, G_WHAT, WHAT)}, ${lean(genre, G_WHO, WHO)}.`;
}

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
    prestige: 1, bump: 0, appeal: 1, swing: 0, apart: 0, push: 0,
  },
  bigger: {
    id: 'bigger', label: 'Make it bigger',
    blurb: 'Open it up. More of everything, fewer of the quiet bits. It will sell, and nobody will remember it.',
    said: 'They opened it up. Twice the scale, half the film, and a trailer that plays.',
    prestige: -7, bump: -8, appeal: 2.05, swing: 2, apart: -3, push: 24,
  },
  about: {
    id: 'about', label: 'Make it about something',
    blurb: 'Slow it down and let it be about the thing underneath. This is how people win awards and lose money.',
    said: 'You argued it down to the thing underneath, and they let you.',
    prestige: 6, bump: 8, appeal: 0.5, aim: 'Drama', swing: 3, apart: 2, push: 32,
  },
  strange: {
    id: 'strange', label: 'Do the strange thing',
    blurb: 'The version nobody has the nerve for. It is either the best thing any of you ever make or it is unwatchable.',
    said: 'You talked them into the strange version. Everyone on that set knew it could go either way.',
    // 15 before the rating scale was compressed above 86. This take exists to be the widest
    // swing in the game, and compressing the top quietly took a chunk of that away.
    prestige: 3, bump: 1, appeal: 0.85, swing: 19, apart: 11, push: 42,
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

// What the trend is doing, and the trap in it: you are choosing now for something that
// opens later — a blockbuster two years out, a guest spot on a series in a few months.
// Mirrors POST_MONTHS in release.js, which this file cannot import without a cycle.
const POST_MID = { oneoff: 1, small: 3, indie: 6, episode: 3, recurring: 3, prestige: 5, feature: 7, blockbuster: 9 };
export function opensIn(p) {
  const months = (p.monthsLeft || p.months || 1) + (POST_MID[p.scale] || 6);
  return months <= 6 ? 'in a few months' : months <= 15 ? 'in about a year' : 'in about two years';
}
export function trendNote(s, p) {
  const hot = hotGenre(s);
  const word = appetiteWord(s, p.genre);
  const why = appetiteWhy(s, p.genre);
  const because = why ? ` — ${why}` : '';
  // The trap is the same as it ever was and is now worth stating: you are choosing today for
  // something that opens later, and the appetite moves over years. See meta/market.js.
  // And whether anybody is going to the cinema AT ALL this year, which is a separate number from
  // which genre they want - and was invisible until now, so half of that split did nothing.
  const t = totalDemand(s);
  const year = (t >= 1.09 || t <= 0.91) ? ` And ${totalWord(s)}.` : '';
  if (p.genre === hot) return `${p.genre} is what everyone wants right now${because}. You open ${opensIn(p)}.${year}`;
  return `${p.genre}: ${word}${because}. ${hot} is what everyone wants this year. You open ${opensIn(p)}.${year}`;
}

// ── the room ──────────────────────────────────────────────────────────────────
export function openStoryRoom(s, p) {
  return {
    premise: p.premise || makePremise(p.genre),
    takes: takesFor(p).map((id) => ({ ...TAKES[id], odds: pushOdds(s, id, p) })),
    title: p.title, genre: p.genre,
    director: ((p.crew || [])[0] || {}).name || 'the director',
  };
}

// The player pushes for one. Costs the month's energy whether or not it lands, because
// the argument happened either way.
export function pushTake(s, takeId) {
  // The set whose first day it is: the one nobody has argued about yet.
  const p = (s.productions && s.productions.length ? s.productions : (s.production ? [s.production] : [])).find((x) => !x.take);
  if (!p || p.take) return s;
  const take = TAKES[takeId];
  if (!take || !takesFor(p).includes(takeId)) return s;
  const director = (p.crew || [])[0];
  if (takeId === 'straight') {
    p.take = 'straight'; p.takeWon = true;
    s.lastEvent = TAKES.straight.said;
    return s;
  }
  if (!canAfford(s, COST.argue)) { s.lastEvent = tooTired(s, COST.argue); return s; }
  spend(s, COST.argue);
  s.mental = clamp((s.mental || 50) - 2);
  const odds = pushOdds(s, takeId, p);
  if (chance(odds)) {
    p.take = takeId; p.takeWon = true;
    // Keep what the script actually was. Winning the argument to shoot a comedy as a drama
    // changes what the picture IS, and release.js charges for the distance between the two —
    // without this the original genre was simply overwritten and the bill could never arrive.
    if (take.aim && take.aim !== p.genre) { p.scriptGenre = p.genre; p.genre = take.aim; }
    setRespect(s, (s.respect || 0) + 1);
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
