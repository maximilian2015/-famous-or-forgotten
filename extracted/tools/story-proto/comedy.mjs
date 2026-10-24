// node tools/story-proto/comedy.mjs <save.json> [out.json]
// Every comedy in a save: the premise it has today, and the story the prototype tells for it —
// plus the same hero as a she and as a he, to show the wording follows.
import fs from 'node:fs';
import { storyFor } from '../../src/systems/career/plot/plot.js';

const [,, savePath, out] = process.argv;
const raw = JSON.parse(fs.readFileSync(savePath, 'utf8'));
const s = raw.state || raw;
const g = s.gender === 'female' ? 'f' : 'm';
const seen = new Set();
const films = (s.filmography || []).filter((c) => c.genre === 'Comedy' && c.premise).map((c) => ({ ...c, base: c.title.replace(/\s*·\s*season\s+\d+/i, '') }))
  .filter((c) => !seen.has(c.base) && seen.add(c.base)).sort((a, b) => (a.year || 0) - (b.year || 0));
// told in the order they were made, each one remembering the comedies before it
const recent = [];
const rows = films.map((c) => {
  const lead = c.tier === 'lead' || c.tier === 'tentpole';
  const story = storyFor({ title: c.base, genre: 'Comedy', gender: g, lead, recent });
  recent.push(story);
  return { title: c.base, year: c.year, tier: c.tier, old: c.premise, story };
});
if (out) fs.writeFileSync(out, JSON.stringify(rows, null, 1));
const shapes = {};
for (const r of rows) shapes[r.story.shape] = (shapes[r.story.shape] || 0) + 1;
console.log(`${rows.length} comedies; shapes:`, shapes);
