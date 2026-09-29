// The Asker campaign, rebuilt.
//
// Maxi, twice: "the Asker campaign still takes my money and I do not understand how it
// works." He was right twice. The old one was bought on an OFFER — months before the picture
// was shot, blind — cost fifteen per cent of the fee out of his own pocket, and did nothing
// at all for the nomination. Measured, it bought about one percentage point of an Asker per
// picture. Six million euros for one point.
//
// What is pinned here is the shape of the new one:
//   · a distributor pays for its own campaign; what it wants from you is three months
//   · you only pay cash for a picture nobody else is spending on, and it does less
//   · it moves the NOMINATION, because that is the part a campaign is for
import { nominationOdds, campaignFactor, campaignStrength, campaignable, canCampaign,
  startCampaign, campaignTick, campaignKind, ownCampaignCost, liveCampaign,
  CAMPAIGN_ENERGY, CAMPAIGN_MONTHS, CAMPAIGN_FLOOR } from '../src/systems/career/awards.js';
import { ensureWorld } from '../src/systems/world/world.js';

let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.log('  FAIL: ' + msg); fails++; } };

const st = (more = {}) => {
  const s = { version: 'x', name: 'M', gender: 'female', ageY: 36, stage: 'career', dream: 'actor',
    fame: 70, respect: 55, acting: 75, charisma: 60, looks: 65, luck: 50, scandal: 0, media: 0,
    mental: 70, health: 92, strain: 10, year: 2070, month: 2, timeline: [], filmography: [],
    productions: [], offers: [], releases: [], inbox: [], peakFame: 70, hasApartment: true,
    housing: 'flat', ap: 100, apMax: 100, apMaxEff: 100, cash: 3000000, genreXP: {}, people: [],
    quote: 2000000, awards: { wins: [], nominations: [] }, alive: true, cooldowns: {}, ...more };
  ensureWorld(s); return s;
};
const credit = (more = {}) => ({ id: 'c1', title: 'The Picture', year: 2070, rating: 78, score: 7.8,
  scale: 'prestige', tier: 'lead', role: 'Lead', type: 'Feature Film', genre: 'Drama', ...more });
const month = (s) => { s.month++; if (s.month > 11) { s.month = 0; s.year++; } };

// ── it moves the list, not the night ──────────────────────────────────────────
{
  const bare = nominationOdds(70), full = nominationOdds(70, false, 1);
  ok(full > bare * 1.4, `a full season is worth real odds on the list: ${bare.toFixed(1)}% -> ${full.toFixed(1)}%`);
  ok(campaignFactor(1) < 1.35, `and much less on the night itself: x${campaignFactor(1).toFixed(2)}`);
  ok(nominationOdds(70, false, 0) === bare, 'no campaign changes nothing');
}

// ── who pays ──────────────────────────────────────────────────────────────────
{
  ok(campaignKind(credit({ scale: 'blockbuster' })) === 'studio', 'a studio picture is the studio’s campaign');
  ok(campaignKind(credit({ scale: 'prestige' })) === 'studio', 'so is a prestige picture');
  ok(campaignKind(credit({ scale: 'festival' })) === 'own', 'a festival film is nobody’s but yours');
  ok(campaignKind(credit({ scale: 'indie' })) === 'own', 'and so is an indie');
}
{
  // The studio one costs months and not a penny.
  const s = st();
  s.filmography = [credit({ scale: 'prestige' })];
  const list = campaignable(s);
  ok(list.length === 1, 'the picture is campaignable: ' + list.length);
  const cash0 = s.cash;
  startCampaign(s, 'The Picture');
  ok(s.cash === cash0, `a studio season costs you nothing in cash: ${cash0} -> ${s.cash}`);
  ok(!!liveCampaign(s), 'and it is running');
  const ap0 = s.ap;
  campaignTick(s);
  ok(ap0 - s.ap === CAMPAIGN_ENERGY, `and it takes ${CAMPAIGN_ENERGY} energy a month: took ${ap0 - s.ap}`);
}
{
  // Yours costs money, and does less.
  const s = st();
  s.filmography = [credit({ scale: 'festival' })];
  const cash0 = s.cash;
  startCampaign(s, 'The Picture');
  ok(s.cash === cash0 - ownCampaignCost(s), `funding it yourself costs €${ownCampaignCost(s).toLocaleString()}`);
  ok(ownCampaignCost(s) < 400000, 'and it is not a blockbuster fee: ' + ownCampaignCost(s));
  const yours = credit({ scale: 'festival', campaign: 'own', campaignMonths: CAMPAIGN_MONTHS });
  const theirs = credit({ scale: 'prestige', campaign: 'studio', campaignMonths: CAMPAIGN_MONTHS });
  ok(campaignStrength(yours) < campaignStrength(theirs), `and one person does less than forty: ${campaignStrength(yours).toFixed(2)} vs ${campaignStrength(theirs).toFixed(2)}`);
}

// ── you have to turn up ───────────────────────────────────────────────────────
{
  const s = st();
  s.filmography = [credit({ scale: 'prestige' })];
  startCampaign(s, 'The Picture');
  for (let i = 0; i < CAMPAIGN_MONTHS; i++) { s.ap = 100; campaignTick(s); month(s); }
  ok(campaignStrength(s.filmography[0]) === 1, 'turning up every month is a full season: ' + campaignStrength(s.filmography[0]));

  const half = st();
  half.filmography = [credit({ scale: 'prestige' })];
  startCampaign(half, 'The Picture');
  half.ap = 100; campaignTick(half); month(half);
  half.ap = 0; campaignTick(half); month(half);
  half.ap = 0; campaignTick(half); month(half);
  ok(campaignStrength(half.filmography[0]) < 0.5, 'missing it twice leaves you with a poster: ' + campaignStrength(half.filmography[0]).toFixed(2));
  ok(!liveCampaign(half), 'and it has stopped');
}

// ── what cannot be campaigned ─────────────────────────────────────────────────
{
  const bad = st(); bad.filmography = [credit({ rating: CAMPAIGN_FLOOR - 10, score: 5.2 })];
  ok(campaignable(bad).length === 0, 'nobody runs a season for a picture that is not good');

  const tv = st(); tv.filmography = [credit({ scale: 'recurring' })];
  ok(campaignable(tv).length === 0, 'and this is the film season, not television');

  const late = st({ month: 9 }); late.filmography = [credit()];
  ok(campaignable(late).length === 0, 'and once the list has been read out it is too late');

  const busy = st(); busy.filmography = [credit(), credit({ id: 'c2', title: 'The Other One' })];
  startCampaign(busy, 'The Picture');
  const fit = canCampaign(busy, busy.filmography[1]);
  ok(!fit.ok, 'and you cannot do two at once: ' + fit.why);
}

if (fails) { console.log('test_campaign: ' + fails + ' failed'); process.exit(1); }
console.log('test_campaign: all passed');
