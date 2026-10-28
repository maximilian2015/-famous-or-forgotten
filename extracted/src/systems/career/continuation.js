// The season or the sequel that went on without you, and what became of it.
//
// Maxi, at "The Last Woman" in 2080: the card said "Renewed for season 2", season 2 never came, and
// nothing anywhere said why. The game had lost it three ways at once. The card held one field for
// two different things — what the network decided about the show, and what happened to you — and
// the desks that wrote you out overwrote the first with the second. The fact that you lost the part
// lived only in the "Without you" story, which runs one at a time: with another one running (Small
// Wedding), this one was never started and never written down. And when that story did run, it
// rolled how the season went without you on the spot — a coin for whether it held, a random number
// for the gross — and picked whoever came first from the actors' list as the one in your part.
//
// So, three things kept apart (Maxi/ChatGPT, 22 Oct):
//   the show      credit.renewal, as the network decided it — renewed stays renewed
//   you           credit.next — which season or part, what happened to you in it (declined, left,
//                 recast, written out, killed off, walked out) and why, the month, and who has
//                 your part if anybody does. Written the moment it happens, whatever else is going on.
//   what it did   credit.next.result — the season or the sequel simulated off-screen when it would
//                 have come out, by the same arithmetic your own work goes through (television's
//                 audience and renewal, a platform's drop, a world film's gross), from what the last
//                 one did and who replaced you. Seeded by the title, so it is the same every time
//                 and draws nothing from the life's own dice. A film goes on the replacement's own
//                 record in the world. Told once: by the "Without you" story if it is telling this
//                 one, otherwise by the trades.
//
// The fans (stories.js noteSequelLoss) react to how much the show meant and why you are not in it;
// nobody's standing moves because a negotiation did not close.
import { hash, rng } from '../../engine/hash.js';
import { addTimeline } from '../../engine/timeline.js';
import { sendMail } from '../meta/email.js';
import { recordPassed, notePassedOutcome } from '../meta/passed.js';
import { noteSequelLoss } from '../meta/stories.js';
import { activeActors, ageOf, actorById, applyFilmToActor, applyStreamingToActor } from '../world/world.js';
import { renewalOdds, seriesRoot, seasonCap } from './franchise.js';
import { tvVerdict } from './release/television.js';
import { grossFor, moneyVerdict, studioCampaign, castDraw } from './release/theatrical.js';
import { holdFactor } from './chapter.js';
import { platformById, platformOfKind, dropSeason, dropFilm, renewalFor, seasonCost } from './streaming.js';
import { getProject } from './project.js';
import { planEpisodeCost } from './budget.js';

const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = (v) => Math.round(v * 10) / 10;
const clean = (t) => String(t || '').replace(/^⭐\s*/, '');
const partRoot = (t) => clean(t).replace(/\s+(II|III|IV|V|VI|\d+)$/, '').trim();
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const money = (n) => (n >= 1e9 ? `€${(n / 1e9).toFixed(2)}bn` : n >= 1e6 ? `€${Math.round(n / 1e6)}m` : `€${Math.round(n).toLocaleString()}`);

// What happened to you, and why, in the words the card and the trades use.
export const YOU = {
  declined: 'You turned it down', left: 'You left by the exit clause', recast: 'Recast',
  writtenOut: 'Written out', killed: 'Your character was killed off', walkedOut: 'You walked out of the option',
  notMade: 'Not made', returned: 'You went back', pending: 'Negotiations pending',
};
export const WHY = {
  passed: 'you said no', exit: 'with notice, as the paper allowed', expired: 'you never answered in time',
  talks: 'the deal was never closed', schedule: 'you were on another set', meeting: 'you said no again after the meeting',
  writtenOut: 'the show went on without your character', network: 'the network decided the show was better without the character',
  notMade: 'the money could not be agreed, and the season was not made', option: 'they held an option on it',
  health: 'you were signed off, and they could not wait',   // life/burnout.js: illness, never a breach
};
// `how` is the desk's word for it (passed.js); the status is what it means for you.
function youFor(how, exit) {
  if (how === 'passed') return 'declined';
  if (how === 'exit') return 'left';
  if (how === 'option') return 'walkedOut';
  if (how === 'notMade') return 'notMade';
  if (how === 'writtenOut' || how === 'network') return exit === 'killed' || exit === 'a death' ? 'killed' : 'writtenOut';
  return 'recast';
}

