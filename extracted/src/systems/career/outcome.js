// How a piece of work turned out, in one shape for every market (Media Ecosystem, stage 2).
//
// Each market keeps its own result and its own words — a theatrical picture has a gross, what it
// needed and a verdict on the money; a television season has an audience, a finale and a renewal; a
// festival picture can come home with no buyer at all. Systems that only ask "did it work?" — fame,
// hype, Known For, the press, the factions, a party, a favour — read them here instead of switching
// on the strings, so the next market (streaming) and the next set of words (the theatrical verdict
// names) change one file, not twelve.
//
// The grade is an ADAPTER beside the native result, never instead of it:
//   −2 disaster · −1 weak · 0 okay · +1 success · +2 hit · +3 phenomenon (not given yet, see below)
//
//   theatrical   bomb −2 · broke even 0 · profitable +1 · smash +2 · (no break-even: 'seen') 0
//                a World Hit is NOT a grade. It is its own flag, `worldHit`, beside the grade: a
//                €700m tentpole that only covered its cost is a world hit and grades 0. The game's
//                World Hit is huge and not hated (release.js isWorldHit: €700m with word of mouth
//                58+, or twelve times its costs and loved) — reach, mostly; and the grade is how the
//                work did on its own terms. Mixing them would count a world hit twice, once here and
//                once in the fame it already earns as a flag. +3 is left for a real Global Phenomenon,
//                defined later from reach together with a crowd that loved it (Maxi, 20 Oct).
//   festival     prize or sold → the run is judged like any picture · unsold → not judged: nobody
//                saw it, so nobody holds it against you (release.js)
//   television   ignored −1 · seen 0 · watched +1 · the renewal is its own field, not a grade
//   other work   a day's work (an advert, a cover, a voice session, a day as an extra) is `career:
//                false` with no grade: never a career hit, whatever it was rated
//   in progress  `pending`, no grade
//
// Stage 2 moves nothing, so a piece of work is judged the way the code judges it today: a film scale
// as a picture, everything else that opened as television (release.js isFilm). The project's medium
// rides along as information. A late-career reality format or convention is medium 'other' on its
// project but goes through the television path, as it always did — whether that counts as career
// work is the market values' question (stage 4).
import { projectOf } from './project.js';

// release.js isFilm, repeated: release.js reads this file, so it cannot be imported back.
const FILM = new Set(['small', 'indie', 'festival', 'feature', 'blockbuster']);
const MONEY = { bomb: -2, 'broke even': 0, profitable: 1, smash: 2, seen: 0 };
const AUDIENCE = { ignored: -1, seen: 0, watched: 1 };

export function projectOutcome(s, c) {
  if (!c) return null;
  const p = projectOf(s, c);
  // The word itself first — only a picture is a smash, only a season is watched — and the scale only
  // for 'seen', which both use. A very old credit without a scale is still read by its verdict.
  const v = c.verdict;
  const judged = v === 'smash' || v === 'profitable' || v === 'broke even' || v === 'bomb' || v === 'unsold' ? 'theatrical'
    : v === 'watched' || v === 'ignored' ? 'television'
    : FILM.has(c.scale) ? 'theatrical' : 'television';
  const out = { judged, medium: p ? p.medium : null, career: !c.minor, pending: !!c.running,
    grade: null, verdictGrade: null, worldHit: !!(c.worldHit || c.status === 'World Hit'), label: c.verdict || null,
    money: null, audience: null, festival: c.festival ? (c.festival.result || null) : null };
  if (!out.career || out.pending) return out;
  if (judged === 'television') {
    out.verdictGrade = AUDIENCE[c.verdict] ?? null;
    out.audience = { viewers: c.viewers || 0, open: c.openViewers || 0, end: c.endViewers || 0, renewal: c.renewal || null };
  } else if (c.verdict !== 'unsold') {
    out.verdictGrade = MONEY[c.verdict] ?? null;
    out.money = { verdict: c.verdict || null, gross: c.boxOffice || 0, needed: c.needed || 0 };
  }
  out.grade = out.verdictGrade;   // never overridden by the world-hit flag
  return out;
}

// The questions the readers actually ask, each answered in one place.
const money = (o) => !!o && o.money != null;
export const isSmash = (o) => money(o) && o.money.verdict === 'smash';
export const isProfitable = (o) => money(o) && o.money.verdict === 'profitable';
export const isBrokeEven = (o) => money(o) && o.money.verdict === 'broke even';
export const isBomb = (o) => money(o) && o.money.verdict === 'bomb';
// The money counts only when the film MADE money: the verdict, never the gross (knownFor.js).
export const madeMoney = (o) => isSmash(o) || isProfitable(o);
export const isWatched = (o) => !!o && o.audience != null && o.verdictGrade === 1;
export const isSeen = (o) => !!o && o.audience != null && o.verdictGrade === 0;
export const isIgnored = (o) => !!o && o.audience != null && o.verdictGrade === -1;
// The audience stayed away — a bomb in cinemas, an ignored season on television.
export const wentBadly = (o) => isBomb(o) || isIgnored(o);
