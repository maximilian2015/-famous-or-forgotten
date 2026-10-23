// Story generator V2 — PROTOTYPE, not imported by the game (Maxi/ChatGPT, 23 Oct: "do not change
// the code yet; audit, then show twenty stories beside the old ones").
//
// The premise the game writes today (career/story.js makePremise) is three phrases drawn from
// three tables, independently: a place, an incident, a twist. Nothing connects them — the twist
// may be about a dead man nobody mentioned — and nobody in them wants anything. A film is a person
// who wants something, a thing that happens to them, what stands in the way, and what the
// audience is not told until the end.
//
// So a story here is drawn from a SHAPE: one of a few plots each genre actually has (the last
// broadcast, the lie that has to hold for a weekend, the band that has not spoken since the last
// tour). Inside a shape every option is written to fit every other, so the surface varies freely
// and the sense does not: who the hero is, where it happens, what sets it off, what stands in the
// way. The twist belongs to the incident that sets it off, so it is always about something the
// story introduced. The player sees the logline and the synopsis; the twist is kept apart and is
// never printed on a poster or an offer.
//
// A film that already has a TITLE (every film in an old save) is read the other way round: the
// words of the title choose the shape and the options that share them — "Midnight Talker" finds
// the radio host. Everything is seeded by the title, so a film always tells the same story.
import { hash, rng } from '../../src/engine/hash.js';
import { COMEDY } from './shapes/comedy.js';
import { ROMANCE } from './shapes/romance.js';
import { MUSICAL } from './shapes/musical.js';
import { DRAMA } from './shapes/drama.js';
import { HORROR } from './shapes/horror.js';
import { THRILLER } from './shapes/thriller.js';
import { CRIME } from './shapes/crime.js';
import { SCIFI } from './shapes/scifi.js';

const pickR = (arr, r) => arr[Math.floor(r() * arr.length) % arr.length];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const low = (s) => s[0].toLowerCase() + s.slice(1);

// ── the shapes ────────────────────────────────────────────────────────────────
// who:   the hero, with keywords a title can match (k) and a gender when the wording has one (g)
// where: the place and the pressure of it; `place` is what a poster draws
// spark: what sets it off; `motif` is the object a poster can be about; its twists are about it
// block: what stands in the way
// roles: the other parts in it, for a player who is not the lead
// Any option (a who, where, spark, block or twist; a block or twist can be { t, needs }) may say
// `needs: [...]`: it is only used when every one of those is true of the hero and the place — the
// where's `place`, or a word in the who's or where's `is`. That is how a coach party only arrives
// at a hotel, and a dead father's ashes are only driven by his children.
// Templates use {who} {where} {spark} {block}; {they}/{them}/{their} follow the hero.
export const SHAPES = [...COMEDY, ...ROMANCE, ...MUSICAL, ...DRAMA, ...HORROR, ...THRILLER, ...CRIME, ...SCIFI];

// The words of a title, as the shapes speak about them.
const TITLE_WORDS = { talker: ['talker', 'talk', 'radio', 'voice'], midnight: ['midnight', 'night'], unit: ['unit', 'factory', 'works'], orbit: ['orbit', 'stars'], protocol: ['protocol', 'clinic'],
  sirens: ['sirens', 'harbour', 'sea'], debt: ['debt', 'debts'], hungers: ['hungers', 'hunger'], signal: ['signal', 'radio'], radiant: ['radiant', 'signal'], sentence: ['sentence', 'court'],
  echo: ['echo', 'hollow'], hollow: ['hollow', 'echo'], letter: ['letter'], honest: ['honest', 'letter'], wedding: ['wedding', 'small'], light: ['light', 'theatre'], rain: ['rain'],
  machine: ['machine'], apartment: ['apartment', 'flat'], roommate: ['roommate', 'apartment'], voice: ['voice'], door: ['door'], hive: ['hive', 'sisters'], sisters: ['sisters'],
  woman: ['woman'], last: ['last'], stars: ['stars', 'signal'], wonders: ['wonders', 'signal'], idiots: ['idiots', 'fools'], fair: ['fair', 'alibi'], alibi: ['alibi'], double: ['double', 'sentence'] };
function titleWords(title) {
  const out = new Set();
  for (const w of String(title || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)) { out.add(w); for (const x of TITLE_WORDS[w] || []) out.add(x); }
  return out;
}
const score = (opt, words) => (opt.k || []).reduce((n, k) => n + (words.has(k) ? 1 : 0), 0);
// The best-matching option, the seed breaking ties — so a title with nothing to say gets a fair draw.
// `filter` is what is wanted, `must` what is required: when nothing passes the first, the second.
function choose(opts, words, r, filter = () => true, must = filter) {
  const ok = opts.filter(filter), need = opts.filter(must);
  const list = ok.length ? ok : need.length ? need : opts;
  const best = Math.max(...list.map((o) => score(o, words)));
  return pickR(list.filter((o) => score(o, words) === best), r);
}
// he / she / they, for the hero
const VERB = { is: 'is', was: 'was', run: 'runs', show: 'shows', stay: 'stays', believe: 'believes', love: 'loves' };
const PRON = { m: { they: 'he', them: 'him', their: 'his', themselves: 'himself', ...VERB }, f: { they: 'she', them: 'her', their: 'her', themselves: 'herself', ...VERB } };
function fill(text, g) {
  const p = PRON[g] || PRON.m;
  return text.replace(/\{(They|they|Them|them|Their|their|themselves|is|was|run|show|stay|believe|love)\}/g, (m, w) => { const v = p[w.toLowerCase()]; return w[0] === w[0].toUpperCase() && !VERB[w] ? cap(v) : v; });
}

