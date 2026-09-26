import { useSyncExternalStore } from 'react';
import { createInitialState } from './initialState.js';
import { beginLife } from '../systems/life/origin.js';
import { ensureAppearance } from '../systems/life/appearance.js';
import { dressOffers } from '../systems/career/script.js';
const KEY = 'fof_react_save';
const CURRENT_VERSION = 'r0.8b';

function normalize(saved) {
  if (!saved || typeof saved !== 'object') return freshLife();
  if (saved.version !== CURRENT_VERSION) return freshLife();
  const base = createInitialState();
  const merged = { ...base, ...saved };
  for (const k of Object.keys(base)) { if (typeof base[k] === 'number') { const v = Number(merged[k]); merged[k] = Number.isFinite(v) ? v : base[k]; } }
  merged.version = CURRENT_VERSION;
  merged.created = true;   // an existing save already has a character — never re-run the creator over it
  // The singer road is closed for now — Maxi: 'we are working on acting.' A save that chose
  // singing at ten is an actor from here: the craft carries over, the tile says Acting.
  // Listings drawn for a singer do not belong on an actor's board, whichever build drew them.
  // (The first migration turned the dream into 'actor' and left the board; the guard below
  // then never fired again. Maxi saw Music Show for a third time.)
  const SINGER_TYPES = /Music Show|Talent Series|Music Video|Concert Film|Stadium Tour|Jingle|Brand Song|Open Mic|Festival Slot|Session Work|Album|World Tour/;
  if (merged.dream !== 'singer') {
    merged.castingPool = (merged.castingPool || []).filter((c) => !SINGER_TYPES.test(c.type || ''));
    merged.offers = (merged.offers || []).filter((o) => !SINGER_TYPES.test(o.type || ''));
  }
  if (merged.dream === 'singer') {
    merged.dream = 'actor'; merged.acting = Math.max(merged.acting || 0, merged.singing || 0); merged.singing = 0;
    // The board was drawn for a singer — Music Show on every line. It is redrawn for an actor
    // on the next look; singer offers and reads go with it.
    merged.castingPool = []; merged.submissions = [];
    merged.offers = (merged.offers || []).filter((o) => !/Album|World Tour|Music Video|Tour/.test(o.type || ''));
  }
  // Offers won on the casting board used to carry an absolute month called `expires` that
  // no tick read, so they never left Messages. They get the countdown every other offer has.
  for (const o of merged.offers || []) {
    if (typeof o.deadline !== 'number') o.deadline = typeof o.expires === 'number' ? Math.max(1, o.expires - ((merged.year || 0) * 12 + (merged.month || 0))) : 3;
  }
  // The agent became a person in Contacts. A save with an agent and no such person gets one.
  if (merged.agent && merged.agent.level > 0 && !(merged.people || []).some((p) => p.agent)) {
    (merged.people = merged.people || []).unshift({ id: 'p-agent-' + Math.random().toString(36).slice(2, 7), name: merged.agent.name, role: 'Agent', agent: true,
      industryWeight: { novice: 45, solid: 60, strong: 78, legend: 92 }[merged.agent.tier] || 45, relationship: 50, met: String(merged.year), lastSeen: (merged.year || 0) * 12 + (merged.month || 0) });
  }
  // Four shelves in place of the old four: series is tv, ads and gigs are a day's work,
  // and film split into the studio's pictures and the small ones.
  for (const c of merged.castingPool || []) {
    if (c.shelf === 'series') c.shelf = 'tv';
    else if (c.shelf === 'ads' || c.shelf === 'gigs') c.shelf = 'day';
    else if (c.shelf === 'film' && (c.scale === 'small' || c.scale === 'indie')) c.shelf = 'indie';
  }
  // One set became a list of them. A save with the one gets the list; a set without an
  // id gets one, so the two copies can be told apart after a reload.
  if (!merged.productions) merged.productions = merged.production ? [merged.production] : [];
  for (const p of merged.productions) if (!p.id) p.id = 'set-' + Math.random().toString(36).slice(2, 8);
  merged.production = merged.productions[0] || null;
  // A save from before the sets announced themselves: whatever standing already allows is
  // already known, so an old star does not get told about a third set they have had for years.
  // A save from before there was a ceiling: whatever they already have is theirs, and the
  // roll above it is what the sets can still add.
  if (merged.talent == null) { const r = Math.random(); const roll = r < 0.17 ? 86 + Math.floor(Math.random() * 15) : r < 0.55 ? 72 + Math.floor(Math.random() * 14) : 55 + Math.floor(Math.random() * 17); merged.talent = Math.max(roll, Math.ceil(merged.acting || 0), Math.ceil(merged.singing || 0)); }
  if (merged.setsKnown == null) { const r = merged.respect || 0; merged.setsKnown = 1 + (r >= 25 ? 1 : 0) + (r >= 50 ? 1 : 0); }
  ensureAppearance(merged); // saves made before the avatar existed still need a face
  return merged;
}
function sanitize(st) {
  const base = createInitialState();
  for (const k of Object.keys(base)) { if (typeof base[k] === 'number' && (typeof st[k] !== 'number' || !Number.isFinite(st[k]))) st[k] = base[k]; }
  return st;
}
function freshLife(opts) { const s = createInitialState(opts); beginLife(s); ensureAppearance(s); return s; }

