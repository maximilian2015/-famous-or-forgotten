import { draftContract, markClause, sendContract, contractsTick, signContract } from '../src/systems/career/contract.js';
import { declineOffer } from '../src/systems/career/offers.js';
import { startProduction } from '../src/systems/career/production.js';
import { maybeContinue } from '../src/systems/career/franchise.js';
import { collapseProject, freezeProject } from '../src/systems/career/stability.js';
import { scheduleRelease, releaseTick, runTick } from '../src/systems/career/release.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', name: 'Mira Vale', ageY: 30, stage: 'career', dream: 'actor', fame: 60, respect: 40, acting: 70, charisma: 50, looks: 50, luck: 50, scandal: 0, media: 0, mental: 60, year: 2050, month: 2, timeline: [], filmography: [], productions: [], offers: [], inbox: [], releases: [], peakFame: 60, hasApartment: true, housing: 'room', ap: 100, apMax: 100, cash: 100000, genreXP: {}, quote: 0, people: [], ...over });
const clause = (k, id) => k.clauses.find((c) => c.id === id);
const run = (s, months) => { for (let i = 0; i < months; i++) { s.month += 1; if (s.month > 11) { s.month = 0; s.year += 1; } releaseTick(s); runTick(s); } };
// force an ask through: mark it, send, and answer it yes by hand
const agree = (s, o, id, askId) => { const k = draftContract(s, o); const c = clause(k, id); const op = c.options.find((x) => x.id === askId); c.value = op.value; c.result = 'agreed'; c.stance = 'ok'; c.ask = null; };

