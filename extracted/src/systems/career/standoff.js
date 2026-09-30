// The room where it actually gets decided.
//
// Maxi, A-list, five seasons into his own show: "five times they sent the fee, five times I
// asked for more, five times they refused, and then the show went on without me. Let us do
// it properly — if you play the lead they cannot make it without you, so either they raise
// it or they close it. And there should be new clauses at A-list to protect the show and to
// protect you. And if you cannot come to an agreement, there is a MEETING: you are invited,
// and you decide, finally, what happens and on what terms. But again — how does it go in
// real life? Do it the way real life does it."
//
// The way real life does it, and none of it was here:
//
//   · The leverage arrives at the third season, not the first. The original paper was signed
//     when nobody knew, the escalators in it are now insulting, and the studio needs the show
//     more than it needs the principle.
//   · Nobody wins this on the raw fee. A studio will not set the per-episode number the whole
//     town will read about — it pays around it. Back end, a producing credit, a shorter order
//     at a better rate, an episode to direct, a development deal for your own thing. Those are
//     what the huge television paydays are actually made of.
//   · The cast go in together when they can. It is the strongest move there is, because
//     nobody can recast all of you, and every famous version of this was done that way.
//   · When it drags, somebody calls a meeting. It is not another letter — it is a room, with
//     the studio on one side, and it ends that day.
//   · And it can end with no show. A network decides the economics no longer work, and the
//     thing that was renewed simply is not made. That happens, and it is the real ending to
//     this argument rather than a recast.
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { inCareer } from '../../engine/stage.js';
import { COST, canAfford, spend, tooTired } from '../../engine/energy.js';
import { setRespect } from '../meta/status.js';
import { fameTier } from '../meta/status.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const tierIdx = (s) => ['unknown', 'rising', 'known', 'star', 'alist', 'icon'].indexOf(fameTier(s.fame).id);
const clean = (t) => String(t || 'it').replace('⭐ ', '');

// The show is about you, so there is nobody to give it to. career/contract.js theShowIsYou
export function yoursToLose(o) {
  return !!o && o.kind === 'renewal' && (o.tier === 'lead' || o.tier === 'tentpole');
}

// ── what they will actually put on the table ──────────────────────────────────
// Never the whole ask in cash. A studio will not set the per-episode number the entire town
// is going to read about — it pays around it, and everything it pays around it with is worth
// more than the headline anyway.
export const EXTRAS = {
  points: { label: 'A piece of the show', line: 'Back end. If it runs and it sells, this is the number that matters and nobody will be able to tell you what it will be.' },
  producer: { label: 'A producing credit', line: 'Your name in the front titles and a fee attached to it. You will also be in the room where the scripts are argued about, which is the part you will actually notice.' },
  shortOrder: { label: 'Fewer episodes', line: 'A shorter season at a better rate per episode. The months you get back are the months you could make a film in.' },
  directOne: { label: 'An episode to direct', line: 'One, in the back half, with a proper prep. Everybody says yes to this and half of them mean it.' },
};
export const EXTRA_IDS = Object.keys(EXTRAS);

// How much room the studio has. A show they need is a show they will pay for; a show that is
// limping is one they will let go rather than be held up by.
export function theirRoom(s, o) {
  const seasons = o.season || 1;
  const tier = tierIdx(s);
  // The third season is the classic one: the paper is old, the show has proved itself, and
  // everybody in the building knows what the original deal looks like now.
  const proven = seasons >= 3 ? 1 : 0.6;
  return clamp(Math.round((28 + tier * 11 + (o.prestigeScore || 50) * 0.18) * proven), 10, 92);
}

