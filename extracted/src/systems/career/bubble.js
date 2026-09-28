// On the bubble, and what a campaign is actually for.
//
// Maxi: "they do not decide straight away whether to renew, and the fans should be asking,
// insisting on a second season — petitions, or something like that?" And then, having seen
// the first version of it: "I did not really understand the petitions. Do it the way life
// does it."
//
// The way life does it is not the way the first version did it. A petition does not change a
// network's mind. It has happened — twice, arguably, and both times the show came back
// smaller, with fewer episodes and a cut budget — and every other time in the history of
// television the network read the number, said something warm about the passion of the fans,
// and did not move.
//
// What a campaign actually does is advertise. It tells every OTHER buyer in the business that
// there is an audience sitting there with nowhere to go: already assembled, already counted,
// already loud, and free. That is a thing worth owning. So the show moves. It comes back
// somewhere else with fewer episodes and less money, and the people who signed are told they
// saved it, and in the only way that matters they did.
//
// So a campaign gets you one of three things, and the first two are not the one you asked for:
//   — somebody else takes the show: a shorter order, a smaller fee, the thing lives
//   — nobody takes the show, but somebody pays for an ending: one special, and a credit that
//     reads finished instead of cancelled
//   — nothing, and then a film, years later, when somebody remembers the number
//
// The original network still decides first, and mostly it decides the way it was always
// going to. Your name on the campaign moves that by three points. It moves the other number
// by twenty, and the other number is the one that has ever saved a show.
import { uid } from '../../engine/id.js';
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { inCareer } from '../../engine/stage.js';
import { COST, canAfford, spend, tooTired } from '../../engine/energy.js';
// franchise.js reads this file, so the numbers it would import are repeated here rather than
// imported back — the same rule trouble.js and risk.js already follow. If SLOT_NORM,
// SEASON_CAP or tvMonths move over there, they move here too.
const SLOT = { 'Soap Opera': 4, 'Network Drama': 2.6, 'Crime Series': 2.6, 'Drama Series': 2.6, 'Talent Series': 3, 'Music Show': 2, 'Prestige Series': 6 };
const CAP = { 'Soap Opera': 20, 'Talent Series': 10, 'Crime Series': 8, 'Drama Series': 7, 'Network Drama': 6, 'Music Show': 6, 'Prestige Series': 5 };
// Copied from franchise.js TV_PACE, and it has to be copied EXACTLY — this was written
// from memory instead and got the soap wrong by a factor of two and left two types out, so
// a rescued soap shot a fourteen-episode season in four months where the same show at the
// original network took two. If TV_PACE changes, this changes with it.
const PACE = { 'Soap Opera': 0.09, 'Network Drama': 0.38, 'Prestige Series': 0.5, 'Talent Series': 0.3, 'Music Show': 0.3 };
const slotNorm = (t) => SLOT[t] || 2.6;
const seasonCap = (t) => CAP[t] || 5;
const monthsFor = (type, episodes) => Math.max(2, Math.min(10, Math.round(1 + episodes * (PACE[type] || 0.38))));
import { addHype } from '../meta/hype.js';
import { socialShopLift } from '../social/posting.js';