let state = normalize(load());
const listeners = new Set();
function emit() { for (const l of listeners) l(); }
export function getState() { return state; }
export function setState(next) { state = sanitize(next); persist(); emit(); }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function useGame() { return useSyncExternalStore(subscribe, getState, getState); }
// A real game state always carries these. Guards against a system function accidentally
// returning something else (e.g. a {ok,msg} result object) and wiping the save.
function looksLikeState(v) { return !!v && typeof v === 'object' && typeof v.version === 'string' && typeof v.ageY === 'number'; }
export function dispatch(fn, ...args) {
  const next = fn(state, ...args);
  const out = looksLikeState(next) ? { ...next } : { ...state };
  // Every offer on the table says who you would be playing and what it is about. The
  // monthly tick does this too, but a part can appear between two months — a favour called
  // in, a paper pushed by somebody in a room — and an offer with no part on it is the same
  // hole this was written to close. See career/script.js; it costs nothing when there is
  // nothing to do.
  dressOffers(out);
  setState(out);
}
export function newLife(opts) { setState(freshLife(opts)); }
export function resetSave() { localStorage.removeItem(KEY); setState(freshLife()); }

// ── carrying a life between places ────────────────────────────────────────────
// A save is the whole state and nothing else, so exporting it is exactly what is in
// storage and importing it is a normalise away from being playable.
export function exportSave() {
  const s = getState();
  const name = String(s.name || 'life').replace(/[^\w ]+/g, '').trim().replace(/\s+/g, '-') || 'life';
  const stamp = `${s.name ? '' : ''}${s.ageY || 0}-${s.year || 0}`;
  const blob = new Blob([JSON.stringify(s)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `famous-${name}-${stamp}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return `famous-${name}-${stamp}.json`;
}
// Returns null on success, or a sentence saying what was wrong with the file.
export function importSave(text) {
  let raw;
  try { raw = JSON.parse(text); } catch (e) { return 'That is not a save file — it is not even JSON.'; }
  if (!looksLikeState(raw)) return 'That file is not one of this game’s saves.';
  const next = normalize(raw);
  if (!looksLikeState(next)) return 'That save could not be read. It may be from a much older version.';
  setState(next);
  return null;
}
function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
function load() { try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } }

// Keep tabs in sync: if the save changes in another tab, adopt it here instead of
// silently overwriting it on the next action (was causing scrambled saves with 2 tabs open).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    let saved = null;
    try { saved = e.newValue ? JSON.parse(e.newValue) : null; } catch (err) { return; }
    state = normalize(saved);
    emit();
  });
}