export function packageFor(s, o) {
  const room = theirRoom(s, o);
  const tier = tierIdx(s);
  const fee = o.episodeFee || Math.round((o.salary || 0) / Math.max(1, o.episodes || 1));
  // Part of the ask in cash, and never all of it.
  const raise = Math.round(fee * (1 + (room / 100) * 0.45));
  const extras = [];
  if (tier >= 4 && room >= 45) extras.push('points');
  if (tier >= 4 && room >= 30 && (o.season || 1) >= 3) extras.push('producer');
  if (room >= 55) extras.push('shortOrder');
  if (tier >= 3 && room >= 38 && chance(60)) extras.push('directOne');
  const episodes = extras.includes('shortOrder')
    ? Math.max(4, Math.round((o.episodes || 10) * 0.7)) : (o.episodes || 10);
  return {
    fee: raise, was: fee, episodes, wasEpisodes: o.episodes || 10,
    points: extras.includes('points') ? rint(2, 5) : 0,
    producer: extras.includes('producer'),
    directOne: extras.includes('directOne'),
    extras, room,
    // What they are really saying, which is never what the letter says.
    mood: room >= 70 ? 'They need this show and everybody in the room knows it.'
      : room >= 45 ? 'They will pay something. They will not pay it in a way anybody can read about.'
      : 'They are not frightened of losing it, and they want you to know that.',
  };
}

// ── the meeting ───────────────────────────────────────────────────────────────
// Called from contract.js when the fee has been refused twice on a show that is yours. It is
// not another letter. It is a room, and it ends that day.
export function callTheRoom(s, o) {
  if (!yoursToLose(o) || s.standoff) return s;
  s.standoff = {
    offerId: o.id, title: clean(o.projectTitle), season: o.season || 1,
    since: stamp(s), rounds: 0, pack: packageFor(s, o),
  };
  addTimeline(s, `A meeting about "${clean(o.projectTitle)}". Not a letter this time.`);
  s.lastEvent = `Nobody is answering letters about "${clean(o.projectTitle)}" any more, so there is a meeting: you, your agent, and three people from the studio who have all cleared an afternoon. It ends today, one way or the other.`;
  return s;
}
export function standoff(s) { return s.standoff || null; }
export function standoffOffer(s) {
  const k = standoff(s);
  return k ? (s.offers || []).find((o) => o.id === k.offerId) || null : null;
}

// ── what you can do in the room ───────────────────────────────────────────────
export const PUSH_COST = 15;
export function canPush(s) {
  const k = standoff(s);
  if (!k) return { ok: false, why: '' };
  if (k.rounds >= 2) return { ok: false, why: 'You have been back twice. A third time is not negotiating, it is a position, and they will treat it as one.' };
  if (!canAfford(s, PUSH_COST)) return { ok: false, why: tooTired(s, PUSH_COST) };
  return { ok: true, why: '' };
}

// Take what is on the table. The commonest ending, and usually the right one.
export function takeTheRoom(s) {
  const k = standoff(s), o = standoffOffer(s);
  if (!k || !o) { s.standoff = null; return s; }
  const p = k.pack;
  o.episodeFee = p.fee;
  o.episodes = p.episodes;
  o.salary = p.fee * p.episodes;
  if (p.points) o.tvPoints = p.points;
  if (p.producer) o.producing = true;
  if (p.directOne) o.directOne = true;
  o._settled = true;
  // A paper settled in a room is a paper. The clauses stop being arguable.
  if (o.contract) { for (const c of o.contract.clauses || []) { c.stance = 'ok'; c.ask = null; } o.contract.sent = null; }
  s.standoff = null;
  addTimeline(s, `Settled "${k.title}" in the room. ${Math.round((p.fee / p.was - 1) * 100)}% more an episode${p.points ? `, and ${p.points}% of the show` : ''}.`);
  s.lastEvent = `Hands shaken at twenty past four. ${Math.round((p.fee / p.was - 1) * 100)}% more an episode${p.points ? `, ${p.points} per cent of the back end` : ''}${p.producer ? ', your name in the front titles' : ''}${p.episodes < p.wasEpisodes ? `, and ${p.episodes} episodes instead of ${p.wasEpisodes}` : ''}. Nobody got what they came in for, which is how everybody knows it was a deal.`;
  return s;
}

