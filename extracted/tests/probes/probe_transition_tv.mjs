// State-transition audit, television: season 1 → the renewal decision → the season 2 offer →
// the season 2 shoot, through the real month.
//
//   node tests/probes/probe_transition_tv.mjs [runs]
//
// A real career (playtest/directors-4.json), a first season signed through the real contract,
// advanceMonth until the run closes and franchise.js decides. When it is renewed, the renewal is
// signed the same way and the next season shoots. Records what the next season still knows about
// the last: the character, the script, the show, the number, the person running it, the terms.
// Seeded. Describes the current behaviour; changes nothing.
import fs from 'fs';
const P = new URL('../../src/', import.meta.url).href;
const { advanceMonth } = await import(P + 'engine/time.js');
const { dressOffers } = await import(P + 'systems/career/script.js');
const { signContract, draftContract } = await import(P + 'systems/career/contract.js');
const { pushTake } = await import(P + 'systems/career/story.js');

const RUNS = +(process.argv[2] || 30);
const base = JSON.parse(fs.readFileSync(new URL('../../../playtest/directors-4.json', import.meta.url), 'utf8'));
const seeded = (seed) => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const real = Math.random;
const out = { runs: RUNS, closed: 0, renewed: 0, writtenOut: 0, cancelled: 0, bubble: 0, other: 0, s2Shot: 0 };
const checks = {};   // name -> [kept, of]
const check = (name, ok) => { const c = (checks[name] = checks[name] || [0, 0]); c[1]++; if (ok) c[0]++; };
let example = null;

function shootUntil(s, title, months, until) {
  for (let m = 0; m < months; m++) {
    s.bigMoment = null; s.pendingArc = null; s.scene = null; s.ap = s.apMaxEff || 100;
    const live = (s.productions || []).find((x) => x.title === title);
    if (live && !live.take) pushTake(s, 'about');
    s = advanceMonth(s);
    if (until(s)) return s;
    if (!s.alive) return s;
  }
  return s;
}

for (let run = 1; run <= RUNS; run++) {
  Math.random = seeded(run * 104729);
  try {
    let s = JSON.parse(JSON.stringify(base));
    s.productions = []; s.production = null; s.releases = []; s.offers = []; s.scene = null; s.bigMoment = null; s.bubbles = [];
    const known = s.people.find((p) => /Director/.test(p.role || '') && !p.cold);
    const o = { id: 'tv1', projectTitle: 'Black Harbor', type: 'Drama Series', genre: 'Drama', role: 'Lead', tier: 'lead',
      scale: 'recurring', season: 1, episodes: 10, episodeFee: 90000, salary: 900000, perEpisode: true, months: 5,
      prestigeScore: 84, stability: 95, deadline: 3, director: known ? known.name : undefined };
    s.offers = [o]; dressOffers(s);
    const ch = o.character && o.character.name, premise = o.premise;
    draftContract(s, o); signContract(s, 'tv1');
    const p1 = (s.productions || [])[0];
    if (!p1) continue;
    const title1 = p1.title, showrunner1 = (p1.crew && p1.crew[0] && p1.crew[0].name) || null;
    s = shootUntil(s, title1, 80, (t) => { const c = (t.filmography || []).find((x) => x.title === title1); return c && !c.running; });
    const c1 = (s.filmography || []).find((x) => x.title === title1);
    if (!c1 || c1.running) continue;
    out.closed++;
    const ren = (s.offers || []).find((x) => x.kind === 'renewal');
    if (!ren) { if ((s.bubbles || []).length) out.bubble++; else if (c1.renewal === 'writtenOut') out.writtenOut++; else if (c1.renewal === 'cancelled' || c1.renewal === 'capped') out.cancelled++; else out.other++; continue; }
    out.renewed++;
    check('renewal names season 2', ren.season === 2);
    check('renewal keeps the character', !!ren.character && ren.character.name === ch);
    check('renewal keeps the script', ren.premise === premise);
    check('renewal keeps the show name', /Black Harbor/.test(ren.seriesTitle || ren.projectTitle || ''));
    check('renewal knows who runs the show', !!ren.showrunner && ren.showrunner === showrunner1);
    check('season 1 credit says renewed', c1.renewal === 'renewed');
    check('renewal points at the season 1 credit', !!ren.sourceCreditId && ren.sourceCreditId === c1.id);
    check('a season 1 guarantee is NOT carried (season 1 had none)', ren.guaranteed == null);
    // Sign it and shoot season 2.
    draftContract(s, ren);
    if (s.standoff) { s.standoff = null; }
    signContract(s, ren.id);
    const p2 = (s.productions || []).find((x) => /Black Harbor/.test(x.title));
    if (!p2) { check('the signed renewal starts a shoot', false); continue; }
    check('the signed renewal starts a shoot', true);
    out.s2Shot++;
    check('season 2 shoot: same character', !!p2.character && p2.character.name === ch);
    check('season 2 shoot: same script', p2.premise === premise);
    check('season 2 shoot: season number 2', p2.season === 2);
    check('season 2 shoot: title carries season 2', /season 2/i.test(p2.title));
    check('season 2 shoot: run by the same showrunner', !!(p2.crew && p2.crew[0]) && p2.crew[0].name === showrunner1);
    check('season 2 shoot: same series title', /Black Harbor/.test(p2.seriesTitle || ''));
    example = example || { s1: { title: c1.title, character: ch, showrunner: showrunner1, renewal: c1.renewal },
      renewal: { season: ren.season, title: ren.projectTitle, showrunner: ren.showrunner, character: ren.character && ren.character.name },
      s2: { title: p2.title, season: p2.season, director: p2.crew && p2.crew[0] && p2.crew[0].name, character: p2.character && p2.character.name } };
  } finally { Math.random = real; }
}
console.log(JSON.stringify(out));
for (const [name, [k, n]] of Object.entries(checks)) console.log(`${String(k).padStart(3)}/${String(n).padEnd(3)} ${name}`);
console.log('\nexample:', JSON.stringify(example, null, 1));