// The credit this one would have followed: by id where the paper says, by project, then by name.
export function sourceCredit(s, o) {
  const shelf = (s.filmography || []).filter((c) => c && !c.minor);
  if (o.sourceCreditId) { const c = shelf.find((x) => x.id === o.sourceCreditId); if (c) return c; }
  if (o.parentProjectId) { const c = shelf.find((x) => x.projectId === o.parentProjectId); if (c) return c; }
  if (o.kind === 'renewal') {
    const root = seriesRoot(o.seriesTitle || clean(o.projectTitle));
    return shelf.filter((c) => (c.season || 1) === (o.season || 2) - 1 && seriesRoot(c.title) === root)
      .sort((a, b) => (b.year || 0) - (a.year || 0))[0] || null;
  }
  const root = partRoot(o.projectTitle);
  return shelf.filter((c) => partRoot(c.title) === root && (c.part || 1) === (o.part || 2) - 1)
    .sort((a, b) => (b.year || 0) - (a.year || 0))[0] || null;
}

// Who has your part: somebody real from the world, near your age and your billing, chosen by the
// show's name so it is the same person every time this is asked. Nobody, if nobody fits — never a
// name made up for a sentence.
export function replacementFor(s, o, src) {
  const target = Math.max(20, (s.fame || 0) * 0.75);
  const pool = activeActors(s).filter((a) => a.gender === s.gender && Math.abs(ageOf(s, a) - (s.ageY || 30)) <= 8)
    .sort((a, b) => Math.abs((a.fame || 0) - target) - Math.abs((b.fame || 0) - target) || String(a.id).localeCompare(String(b.id)));
  if (!pool.length) return null;
  const a = pool[hash('replace:' + clean(o.projectTitle) + ':' + ((src && src.id) || '')) % Math.min(3, pool.length)];
  return { id: a.id, name: a.name, fame: Math.round(a.fame || 0) };
}

// When it would come out: the month they meant to start, the shoot, and the finishing.
const POST = { blockbuster: 8, feature: 6, indie: 5, festival: 4, small: 3 };
function dueOf(s, o, film) {
  const start = Math.max(stamp(s) + 2, o.startAt || 0);
  return start + (o.months || (film ? 4 : 5)) + (film ? (POST[o.scale] || 6) : 2);
}

// ── the moment it happens ─────────────────────────────────────────────────────
// Every desk that loses you a season or a sequel comes here: offers.js (no, or no answer),
// contract.js (the dates, the talks), standoff.js (the room), franchise.js (written out at the
// renewal). The fact is written now, unconditionally; the ledger (passed.js) keeps the part; the
// fans and the director's letter (stories.js) react, or wait their turn, or say nothing.
// `extra.exit`: how a written-out character went (killed, newLead, around, network). `extra.quiet`: the
// record only, for a story already running from before records existed. `extra.at`: when it happened.
export function loseContinuation(s, o, how, extra = {}) {
  if (!o || (o.kind !== 'renewal' && o.kind !== 'sequel')) return null;
  const src = sourceCredit(s, o);
  const film = o.kind === 'sequel';
  const n = film ? (o.part || 2) : (o.season || 2);
  const was = src && src.next && src.next.n === n ? src.next : null;
  const you = youFor(how, extra.exit);
  // The same loss reported twice (the paper lapsing after the room, a second no after the
  // meeting) is one record, updated with the later reason.
  if (was && was.you === you && was.how === how) return was;
  const goesOn = how !== 'notMade';
  const rec = was || {};
  Object.assign(rec, {
    kind: film ? 'part' : 'season', n, title: clean(o.projectTitle), root: film ? partRoot(o.projectTitle) : seriesRoot(o.seriesTitle || clean(o.projectTitle)),
    you, how, exit: extra.exit || rec.exit || null, at: was ? was.at : (extra.at ?? stamp(s)), tier: o.tier || 'lead', offerId: o.id || null,
    show: goesOn ? 'on' : 'notMade',
    // Somebody plays your part unless the part itself went: written out, killed off — or a new lead
    // brought in above the title, who is somebody.
    by: !goesOn ? null : rec.by || ((you === 'writtenOut' || you === 'killed') && extra.exit !== 'newLead' ? null : replacementFor(s, o, src)),
    due: goesOn ? (rec.due || dueOf(s, o, film)) : null,
    episodes: o.episodes || 0, budget: Number.isFinite(o.budget) ? o.budget : null, scale: o.scale || (src && src.scale) || null,
    // Where it goes out is the project's, not yours: a platform's sequel stays a platform's whoever is in it.
    medium: rec.medium || mediumOf(o, src), platformId: rec.platformId || o.platformId || (src && src.platformId) || null,
    result: rec.result || null, told: !!rec.told, later: rec.later || [], ended: rec.ended || null,
  });
  if (src) {
    src.next = rec;
    // The show's own fate stays the network's: renewed is renewed. Only a season that was not made
    // at all changes it.
    if (!goesOn && !film) src.renewal = 'cancelled';
  }
  const e = recordPassed(s, o, how === 'notMade' ? 'talks' : how === 'network' ? 'talks' : how);
  if (e && !goesOn) e.outcome = { cancelled: true, at: e.at };
  if (!extra.quiet) noteSequelLoss(s, o, how, rec, src);
  return rec;
}

