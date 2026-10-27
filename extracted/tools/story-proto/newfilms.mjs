// node tools/story-proto/newfilms.mjs — a dozen new films told the way stage 1b would: the story
// first (with the memory of the ones before), then a title from it. Markdown.
import { storyFor } from '../../src/systems/career/plot/plot.js';
import { titleFor } from './titlefor.mjs';
const out = []; const recent = []; const used = new Set();
const genres = ['Comedy', 'Romance', 'Musical', 'Drama', 'Horror', 'Thriller', 'Crime', 'Sci-Fi'];
for (let i = 0; i < 16; i++) {
  const genre = genres[i % 8];
  const st = storyFor({ title: `#new-${i}`, genre, gender: i % 3 ? 'm' : 'f', lead: true, recent });
  recent.push(st);
  out.push(`- **${titleFor(st, used)}** (${genre}) — ${st.synopsis}\n  *Twist:* ${st.twist}`);
}
console.log(out.join('\n'));
