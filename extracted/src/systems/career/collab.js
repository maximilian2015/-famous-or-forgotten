// Making something together. Maxi: "at the Askers you should be able to talk to stars and
// propose collaborations" — and then, plainly: "what about collaborations?"
//
// The game had two neighbouring things and not this one. You could PITCH a project to
// somebody powerful you met at a party (night.js), which is asking a stranger for money,
// and you could be OFFERED a two-hander by a producer (stories.js, the rival). Neither is
// the thing that actually makes star projects: two people who know each other deciding to
// do one, and then spending a year finding out whether anybody will pay for it.
//
// So: you propose, to somebody already in your phone. They say yes or they do not, for
// reasons you can read off the card. A yes is not a film — it is a project in development,
// and development is where most of them die. What comes out the other end has both names
// on it, which is worth more than either of you alone.
import { rint, chance, pick } from '../../engine/rng.js';
import { uid } from '../../engine/id.js';
import { addTimeline } from '../../engine/timeline.js';
import { inCareer } from '../../engine/stage.js';
import { quoteFor, setRespect } from '../meta/status.js';
import { newTitle } from '../world/titles.js';
import { GENRES } from '../meta/news.js';
import { rollStability } from './stability.js';
import { hype, hypeSource } from '../meta/hype.js';
import { holdsAGrudge } from '../meta/stories.js';
import { rollPotential } from './franchise.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const first = (n) => String(n || '').split(' ')[0];

