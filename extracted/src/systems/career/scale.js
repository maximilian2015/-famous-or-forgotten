// Which scales are pictures and which are television — the one place the game says so. It was written
// out in ten files (release.js isFilm, outcome.js, budget.js, project.js, awards.js, world.js, the
// Diary, the Filmography, the poster), and a list copied ten times is ten answers to one question that
// drift apart the first time somebody adds a scale. Imports nothing, so anything can read it — the
// files that could not import release.js for fear of a cycle included.
export const FILM_SCALES = new Set(['small', 'festival', 'indie', 'feature', 'blockbuster']);
export const TV_SCALES = new Set(['episode', 'recurring', 'prestige']);
export function isFilmScale(scale) { return FILM_SCALES.has(scale); }
export function isTvScale(scale) { return TV_SCALES.has(scale); }
