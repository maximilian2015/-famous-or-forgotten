// A save whose Directors bar reads about 4, for playing what 4 means.
//
//   node tests/probes/probe_directors_save.mjs [out.json]
//
// It starts from a life really played (probe_make_save.mjs, to fame 70), which on its own drifts
// a good part of its directors cold. Then two things, each written in
// the exact shape the game's own writer leaves:
//   · one walk-off, three years and a month ago (production.js walkOffSet: cold, closeness at
//     most ten, a grudge for sixty months). Old enough that the Studios bar's three-year memory
//     of it has lapsed, so what is felt in play is the directors and nothing else;
//   · drift, on the coolest of the rest until the bar reads 3–5 (life/bonds.js bondsTick: closeness
//     at nothing, ten months unseen, cold).
// The warmest director is left warm on purpose: one open door is how you see the others shut.
// Cold at closeness ten or under stays cold — bondsTick only lifts it above ten — so the bar holds.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const P = new URL('../../src/', import.meta.url).href;
const { FACTIONS } = await import(P + 'systems/meta/factions.js');
const { directorCounts, monthName } = await import(P + 'systems/meta/yourDirectors.js');
const { newTitle } = await import(P + 'systems/world/titles.js');
const out = process.argv[2] || 'directors-4.json';
const tmp = path.join(here, '_directors_base.json');

const bar = (s) => FACTIONS.directors.read(s).score;
// Lives are not seeded, and some drift so far on their own that a grudge on top lands at nought.
// Those are thrown back: drift only ever cools, so a life has to start above the mark.
function attempt() {
  spawnSync(process.execPath, [path.join(here, 'probe_make_save.mjs'), '70', tmp], { encoding: 'utf8' });
  const s = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  const dirs = (s.people || []).filter((p) => /Director/.test(p.role || ''));
  // Enough directors to be "mostly cold" rather than "both of them".
  if (!s.alive || dirs.length < 6) return null;
  const now = s.year * 12 + s.month;
  // Box office poison halves the offers, which is where most of the director doors are; a
  // playtest of the directors should not be one of the poison as well.
  if ((s.poisonUntil || 0) > now) return null;
  const keep = dirs.slice().sort((a, b) => (b.relationship || 0) - (a.relationship || 0))[0];
  const films = (p) => (s.filmography || []).filter((c) => c.director === p.name);
  const lastYear = (p) => Math.max(0, ...films(p).map((c) => c.year || 0));
  // Somebody directing you now, or with a film of yours in post, has not drifted and was not walked out on.
  const busy = new Set([...(s.productions || []).map((p) => p.crew && p.crew[0] && p.crew[0].name), ...(s.releases || []).map((r) => r.director)]);
  const free = (p) => p !== keep && !busy.has(p.name);

  // The walk-off: somebody you made the most with, whose last film together is older than it.
  const since = now - 37;
  const walked = dirs.filter((p) => free(p) && lastYear(p) * 12 <= since)
    .sort((a, b) => films(b).length - films(a).length)[0] || dirs.find(free);
  if (!walked) return null;
  const title = newTitle(s, 'Drama');
  s.grudges = [{ who: walked.name, title, scale: 'feature', since, due: since + 9999, until: since + 60, hit: false, gross: 0, opened: true }];
  walked.cold = true; walked.relationship = Math.min(walked.relationship || 0, 10);
  s.timeline.unshift({ text: `Walked off "${title}". They recast within the week. Everybody heard.`, when: monthName(since), bad: true });
  s.rumour = null;

  // Drift, coolest first, until the bar reads about four.
  for (const p of dirs.filter((x) => free(x) && !x.cold).sort((a, b) => (a.relationship || 0) - (b.relationship || 0))) {
    if (bar(s) <= 5) break;
    p.relationship = 0; p.cold = true; p.lastSeen = Math.min(p.lastSeen ?? now, now - 10);
    s.timeline.unshift({ text: `${p.name} stopped returning your calls.`, when: monthName(now), bad: true });
  }
  // probe_make_save never plays a scene, so the first one it was dealt is still waiting years
  // later, on a set long gone — and opens over everything when the save loads.
  s.bigMoment = null; s.pendingArc = null; s.scene = null;
  return bar(s) >= 3 && bar(s) <= 5 ? s : null;
}
// Four if a life gives it, otherwise the first that landed either side of it.
let s = null, near = null;
for (let tries = 0; tries < 40 && !s; tries++) { const t = attempt(); if (t && bar(t) === 4) s = t; else if (t && !near) near = t; }
s = s || near;
fs.rmSync(tmp, { force: true });
if (!s) { console.log('no life landed at 3–5 in forty tries'); process.exit(1); }
const now = s.year * 12 + s.month;

const c = directorCounts(s);
console.log(`bar ${bar(s)} · ${c.warm} warm, ${c.neutral} neutral, ${c.cold} cold, ${c.grudges} grudge · ${s.name}, ${s.ageY}, ${monthName(now)}, fame ${Math.round(s.fame)}`);
for (const r of c.rows.filter((x) => x.inPhone)) console.log(`  ${r.name.padEnd(20)} ${r.state.padEnd(7)} ${String(r.relationship).padStart(3)}  ${r.films} film(s)${r.grudge ? '  grudge: ' + r.grudge.expires : ''}`);
fs.writeFileSync(out, JSON.stringify(s));
console.log('written', out);
