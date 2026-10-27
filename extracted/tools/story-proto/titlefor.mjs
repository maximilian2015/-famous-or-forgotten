// A title for a story that has none yet — a new film the other way round from an old one: the
// story first, then a title in the game's own manner (the same shapes and the same words as
// systems/world/titles.js) whose HEAD word the story is about. "Small Wedding" for a story with
// no wedding cannot happen here, because "Wedding" is only offered to a story that has one.
//
// Prototype: the word lists are read out of titles.js, which does not export them. Integration
// exports them instead.
import fs from 'node:fs';
import { hash, rng } from '../../src/engine/hash.js';
import { SHAPES, conceptsOf } from '../../src/systems/career/plot/plot.js';
import { lemma } from './words.mjs';

const src = fs.readFileSync(new URL('../../src/systems/world/titles.js', import.meta.url), 'utf8');
const block = (name) => { const i = src.indexOf(`const ${name} = {`); let d = 0, j = i; for (; j < src.length; j++) { if (src[j] === '{') d++; if (src[j] === '}' && --d === 0) break; } return Function(`return ${src.slice(src.indexOf('{', i), j + 1)}`)(); };
const COMMON = block('COMMON'), GENRE = block('GENRE');
const listOf = (genre, key) => [...new Set([...((GENRE[genre] || {})[key] || []), ...(COMMON[key] || [])])];
const pickR = (a, r) => a[Math.floor(r() * a.length) % a.length];

// Everything a story is about, as words: the chosen parts' keywords, the incident's object, the
// place, and the roots of its own sentences — not the shape's general keywords, which are about
// every story of that kind and so about none ("Inheritance" for a strike). `said` is only what
// the story's sentences literally say.
export function aboutOf(st) {
  const sh = SHAPES.find((s) => s.id === st.shape); const [w, p, k] = st.parts;
  const who = sh.who.find((o) => o.t === w), where = sh.where.find((o) => o.t === p), spark = sh.spark.find((o) => o.t === k);
  const keys = new Set([...(who.k || []), ...(where.k || []), ...(spark.k || []), where.place, spark.motif].filter(Boolean));
  keys.said = new Set();
  for (const x of (st.logline + ' ' + st.synopsis).toLowerCase().match(/[a-z]+/g) || []) { keys.add(lemma(x)); keys.said.add(lemma(x)); }
  return keys;
}
// Said in so many words, or the incident's object / the place by name: the first choice.
const said = (word, keys) => { const w = lemma(word.toLowerCase()); return keys.said.has(w) || keys.has(w); };
// Through what the word stands for (titlewords.js): only when nothing is said outright.
const about = (word, keys) => [...conceptsOf(word.toLowerCase())].some((c) => keys.has(c) || keys.has(lemma(c)));

export function titleFor(st, used = new Set()) {
  const keys = aboutOf(st); const g = st.genre;
  const r = rng(hash('title|' + st.synopsis));
  const bare = (w) => w.replace(/^(A|The) /, '');
  const strict = (list) => list.filter((w) => said(bare(w), keys));
  const loose = (list) => list.filter((w) => about(bare(w), keys));
  const all = [...listOf(g, 'noun'), ...listOf(g, 'abstract'), ...listOf(g, 'single'), ...COMMON.thing];
  const fit = all.some((w) => said(bare(w), keys)) ? strict : loose;
  const nouns = fit(listOf(g, 'noun')), abstracts = fit(listOf(g, 'abstract')), singles = fit(listOf(g, 'single')), things = fit(COMMON.thing);
  const adjs = listOf(g, 'adj'), ords = COMMON.ordinal, preps = COMMON.prep, bodies = COMMON.body;
  const makers = [
    nouns.length && (() => `${pickR(adjs, r)} ${pickR(nouns, r)}`),
    nouns.length && (() => `The ${pickR(nouns, r)} of ${pickR(listOf(g, 'abstract'), r)}`),
    abstracts.length && (() => `${pickR(listOf(g, 'abstract'), r)} and ${pickR(abstracts, r)}`),   // the head is the second
    singles.length && (() => pickR(singles, r)),
    nouns.length && (() => `The ${pickR(ords, r)} ${pickR(nouns, r)}`),
    things.length && (() => `${pickR(things, r)} ${pickR(preps, r)} Your ${pickR(bodies, r)}`),
  ].filter(Boolean);
  if (!makers.length) return null;                       // nothing the game's words can say about it
  for (let i = 0; i < 40; i++) { const t = pickR(makers, r)(); if (!used.has(t) && !/\b(\w+) .*\b\1\b/i.test(t)) { used.add(t); return t; } }
  return null;
}
