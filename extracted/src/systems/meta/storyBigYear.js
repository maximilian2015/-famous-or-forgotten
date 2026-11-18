// The big stories of a busy year — the takeover and the strike: the pieces their chains in stories.js
// call. Split out of stories.js with nothing changed; the chains themselves stay there.
import { rint, chance, pick } from '../../engine/rng.js';
import { uid } from '../../engine/id.js';
import { addTimeline } from '../../engine/timeline.js';
import { count } from '../../engine/text.js';
import { sets } from '../../engine/sets.js';
import { quoteFor } from './status.js';
import { applyBond } from '../life/bonds.js';
import { newTitle } from '../world/titles.js';
import { GENRES } from './news.js';
import { rollStability, freezeProject, thawOffer } from '../career/stability.js';
import { keyFor, remember } from './memory.js';
import { directorById } from '../world/directors.js';
import { stamp, first } from './storyState.js';

// ── the takeover's pieces ─────────────────────────────────────────────────────────
// A month's chance, in a busy year, on a studio picture. About once in a long career.
export const TAKEOVER_ODDS = 8;
// What the review does to a picture nobody argued for: a coin.
export const QUIET_ODDS = 50;
// Who buys a studio. Never a real one; sometimes another studio of this world.
export const BUYERS = ['a streaming company with more subscribers than films', 'a private-equity fund that has never made a film', 'a phone company that wants a library'];
// A studio's own picture, still shooting long enough for a review to reach it: not an indie (nobody
// sells a studio from under an indie), not television, not a day as the face of a brand, and not a
// shoot that already belongs to another story.
export const studioPicture = (p) => /^(feature|blockbuster|prestige)$/.test(p.scale || '') && !p.episodes && !p.brand && !p.story && (p.monthsLeft || 0) >= 2;
export const takeoverSet = (s, st) => sets(s).find((p) => p.id === st.data.setId) || null;
// Lunch with the new owners: a name is worth keeping to them, so the bigger yours is, the likelier
// they keep the picture you are in.
export const ownerOdds = (s) => Math.round(Math.min(85, 35 + (s.fame || 0) * 0.5));
// The director remembers the week (meta/memory.js), and in your phone the friendship moves.
export function felt(s, st, p, by, why, bond) {
  const c = p && (p.crew || [])[0];
  if (!c) return;
  const key = keyFor(s, c, p);
  st.data.dirId = c.knownId || null;
  if (key) remember(s, { act: 'takeover', p, about: key, felt: { [key]: { felt: by, why } } });
  const person = c.knownId ? (s.people || []).find((x) => x.id === c.knownId) : null;
  if (person) applyBond(s, person, bond, { seen: bond > 0 });
}
// A year on, whether the director calls (ChatGPT, 15 Nov: standing by them must not be a sure way to
// a part). Three things, each 0–100: whether they can get anything made — the roster's standing, which
// moves with their films (world/directors.js), or for a director off the roster a working 45, 30 if the
// takeover shelved their picture; whether they still want you — how close you are; and whether the money
// will take you — your Standing. Most of the time it is a coin with weight on it, not a promise.
export function directorCall(s, d) {
  const r = d.rosterId ? directorById(s, d.rosterId) : null;
  const pull = r ? r.standing || 0 : d.shelved ? 30 : 45;
  const p = d.dirId ? (s.people || []).find((x) => x.id === d.dirId) : null;
  const close = p ? p.relationship || 0 : 50;
  const name = Math.max(0, s.respect || 0);
  return { pull, close, name, odds: Math.round(Math.max(10, Math.min(90, 5 + name * 0.35 + close * 0.3 + pull * 0.3))) };
}
// The new owners want a name, and only while it is one.
export const ownerCall = (s) => Math.round(Math.max(15, Math.min(90, 15 + (s.fame || 0) * 0.8)));
// Nobody calls: said with the reason — for a director the weakest of the three, for the new owners
// your name or their own churn. What was felt the week of the sale stays felt (meta/memory.js).
export function takeoverSilence(s, st) {
  const d = st.data, f = first(d.director);
  const noted = (reply, extra = {}) => [{ label: 'Noted', shows: { ...extra.shows, more: [...((extra.shows || {}).more || []), { t: 'no offer', good: false }] },
    apply: () => { if (extra.apply) extra.apply(); return { reply, end: true }; } }];
  if (d.path !== 'director') {
    const small = (s.fame || 0) < 50;
    return { speaker: 'The trades', text: `${small ? `The new ${d.studio} is making its first big picture, and the lead went to a bigger name than yours is this year. ${first(d.exec)} sent flowers.` : `${d.exec} is gone: the new owners of ${d.studio} changed heads of production twice this year, and whatever the lunch bought you went out of the door with them.`} ${f} gave an interview about the takeover last month. Your name is not in it, which is how you know it is about you.`,
      choices: noted('Lunch is not a contract.') };
  }
  const c = directorCall(s, d);
  const why = c.pull <= Math.min(c.close, c.name) ? 'pull' : c.close <= c.name ? 'close' : 'name';
  const fz = (s.frozen || []).find((x) => x.title === d.title);
  if (fz && why === 'pull') return { speaker: d.director, text: `${f} tried to buy "${d.title}" back from the new owners of ${d.studio}. The bank wanted a director with a hit behind them, and ${f} has not had one since the takeover. It stays in the freezer.`,
    choices: noted('Standing next to somebody is not a contract.') };
  if (fz) return { speaker: 'The trades', text: why === 'close' ? `${f} bought "${d.title}" back from the new owners of ${d.studio}, and is finishing it with somebody else in your part. You have not really spoken since the takeover, and it shows.` : `${f} bought "${d.title}" back, and the money would only pay for it with a bigger name than yours in your part. ${f} rang to tell you themself, which most directors would not.`,
    choices: noted('Somebody else will finish your part.', { shows: { fx: { mental: -2 }, more: [{ t: `"${d.title}" goes on without you`, good: false }] },
      apply: () => { s.frozen = (s.frozen || []).filter((x) => x !== fz); s.mental = Math.max(0, (s.mental || 50) - 2); addTimeline(s, `"${d.title}" came out of the freezer with somebody else in your part.`, true); } }) };
  return { speaker: why === 'close' ? 'The trades' : d.director, text: why === 'pull' ? `${f} has not made anything since the takeover. Nobody will put money behind the director who argued with the new owners of ${d.studio}. They still tell the story at dinners, and you are in it.`
    : why === 'close' ? `${f} is making their next one, and the part went to somebody else. You have not really spoken since the takeover, and it shows.`
    : `${f} sent their next one to you, and the money sent it back: they wanted a name with more weight than yours is this year. ${f} rang to say so themself, which most directors would not.`,
    choices: noted('Standing next to somebody is not a contract.') };
}
// What a year on is worth: the director's next film, or the new owners' first big picture.
export function takeoverOffer(s, st, side) {
  const d = st.data, genre = pick(GENRES);
  const big = side === 'owner';
  const quote = quoteFor(s, big ? 'film_tentpole' : 'film_studio') || quoteFor(s, 'film_studio') || 200000;
  (s.offers = s.offers || []).push({ id: uid(s, 'off'), via: big ? 'studio' : 'director', kind: 'takeover', from: big ? d.studio : d.director,
    director: big ? undefined : d.director, directorId: big ? undefined : d.dirId || undefined,
    projectTitle: newTitle(s, genre), role: 'Lead', type: 'Feature Film', genre, salary: Math.round(quote * (big ? 1.15 : 0.9)), months: rint(3, big ? 6 : 4),
    fame: big ? 8 : 5, prestigeScore: big ? rint(35, 60) : rint(55, 80), tier: 'lead', scale: big ? 'blockbuster' : 'feature', stability: rollStability(big ? 'blockbuster' : 'feature'), deadline: 3,
    note: big ? `${first(d.exec)} asked for you. The new owners of ${d.studio} remember who was easy.` : `${first(d.director)} asked for you first. They remember who was in the room when ${d.studio} was sold.` });
}

