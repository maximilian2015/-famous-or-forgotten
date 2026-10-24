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
import { TITLE_MEANS } from './titlewords.js';

const pickR = (arr, r) => arr[Math.floor(r() * arr.length) % arr.length];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const low = (s) => s[0].toLowerCase() + s.slice(1);

// ── the shapes ────────────────────────────────────────────────────────────────
// who:   the hero, with keywords a title can match (k) and a gender when the wording has one (g)
// where: the place and the pressure of it; `place` is what a poster draws
// spark: what sets it off; `motif` is the object a poster can be about; its twists are about it
// block: what stands in the way
// roles: the other parts in it, for a player who is not the lead ({ t, g } when the wording has a gender)
// world: what this story always has without saying so (a film crew has a director) — structure.mjs
//        accepts "the X" for these, and for nothing else the story has not brought in
// pl: true on a shape (or a who) — the hero is more than one person: they, and plural verbs.
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
// Everything a title word stands for: itself, its root, and what TITLE_WORDS says it means.
export function conceptsOf(w) { w = String(w).toLowerCase(); return new Set([w, ...(TITLE_WORDS[w] || []), ...(TITLE_MEANS[w] || [])]); }
// The word a title is about: "Wedding" in "Small Wedding", "Hive" in "The Hive of Sisters", "Music" in
// "Music Inside Your Heart". It weighs double, so an adjective cannot outvote it.
const PREPS = ['above', 'beneath', 'behind', 'after', 'without', 'beyond', 'before', 'under', 'inside'];
const LEAD_IN = new Set(['the', 'a', 'an', 'your', 'and', 'of', 'guess', "who's", 'look', 'ask', "nobody's", "everybody's", 'resurrected', 'coming', 'to', 'dinner',
  'talking', 'back', 'sorry', 'now', 'lying', 'leaving', 'counting', 'watching', 'laughing', ...PREPS]);
