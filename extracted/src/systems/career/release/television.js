// The television market: who watches a season — what the slot draws, what last season left, how the
// name and the reviews move it. A season is judged on its audience, not on money (release.js verdictOf
// asks here through tvVerdict). Moved out of release.js unchanged (Media release cleanup, 20 Oct 2026);
// release.js still exports viewersFor. The theatrical market is release/theatrical.js, streaming
// release/streaming.js.
import { slotNorm } from '../franchise.js';

// Television does not sell tickets. It has an audience, in millions per episode.
const VIEWERS = { episode: [0.4, 6], recurring: [1, 9], prestige: [2, 14] };

// A good film sells more than a bad one, and the gap is enormous. That used to be a single curve
// — qualityPull — applied to the whole gross, which amounted to saying that how good a film is
// decides how many people turn up on the first weekend. Nobody has seen it on the first weekend.
// The same truth now lives in legsFor, where it belongs: quality decides how LONG a run lasts.
// Television, which is a different thing entirely. Maxi: "in life, does something rated
// 6.5 get six million watching, or fewer?" Six million is exactly right — and the question
// found that this used to run off the cinema curve, swinging the audience by a factor of
// NINE on the critics’ score alone. That is a game’s assumption, not a fact. Watching a
// series is a habit rather than a purchase: a crime procedural nobody reviews kindly
// out-draws a prestige drama with a nine, most weeks, because it is a crime procedural.
// Quality moves the number here. It does not decide it.
function watchPull(rating) {
  if (rating >= 90) return 1.35;
  if (rating >= 80) return 1.20;
  if (rating >= 70) return 1.08;
  if (rating >= 60) return 1.00;
  if (rating >= 45) return 0.88;
  return 0.72;
}
export function viewersFor(s, rel) {
  const span = VIEWERS[rel.scale] || VIEWERS.episode;
  const star = 0.8 + (s.fame || 0) / 250;
  // A show that is coming back already HAS an audience. Rolling a fresh number every season
  // meant a season rated 7.2 drew 8.9m, the next one rated 9.1 drew 3m and the one after
  // that drew 18m — the same programme, on the same night, with no explanation. An audience
  // is inherited and then it moves: a better season brings people, a worse one loses them.
  // A show you joined in its eighth year had an audience before you arrived — the number on
  // the listing (castings.js showAudience). Your season moves it, the same as any other.
  const prev = previousAudience(s, rel) ?? (rel.audience > 0 ? rel.audience : null);
  if (prev != null) {
    const move = rel.rating >= 85 ? 1.16 + Math.random() * 0.2
      : rel.rating >= 72 ? 1.02 + Math.random() * 0.12
      : rel.rating >= 60 ? 0.9 + Math.random() * 0.12
      : 0.68 + Math.random() * 0.16;
    return Math.round(Math.max(0.2, prev * move) * 10) / 10;
  }
  // What this KIND of thing draws, which is most of it. A soap has a soap audience and a
  // prestige series has a prestige one, whatever the column says about either. The scale
  // span is the fallback for anything with no slot of its own. franchise.js SLOT_NORM
  const norm = slotNorm(rel.type);
  const base = norm > 0
    ? norm * (0.55 + Math.random() * 1.35)
    : span[0] + Math.random() * (span[1] - span[0]);
  return Math.round(base * watchPull(rel.rating) * star * 10) / 10;
}
// What the season before this one drew, if there was one.
function previousAudience(s, rel) {
  if (!rel.season || rel.season < 2) return null;
  const root = String(rel.title || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim();
  const prev = [...(s.filmography || []), ...(s.discography || [])]
    .find((c) => c.season === rel.season - 1
      && String(c.title || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim() === root);
  // What the last season finished on is what this one starts from: the people still
  // watching in week ten are the people who come back in September.
  return prev ? (prev.endViewers > 0 ? prev.endViewers : (prev.viewers > 0 ? prev.viewers : null)) : null;
}

// How a season did, in the words television uses (release.js verdictOf).
export function tvVerdict(rel) {
  // Television is judged on how many turned up, not on the column. Maxi: "thirty-seven
  // million are watching a hit, and the game is calling it ignored." Quite. A procedural
  // nobody reviews kindly and everybody watches is the most-seen thing on television, and
  // "ignored" should mean what the word means: nobody was there.
  const drew = rel.endViewers || rel.viewers || 0;
  // Before the run has finished there is no audience yet, so the score stands in for it.
  if (!drew) return rel.rating >= 78 ? 'watched' : rel.rating >= 55 ? 'seen' : 'ignored';
  const pull = drew / (slotNorm(rel.type) || 2.6);
  if (pull >= 1.35 || (pull >= 0.95 && (rel.rating || 0) >= 72)) return 'watched';
  if (pull >= 0.7) return 'seen';
  return 'ignored';
}