// Go back once more. It works, or it costs you the room, or it costs the show.
export function pushTheRoom(s) {
  const k = standoff(s), o = standoffOffer(s);
  const fit = canPush(s);
  if (!fit.ok) { if (fit.why) s.lastEvent = fit.why; return s; }
  if (!k || !o) { s.standoff = null; return s; }
  spend(s, PUSH_COST);
  k.rounds += 1;
  const odds = clamp(k.pack.room - k.rounds * 14 + (tierIdx(s) >= 5 ? 12 : 0));
  if (chance(odds)) {
    k.pack = { ...k.pack, fee: Math.round(k.pack.fee * 1.16),
      points: k.pack.points ? k.pack.points + rint(1, 2) : (tierIdx(s) >= 4 && chance(45) ? rint(2, 3) : 0) };
    s.lastEvent = `They went out of the room for eleven minutes and came back with more. ${Math.round((k.pack.fee / k.pack.was - 1) * 100)}% an episode now${k.pack.points ? `, and ${k.pack.points}% of it` : ''}. Your agent has stopped writing things down, which is the tell.`;
    return s;
  }
  // No. And on the second no, the people who can end it are already in the building.
  if (k.rounds >= 2 && chance(42)) return closeTheShow(s, 'them');
  s.lastEvent = `Nothing moved. ${k.pack.mood} The offer on the table is the offer on the table, and somebody has started looking at their phone.`;
  return s;
}

// You end it. Nobody takes a show like this away from you — you leave it.
export function walkTheRoom(s) {
  const k = standoff(s);
  if (!k) return s;
  return closeTheShow(s, 'you');
}

function closeTheShow(s, who) {
  const k = standoff(s), o = standoffOffer(s);
  const title = k ? k.title : 'it';
  s.standoff = null;
  if (o) {
    s.offers = (s.offers || []).filter((x) => x.id !== o.id);
    s.inbox = (s.inbox || []).filter((m) => m.offerId !== o.id);
  }
  // Walking out of your own show is read as a spine or as trouble, depending who is asked.
  setRespect(s, (s.respect || 0) + (who === 'you' ? 1 : -1));
  addTimeline(s, `"${title}" is not coming back. The money could not be agreed and nobody will say so.`, true);
  s.lastEvent = who === 'you'
    ? `You said no, put your coat on, and left. There is no season ${(k ? k.season : 1) + 1}. The cast will hear this afternoon, the crew will read it tomorrow, and for about a year everybody will tell you it was the right call.`
    : `They closed the file at ten to five. There is no season ${(k ? k.season : 1) + 1} — not recast, not delayed, not made. A network would rather lose a show than set a number the whole town can read, and that is the part nobody tells you before your first one.`;
  return s;
}

// ── for the screen ────────────────────────────────────────────────────────────
export function liveStandoff(s) {
  const k = standoff(s);
  if (!k) return null;
  const p = k.pack;
  return {
    title: k.title, season: k.season, rounds: k.rounds, mood: p.mood,
    rise: Math.round((p.fee / p.was - 1) * 100),
    fee: p.fee, was: p.was, episodes: p.episodes, wasEpisodes: p.wasEpisodes,
    points: p.points, producer: p.producer, directOne: p.directOne,
    terms: [
      `${Math.round((p.fee / p.was - 1) * 100)}% more an episode`,
      p.points ? `${p.points}% of the show` : null,
      p.producer ? EXTRAS.producer.label : null,
      p.episodes < p.wasEpisodes ? `${p.episodes} episodes instead of ${p.wasEpisodes}` : null,
      p.directOne ? EXTRAS.directOne.label : null,
    ].filter(Boolean),
    pushCost: PUSH_COST,
    can: canPush(s),
  };
}
