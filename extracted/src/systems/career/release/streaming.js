// The streaming market at the drop: what a platform's season does in its first four weeks, from what
// release.js knows on the night (the names, the talk, what the crowd made of it) and the platform's own
// numbers (career/streaming.js, the platforms and the arithmetic). Moved out of release.js unchanged
// (Media release cleanup, 20 Oct 2026). The theatrical market is release/theatrical.js, television
// release/television.js.
import { getProject } from '../project.js';
import { platformById, platformOfKind, dropSeason, dropFilm, isPlatformFilm } from '../streaming.js';
import { planEpisodeCost } from '../budget.js';
import { wordFor, castDraw } from './theatrical.js';

// ── a platform's season (Streaming V1) ────────────────────────────────────────
// Four weeks to the number the platform judges, and a month of the tail after it.
export const STREAM_WEEKS = 8;
// On a supporting part the name above yours is the platform's own lead, a known face.
const HOUSE_LEAD = 45;
export function dropStreaming(s, rel, talk) {
  if (isPlatformFilm(rel)) return dropPlatformFilm(s, rel, talk);
  const pr = getProject(s, rel.projectId) || {};
  const platform = platformById(s, pr.platformId) || platformOfKind(s, 'library');
  const rootOf = (t) => String(t || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim();
  const root = rootOf(rel.title);
  // Last season on a platform: its finishers are this season's first week, and a Hit is pushed hard.
  const prev = (rel.season || 1) > 1 ? (s.filmography || []).find((c) => c.streaming && c.season === rel.season - 1 && rootOf(c.title) === root) : null;
  const names = rel.tier === 'supporting' ? [HOUSE_LEAD, s.fame || 0] : [s.fame || 0, rel.withFame || 0];
  const drop = dropSeason({ platform, genre: rel.genre, episodes: rel.episodes || 8, season: rel.season || 1,
    rating: rel.rating || 0, word: wordFor(rel), hype: (talk && talk.hype) || 0, draw: castDraw(names),
    salaryM: (rel.salary || 0) / 1e6,
    episodeCost: pr.episodeCost ?? planEpisodeCost({ seed: pr.seriesId || rel.projectId || root, genre: rel.genre, archetype: platform.archetype }),
    legacy: pr.legacy || 0,
    prev: prev ? { finished28: prev.finished28 || 0, views28: prev.views28 || 0, outcome: prev.verdict } : null,
    dice: 0.8 + Math.random() * 0.45 });
  return { platform, ...drop };
}

// ── a platform's film (Streaming Movies V1) ───────────────────────────────────
// What a film does in its four weeks on a platform: the names and the talk bring week one, what people
// tell each other brings the weeks after it, and what the room made of it decides how many finish it
// (career/streaming.js dropFilm). Judged against the whole film's all-in cost, or against the price a
// platform paid for a festival picture. A second part opens on the first one's audience.
const partRoot = (t) => String(t || '').replace(/⭐\s*/, '').replace(/\s+(II|III|IV|V|VI|\d+)$/, '').trim();
export function dropPlatformFilm(s, rel, talk) {
  const pr = getProject(s, rel.projectId) || {};
  const platform = platformById(s, pr.platformId || rel.platformId) || platformOfKind(s, 'library');
  const root = partRoot(rel.title);
  const prev = (rel.part || 1) > 1 ? (s.filmography || []).find((c) => isPlatformFilm(c) && (c.part || 1) === rel.part - 1 && partRoot(c.title) === root) : null;
  const names = rel.tier === 'supporting' ? [Math.max(HOUSE_LEAD, rel.withFame || 0), s.fame || 0] : [s.fame || 0, rel.withFame || 0];
  const drop = dropFilm({ platform, genre: rel.genre, rating: rel.rating || 0, word: wordFor(rel),
    crowd: rel.reception != null ? rel.reception : (rel.rating || 50), hype: (talk && talk.hype) || 0, draw: castDraw(names),
    budget: Number.isFinite(rel.budget) ? rel.budget : (pr.budget || 0), price: Number.isFinite(rel.price) ? rel.price : null,
    prev: prev ? { views28: prev.views28 || 0, outcome: prev.verdict } : null,
    dice: 0.8 + Math.random() * 0.45 });
  return { platform, ...drop };
}
