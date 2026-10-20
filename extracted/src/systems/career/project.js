// One project, one identity (Media Ecosystem, stage 1 — docs/handoffs/2026-10-19-media-ecosystem-stage1-plan.md).
//
// A piece of work used to be rebuilt by hand at every boundary — the offer, the set, the release,
// the job the next season is built from, the credit on opening night — and anything a boundary
// forgot was gone (release.js: "a field that stops here is a field that does not exist"). Now it
// is born once, when the player takes it, kept in `s.projects`, and every stage carries its id.
//
// Born at the two roads every accepted offer takes (offers.js acceptOffer): a set
// (production.js startProduction) or a day's work done in one click. A continuation — the next
// season, a sequel, a rescued show, a frozen set that thaws — is the same show or the same
// franchise, and says so through its parent.
//
// What it says about the work, kept apart because the Media Ecosystem needs each separately:
//   medium        theatrical · television · streaming · other (ads, stage, voice: a bucket, not a market)
//   format        movie · series · soap · limited_series · commercial · editorial · voiceover · theatre · appearance · gig
//   style         standard · prestige — not a medium: prestige is possible on television and on streaming
//   outlet        television: daytime · network · premium
//   distribution  wide · platform · festival · broadcast
//   awardsTrack   film · festival · series · none — by format, never derived from the medium
//   route         how it reached you: open_call · agent_submission · direct_offer · relationship_offer · continuation · self_created
//   payMarket     the fee table it is paid from (status.js QUOTE) — what offers called `medium`
//
// Stage 1 moves nothing: every reader still reads the fields it always read. Nothing in here may
// draw a random number — a project id comes from the id its offer or set already has — so a seeded
// life plays out to the last digit as it did before (tests/probes/probe_same_life.mjs).
import { MEDIA } from '../meta/status.js';

const PAY = new Set(MEDIA);
const FILM_SCALES = new Set(['small', 'festival', 'indie', 'feature', 'blockbuster']);
const TV_SCALES = new Set(['episode', 'recurring', 'prestige']);
const TV_TYPES = /Soap Opera|Series|Network Drama|Talent Series|Music Show/;

// The fee table a thing is paid from, if it says. Offers and listings wrote it as `medium` before
// stage 1; a save keeps that, so both are read. Null when neither is set — every caller keeps its
// own fallback for that, exactly as it had one before.
export function payMarketOf(x) {
  if (!x) return null;
  if (x.payMarket && PAY.has(x.payMarket)) return x.payMarket;
  if (x.medium && PAY.has(x.medium)) return x.medium;
  return null;
}

function mediumFor(x, pay) {
  if (pay === 'ad' || pay === 'gig') return 'other';
  // Streaming is a platform's fee table and nothing else (Streaming V1): a rescued network show keeps
  // its type and its scale, and is streaming from the season a platform pays for.
  if (pay === 'stream_series' || pay === 'stream_premium') return 'streaming';
  if (TV_SCALES.has(x.scale) || TV_TYPES.test(x.type || '') || pay === 'tv_daytime' || pay === 'tv_network' || pay === 'tv_prestige') return 'television';
  if (x.episodes > 0 || x.perEpisode) return 'television';
  if (FILM_SCALES.has(x.scale)) return 'theatrical';
  return 'other';
}
function formatFor(x, medium) {
  const type = x.type || '';
  if (medium === 'television') return /Soap Opera/.test(type) ? 'soap' : 'series';
  if (medium === 'streaming') return /Limited/.test(type) ? 'limited_series' : 'series';
  if (medium === 'theatrical') return 'movie';
  if (/Commercial|Brand|Fashion|Jingle|Music Video/.test(type)) return 'commercial';
  if (/Magazine|Cover/.test(type)) return 'editorial';
  if (/Voice/.test(type)) return 'voiceover';
  if (/Theatre|Stage/.test(type)) return 'theatre';
  if (/Awards Show|Talk Show|convention/i.test(type)) return 'appearance';
  return 'gig';
}
function outletFor(x, medium, pay) {
  if (medium !== 'television') return null;
  if (pay === 'tv_daytime' || /Soap Opera/.test(x.type || '')) return 'daytime';
  if (pay === 'tv_prestige' || x.scale === 'prestige') return 'premium';
  return 'network';
}
function distributionFor(x, medium) {
  if (medium === 'television') return 'broadcast';
  if (medium === 'streaming') return 'drop';   // every episode at once (plan §5)
  if (medium !== 'theatrical') return null;
  if (x.scale === 'festival') return 'festival';
  return x.scale === 'feature' || x.scale === 'blockbuster' ? 'wide' : 'platform';
}
// Which award a piece of work can be up for, by FORMAT, never by medium (Maxi, 20 Oct): a movie is
// up for the Asker (a festival picture too), every series — network, prestige, streaming, limited —
// for the series award, and a day's work for nothing.
function awardsTrackFor(x, medium, format) {
  if (format === 'series' || format === 'soap' || format === 'limited_series') return 'series';
  if (format === 'movie') return x.scale === 'festival' ? 'festival' : 'film';
  return 'none';
}
const ROUTE = {
  casting: 'open_call', agent: 'agent_submission',
  studio: 'direct_offer', festival: 'direct_offer', brand: 'direct_offer',
  director: 'relationship_offer', partner: 'relationship_offer', letter: 'relationship_offer',
  rescue: 'continuation', pitch: 'self_created',
};
const CONTINUING = new Set(['renewal', 'sequel', 'rescue', 'finale', 'cultfilm', 'thaw']);
function routeFor(x) {
  if (CONTINUING.has(x.kind) || x.parentProjectId) return 'continuation';
  return ROUTE[x.via] || (x.via ? 'direct_offer' : null);
}

