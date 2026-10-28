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
import { off, signLater } from '../life/burnout.js';
import { newTitle } from '../world/titles.js';
import { refusedOnType, refusalLoosens, labelInfo } from '../meta/typecast.js';
import { storyOfferFactor, noteRefusal, holdsAGrudge, storyOf, fanMood, BURN_STANDING } from '../meta/stories.js';
import { loseContinuation, sourceCredit } from './continuation.js';
import { recordPassed } from '../meta/passed.js';
import { ensureBudget } from './budget.js';
import { ambitionLean } from '../meta/ambition.js';
import { hypeDemand, hype, hypeBrands } from '../meta/hype.js';
import { socialBrandLift } from '../social/posting.js';
import { signEndorsement, clauseTaken } from './endorsement.js';
import { laterOutcome } from './decline.js';
import { isStrong } from '../meta/typecast.js';
import { canTakeSet } from '../../engine/sets.js';
import { adoptProject } from './project.js';
import { streamingOfferFor, reach } from './castings.js';
import { STREAMING } from './streaming.js';
import { hasAgent } from './agent.js';
import { sendMail } from '../meta/email.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
// Titles come from the same generator as everything else the world makes, so an agent's
// offer cannot be called what a rival's film was called last year. See world/titles.js.
function title(s, genre) { return newTitle(s, genre); }
// Who can be behind an agent's offer (generateOffer, below). Exported so the Directors screen
// reads this rule rather than a copy of it — meta/yourDirectors.js.
// A grudge blocks it whatever the closeness. Cold and a grudge are different things: cold is a
// contact that faded, and a chat or a present can lift it; a grudge is a professional conflict,
// and being friendly again does not make somebody send you a part. This was the one door that
// checked only cold — so a refusal's cold, lifted by bonds.js a month later, reopened it.
export function sendsOffers(s, p) { return /Director/.test(p.role || '') && !p.cold && (p.relationship || 0) > 15 && !holdsAGrudge(s, p.name); }
export function generateOffer(s) {
  const acc = computeAccess(s); const fame = s.fame || 0;
  let tier;
  if (acc.aaa && fame >= 60 && chance(40)) tier = 'tentpole';
  else if (fame >= 35) tier = 'lead'; else tier = 'supporting';
  // The size of the PROJECT is the project's, not the size of your part (Budget V2). It used to
  // be read straight off the part — a lead was always a studio feature and a supporting part was
  // always an indie — so a lead in a small film and a supporting part in a big one could not
  // come through an agent at all. `tier` stays what it is: how big your part is.
  const scale = scaleForOffer(tier, fame);
  // An offer that reached you through an agent is priced off the same quote tables as
  // everything else, so it cannot drift out of step with what OpenCall pays. Priced by the
  // project's size and then by the part: a supporting part in a tentpole is studio money.
  const medium = scale === 'blockbuster' ? (tier === 'supporting' ? 'film_studio' : 'film_tentpole') : scale === 'feature' ? 'film_studio' : 'film_indie';
  const share = tier === 'supporting' ? (scale === 'blockbuster' ? 0.8 : 0.6) : 1;
  const quote = quoteFor(s, medium) || quoteFor(s, 'film_indie');
  const prestige = { tentpole: rint(70, 95), lead: rint(45, 70), supporting: rint(20, 45) }[tier];
  const salary = Math.round(quote * share * (0.85 + Math.random() * 0.45));
  const genre = pick(GENRES);
  // One offer in four comes from a director already in your phone — so a no is a no to
  // somebody, and a yes starts where you left them (production.js).
  const known = (s.people || []).filter((p) => sendsOffers(s, p));
  const dir = known.length && chance(25) ? pick(known) : null;
  // Who brought it. Messages says so on the card — Maxi had three copies of one offer in
  // three apps and no idea where any of them had come from.
  return ensureBudget({ id: uid(s, 'off'), via: 'agent', director: dir ? dir.name : undefined, directorId: dir ? dir.id : undefined,
    projectTitle: (tier === 'tentpole' ? '⭐ ' : '') + title(s, genre),
    role: tier === 'supporting' ? 'Supporting' : 'Lead',
    type: s.dream === 'singer' ? (tier === 'tentpole' ? 'World Tour' : 'Album') : ({ blockbuster: 'Blockbuster', feature: 'Feature Film', indie: 'Indie Film' }[scale]),
    genre,
    // How long the shoot is follows the picture, and a smaller part in it is fewer days.
    salary, months: monthsForOffer(scale, tier), fame: { tentpole: 9, lead: 5, supporting: 2 }[tier], prestigeScore: prestige, tier,
    // What kind of picture it is — decides the post-production wait and the box office it can take.
    scale,
    stability: rollStability(scale),
    deadline: rint(2, 4) });   // what the picture costs, given with it (career/budget.js)
}
// Which size of picture an agent's offer is for. A tentpole part is a tentpole; a lead is mostly
// a studio feature and sometimes a small film; a supporting part is mostly small, often a studio
// picture, and now and then a minor part in something enormous.
export function scaleForOffer(tier, fame = 0) {
  if (tier === 'tentpole') return 'blockbuster';
  if (tier === 'lead') return chance(68) ? 'feature' : 'indie';
  const r = Math.random() * 100;
  return r < (fame >= 15 ? 10 : 4) ? 'blockbuster' : r < 45 ? 'feature' : 'indie';
}
function monthsForOffer(scale, tier) {
  const big = tier !== 'supporting';
  if (scale === 'blockbuster') return big ? rint(5, 8) : rint(3, 5);
  if (scale === 'feature') return big ? rint(3, 5) : rint(2, 3);
  return big ? rint(2, 4) : rint(1, 3);
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
// campaignCost and runCampaign lived here and bought an awards campaign on an OFFER - before
// the picture existed, out of your own pocket, at fifteen per cent of a fee not yet paid, with
// no refund if you then passed. career/awards.js replaced the whole idea: a campaign is run in
// the season, on a film that has opened, and what a studio-backed one costs you is months.
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
    // Nor does a part with a date in the diary. Everybody who can say yes has cleared an
    // afternoon for it; nobody lets it lapse in the fortnight before. career/standoff.js
    if (s.standoff && s.standoff.offerId === o.id) { kept.push(o); continue; }
    // A brand that called for the story (stories.js) goes quiet when the story does.
    // The morality clause, which every one of these contracts has and none of them mentions
    // out loud. A brand leaves the morning your name is in the wrong kind of headline.
    if (o.kind === 'brand' && (s.scandal || 0) >= 32) {
      addTimeline(s, `${o.from || 'The brand'} stopped answering. Nobody will put in writing why.`, true);
      s.inbox = (s.inbox || []).filter((m) => m.offerId !== o.id); continue;
    }
    // And they called because you were visible. Go invisible before you answer and they
    // have already found somebody else.
    if (o.kind === 'brand' && hype(s) < 30) { addTimeline(s, 'The brand went quiet when you did. The campaign is off.'); s.inbox = (s.inbox || []).filter((m) => m.offerId !== o.id); continue; }
    o.deadline -= 1;
    if (o.deadline > 0) { kept.push(o); continue; }
    const title = String(o.projectTitle || 'it').replace('⭐ ', '');
    // A part you were offered and never answered goes to somebody else. That is the whole
    // reason a deadline is on the card.
    if (o.kind === 'thaw') addTimeline(s, `${title} finally went ahead without you.`, true);
    else addTimeline(s, `They stopped waiting on ${title} and cast someone else.`, true);
    if (s.onBreak) (s.onBreak.lapsed = s.onBreak.lapsed || []).push(title);   // the break's summary says what it cost (life/burnout.js)
    // Your own season or sequel: written down on its credit whatever else is going on (continuation.js).
    // A paper that had been argued over did not lapse — the deal was never closed.
    const lapsed = o.story === 'recast' ? 'meeting' : o.contract && (o.contract.round || 0) > 0 ? 'talks' : 'expired';
    if (o.kind === 'sequel' || o.kind === 'renewal') loseContinuation(s, o, lapsed);
    else recordPassed(s, o, lapsed);
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
// Maxi: "the brand campaigns should work differently, and the fees should be different,
// like in life." The money was already roughly a film fee, which is about right for a big
// endorsement. What was missing is the half that actually matters: WHAT you are selling.
// Every one of these paid on the same scale and cost the same nothing, so a fashion house
// and a supermarket were the same decision with different words on them. They are not. A
// fragrance or a couture house is a compliment and pays like one; a bank, a soft drink or
// a supermarket pays less AND is a sentence people repeat about you.
//
// Third column: what it does to how seriously you are taken.
const GOODS = [['a fragrance', 1.35, 1], ['a watch', 1.2, 0], ['a car', 1.15, 0], ['a fashion house', 1.4, 1],
  ['a bank', 0.85, -2], ['an airline', 0.9, -1], ['a phone', 1.1, 0], ['a soft drink', 0.8, -1],
  ['a sportswear line', 1.0, 0], ['a supermarket', 0.55, -3]];

// The deal nobody at home will ever see. A campaign that runs in one country only pays a
// great deal more and costs nothing at all, because the people whose opinion you are
// worried about are not in that country. Half the serious actors of the last forty years
// have taken one and there is a film about it.
const ELSEWHERE = ['Japan', 'Korea', 'China', 'Brazil', 'the Gulf'];
const ONLY_THERE = 22;
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
  p *= ambitionLean(s, 'brand');                           // the serious actor is not sent as many
  if (!chance(p)) return;
  const [what, mult, standing] = pick(GOODS);
  // One country only, once in five, and it changes both halves of the deal.
  const abroad = chance(ONLY_THERE) ? pick(ELSEWHERE) : null;
  const house = pick(HOUSES.filter((h) => !(s._brandsDone || []).includes(h))) || pick(HOUSES);
  // Their money is the ad band for your name, and a fragrance pays what a supermarket does not.
  // A brand campaign is priced on the audience you bring to it, and most of that audience
  // is now a number on a profile. This is not a game mechanic; it is how the paper reads.
  const fee = Math.round((quoteFor(s, 'ad') || 50000) * mult * (0.85 + Math.random() * 0.4) * socialBrandLift(s)
    * (abroad ? 1.6 + Math.random() * 0.8 : 1));
  // A campaign is a few days in a studio, not a season. What it really costs you is the year
  // of nobody else's, and what it says about you.
  const months = 1;
  (s.offers = s.offers || []).push({
    id: uid(s, 'brd'), via: 'brand', kind: 'brand', from: house,
    projectTitle: house + ' — ' + what, role: 'The face', type: 'Brand Campaign', genre: 'Commercial',
    salary: fee, months, fame: 2, prestigeScore: rint(15, 35), tier: 'supporting', scale: 'oneoff',
    stability: 96, deadline: rint(2, 3), brandFor: 12, standing, abroad,
    note: abroad
      ? `${house} want you for ${what}, and only in ${abroad}. It will not run anywhere else and nobody you know will see it. A few days of shooting, no other brand for a year, and considerably more money than the same job at home.`
      : `${house} want you to be the face of ${what} for a year. A few days of shooting, and no other brand while it runs.`,
  });
  addTimeline(s, `${house} would like you to be the face of ${what}${abroad ? `, in ${abroad}` : ''}.`);
  s.lastEvent = abroad
    ? `${house} called your agent. They want your face on ${what} — in ${abroad}, and only there. €${fee.toLocaleString()}, a few days of it, and not one person whose opinion you care about will ever see it. The paper is in Messages.`
    : `${house} called your agent. They want your face on ${what} for a year — €${fee.toLocaleString()}, and nobody else's while it runs. The paper is in Messages.`;
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
  // An agent with a client from Known Face up sends a platform's series about one call in six
  // (Streaming V1, plan §8; one in four put 38% of an unsteered career on platforms). Asked only while
  // streaming is on, so a seeded life without it is the same.
  if (chance(p * 100)) (s.offers = s.offers || []).push((STREAMING.pool && hasAgent(s) && reach(s) >= 35 && chance(STREAM_AGENT_SHARE) && streamingOfferFor(s, 'agent')) || generateOffer(s));
}
// A star and an A-lister are rung by the platform itself (plan §8): a season lead on the premium
// service from 55, an event series built around you on the giant from 75. One platform's paper at a
// time; the phone rings more while they are talking about you.
export const STREAM_AGENT_SHARE = 16, PLATFORM_CALL = { star: 0.022, alist: 0.035 };
export function maybePlatformOffer(s) {
  if (!STREAMING.pool || !inCareer(s) || reach(s) < 55) return;
  if ((s.offers || []).length >= 3 || (s.offers || []).some((o) => o.platformId && !o.parentProjectId)) return;
  const p = (reach(s) >= 75 ? PLATFORM_CALL.alist : PLATFORM_CALL.star) * storyOfferFactor(s) * hypeDemand(s);
  if (!chance(p * 100)) return;
  const o = streamingOfferFor(s, 'direct');
  if (!o) return;
  (s.offers = s.offers || []).push(o);
  addTimeline(s, `${o.from} want you for "${o.projectTitle}".`);
  s.lastEvent = `${o.from} rang — not your agent, them. "${o.projectTitle}", ${o.role.toLowerCase()}, €${(o.salary || 0).toLocaleString()} for ${o.episodes} episodes. The paper is in Messages.`;
  sendMail(s, { from: o.from, subj: `${o.projectTitle} — an offer`, tag: 'reply', kind: 'reply', offerId: o.id,
    body: `We would like you for ${o.role.toLowerCase()} on "${o.projectTitle}" — €${(o.salary || 0).toLocaleString()} for ${o.episodes} episodes, every one of them out on the same day. No read; we have seen enough of your work. The full card is in Messages.`,
    cta: [{ label: 'Open the contract', offer: 'open', reply: 'The paper.' }, { label: 'Pass', offer: 'pass', reply: 'You write back politely. They will ask somebody on the list below you.' }] });
}
export function acceptOffer(s, id) {
  const o = (s.offers || []).find((x) => x.id === id); if (!o) return s;
  // The face of something. A year of nobody else's, a word the business uses about you,
  // and a bill if the business had decided you were the serious one.
  if (o.kind === 'brand') {
    // The money was the easy half. career/endorsement.js
    signEndorsement(s, o);
    s._brandUntil = (s.year || 0) * 12 + (s.month || 0) + (o.brandFor || 12);
    (s._brandsDone = s._brandsDone || []).push(o.from);
    const thing = String(o.projectTitle).split('— ')[1] || 'something';
    // A campaign that runs in one country only costs nothing here, which is the whole
    // reason anybody takes one.
    if (o.abroad) {
      addTimeline(s, `Shot a campaign for ${o.from}. It runs in ${o.abroad} and nowhere else.`);
    } else {
      // Being the serious one costs three points for any of it — that has always been the
      // rule and it is the right one; a serious actor in an advertisement is a sentence
      // people repeat whatever the product is. What you sell decides how much MORE, and how
      // far you had to fall to sell it. The one exception is the couture house and the
      // fragrance, which are only ever offered to people they suit and cost nothing.
      const worth = o.standing || 0;
      const serious = isStrong(s, 'serious');
      const base = serious ? (worth > 0 ? 0 : -3) : 0;
      const extra = worth < 0 ? Math.round(worth * (serious ? 1.4 : 1) * (1 + (s.respect || 0) / 160)) : worth;
      const drop = Math.max(-12, base + extra);
      if (drop) setRespect(s, (s.respect || 0) + drop);
      if (drop < 0) addTimeline(s, `${serious ? 'The serious actor is selling' : 'You are selling'} ${thing}. It was said in print, in those words.`, true);
      else if (drop > 0) addTimeline(s, `The face of ${thing}. It is the kind of thing that is only offered to people it suits.`);
    }
  }
  // A part the brand's paper says you cannot be seen in. It does not stop you — the screen
  // told you the price before you pressed it. career/endorsement.js
  if (o.kind !== 'brand') clauseTaken(s, o);
  // The market that only exists on the way down does not go through a shoot and a release —
  // a convention is two days and a format is eleven weeks of somebody else's edit. What it
  // does to you is decided here, and none of them pays in the same coin. career/decline.js
  if (o.kind === 'later' && o.later) { laterOutcome(s, o.later); }
  // Anything with a real schedule becomes a shoot you live through — same rule as a
  // casting. Only a day's work resolves in the same click.
  const fit = canWork(s);
  const shoot = o.tier !== 'supporting' || (o.months || 0) >= 2;
  // Signed off, or on a break: a shoot can still be signed, to start the month you are back
  // (life/burnout.js). The agent asks; they may not wait. A paper already signed to a later
  // date just keeps waiting (contract.js startSigned).
  if (!fit.ok && shoot && off(s) && !o.signed) { const r = signLater(s, o); s.lastEvent = r.say; if (!r.ok) { s.offers = (s.offers || []).filter((x) => x.id !== id); recordPassed(s, o, 'health'); } return s; }
  if (!fit.ok) { s.lastEvent = fit.why; return s; }
  if (shoot) {
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
    salary: o.salary, rating, status, year: s.year, minor: true,   // a day's work — Other work, not a film credit
    projectId: adoptProject(s, o, id).id };   // the second road a project is born on (career/project.js)
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
// ── saying no ─────────────────────────────────────────────────────────────────
// What passing on an offer will do, worked out BEFORE it is done (Maxi/ChatGPT, 23 Oct). The same Pass
// was a harmless no on one card and a broken contract worth six points of standing on the next, and
// neither button said which. This is the one place the rules live: the offer card and the contract
// room read it to warn you, and declineOffer reads it to act — so the warning cannot drift from the rule.
//   path       ordinary · exit (the paper's exit clause) · option (an option still running) · thaw (a
//              set they held open for you) · meeting (no again, after the director's meeting) ·
//              continuation (your own next season or part)
//   standing   the exact loss, when there is one
//   certain    what will happen, every time: { text, tone: 'bad' | 'good' | 'plain' }
//   maybe      what can happen, and is not promised — the fans, a letter — because other things decide it
//   confirm    whether Pass should ask first: anything that costs standing, breaks a paper, ends your own
//              part, or makes a director remember. An ordinary no stays one click.
// An option is running when the paper still binds you to this season or this part: a renewal's offer
// knows (franchise.js underOption, from the real term); a sequel's option covers the parts it named.
export const OPTION_STANDING = 6, THAW_STANDING = 5;
export function optionRunning(o) {
  if (!o || !o.optioned) return false;
  if (o.kind === 'renewal') return true;
  if (o.kind === 'sequel') return (o.part || 2) <= (o.optionParts || 3);
  return false;
}
export function exitApplies(o) {
  return !!o && o.kind === 'renewal' && (o.exitAfter || 0) > 0 && (o.season || 0) > o.exitAfter;
}
export function declineConsequences(s, o) {
  if (!o) return null;
  const title = String(o.projectTitle || '').replace('⭐ ', '');
  const show = o.seriesTitle || title;
  const continuation = o.kind === 'sequel' || o.kind === 'renewal';
  const lead = o.tier !== 'supporting';
  const out = { path: 'ordinary', standing: 0, breach: false, certain: [], maybe: [], confirm: false,
    heading: 'Pass on this?', body: 'They will cast somebody else.', leave: 'Pass' };
  const st = storyOf(s, 'recast');
  if (exitApplies(o)) {
    Object.assign(out, { path: 'exit', confirm: true, heading: `Leave "${show}"?`, leave: 'Leave by the exit clause',
      body: `Your paper has an exit after season ${o.exitAfter}. You are using it.` });
    out.certain.push({ text: 'No penalty: you leave the way the paper said you could', tone: 'good' });
    out.certain.push({ text: 'The network writes your character a last episode', tone: 'plain' });
    return out;
  }
  // The second no after the director's meeting, and an option still running, are two separate costs
  // and both apply when both are true (stories.js burns the bridge; declineOffer breaks the paper).
  out.meeting = o.story === 'recast' && !!st;
  out.option = continuation && optionRunning(o);
  if (out.meeting) {
    Object.assign(out, { path: 'meeting', standing: -BURN_STANDING, confirm: true, heading: 'Say no again?', leave: 'Say no again',
      body: `This is the paper ${st.data.director || 'the director'} moved for you after the meeting. A second no is the end of it.` });
    out.certain.push({ text: `Standing −${BURN_STANDING}`, tone: 'bad' });
    out.certain.push({ text: `${st.data.director || 'The director'} never works with you again`, tone: 'bad' });
  }
  if (out.option) {
    Object.assign(out, { path: out.meeting ? 'meeting' : 'option', standing: out.standing - OPTION_STANDING, breach: true, confirm: true,
      heading: out.meeting ? out.heading : 'Break the contract?', leave: out.meeting ? out.leave : 'Break the contract and leave',
      body: (out.meeting ? out.body + ' ' : '') + (o.kind === 'renewal' ? `The network holds an option on season ${o.season} of "${show}". Refusing it is breaking your contract.`
        : `You signed an option for "${title}". Refusing it is breaking your contract.`) });
    out.certain.push({ text: `Standing −${OPTION_STANDING} · contract breach`, tone: 'bad' });
  }
  if (out.meeting || out.option) { /* the costs are above */ } else if (o.kind === 'thaw') {
    Object.assign(out, { path: 'thaw', standing: -THAW_STANDING, confirm: true, heading: `Walk away from "${title}"?`, leave: 'Walk away from it',
      body: 'They held your part open for years and finally found the money to finish it.' });
    out.certain.push({ text: `Standing −${THAW_STANDING}`, tone: 'bad' });
  } else if (continuation) {
    Object.assign(out, { path: 'continuation', confirm: true, heading: o.kind === 'renewal' ? `Pass on season ${o.season} of "${show}"?` : `Pass on "${title}"?`, leave: 'Pass on it',
      body: o.kind === 'renewal' ? 'The show goes on. Your part goes to somebody else, or is written out.' : 'The film goes ahead. Your part goes to somebody else.' });
  }
  if (continuation) {
    out.certain.push({ text: o.kind === 'renewal' ? `It stays on your record: season ${o.season} of "${show}", and what it did without you`
      : `It stays on your record: "${title}", and what it did without you`, tone: 'plain' });
    // The fans and the letter are readings, not promises: other stories and how the thing did decide them.
    const how = o.story === 'recast' ? 'meeting' : out.option ? 'option' : 'passed';
    const mood = fanMood(o, how, sourceCredit(s, o));
    if (mood === 'furious') out.maybe.push(`The fans may be furious — the ${o.kind === 'renewal' ? 'show' : 'film'} meant a lot to them`);
    else if (mood === 'sorry') out.maybe.push('Some fans may be sorry to see you go');
    if (out.path === 'continuation' && lead) out.maybe.push('The director may ask to meet before they recast');
  } else if (out.path === 'ordinary' && lead && o.via !== 'casting' && /feature|blockbuster|prestige/.test(o.scale || '')) {
    // noteRefusal: a lead in a real picture, offered rather than read for — the director keeps a list.
    out.confirm = true;
    out.certain.push({ text: `${o.director || 'The director'} will remember the no, and will not call for a while`, tone: 'bad' });
    out.maybe.push('The picture opens without you, and the trades will say how it did');
  }
  for (const id of refusalLoosens(s, o)) out.certain.push({ text: `Saying no to your type loosens it: ${labelInfo(id).label}`, tone: 'good' });
  return out;
}
export function declineOffer(s, id) {
  const o = (s.offers || []).find((x) => x.id === id);
  // The rules, before the offer leaves the list (the director's meeting is read off the stories).
  const c = o ? declineConsequences(s, o) : null;
  s.offers = (s.offers || []).filter((x) => x.id !== id);
  s.inbox = (s.inbox || []).filter((m) => m.offerId !== id);
  if (!o) return s;
  const title = o.projectTitle.replace('⭐ ', '');
  // The business remembers a no (stories.js): the director you passed on, and the sequel
  // or the season that goes ahead without you.
  // Leaving by the exit clause (contract.js): after the season it names, with notice, and
  // nobody's lawyer and nobody's fans have a word to say.
  if (c.path === 'exit') {
    loseContinuation(s, o, 'exit');
    s.lastEvent = `You left "${o.seriesTitle || title}" after season ${(o.season || 1) - 1}, the way the paper said you could. The network wrote a graceful exit and the fans got a last episode.`;
    addTimeline(s, `Left ${o.seriesTitle || title} by the exit clause. A last episode, and no hard feelings.`);
    return s;
  }
  // Your own season or sequel: written down on its credit, the ledger and the fans (continuation.js).
  // An option walked out of is an option only while it is running (optionRunning).
  if (o.kind === 'sequel' || o.kind === 'renewal') loseContinuation(s, o, o.story === 'recast' ? 'meeting' : c.option ? 'option' : 'passed');
  else {
    if (o.tier !== 'supporting' && o.via !== 'casting') noteRefusal(s, o);
    // Kept for good, whatever the stories above make of it (meta/passed.js).
    recordPassed(s, o, 'passed');
  }
  // And saying no to the box is how you get out of it — see meta/typecast.js refusedOnType.
  refusedOnType(s, o);
  // Walking out of an option that is still running is walking out of a contract.
  if (c.option) {
    setRespect(s, (s.respect || 0) - OPTION_STANDING);
    s.lastEvent = o.kind === 'renewal'
      ? `You passed on season ${o.season} of "${o.seriesTitle || title}". The network holds an option on it, and their lawyers have read it more recently than you have.`
      : `You passed on "${title}". You signed an option for it years ago, and the studio's lawyers have read it more recently than you have.`;
    addTimeline(s, `Walked out of the option on ${o.kind === 'renewal' ? (o.seriesTitle || title) : title}. The business remembers a contract.`, true);
    return s;
  }
  // Turning down an ordinary offer is your business. Turning down the one they finally
  // found the money to finish, after holding your part open for years, is not.
  if (c.path === 'thaw') {
    setRespect(s, (s.respect || 0) - THAW_STANDING);
    s.lastEvent = `You said no to finishing "${title}". They waited a long time for that answer.`;
    addTimeline(s, `Refused to go back and finish ${title}. People noticed.`, true);
    return s;
  }
  s.lastEvent = `You passed on "${title}".`;
  addTimeline(s, `Passed on ${title}.`);
  return s;
}
