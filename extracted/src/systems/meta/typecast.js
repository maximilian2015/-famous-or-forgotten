// The label the business puts on you. After enough parts of one kind the room stops seeing
// an actor and starts seeing a type — the romantic lead, the villain, the television face,
// the serious one, the face on the bus shelter, the one from the tabloids, the child star.
// A label is a currency: play to it and the matching parts come easier and more often;
// fight it and the room is colder, but a good part against type is worth standing.
//
// Scores climb with the work (release.js at the close of a run, trouble.js for the stories)
// and fade by a little every year, so a label is what you have been doing lately, not what
// you did once. Three is a label; five is a strong one, and a strong one moves the board.
import { addTimeline } from '../../engine/timeline.js';

export const LABELS = {
  romantic: { label: 'Romantic lead', blurb: 'The face they put opposite somebody. Romance and the softer dramas come to you; the dark parts do not.' },
  villain: { label: 'Villain face', blurb: 'The one they cast when the script needs somebody to be afraid of. Horror, crime and thrillers want you; the romances do not.' },
  tv: { label: 'Television actor', blurb: 'A face people see every week. The networks want you; the studios think of you as television.' },
  serious: { label: 'Serious actor', blurb: 'The prestige parts, the festivals, the season. Blockbusters wonder if you would say yes.' },
  commercial: { label: 'The face', blurb: 'The brands, the covers, the big loud pictures. The prestige shelf has doubts.' },
  scandal: { label: 'Scandal celebrity', blurb: 'Known for the stories more than the work. The tabloids love you; the serious rooms do not return the call.' },
  child: { label: 'Former child star', blurb: 'Famous before you could drive. The business is waiting to see if there is an adult in there.' },
};
// And the genre. Maxi: "when does an actor get typecast if he only does comedies, or only
// thrillers?" The labels above are about the KIND of part; this is about the kind of
// picture, and it is the one everybody actually means by typecasting — the comedy actor
// nobody will cast in a thriller, the horror name who cannot get read for a drama.
//
// It uses the same scores, the same thresholds and the same yearly fade as the rest, under
// a "g:" key, so a career spread across eight genres never earns one (a quarter of a point
// a year against half a point of fade) and a career of nothing but comedies earns it in two.
export const GENRE_LABEL = {
  Drama: ['A dramatic actor', 'The serious pictures, the quiet ones. Comedy and the big loud films do not think of you.'],
  Comedy: ['A comic actor', 'Funny is the first thing anybody says about you. Nobody is offering you the murder.'],
  Horror: ['A horror name', 'The genre has you, and the genre is loyal. The rest of the business thinks of you as a horror actor.'],
  Thriller: ['A thriller lead', 'Tense, capable, usually armed. It pays, and it is a box.'],
  'Sci-Fi': ['A science-fiction face', 'Worlds, prosthetics, green screens. There are worse boxes and they are all smaller.'],
  Romance: ['A romantic actor', 'Two people and a problem. The dark pictures do not call.'],
  Crime: ['A crime actor', 'Somebody in a bad room making a worse decision. You are very good at it, which is the problem.'],
  Musical: ['A musical performer', 'You can sing, and the business has never forgotten it.'],
};
export function genreKey(g) { return 'g:' + g; }
export function genreOf(id) { return String(id || '').startsWith('g:') ? id.slice(2) : null; }
// What a label is called and what it costs you — the static ones, and the genre one.
export function labelInfo(id) {
  const g = genreOf(id);
  if (g) { const row = GENRE_LABEL[g] || [`${g} actor`, 'The business has decided what kind of picture you are for.']; return { label: row[0], blurb: row[1], genre: g }; }
  return LABELS[id] || { label: id, blurb: '' };
}
export const ACTIVE_AT = 3, STRONG_AT = 5;
export function typecastOf(s) {
  if (!s.typecast) s.typecast = { scores: {}, active: [], primary: null };
  return s.typecast;
}
export function scoreOf(s, id) { return (typecastOf(s).scores || {})[id] || 0; }
export function activeLabels(s) { return typecastOf(s).active || []; }
export function strongLabels(s) { return activeLabels(s).filter((id) => scoreOf(s, id) >= STRONG_AT); }
export function hasLabel(s, id) { return activeLabels(s).includes(id); }
export function isStrong(s, id) { return scoreOf(s, id) >= STRONG_AT; }

export function typecastBump(s, id, by) { bump(s, id, by); relabel(s); return s; }
function bump(s, id, by) {
  const t = typecastOf(s);
  t.scores[id] = Math.max(0, Math.min(10, (t.scores[id] || 0) + by));
}
function relabel(s) {
  const t = typecastOf(s);
  const was = new Set(t.active || []);
  // Every score, not only the named labels — the genre ones live in the same table.
  const now = Object.keys(t.scores).filter((id) => (t.scores[id] || 0) >= ACTIVE_AT).sort((a, b) => (t.scores[b] || 0) - (t.scores[a] || 0));
  t.active = now.slice(0, 3);
  t.primary = t.active[0] || null;
  for (const id of t.active) if (!was.has(id)) addTimeline(s, `The business has a word for you now: ${labelInfo(id).label.toLowerCase()}. ${labelInfo(id).blurb}`);
  for (const id of was) if (!t.active.includes(id)) addTimeline(s, `Nobody calls you ${labelInfo(id).label.toLowerCase()} any more.`);
  for (const id of t.active) if ((t.scores[id] || 0) >= STRONG_AT && !(t.strong || []).includes(id)) addTimeline(s, `${labelInfo(id).label}: it is what you are to them now. The parts that fit it come easier; the ones that do not, harder.`);
  t.strong = t.active.filter((id) => (t.scores[id] || 0) >= STRONG_AT);
}