// ── television: the network's options and the exit ─────────────────────────────
{
  const s = st();
  const o = { id: 'tv1', via: 'casting', projectTitle: 'Careless Border', role: 'Lead', type: 'Drama Series', genre: 'Drama', salary: 600000, episodeFee: 60000, episodes: 10, months: 5, tier: 'lead', scale: 'recurring', perEpisode: true, season: 1, seriesTitle: 'Careless Border', medium: 'tv_network', prestigeScore: 55, stability: 85, deadline: 3 };
  s.offers = [o];
  const k = draftContract(s, o);
  ok('a first season comes with the network’s options and no exit', clause(k, 'seasons') && clause(k, 'seasons').value >= 3 && clause(k, 'exit') && clause(k, 'exit').value === 0);
  ok('you can cut them, strike them, or ask for an exit', clause(k, 'seasons').options.length === 2 && clause(k, 'exit').options[0].value === 3);
  agree(s, o, 'exit', 'three');
  signContract(s, o.id);
  const p = s.productions[0];
  ok('signed: the options and the exit are on the set', p && p.optionSeasons >= 3 && p.exitAfter === 3 && p.optionFrom === 1, JSON.stringify(p && [p.optionSeasons, p.exitAfter, p.optionFrom]));
  // the show comes back: under the option the fee barely moves, and the market rate is on the paper
  let ren = null;
  for (let i = 0; i < 40 && !ren; i++) ren = maybeContinue(s, { title: 'Careless Border', rating: 80, viewers: 9, reviews: { audience: 8 } }, { ...p, season: 1 }, true);
  ok('the renewal is under the option: five per cent, and the market rate to ask for', ren && ren.optioned && ren.episodeFee === Math.round(p.episodeFee * 1.05) && ren.marketFee > ren.episodeFee, ren && JSON.stringify([ren.optioned, ren.episodeFee, ren.marketFee, p.episodeFee]));
  ok('and it says so on the card', ren && /took up its option/.test(ren.note));
  s.offers = [ren];
  const k2 = draftContract(s, ren);
  ok('the paper’s only fee ask is the market rate', clause(k2, 'fee').options.length === 1 && clause(k2, 'fee').options[0].id === 'market' && /the option/.test(clause(k2, 'fee').text));
  // walking out of an optioned season
  const r0 = s.respect;
  declineOffer(s, ren.id);
  ok('walking out of an optioned season is walking out of a contract', s.respect === r0 - 3 - 6 && /lawyers/.test(s.lastEvent), `${s.respect} vs ${r0}`);
  // leaving by the exit
  const t = st(); const r1 = t.respect;
  t.offers = [{ ...ren, id: 'ren4', season: 4, exitAfter: 3, optioned: true, projectTitle: 'Careless Border · season 4' }];
  declineOffer(t, 'ren4');
  ok('leaving after the exit season costs nothing and starts no story', t.respect === r1 && !(t.stories || []).length && /the way the paper said/.test(t.lastEvent));
  // no options: every season negotiated fresh
  const u = st(); const o2 = { ...o, id: 'tv2' }; u.offers = [o2];
  agree(u, o2, 'seasons', 'strike'); signContract(u, o2.id);
  let ren2 = null; for (let i = 0; i < 40 && !ren2; i++) ren2 = maybeContinue(u, { title: 'Careless Border', rating: 80, viewers: 9, reviews: { audience: 8 } }, { ...u.productions[0], season: 1 }, true);
  ok('struck: the next season is negotiated fresh', ren2 && !ren2.optioned && ren2.episodeFee > Math.round(o.episodeFee * 1.05));
}
// ── film: pay-or-play, the toys, points ─────────────────────────────────────────
{
  const s = st({ fame: 80 });
  const o = { id: 'bb', via: 'agent', projectTitle: 'Iron Tide', role: 'Lead', type: 'Blockbuster', genre: 'Sci-Fi', salary: 6000000, months: 6, tier: 'tentpole', scale: 'blockbuster', prestigeScore: 70, stability: 60, deadline: 3 };
  s.offers = [o];
  const k = draftContract(s, o);
  ok('a tentpole at A-list: pay-or-play and the merchandise on the paper', clause(k, 'payOrPlay') && !clause(k, 'payOrPlay').value && clause(k, 'merch') && clause(k, 'merch').value === 0);
  agree(s, o, 'payOrPlay', 'ask'); agree(s, o, 'merch', 'two');
  signContract(s, o.id);
  const p = s.productions[0];
  ok('signed: both on the set', p && p.payOrPlay && p.merch === 2);
  p.paid = 1000000; const cash0 = s.cash;
  collapseProject(s, p);
  ok('the picture dies and pay-or-play pays the rest', s.cash > cash0 + 3000000 && s.timeline.some((x) => /pay-or-play/.test(x.text)), `+€${Math.round((s.cash - cash0) / 1e6)}m`);
  // without it, nothing
  const t = st({ fame: 80 }); t.offers = [{ ...o, id: 'bb2', contract: undefined, signed: false }]; signContract(t, 'bb2'); const q = t.productions[0]; q.paid = 1000000; const c1 = t.cash;
  collapseProject(t, q);
  ok('without it, you keep what you were paid and nothing else', t.cash === c1);
  // the toys
  const m = st({ fame: 80 });
  const job = { title: 'Iron Tide', role: 'Lead', type: 'Blockbuster', genre: 'Sci-Fi', salary: 6000000, months: 6, scale: 'blockbuster', tier: 'tentpole', prestigeScore: 70, part: 1, season: 0, episodes: 0, episodeFee: 0, merch: 2, crew: [{ id: 'c', name: 'Mira Croft', role: 'Director', bond: 50 }] };
  let merch = 0;
  for (let i = 0; i < 12 && !merch; i++) { const x = st({ fame: 80 }); scheduleRelease(x, { title: 'Iron Tide', role: 'Lead', type: 'Blockbuster', genre: 'Sci-Fi', salary: 6000000, rating: 88, status: 'Hit', year: 2050, season: 0, part: 1, episodes: 0 }, job); run(x, 24); const c = x.filmography.find((y) => y.title === 'Iron Tide'); if (c && c.verdict !== 'bomb' && c.verdict !== 'broke even') merch = c.merchPaid || -1; }
  ok('a tentpole that worked: two per cent of the toys is real money', merch > 100000, String(merch));
  // points on a small picture
  const i = st({ fame: 30 });
  const o3 = { id: 'ind', via: 'casting', projectTitle: 'Glass Winter', role: 'Lead', type: 'Indie Film', genre: 'Drama', salary: 80000, months: 3, tier: 'lead', scale: 'indie', prestigeScore: 60, stability: 80, deadline: 3 };
  i.offers = [o3];
  const k3 = draftContract(i, o3);
  ok('an indie offers points instead of pay', clause(k3, 'points') && clause(k3, 'points').options[0].value === 5);
  agree(i, o3, 'points', 'five'); signContract(i, o3.id);
  ok('sixty per cent now, five of the gross', i.productions[0].salary === 48000 && i.productions[0].backend === 5);
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
