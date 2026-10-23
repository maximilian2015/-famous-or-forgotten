// node tools/story-proto/run.mjs <save.json> [out.json]
// Twenty real films from a save, the premise each has today beside the story the prototype
// tells for the same title and genre, and two sequels told from their first parts.
import fs from 'node:fs';
import { storyFor, sequelFor } from './stories.js';

const [,, savePath, out] = process.argv;
const raw = JSON.parse(fs.readFileSync(savePath, 'utf8'));
const s = raw.state || raw;
const films = (s.filmography || []).filter((c) => c.premise);
const PICK = ['Midnight Talker', 'Blue Roommate', 'Idiots and Idiots', 'Orbit 65', 'Honest Letter', 'Small Wedding · season 3', 'Unit 99', 'Light and Rain',
  'Honest Machine', 'Apartment 45', 'A Voice Above Your Door', 'Protocol 79', 'HUNGERs', 'The Hive of Sisters', 'Radiant Signal', 'Hollow Echo',
  'A Debt of Sirens', 'Double Sentence', 'The Last Woman', 'Stars and Light'];
const g = s.gender === 'female' ? 'f' : 'm';
const rows = PICK.map((t) => films.find((c) => c.title === t)).filter(Boolean).map((c) => {
  const lead = c.tier === 'lead' || c.tier === 'tentpole';
  const st = storyFor({ title: c.title.replace(/\s*·\s*season\s+\d+/i, ''), genre: c.genre, gender: g, lead });
  return { title: c.title, genre: c.genre, scale: c.scale, tier: c.tier, year: c.year, old: c.premise, story: st };
});
// Sequels: told from the first part, against the premise the save gave the second part.
const seq = [['Radiant Signal', 'Radiant Signal II'], ['Light and Rain', 'Light and Rain II'], ['The Hive of Sisters', 'The Hive of Sisters II']].map(([a, b]) => {
  const one = films.find((c) => c.title === a), two = films.find((c) => c.title === b);
  if (!one || !two) return null;
  const first = storyFor({ title: a, genre: one.genre, gender: g, lead: one.tier === 'lead' || one.tier === 'tentpole' });
  return { first: a, second: b, oldFirst: one.premise, oldSecond: two.premise, story1: first, story2: sequelFor(first, { title: b, years: Math.max(1, (two.year || 0) - (one.year || 0)) }) };
}).filter(Boolean);
const res = { rows, seq };
if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));
for (const r of rows) {
  console.log(`\n${r.title} · ${r.genre} · ${r.scale} · ${r.tier}`);
  console.log(`  OLD  ${r.old}`);
  console.log(`  NEW  ${r.story.logline}`);
  console.log(`       ${r.story.synopsis}`);
  console.log(`  TWIST ${r.story.twist}`);
  console.log(`  PART ${r.story.part} · motif ${r.story.motif} · place ${r.story.place} · title words ${r.story.matched.join(',') || '—'}`);
}
for (const q of seq) {
  console.log(`\nSEQUEL ${q.first} → ${q.second}`);
  console.log(`  OLD 1  ${q.oldFirst}\n  OLD 2  ${q.oldSecond}`);
  console.log(`  NEW 1  ${q.story1.synopsis}\n  TWIST1 ${q.story1.twist}\n  NEW 2  ${q.story2.synopsis}\n  TWIST2 ${q.story2.twist}`);
}
