// The working title. Maxi: "let the player edit the name and write their own — it is much
// more interesting." And it is how films actually work: nothing is called what it was called
// on the call sheet. Star Wars shot as The Adventures of Luke Starkiller; Pretty Woman shot
// as 3000; Back to the Future was very nearly Spaceman from Pluto. The title is provisional
// from the first day of shooting until the night it opens, and then it is the name of a film
// that exists and nobody can change it.
//
// One rule, and it is the in-world one: you can rename anything that has not opened yet —
// the set you are on, the picture sitting in post — and nothing that has. A show that has
// already had a season on air has a name; only its first season is a working title.
import { addTimeline } from '../../engine/timeline.js';

export const TITLE_MAX = 48;
const clean = (t) => String(t || '').replace(/\s+/g, ' ').trim();
const root = (t) => String(t || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim();
const same = (a, b) => clean(a).toLowerCase() === clean(b).toLowerCase();

// Everything you could rename right now, newest first: the sets, then the queue in post.
export function renameable(s) {
  const out = [];
  for (const p of (s.productions || [])) out.push({ kind: 'set', id: p.id, title: p.title, what: (p.prepLeft || 0) > 0 ? 'preparing' : 'shooting' });
  for (const r of (s.releases || [])) out.push({ kind: 'release', id: r.id, title: r.title, what: 'in post' });
  return out;
}
export function canRename(s, kind, id) {
  const it = kind === 'set' ? (s.productions || []).find((p) => p.id === id) : (s.releases || []).find((r) => r.id === id);
  if (!it) return { ok: false, why: 'That is not yours to name.' };
  // A show that has been on has a name. Only a first season is still a working title.
  const series = it.seriesTitle || (it.season > 1 ? root(it.title) : '');
  if (series && (s.filmography || []).some((c) => root(c.title) === root(series) && !c.running)) {
    return { ok: false, why: 'The show has been on the air. It has a name now.' };
  }
  return { ok: true };
}
// Why a name will not do, or null.
export function whyNot(s, kind, id, title) {
  const fit = canRename(s, kind, id);
  if (!fit.ok) return fit.why;
  const it = kind === 'set' ? (s.productions || []).find((p) => p.id === id) : (s.releases || []).find((r) => r.id === id);
  const t = clean(title);
  if (t.length < 2) return 'It needs a name.';
  if (t.length > TITLE_MAX) return `${TITLE_MAX} characters. A poster is only so wide.`;
  const taken = [
    ...(s.filmography || []).map((c) => c.title), ...(s.discography || []).map((c) => c.title),
    ...(s.releases || []).filter((r) => r.id !== id).map((r) => r.title),
    ...(s.productions || []).filter((p) => p.id !== id).map((p) => p.title),
    // not the paper this very project was signed on, which carries its own name
    ...(s.offers || []).filter((o) => o.id !== (it.offerId || '')).map((o) => String(o.projectTitle || '').replace('⭐ ', '')),
    ...(s.frozen || []).map((f) => f.title),
  ];
  if (taken.some((x) => same(root(x), root(t)) || same(x, t))) return 'You have already made something with that name.';
  return null;
}
// Rename it. A season keeps its number; the rest of the paper follows the name.
export function rename(s, kind, id, title) {
  const bad = whyNot(s, kind, id, title);
  if (bad) { s.lastEvent = bad; return s; }
  const t = clean(title);
  const it = kind === 'set' ? (s.productions || []).find((p) => p.id === id) : (s.releases || []).find((r) => r.id === id);
  const was = it.title;
  const season = it.season > 1 ? ` · season ${it.season}` : '';
  it.title = t + season;
  it.named = true;
  if (it.seriesTitle) it.seriesTitle = t;
  if (kind === 'set') {
    // The paper you signed and anything scheduled off it follow the name.
    const o = (s.offers || []).find((x) => x.id === it.offerId);
    if (o) { o.projectTitle = (String(o.projectTitle || '').startsWith('⭐ ') ? '⭐ ' : '') + it.title; if (o.seriesTitle) o.seriesTitle = t; }
  } else if (it.job) {
    it.job.title = it.title;
    if (it.job.seriesTitle) it.job.seriesTitle = t;
  }
  addTimeline(s, `"${was}" is called "${it.title}" now. Nothing is called what it was called on the first day.`);
  s.lastEvent = `The working title was "${was}". It is "${it.title}" now — which is what a working title is for.`;
  return s;
}
