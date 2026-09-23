// The tentpole board. Maxi, looking at the AAA app: "is this a dead application?" — and it
// was half of one. It listed the tentpole offers you already had, which are the same cards
// Messages shows, so it was either a duplicate or an empty room; and the whole fiction of
// AAA, the thing you unlock with a hit, is that the biggest pictures are somewhere else.
//
// So it is a board of its own, and it works the way the top of the business actually works.
// Nobody auditions for a tentpole. There is a picture in development, a studio, a director,
// a star already attached, a window when it shoots and a month when they decide — and your
// agent puts your name forward, or does not. Then you wait, and mostly you hear nothing.
//
// Everything here is read against what you are: your reach, your standing, whether the
// director knows you, whether the part is on type, and whether they have heard your name
// this month. There is no button that buys a tentpole.
import { rint, chance, pick } from '../../engine/rng.js';
import { uid } from '../../engine/id.js';
import { addTimeline } from '../../engine/timeline.js';
import { inCareer } from '../../engine/stage.js';
import { COST, canAfford, spend, tooTired } from '../../engine/energy.js';
import { STUDIOS, personName, namesInUse } from '../world/names.js';
import { newTitle } from '../world/titles.js';
import { GENRES } from '../meta/news.js';
import { quoteFor, setRespect } from '../meta/status.js';
import { computeAccess } from './access.js';
import { reach } from './castings.js';
import { typeFit, typeFactor } from '../meta/typecast.js';
import { hype, hypeSource } from '../meta/hype.js';
import { rollStability } from './stability.js';
import { activeActors, ageOf } from '../world/world.js';
import { canTakeSet } from '../../engine/sets.js';
import { insurability } from '../life/strain.js';
import { holdsAGrudge } from '../meta/stories.js';

const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const BOARD = 3;
// What kind of part is open on a picture this size, and what it is worth against your quote.
const PARTS = [
  { role: 'Lead', share: 1, want: 'a name the poster can carry', hard: 1 },
  { role: 'Second lead', share: 0.62, want: 'the other half of it', hard: 0.7 },
  { role: 'The villain', share: 0.55, want: 'somebody to be afraid of', hard: 0.62 },
  { role: 'Supporting', share: 0.3, want: 'a face people trust in three scenes', hard: 0.42 },
];

export function tentpoles(s) { return s.tentpoles || (s.tentpoles = []); }
export function boardOpen(s) { return computeAccess(s).aaa; }

