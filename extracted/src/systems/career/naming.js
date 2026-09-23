// The working title. Maxi: "let the player edit the name and write their own — it is much
// more interesting." And it is how films actually work: nothing is called what it was called
// on the call sheet. Star Wars shot as The Adventures of Luke Starkiller; Pretty Woman shot
// as 3000; Back to the Future was very nearly Spaceman from Pluto. The title is provisional
// from the day you sign until the night it opens, and then it is the name of a film that
// exists and nobody can change it.
//
// One rule, and it is the in-world one: you can rename anything that has not opened yet —
// the paper you signed, the set you are on, the picture sitting in post — and nothing that
// has. A show that has already had a season on air has a name; only its first season is a
// working title.
import { addTimeline } from '../../engine/timeline.js';

export const TITLE_MAX = 48;
const clean = (t) => String(t || '').replace(/\s+/g, ' ').trim();
const root = (t) => String(t || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim();
const same = (a, b) => clean(a).toLowerCase() === clean(b).toLowerCase();

// The three things a project can be, and how to read and write the name of each. A signed
// paper carries its title with the studio's star on the front, which is not part of the name.
const KINDS = {
  offer: { list: (s) => (s.offers || []).filter((o) => o.signed), title: (o) => String(o.projectTitle || '').replace('⭐ ', ''),
    set: (o, t) => { o.projectTitle = (String(o.projectTitle || '').startsWith('⭐ ') ? '⭐ ' : '') + t; }, what: () => 'signed' },
  set: { list: (s) => (s.productions || []), title: (p) => p.title, set: (p, t) => { p.title = t; },
    what: (p) => ((p.prepLeft || 0) > 0 ? 'preparing' : 'shooting') },
  // A release keeps a copy of the shoot it came from (release.js job), and the show's name
  // lives on that copy — the renewal is built from it, so it has to follow.
  release: { list: (s) => (s.releases || []), title: (r) => r.title, series: (r) => (r.job && r.job.seriesTitle) || r.seriesTitle || '',
    set: (r, t, bare) => { r.title = t; if (r.seriesTitle) r.seriesTitle = bare; if (r.job) { r.job.title = t; if (r.job.seriesTitle) r.job.seriesTitle = bare; } }, what: () => 'in post' },
};
function itemOf(s, kind, id) {
  const k = KINDS[kind]; if (!k) return null;
  return k.list(s).find((x) => x.id === id) || null;
}
// Everything you could rename right now: the papers, then the sets, then the queue in post.
export function renameable(s) {
  const out = [];
  for (const kind of ['offer', 'set', 'release']) {
    for (const x of KINDS[kind].list(s)) out.push({ kind, id: x.id, title: KINDS[kind].title(x), what: KINDS[kind].what(x) });
  }
  return out;
}
export function canRename(s, kind, id) {
  const it = itemOf(s, kind, id);
  if (!it) return { ok: false, why: 'That is not yours to name.' };
  // A show that has been on has a name. Only a first season is still a working title.
  const series = (KINDS[kind].series ? KINDS[kind].series(it) : it.seriesTitle) || ((it.season || 0) > 1 ? root(KINDS[kind].title(it)) : '');
  if (series && (s.filmography || []).some((c) => root(c.title) === root(series) && !c.running)) {
    return { ok: false, why: 'The show has been on the air. It has a name now.' };
  }
  return { ok: true };
}
// Why a name will not do, or null.
export function whyNot(s, kind, id, title) {
  const fit = canRename(s, kind, id);
  if (!fit.ok) return fit.why;
  const it = itemOf(s, kind, id);
  const t = clean(title);
  if (t.length < 2) return 'It needs a name.';
  if (t.length > TITLE_MAX) return `${TITLE_MAX} characters. A poster is only so wide.`;
  // Everything you have made or are making, except this project — which carries its own
  // name in two places at once, the paper and the set, and must not collide with itself.
  const mine = new Set([String(it.id), String(it.offerId || ''), String((s.offers || []).find((o) => o.id === it.offerId) ? it.offerId : '')]);
  const taken = [
    ...(s.filmography || []).map((c) => c.title), ...(s.discography || []).map((c) => c.title),
    ...(s.releases || []).filter((r) => !mine.has(String(r.id)) && !mine.has(String(r.offerId || ''))).map((r) => r.title),
    ...(s.productions || []).filter((p) => !mine.has(String(p.id)) && !mine.has(String(p.offerId || ''))).map((p) => p.title),
    ...(s.offers || []).filter((o) => !mine.has(String(o.id))).map((o) => String(o.projectTitle || '').replace('⭐ ', '')),
    ...(s.frozen || []).map((f) => f.title),
  ];
  if (taken.some((x) => same(root(x), root(t)) || same(x, t))) return 'You have already made something with that name.';
  return null;
}
// Rename it. A season keeps its number; every copy of the name follows.
export function rename(s, kind, id, title) {
  const bad = whyNot(s, kind, id, title);
  if (bad) { s.lastEvent = bad; return s; }
  const t = clean(title);
  const it = itemOf(s, kind, id);
  const was = KINDS[kind].title(it);
  const full = t + ((it.season || 0) > 1 ? ` · season ${it.season}` : '');
  KINDS[kind].set(it, full, t);
  it.named = true;
  if (it.seriesTitle) it.seriesTitle = t;
  // The paper and the set are the same project under two names; keep them together.
  const paper = (s.offers || []).find((o) => o.id === it.offerId);
  if (paper) { KINDS.offer.set(paper, full, t); if (paper.seriesTitle) paper.seriesTitle = t; }
  if (kind === 'offer') {
    const set = (s.productions || []).find((p) => p.offerId === it.id);
    if (set) { set.title = full; if (set.seriesTitle) set.seriesTitle = t; }
  }
  addTimeline(s, `"${was}" is called "${full}" now. Nothing is called what it was called on the first day.`);
  s.lastEvent = `The working title was "${was}". It is "${full}" now — which is what a working title is for.`;
  return s;
}
