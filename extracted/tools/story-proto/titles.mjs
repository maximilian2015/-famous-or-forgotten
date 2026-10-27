// node tools/story-proto/titles.mjs [n] [genre]
// Does the title belong to the story? For n titles per genre from the game's own title generator,
// a title is LINKED when one of its words — or what the word stands for (TITLE_WORDS: "Talker" is a
// voice on the radio, "Rain" is weather) — is in the parts the story was built from (their
// keywords, the incident's object, the place) or in the story's own text. The HEAD is the word the
// title is about ("Wedding" in "Small Wedding", "Woman" in "The Last Woman", "Music" in "Music
// Inside Your Heart"); a title can be linked by its adjective and still miss its head, which is
// what "Small Wedding" with no wedding was.
import { newTitle } from '../../src/systems/world/titles.js';
import { storyFor, SHAPES, conceptsOf, headOf } from '../../src/systems/career/plot/plot.js';
import { lemma } from './words.mjs';

const N = +process.argv[2] || 400, only = process.argv[3];
const FUNC = new Set(['the', 'a', 'an', 'of', 'and', 'your', 'above', 'beneath', 'behind', 'after', 'without', 'beyond', 'before', 'under', 'inside',
  'guess', "who's", 'look', 'ask', "nobody's", "everybody's", 'resurrected', 'coming', 'to', 'dinner', 'talking', 'back', 'sorry', 'now', 'lying', 'leaving',
  'counting', 'watching', 'laughing', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'ninth', 'eleventh', 'thirteenth']);
const tokens = (t) => t.toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter((w) => w && !FUNC.has(w));
function keysOf(st) {
  const sh = SHAPES.find((s) => s.id === st.shape); const [w, p, k] = st.parts;
  const who = sh.who.find((o) => o.t === w), where = sh.where.find((o) => o.t === p), spark = sh.spark.find((o) => o.t === k);
  const keys = new Set([...(sh.k || []), ...(who.k || []), ...(where.k || []), ...(spark.k || []), where.place, spark.motif].filter(Boolean));
  for (const x of (st.logline + ' ' + st.synopsis).toLowerCase().match(/[a-z]+/g) || []) keys.add(lemma(x));
  return keys;
}
const hits = (word, keys) => [...conceptsOf(word)].some((c) => keys.has(c) || keys.has(lemma(c)));
const misses = {};
for (const genre of ['Comedy', 'Romance', 'Musical', 'Drama', 'Horror', 'Thriller', 'Crime', 'Sci-Fi'].filter((g) => !only || g === only)) {
  const st = {}; let linked = 0, head = 0, n = 0;
  for (let i = 0; i < N; i++) {
    const t = newTitle(st, genre); if (/\d/.test(t)) continue;                   // 'Precinct 13' is judged by its noun alone, below
    const x = storyFor({ title: t, genre, gender: i % 2 ? 'f' : 'm', lead: true }); n++;
    const keys = keysOf(x); const tw = tokens(t);
    if (tw.some((w) => hits(w, keys))) linked++;
    const h = headOf(t);
    if (!h || hits(h, keys)) head++; else (misses[genre] = misses[genre] || {})[h] = ((misses[genre] || {})[h] || 0) + 1;
  }
  console.log(`${genre.padEnd(9)} linked ${Math.round(100 * linked / n)}%   head word in the story ${Math.round(100 * head / n)}%   (${n} titles)`);
}
if (process.env.MISSES) for (const [g, m] of Object.entries(misses)) console.log(`\n${g}: ` + Object.entries(m).sort((a, b) => b[1] - a[1]).map(([w, c]) => `${w} ${c}`).join(', '));