const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const root = (t) => String(t || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim();
const cap1 = (t) => String(t || '').charAt(0).toUpperCase() + String(t || '').slice(1);

// Decisive either way and the network says so the same week. Everything between is the
// bubble, which is most of television.
export const SURE_YES = 88, SURE_NO = 18;
export function onTheBubble(odds) { return odds < SURE_YES && odds > SURE_NO; }

// How hard the people who watched it will fight. A show pulling well above its slot has an
// audience that notices it is gone; one nobody watched has nobody to notice.
export function fanHeat(credit) {
  const drew = credit.endViewers || credit.viewers || 0;
  const norm = slotNorm(credit.type) || 2.6;
  const pull = drew / norm;
  const loved = (credit.rating || 0) >= 72;
  if (pull >= 1.6 && loved) return 'loud';
  if (pull >= 1.1 || (loved && pull >= 0.8)) return 'some';
  return 'none';
}

// Put it on the bubble instead of deciding. Called by franchise.js maybeContinue.
export function hangIt(s, credit, p, odds) {
  const months = rint(2, 5);
  const heat = fanHeat(credit);
  s.bubbles = s.bubbles || [];
  s.bubbles.push({
    id: 'bub' + Math.random().toString(36).slice(2, 7),
    title: credit.title, root: root(credit.title), type: credit.type,
    season: credit.season || 1, odds, base: odds, heat,
    since: stamp(s), due: stamp(s) + months,
    backed: false, campaign: heat === 'loud' ? 'starting' : null,
    // The other number. Not whether the network will keep it — whether anybody ELSE wants
    // it. This is the one a campaign is really playing with, and the one nobody signing a
    // petition thinks they are playing with.
    shopped: heat === 'loud' ? rint(16, 28) : heat === 'some' ? rint(7, 15) : rint(0, 5),
    job: p, rating: credit.rating || 0,
    viewers: credit.endViewers || credit.viewers || 0,
  });
  addTimeline(s, `No word on "${root(credit.title)}". The network has not said yes and has not said no.`);
  s.lastEvent = `The season is over and nobody has decided anything. ${credit.season > 1 ? 'You have been here before: ' : ''}the cast were asked to hold dates in the spring, which is not the same as being told there is a spring.`;
  return s;
}
export function bubbles(s) { return s.bubbles || []; }
export function bubbleFor(s, id) { return bubbles(s).find((b) => b.id === id) || null; }

// ── what you can do about it ──────────────────────────────────────────────────
// Say something. It is the one move an actor has, and what it is worth is not what people
// think it is worth: three points at the network that cancelled it, twenty everywhere else.
export const BACK_COST = 10;
export function canBack(s, b) {
  if (!b) return { ok: false, why: '' };
  if (b.backed) return { ok: false, why: 'You already said your piece. Saying it twice is a different story.' };
  if (!canAfford(s, BACK_COST)) return { ok: false, why: tooTired(s, BACK_COST) };
  return { ok: true, why: '' };
}
export function backTheCampaign(s, id) {
  const b = bubbleFor(s, id);
  const fit = canBack(s, b);
  if (!fit.ok) { if (fit.why) s.lastEvent = fit.why; return s; }
  spend(s, BACK_COST);
  b.backed = true;
  // The network reads it. The network does not move.
  b.odds = clamp(b.odds + rint(2, 5));
  // Everybody else reads it too, and one of them is shopping.
  // And this is what the account is for. Your own audience is the thing that carries the
  // number to somebody who did not cancel it. social/posting.js
  b.shopped = clamp((b.shopped || 0) + Math.round((b.heat === 'loud' ? rint(16, 26) : b.heat === 'some' ? rint(10, 18) : rint(4, 9)) * socialShopLift(s)));
  if (!b.campaign) b.campaign = 'starting';
  addHype(s, 18, 'hit');
  addTimeline(s, `Posted about "${b.root}". The people who watched it needed about four minutes to make it a thing.`);
  s.lastEvent = b.heat === 'none'
    ? `You asked people to say something about "${b.root}". A few hundred did. That is not a number anybody buys a show on, and everybody you were hoping would see it has now seen it.`
    : `You put your name on it and the thing that was already happening got a great deal louder. The network will say something warm about the passion of the fans and will not change its mind, because they never do. What you have actually done is put the number in front of every buyer who did not cancel it — and that is the move that has ever saved a show.`;
  return s;
}

// ── who else might want it ────────────────────────────────────────────────────
// Nobody is named, because in this business the buyer is always "a streamer" until the
// morning the deal is announced. What they have in common: they are not paying what the
// network paid, and they are not ordering as many.
const BUYERS = [
  { who: 'a streamer', pay: 0.78, order: 0.72,
    line: 'They do not care what it rated on a Tuesday. They care that the audience is already assembled and has spent a year telling everybody about it for free.' },
  { who: 'a service with a library to fill', pay: 0.6, order: 0.62,
    line: 'They need things people have heard of, and they need them cheap, and both of those are now true of your show.' },
  { who: 'the channel it should have been on in the first place', pay: 0.72, order: 0.8,
    line: 'Everybody involved will spend the press tour explaining that this was always the right home for it, and they will be right, which is the annoying part.' },
  { who: 'a co-production abroad', pay: 0.52, order: 0.58,
    line: 'Half the money, a crew in a country where the money goes further, and the show carries on. Some of the cast will not be coming.' },
];

// ── the months of nothing ─────────────────────────────────────────────────────
// Monthly. The campaign grows or does not, the trades say nothing at length, and on the due
// month the network decides — and then, if it said no, somebody else gets asked.
export function bubbleTick(s) {
  if (!inCareer(s)) return s;
  const now = stamp(s);
  for (const b of [...bubbles(s)]) {
    // The campaign builds on its own where there is an audience to build it. What it builds
    // is almost all on the other side of the ledger.
    if (b.campaign === 'starting' && chance(b.heat === 'loud' ? 55 : 30)) {
      b.campaign = 'running';
      b.odds = clamp(b.odds + rint(1, 3));
      b.shopped = clamp((b.shopped || 0) + (b.heat === 'loud' ? rint(10, 18) : rint(5, 11)));
      addTimeline(s, `There is a petition to save "${b.root}". It has more signatures than the show had viewers in some countries.`);
    } else if (b.campaign === 'running' && chance(30)) {
      b.shopped = clamp((b.shopped || 0) + rint(2, 6));
      if (chance(25)) b.odds = clamp(b.odds + 1);
    }
    if (b.due > now) continue;
    // The network decides. Mostly it decides the way it was always going to.
    s.bubbles = bubbles(s).filter((x) => x !== b);
    const capped = (b.season || 1) >= seasonCap(b.type);
    const yes = !capped && chance(b.odds);
    const credit = (s.filmography || []).find((c) => c.title === b.title);
    if (yes) {
      b.decided = 'renewed';
      if (credit) credit.renewal = 'renewed';
      (s._bubbleDone = s._bubbleDone || []).push(b);
      addTimeline(s, `"${b.root}" is coming back. ${b.campaign ? 'The network says the decision had nothing to do with the campaign.' : ''}`);
      s.lastEvent = `${b.campaign === 'running' ? 'Four months of people shouting about it, and ' : ''}"${b.root}" got its season. Nobody will ever be able to tell you whether the shouting did it, and the network has already said it did not.`;
      continue;
    }
    // No. And now the part nobody expects: the audience is still there, still counted, and
    // now effectively for sale.
    b.decided = capped ? 'capped' : 'cancelled';
    addTimeline(s, `"${b.root}" is not coming back.`, true);
    const shopped = clamp(b.shopped || 0);
    const moved = !capped && chance(Math.round(shopped * 0.55));
    const ending = !moved && !capped && shopped >= 24 && chance(Math.round(shopped * 0.4));
    if (moved) rescue(s, b, credit);
    else if (ending) finale(s, b, credit);
    else {
      if (credit) credit.renewal = capped ? 'capped' : 'cancelled';
      s.lastEvent = capped
        ? `"${b.root}" is finished — not cancelled, finished, which is the only version of this anybody wants. Everybody gets to say it was always the plan.`
        : shopped >= 20
        ? `"${b.root}" is over. Two buyers looked at it and both of them worked out what a season costs. The petition is at a number somebody will quote in a piece about how petitions do not work.`
        : `"${b.root}" is over. ${b.campaign === 'running' ? 'The petition is at a number somebody will quote in a piece about how petitions do not work.' : 'It went the way most of them go, which is quietly, on a Friday.'}`;
      // And sometimes, years later, somebody remembers the number. This is how a cancelled
      // show becomes a film: not because anybody relented, but because the audience stayed
      // counted, and a counted audience is the only thing this business is ever sure of.
      if (!capped && shopped >= 34 && chance(20)) laterFilm(s, b);
    }
  }
  return s;
}

// Somebody else takes it. Fewer episodes, less money, and it is still your show.
function rescue(s, b, credit) {
  const p = b.job || {};
  const buyer = pick(BUYERS);
  const wasFee = p.episodeFee || Math.round((p.salary || 0) / Math.max(1, p.episodes || 1));
  const wasEpisodes = p.episodes || 8;
  const episodes = Math.max(4, Math.round(wasEpisodes * buyer.order));
  const episodeFee = Math.max(1, Math.round(wasFee * buyer.pay));
  const nextSeason = (b.season || 1) + 1;
  if (credit) credit.renewal = 'moved';
  (s.offers = s.offers || []).push({
    id: uid(s, 'resc'), kind: 'rescue', via: 'rescue', seriesTitle: b.root, season: nextSeason,
    projectTitle: `${b.root} · season ${nextSeason}`, role: p.role, type: b.type, genre: p.genre,
    scale: p.scale, tier: p.tier || 'lead', perEpisode: true, medium: p.medium,
    episodes, episodeFee, salary: episodeFee * episodes, baseSalary: p.baseSalary || p.salary,
    // A smaller budget shows. It is the same show, a little poorer, and the arc it was
    // building is still the arc it was building.
    prestigeScore: clamp((p.prestigeScore || 50) - rint(1, 5), 8, 96), arc: p.arc,
    stability: Math.max(55, Math.min(80, (p.stability || 78) - rint(4, 12))),
    character: p.character || null, premise: p.premise || null,
    months: monthsFor(b.type, episodes), fame: p.tier === 'tentpole' ? 9 : 5,
    deadline: rint(2, 3), waitsForWrap: true, savedBy: buyer.who,
    note: `${cap1(buyer.who)} is taking "${b.root}". ${episodes} episodes instead of ${wasEpisodes}, and ${Math.round((1 - buyer.pay) * 100)}% less an episode. ${buyer.line}`,
  });
  addTimeline(s, `"${b.root}" was saved — ${buyer.who} picked it up for season ${nextSeason}.`);
  s.lastEvent = `The network is not bringing "${b.root}" back. ${cap1(buyer.who)} is. ${buyer.line}${b.backed ? ' Somebody on their side of it has said, off the record, that the noise is what put the show on their desk.' : ''} Fewer episodes, less money, and the show is still going — which is the whole argument.`;
}

// Nobody wants the show. Somebody will pay for an ending — and an ending is not nothing. A
// credit that says finished and a credit that says cancelled are read differently for the
// rest of your life.
function finale(s, b, credit) {
  const p = b.job || {};
  const wasFee = p.episodeFee || Math.round((p.salary || 0) / Math.max(1, p.episodes || 1));
  const fee = Math.max(1, Math.round(wasFee * rint(14, 20) / 10));
  if (credit) credit.renewal = 'finale';
  (s.offers = s.offers || []).push({
    id: uid(s, 'fin'), kind: 'finale', via: 'rescue', seriesTitle: b.root,
    projectTitle: `${b.root} — the last one`, role: p.role, type: b.type, genre: p.genre,
    scale: 'oneoff', tier: p.tier || 'lead', episodes: 1, perEpisode: false,
    salary: fee, baseSalary: p.baseSalary || p.salary,
    prestigeScore: clamp((p.prestigeScore || 50) + rint(0, 6), 8, 96),
    stability: Math.max(70, p.stability || 78), character: p.character || null, premise: p.premise || null,
    months: 2, fame: 3, deadline: rint(2, 3), waitsForWrap: true,
    note: `No season. One special, two hours, to end it properly — the thing that got written on a napkin the week you were cancelled and that somebody has now found the money for. Everybody comes back. Everybody knows what it is.`,
  });
  addTimeline(s, `"${b.root}" is getting an ending — one special, and then that is it.`);
  s.lastEvent = `"${b.root}" is not coming back as a show. It is coming back once, for two hours, so that it can finish. Nobody is making money on this decision and everybody involved wanted it, which is rare enough that you should probably say yes.`;
}

// Years later. The audience stayed counted, and eventually that is a pitch.
function laterFilm(s, b) {
  const gap = rint(36, 84);
  const p = b.job || {};
  (s.laterOffers = s.laterOffers || []).push({
    due: stamp(s) + gap, since: stamp(s),
    line: `Somebody wants to make a film of "${b.root}".`,
    event: `A call about "${b.root}". It has been years. The people who would not stop asking about it never stopped asking about it, and somewhere a person whose job is to find an audience that already exists has finally opened the file.`,
    offer: {
      id: uid(s, 'cult'), kind: 'cultfilm', via: 'rescue', projectTitle: `${b.root} — the film`,
      role: p.role || 'Lead', type: 'Feature Film', genre: p.genre || 'Drama', scale: 'feature',
      tier: p.tier || 'lead', months: rint(3, 5),
      salary: Math.max(1, Math.round((p.salary || 0) * rint(6, 11) / 10)),
      prestigeScore: clamp((p.prestigeScore || 50) + rint(-4, 8), 8, 96),
      stability: rint(64, 82), character: p.character || null, premise: p.premise || null,
      fame: 5, deadline: rint(2, 4),
      note: `The show has been off the air long enough that the people who loved it have jobs and money. That is the entire financing case, it is written in the deck in those words, and it is enough.`,
    },
  });
}

// What franchise.js needs to know when a bubble came good: the job it was hanging on.
export function takeDecided(s) {
  const out = s._bubbleDone || [];
  s._bubbleDone = [];
  return out;
}

// For the screen: what is hanging, and what putting your name on it is actually for.
export function liveBubbles(s) {
  const now = stamp(s);
  return bubbles(s).map((b) => ({
    ...b,
    monthsLeft: Math.max(0, b.due - now),
    line: b.campaign === 'running'
      ? `There is a petition, and it is not small. The trades have started quoting the number.`
      : b.campaign === 'starting'
      ? `People who watched it have started saying something. It is not a campaign yet.`
      : b.heat === 'none'
      ? `Nobody is fighting for it. That is its own answer, and the network can read it too.`
      : `No word either way. The cast are holding dates nobody has confirmed.`,
    mood: b.odds >= 70 ? 'The network is going to keep it. Probably.' : b.odds >= 45 ? 'It could go either way, and everybody involved knows it.' : 'The network is not going to keep it.',
    // The honest second line, and the one that actually matters.
    elsewhere: (b.shopped || 0) >= 55 ? 'If the network says no, somebody else takes it. There are two of them looking.'
      : (b.shopped || 0) >= 30 ? 'If the network says no, there is a real chance somebody else picks it up — or pays for an ending.'
      : (b.shopped || 0) >= 14 ? 'Somebody outside has asked what a season would cost. That is as far as it has gone.'
      : 'Nobody outside the network has asked about it.',
  }));
}
