// Regression from the audit on main 73edbb9: all expectations below are for the
// CORRECTED behaviour. Before/after measurements are in the branch handoff.
// Run from extracted: node tests/probes/probe_contract_continuity_audit.mjs
import assert from 'node:assert/strict';
import { createInitialState } from '../../src/state/initialState.js';
import { draftContract, signContract } from '../../src/systems/career/contract.js';
import { callTheRoom, standoffTick, takeTheRoom, walkTheRoom, askFor, writeOut, itFails } from '../../src/systems/career/standoff.js';
import { startProduction } from '../../src/systems/career/production.js';
import { scheduleRelease, releaseTick, runTick } from '../../src/systems/career/release.js';
import { maybeContinue } from '../../src/systems/career/franchise.js';
import { freezeProject, frozenTick } from '../../src/systems/career/stability.js';
import { dressOffers } from '../../src/systems/career/script.js';

const state = () => ({ ...createInitialState({ created: true }), ageY: 35, stage: 'career',
  hasApartment: true, livingWith: 'alone', fame: 80, peakFame: 80, respect: 60,
  acting: 80, cash: 1e7, year: 2058, month: 0, productions: [], inbox: [], people: [],
  filmography: [{ title: 'Black Harbor · season 2', type: 'Drama Series', season: 2,
    year: 2057, rating: 80, openViewers: 4, endViewers: 4.5, viewers: 4.3, running: false, renewal: 'renewed' }],
  ap: 100, apMax: 100, apMaxEff: 100, talent: 95, genreXP: {} });
const offer = (extra = {}) => ({ id: 'renewal', projectTitle: 'Black Harbor · season 3', seriesTitle: 'Black Harbor',
  kind: 'renewal', role: 'Lead', tier: 'lead', type: 'Drama Series', genre: 'Drama',
  scale: 'recurring', season: 3, episodes: 10, episodeFee: 100000, salary: 1000000,
  perEpisode: true, months: 5, prestigeScore: 80, stability: 95, deadline: 3,
  character: { name: 'Ethan Cole', what: 'the son who stayed', tier: 'lead' },
  premise: 'The son who stayed.', potential: 'open', ...extra });
function withSeed(seed, fn) {
  const random = Math.random;
  try { Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296); return fn(); }
  finally { Math.random = random; }
}
function month(s) { s.month++; if (s.month > 11) { s.month = 0; s.year++; } }
function room(s, o) {
  s.offers = [o]; draftContract(s, o); callTheRoom(s, o);
  assert.ok(s.standoff, 'control: eligible renewal did not book a meeting');
  s.year = Math.floor(s.standoff.due / 12); s.month = s.standoff.due % 12;
  standoffTick(s); assert.equal(s.standoff.open, true);
}
const stats = { meetings: 0, feeLost: 0, salaryWrong: 0, pointsLost: 0, producerLost: 0,
  directPromised: 0, directLost: 0, walkouts: 0, walkoutStillBooked: 0, walkoutStillOffered: 0,
  exclusivityGranted: 0, exclusivityOverwritten: 0, showrunnerLost: 0, thaws: 0, thawCharacterLost: 0,
  savedPaperControl: 0, staleWrittenOutCredit: 0, perksOffered: 0 };