// ── the strike's pieces ───────────────────────────────────────────────────────────
// No strike for ten years after the last one; then the chance a month climbs from nothing to 1.5%
// over the next fifteen. About one in fifteen to twenty years.
export const strikeOdds = (calm) => (calm < 120 ? 0 : Math.min(1.5, ((calm - 120) / 180) * 1.5));
// That the advert stays a secret.
export const AD_HIDDEN = 65;
export const adFee = (s) => Math.round(Math.max(40000, (quoteFor(s, 'film_indie') || 60000) * 0.8));
// Whether the business is on strike this month (s.strike, read by strain.js canWork without asking here).
export const striking = (s) => !!s.strike && s.strike.until > stamp(s);
// The parts on your desk wait while it lasts, and through the month it ends, so the first month
// back is a month to answer them in (offers.js offersTick).
export const offersWait = (s) => !!s.strike && s.strike.until >= stamp(s);
// The day it starts: every set of yours into the freezer, held for the day it ends, and no
// pay-or-play — a strike is force majeure. Every picture of yours due to open before it is over,
// or the month after, is moved back: nobody can promote it. While it lasts the parts on your desk
// do not lapse (offers.js offersTick), and a paper signed for a date inside it waits: it cannot start
// while canWork says no, and nobody casts elsewhere during a strike.
export function beginStrike(s, months) {
  const now = stamp(s), until = now + months;
  s.strike = { since: now, until };
  const stopped = [], moved = [];
  for (const p of sets(s).slice()) { if (p.brand) continue; freezeProject(s, p, { why: 'the actors are on strike', held: 'strike', quiet: true, forceMajeure: true }); stopped.push(p.title); }
  for (const r of s.releases || []) {
    if (r.due > until + 1) continue;                       // opens after it anyway
    const by = Math.max(0, until - r.due) + rint(2, 6);
    r.due += by; r.wait = (r.wait || 0) + by;              // "in post since" stays where it was (Diary.jsx)
    moved.push({ title: r.title, by });
    addTimeline(s, `"${r.title}" was moved back ${count(by, 'month')}. Nobody can promote a picture during a strike.`);
  }
  // The casting offices are shut too: a read you are waiting to hear about answers the first month
  // back, and its date says so (OpenCall.jsx, Diary.jsx). The rest of the calls owed you are held in
  // the month itself (engine/time.js, offersWait).
  for (const x of s.submissions || []) if (x.due <= until) x.due = until + 1;
  addTimeline(s, `The actors' guild is on strike. Every set in the business has stopped.`, true);
  return { stopped, moved };
}
// What the day it ends does to each picture it stopped, by how solid its money was (stability.js):
// a studio's own picture nearly always comes back, smaller; money nobody could name goes somewhere
// else, or the studio calls it force majeure and tears up the paper. And a third of the parts on
// your desk that nobody has signed are pulled when the studios cut their slates.
const STRIKE_DEAD = (f) => Math.round(Math.min(50, 10 + Math.max(0, 92 - (f.stability ?? 70)) * 0.7));
const STRIKE_COLD = (f) => Math.round(Math.min(40, 15 + Math.max(0, 92 - (f.stability ?? 70)) * 0.5));
const SLATE_CUT = 35;
export const STRIKE_LOSS = 4;   // mental, when a picture of yours does not survive it
export const heldByStrike = (s, id) => (s.frozen || []).some((f) => f.id === id && f.held === 'strike');
export function strikeFates(s, desk) {
  const pics = (s.frozen || []).filter((f) => f.held === 'strike').map((f) => {
    const fate = chance(STRIKE_DEAD(f)) ? 'dead' : chance(STRIKE_COLD(f)) ? 'cold' : 'back';
    return { id: f.id, title: f.title, fate, cut: fate === 'back' ? rint(15, 35) : 0 };
  });
  const onDesk = (o) => !desk || desk.includes(o.id);   // not a part that came in the month it ended
  const pulled = (s.offers || []).filter((o) => onDesk(o) && o.kind !== 'brand' && !o.signed && chance(SLATE_CUT)).map((o) => ({ id: o.id, title: o.projectTitle || o.title || 'a part' }));
  return { pics, pulled };
}
// The day it ends. A paper signed for a date inside the strike starts from today: the date moved
// with everything else, so business affairs' two months of holding it (contract.js) start now too.
export function endStrike(s, pics, pulled) {
  s.strike = null; s._strikeCalm = stamp(s);
  for (const o of s.offers || []) if (o.signed && o.startAt != null && o.startAt < stamp(s)) o.startAt = stamp(s);
  for (const x of pics) {
    const f = (s.frozen || []).find((y) => y.id === x.id); if (!f) continue;
    if (x.fate === 'back') {
      f.owed = Math.round((f.owed || 0) * (1 - x.cut / 100));
      thawOffer(s, f, `The strike is over and it ate the budget. They want to finish it — the same part, ${x.cut}% less for the rest: €${f.owed.toLocaleString()}.`);
    } else if (x.fate === 'cold') {
      f.held = null; f.why = 'the money went somewhere else during the strike';   // an ordinary freeze from here (frozenTick)
      addTimeline(s, `"${f.title}" did not come back after the strike. The money went somewhere else while the sets were dark.`, true);
    } else {
      s.frozen = s.frozen.filter((y) => y !== f);
      addTimeline(s, `"${f.title}" was cancelled after the strike. The studio called it force majeure.`, true);
    }
  }
  if (pics.some((x) => x.fate === 'dead')) s.mental = Math.max(0, (s.mental || 50) - STRIKE_LOSS);
  if (pulled.length) {
    const gone = new Set(pulled.map((x) => x.id));
    s.offers = (s.offers || []).filter((o) => !gone.has(o.id));
    addTimeline(s, `The studios cut their slates after the strike: ${pulled.map((x) => `"${x.title}"`).join(', ')} pulled.`);
  }
}
// The actors in your phone: the picket line or the advert, they all hear.
export function colleagues(s, by, seen) {
  for (const p of s.people || []) if (p.role === 'Fellow Actor' && p.alive !== false) applyBond(s, p, by, { seen });
}
