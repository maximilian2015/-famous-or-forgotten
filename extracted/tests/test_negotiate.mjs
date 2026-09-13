import { canNegotiate, negotiationFor, haggleOdds, haggle, applyHaggle, AGENT_REACH, reachOf } from '../src/systems/career/negotiate.js';
import { refreshCastingPool } from '../src/systems/career/castings.js';
import { quoteBand } from '../src/systems/meta/status.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', ageY: 34, stage: 'career', dream: 'actor', cash: 0, fame: 60,
  charisma: 50, respect: 40, scandal: 0, quote: 0, ap: 3, year: 2035, month: 0,
  castingPool: [], filmography: [], timeline: [], ...over });
const film = (over) => ({ id: 'c1', title: 'Golden Echo', medium: 'film_studio', scale: 'feature', share: 1,
  perEpisode: false, salary: 6000000, episodes: 0, episodeFee: 0, ...over });
const show = (over) => ({ id: 'c2', title: 'Late River', medium: 'tv_network', scale: 'recurring', share: 1,
  perEpisode: true, episodes: 13, episodeFee: 200000, salary: 2600000, ...over });

// who is allowed to ask
ok('an unknown does not negotiate', !canNegotiate(st({ fame: 5 })));
ok('a rising star does not either', !canNegotiate(st({ fame: 20 })));
ok('a known face still does not', !canNegotiate(st({ fame: 40 })));
ok('a star does', canNegotiate(st({ fame: 55 })));
ok('and everyone above', canNegotiate(st({ fame: 80 })) && canNegotiate(st({ fame: 95 })));
ok('there is nothing to open below star', negotiationFor(st({ fame: 40 }), film()) === null);

// the shape of the deal
const n = negotiationFor(st({ fame: 60 }), film());
ok('a star gets a negotiation', !!n);
ok('on your own you can lean on them only a little', n.ceiling > n.bandTop && n.ceiling < n.bandTop * 1.3, `${n.bandTop} / ${n.ceiling}`);
ok('the band top matches the quote table', n.bandTop === quoteBand(st({ fame: 60 }), 'film_studio')[1]);
ok('there are three positions to take', n.asks.length === 3, String(n.asks.length));
ok('every ask is above what they offered', n.asks.every((a) => a.amount > n.quoted));
ok('the asks climb', n.asks[0].amount < n.asks[1].amount && n.asks[1].amount < n.asks[2].amount,
  n.asks.map((a) => a.amount).join(' < '));

// an agent raises the ceiling, and that is the whole of what representation buys
ok('every agent tier declares a reach', Object.values(AGENT_REACH).every((v) => v >= 1));
ok('no agent means barely any reach past your band', reachOf(st()) <= 1.2, String(reachOf(st())));
ok('and every agent reaches further than you do alone',
  ['novice', 'solid', 'strong', 'legend'].every((t) => AGENT_REACH[t] > AGENT_REACH.none));
const withAgent = st({ fame: 60, agent: { tier: 'legend' } });
const nA = negotiationFor(withAgent, film());
ok('a legend reaches far past your band', nA.ceiling > nA.bandTop * 1.5, `${nA.bandTop} → ${nA.ceiling}`);
ok('and asking the same money is likelier with one',
  haggleOdds(withAgent, film(), nA.bandTop * 1.3).accept > haggleOdds(st({ fame: 60 }), film(), nA.bandTop * 1.3).accept);

// the odds behave
const s60 = st({ fame: 60 });
const fair = haggleOdds(s60, film(), n.asks[0].amount);
const push = haggleOdds(s60, film(), n.asks[1].amount);
const moon = haggleOdds(s60, film(), n.asks[2].amount);
ok('asking for what you are worth usually works', fair.accept >= 55, fair.accept + '%');
ok('asking for more works less often', push.accept < fair.accept && moon.accept < push.accept,
  `${fair.accept}% → ${push.accept}% → ${moon.accept}%`);
