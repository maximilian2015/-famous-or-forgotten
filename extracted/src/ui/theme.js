import { THEMES, savedSkin, rememberSkin } from './skins.js';

// A LIVE object. Every screen in the game does `import { theme } from '.../theme.js'` and
// reads `theme.accent` at render time, so rewriting these fields in place recolours the
// whole app — no context, no prop drilling, no touching four hundred inline styles.
export const theme = { ...THEMES[savedSkin()] };

let current = savedSkin();
export function skinId() { return current; }

const listeners = new Set();
export function onSkinChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function setSkin(id) {
  if (!THEMES[id] || id === current) return;
  current = id;
  Object.assign(theme, THEMES[id]);
  rememberSkin(id);
  // The page chrome (background, grain, scrollbar) lives in a real stylesheet, so it has
  // to be told separately — inline styles cannot reach ::selection or the body.
  for (const fn of listeners) fn(id);
}