// The fee table a project is paid from when nothing it carries says: a credit never carried one,
// and a renewal used to have it guessed (franchise.js mediumOf, which knew no daytime). Read off the
// project itself, so a soap is daytime television however it got here.
function payFor(x, medium, format, outlet) {
  if (medium === 'television') return outlet === 'daytime' ? 'tv_daytime' : outlet === 'premium' ? 'tv_prestige' : 'tv_network';
  if (medium === 'theatrical') return x.tier === 'tentpole' ? 'film_tentpole' : x.scale === 'blockbuster' || x.scale === 'feature' ? 'film_studio' : 'film_indie';
  if (medium === 'other') return format === 'commercial' || format === 'editorial' || format === 'appearance' ? 'ad' : 'gig';
  return null;
}

// Everything a project says, read off an offer, a set, a release or a credit. Pure: no state, no
// dice. Used for new projects and for old saves alike, so the two cannot drift apart.
export function describeProject(x) {
  const pay = payMarketOf(x);
  const medium = mediumFor(x, pay);
  const format = formatFor(x, medium), outlet = outletFor(x, medium, pay);
  return {
    medium, format,
    scale: x.scale || null,
    style: /Prestige/.test(x.type || '') || x.scale === 'prestige' ? 'prestige' : 'standard',
    outlet,
    distribution: distributionFor(x, medium),
    awardsTrack: awardsTrackFor(x, medium, format),
    route: routeFor(x),
    payMarket: pay || payFor(x, medium, format, outlet),
    title: String(x.projectTitle || x.title || '').replace('⭐ ', '') || null,
    type: x.type || null, genre: x.genre || null,
    budget: Number.isFinite(x.budget) ? x.budget : null, needs: x.needs ?? null,
    // Streaming: which platform, what an episode costs it (career/budget.js planEpisodeCost), and the
    // loyalty a rescued show brings with it (career/streaming.js legacyIndex).
    ...(medium === 'streaming' ? { platformId: x.platformId || null, episodeCost: Number.isFinite(x.episodeCost) ? x.episodeCost : null, legacy: x.legacy || 0 } : {}),
  };
}

export function projectsOf(s) {
  if (!s.projects) s.projects = {};
  return s.projects;
}
export function getProject(s, id) { return id && s && s.projects ? s.projects[id] || null : null; }

// The moment the player takes a piece of work. A thawed set is the project it always was; a
// continuation is a new project in the same show or franchise; anything else is new.
export function adoptProject(s, offer, fallbackId) {
  const all = projectsOf(s);
  if (offer.projectId && all[offer.projectId]) return all[offer.projectId];
  const id = 'prj-' + (offer.id || fallbackId);
  if (all[id]) return all[id];
  const parent = getProject(s, offer.parentProjectId);
  const p = { id, parentId: parent ? parent.id : null, ...describeProject(offer) };
  p.seriesId = null; p.franchiseId = null;
  const serial = (x) => x.medium === 'television' || x.medium === 'streaming';
  if (parent && parent.medium === p.medium) {
    // The same show is the same show: its format, its outlet, its fee table; a sequel is the same
    // franchise.
    if (serial(p)) p.seriesId = parent.seriesId || parent.id;
    else p.franchiseId = parent.franchiseId || parent.id;
    for (const k of ['format', 'style', 'outlet', 'awardsTrack']) if (parent[k]) p[k] = parent[k];
    if (!p.payMarket && parent.payMarket) p.payMarket = parent.payMarket;
    // And on a platform, the same platform at the same cost an episode, unless the offer says.
    if (p.medium === 'streaming') for (const k of ['platformId', 'episodeCost']) if (p[k] == null && parent[k] != null) p[k] = parent[k];
  } else if (parent && serial(parent) && serial(p)) {
    // A network show a platform picked up (bubble.js rescue) is still the same show — another
    // medium, the same series.
    p.seriesId = parent.seriesId || parent.id;
  } else if (parent) {
    // The film of a show is a film; it belongs to the show's world, not to its schedule.
    p.franchiseId = parent.franchiseId || parent.seriesId || parent.id;
  }
  // A show is a series from its first season in your life — even one you joined in its fourteenth.
  if (serial(p) && !p.seriesId && (p.format === 'series' || p.format === 'soap' || p.format === 'limited_series')) p.seriesId = id;
  all[id] = p;
  return p;
}

