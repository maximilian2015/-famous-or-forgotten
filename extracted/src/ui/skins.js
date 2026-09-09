// The look of the game, in one place.
//
// Every screen reads its colours from the `theme` object exported by theme.js. That object
// is LIVE: switching skin rewrites its fields in place and bumps a counter that App
// subscribes to, so the whole game repaints without a reload and without threading a
// context through four hundred inline styles.
//
// Three skins, all dark. A light one was tried and abandoned: the app has ~200 hardcoded
// `rgba(255,255,255,.08)` hairlines in it, and every one of them would have had to be
// found and flipped. That is a refactor, not a skin.

export const THEMES = {
  // The default. A cinema after dark: ink, warm brass, a marquee you can almost hear
  // buzzing. Gold is the accent because the whole game is about the spotlight, and the
  // money is the one number the player checks every single month.
  latenight: {
    name: 'Late Show',
    blurb: 'Ink and brass. A cinema at eleven at night.',
    bg: '#0b0a11', bgDeep: '#060509',
    panel: '#17141f', panel2: '#1e1a28',
    accent: '#e8b04b', accent2: '#c8862b',
    text: '#f4efe4', muted: '#968c7d',
    gold: '#f2c265', good: '#6fc98d', bad: '#e5566f',
    line: 'rgba(232,176,75,.16)',
    glow: 'rgba(232,176,75,.14)',
    // The neutrals the drawn scenes are built from — a marquee, a bedroom, a hospital
    // corridor. They were literal purple hexes in the SVG, so the scenes stayed violet
    // whatever the skin was.
    ink: '#1c1826', ink2: '#272132', edge: '#4a4053', sceneText: '#a2937e',
    warm: true,
  },
  // What the game looked like before. Kept exactly, to the digit — a skin should never be
  // a one-way door.
  midnight: {
    name: 'Midnight',
    blurb: 'The original. Deep violet and neon.',
    bg: '#150f2c', bgDeep: '#0d0920',
    panel: '#1e1740', panel2: '#221a44',
    accent: '#9e74ff', accent2: '#7c5cff',
    text: '#ece7fb', muted: '#9d90c4',
    gold: '#ffd166', good: '#5fce8a', bad: '#ff6a8a',
    line: 'rgba(158,116,255,.2)',
    glow: 'rgba(158,116,255,.18)',
    ink: '#241e4a', ink2: '#332b62', edge: '#4a3f7a', sceneText: '#9c8fd4',
    warm: false,
  },
  // Old Hollywood: curtain red on black, the colour of a room where somebody is about to
  // be announced.
  bombshell: {
    name: 'Bombshell',
    blurb: 'Curtain red. Somebody is about to be announced.',
    bg: '#100809', bgDeep: '#080405',
    panel: '#1d1013', panel2: '#241417',
    accent: '#e35d6a', accent2: '#b03246',
    text: '#f6ebe9', muted: '#a08b8c',
    gold: '#e8b04b', good: '#63c48c', bad: '#ff7d7d',
    line: 'rgba(227,93,106,.18)',
    glow: 'rgba(227,93,106,.16)',
    ink: '#241419', ink2: '#331c22', edge: '#57343d', sceneText: '#ab8f92',
    warm: true,
  },
};

export const THEME_ORDER = ['latenight', 'midnight', 'bombshell'];
export const DEFAULT_THEME = 'latenight';

// Which one is on. Kept out of the save on purpose: it is a setting about the app, not a
// fact about the life you are living, and it should survive starting a new one.
const KEY = 'fof_skin';
export function savedSkin() {
  try { const v = localStorage.getItem(KEY); return THEMES[v] ? v : DEFAULT_THEME; } catch (e) { return DEFAULT_THEME; }
}
export function rememberSkin(id) { try { localStorage.setItem(KEY, id); } catch (e) {} }