function mediumOf(o, src) {
  if (o.platformId || (src && src.streaming)) return 'streaming';
  return o.kind === 'sequel' ? 'theatrical' : 'television';
}

// The network writing you out at the renewal itself, with no paper to lose (franchise.js maybeContinue):
// the next season, as the renewal would have offered it.
export function writtenOutAtRenewal(s, credit, p, root, n, months) {
  return loseContinuation(s, { kind: 'renewal', season: n, seriesTitle: root, projectTitle: `${root} · season ${n}`, tier: p.tier || 'lead',
    sourceCreditId: credit.id, parentProjectId: p.projectId || null, episodes: p.episodes || 0, months }, 'network', { exit: 'network' });
}

// ── what it did ───────────────────────────────────────────────────────────────
// The dice for one continuation are its own — seeded by its title — so asking twice gives the same
// answer and a life's own dice are not moved by it.
function seeded(seed, fn) {
  const was = Math.random; Math.random = rng(hash(seed) || 1);
  try { return fn(); } finally { Math.random = was; }
}
export function simulate(s, src, rec) {
  return seeded('without:' + rec.title + ':' + rec.n, () => {
    const r = Math.random;
    const lead = rec.tier !== 'supporting';
    if (rec.kind === 'part' && rec.medium === 'streaming') {
      // A platform's sequel, on the same platform, through the platform's own arithmetic (streaming.js
      // dropFilm) — never a cinema release because you are not in it.
      const pr = getProject(s, src.projectId) || {};
      const platform = platformById(s, rec.platformId || src.platformId || pr.platformId) || platformOfKind(s, 'library');
      const rating = clamp(Math.round((src.rating || 60) + (r() * 14 - 9) - (lead ? 2 : 0)), 5, 95);
      const d = dropFilm({ platform, genre: src.genre, rating, word: rating, crowd: rating, hype: 0, draw: castDraw([rec.by ? rec.by.fame : 25]),
        budget: rec.budget ?? (src.filmCost ? src.filmCost / 1.1 : 20), prev: { views28: src.views28 || 0, outcome: src.verdict }, dice: 0.8 + r() * 0.45 });
      const a = rec.by && actorById(s, rec.by.id);
      if (a) applyStreamingToActor(a, { title: rec.title, year: Math.floor(rec.due / 12), rating, views28: d.views28, platform: platform.name, scale: rec.scale || src.scale, genre: src.genre });
      return { rating, streaming: true, movie: true, platform: platform.name, views28: d.views28, completion: d.completion, verdict: d.outcome, at: rec.due };
    }
    if (rec.kind === 'part') {
      // A world film with somebody else on the poster, through the same arithmetic as everybody's.
      const scale = rec.scale || src.scale || 'feature';
      const rating = clamp(Math.round((src.rating || 60) + (r() * 14 - 9) - (lead ? 2 : 0)), 5, 95);
      const budget = rec.budget ?? null;
      const gross = grossFor({ scale, rating, genre: src.genre, fame: rec.by ? rec.by.fame : 25, part: rec.n, lastRating: src.rating || 60, budget });
      const verdict = moneyVerdict({ scale, budget, boxOffice: gross, campaignTier: studioCampaign(scale) });
      const a = rec.by && actorById(s, rec.by.id);
      if (a) applyFilmToActor(a, { title: rec.title, year: Math.floor(rec.due / 12), rating, gross, scale, genre: src.genre, budget });
      return { rating, gross, verdict, at: rec.due };
    }
    return seasonWithout(s, src, rec, rec.n, null, r, lead);
  });
}
// One season of a show going on without you: the first (from your last season's numbers, less
// whatever you were to it) or a later one (from the season before it, without you already).
function seasonWithout(s, src, rec, n, prev, r, lead) {
  const first = !prev;
  const at = first ? rec.due : prev.next;
  // Losing you costs the first season something; after that the show is what it is without you.
  const lastRating = first ? (src.rating || 60) : prev.rating;
  const rating = clamp(Math.round(lastRating + (r() * 13 - 8) - (first && lead ? 3 : 0)), 5, 95);
  // The last season a format runs (franchise.js seasonCap): past it, it ends rather than being renewed.
  const capped = n >= seasonCap(src.type || (src.streaming ? 'Streaming Series' : 'Drama Series'));
  if (src.streaming) {
    // A platform's next season, on the platform's own numbers.
    const pr = getProject(s, src.projectId) || {};
    const platform = platformById(s, rec.platformId || src.platformId || pr.platformId) || platformOfKind(s, 'library');
    const episodes = rec.episodes || src.episodes || 8;
    const episodeCost = pr.episodeCost ?? planEpisodeCost({ seed: pr.seriesId || src.projectId || rec.root, genre: src.genre, archetype: platform.archetype });
    const before = first ? { finished28: src.finished28 || 0, views28: src.views28 || 0, outcome: src.verdict } : { finished28: prev.finished28 || 0, views28: prev.views28 || 0, outcome: prev.verdict };
    const d = dropSeason({ platform, genre: src.genre, episodes, season: n, rating, word: rating, hype: 0,
      draw: castDraw([rec.by ? rec.by.fame : 25]), episodeCost, prev: before, dice: 0.8 + r() * 0.45 });
    const next = renewalFor({ platform, season: n, rating, finished28: d.finished28, views28: d.views28, prevViews28: before.views28 || null,
      nextCost: seasonCost({ episodes, episodeCost, salaryM: 0 }) });
    const renewed = !capped && next.decision === 'renewed';
    return { n, rating, streaming: true, platform: platform.name, views28: d.views28, finished28: d.finished28, completion: d.completion, verdict: d.outcome,
      renewed, ended: renewed ? null : capped || next.decision === 'capped' ? 'capped' : 'cancelled', at, next: renewed ? at + 12 : null };
  }
  // Television: the last season's finish is this one's start — less whatever you were to it, the
  // first time.
  const base = first ? (src.endViewers || src.viewers || 1) : (prev.end || 1);
  const factor = !first ? 0.88 + r() * 0.2 : !lead ? 0.96 : rec.you === 'killed' ? 0.84 : rec.by ? 0.8 : 0.74;
  const open = r1(Math.max(0.1, base * factor * (first ? 0.9 + r() * 0.2 : 1)));
  const end = r1(Math.max(0.1, open * holdFactor(rating, {})));
  const verdict = tvVerdict({ endViewers: end, viewers: r1((open + end) / 2), type: src.type, rating });
  const renewed = !capped && r() * 100 < renewalOdds(rating, n, src.type, end, base);
  return { n, rating, open, end, verdict, renewed, ended: renewed ? null : capped ? 'capped' : 'cancelled', at, next: renewed ? at + 12 : null };
}
// The result, worked out now if its day has come and nobody has yet (the story asks for it too).
export function ensureResult(s, src, rec) {
  if (!rec || rec.show !== 'on' || rec.you === 'returned') return null;
  if (!rec.result) {
    rec.result = simulate(s, src, rec);
    notePassedOutcome(s, rec.title, { replacedBy: rec.by ? rec.by.name : null, outcome: outcomeFor(rec) });
  }
  return rec.result;
}
function outcomeFor(rec) {
  const x = rec.result || {};
  if (rec.kind === 'part' && x.streaming) return { hit: x.verdict === 'hit' || x.verdict === 'breakout', views28: x.views28 || 0 };
  if (rec.kind === 'part') return { hit: x.verdict === 'smash' || x.verdict === 'profitable', gross: x.gross || 0 };
  return { hit: x.verdict === 'watched' || x.verdict === 'hit' || x.verdict === 'breakout' || !!x.renewed, viewers: x.end ?? x.views28 ?? 0 };
}