let roomExample, exclusivityExample, walkoutExample, thawExample;
for (let n = 1; n <= 300; n++) withSeed(n, () => {
  const s = state(), o = offer(); room(s, o);
  const pack = { ...s.standoff.pack }; takeTheRoom(s); stats.meetings++;
  assert.equal(o.episodeFee, pack.fee, 'control: handshake did not set offered fee');
  assert.equal(o.episodes, pack.episodes);
  // Points, the producing credit and the episode to direct are not offered while they do
  // nothing (standoff.js NOT_YET); whatever the room did grant must still land on the offer.
  if (pack.points || pack.producer || pack.directOne) stats.perksOffered++;
  assert.equal(o.tvPoints ?? 0, pack.points, 'control: points were not granted in the room');
  assert.equal(!!o.producing, !!pack.producer, 'control: title was not granted in the room');
  if (pack.directOne) assert.equal(o.directOne, true);
  // Save/load control: the settled paper itself must already contain the agreed terms.
  const corrected = JSON.parse(JSON.stringify(s)), co = corrected.offers[0];
  const fee = co.contract.clauses.find(c => c.id === 'fee');
  assert.equal(fee.value, pack.fee); assert.equal(fee.episodes, pack.episodes);
  signContract(corrected, co.id);
  assert.equal(corrected.productions[0].episodeFee, pack.fee);
  assert.equal(corrected.productions[0].salary, pack.fee * pack.episodes);
  stats.savedPaperControl++;
  signContract(s, o.id); const p = s.productions[0];
  assert.ok(p, 'control: settled offer did not start');
  if (p.episodeFee !== pack.fee) stats.feeLost++;
  if (p.salary !== pack.fee * pack.episodes) stats.salaryWrong++;
  if (pack.points && p.tvPoints == null) stats.pointsLost++;
  if (pack.producer && !p.producing) stats.producerLost++;
  if (pack.directOne) { stats.directPromised++; if (!p.directOne) stats.directLost++; }
  roomExample ||= { onTable: { fee: pack.fee, episodes: pack.episodes, total: pack.fee * pack.episodes, points: pack.points },
    onSet: { fee: p.episodeFee, episodes: p.episodes, total: p.salary, tvPoints: p.tvPoints ?? null } };

  const w = state(), wo = offer(); room(w, wo); stats.walkouts++;
  walkTheRoom(w);
  walkoutExample ||= { offerStillThere: w.offers.some(x => x.id === wo.id), roomStillOpen: !!w.standoff?.open,
    walkedOff: w.walkedOff?.length || 0, grudgeCount: w.grudges?.length || 0 };
  if (w.standoff) stats.walkoutStillBooked++;
  if (w.offers.some(x => x.id === wo.id)) stats.walkoutStillOffered++;

  const x = state(), xo = offer(); room(x, xo);
  const exc = xo.contract.clauses.find(c => c.id === 'exclusive');
  if (exc?.value) {
    askFor(x, 'exclusivity');
    if (x.standoff?.pack.conflictFree) {
      stats.exclusivityGranted++; takeTheRoom(x);
      assert.equal(xo.exclusive, false, 'control: ask did not remove exclusivity');
      signContract(x, xo.id); const xp = x.productions[0];
      assert.ok(xp, 'control: nonexclusive settled offer did not start');
      if (xp.exclusive) { stats.exclusivityOverwritten++; exclusivityExample ||= { agreedExclusive: false, setExclusive: xp.exclusive }; }
    }
  }

  const q = state(), qo = offer({ id: 'first', kind: undefined, season: 1 });
  startProduction(q, qo); const qp = q.productions[0];
  const rel = scheduleRelease(q, { title: qp.title, role: qp.role, type: qp.type, genre: qp.genre,
    salary: qp.salary, rating: 85, status: 'Hit', year: q.year }, qp);
  assert.equal(rel.job.character.name, qp.character.name, 'control: normal post loses the character too');
  const ren = maybeContinue(q, { title: rel.title, rating: 85, viewers: 8 }, rel.job, true);
  assert.ok(ren, 'control: renewal did not exist');
  if (qp.crew[0].name && !ren.showrunner) stats.showrunnerLost++;

  // Same film, resumed, not a new role. The first month cannot thaw (see thawOdds), so
  // wait two months before pinning the successful rescue roll.
  const f = state(); startProduction(f, offer({ id: 'freeze', kind: undefined, season: 1 }));
  const fp = f.productions[0];
  freezeProject(f, fp); month(f); month(f);
  const random = Math.random;
  try { Math.random = () => 0; frozenTick(f); } finally { Math.random = random; }
  const thaw = f.offers.find(o => o.kind === 'thaw');
  assert.ok(thaw, 'control: shoot did not thaw'); stats.thaws++;
  if (!thaw.character) stats.thawCharacterLost++;
  const oldCharacter = fp.character.name;
  dressOffers(f);
  thawExample ||= { before: oldCharacter, resumedOffer: thaw.character.name,
    scriptPreserved: thaw.premise === fp.premise, backendBefore: fp.backend, backendAfter: thaw.backend ?? null };

  const out = state(), outOffer = offer({ tier: 'supporting', role: 'Supporting' }); out.offers = [outOffer];
  writeOut(out, outOffer);
  assert.equal(out.offers.length, 0, 'control: exit did not remove the offer');
  assert.match(out.lastEvent, /not the reason|not in it/);
  if (out.filmography[0].renewal === 'renewed') stats.staleWrittenOutCredit++;
});
assert.equal(stats.meetings, 300);
assert.equal(stats.feeLost, 0);
assert.equal(stats.salaryWrong, 0);
assert.equal(stats.pointsLost, 0);
assert.equal(stats.producerLost, 0);
assert.equal(stats.perksOffered, 0, 'a perk that does nothing yet was offered in the room');
assert.equal(stats.directLost, 0);
assert.equal(stats.walkoutStillBooked, 0);
assert.equal(stats.walkoutStillOffered, 0);
assert.ok(stats.exclusivityGranted > 0 && stats.exclusivityOverwritten === 0);
assert.equal(stats.showrunnerLost, 0);
assert.equal(stats.thawCharacterLost, 0);
assert.equal(stats.savedPaperControl, 300);
assert.equal(stats.staleWrittenOutCredit, 0);
// The offer IS season 3 (generated from season 2). Both invitation and outcome use 3.
const numbering = withSeed(500, () => {
  const s = state(), o = offer(); room(s, o);
  const random = Math.random;
  try { Math.random = () => 0.5; itFails(s, o); } finally { Math.random = random; }
  assert.match(s.lastEvent, /Season 3|season 3/, 'selected outcome must name the offered season');
  assert.doesNotMatch(s.lastEvent, /Season 4|season 4/);
  return { offeredSeason: o.season, event: s.lastEvent };
});
console.log(JSON.stringify({ stats, roomExample, exclusivityExample, walkoutExample, thawExample, numbering }, null, 2));
console.log('all corrected behaviour expectations passed');