// At the close of a run, or the end of a season (release.js).
export function typecastAfterCredit(s, c) {
  if (!c || c.minor) return s;
  const lead = c.tier !== 'supporting';
  const r = c.rating || 0;
  const genre = c.genre || '';
  // The genre of the picture, every time. A career in one genre becomes a genre actor.
  if (genre && GENRE_LABEL[genre]) bump(s, genreKey(genre), lead ? 1 : 0.5);
  if (c.tv) bump(s, 'tv', c.scale === 'episode' ? 0.5 : 1);
  if (lead && (genre === 'Romance' || (genre === 'Drama' && (s.looks || 0) >= 62)) && r >= 50) bump(s, 'romantic', 1);
  if (/^(Horror|Thriller|Crime)$/.test(genre) && r >= 45) bump(s, 'villain', lead ? 1 : 0.5);
  if (c.scale === 'prestige' || /Prestige|Festival/.test(c.type || '') || (genre === 'Drama' && r >= 78)) bump(s, 'serious', 1);
  if ((c.asker || 0) > 0 || (c.festival && c.festival.result === 'prize')) bump(s, 'serious', 1);
  if (c.scale === 'blockbuster') bump(s, 'commercial', 1);
  relabel(s);
  return s;
}
// A brand campaign, a cover, a commercial: the face (castings.js, the day's work).
export function typecastAfterDayWork(s, c) {
  if (/Brand Campaign|Commercial|Magazine Cover|Fashion House/.test(c.type || '')) { bump(s, 'commercial', 0.5); relabel(s); }
  return s;
}
// A story in the papers that was about you and not the work (trouble.js, night.js).
export function typecastScandal(s, by = 1) { if ((s.fame || 0) >= 20) { bump(s, 'scandal', by); relabel(s); } return s; }

// The years: every label fades unless you keep earning it; the child star is set once, at
// eighteen, and only a grown-up career takes it off.
export function typecastYear(s) {
  const t = typecastOf(s);
  for (const id of Object.keys(t.scores)) if (id !== 'child') t.scores[id] = Math.max(0, (t.scores[id] || 0) - 0.5);
  if ((s.ageY || 0) === 18 && (s.peakFame || 0) >= 20) t.scores.child = ACTIVE_AT + 1;
  if (t.scores.child && (s.ageY || 0) >= 24 && (s.filmography || []).some((c) => !c.minor && (c.year || 0) >= (s.year || 0) - 2 && (c.rating || 0) >= 65)) t.scores.child = Math.max(0, t.scores.child - 1);
  relabel(s);
  return s;
}

// What the business is starting to think, before it has a word for it. Reads the highest
// score that is not yet a label, so the meter is visible from the first film rather than
// appearing out of nowhere at the third.
export function tendency(s) {
  const t = typecastOf(s);
  const active = new Set(t.active || []);
  let best = null;
  for (const [id, v] of Object.entries(t.scores || {})) {
    if (active.has(id) || v < 1) continue;
    if (!best || v > best.score) best = { id, score: v };
  }
  if (!best) return null;
  const info = labelInfo(best.id);
  return { id: best.id, label: info.label, score: Math.round(best.score * 10) / 10, need: ACTIVE_AT,
    line: `${Math.round((best.score / ACTIVE_AT) * 100)}% of the way to being called ${info.label.toLowerCase()}` };
}
// Does a part fit the labels you carry? +1 on type, −1 against, 0 when the label has no view.
// The strength of the label scales it (castings.js fieldFactor, refreshCastingPool).
export function typeFit(s, c) {
  const labels = activeLabels(s);
  if (!labels.length) return 0;
  let v = 0;
  const w = (id) => (isStrong(s, id) ? 1 : 0.6);
  const genre = c.genre || '', tv = !!c.perEpisode, scale = c.scale;
  for (const id of labels) {
    if (id === 'romantic') v += (genre === 'Romance' || genre === 'Drama') ? w(id) : /Horror|Thriller|Crime/.test(genre) ? -w(id) : 0;
    if (id === 'villain') v += /Horror|Thriller|Crime/.test(genre) ? w(id) : genre === 'Romance' ? -w(id) : 0;
    if (id === 'tv') v += tv ? w(id) : (scale === 'feature' || scale === 'blockbuster') ? -w(id) : 0;
    if (id === 'serious') v += (scale === 'prestige' || scale === 'festival' || /Prestige/.test(c.type || '')) ? w(id) : scale === 'blockbuster' ? -w(id) * 0.6 : 0;
    if (id === 'commercial') v += (scale === 'blockbuster' || /Brand|Commercial|Cover|Fashion/.test(c.type || '')) ? w(id) : (scale === 'prestige' || /Prestige/.test(c.type || '')) ? -w(id) : 0;
    if (id === 'scandal') v += /Talk Show|Awards Show|Magazine|Brand/.test(c.type || '') ? w(id) * 0.6 : (scale === 'prestige' || scale === 'feature' || /Prestige/.test(c.type || '')) ? -w(id) : 0;
    if (id === 'child') v += scale === 'blockbuster' || scale === 'feature' ? -w(id) * 0.5 : 0;
    // The genre box: your own genre reads easy, everything else reads as a stretch.
    const mine = genreOf(id);
    if (mine) v += genre === mine ? w(id) : genre ? -w(id) * 0.45 : 0;
  }
  return Math.max(-1.5, Math.min(1.5, v));
}
export function typeFactor(s, c) {
  const f = typeFit(s, c);
  return f > 0 ? 1 + 0.18 * f : f < 0 ? 1 + 0.2 * f : 1;
}
export function typeWord(s, c) {
  const f = typeFit(s, c);
  return f >= 0.5 ? 'on type' : f <= -0.5 ? 'against type' : null;
}
