import { inCareer } from '../../engine/stage.js';
import { uid } from '../../engine/id.js';
import { rint, chance, pick } from '../../engine/rng.js';
import { computeAccess } from './access.js';
import { quoteFor, setFame, setRespect } from '../meta/status.js';
import { addTimeline } from '../../engine/timeline.js';
import { paid } from './agent.js';
import { GENRES } from '../meta/news.js';
import { startProduction } from './production.js';
import { rollStability } from './stability.js';
import { canWork } from '../life/strain.js';
import { newTitle } from '../world/titles.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
// Titles come from the same generator as everything else the world makes, so an agent's
// offer cannot be called what a rival's film was called last year. See world/titles.js.
function title(s, genre) { return newTitle(s, genre); }
export function generateOffer(s) {
  const acc = computeAccess(s); const fame = s.fame || 0;
  let tier;
  if (acc.aaa && fame >= 60 && chance(40)) tier = 'tentpole';
  else if (fame >= 35) tier = 'lead'; else tier = 'supporting';
  // An offer that reached you through an agent is priced off the same quote tables as
  // everything else, so it cannot drift out of step with what OpenCall pays.
  const medium = tier === 'tentpole' ? 'film_tentpole' : tier === 'lead' ? 'film_studio' : 'film_indie';
  const share = tier === 'supporting' ? 0.6 : 1;
  const quote = quoteFor(s, medium) || quoteFor(s, 'film_indie');
  const prestige = { tentpole: rint(70, 95), lead: rint(45, 70), supporting: rint(20, 45) }[tier];
  const salary = Math.round(quote * share * (0.85 + Math.random() * 0.45));
  const genre = pick(GENRES);
  // Who brought it. Messages says so on the card — Maxi had three copies of one offer in
  // three apps and no idea where any of them had come from.
  return { id: uid(s, 'off'), via: 'agent',
    projectTitle: (tier === 'tentpole' ? '⭐ ' : '') + title(s, genre),
    role: tier === 'supporting' ? 'Supporting' : 'Lead',
    type: s.dream === 'singer' ? (tier === 'tentpole' ? 'World Tour' : 'Album') : (tier === 'tentpole' ? 'Blockbuster' : 'Feature Film'),
    genre,
    salary, months: rint(3, 8), fame: { tentpole: 9, lead: 5, supporting: 2 }[tier], prestigeScore: prestige, tier,
    // What kind of picture it is — decides the post-production wait and the box office it can take.
    scale: { tentpole: 'blockbuster', lead: 'feature', supporting: 'indie' }[tier],
    stability: rollStability({ tentpole: 'blockbuster', lead: 'feature', supporting: 'indie' }[tier]),
    deadline: rint(2, 4) };
}
// The one in a million. Somebody you are close to is in the business, and there was a
// dinner, and somebody at it was casting. Straight to a studio picture whatever your fame
// says — and everybody on that set will know how you got the part (production.js).
export function roomOffer(s, who) {
  const tier = 'tentpole';
  const quote = quoteFor(s, 'film_tentpole') || quoteFor(s, 'film_studio') || rint(250000, 600000);
  const salary = Math.round(quote * (0.7 + Math.random() * 0.3));
  return { id: uid(s, 'off'), kind: 'room', via: 'partner', viaPartner: who.name,
    projectTitle: '⭐ ' + title(s, pick(GENRES)), role: 'Lead', type: s.dream === 'singer' ? 'World Tour' : 'Blockbuster',
    genre: pick(GENRES), salary, months: rint(6, 11), fame: 9, prestigeScore: rint(60, 90), tier,
    scale: 'blockbuster', stability: rollStability('blockbuster'), deadline: rint(2, 3),
    note: `${who.name.split(' ')[0]} got you in the room. Everybody on that set will know it — make it not matter.` };
}
export function campaignCost(o) { return Math.max(800, Math.round(o.salary * 0.15)); }
export function runCampaign(s, id) {
  const o = (s.offers || []).find((x) => x.id === id); if (!o || o.tier === 'supporting' || o.campaign) return s;
  const cost = campaignCost(o);
  if ((s.cash || 0) < cost) { s.lastEvent = `A campaign for "${o.projectTitle.replace('⭐ ', '')}" would cost €${cost.toLocaleString()} — you can't cover it right now.`; return s; }
  s.cash = (s.cash || 0) - cost;
  o.campaign = true;
  s.lastEvent = `You greenlit a marketing push for "${o.projectTitle.replace('⭐ ', '')}" — €${cost.toLocaleString()}. Should help if it lands.`;
  addTimeline(s, `Ran a campaign for ${o.projectTitle.replace('⭐ ', '')}.`);
  return s;
}
// Every offer has always carried a deadline. Messages printed it ("answer within 3 mo"),
// the calendar drew an hourglass on the month it ran out — and nothing anywhere ever
// counted it down. Offers sat on the home screen for forty years. The game was telling the
// player about a clock that did not exist.
export function offersTick(s) {
  if (!(s.offers || []).length) return;
  const kept = [];
  for (const o of s.offers) {
    if (typeof o.deadline !== 'number') { kept.push(o); continue; }
    // They cast you knowing you were on a set — a part won mid-shoot, or your own show
    // asking you back — so the clock starts when you wrap. Three parts in a row used to go
    // to somebody else while you were still shooting the one before.
    if (o.waitsForWrap && s.production) { kept.push(o); continue; }
    // A signed paper does not expire, and one that is with them is waiting on them, not you.
    if (o.signed || (o.contract && o.contract.sent)) { kept.push(o); continue; }
    o.deadline -= 1;
    if (o.deadline > 0) { kept.push(o); continue; }
    const title = String(o.projectTitle || 'it').replace('⭐ ', '');
    // A part you were offered and never answered goes to somebody else. That is the whole
    // reason a deadline is on the card.
    if (o.kind === 'thaw') addTimeline(s, `${title} finally went ahead without you.`, true);
    else addTimeline(s, `They stopped waiting on ${title} and cast someone else.`, true);
    s.inbox = (s.inbox || []).filter((m) => m.offerId !== o.id);
  }
  if (kept.length !== s.offers.length && !s.lastEvent) {
    const gone = s.offers.length - kept.length;
    s.lastEvent = gone > 1 ? `${gone} offers expired while you thought about them.`
      : `An offer expired while you thought about it. They cast somebody else.`;
  }
  s.offers = kept;
}
export function maybeGenerateOffer(s) {
  const acc = computeAccess(s);
  if (!inCareer(s)) return;
  if ((s.offers || []).length >= 2) return;
  // An agent brings you things. An agent does not bring you a picture every other month
  // for forty-five years — which is what 0.5 did, and it meant the casting board, the
  // reads and the waiting were all decoration: 54 productions started off 16 auditions,
  // the rest simply arrived. Work has to be gone out and got.
  let p = acc.agentReach ? 0.14 : (s.fame >= 20 ? 0.06 : 0.02);
  // A name people are nervous about gets fewer calls.
  p *= Math.max(0.25, 1 - (s.scandal || 0) / 90);
  if (chance(p * 100)) (s.offers = s.offers || []).push(generateOffer(s));
}
export function acceptOffer(s, id) {
  const o = (s.offers || []).find((x) => x.id === id); if (!o) return s;
  // Anything with a real schedule becomes a shoot you live through — same rule as a
  // casting. Only a day's work resolves in the same click.
  const fit = canWork(s);
  if (!fit.ok) { s.lastEvent = fit.why; return s; }
  if (o.tier !== 'supporting' || (o.months || 0) >= 2) {
    if (s.production) { s.lastEvent = `You're already committed to "${s.production.title}" — wrap that one first.`; return s; }
    s.offers = (s.offers || []).filter((x) => x.id !== id);
    s.inbox = (s.inbox || []).filter((m) => m.offerId !== id);
    startProduction(s, o);
    return s;
  }
  const skill = s.dream === 'singer' ? s.singing : s.acting;
  const rating = clamp(35 + skill * 0.4 + o.prestigeScore * 0.2 + (s.looks - 40) * 0.12 + rint(-8, 15));
  const status = rating >= 85 ? 'Hit' : rating >= 70 ? 'Well-received' : rating >= 50 ? 'Released' : 'Flop';
  const credit = { title: o.projectTitle.replace('⭐ ', ''), role: o.role, type: o.type, genre: o.genre,
    salary: o.salary, rating, status, year: s.year, minor: true };   // a day's work — Other work, not a film credit
  const bucket = s.dream === 'singer' ? 'discography' : 'filmography';
  (s[bucket] = s[bucket] || []).unshift(credit);
  paid(s, o.salary, `"${credit.title}" paid`);
  setFame(s, s.fame + o.fame + (rating >= 85 ? 4 : 0));
  s.confidence = clamp(s.confidence + 2);
  s.offers = (s.offers || []).filter((x) => x.id !== id);
  s.inbox = (s.inbox || []).filter((m) => m.offerId !== id);
  s.lastEvent = `You took "${credit.title}". It came out ${status.toLowerCase()} — rating ${Math.round(rating)}.`;
  addTimeline(s, `${credit.title}: ${status} (${Math.round(rating)}/100).`, rating < 50);
  return s;
}
export function declineOffer(s, id) {
  const o = (s.offers || []).find((x) => x.id === id);
  s.offers = (s.offers || []).filter((x) => x.id !== id);
  s.inbox = (s.inbox || []).filter((m) => m.offerId !== id);
  if (!o) return s;
  const title = o.projectTitle.replace('⭐ ', '');
  // Turning down an ordinary offer is your business. Turning down the one they finally
  // found the money to finish, after holding your part open for years, is not.
  // And walking out of an option you signed is walking out of a contract.
  if (o.kind === 'sequel' && o.optioned && (o.part || 2) <= (o.optionParts || 3)) {
    setRespect(s, (s.respect || 0) - 6);
    s.lastEvent = `You passed on "${title}". You signed an option for it years ago, and the studio's lawyers have read it more recently than you have.`;
    addTimeline(s, `Walked out of the option on ${title}. The business remembers a contract.`, true);
    return s;
  }
  if (o.kind === 'thaw') {
    setRespect(s, (s.respect || 0) - 5);
    s.lastEvent = `You said no to finishing "${title}". They waited a long time for that answer.`;
    addTimeline(s, `Refused to go back and finish ${title}. People noticed.`, true);
    return s;
  }
  s.lastEvent = `You passed on "${title}".`;
  addTimeline(s, `Passed on ${title}.`);
  return s;
}
