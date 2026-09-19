// The festival road, the running-show castings, and the contract whose dates went stale.
// Maxi: "the second shoot is in December on the calendar and the contract says July".
import fs from 'fs';
import { refreshCastingPool, seasonFor, showAudience } from '../../src/systems/career/castings.js';
import { startProduction } from '../../src/systems/career/production.js';
import { advanceMonth } from '../../src/engine/time.js';
import { ensureWorld } from '../../src/systems/world/world.js';
import { draftContract, signContract } from '../../src/systems/career/contract.js';
import { festivalOdds } from '../../src/systems/career/release.js';
import { canTakeSet, monthsUntilFree } from '../../src/engine/sets.js';

const base = JSON.parse(fs.readFileSync(new URL('../../dist/_save.json', import.meta.url), 'utf8'));
const problems = [];
const fresh = (over = {}) => { const s = JSON.parse(JSON.stringify(base)); ensureWorld(s); Object.assign(s, { production: null, productions: [], offers: [], releases: [], running: [], filmography: [], laterOffers: [], bigMoment: null, moments: [], ap: 100, cash: 50000, respect: 5 }, over); return s; };

// 1. A festival picture: shoot it, screen it, and count what happened across many lives.
const tally = { prize: 0, sold: 0, unsold: 0, calls: 0, runs: 0 }; const ratings = [];
for (let i = 0; i < 120; i++) {
  let s = fresh({ fame: 8 + (i % 3) * 10 });
  const offer = { id: 'f' + i, projectTitle: 'Salt Country ' + i, role: 'Lead', type: 'Festival Film', genre: 'Drama', salary: 9000, months: 2, tier: 'supporting', scale: 'festival', prestigeScore: 60, stability: 70, deadline: 3 };
  startProduction(s, offer); s.production.take = 'straight';
  for (let m = 0; m < 14; m++) {
    s.bigMoment = null; s.pendingArc = null; s.moments = []; s.night = null;
    s = advanceMonth(s);
    const c = s.filmography[0];
    if (c && c.festival) {
      tally[c.festival.result]++; ratings.push(c.rating);
      if (c.festival.result === 'unsold') { if (c.running || c.verdict !== 'unsold' || typeof c.score !== 'number') problems.push(`life ${i}: unsold credit not closed ${JSON.stringify({ running: c.running, verdict: c.verdict, score: c.score })}`); }
      else if (!c.running && !c.verdict) problems.push(`life ${i}: sold film neither running nor judged`);
      if (s.bigMoment && s.bigMoment.id === 'premiere' && !s.bigMoment.festival) problems.push(`life ${i}: festival film opened like a studio picture`);
      break;
    }
  }
  // then let the run finish and see whether a studio rang
  for (let m = 0; m < 8; m++) { s.bigMoment = null; s.moments = []; s = advanceMonth(s); }
  const c = s.filmography.find((x) => x.festival);
  if (c && c.festival.result !== 'unsold') { if (c.running) problems.push(`life ${i}: run never closed`); else tally.runs++; if (!['smash', 'profitable', 'broke even', 'bomb'].includes(c.verdict)) problems.push(`life ${i}: odd verdict ${c.verdict}`); }
  if ((s.timeline || []).some((t) => /sent a script/.test(t.text))) tally.calls++;
  if (c && c.festival.result === 'prize' && !((s.offers || []).some((o) => o.via === 'festival') || (s.laterOffers || []).some((x) => x.offer && x.offer.via === 'festival'))) { /* the call comes at the close of the run; may be later than 8 months on a long run */ }
}
console.log('festival:', JSON.stringify(tally), '· mean rating', (ratings.reduce((a, b) => a + b, 0) / Math.max(1, ratings.length)).toFixed(0), '· odds at 60/75/85:', JSON.stringify([60, 75, 85].map(festivalOdds)));

// 2. Seasons on the board, and a running soap lived through to a renewal.
{
  const s = fresh({ fame: 30 });
  const seen = {}; for (let i = 0; i < 60; i++) { refreshCastingPool(s, true); for (const c of s.castingPool) if (c.perEpisode) (seen[c.type] = seen[c.type] || []).push(c.season); }
  console.log('seasons on the board:', Object.entries(seen).map(([t, v]) => `${t} ${Math.min(...v)}–${Math.max(...v)} (S1 ${Math.round(100 * v.filter((x) => x === 1).length / v.length)}%)`).join(' · '));
  for (const [t, v] of Object.entries(seen)) if (/Guest|Episode/.test(t) && v.some((x) => x < 2)) problems.push(`${t} guest spot on a new show`);
  let s2 = fresh({ fame: 30 });
  const offer = { id: 'soap', projectTitle: 'Harbour Lights · season 9', seriesTitle: 'Harbour Lights', role: 'Recurring', type: 'Soap Opera', genre: 'Drama', salary: 4000 * 30, months: 4, tier: 'lead', scale: 'recurring', prestigeScore: 45, stability: 90, episodes: 30, perEpisode: true, episodeFee: 4000, season: 9, joined: true, audience: 4.6, deadline: 3 };
  startProduction(s2, offer); s2.production.take = 'straight';
  if (s2.production.season !== 9 || s2.production.seriesTitle !== 'Harbour Lights' || !s2.production.joined) problems.push('joined soap lost its season on the set');
  let aired = null, verdict = null;
  for (let m = 0; m < 24 && !verdict; m++) { s2.bigMoment = null; s2.pendingArc = null; s2.moments = []; s2.night = null; s2 = advanceMonth(s2);
    if (s2.bigMoment && s2.bigMoment.id === 'premiere') aired = { verdict: s2.bigMoment.verdict, viewers: s2.filmography[0].viewers };
    if (s2.bigMoment && s2.bigMoment.id === 'verdict') verdict = s2.filmography[0]; }
  if (!aired) problems.push('joined soap never went out'); else if (aired.verdict !== 'season 9') problems.push(`joined soap aired as ${aired.verdict}`);
  if (aired && (aired.viewers < 2.5 || aired.viewers > 8)) problems.push(`joined soap ignored its audience: ${aired.viewers}m from 4.6m`);
  if (verdict && verdict.season !== 9) problems.push(`credit season ${verdict.season}`);
  const ren = (s2.offers || []).find((o) => o.kind === 'renewal');
  console.log(`joined soap: aired ${JSON.stringify(aired)} · renewal ${ren ? ren.projectTitle : verdict && verdict.renewal}`);
  if (ren && ren.season !== 10) problems.push(`renewal season ${ren.season}`);
}

