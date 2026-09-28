// On the bubble.
//
// Maxi: "they do not decide straight away whether to renew, and the player should find out
// from the news first. And since fifteen million watched it, the fans should be asking,
// insisting on a second season — petitions, or something like that?"
//
// Both halves of that were missing. A season closed and the same tick decided its fate,
// silently, on a die roll the player never saw — so a show with fifteen million watching
// could land in the eight per cent and simply be gone, with no week in between where
// anybody could do anything about it.
//
// A network does not work like that. It sits on it. The cast are told to hold dates they
// cannot fill, the trades run a piece a month saying nothing, and somewhere in there the
// people who watched it start a petition — which does nothing, and works, and everybody in
// the business knows both of those things are true.
//
// So: a season that is not obviously dead and not obviously safe goes on the BUBBLE for a
// few months. The feed carries it. If the audience was real, a campaign starts on its own,
// and you can put your own name behind it — which costs you something and moves the number.
import { rint, chance } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { inCareer } from '../../engine/stage.js';
import { COST, canAfford, spend, tooTired } from '../../engine/energy.js';
// franchise.js reads this file, so the two numbers it would import are repeated here
// rather than imported back — the same rule trouble.js and risk.js already follow. If
// SLOT_NORM or SEASON_CAP move over there, they move here too.
const SLOT = { 'Soap Opera': 4, 'Network Drama': 2.6, 'Crime Series': 2.6, 'Drama Series': 2.6, 'Talent Series': 3, 'Music Show': 2, 'Prestige Series': 6 };
const CAP = { 'Soap Opera': 20, 'Talent Series': 10, 'Crime Series': 8, 'Drama Series': 7, 'Network Drama': 6, 'Music Show': 6, 'Prestige Series': 5 };
const slotNorm = (t) => SLOT[t] || 2.6;
const seasonCap = (t) => CAP[t] || 5;
import { addHype } from '../meta/hype.js';

const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const root = (t) => String(t || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim();

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
// Nothing, officially. In practice: you say something. It is the one move an actor has and
// it works often enough that everybody tries it.
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
  // Your name on it is worth more when there is already something to put it on.
  const lift = b.heat === 'loud' ? rint(14, 22) : b.heat === 'some' ? rint(8, 14) : rint(3, 7);
  b.odds = clamp(b.odds + lift);
  if (!b.campaign) b.campaign = 'starting';
  addHype(s, 18, 'hit');
  addTimeline(s, `Posted about "${b.root}". The people who watched it needed about four minutes to make it a thing.`);
  s.lastEvent = b.heat === 'none'
    ? `You asked people to say something about "${b.root}". A few hundred did. A network does not count a few hundred, but it does read them.`
    : `You put your name on it, and the thing that was already happening got a great deal louder. Whether a network has ever changed its mind because of that is a question everybody in this business argues about and nobody wins.`;
  return s;
}

// ── the months of nothing ─────────────────────────────────────────────────────
// Monthly. The campaign grows or does not, the trades say nothing at length, and on the
// due month somebody finally decides.
export function bubbleTick(s) {
  if (!inCareer(s)) return s;
  const now = stamp(s);
  for (const b of [...bubbles(s)]) {
    // The campaign builds on its own where there is an audience to build it.
    if (b.campaign === 'starting' && chance(b.heat === 'loud' ? 55 : 30)) {
      b.campaign = 'running';
      b.odds = clamp(b.odds + (b.heat === 'loud' ? rint(6, 12) : rint(3, 7)));
      addTimeline(s, `There is a petition to save "${b.root}". It has more signatures than the show had viewers in some countries.`);
    } else if (b.campaign === 'running' && chance(22)) {
      b.odds = clamp(b.odds + rint(2, 5));
    }
    if (b.due > now) continue;
    // Somebody decides.
    s.bubbles = bubbles(s).filter((x) => x !== b);
    const capped = (b.season || 1) >= seasonCap(b.type);
    const yes = !capped && chance(b.odds);
    b.decided = yes ? 'renewed' : capped ? 'capped' : 'cancelled';
    // The credit wears it, and franchise.js finishes the job on a yes.
    const credit = (s.filmography || []).find((c) => c.title === b.title);
    if (credit) credit.renewal = b.decided;
    (s._bubbleDone = s._bubbleDone || []).push(b);
    if (yes) {
      addTimeline(s, `"${b.root}" is coming back. ${b.campaign ? 'The network says the decision had nothing to do with the campaign.' : ''}`);
      s.lastEvent = `${b.campaign === 'running' ? 'Four months of people shouting about it, and ' : ''}"${b.root}" got its season. Nobody will ever be able to tell you whether the shouting did it.`;
    } else {
      addTimeline(s, `"${b.root}" is not coming back.`, true);
      s.lastEvent = capped
        ? `"${b.root}" is finished — not cancelled, finished, which is the only version of this anybody wants. Everybody gets to say it was always the plan.`
        : `"${b.root}" is over. ${b.campaign === 'running' ? 'The petition is at a number somebody will quote in a piece about how petitions do not work.' : 'It went the way most of them go, which is quietly, on a Friday.'}`;
    }
  }
  return s;
}
// What franchise.js needs to know when a bubble came good: the job it was hanging on.
export function takeDecided(s) {
  const out = s._bubbleDone || [];
  s._bubbleDone = [];
  return out;
}

// For the screen: what is hanging, and what you can do about it.
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
    mood: b.odds >= 70 ? 'It is going to come back. Probably.' : b.odds >= 45 ? 'It could go either way, and everybody involved knows it.' : 'It does not look good.',
  }));
}
