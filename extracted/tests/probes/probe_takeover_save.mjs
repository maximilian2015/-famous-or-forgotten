// A save on the morning the studio is sold, for playing the big story of a busy year by hand
// (meta/stories.js `takeover`): the sale, the review a month on, and a year after that.
//
//   node tests/probes/probe_takeover_save.mjs [out.json] [takeover|strike]
//
// With 'strike' it is the morning the actors' guild walks out instead (meta/stories.js `strike`):
// the same picture on the set, one of your pictures moved to open next month, and the card on the
// screen is the strike. Its end comes three months on.
//
// It starts from a life really played (probe_make_save.mjs, to fame 45). Then, in the shapes the
// game's own writers leave: a studio picture on the set (production.js startProduction, from an
// offer with a director of the world on it), this year marked busy (life/pace.js), and one tick of
// the stories with the month's roll forced, so the card on the screen is the sale.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const P = new URL('../../src/', import.meta.url).href;
const { startProduction } = await import(P + 'systems/career/production.js');
const { storiesTick, storyOf, CHAINS } = await import(P + 'systems/meta/stories.js');
const { ensureDirectors, workingDirectors } = await import(P + 'systems/world/directors.js');
const { newTitle } = await import(P + 'systems/world/titles.js');
const out = process.argv[2] || 'takeover.json';
const which = process.argv[3] === 'strike' ? 'strike' : 'takeover';
const tmp = path.join(here, '_takeover_base.json');

function attempt() {
  spawnSync(process.execPath, [path.join(here, 'probe_make_save.mjs'), '45', tmp], { encoding: 'utf8' });
  const s = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  if (!s.alive || (s.stories || []).length) return null;
  // probe_make_save never plays a scene or answers a card: whatever it left waiting would open first.
  s.bigMoment = null; s.moments = []; s.pendingArc = null; s.scene = null;
  s.productions = []; s.production = null;
  ensureDirectors(s);
  const d = workingDirectors(s).find((x) => x.band === 'working' || x.band === 'strong');
  const genre = 'Drama';
  startProduction(s, { id: 'off-takeover', projectTitle: newTitle(s, genre), role: 'Lead', tier: 'lead', type: 'Feature Film', genre, scale: 'feature',
    months: 6, salary: 1200000, prestigeScore: 66, stability: 90, deadline: 3, director: d ? d.name : undefined, directorId: d ? d.id : undefined });
  const p = s.productions[0]; p.prepLeft = 0; p.monthsLeft = 5;
  s._pace = { year: s.year, temper: 'busy', room: 6, opened: 0, hush: 0, log: [] };
  // Nothing else may start this month: the other chains are kept to their cooldowns for it.
  s._storyLog = s._storyLog || {};
  const keep = JSON.parse(JSON.stringify(s._storyLog));
  for (const id of Object.keys(CHAINS)) if (id !== which) s._storyLog[id] = [...(s._storyLog[id] || []), s.year * 12 + s.month];
  if (which === 'strike') {
    s._strikeCalm = s.year * 12 + s.month - 400;            // long enough without one that the pressure is at its top
    const r = (s.releases || [])[0]; if (r) { r.wait = (r.wait || 0) - (r.due - (s.year * 12 + s.month + 1)); r.due = s.year * 12 + s.month + 1; }
  }
  const real = Math.random; Math.random = () => 0.01;
  try { storiesTick(s); } finally { Math.random = real; }
  for (const id of Object.keys(CHAINS)) if (id !== which) { if (keep[id]) s._storyLog[id] = keep[id]; else delete s._storyLog[id]; }
  return storyOf(s, which) && s.pendingArc && s.pendingArc.story === which ? s : null;
}
let s = null;
for (let tries = 0; tries < 10 && !s; tries++) s = attempt();
fs.rmSync(tmp, { force: true });
if (!s) { console.log(`no life took the ${which} in ten tries`); process.exit(1); }
fs.writeFileSync(out, JSON.stringify(s));
const st = storyOf(s, which);
if (which === 'strike') { console.log(`${s.name}, ${s.ageY}, fame ${Math.round(s.fame)} · strike for ${st.data.months} months · stopped: ${st.data.stopped.join(', ') || 'nothing'} · moved: ${(st.data.moved || []).map((m) => m.title).join(', ') || 'nothing'} · offers on the desk: ${(s.offers || []).length}`); process.exit(0); }
console.log(`${s.name}, ${s.ageY}, fame ${Math.round(s.fame)} · on "${st.data.title}" (${st.data.studio}), directed by ${st.data.director} · sold to ${st.data.buyer}`);
