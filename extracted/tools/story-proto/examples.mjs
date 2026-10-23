// node tools/story-proto/examples.mjs <save.json> [out.md]
// Every film in a save, in the order it was made, told by the prototype with the memory of the
// films before it, beside the premise the game gave it — grouped by genre, then the sequels told
// from their first parts. Markdown, for forwarding.
import fs from 'node:fs';
import { storyFor, sequelFor } from './stories.js';

const [,, savePath, out] = process.argv;
const raw = JSON.parse(fs.readFileSync(savePath, 'utf8'));
const s = raw.state || raw;
const g = s.gender === 'female' ? 'f' : 'm';
const base = (t) => t.replace(/\s*·\s*season\s+\d+/i, '');
const seen = new Set();
const films = (s.filmography || []).filter((c) => c.premise && c.genre !== 'Commercial')
  .filter((c) => !/\bII+$|\b\d$/.test(base(c.title)))      // sequels are told from their first part, below
  .filter((c) => !seen.has(base(c.title)) && seen.add(base(c.title)))
  .sort((a, b) => (a.year || 0) - (b.year || 0));
const recent = [];
const rows = films.map((c) => {
  const lead = c.tier === 'lead' || c.tier === 'tentpole';
  const story = storyFor({ title: base(c.title), genre: c.genre, gender: g, lead, recent });
  if (story) recent.push(story);
  return { c, story };
}).filter((x) => x.story);

let md = '';
for (const genre of [...new Set(rows.map((x) => x.c.genre))]) {
  md += `\n## ${genre}\n\n`;
  for (const { c, story } of rows.filter((x) => x.c.genre === genre)) {
    md += `### ${base(c.title)} (${c.year})\n\n- **Old:** ${c.premise}\n- **New:** ${story.synopsis}\n- **Hidden twist:** ${story.twist}\n`;
    if (c.tier !== 'lead' && c.tier !== 'tentpole') md += `- **Your part (not the lead):** ${story.part}\n`;
    md += '\n';
  }
}
const pairs = (s.filmography || []).map((c) => [base(c.title).replace(/\s+(II+|\d)$/, ''), c]).filter(([t, c]) => t !== base(c.title));
const seqs = [];
for (const [firstTitle, two] of pairs) {
  const one = (s.filmography || []).find((c) => base(c.title) === firstTitle);
  if (!one || seqs.some((q) => q.second === two.title)) continue;
  // part one as the career told it, with its memory — never told a second time without it
  const first = (rows.find((x) => base(x.c.title) === firstTitle) || {}).story;
  if (!first) continue;
  seqs.push({ first: firstTitle, second: two.title, old1: one.premise, old2: two.premise, s1: first, s2: sequelFor(first, { title: two.title, years: Math.max(1, (two.year || 0) - (one.year || 0)) }) });
}
if (seqs.length) {
  md += '\n## Sequels\n\n';
  for (const q of seqs) md += `### ${q.first} → ${q.second}\n\n- **Old, part 1:** ${q.old1}\n- **Old, part 2:** ${q.old2}\n- **New, part 1:** ${q.s1.synopsis}\n- **Part 1 twist:** ${q.s1.twist}\n- **New, part 2:** ${q.s2.synopsis}\n- **Part 2 twist:** ${q.s2.twist}\n\n`;
}
if (out) fs.writeFileSync(out, md);
console.log(`${rows.length} films, ${seqs.length} sequels`);
