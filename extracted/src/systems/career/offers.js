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
import { storyOfferFactor, noteRefusal, noteSequelLoss } from '../meta/stories.js';
import { hypeDemand, hype, hypeSource, hypeBrands } from '../meta/hype.js';
import { isStrong, activeLabels, labelInfo } from '../meta/typecast.js';
import { canTakeSet } from '../../engine/sets.js';
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
  // One offer in four comes from a director already in your phone — so a no is a no to
  // somebody, and a yes starts where you left them (production.js).
  const known = (s.people || []).filter((p) => /Director/.test(p.role || '') && !p.cold && (p.relationship || 0) > 15);
  const dir = known.length && chance(25) ? pick(known) : null;
  // Who brought it. Messages says so on the card — Maxi had three copies of one offer in
  // three apps and no idea where any of them had come from.
  return { id: uid(s, 'off'), via: 'agent', director: dir ? dir.name : undefined, directorId: dir ? dir.id : undefined,
    projectTitle: (tier === 'tentpole' ? '⭐ ' : '') + title(s, genre),
    role: tier === 'supporting' ? 'Supporting' : 'Lead',
    type: s.dream === 'singer' ? (tier === 'tentpole' ? 'World Tour' : 'Album') : (tier === 'tentpole' ? 'Blockbuster' : 'Feature Film'),
    genre,
    salary, months: tier === 'tentpole' ? rint(5, 8) : tier === 'lead' ? rint(3, 5) : rint(2, 3), fame: { tentpole: 9, lead: 5, supporting: 2 }[tier], prestigeScore: prestige, tier,
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
    genre: pick(GENRES), salary, months: rint(5, 8), fame: 9, prestigeScore: rint(60, 90), tier,
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
    if (o.waitsForWrap && !canTakeSet(s, o).ok) { kept.push(o); continue; }
    // A signed paper does not expire, and one that is with them is waiting on them, not you.
    if (o.signed || (o.contract && o.contract.sent)) { kept.push(o); continue; }
    // A brand that called for the story (stories.js) goes quiet when the story does.
    if (o.kind === 'brand' && hype(s) < 30) { addTimeline(s, 'The brand went quiet when you did. The campaign is off.'); s.inbox = (s.inbox || []).filter((m) => m.offerId !== o.id); continue; }
    o.deadline -= 1;
    if (o.deadline > 0) { kept.push(o); continue; }
    const title = String(o.projectTitle || 'it').replace('⭐ ', '');
    // A part you were offered and never answered goes to somebody else. That is the whole
    // reason a deadline is on the card.
    if (o.kind === 'thaw') addTimeline(s, `${title} finally went ahead without you.`, true);
    else addTimeline(s, `They stopped waiting on ${title} and cast someone else.`, true);
    if (o.kind === 'sequel' || o.kind === 'renewal') noteSequelLoss(s, o, o.story === 'recast' ? 'meeting' : 'expired');
    s.inbox = (s.inbox || []).filter((m) => m.offerId !== o.id);
  }
  if (kept.length !== s.offers.length && !s.lastEvent) {
    const gone = s.offers.length - kept.length;
    s.lastEvent = gone > 1 ? `${gone} offers expired while you thought about them.`
      : `An offer expired while you thought about it. They cast somebody else.`;
  }
  s.offers = kept;
}
// The brands. Maxi: "as you grow, companies look for you; once you are a star the brands
// come with the fees to match, and it should take time in the calendar too." A campaign is
// not a day in a studio at this level — it is two months of your year, a year of not being
// able to sign with anybody else, and a sentence about you that you did not write.
const HOUSES = ['Maison Cassel', 'Veldt & Sons', 'Aurum', 'Nordhavn', 'Casa Pirelli', 'Halden', 'Sable Frères', 'Iris Tokyo', 'Verano', 'Brennan Athletic'];
const GOODS = [['a fragrance', 1.35], ['a watch', 1.2], ['a car', 1.15], ['a fashion house', 1.4], ['a bank', 0.85], ['an airline', 0.9], ['a phone', 1.1], ['a soft drink', 0.8], ['a sportswear line', 1.0], ['a supermarket', 0.55]];
export function maybeBrandOffer(s) {
  if (!inCareer(s)) return;
  const fame = s.fame || 0;
  if (fame < 45) return;                                   // below a name, the brands are day work
  if ((s._brandUntil || 0) > (s.year || 0) * 12 + (s.month || 0)) return;   // you are already a face
  if ((s.offers || []).some((o) => o.kind === 'brand')) return;
  let p = 2.5 + (fame - 45) / 12;
  p *= hypeBrands(s);
  p *= 1 + (s.looks || 50) / 200;
  p *= Math.max(0.3, 1 - (s.scandal || 0) / 120);
  if (!chance(p)) return;
  const [what, mult] = pick(GOODS);
  const house = pick(HOUSES.filter((h) => !(s._brandsDone || []).includes(h))) || pick(HOUSES);
  // Their money is the ad band for your name, and a fragrance pays what a supermarket does not.
  const fee = Math.round((quoteFor(s, 'ad') || 50000) * mult * (0.85 + Math.random() * 0.4));
  const months = fee >= 2000000 ? 2 : 1;
  (s.offers = s.offers || []).push({
    id: uid(s, 'brd'), via: 'brand', kind: 'brand', from: house,
    projectTitle: house + ' — ' + what, role: 'The face', type: 'Brand Campaign', genre: 'Commercial',
    salary: fee, months, fame: 2, prestigeScore: rint(15, 35), tier: 'supporting', scale: 'oneoff',
    stability: 96, deadline: rint(2, 3), brandFor: 12,
    note: `${house} want you to be the face of ${what} for a year. ${months} month${months === 1 ? '' : 's'} of shooting, and no other brand while it runs.`,
  });
  addTimeline(s, `${house} would like you to be the face of ${what}.`);
  s.lastEvent = `${house} called your agent. They want your face on ${what} for a year — €${fee.toLocaleString()}, and nobody else's while it runs. The paper is in Messages.`;
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
  if ((s.poisonUntil || 0) > (s.year || 0) * 12 + (s.month || 0)) p *= 0.5;   // box office poison
  if ((s.overtakenUntil || 0) > (s.year || 0) * 12 + (s.month || 0)) p *= 0.7;  // somebody younger has your chair
  p *= storyOfferFactor(s);   // out of sight, or an agent who is working for you again, or not
  p *= hypeDemand(s);         // the phone rings more while they are asking about you (meta/hype.js)
  if (chance(p * 100)) (s.offers = s.offers || []).push(generateOffer(s));
}
export function acceptOffer(s, id) {
  const o = (s.offers || []).find((x) => x.id === id); if (!o) return s;
  // The face of something. A year of nobody else's, a word the business uses about you,
  // and a bill if the business had decided you were the serious one.
  if (o.kind === 'brand') {
    s._brandUntil = (s.year || 0) * 12 + (s.month || 0) + (o.brandFor || 12);
    (s._brandsDone = s._brandsDone || []).push(o.from);
    if (isStrong(s, 'serious')) { setRespect(s, (s.respect || 0) - 3); addTimeline(s, `The serious actor is selling ${String(o.projectTitle).split('— ')[1] || 'something'}. It was said in print, in those words.`, true); }
  }
  // Anything with a real schedule becomes a shoot you live through — same rule as a
  // casting. Only a day's work resolves in the same click.
  const fit = canWork(s);
  if (!fit.ok) { s.lastEvent = fit.why; return s; }
  if (o.tier !== 'supporting' || (o.months || 0) >= 2) {
    const room = canTakeSet(s, o);
    if (!room.ok) { s.lastEvent = room.why; return s; }
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
  // The business remembers a no (stories.js): the director you passed on, and the sequel
  // or the season that goes ahead without you.
  // Leaving by the exit clause (contract.js): after the season it names, with notice, and
  // nobody's lawyer and nobody's fans have a word to say.
  const byExit = o.kind === 'renewal' && (o.exitAfter || 0) > 0 && (o.season || 0) > o.exitAfter;
  if (byExit) {
    s.lastEvent = `You left "${o.seriesTitle || title}" after season ${(o.season || 1) - 1}, the way the paper said you could. The network wrote a graceful exit and the fans got a last episode.`;
    addTimeline(s, `Left ${o.seriesTitle || title} by the exit clause. A last episode, and no hard feelings.`);
    return s;
  }
  if (o.kind === 'sequel' || o.kind === 'renewal') noteSequelLoss(s, o, o.story === 'recast' ? 'meeting' : 'passed');
  else if (o.tier !== 'supporting' && o.via !== 'casting') noteRefusal(s, o);
  // Walking out of a season the network holds an option on is walking out of a contract.
  if (o.kind === 'renewal' && o.optioned) {
    setRespect(s, (s.respect || 0) - 6);
    s.lastEvent = `You passed on season ${o.season} of "${o.seriesTitle || title}". The network holds an option on it, and their lawyers have read it more recently than you have.`;
    addTimeline(s, `Walked out of the option on ${o.seriesTitle || title}. The business remembers a contract.`, true);
    return s;
  }
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
