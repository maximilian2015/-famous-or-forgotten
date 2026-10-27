// node tools/story-proto/titlefor-probe.mjs — a story first, then its title: how often the title's head is in the story.
import { newTitle } from '../../src/systems/world/titles.js';
import { storyFor, headOf } from '../../src/systems/career/plot/plot.js';
import { titleFor, aboutOf } from './titlefor.mjs';
import { conceptsOf } from '../../src/systems/career/plot/plot.js';
import { lemma } from './words.mjs';
for (const genre of ['Comedy', 'Romance', 'Musical', 'Drama', 'Horror', 'Thriller', 'Crime', 'Sci-Fi']) {
  const st = {}; const used = new Set(); let ok = 0, none = 0, n = 0; const ex = [];
  for (let i = 0; i < 300; i++) {
    const story = storyFor({ title: newTitle(st, genre) + i, genre, gender: i % 2 ? 'f' : 'm', lead: true });
    const t = titleFor(story, used); n++;
    if (!t) { none++; continue; }
    const keys = aboutOf(story); const h = headOf(t);
    if ([...conceptsOf(h)].some((c) => keys.has(c) || keys.has(lemma(c)))) ok++;
    if (ex.length < 4) ex.push(`${t} — ${story.logline}`);
  }
  console.log(`${genre.padEnd(9)} head in the story ${Math.round(100 * ok / n)}%, no title found ${none}`);
  for (const e of ex) console.log('    ' + e.slice(0, 170));
}
