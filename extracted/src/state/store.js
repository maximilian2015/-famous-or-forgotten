import { useSyncExternalStore } from 'react';
import { createInitialState } from './initialState.js';
import { beginLife } from '../systems/life/origin.js';
import { ensureAppearance } from '../systems/life/appearance.js';
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
  setState(looksLikeState(next) ? { ...next } : { ...state });
}
export function newLife(opts) { setState(freshLife(opts)); }
export function resetSave() { localStorage.removeItem(KEY); setState(freshLife()); }
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
