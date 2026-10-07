// What the screens share. These lived at the top of App.jsx until the screens moved out of it,
// and a screen never imports from App.jsx — App imports the screens.

// Every set you are on. Three at most — see engine/sets.js; g.production is the first.
// Read-only on purpose: sets(s) over there repairs state as it reads it, which a render must not.
export const allSets = (g) => (g.productions && g.productions.length ? g.productions : (g.production ? [g.production] : []));

// Money as the filmography and the Style screen print it. Not the same as money() in
// systems/life/money.js, which keeps the euros under a million.
export function money(n) {
  if (n >= 1000000000) return `€${(n / 1000000000).toFixed(2)}bn`;
  if (n >= 100000000) return `€${Math.round(n / 1000000)}m`;
  if (n >= 1000000) return `€${(n / 1000000).toFixed(1)}m`;
  return `€${Math.round(n / 1000)}k`;
}
