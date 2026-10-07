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
import { regardScandal } from '../life/regard.js';

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
// The genre they have decided you are, if there is one. Maxi: "when you carry a label a
// lot of that genre comes to you, and the way out is the young blood and the top
// directors." Both halves of that need this.
export function boxedInto(s) {
  let best = null, top = 0;
  for (const id of activeLabels(s)) {
    const g = genreOf(id);
    if (!g) continue;
    const v = scoreOf(s, id);
    if (v > top) { top = v; best = g; }
  }
  return best;
}
// Nothing dominates: you play everything and the business has no word for you. That is a
// standing of its own, and the one every character actor wants.
export function isUniversal(s) {
  const t = typecastOf(s);
  const genres = Object.keys(t.scores || {}).filter((id) => genreOf(id));
  if (genres.length < 3) return false;
  return !boxedInto(s) && genres.filter((id) => scoreOf(s, id) >= 1.5).length >= 3;
}
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
// Saying no to the box. Maxi: "how do they get out of it in life?" Two ways, and the game
// only had one. The first is the director who sees something else, which is the board.
// The second is the one McConaughey actually did: he turned down the romantic comedies —
// all of them, for about two years, at fifteen million a picture — and waited until the
// offers changed. It is the most expensive thing an actor can do and it is the only move
// that works without anybody's permission.
//
// So a refusal that is ON your type wears the label down, and a refusal that is against it
// does nothing, because turning down the one part that would have got you out is not a
// stand, it is a mistake.
export function refusedOnType(s, o) {
  if (!o || o.tier === 'supporting') return s;
  const fit = typeFit(s, { genre: o.genre, scale: o.scale, type: o.type, perEpisode: !!o.perEpisode });
  if (fit < 0.5) return s;
  const t = typecastOf(s);
  let moved = null;
  for (const id of activeLabels(s)) {
    const g = genreOf(id);
    const onIt = g ? g === o.genre : true;
    if (!onIt) continue;
    const was = scoreOf(s, id);
    t.scores[id] = Math.max(0, was - 0.9);
    if (t.scores[id] < was) moved = id;
  }
  if (moved) relabel(s);
  return s;
}
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
// The one place the whole game agrees a scandal has happened, so it is also where every
// person you know quietly revises their opinion of you as a professional. Nobody says
// anything. life/regard.js
export function typecastScandal(s, by = 1) { if ((s.fame || 0) >= 20) { bump(s, 'scandal', by); relabel(s); } regardScandal(s, by); return s; }

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
// What might stick NEXT, and nothing else. This used to return the single highest inactive
// score whatever it was — one point out of three, a guest spot three years ago — and the
// Passport drew it above the labels you actually carry under the heading "Public image". So an
// actor with two billion-euro theatrical pictures and a commercial label read as "Television
// actor 57%", and Maxi quite reasonably took that for the game's opinion of who he was.
//
// Two guards, each with a reason. A trend is worth a sentence when it is close enough to
// actually happen — two of the three — and when it is not being drowned by something the
// business already calls you: a label three clear points above it has settled the question,
// and the footnote underneath is noise with a percentage on it.
export function tendency(s) {
  const t = typecastOf(s);
  const active = new Set(t.active || []);
  const settled = Math.max(0, ...[...active].map((id) => t.scores[id] || 0));
  let best = null;
  for (const [id, v] of Object.entries(t.scores || {})) {
    if (active.has(id) || v < ACTIVE_AT - 1) continue;
    if (settled - v > ACTIVE_AT) continue;
    if (!best || v > best.score) best = { id, score: v };
  }
  if (!best) return null;
  const info = labelInfo(best.id);
  return { id: best.id, label: info.label, score: Math.round(best.score * 10) / 10, need: ACTIVE_AT,
    // Said as a thing that has not happened yet, because it has not. The old wording — "57% of
    // the way to being called a television actor" — reads as a fact about you when it is a
    // warning about the next three parts.
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
    // It was 0.45 against a threshold of 0.5, so a genre box — the one everybody actually
    // means by typecasting — could never turn a part away. Measured: the board at five
    // comedies was the board at none.
    if (mine) v += genre === mine ? w(id) : genre ? -w(id) * 0.8 : 0;
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

// ── two different questions, and they used to be one ──────────────────────────
// typeFit above answers "will the room cast you in this", and release.js was reading that same
// number again to decide what the audience made of you in it. Those are not the same question,
// and a relayed note put it exactly: there is what people think BEFORE they have seen it —
// "why is this comic playing Batman?" — and there is what they think AFTER, which is either
// "he was extraordinary" or "I never believed him for a second".
//
// So: two functions, one on each side of the premiere.

// BEFORE. A modest thing, and deliberately modest: it moves the trailer response and a little
// of the demand, nothing more. The twist is that an odd casting is a QUESTION people ask out
// loud, and with a big enough name the question itself sells tickets — which is why a famous
// actor can take a strange part and open fine, and an unknown doing the same looks miscast.
export function castingExpectation(s, c) {
  const fit = typeFit(s, c);
  if (fit >= 0) return fit;                    // they know what they are getting
  const talked = Math.min(1, ((s.fame || 0) + (s.media || 0) * 0.6) / 110);
  return fit * (1 - talked * 0.75);
}

// AFTER. This is where the bet pays or does not, and it is the reason to take a part against
// type at all. Playing to your label is safe and small. A stretch is judged on whether you
// actually pulled it off — the picture itself and what you can do — and a stretch you land is
// worth MORE than anything safe, because that is the performance people talk about for years.
export function roleAcceptance(s, c) {
  const fit = typeFit(s, c);
  const skill = s.dream === 'singer' ? (s.singing || 0) : (s.acting || 0);
  if (fit >= -0.3) return fit * 0.7;           // on type, or near enough: safe and modest
  const rating = Number.isFinite(c.rating) ? c.rating : 55;
  // Did it land? The film is most of the evidence and your craft is the rest.
  const landed = Math.max(0, Math.min(1, 0.5 + ((rating - 60) / 60) * 0.6 + ((skill - 60) / 80) * 0.4));
  return Math.abs(fit) * (landed * 2.6 - 1.3);
}
export function acceptanceWord(s, c) {
  const a = roleAcceptance(s, c);
  const fit = typeFit(s, c);
  if (fit >= -0.3) return null;
  if (a >= 0.8) return 'Nobody expected you in this and nobody is talking about anything else.';
  if (a >= 0.2) return 'They were not sure about the casting. They are now.';
  if (a <= -0.7) return 'They did not believe you in it, and the reviews said so before the audience did.';
  return 'The part never quite fitted, and everybody could see the seams.';
}