// The project a thing belongs to: its own if it was given one, or what an old save's object would
// have been, worked out on the spot and not stored (the load migration stores them).
export function projectOf(s, x) {
  if (!x) return null;
  return getProject(s, x.projectId) || { id: null, derived: true, ...describeProject(x) };
}

// ── an old save ──────────────────────────────────────────────────────────────
// Every piece of work in a save from before projects gets the project it would have had, worked out
// from what it says about itself and marked `derived`. The seasons of one show and the parts of one
// franchise are joined by the rules the game already finds "the season before" with. Run once at
// load (state/store.js), idempotent, deletes nothing — an older build opening the save ignores it.
// The two title rules are franchise.js seriesRoot and sequelTitle's numbering, repeated here so this
// file imports nothing that imports it back.
const seasonRoot = (t) => String(t || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim();
const partRoot = (t) => String(t || '').replace(/⭐\s*/, '').replace(/\s+(II|III|IV|V|VI|\d+)$/, '').trim();
export function settleProjects(s) {
  if (!s) return s;
  // v2: awardsTrack by format — film / festival / series / none — where v1 wrote 'television' and null.
  if ((s.projectsVersion || 0) === 1) {
    for (const p of Object.values(s.projects || {})) p.awardsTrack = awardsTrackFor(p, p.medium, p.format);
    s.projectsVersion = 2;
  }
  if ((s.projectsVersion || 0) >= 2) return s;
  const all = projectsOf(s);
  let n = s._prjSeq || 0;
  const give = (x) => {
    if (!x) return null;
    if (x.projectId && all[x.projectId]) return all[x.projectId];
    const id = 'prj-old' + (++n).toString(36);
    const p = { id, parentId: null, seriesId: null, franchiseId: null, derived: true, ...describeProject(x) };
    all[id] = p; x.projectId = id;
    return p;
  };
  // The filmography oldest first, so every season and every part finds the one before it.
  const lastOf = new Map();
  for (const bucket of ['filmography', 'discography']) {
    for (const c of [...(s[bucket] || [])].reverse()) {
      const p = give(c);
      if (c._rel) c._rel.projectId = p.id;
      if (c.job) c.job.projectId = p.id;
      const tv = p.medium === 'television' && (p.format === 'series' || p.format === 'soap');
      const key = tv ? 'tv:' + seasonRoot((c.job && c.job.seriesTitle) || c.title) : (c.part || 0) > 1 ? 'film:' + partRoot(c.title) : null;
      const before = key ? lastOf.get(key) : null;
      if (tv) { p.seriesId = before ? before.seriesId || before.id : p.id; p.parentId = before ? before.id : null; }
      else if (before) { p.franchiseId = before.franchiseId || before.id; p.parentId = before.id; }
      if (tv) lastOf.set(key, p);
      else if (p.medium === 'theatrical') lastOf.set('film:' + partRoot(c.title), p);
    }
  }
  // Work in flight finishes as it would have, now with a project on it.
  for (const p of s.productions || (s.production ? [s.production] : [])) give(p);
  if (s.production) give(s.production);
  for (const r of s.releases || []) { const p = give(r); if (r.job) r.job.projectId = p.id; }
  for (const f of s.frozen || []) give(f);
  for (const b of s.bubbles || []) if (b.job) {
    const p = lastOf.get('tv:' + seasonRoot(b.root || b.job.seriesTitle || b.job.title));
    b.job.projectId = p ? p.id : give({ ...b.job, title: b.root || b.job.title }).id;
  }
  // A continuation already offered knows which project it continues.
  const parentFor = (o) => {
    if (o.kind === 'sequel') return lastOf.get('film:' + partRoot(o.projectTitle));
    if (['renewal', 'rescue', 'finale', 'cultfilm'].includes(o.kind)) return lastOf.get('tv:' + seasonRoot(o.seriesTitle || o.projectTitle));
    return null;
  };
  for (const o of [...(s.offers || []), ...(s.laterOffers || []).map((l) => l.offer).filter(Boolean)]) {
    if (o.parentProjectId) continue;
    const p = parentFor(o);
    if (p) o.parentProjectId = p.id;
  }
  // What offers and listings called `medium` is the fee table; it is called payMarket now. Copied,
  // not moved: payMarketOf reads both, and an older build still finds the field it wrote.
  for (const x of [...(s.castingPool || []), ...(s.submissions || []), ...(s.offers || []), ...(s.laterOffers || []).map((l) => l.offer).filter(Boolean)]) {
    if (!x.payMarket && x.medium && PAY.has(x.medium)) x.payMarket = x.medium;
  }
  s._prjSeq = n;
  s.projectsVersion = 2;
  return s;
}
