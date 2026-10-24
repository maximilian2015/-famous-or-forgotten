// node tools/story-proto/memory.mjs — 40 careers of 12 films per genre, told two ways:
//   old  — the film already has a title (every film in a save): the title chooses, memory second.
//   new  — the story first, with memory, and then its title (titlefor.mjs), as a new film would be.
// Counts careers that meet the same hero twice, plots told twice in a row, and titles whose head
// word is not in the story.
import { newTitle } from '../../src/systems/world/titles.js';
import { storyFor, conceptsOf, headOf } from './stories.js';
import { titleFor, aboutOf } from './titlefor.mjs';
import { lemma } from './words.mjs';
const headIn = (t, st) => { const k = aboutOf(st); return [...conceptsOf(headOf(t))].some((c) => k.has(c) || k.has(lemma(c))); };
for (const genre of ['Comedy', 'Romance', 'Musical', 'Drama', 'Horror', 'Thriller', 'Crime', 'Sci-Fi']) {
  const row = [];
  for (const mode of ['old', 'new']) {
    let heroRep = 0, back = 0, miss = 0, n = 0;
    for (let c = 0; c < 40; c++) {
      const st = {}; const recent = []; const used = new Set();
      for (let i = 0; i < 12; i++) {
        let title, x;
        if (mode === 'old') { title = newTitle(st, genre); x = storyFor({ title, genre, gender: c % 2 ? 'f' : 'm', lead: true, recent }); }
        else { x = storyFor({ title: `#${c}-${i}`, genre, gender: c % 2 ? 'f' : 'm', lead: true, recent }); title = titleFor(x, used) || ''; }
        if (recent.length && recent.at(-1).shape === x.shape) back++;
        if (!title || !headIn(title, x)) miss++; n++;
        recent.push(x);
      }
      if (new Set(recent.map((x) => x.hero.replace(/\b(he|she|his|her|him)\b/g, '_'))).size < 12) heroRep++;
    }
    row.push(`hero repeated ${String(heroRep).padStart(2)}/40, same plot twice running ${String(back).padStart(3)}, title head missing ${Math.round(100 * miss / n)}%`);
  }
  console.log(`${genre.padEnd(9)} old: ${row[0]}\n          new: ${row[1]}`);
}