ok('and gets you walked out on', moon.walk > fair.walk, `${fair.walk}% → ${moon.walk}%`);
ok('nobody walks over a reasonable ask', fair.walk <= 15, fair.walk + '%');
ok('charisma helps', haggleOdds(st({ fame: 60, charisma: 95 }), film(), n.asks[1].amount).accept > push.accept);
ok('scandal hurts', haggleOdds(st({ fame: 60, scandal: 60 }), film(), n.asks[1].amount).accept < push.accept);
ok('the biggest machines need you least',
  haggleOdds(s60, film({ scale: 'blockbuster' }), n.asks[1].amount).accept < push.accept);

// outcomes
function spread(fame, whichAsk, runs = 600) {
  const out = { agreed: 0, met: 0, held: 0, walked: 0 };
  for (let i = 0; i < runs; i++) {
    const s = st({ fame });
    const job = film();
    const nn = negotiationFor(s, job);
    const r = haggle(s, job, nn.asks[whichAsk].amount);
    out[r.outcome]++;
  }
  return out;
}
const fairOut = spread(60, 0), moonOut = spread(60, 2);
ok('a fair ask lands most of the time', fairOut.agreed > 300, JSON.stringify(fairOut));
// Sat exactly on the line and flipped a coin every few runs. It lands about a quarter of
// the time and must not be anywhere near half.
ok('a wild ask usually does not', moonOut.agreed < 175, JSON.stringify(moonOut));
ok('a wild ask is how you lose the part', moonOut.walked > 100, JSON.stringify(moonOut));
ok('meeting in the middle is a real outcome', fairOut.met + moonOut.met > 50, `${fairOut.met} + ${moonOut.met}`);
console.log(`      fair ask: ${JSON.stringify(fairOut)}`);
console.log(`      wild ask: ${JSON.stringify(moonOut)}`);

// applying it to a real listing
function untilOutcome(want, ask) {
  for (let i = 0; i < 900; i++) {
    const s = st({ fame: 60, castingPool: [film()] });
    const before = s.castingPool[0].salary;
    const nn = negotiationFor(s, s.castingPool[0]);
    applyHaggle(s, 'c1', nn.asks[ask].amount);
    const c = s.castingPool[0];
    if (want === 'walked' && !c) return { s, before };
    if (want === 'raised' && c && c.salary > before) return { s, c, before };
    if (want === 'held' && c && c.salary === before) return { s, c, before };
  }
  return null;
}
const raised = untilOutcome('raised', 0);
ok('a won negotiation raises the fee on the listing', raised.c.salary > raised.before,
  `€${raised.before.toLocaleString()} → €${raised.c.salary.toLocaleString()}`);
ok('and sets your quote', raised.s.quote === raised.c.salary, '€' + raised.s.quote.toLocaleString());
ok('and cannot be run twice', raised.c.negotiated === true);
const held = untilOutcome('held', 0);
ok('a lost negotiation leaves the offer standing', held.c.salary === held.before);
const walked = untilOutcome('walked', 2);
ok('an overreach can remove the listing entirely', walked.s.castingPool.length === 0, walked.s.lastEvent);
ok('and says why', /stopped replying|went to somebody/.test(walked.s.lastEvent), walked.s.lastEvent);

// television negotiates per episode, and the total follows
const tv = st({ fame: 60, castingPool: [show()] });
const nTv = negotiationFor(tv, tv.castingPool[0]);
ok('a series negotiates per episode', nTv.perEpisode === true);
for (let i = 0; i < 400; i++) {
  const s = st({ fame: 60, castingPool: [show()] });
  const nn = negotiationFor(s, s.castingPool[0]);
  applyHaggle(s, 'c2', nn.asks[0].amount);
  const c = s.castingPool[0];
  if (c && c.episodeFee !== 200000) {
    ok('a raised episode fee recomputes the season total', c.salary === c.episodeFee * c.episodes,
      `€${c.episodeFee.toLocaleString()} × ${c.episodes} = €${c.salary.toLocaleString()}`);
    break;
  }
}

// it works on a real generated pool
const live = st({ fame: 60 });
refreshCastingPool(live, true);
const negotiable = live.castingPool.filter((c) => negotiationFor(live, c));
ok('real listings are negotiable at star', negotiable.length > 0, `${negotiable.length}/${live.castingPool.length}`);
ok('and every one of them quotes a sane ceiling', negotiable.every((c) => {
  const nn = negotiationFor(live, c);
  return nn.ceiling >= nn.quoted && nn.asks.every((a) => a.amount > 0);
}));

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