// What each kind of person can make with you, and what it is worth.
export const KINDS = {
  'Film Director': { id: 'direct', what: (p) => `${first(p.name)} directs, you carry it`,
    blurb: 'Their picture, your name above the title. The best version of this is the one people remember you for.',
    scale: 'feature', prestige: [62, 88], role: 'Lead', money: 0.9 },
  'A-list Star': { id: 'two', what: (p) => `the two of you, one poster`,
    blurb: 'A two-hander. It opens on both names and the reviews compare you, which is the risk and the point.',
    scale: 'feature', prestige: [55, 80], role: 'Lead', money: 1.05, costar: true },
  'Studio Producer': { id: 'produce', what: (p) => `${first(p.name)} finds the money, you find the film`,
    blurb: 'You bring the thing you want to make and they make it possible. Less money up front; it is yours.',
    scale: 'indie', prestige: [58, 86], role: 'Lead', money: 0.55, points: 6 },
  'Fellow Actor': { id: 'small', what: (p) => `something small, the two of you`,
    blurb: 'No studio, no money, and nobody to tell you what it should be. Those are the ones that go to festivals.',
    scale: 'festival', prestige: [55, 84], role: 'Lead', money: 0.3, costar: true },
  'Music Producer': { id: 'score', what: (p) => `a film built around their score`,
    blurb: 'An odd one, and odd ones travel. The music is the reason anybody watches it.',
    scale: 'indie', prestige: [56, 82], role: 'Lead', money: 0.6 },
};
// Parties hand out their own words for the same people — a night out gives you a "Star" or
// an "Icon", casting gives you a "Fellow Actor". They all make films.
const ALIAS = { Star: 'A-list Star', Icon: 'A-list Star', Actor: 'Fellow Actor', Director: 'Film Director', Producer: 'Studio Producer' };
export function kindFor(p) { if (!p) return null; return KINDS[p.role] || KINDS[ALIAS[p.role]] || null; }
export function canPropose(s, p) {
  if (!inCareer(s) || !p) return { ok: false, why: 'Not now.' };
  if (!kindFor(p)) return { ok: false, why: `${first(p.name)} does not make films. They know people who do — ask them to put in a word instead.` };
  if (p.cold || holdsAGrudge(s, p.name)) return { ok: false, why: `${first(p.name)} is not taking your calls.` };
  if ((s.collabs || []).some((c) => c.who === p.id)) return { ok: false, why: `You and ${first(p.name)} already have something in development.` };
  // Two of these at once is a career. Three is a producer, which you are not.
  if ((s.collabs || []).length >= 2) return { ok: false, why: 'You already have two things in development. Get one of them made first.' };
  // Asked and answered comes before anything else, because it is the reason that will be
  // true this month whatever else happened to the relationship when you asked.
  if ((s._collabAsked || {})[p.id] > stamp(s) - 12) return { ok: false, why: `You asked ${first(p.name)} this year. Let it sit.` };
  if ((p.relationship || 0) < 50) return { ok: false, why: `You do not know ${first(p.name)} well enough to ask. Fifty, and you are at ${Math.round(p.relationship || 0)}.` };
  return { ok: true, why: '' };
}
// Whether they say yes, and the reasons — shown on the card, because an odds number with
// nothing behind it is a slot machine.
export function odds(s, p) {
  const k = kindFor(p); if (!k) return 0;
  // Liking you is most of it and nowhere near enough. Everybody in this business has a
  // year already spoken for; the question is whether you are worth clearing it for.
  let v = -14 + (p.relationship || 0) * 0.45;
  v += ((s.respect || 0) - 25) * 0.35;                     // they are choosing who to be seen with
  v += Math.max(-14, ((s.fame || 0) - (p.industryWeight || 60)) * 0.22);
  if (hypeSource(s) === 'hit') v += hype(s) / 6;
  if (hypeSource(s) === 'scandal') v -= 12;
  if ((s.poisonUntil || 0) > stamp(s)) v -= 25;
  if ((p.fromSet || p.worked)) v += 10;                    // you have done a picture together
  return Math.max(2, Math.min(70, Math.round(v)));
}
export function why(s, p) {
  const out = [];
  if ((p.fromSet || p.worked)) out.push('you have worked together');
  if ((p.relationship || 0) >= 75) out.push('they like you');
  if ((s.respect || 0) >= 55) out.push('a name people want to be seen with');
  else if ((s.respect || 0) < 20) out.push('standing is against you');
  if (hypeSource(s) === 'hit' && hype(s) >= 30) out.push('and you are the name this month');
  if (hypeSource(s) === 'scandal') out.push('but you are a story right now');
  if ((s.fame || 0) + 12 < (p.industryWeight || 60)) out.push('they are further up than you');
  if ((s.poisonUntil || 0) > stamp(s)) out.push('nobody will insure you this year');
  return out;
}
// Ask. Costs goodwill whether or not it works, because asking is asking.
export function propose(s, personId) {
  const p = (s.people || []).find((x) => x.id === personId);
  const fit = canPropose(s, p);
  if (!fit.ok) { s.lastEvent = fit.why; return s; }
  const k = kindFor(p);
  (s._collabAsked = s._collabAsked || {})[p.id] = stamp(s);
  p.relationship = clamp((p.relationship || 0) - rint(2, 5));
  if (!chance(odds(s, p))) {
    s.lastEvent = `${first(p.name)} listened properly, which is worse than not. They have three things and a year that is already spoken for. Maybe when something changes.`;
    addTimeline(s, `${p.name} passed on making something with you.`);
    return s;
  }
  const genre = pick(GENRES);
  const title = newTitle(s, genre);
  (s.collabs = s.collabs || []).push({
    id: uid(s, 'col'), who: p.id, worldId: p.worldId || null, name: p.name, role: p.role, kind: k.id, what: k.what(p),
    title, genre, scale: k.scale, since: stamp(s),
    // A year to three finding the money, and most of it is waiting.
    due: stamp(s) + rint(8, 26),
  });
  p.relationship = clamp((p.relationship || 0) + 8);
  addTimeline(s, `You and ${p.name} are making something. "${title}" — ${k.what(p)}. Now somebody has to pay for it.`);
  s.lastEvent = `${first(p.name)} said yes. "${title}" exists as an idea, a genre and two names, which is further than most things get. It is in development — that is the part nobody tells you about.`;
  return s;
}
// Monthly. Development: it comes together, or it quietly does not.
export function collabTick(s) {
  if (!inCareer(s)) return s;
  const now = stamp(s);
  for (const c of [...(s.collabs || [])]) {
    if (c.due > now) continue;
    s.collabs = (s.collabs || []).filter((x) => x !== c);
    const p = (s.people || []).find((x) => x.id === c.who);
    const k = kindFor(c) || KINDS['Film Director'];
    // Most of them die, and the ones that do not are the ones somebody wanted on a poster
    // by the time the drafts were done.
    let made = 12 + (s.respect || 0) * 0.35 + ((s.fame || 0) - 40) * 0.25;
    if (hypeSource(s) === 'hit') made += hype(s) / 8;
    if (!p || p.cold) made -= 30;
    if (!chance(clamp(made, 5, 68))) {
      addTimeline(s, `"${c.title}" never found the money. ${p ? first(p.name) : 'They'} moved on to something that had it.`, true);
      s.lastEvent = `"${c.title}" is dead. No row, no falling out — two years of drafts and a financier who stopped answering. ${p ? first(p.name) : 'They'} is doing somebody else's film in the spring.`;
      return s;
    }
    const medium = k.scale === 'feature' ? 'film_studio' : 'film_indie';
    const fee = Math.round((quoteFor(s, medium) || 120000) * k.money * (0.85 + Math.random() * 0.3));
    (s.offers = s.offers || []).push({
      id: uid(s, 'off'), via: 'director', kind: 'collab', from: c.name,
      projectTitle: c.title, role: k.role, type: k.scale === 'festival' ? 'Festival Film' : k.scale === 'indie' ? 'Indie Film' : 'Feature Film',
      genre: c.genre, salary: fee, months: rint(3, 6), fame: k.scale === 'feature' ? 5 : 2,
      prestigeScore: rint(k.prestige[0], k.prestige[1]), tier: 'lead', scale: k.scale,
      stability: Math.max(62, rollStability(k.scale)), deadline: rint(3, 4),
      potential: rollPotential(k.scale, c.genre),
      backend: k.points || 0, points: !!k.points,
      director: k.id === 'direct' ? c.name : undefined,
      directorId: k.id === 'direct' ? c.who : undefined,
      // A co-star only lands on the call sheet if they are somebody the world knows about.
      costarId: k.costar && c.worldId ? c.worldId : undefined,
      note: `The one you and ${first(c.name)} decided to make. ${k.blurb}${k.points ? ' Sixty per cent of the fee and points, because that is what it can afford.' : ''}`,
    });
    setRespect(s, (s.respect || 0) + 2);
    addTimeline(s, `"${c.title}" is happening. You and ${c.name} got it made.`);
    s.lastEvent = `"${c.title}" is financed. The thing you and ${first(c.name)} talked about is a call sheet now. The paper is in Messages.`;
    return s;
  }
  return s;
}
// For the People card and the main screen.
export function liveCollabs(s) {
  const now = stamp(s);
  return (s.collabs || []).map((c) => ({ ...c, monthsOut: Math.max(0, c.due - now) }));
}
