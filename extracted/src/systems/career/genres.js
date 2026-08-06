import { GENRES } from '../meta/news.js';

// You don't get better at "acting" in the abstract — you get better at the kinds of
// stories you've actually made. Every finished credit teaches its genre; that experience
// then feeds back as a rating bonus the next time you work in it.
export function genreXP(s, genre) { return (s.genreXP || {})[genre] || 0; }
export function addGenreXP(s, genre, rating) {
  if (!genre || !GENRES.includes(genre)) return;
  const gain = (rating || 0) >= 85 ? 3 : (rating || 0) >= 60 ? 2 : 1;
  (s.genreXP = s.genreXP || {})[genre] = Math.min(20, genreXP(s, genre) + gain);
}
// Up to +10 on ratings in a genre you've lived in — mastery of a lane is half a hit.
export function genreBonus(s, genre) { return Math.min(10, Math.round(genreXP(s, genre) * 0.5)); }
export function genreLabel(xp) {
  return xp >= 16 ? 'Defined by it' : xp >= 10 ? 'At home here' : xp >= 5 ? 'Finding the voice' : xp >= 1 ? 'Dabbled' : 'Untried';
}
