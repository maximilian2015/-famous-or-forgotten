// State-transition audit: a real part, through the real month, stage by stage.
//
//   node tests/probes/probe_transition_audit.mjs [runs]
//
// Takes a real career (playtest/directors-4.json), gives it a real agent offer (generateOffer +
// dressOffers), signs it through the real contract, and lets advanceMonth carry it: shoot → wrap
// → post (s.releases, and the job kept for a sequel) → opening (credit, running) → close. At every
// stage it records which of the fields that matter are still there. Seeded, so a run repeats.
// It describes what the code does today; it changes nothing.
import fs from 'fs';
const P = new URL('../../src/', import.meta.url).href;
const { advanceMonth } = await import(P + 'engine/time.js');
const { generateOffer } = await import(P + 'systems/career/offers.js');
const { dressOffers } = await import(P + 'systems/career/script.js');
const { signContract, draftContract } = await import(P + 'systems/career/contract.js');
const { pushTake } = await import(P + 'systems/career/story.js');

const RUNS = +(process.argv[2] || 40);
const base = JSON.parse(fs.readFileSync(new URL('../../../playtest/directors-4.json', import.meta.url), 'utf8'));
const seeded = (seed) => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

// What a part is, and has to stay: who, what it is about, who made it, what was agreed, what happened.
const TRACE = {
  title: (x) => x.title || x.projectTitle,
  character: (x) => x.character && x.character.name,
  characterWhat: (x) => x.character && x.character.what,
  premise: (x) => x.premise,
  director: (x) => x.director || (x.crew && x.crew[0] && x.crew[0].name),
  costar: (x) => x.with,
  take: (x) => x.take,
  direction: (x) => x.direction,
  potential: (x) => x.potential,
  prestigeScore: (x) => x.prestigeScore,
  scale: (x) => x.scale,
  tier: (x) => x.tier,
  months: (x) => x.months,
  exclusive: (x) => x.exclusive,
  backend: (x) => x.backend,
  merch: (x) => x.merch,
  campaign: (x) => x.campaign || x.campaignTier,
  story: (x) => x.story,
  meter: (x) => x.meter ?? x.meterAtClose,
  moments: (x) => (x.moments && x.moments.length) || (x._rel && x._rel.moments && x._rel.moments.length) || null,
  onSet: (x) => (x.onSet && x.onSet.length) || null,
  wrappedAt: (x) => x.wrappedAt,
  offerId: (x) => x.offerId,
};
const STAGES = ['offer', 'shoot', 'post', 'job', 'opened', 'closed'];
const seen = {};                     // field -> stage -> count of runs where it had a value
for (const f of Object.keys(TRACE)) { seen[f] = {}; for (const st of STAGES) seen[f][st] = 0; }
// 0 is "none" for points, merch and the meter, so it does not count as the field being there.
const note = (stage, x) => { if (!x) return; for (const [f, get] of Object.entries(TRACE)) { const v = get(x); if (v != null && v !== '' && v !== false && v !== 0) seen[f][stage]++; } };
let reached = { offer: 0, shoot: 0, post: 0, job: 0, opened: 0, closed: 0 };
const examples = {};

const real = Math.random;
for (let run = 1; run <= RUNS; run++) {
  Math.random = seeded(run * 7919);
  try {
    let s = JSON.parse(JSON.stringify(base));
    s.productions = []; s.production = null; s.releases = []; s.offers = []; s.scene = null; s.bigMoment = null;
    const o = generateOffer(s);
    s.offers = [o]; dressOffers(s);
    // A director you know and a costar, so those carry something to lose.
    const known = s.people.find((p) => /Director/.test(p.role || '') && !p.cold);
    if (known) o.director = known.name;
    note('offer', o); reached.offer++;
    draftContract(s, o);
    signContract(s, o.id);
    let p = (s.productions || []).find((x) => x.offerId === o.id || x.title === (o.projectTitle || '').replace('⭐ ', ''));
    if (!p) continue;
    reached.shoot++;
    const title = p.title, offerId = o.id;
    let shot = null, rel = null, opened = null, closed = null;
    for (let m = 0; m < 60 && !closed; m++) {
      s.bigMoment = null; s.pendingArc = null; s.scene = null; s.ap = s.apMaxEff || 100;
      const live = (s.productions || []).find((x) => x.title === title);
      if (live && !live.take) pushTake(s, 'about');
      if (live) shot = JSON.parse(JSON.stringify(live));
      s = advanceMonth(s);
      if (!rel) { const r = (s.releases || []).find((x) => x.title === title); if (r) rel = JSON.parse(JSON.stringify(r)); }
      const c = (s.filmography || []).find((x) => x.title === title);
      if (c && !opened) opened = JSON.parse(JSON.stringify(c));
      if (c && !c.running && opened) closed = JSON.parse(JSON.stringify(c));
      if (!s.alive) break;
    }
    if (shot) note('shoot', shot);
    if (rel) { note('post', rel); reached.post++; if (rel.job) { note('job', rel.job); reached.job++; } }
    if (opened) { note('opened', opened); reached.opened++; }
    if (closed) { note('closed', closed); reached.closed++; }
    if (!examples.closed && closed) examples.closed = { title: closed.title, character: closed.character, director: closed.director, with: closed.with, take: closed.take, meter: closed.meterAtClose, onSet: closed.onSet, moments: closed.moments, wrappedAt: closed.wrappedAt, offerId };
  } finally { Math.random = real; }
}

console.log(`runs ${RUNS} · reached: ${STAGES.map((st) => `${st} ${reached[st]}`).join(' · ')}`);
console.log('\nfield            ' + STAGES.map((st) => st.padStart(7)).join(''));
for (const f of Object.keys(TRACE)) {
  const row = STAGES.map((st) => (reached[st] ? `${Math.round((seen[f][st] / reached[st]) * 100)}%` : '-').padStart(7)).join('');
  console.log(f.padEnd(17) + row);
}
console.log('\nfirst closed credit:', JSON.stringify(examples.closed));