// One combination, written out — what storyFor does once it has chosen, and what the checker reads
// for every combination a shape can make.
export function compose(shape, who, where, spark, block, twist, g) {
  const f = (t) => fill(t, g);
  const W = f(who.t), S = f(spark.t), P = f(where.t), B = f(text(block));
  const put = (tpl) => tpl.replace('{Who}', cap(W)).replace('{who}', W).replace('{where}', P).replace('{Spark}', cap(S)).replace('{spark}', S).replace('{Block}', cap(B)).replace('{block}', B);
  return { logline: put(shape.log), synopsis: put(shape.tpl), twist: f(text(twist)), hero: W };
}
const text = (o) => (typeof o === 'string' ? o : o.t);
// what is true of this hero in this place, for `needs`
export const traitsOf = (who, where) => new Set([where.place, ...(who.is || []), ...(where.is || [])]);
export const fits = (o, traits) => typeof o === 'string' || !o.needs || o.needs.every((n) => traits.has(n));

// ── a film's story ────────────────────────────────────────────────────────────
// { title, genre, gender (the hero's, when the player is the lead), lead (is the player the hero) }
// `recent` is the stories of the player's last films, newest last: the last three shapes are not
// told again, and no hero, place or incident from any of them is used twice while another will do.
export function storyFor({ title, genre, gender = 'm', lead = true, recent = [] }) {
  const r = rng(hash('story|' + title + '|' + genre));
  for (let i = 0; i < 3; i++) r();
  const words = titleWords(title);
  const all = SHAPES.filter((s) => s.genre === genre);
  if (!all.length) return null;
  const lately = new Set(recent.slice(-3).map((x) => x.shape));
  const shapes = all.filter((s) => !lately.has(s.id)).length ? all.filter((s) => !lately.has(s.id)) : all;
  const used = new Set(recent.flatMap((x) => x.parts || []));
  const unused = (o) => !used.has(o.t);
  // the shape the title speaks to most: its own words, and the best option in each slot
  const fit = (s) => score(s, words) + Math.max(0, ...s.who.map((o) => score(o, words))) + Math.max(0, ...s.where.map((o) => score(o, words))) + Math.max(0, ...s.spark.map((o) => score(o, words)));
  const best = Math.max(...shapes.map(fit));
  const shape = pickR(shapes.filter((s) => fit(s) === best), r);
  const g = lead ? gender : (r() < 0.5 ? 'm' : 'f');
  const who = choose(shape.who, words, r, (o) => (!o.g || o.g === g) && unused(o), (o) => !o.g || o.g === g);
  const where = choose(shape.where, words, r, (o) => fits(who, traitsOf(who, o)) && fits(o, traitsOf(who, o)) && unused(o), (o) => fits(who, traitsOf(who, o)) && fits(o, traitsOf(who, o)));
  const tr = traitsOf(who, where);
  const spark = choose(shape.spark, words, r, (o) => fits(o, tr) && unused(o), (o) => fits(o, tr));
  const block = pickR(shape.block.filter((o) => fits(o, tr)), r);
  const twist = pickR(spark.twists.filter((o) => fits(o, tr)), r);
  const c = compose(shape, who, where, spark, block, twist, g);
  const matched = [...new Set([...(shape.k || []), ...(who.k || []), ...(where.k || []), ...(spark.k || [])].filter((k) => words.has(k)))];
  return {
    v: 1, shape: shape.id, genre, g,
    hero: c.hero, place: where.place, traits: [...tr], motif: spark.motif || null,
    logline: c.logline, synopsis: c.synopsis,
    twist: c.twist,                                    // hidden: never on a poster, an offer or a review
    tagline: pickR(shape.tags, r),
    // the player's part: the hero when it is the lead, one of the shape's other people when not
    part: lead ? c.hero : pickR(shape.roles, r),
    matched,
    // for a sequel: what is now common knowledge, and what the next one can be set off by
    used: { spark: spark.t, twist: c.twist },
    // what the next films should not repeat
    parts: [who.t, where.t, spark.t],
  };
}
// A part two remembers part one: the twist is now what everybody knows, the hero is the same
// person some years on, and the next thing that happens comes from the same shape — never the
// same incident twice.
export function sequelFor(first, { title, years = 3, fate = null }) {
  const shape = SHAPES.find((s) => s.id === first.shape);
  if (!shape) return null;
  const r = rng(hash('sequel|' + title + '|' + first.shape));
  const tr = new Set(first.traits || [first.place]);
  const ok = shape.spark.filter((x) => fits(x, tr));
  const fresh = ok.filter((x) => x.t !== first.used.spark);
  const spark = pickR(fresh.length ? fresh : ok, r);
  const block = text(pickR(shape.block.filter((o) => fits(o, tr)), r));
  const after = years <= 1 ? 'A year after' : `${years} years after`;
  const known = first.twist.replace(/\.$/, '');
  const S = fill(spark.t, first.g);
  return { logline: `${after} the first film, ${low(first.hero)} is living with what everybody now knows. Then ${S}.`,
    synopsis: `Everybody knows now: ${low(known)}. ${after} it, ${low(first.hero)} is still there${fate ? ', ' + fate : ''} — and then ${S}, and ${fill(block, first.g)}.`,
    twist: fill(text(pickR(spark.twists.filter((o) => fits(o, tr)), r)), first.g) };
}