// What the trades say, and what the card says under the credit.
export function withoutYouLine(rec, src) {
  const x = rec.result; if (!x) return null;
  const who = rec.by ? `${rec.by.name} has your part.` : rec.you === 'killed' ? 'Your character is dead, and the show did not look back.'
    : rec.you === 'writtenOut' ? 'Your character is simply not in it.' : 'Somebody new has your part.';
  if (rec.kind === 'part' && x.streaming) return `"${rec.title}" dropped on ${x.platform} without you. ${x.views28}m started it in 28 days and ${Math.round((x.completion || 0) * 100)}% finished it. ${who}`;
  if (rec.kind === 'part') return `"${rec.title}" opened without you: ${money(x.gross || 0)}${x.verdict === 'bomb' ? ', which is not a number the studio wanted' : x.verdict === 'smash' ? ', and it was a smash' : ''}. ${who}`;
  if (x.streaming) return `Season ${rec.n} of "${rec.root}" dropped on ${x.platform} without you. ${x.views28}m pressed play in 28 days and ${Math.round((x.completion || 0) * 100)}% finished it. ${who} ${endWords(x, x.platform)}`;
  const yours = src && (src.endViewers || src.viewers);
  return `Season ${rec.n} of "${rec.root}" went out without you. ${who} ${x.open}m watched the first episode and ${x.end}m the last${yours ? ` — yours finished on ${yours}m` : ''}. ${endWords(x, 'The network')}`;
}
function endWords(x, who) {
  return x.renewed ? `${who} has ordered another.` : x.ended === 'capped' ? 'That was its last season: the format ran its course.' : 'It was not renewed.';
}
// A later season of a show that went on without you, in the trades' words.
export function laterLine(rec, x) {
  const seen = x.streaming ? `${x.views28}m pressed play in 28 days` : `${x.end}m watched the last episode`;
  const tail = x.renewed ? 'It has been renewed.' : x.ended === 'capped' ? `That was the last: it ended after ${x.n} seasons.` : `It has been cancelled after ${x.n} seasons.`;
  return `Season ${x.n} of "${rec.root}"${x.streaming ? ` on ${x.platform}` : ''}, still without you: ${seen}. ${tail}`;
}
// What became of the show after the season without you, in one line for the card: every season it
// had after that, and how it ended.
export function afterlifeLine(rec) {
  if (!rec || rec.kind !== 'season' || !rec.result) return null;
  const later = rec.later || [];
  if (!later.length) return null;
  const seasons = later.map((x) => `S${x.n} ${x.streaming ? x.views28 : x.end}m`).join(' · ');
  const end = rec.ended ? (rec.ended.why === 'capped' ? `ended after season ${rec.ended.n}` : `cancelled after season ${rec.ended.n}`) : 'still running';
  return `Then: ${seasons} — ${end}.`;
}
// The show goes on after the season without you, season by season, until it is cancelled or runs its
// course — worked out as each one comes due, whether or not anybody tells you (it is on the card either
// way). Each later season has its own dice, seeded by the show and the season.
function followShow(s, c, rec, now) {
  if (rec.kind !== 'season' || !rec.result) return;
  rec.later = rec.later || [];
  let last = rec.later.length ? rec.later[rec.later.length - 1] : rec.result;
  let guard = 0;
  while (last && last.renewed && last.next != null && last.next <= now && guard++ < 20) {
    const prev = last;
    const x = seeded('without:' + rec.root + ':' + (prev.n + 1), () => seasonWithout(s, c, rec, prev.n + 1, prev, Math.random, rec.tier !== 'supporting'));
    x.told = false;
    rec.later.push(x);
    last = x;
  }
  if (last && !last.renewed && !rec.ended) rec.ended = { n: last.n, why: last.ended || 'cancelled', at: last.at };
}