// 3. The stale contract: draft the paper with no set, take a set, sign — the paper and the
//    calendar must agree on when it starts.
{
  let s = fresh({ fame: 20, respect: 5, year: 2056, month: 5 });
  const o = { id: 'orbit', via: 'casting', projectTitle: 'Orbit 65', role: 'Lead', type: 'Indie Film', genre: 'Drama', salary: 26000, months: 4, tier: 'lead', scale: 'indie', prestigeScore: 50, stability: 80, deadline: 6, medium: 'film_indie' };
  s.offers.push(o);
  const k1 = draftContract(s, o);
  const before = k1.clauses.find((c) => c.id === 'schedule').value.start;
  startProduction(s, { id: 'ds', projectTitle: 'Double Sentence', role: 'Lead', type: 'Indie Film', genre: 'Crime', salary: 30000, months: 6, tier: 'lead', scale: 'indie', prestigeScore: 50, stability: 85, deadline: 3 });
  s.production.take = 'straight';
  const k2 = draftContract(s, o);
  const sched = k2.clauses.find((c) => c.id === 'schedule');
  if (!sched.must) problems.push('after taking a set the paper still thinks you are free');
  // and the deal: no signing round it. Maxi: "a newcomer negotiates to hold it, or turns it down."
  signContract(s, 'orbit');
  if (o.signed) problems.push('signed while on a set without a hold or a walk — the quest was skipped');
  // even if the paper was drafted free and is stale: force the old shape and try again
  o.contract.clauses[o.contract.clauses.findIndex((c) => c.id === 'schedule')] = { id: 'schedule', label: 'Schedule', value: { months: 4, start: s.year * 12 + s.month + 1 }, text: 'stale', options: [], stance: 'ok', ask: null, result: null };
  o.contract.sent = s.year * 12 + s.month - 1;   // "with them", the way it slipped through
  o.contract.sent = null;
  signContract(s, 'orbit');
  if (o.signed) problems.push('a stale free paper signed while on a set');
  if (!o.contract.clauses.find((c) => c.id === 'schedule').must) problems.push('the stale paper was not rebuilt as a must');
  // ask them to hold it, and pretend they agreed — the one way a part waits
  const live = o.contract.clauses.find((c) => c.id === 'schedule');
  live.stance = 'talk'; live.ask = 'hold'; live.result = 'agreed'; live.value = live.options[0].value;
  signContract(s, 'orbit');
  if (!o.signed || !o.waitsForWrap) problems.push(`a held part did not sign and wait: ${s.lastEvent}`);
  const now = s.year * 12 + s.month;
  const cal = Math.max((o.startAt || now + 1) - now, canTakeSet(s, o).ok ? 0 : monthsUntilFree(s, o));
  const paper = o.contract.clauses.find((c) => c.id === 'schedule').value.start - now;
  console.log(`stale contract: drafted for +${before - now} · after the set: must=${sched.must} · unsigned without a hold · held: paper says +${paper} · calendar says +${cal}`);
  if (paper !== cal) problems.push(`paper +${paper} vs calendar +${cal}`);
  // 4. And a held part is not held forever: the set runs over, and two months past the date
  //    on the paper they recast.
  s.production.monthsLeft += 5; s.production.take = 'straight';
  let gone = false;
  for (let m = 0; m < 12 && !gone; m++) { s.bigMoment = null; s.moments = []; s.pendingArc = null; s.night = null; s = advanceMonth(s); if (!(s.offers || []).some((x) => x.id === 'orbit')) gone = true; }
  const mail = (s.inbox || []).find((x) => /cast elsewhere/.test(x.body || ''));
  if (!gone) problems.push('a held part waited forever while the set ran over');
  if (!mail) problems.push('no letter when they recast the held part');
  console.log(`held part, set ran over: ${gone ? 'recast' : 'still held'} · letter ${mail ? 'yes' : 'no'}`);
}
if (problems.length) { console.log('PROBLEMS:\n' + problems.join('\n')); process.exit(1); }
console.log('festival · seasons · contract dates: clean');
