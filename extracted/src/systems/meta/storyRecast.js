// The recast thread ("Without you") and the sequel you did not come back for: what the fans make of
// it, the second no that burns the bridge, and the queue. Split out of stories.js with nothing
// changed; the chain itself stays there.
import { rint, chance } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { setRespect } from './status.js';
import { personName, namesInUse } from '../world/names.js';
import { loseContinuation, recordForTitle } from '../career/continuation.js';
import { slotNorm } from '../career/franchise.js';
import { clamp, stamp, money, first, stories, storyOf } from './storyState.js';

// What the recast thread has come to, in words: which season or part, who has your part, and
// how it went — each of those is on st.data by the time the line can be shown.
export function recastStatus(s, st) {
  const d = st.data, tv = d.kind === 'renewal';
  const root = d.root || String(d.title || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').replace(/\s+(II|III|IV|V|VI)$/, '');
  const which = tv ? `Season ${d.season || 2} of "${root}"` : `"${d.title}"`;
  if (st.beat === 'meeting') return `${which}: they will make it anyway. ${first(d.director)} has asked to meet.`;
  if (st.beat === 'answer') return `${which}: the paper came back changed. They are waiting.`;
  if (st.beat === 'again') {
    const f = recordForTitle(s, d.title);
    const who = f && f.rec.by ? `${f.rec.by.name} has your part` : d.other ? `${d.other} has your part` : 'Somebody else has your part';
    // What the record knows beats what an old thread rolled.
    const x = f && f.rec.result;
    if (x && tv) return `${which} went out without you. ${who}, and ${x.renewed ? 'the network has ordered another' : 'it was not renewed'}.`;
    return tv ? `${which} went out without you. ${who}, and the numbers held.`
      : `${which} opened without you${d.gross ? ` at ${money(d.gross)}` : ''}. ${who}, and it did fine.`;
  }
  return `${which} is being made with somebody else in your part.`;
}
// How long until it comes out, from the record: that is when the trades can say how it did.
export function monthsToIt(s, st) {
  const f = recordForTitle(s, st.data.title);
  return f && f.rec.due != null ? Math.max(1, f.rec.due - stamp(s)) : rint(12, 18);
}
// You went back: on a set, finished and in post (which this used to miss, so the trades announced a
// recast of a season about to open with you in it), on your record lately, or a signed paper.
export function wentBack(s, st) {
  const t = String(st.data.title || '').replace('⭐ ', '');
  const mine = (x) => !!x && String(x.title || '').replace('⭐ ', '') === t;
  const sets = (s.productions || []).concat(s.production ? [s.production] : []);
  return sets.some(mine) || (s.releases || []).some(mine) || (s.filmography || []).some((c) => mine(c) && (c.year || 0) >= (s.year || 0) - 2) || (s.offers || []).some((o) => o.story === 'recast' && o.signed);
}
// The second no. Very expensive, and the director is gone for good.
// What the second no costs — one number, read by the choice that shows it, by the bridge that burns
// and by the warning on Pass (career/offers.js declineConsequences).
export const BURN_STANDING = 8, BURN_SCANDAL = 4;
export function burnShows(st) { return { fx: { respect: -BURN_STANDING, scandal: BURN_SCANDAL }, more: [{ t: `${first(st.data.director)} never works with you again`, good: false }] }; }
export function burnTheBridge(s, st) {
  st.data.burned = true;
  setRespect(s, (s.respect || 0) - BURN_STANDING);
  s.scandal = clamp((s.scandal || 0) + BURN_SCANDAL);
  (s.grudges = s.grudges || []).push({ who: st.data.director, title: st.data.title, scale: st.data.scale, since: stamp(s), due: stamp(s) + 9999, until: stamp(s) + 9999, hit: false, gross: 0, opened: true });
  const p = (s.people || []).find((x) => x.name === st.data.director); if (p) { p.cold = true; p.relationship = Math.min(p.relationship || 0, 5); }
  addTimeline(s, `${st.data.director} will not work with you again. Not a rumour: they said it to the trades.`, true);
}
// A lead who was asked back and did not come: passed, let the paper lapse, or pushed the
// talks until they stopped answering (offers.js, contract.js). The fans are furious now;
// the director writes in two months.
// Called by career/continuation.js loseContinuation, which has already written the fact down — on the
// credit and in the ledger — whatever happens here. This is only what people make of it.
export function noteSequelLoss(s, o, how, rec = null, src = null) {
  if (!o || (o.kind !== 'sequel' && o.kind !== 'renewal') || o.tier === 'supporting') return;
  const title = String(o.projectTitle || '').replace('⭐ ', '');
  const root = o.kind === 'renewal' ? (o.seriesTitle || title) : title.replace(/\s+(II|III|IV|V|VI)$/, '');
  const st = storyOf(s, 'recast');
  // The second no, after the meeting: it goes ahead without you, and the trades tell you how the
  // month it comes out.
  if (o.story === 'recast' && st) { burnTheBridge(s, st); st.beat = 'without'; st.due = Math.max(stamp(s) + 1, (rec && rec.due) || stamp(s) + rint(12, 18)); return; }
  // The fans. Not every recast is a scandal (Maxi/ChatGPT, 22 Oct): it depends on how much the show
  // meant to people, how long they have lived with it, and whose doing it looks like. A show nobody
  // watched recasts in a paragraph. And nobody's standing moves because a negotiation did not close —
  // walking out of an option (offers.js) and walking out of the room (standoff.js) cost what they cost there.
  const mood = fansOf(o, how, src);
  const onYou = how !== 'writtenOut' && how !== 'network' && how !== 'exit';
  if (mood === 'furious' && onYou) {
    s.scandal = clamp((s.scandal || 0) + 3);
    addTimeline(s, how === 'schedule'
      ? (o.kind === 'renewal' ? `Fans are furious: you could not free yourself for season ${o.season} of "${root}", and they are recasting.` : `Fans are furious: you were on another set and "${title}" is going ahead without you.`)
      : how === 'notMade' ? `Fans are furious: there will be no ${o.kind === 'renewal' ? `season ${o.season} of "${root}"` : `"${title}"`}, and they have decided whose fault that is.`
      : (o.kind === 'renewal' ? `Fans are furious: you are not coming back for season ${o.season} of "${root}".` : `Fans are furious: "${title}" is going ahead without you.`), true);
  } else if (mood === 'furious') addTimeline(s, `Fans are furious with the network: your character is gone from "${root}". Some of the anger is on your side.`);
  else if (mood === 'sorry') addTimeline(s, o.kind === 'renewal' ? `"${root}" goes on without you. The fans are sorry to see you go; the trades give it a paragraph.` : `"${title}" goes ahead without you. A paragraph in the trades, and some disappointed fans.`);
  // The director's letter is for a part you could still go back to.
  if (how === 'writtenOut' || how === 'network' || how === 'notMade' || how === 'exit' || how === 'option') return;
  const source = src || (s.filmography || []).find((c) => !c.minor && (c.title === root || c.title === title)) || {};
  const director = source.director || personName(chance(50) ? 'female' : 'male', namesInUse(s));
  const data = { title, root, kind: o.kind, part: o.part || 0, season: o.season || 0, scale: o.scale, director, how, offer: { ...o, contract: undefined, signed: false, sent: false, waitsForWrap: false, startAt: 0, _warned: 0, deadline: 4 } };
  // One "Without you" at a time — the next one waits its turn instead of never happening.
  if (st) {
    const q = (s.recastQueue = s.recastQueue || []);
    if (!q.some((x) => x.title === title) && st.data.title !== title) q.push({ ...data, queued: stamp(s) });
    return;
  }
  stories(s).push({ id: 'recast', beat: 'meeting', due: stamp(s) + 2, since: stamp(s), data });
}
// What the fans would make of it, asked before it happens (the warning on Pass): a reading, not a promise.
export function fanMood(o, how, src) { return o && o.tier !== 'supporting' ? fansOf(o, how, src) : 'quiet'; }
// How much the show or the film meant to the people watching it, and whose doing the loss looks like.
function fansOf(o, how, src) {
  if (!src) return 'quiet';
  let pull;
  if (o.kind === 'sequel') pull = src.worldHit || src.status === 'World Hit' ? 2.5 : ({ smash: 2, profitable: 1.3, 'broke even': 0.8, bomb: 0.4, breakout: 2, hit: 1.4, solid: 0.9, miss: 0.4 }[src.verdict] ?? 0.8);
  else if (src.streaming) pull = (src.views28 || 0) / 30;
  else pull = (src.endViewers || src.viewers || 0) / slotNorm(src.type);
  const lived = o.kind === 'renewal' ? Math.min(0.6, Math.max(0, ((o.season || 2) - 2) * 0.15)) : 0;
  // How strongly they feel. Whose doing it looks like decides only who they are angry with (onYou in
  // noteSequelLoss): a hit show that writes out its lead has furious fans, furious with the network.
  const strength = { passed: 1.2, option: 1.2, meeting: 1.1, schedule: 0.9, exit: 0.4 }[how] ?? 1;
  const v = (Math.min(3, pull) + lived) * strength;
  return v >= 1.6 ? 'furious' : v >= 0.9 ? 'sorry' : 'quiet';
}
// The next "Without you" in the queue (the chain's start). A part you could still go back to gets the
// director's letter; one already being made without you gets the news the month it comes out; one
// the trades have already told is done.
export function nextQueuedRecast(s) {
  const q = s.recastQueue || [];
  while (q.length) {
    const d = q.shift();
    const found = recordForTitle(s, d.title);
    if (!found || found.rec.told || found.rec.you === 'returned') continue;
    const late = found.rec.due != null && found.rec.due - ((d.offer && d.offer.months) || 4) - 2 <= stamp(s);
    return { ...d, beat: late ? 'without' : 'meeting', due: late ? Math.max(stamp(s), found.rec.due) : stamp(s) + 1 };
  }
  return null;
}
// A "Without you" already running from before the record existed: its record is written now, from
// the offer it carries, so what it tells is the same arithmetic as everybody else's.
export function recordFor(s, st) {
  let found = recordForTitle(s, st.data.title);
  if (!found && st.data.offer) {
    loseContinuation(s, { ...st.data.offer, story: undefined }, st.data.how || 'talks', { quiet: true, at: st.since });
    found = recordForTitle(s, st.data.title);
  }
  return found;
}