// Monthly: a continuation whose month has come is worked out and, unless the "Without you" story is
// about to tell it, told by the trades. Once.
export function continuationTick(s) {
  const now = stamp(s);
  for (const c of s.filmography || []) {
    const rec = c && c.next;
    if (!rec || rec.show !== 'on' || rec.you === 'returned' || rec.due == null || rec.due > now) continue;
    // You went back after all (the director's meeting, a rescue): there is nothing to tell. On the
    // record, on a set, finished and waiting to open, or stopped — any of those is yours.
    if (wentBackTo(s, rec, c)) { returned(s, rec); continue; }
    // Still being argued over — the director's meeting, a paper in Messages: nothing is settled yet.
    if (negotiationPending(s, rec)) continue;
    ensureResult(s, c, rec);
    followShow(s, c, rec, now);
    if (rec.told) { tellLater(s, rec); continue; }
    if (storyWillTell(s, rec)) continue;
    rec.told = true;
    const line = withoutYouLine(rec, c);
    // Red when it did well without you — by its own medium's words.
    addTimeline(s, line, rec.kind === 'part' ? outcomeFor(rec).hit : !!rec.result.renewed);
    sendMail(s, { from: 'The trades', subj: rec.kind === 'part' ? `"${rec.title}" — without you` : `"${rec.root}", season ${rec.n} — without you`, tag: 'trades', kind: 'news',
      body: `${line}\n\n${YOU[rec.you]} — ${WHY[rec.how] || ''}, ${MON[(rec.at || 0) % 12]} ${Math.floor((rec.at || 0) / 12)}.`, cta: [{ label: 'Delete', fx: {}, reply: 'Filed.' }] });
    tellLater(s, rec);
  }
  return s;
}
// The later seasons, each told once and in order, after the first one has been.
function tellLater(s, rec) {
  for (const x of rec.later || []) {
    if (x.told) continue;
    x.told = true;
    const line = laterLine(rec, x);
    addTimeline(s, line, !x.renewed);
    sendMail(s, { from: 'The trades', subj: `"${rec.root}", season ${x.n}`, tag: 'trades', kind: 'news', body: line, cta: [{ label: 'Delete', fx: {}, reply: 'Filed.' }] });
  }
}
// Whether the loss is still being argued over: the director has asked to meet, or their new paper is in
// Messages. Until that is settled it is not a recast, and the card says so.
export function negotiationPending(s, rec) {
  if (!rec || rec.result || (rec.you !== 'recast' && rec.you !== 'declined')) return false;
  const st = (s.stories || []).find((x) => x.id === 'recast' && x.data && clean(x.data.title) === rec.title);
  if (st && (st.beat === 'meeting' || st.beat === 'answer')) return true;
  // The same part offered to you again — the director's paper, a rescue, a sequel come round again.
  return (s.offers || []).some((o) => clean(o.projectTitle) === rec.title)
    || (s.laterOffers || []).some((x) => x.offer && clean(x.offer.projectTitle) === rec.title);
}
// Whether the part you lost is yours after all: on your record, on a set, finished and in post (the
// one the first version missed — a season you went back to was worked out without you the month
// before it opened), or stopped mid-shoot.
export function wentBackTo(s, rec, src = null) {
  const mine = (x) => !!x && clean(x.title) === rec.title;
  return (s.filmography || []).some((x) => x !== src && mine(x))
    || (s.productions || []).concat(s.production ? [s.production] : []).some(mine)
    || (s.releases || []).some(mine) || (s.frozen || []).some(mine);
}
// You went back. If the season without you had already been worked out, it never happened: the
// replacement's record forgets it and the ledger's outcome is cleared.
export function returned(s, rec) {
  if (rec.result) {
    const a = rec.by && actorById(s, rec.by.id);
    if (a && Array.isArray(a.credits)) a.credits = a.credits.filter((x) => x.title !== rec.title);
    const e = [...(s.passedOn || [])].reverse().find((x) => x.title === rec.title);
    if (e) { e.outcome = null; e.replacedBy = null; }
  }
  rec.you = 'returned'; rec.result = null; rec.later = []; rec.ended = null; rec.told = true;
}