export function headOf(title) {
  const w = String(title || '').toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean);
  const of = w.indexOf('of'); if (of > 0) return w[of - 1];
  const prep = w.findIndex((x) => PREPS.includes(x)); if (prep > 0) return w[prep - 1];
  const c = w.filter((x) => !LEAD_IN.has(x)); return c[c.length - 1] || null;
}
// What the title asks for: every word's meanings (weighted, the head word's double), and on their
// own the head word's — which is what the title is ABOUT, and what memory may not overrule.
function titleWords(title) {
  const out = new Map(); const head = headOf(title);
  for (const w of String(title || '').toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter((x) => x && !LEAD_IN.has(x))) {
    for (const c of conceptsOf(w)) out.set(c, Math.max(out.get(c) || 0, w === head ? 2 : 1));
  }
  out.head = new Map(head ? [...conceptsOf(head)].map((c) => [c, 1]) : []);
  return out;
}
// How much of what the title asks for an option is: its keywords, the object it is about, its place.
const keysOf = (opt) => [...new Set([...(opt.k || []), opt.motif, opt.place].filter(Boolean))];
const score = (opt, words) => keysOf(opt).reduce((n, k) => n + (words.get(k) || 0), 0);
const headScore = (opt, words) => keysOf(opt).reduce((n, k) => n + (words.head.get(k) || 0), 0);
// The best-matching option, the seed breaking ties — so a title with nothing to say gets a fair draw.
// `filter` is what is wanted, `must` what is required: when nothing passes the first, the second.
// What the title is about wins over memory: an option that answers the head word is kept even if
// this career has had it. Everything weaker — an adjective, a lean — comes after memory: among the
// options `filter` wants (the unused), the one the whole title likes best.
function choose(opts, words, r, filter = () => true, must = filter) {
  const need = opts.filter(must).length ? opts.filter(must) : opts;
  const hb = Math.max(...need.map((o) => headScore(o, words)));
  const pool0 = hb > 0 ? need.filter((o) => headScore(o, words) > 0) : need;
  const pool = pool0.some(filter) ? pool0.filter(filter) : pool0;
  const best = Math.max(...pool.map((o) => score(o, words)));
  return pickR(pool.filter((o) => score(o, words) === best), r);
}
// he / she / they, for the hero
const VERB = { is: 'is', was: 'was', run: 'runs', show: 'shows', stay: 'stays', believe: 'believes', love: 'loves', stop: 'stops', know: 'knows', have: 'has', do: 'does', work: 'works', make: 'makes', remember: 'remembers', need: 'needs', want: 'wants', talk: 'talks' };
const PRON = { m: { they: 'he', them: 'him', their: 'his', themselves: 'himself', ...VERB }, f: { they: 'she', them: 'her', their: 'her', themselves: 'herself', ...VERB } };
function fill(text, g) {
  const p = PRON[g] || PRON.m;
  return text.replace(/\{(They|they|Them|them|Their|their|themselves|is|was|run|show|stay|believe|love|stop|know|have|do|work|make|remember|need|want|talk)\}/g, (m, w) => { const v = p[w.toLowerCase()]; return w[0] === w[0].toUpperCase() && !VERB[w] ? cap(v) : v; });
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
  const used = new Set(recent.flatMap((x) => x.parts || []));
  const unused = (o) => !used.has(o.t);
  // not one of the last three, and with a hero this career has not met yet — each while one is left
  const narrow = (list, ok) => (list.some(ok) ? list.filter(ok) : list);
  const g = lead ? gender : (r() < 0.5 ? 'm' : 'f');
  // the shape the title speaks to most: its own words, and the best option in each slot — a hero
  // only counts if this hero can be one (a man is not "the last woman awake on board")
  const fitBy = (sc) => (s) => sc(s, words) + Math.max(0, ...s.who.filter((o) => !o.g || o.g === g).map((o) => sc(o, words)))
    + Math.max(0, ...s.where.map((o) => sc(o, words))) + Math.max(0, ...s.spark.map((o) => sc(o, words)));
  const fit = fitBy(score), headFit = fitBy(headScore);
  // the shapes that answer what the title is about, if any do; then memory among them — not one of
  // the last three, with a hero this career has not met yet, each while one is left; then the
  // shape the whole title likes best
  const hb = Math.max(...all.map(headFit));
  const pool = narrow(narrow(hb > 0 ? all.filter((s) => headFit(s) > 0) : all, (s) => !lately.has(s.id)), (s) => s.who.some((o) => unused(o) && (!o.g || o.g === g)));
  const best = Math.max(...pool.map(fit));
  const shape = pickR(pool.filter((s) => fit(s) === best), r);
  const who = choose(shape.who, words, r, (o) => (!o.g || o.g === g) && unused(o), (o) => !o.g || o.g === g);
  const where = choose(shape.where, words, r, (o) => fits(who, traitsOf(who, o)) && fits(o, traitsOf(who, o)) && unused(o), (o) => fits(who, traitsOf(who, o)) && fits(o, traitsOf(who, o)));
  const tr = traitsOf(who, where);
  const spark = choose(shape.spark, words, r, (o) => fits(o, tr) && unused(o), (o) => fits(o, tr));
  const block = pickR(shape.block.filter((o) => fits(o, tr)), r);
  const twist = pickR(spark.twists.filter((o) => fits(o, tr)), r);
  const c = compose(shape, who, where, spark, block, twist, g);
  const matched = [...new Set([...(shape.k || []), ...(who.k || []), ...(where.k || []), ...(spark.k || []), where.place, spark.motif].filter((k) => k && words.has(k)))];
  return {
    v: 1, shape: shape.id, genre, g,
    hero: c.hero, place: where.place, traits: [...tr], motif: spark.motif || null,
    logline: c.logline, synopsis: c.synopsis,
    twist: c.twist,                                    // hidden: never on a poster, an offer or a review
    tagline: pickR(shape.tags, r),
    // the player's part: the hero when it is the lead, one of the shape's other people when not
    // a role with a gender in its wording only goes to a player of that gender
    part: lead ? c.hero : text(pickR(shape.roles.filter((o) => typeof o === 'string' || o.g === gender), r)),
    matched,
    // for a sequel: what is now common knowledge, and what the next one can be set off by
    used: { spark: spark.t, twist: c.twist },
    // what the next films should not repeat
    parts: [who.t, where.t, spark.t],
  };
}
// A part two remembers part one: the same hero, some years on, in the same place (its traits rule
// out anything part one's place could not have), with part one's twist now common knowledge, and
// the next thing that happens from the same shape — never the same incident twice. Four ways of
// opening, so a career of franchises does not hear the same sentence each time; `recent` is the
// player's earlier sequels, and the opening the last one used is not used again.
const NUM = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const OPENINGS = [
  ({ later, hero, is, known }) => `Everybody knows now: ${known}. ${later}, ${hero} ${is} drawn back in`,
  ({ later, hero, is, known }) => `${later}, ${hero} ${is} still living with what came out — ${known}`,
  ({ hero, has, them, known }) => `${cap(hero)} ${has} tried to put it behind ${them}: ${known}. It does not stay there`,
  ({ later, hero, was, known }) => `${later}, the secret is out — ${known} — and ${hero} ${was} meant to be finished with all of it`,
];
export function sequelFor(first, { title, years = 3, fate = null, recent = [] }) {
  const shape = SHAPES.find((s) => s.id === first.shape);
  if (!shape) return null;
  const r = rng(hash('sequel|' + title + '|' + first.shape));
  const tr = new Set(first.traits || [first.place]);
  const ok = shape.spark.filter((x) => fits(x, tr));
  const fresh = ok.filter((x) => x.t !== first.used.spark);
  const spark = pickR(fresh.length ? fresh : ok, r);
  const block = text(pickR(shape.block.filter((o) => fits(o, tr)), r));
  const later = years <= 1 ? 'A year later' : `${cap(NUM[years] || String(years))} years later`;
  const pl = !!shape.pl;
  const known = low(first.twist.replace(/\.$/, ''));
  const last = recent.length ? recent[recent.length - 1].opening : null;
  const forms = OPENINGS.map((_, i) => i).filter((i) => i !== last);
  const opening = pickR(forms, r);
  const hero = low(first.hero);
  const S = fill(spark.t, first.g);
  const open = OPENINGS[opening]({ later, hero, is: pl ? 'are' : 'is', has: pl ? 'have' : 'has', was: pl ? 'were' : 'was', them: pl ? 'them' : fill('{them}', first.g), known });
  return { opening, shape: first.shape, hero: first.hero, place: first.place, traits: first.traits, g: first.g,
    logline: `${later}, ${hero} ${pl ? 'are' : 'is'} living with what everybody now knows. Then ${S}.`,
    synopsis: `${cap(open)}${fate ? ' — ' + fate : ''}. Then ${S}, and ${fill(block, first.g)}.`,
    twist: fill(text(pickR(spark.twists.filter((o) => fits(o, tr)), r)), first.g),
    used: { spark: spark.t }, parts: [spark.t] };
}