// A picture in development, with everything about it already decided except you.
function makeOne(s) {
  const genre = pick(GENRES);
  const part = pick(PARTS);
  const studio = pick(STUDIOS);
  const used = namesInUse(s);
  // A director you know is the single biggest thing on this board, so one in four is one.
  const known = (s.people || []).filter((p) => /Director/.test(p.role || '') && !p.cold && (p.relationship || 0) > 35 && !holdsAGrudge(s, p.name));
  const mine = known.length && chance(25) ? pick(known) : null;
  const director = mine ? mine.name : personName(chance(50) ? 'female' : 'male', used);
  // And somebody is already attached, because somebody always is.
  const others = activeActors(s).filter((a) => (a.rank || 999) <= 25 && Math.abs(ageOf(s, a) - (s.ageY || 35)) <= 20);
  const star = others.length && chance(65) ? pick(others) : null;
  const gap = rint(4, 11);
  return {
    id: uid(s, 'tp'), title: newTitle(s, genre), studio, genre, role: part.role, share: part.share, hard: part.hard, want: part.want,
    director, directorId: mine ? mine.id : null,
    withName: star ? star.name : null, withId: star ? star.id : null, withIcon: !!(star && star.icon),
    budget: rint(120, 320), months: rint(5, 8), prep: chance(45) ? 1 : 0,
    startAt: stamp(s) + gap, decideBy: stamp(s) + rint(2, Math.max(3, gap - 2)),
    since: stamp(s), sent: null, due: null,
  };
}
// Monthly. The board keeps itself stocked, forgets what has been decided, and now and then
// a part goes to somebody else while you were thinking about it.
export function tentpolesTick(s) {
  if (!inCareer(s) || !boardOpen(s)) { if ((s.tentpoles || []).length) s.tentpoles = []; return s; }
  const now = stamp(s);
  for (const p of [...tentpoles(s)]) {
    if (p.sent && p.due != null && p.due <= now) { answer(s, p); continue; }
    if (p.decideBy > now) continue;
    // Decided without you. Only worth a line if you had put your name in.
    s.tentpoles = tentpoles(s).filter((x) => x !== p);
    if (p.sent) {
      addTimeline(s, `"${p.title}" cast ${p.role.toLowerCase()} elsewhere. Your name was in the room and it was not the name.`, true);
    }
  }
  // Two are always in development somewhere — the app is never an empty room once it is
  // unlocked — and the third turns up when it turns up.
  while (tentpoles(s).length < BOARD && (tentpoles(s).length < 2 || chance(55))) tentpoles(s).push(makeOne(s));
  return s;
}
// What the odds are, and why. The player sees both — a board of percentages with no reason
// behind them is a slot machine.
export function tentpoleOdds(s, p) {
  const r = reach(s);
  // A tentpole is a hundred and twenty million of somebody else's money. The gate is high.
  let v = 6 + Math.max(0, r - 45) * 1.15;
  v *= p.hard;                                                   // the lead of one is not the third part
  v *= 0.75 + Math.min(1.25, (s.respect || 0) / 80);             // they ask who you are to work with
  v *= insurability(s);                                          // and who will insure you
  v *= typeFactor(s, { genre: p.genre, scale: 'blockbuster', type: 'Blockbuster', role: p.role });
  if (p.directorId) v *= 1.9;                                    // the one thing that really moves it
  if (hypeSource(s) === 'hit') v *= 1 + hype(s) / 110;
  if (hypeSource(s) === 'scandal') v *= 0.6;
  if ((s.poisonUntil || 0) > stamp(s)) v = 0;
  return Math.max(0, Math.min(72, Math.round(v)));
}
export function tentpoleWhy(s, p) {
  const out = [];
  if ((s.poisonUntil || 0) > stamp(s)) return ['Nobody will insure you on a picture this year.'];
  if (p.directorId) out.push(`${p.director.split(' ')[0]} knows you`);
  const tf = typeFit(s, { genre: p.genre, scale: 'blockbuster', type: 'Blockbuster', role: p.role });
  if (tf >= 0.5) out.push('on type');
  else if (tf <= -0.5) out.push('against type for you');
  if (hypeSource(s) === 'hit' && hype(s) >= 30) out.push('they have heard your name this month');
  if (hypeSource(s) === 'scandal') out.push('and the wrong kind of heard');
  if ((s.respect || 0) >= 55) out.push('a name people want on a set');
  else if ((s.respect || 0) < 20) out.push('standing is against you');
  if (insurability(s) < 0.8) out.push('the bond company has a file');
  if (p.withIcon) out.push(`${p.withName} is already in it`);
  return out;
}
export function tentpoleFee(s, p) {
  const q = quoteFor(s, 'film_tentpole') || quoteFor(s, 'film_studio') || 250000;
  return Math.round(q * p.share * (0.85 + Math.random() * 0.3));
}
// Your agent makes the call. It costs an evening, it can be done once per picture, and a
// name put forward for something it has no business being near is noticed.
export function putForward(s, id) {
  const p = tentpoles(s).find((x) => x.id === id); if (!p) return s;
  if (p.sent) { s.lastEvent = 'Your name is already in on that one. They answer when they answer.'; return s; }
  if (!canAfford(s, COST.careerAction)) { s.lastEvent = tooTired(s, COST.careerAction); return s; }
  spend(s, COST.careerAction);
  p.sent = stamp(s);
  p.odds = tentpoleOdds(s, p);
  p.due = stamp(s) + rint(1, 3);
  // Reaching miles over your head is its own small cost: the room remembers who asks.
  if (p.odds <= 3) { setRespect(s, (s.respect || 0) - 1); s.lastEvent = `Your agent put your name in on "${p.title}". They were polite about it. Everybody in that office knows what you are worth, and it is not this.`; }
  else s.lastEvent = `Your name is in on "${p.title}" — ${p.role.toLowerCase()}, ${p.studio}. They decide in a month or three, and mostly these go quiet.`;
  addTimeline(s, `Put your name forward for "${p.title}" (${p.studio}).`);
  return s;
}
function answer(s, p) {
  s.tentpoles = tentpoles(s).filter((x) => x !== p);
  if (!chance(p.odds || 0)) {
    s.lastEvent = `No on "${p.title}". No reason, no reply — your agent heard it from somebody else.`;
    addTimeline(s, `"${p.title}" went another way.`);
    return s;
  }
  const fee = tentpoleFee(s, p);
  (s.offers = s.offers || []).push({
    id: uid(s, 'off'), via: 'studio', kind: 'tentpole', from: p.studio,
    projectTitle: '⭐ ' + p.title, role: p.role, type: 'Blockbuster', genre: p.genre,
    salary: fee, months: p.months, prep: p.prep, fame: 9, prestigeScore: rint(58, 86),
    tier: p.role === 'Lead' ? 'tentpole' : 'lead', scale: 'blockbuster',
    stability: Math.max(70, rollStability('blockbuster')), deadline: rint(2, 3),
    startAt: p.startAt > stamp(s) + 1 ? p.startAt : 0, waitsForWrap: true,
    director: p.director, directorId: p.directorId || undefined,
    costarId: p.withId || undefined,
    note: `${p.studio} want you for ${p.role.toLowerCase()}. ${p.withName ? `${p.withName} is already in it. ` : ''}${p.directorId ? `${p.director.split(' ')[0]} asked for you by name. ` : ''}Cameras ${p.startAt > stamp(s) + 1 ? `in ${p.startAt - stamp(s)} months` : 'as soon as you are free'}.`,
  });
  addTimeline(s, `"${p.title}" is yours — ${p.role.toLowerCase()}, ${p.studio}.`);
  s.lastEvent = `Yes on "${p.title}". ${p.studio}, ${p.role.toLowerCase()}, €${fee.toLocaleString()}. Somebody in a room you will never see said your name and nobody argued. The paper is in Messages.`;
  return s;
}
// For the app: the board, sorted by what is worth reading first.
export function boardFor(s) {
  const now = stamp(s);
  return tentpoles(s).map((p) => ({
    ...p, odds: p.sent ? (p.odds || 0) : tentpoleOdds(s, p), why: tentpoleWhy(s, p), fee: Math.round((quoteFor(s, 'film_tentpole') || 250000) * p.share),
    decideIn: Math.max(0, p.decideBy - now), startIn: Math.max(0, p.startAt - now),
    fits: canTakeSet(s, { months: p.months, scale: 'blockbuster', tier: 'tentpole' }),
  })).sort((a, b) => (a.sent ? -1 : 0) - (b.sent ? -1 : 0) || b.odds - a.odds);
}