// The "Without you" story tells it itself when it is running for this title (stories.js).
function storyWillTell(s, rec) {
  return (s.stories || []).some((st) => st.id === 'recast' && st.data && clean(st.data.title) === rec.title && st.beat !== 'again');
}
export function recordForTitle(s, title) {
  const t = clean(title);
  for (const c of s.filmography || []) if (c && c.next && c.next.title === t) return { src: c, rec: c.next };
  return null;
}

// ── an old save ───────────────────────────────────────────────────────────────
// Only what the save says outright: a line the game itself wrote when it happened, a part in the
// ledger, or a credit the old desks marked written out. A season that simply never appeared proves
// nothing — the show may have been cancelled, may not be out yet, or the record is incomplete — and
// is left alone. The season is then worked out as a new one would be, quietly: it is history, and
// nobody sends you the trades about it. Fame, awards and everything the old result already did stay
// as they were. Idempotent.
const LOST = [
  [/^They stopped waiting on (.+) and cast someone else\.$/, 'expired'],
  [/^(.+): they held it as long as they could\. You were still on another set, and they recast\.$/, 'schedule'],
  [/^(.+): they could not hold the part\. It went to somebody who was free\.$/, 'schedule'],
  [/^(.+): they stopped answering\. Somebody else signed it as written\.$/, 'talks'],
  [/^Fans are furious: you are not coming back for season (\d+) of "(.+)"\.$/, 'passed'],
  [/^Fans are furious: you could not free yourself for season (\d+) of "(.+)", and they are recasting\.$/, 'schedule'],
  [/^Written out of "(.+)"\. The show is coming back; you are not in it\.$/, 'writtenOut'],
  [/^Out of "(.+)"\. Season (\d+) is going ahead without you\.$/, 'writtenOut'],
  [/^Left (.+) by the exit clause\./, 'exit'],
  [/^Walked out of the option on (.+)\. /, 'option'],
];
const ROMAN = { II: 2, III: 3, IV: 4, V: 5, VI: 6 };
const monthOf = (when) => { const m = /^([A-Z][a-z]{2}) (\d{4})$/.exec(String(when || '')); return m ? Number(m[2]) * 12 + MON.indexOf(m[1]) : null; };
export function settleLostContinuations(s) {
  if (!s || (s.continuationsVersion || 0) >= 1) return s;
  s.continuationsVersion = 1;
  const shelf = (s.filmography || []).filter((c) => c && !c.minor);
  const tl = s.timeline || [];
  const told = (title) => tl.some((e) => typeof e.text === 'string' && (e.text === `Sent the contract for ${title} back.` || e.text === `A date for "${title}". Everybody who can say yes will be in one room.`));
  const found = [];
  for (const e of tl) {
    const text = typeof e.text === 'string' ? e.text : '';
    for (const [re, how] of LOST) {
      const m = re.exec(text); if (!m) continue;
      let title = m[2] && /^\d+$/.test(m[1]) ? `${m[2]} · season ${m[1]}` : m[1];
      if (re.source.startsWith('^Out of')) title = `${m[1]} · season ${m[2]}`;
      found.push({ title: clean(title), how: how === 'expired' && told(clean(title)) ? 'talks' : how, at: monthOf(e.when) });
      break;
    }
  }
  for (const p of s.passedOn || []) if (p.kind === 'renewal' || p.kind === 'sequel') found.push({ title: p.title, how: p.how, at: p.at, season: p.season, part: p.part, kind: p.kind });
  for (const f of found) {
    const season = /·\s*season\s+(\d+)\s*$/i.exec(f.title);
    const kind = f.kind || (season ? 'renewal' : 'sequel');
    // A sequel says its number in its title (franchise.js sequelTitle): II, III … or a figure.
    const numeral = /\s+(II|III|IV|V|VI|\d+)$/.exec(f.title);
    const n = season ? Number(season[1]) : (f.part || (numeral ? (ROMAN[numeral[1]] || Number(numeral[1]) || 0) : 0));
    const o = kind === 'renewal' ? { kind, season: n || f.season, seriesTitle: seriesRoot(f.title), projectTitle: f.title }
      : { kind, part: n, projectTitle: f.title };
    if (!(o.season || o.part) || (o.season || o.part) < 2) continue;
    const src = sourceCredit(s, o);
    if (!src || src.next) continue;
    // You came back after all: the season or the part is on your own record.
    if (shelf.some((c) => clean(c.title) === clean(f.title) || (kind === 'renewal' && seriesRoot(c.title) === o.seriesTitle && (c.season || 1) === o.season))) continue;
    const exit = f.how === 'writtenOut' ? 'around' : null;
    src.next = { kind: kind === 'sequel' ? 'part' : 'season', n: o.season || o.part, title: clean(f.title), root: kind === 'sequel' ? partRoot(f.title) : o.seriesTitle,
      you: youFor(f.how, exit), how: f.how, exit, at: f.at, tier: src.tier || 'lead', offerId: null, show: 'on', by: null,
      due: f.at != null ? f.at + (kind === 'sequel' ? 12 : 7) : null, episodes: src.episodes || 0, budget: null, scale: src.scale || null,
      result: null, told: true, migrated: true };
    if (src.next.you !== 'writtenOut' && src.next.you !== 'killed') src.next.by = replacementFor(s, o, src);
    src.next.medium = mediumOf(o, src); src.next.platformId = src.platformId || null; src.next.later = []; src.next.ended = null;
    if (src.next.due != null && src.next.due <= stamp(s)) quietly(s, src, src.next);
    else src.next.told = false;
  }
  // A "Without you" thread from before, waiting a year to say "another season without you, again"
  // on a coin it rolled, when the record now says there was no other season: it has nothing left to
  // tell, and its last word is on the credit.
  s.stories = (s.stories || []).filter((st) => {
    if (!st || st.id !== 'recast' || st.beat !== 'again' || !st.data) return true;
    const f = recordForTitle(s, st.data.title);
    return !(f && f.rec.result && !f.rec.result.renewed);
  });
  // The old desks wrote "written out" over the show's own fate. The show was renewed; you were not in it.
  for (const c of shelf) {
    if (c.renewal !== 'writtenOut') continue;
    c.renewal = 'renewed';
    if (!c.next) c.next = { kind: 'season', n: (c.season || 1) + 1, title: `${seriesRoot(c.title)} · season ${(c.season || 1) + 1}`, root: seriesRoot(c.title),
      you: youFor('writtenOut', c.renewalReason), how: 'writtenOut', exit: c.renewalReason || null, at: c.closedAt ?? null, tier: c.tier || 'lead',
      offerId: null, show: 'on', by: null, due: c.closedAt != null ? c.closedAt + 7 : null, episodes: c.episodes || 0, budget: null, scale: c.scale || null,
      result: null, told: true, migrated: true };
    c.next.medium = c.streaming ? 'streaming' : 'television'; c.next.platformId = c.platformId || null; c.next.later = c.next.later || []; c.next.ended = c.next.ended || null;
    if (c.next.due != null && c.next.due <= stamp(s)) quietly(s, c, c.next);
  }
  return s;
}
// History, worked out without the trades: the season without you and every season after it that has
// already happened by now, each marked told.
function quietly(s, src, rec) {
  ensureResult(s, src, rec);
  followShow(s, src, rec, stamp(s));
  for (const x of rec.later || []) x.told = true;
}
// For the screen: what a credit says about the next one without you.
export function nextLines(c, s = null) {
  const rec = c && c.next; if (!rec) return null;
  const when = rec.at != null ? `${MON[rec.at % 12]} ${Math.floor(rec.at / 12)}` : null;
  const which = rec.kind === 'part' ? `"${rec.title}"` : `Season ${rec.n}`;
  // Not a recast while it is still being argued over (Maxi/ChatGPT, 22 Oct): no replacement, no outcome.
  if (s && negotiationPending(s, rec)) {
    const paper = (s.offers || []).some((o) => o.story === 'recast' && clean(o.projectTitle) === rec.title);
    return { you: `${which}: ${YOU.pending} — ${paper ? 'their new paper is in Messages' : 'the director has asked to meet'}`, after: null, pending: true };
  }
  const later = afterlifeLine(rec);
  return {
    you: rec.you === 'returned' ? null : `${which}: ${YOU[rec.you] || rec.you}${WHY[rec.how] ? ` — ${WHY[rec.how]}` : ''}${when ? ` · ${when}` : ''}`,
    after: rec.result ? withoutYouLine(rec, c) + (later ? ` ${later}` : '') : rec.show === 'on' && rec.you !== 'returned' && rec.due != null ? `${which} is going ahead without you.` : null,
  };
}
