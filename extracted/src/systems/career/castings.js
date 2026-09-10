import { count } from '../../engine/text.js';
import { uid } from '../../engine/id.js';
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { onCooldown, markUsed } from '../../engine/cooldown.js';
import { earn, markReleased } from '../../engine/economy.js';
import { GENRES } from '../meta/news.js';
import { addGenreXP, genreBonus } from './genres.js';
import { startProduction } from './production.js';
import { quoteFor, episodeRate, setFame } from '../meta/status.js';
import { rollStability, feeFactor, riskPrestige } from './stability.js';
import { askerStanding } from './awards.js';
import { ageFit, seenForIt } from './age.js';
import { canWork, insurability, depressed } from '../life/strain.js';
// What a casting office will see you for. Usually that is fame — but an Asker counts,
// and it is the one route into work above your level that does not run through
// blockbusters. An actor with a statuette and forty fame gets read for parts that used
// to want seventy.
export function reach(s) { return (s.fame || 0) + askerStanding(s); }
const clamp = (v) => Math.max(0, Math.min(100, v));
// Two things the old table got wrong, both of them real-world facts:
//   · television is paid PER EPISODE, film is paid for the picture. They are not the
//     same unit and showing both as "per month" made a soap look like a salary.
//   · every number here is SCALE — what an unknown gets. A name is paid a multiple of
//     it (systems/meta/status.js), which is why the same lead role is €45k for a nobody
//     and several million for an A-lister. That gap is the whole career.
//
// The fee is no longer a base number here — it is a MEDIUM, and what you are paid in
// that medium is looked up against your name (systems/meta/status.js). A rising star
// gets €25,000 an episode of network drama and €500,000 for a studio picture, and no
// single multiplier produces both.
//
// A `share` under 1 is a smaller part in the same medium: a guest spot on a network
// drama is not a series-regular fee, even though the show pays network rates.
//
// series: [type, role, [minMo,maxMo], [minEps,maxEps], medium, scale, minFame, share]
// film:   [type, role, [minMo,maxMo], medium, scale, minFame, share]
const POOLS = {
  actor: {
    series: [
      ['Soap Opera', 'Recurring', [3, 5], [22, 44], 'tv_daytime', 'recurring'],
      ['Drama Series', 'Guest role', [2, 3], [2, 4], 'tv_network', 'episode', 0, 0.45],
      ['Crime Series', 'Episode', [2, 3], [1, 3], 'tv_network', 'episode', 0, 0.55],
      ['Network Drama', 'Series regular', [5, 8], [10, 16], 'tv_network', 'recurring', 25],
      ['Prestige Series', 'Season lead', [7, 10], [8, 10], 'tv_prestige', 'prestige', 55],
      // Opens late. It pays in standing, and it is the shelf that replaces the one that closes.
      ['Prestige Series', 'The matriarch', [6, 9], [6, 9], 'tv_prestige', 'prestige', 30, 0.8],
    ],
    film: [
      ['Short Film', 'Lead', [1, 2], 'film_indie', 'small', 0, 0.12, 42],
      ['Horror Movie', 'Victim', [1, 2], 'film_indie', 'small', 0, 0.3, 52],
      ['Indie Film', 'Supporting', [2, 4], 'film_indie', 'indie', 0, 0.5],
      ['Indie Film', 'Lead', [3, 5], 'film_indie', 'indie', 15],
      ['Feature Film', 'Lead', [5, 8], 'film_studio', 'feature', 30],
      ['Studio Blockbuster', 'Lead', [10, 14], 'film_tentpole', 'blockbuster', 70],
      // The late-career shelf: the parts that win things and do not sell tickets.
      ['Prestige Drama', 'Character lead', [4, 7], 'film_indie', 'indie', 20, 1.6],
      ['Feature Film', 'Elder statesman', [3, 6], 'film_studio', 'feature', 25, 0.55],
      ['Indie Film', 'Grandparent', [2, 4], 'film_indie', 'indie', 0, 0.7],
    ],
    // The eighth number is a CEILING. Nobody sends an A-lister a background call, and the
    // things that only start arriving once people know your face have to arrive from
    // somewhere — a star was being offered TV Extra work and no brand campaigns at all.
    ads: [
      ['Brand Campaign', 'Face', [1, 1], 'ad', 'oneoff'],
      ['Commercial', 'Actor', [1, 1], 'ad', 'oneoff', 0, 0.35],
      ['Talk Show', 'Guest on the sofa', [1, 1], 'ad', 'oneoff', 35, 0.22],
      ['Magazine Cover', 'The cover', [1, 1], 'ad', 'oneoff', 40, 0.3],
      ['Awards Show', 'Presenting', [1, 1], 'ad', 'oneoff', 58, 0.45],
      ['Fashion House', 'The face of it', [1, 1], 'ad', 'oneoff', 66, 1.4],
    ],
    gigs: [
      ['Theatre Run', 'Stage', [2, 2], 'gig', 'small', 0, 4],
      ['Voice Session', 'Voice', [1, 1], 'gig', 'oneoff', 0, 2],
      ['TV Extra', 'Background', [1, 1], 'gig', 'oneoff', 0, 1, 38],
      ['Student Film', 'Lead', [1, 1], 'gig', 'oneoff', 0, 1.5, 30],
    ],
  },
  singer: {
    series: [
      ['Music Show', 'Guest', [1, 2], [1, 2], 'tv_network', 'episode', 0, 0.4],
      ['Talent Series', 'Judge', [4, 7], [10, 16], 'tv_network', 'recurring', 40],
    ],
    film: [
      ['Music Video', 'Star', [1, 1], 'ad', 'oneoff', 0, 0.5],
      ['Concert Film', 'Headliner', [2, 3], 'film_indie', 'feature', 30],
      ['Stadium Tour', 'Headliner', [8, 12], 'film_tentpole', 'blockbuster', 70],
    ],
    ads: [['Jingle', 'Voice', [1, 1], 'ad', 'oneoff', 0, 0.3], ['Brand Song', 'Artist', [1, 1], 'ad', 'oneoff']],
    gigs: [['Open Mic', 'Performer', [1, 1], 'gig', 'oneoff', 0, 0.4], ['Festival Slot', 'Act', [1, 1], 'gig', 'oneoff', 0, 3], ['Session Work', 'Session', [1, 1], 'gig', 'oneoff', 0, 1.5]],
  },
};
// What the shoot is worth to your name, and how the world treats the credit.
const SCALE = {
  oneoff:      { prestige: [8, 20],  tier: 'supporting', label: 'One-off' },
  small:       { prestige: [15, 30], tier: 'supporting', label: 'Small' },
  episode:     { prestige: [30, 45], tier: 'supporting', label: 'Episode' },
  indie:       { prestige: [35, 55], tier: 'supporting', label: 'Indie' },
  recurring:   { prestige: [40, 55], tier: 'lead', label: 'Recurring' },
  feature:     { prestige: [55, 72], tier: 'lead', label: 'Feature' },
  prestige:    { prestige: [70, 88], tier: 'lead', label: 'Prestige' },
  blockbuster: { prestige: [80, 96], tier: 'tentpole', label: 'Blockbuster' },
};
export function scaleOf(c) { return SCALE[c?.scale] || SCALE.episode; }
// Six words by six words is thirty-six titles, and six listings drawn out of that
// collide constantly — the board regularly showed the same film twice on two shelves,
// and two films of the same name collapsed into one row in the filmography.
const TITLE_A = ['Late', 'Golden', 'Silent', 'Broken', 'Bright', 'Lost', 'Quiet', 'Last', 'Paper', 'Neon',
  'Bitter', 'Hollow', 'Certain', 'Northern', 'Second', 'Patient', 'Crooked', 'Tender'];
const TITLE_B = ['River', 'Avenue', 'Season', 'Signal', 'Harbor', 'Echo', 'Hour', 'Room', 'Line', 'City',
  'Winter', 'Weather', 'Machine', 'Country', 'Animal', 'Kingdom', 'Daughter', 'Distance'];
function titleFor(taken) {
  for (let i = 0; i < 60; i++) {
    const t = `${pick(TITLE_A)} ${pick(TITLE_B)}`;
    if (!taken || !taken.has(t)) return t;
  }
  // Astronomically unlikely, but a title is never worth an infinite loop.
  return `${pick(TITLE_A)} ${pick(TITLE_B)} ${rint(2, 99)}`;
}
// How many listings the board carries for you. This is the real shape of a career: not
// that the work gets worse, but that there is less of it. A board that always held six
// options meant a seventy-year-old worked exactly as hard as a thirty-year-old, and
// since fame and craft only climb, the oldest version of you was the strongest — the
// median Asker across a hundred careers was won at fifty-seven.
export function boardSize(s) {
  const age = s.ageY || 0;
  // A name gets sent more, and that was missing entirely: the board held six things whether
  // you were nobody or an A-lister, and six things spread across four shelves reads as
  // "Series 1 · Film 1 · Ads 0 · Gigs 2" — which looks like an empty game rather than a
  // career. Standing buys volume, and then age takes it away again.
  // Six to twelve was still too thin in the hand: split four ways it reads "Series 1 ·
  // Film 2 · Ads 2 · Gigs 1", and opening a tab to find a single card does not feel like a
  // board at all — it feels like the game ran out. A working actor's agent sends over a
  // stack every week. Eight to eighteen gives every shelf two at the bottom and four or
  // five at the top, which is what a stack looks like.
  const standing = Math.min(1, reach(s) / 78);
  const base = 8 + Math.round(standing * 10);           // 8 at nobody, 18 at the top
  // It turns for women first, which is the ugly part of this business and worth saying
  // rather than smoothing away.
  const peakEnd = 42 - (s.gender === 'female' ? 5 : 0);
  if (age <= peakEnd) return base;
  return Math.max(3, Math.round(base * (1 - 0.62 * Math.min(1, (age - peakEnd) / 28))));
}
// Rerolling the whole board cost nothing and had no limit, so the correct play was to press
// it until something with ninety per cent odds appeared — every month, for a whole career.
// The board is what the board is this month. It refills on its own as things expire.
export function canReroll(s) { return !onCooldown(s, 'castingReroll'); }
export function rerollBoard(s) {
  if (!canReroll(s)) { s.lastEvent = 'You have already been through everything going this month.'; return s; }
  markUsed(s, 'castingReroll');
  refreshCastingPool(s, true);
  s.lastEvent = 'You went back through the listings. Some of it is new.';
  return s;
}

export function refreshCastingPool(s, force) {
  s.castingPool = s.castingPool || [];
  const now = (s.year || 0) * 12 + (s.month || 0);
  // Throw out anything whose window has closed BEFORE deciding there is nothing to do.
  // The early return was above this line, so a full board never expired anything and the
  // same four listings sat there for the rest of the life.
  s.castingPool = force ? [] : s.castingPool.filter((c) => (c._expires || 0) > now);
  const want = boardSize(s);
  if (!force && s.castingPool.length >= want) return;
  const career = s.dream === 'singer' ? 'singer' : 'actor';
  const shelves = POOLS[career];
  // No two things on the board share a name, and nothing is named after something you
  // have already made or are already shooting.
  const taken = new Set([
    ...s.castingPool.map((c) => c.title),
    ...(s.filmography || []).map((c) => c.title),
    ...(s.discography || []).map((c) => c.title),
    ...(s.releases || []).map((r) => r.title),
    ...(s.frozen || []).map((f) => f.title),
    ...(s.offers || []).map((o) => String(o.projectTitle || '').replace('⭐ ', '')),
    s.production ? s.production.title : '',
  ]);
  // Picking a shelf at random for every slot left whole tabs empty — six listings spread
  // across four shelves regularly came out as "Series 1 · Film 1 · Ads 0 · Gigs 2", which
  // reads as an empty game rather than a career. Every shelf is filled to a floor first,
  // and only what is left over goes wherever it goes.
  const shelfNames = Object.keys(shelves);
  const SHELF_FLOOR = 2;
  const countOn = (id) => s.castingPool.filter((x) => x.shelf === id).length;
  let guard = 0;
  while (s.castingPool.length < want && guard++ < 400) {
    const short = shelfNames.filter((id) => countOn(id) < SHELF_FLOOR);
    const shelf = short.length ? pick(short) : pick(shelfNames);
    const row = pick(shelves[shelf]);
    const perEpisode = shelf === 'series';
    const [type, role, span] = row;
    // A casting office reading somebody else's age never sends you the sides at all.
    if (!seenForIt(s, role)) continue;
    const [eps, medium, scale, minFame, share, maxFame] = perEpisode ? row.slice(3) : [null, ...row.slice(3)];
    // Above the ceiling this kind of work simply stops being sent to you. Nobody offers an
    // A-lister a background call.
    if (maxFame != null && reach(s) > maxFame) continue;
    // What YOU are worth in this medium. Zero means they would not have you at any
    // price yet — the listing simply does not appear.
    const quoted = Math.round(quoteFor(s, medium) * (share || 1));
    if (quoted <= 0) continue;
    const months = rint(span[0], span[1]);
    const episodes = perEpisode ? rint(eps[0], eps[1]) : 0;
    // How solid the money behind this one is, and what they have to pay to make you
    // take that on. The player sees both before signing — that is the whole point.
    // A job that is over by the evening cannot fall apart, so it is never priced as if
    // it might — otherwise a one-day short would pay a risk premium for no risk.
    const stability = months < 2 ? rint(88, 97) : rollStability(scale);
    const fee = feeFactor(stability);
    // Bands are quoted against a typical season. A longer order pays less per episode.
    const base = perEpisode ? episodeRate(quoted, (eps[0] + eps[1]) / 2, episodes) : quoted;
    const rate = Math.round(base * fee);
    if (rate <= 0) continue;
    const title = titleFor(taken);
    taken.add(title);
    s.castingPool.push({
      id: uid(s, 'cast'), title: title, type, role, shelf, scale, medium,
      share: share || 1,   // negotiation needs it to know the top of YOUR band for this part
      stability, feeFactor: fee,   // negotiation argues inside the band this job actually pays in
      months, episodes, perEpisode, episodeFee: perEpisode ? rate : 0,
      salary: perEpisode ? rate * episodes : rate,        // the whole fee, paid across the shoot
      genre: pick(GENRES), minFame: minFame || 0,
      _expires: (s.year || 0) * 12 + (s.month || 0) + rint(2, 4),
    });
  }
}
export function castingChance(s, c) {
  const skill = s.dream === 'singer' ? s.singing : s.acting;
  // Scandal was purely cosmetic before — it accumulated and did nothing.
  const base = clamp(15 + skill * 0.5 + s.charisma * 0.2 + s.looks * 0.15 + s.luck * 0.1 - (s.scandal || 0) * 0.3);
  // And at the edge of a part's age you are the second choice in the room. And nobody
  // wants to bond an actor who has walked off three sets — see systems/life/strain.js.
  const fit = c ? ageFit(s, c.role) : 1;
  // And you are not yourself in a room when you are carrying this.
  const raw = base * (0.35 + 0.65 * fit) * insurability(s) * (depressed(s) ? 0.62 : 1);
  return Math.round(raw * reachFactor(s, c));
}
// How far above you the part is.
//
// Nothing in this function used to know what the part WAS. A soap opera and the lead of a
// prestige series returned the same number — on the board at fame 82 they both read
// "88% shot" — so above the minFame gate every job in the game was equally easy, and the
// only thing standing between an unknown and a tentpole was a hard lock.
//
// This only ever bites UPWARDS: a part at or below your standing is untouched, so nothing
// about the early game gets harder. What changes is that reaching over your head is a long
// shot rather than a coin flip, which is the whole texture of the climb.
function reachFactor(s, c) {
  if (!c) return 1;
  const demand = (scaleOf(c).prestige || [40, 55])[1];
  const gap = demand - reach(s);
  if (gap <= 0) return 1;
  return Math.max(0.45, 1 - gap / 90);
}
// ── preparing for one ─────────────────────────────────────────────────────────
// The months between seeing a part and reading for it are the ones actors actually talk
// about. You can spend them: learn the sides, work with a coach, turn up knowing more than
// anybody else in the room. Two levels, and the second one costs real money.
export const PREP = [
  { level: 1, label: 'Learn the sides', blurb: 'Read it until you stop reading it.', cost: 0, bonus: 9 },
  { level: 2, label: 'Work it with a coach', blurb: 'Somebody who has been in that room before.', cost: 2200, bonus: 11 },
];
export function prepOf(c) { return c ? (c.prep || 0) : 0; }
export function prepBonus(c) {
  const n = prepOf(c);
  return PREP.slice(0, n).reduce((a, p) => a + p.bonus, 0);
}
export function nextPrep(c) { return PREP[prepOf(c)] || null; }
export function prepareFor(s, id) {
  const c = (s.castingPool || []).find((x) => x.id === id); if (!c) return s;
  const step = nextPrep(c);
  if (!step) { s.lastEvent = 'You know it as well as you are going to.'; return s; }
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  const cost = Math.round(step.cost * (1 + Math.min(2, (s.fame || 0) / 60)));
  if (cost > (s.cash || 0)) { s.lastEvent = `A coach for this costs €${cost.toLocaleString()}. You cannot cover it.`; return s; }
  s.ap -= 1; s.cash = (s.cash || 0) - cost;
  c.prep = prepOf(c) + 1;
  s.lastEvent = step.level === 1
    ? `You went through "${c.title}" line by line. You will walk in knowing it.`
    : `You worked "${c.title}" with a coach — €${cost.toLocaleString()}. They found two things you had not.`;
  return s;
}

// ── waiting to hear ───────────────────────────────────────────────────────────
export function submissionsOut(s) { return (s.submissions || []).length; }
// Runs monthly. Anything whose answer is due gets answered.
export function submissionsTick(s) {
  const now = (s.year || 0) * 12 + (s.month || 0);
  const due = (s.submissions || []).filter((x) => x.due <= now);
  if (!due.length) return s;
  s.submissions = (s.submissions || []).filter((x) => x.due > now);
  for (const sub of due) answerSubmission(s, sub);
  return s;
}
function answerSubmission(s, sub) {
  const c = sub.casting;
  if (!chance(sub.odds)) {
    s.mental = clamp((s.mental || 50) - 2);
    s.lastEvent = `They went another way on "${c.title}". No reason given, because there never is one.`;
    addTimeline(s, `Did not get ${c.title}.`);
    return s;
  }
  // A yes is an offer, not a summons. If you are shooting, it waits on the board until it
  // does not — which is the other half of the job nobody tells you about.
  const sc = scaleOf(c);
  (s.offers = s.offers || []).push({
    id: uid(s, 'off'),
    projectTitle: c.title, role: c.role, type: c.type, genre: c.genre,
    salary: c.salary, months: c.months, tier: sc.tier, scale: c.scale,
    episodes: c.episodes, episodeFee: c.episodeFee, season: c.perEpisode ? 1 : 0,
    stability: c.stability, perEpisode: c.perEpisode, medium: c.medium,
    prestigeScore: rint(sc.prestige[0], sc.prestige[1]) + Math.round((sub.quality - 50) * 0.12) + riskPrestige(c.stability),
    expires: (s.year || 0) * 12 + (s.month || 0) + rint(2, 4),
  });
  s.lastEvent = `You got "${c.title}". They want you.`;
  addTimeline(s, `Booked ${c.title}.`);
  s.bigMoment = { id: 'booked', kind: 'good', title: 'You got it',
    body: `"${c.title}" is yours. ${c.role}${c.months ? `, ${count(c.months, 'month')} of shooting` : ''}. `
      + 'Somebody in an office made a list and your name was at the top of it, and you will never find out why.' };
  return s;
}

// quality (0-100) comes from the audition minigame: nail the read and your odds jump,
// fumble it and the room cools on you.
export function auditionFor(s, id, quality = 50) {
  const c = (s.castingPool || []).find((x) => x.id === id); if (!c) return s;
  // One real job at a time — you cannot be on two call sheets. But a voice session or a day
  // as an extra is an afternoon, and an actor in the middle of a fourteen-month blockbuster
  // does those on a Saturday. Blocking them meant the longest shoots were also the emptiest
  // months in the game: three Energy and nothing whatsoever to spend it on.
  if (s.production && (c.months || 1) >= 2) {
    s.lastEvent = `You are shooting "${s.production.title}". Nobody can be in two places.`;
    return s;
  }
  const fit = canWork(s);
  if (!fit.ok) { s.lastEvent = fit.why; return s; }
  if (reach(s) < (c.minFame || 0)) { s.lastEvent = 'You need more fame before they will see you for this.'; return s; }
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  s.ap = (s.ap || 0) - 1;
  const odds = clamp(castingChance(s, c) + (quality - 50) * 0.55 + prepBonus(c));
  // Anything with a real schedule does not answer you in the room. You did your read, you
  // went home, and somewhere between one and three months later a phone rings or it does
  // not. This is the whole rhythm of the job, and the game used to skip it: audition, book,
  // shoot, audition, book — 86% of a forty-five-year career was spent on a set.
  if ((c.months || 1) >= 2) {
    const wait = rint(1, 3);
    (s.submissions = s.submissions || []).push({
      id: uid(s, 'sub'),
      casting: { ...c }, title: c.title, role: c.role, odds,
      quality, due: (s.year || 0) * 12 + (s.month || 0) + wait, wait,
    });
    s.castingPool = (s.castingPool || []).filter((x) => x.id !== id);
    // How the read actually went. Without this the minigame was invisible: you could blow
    // it on the first beat and the game would tell you, word for word, exactly what it told
    // somebody who had just been brilliant.
    const room = quality >= 90 ? 'The room went quiet. That was the best you have ever been. '
      : quality >= 70 ? 'It went well — you felt them lean in. '
      : quality >= 45 ? 'A solid read. Nothing to be ashamed of. '
      : quality > 0 ? 'You got through it. It was not your best work. '
      : 'It fell apart early and you both knew it. ';
    s.lastEvent = `${room}You read for "${c.title}". `
      + `They said they would be in touch. About ${wait} month${wait === 1 ? '' : 's'}.`;
    addTimeline(s, `Read for ${c.title}.`);
    return s;
  }
  if (chance(odds)) {
    // A voice session or a day as an extra really is over by the evening.
    const skill = s.dream === 'singer' ? s.singing : s.acting;
    const rating = clamp(25 + skill * 0.30 + (quality - 50) * 0.25 + (s.looks - 40) * 0.1 + genreBonus(s, c.genre) + rint(-8, 14));
    const status = rating >= 85 ? 'Hit' : rating >= 70 ? 'Well-received' : rating >= 50 ? 'Released' : 'Flop';
    const bucket = s.dream === 'singer' ? 'discography' : 'filmography';
    // A commercial is not a credit in the sense a film is. It still happened and still
    // paid, so it is kept — but under Other work, without a score. Nobody rates a
    // shampoo advert out of ten, and letting them do so dragged the whole filmography.
    (s[bucket] = s[bucket] || []).unshift({ title: c.title, role: c.role, type: c.type, genre: c.genre,
      salary: c.salary, rating, status, year: s.year, minor: true });
    addGenreXP(s, c.genre, rating);
    earn(s, c.salary, `"${c.title}" paid`); markReleased(s); setFame(s, s.fame + rint(1, 3)); s.confidence = clamp(s.confidence + 2);
    s.lastEvent = `${quality >= 80 ? 'The room goes quiet — you nailed it. ' : ''}One day's work on "${c.title}". It came out ${status.toLowerCase()} (${Math.round(rating)}/100).`;
    addTimeline(s, `Booked ${c.title}: ${status}.`, rating < 50);
  } else {
    s.mental = clamp(s.mental - 2);
    s.lastEvent = quality < 35
      ? `You fumbled the read for "${c.title}". They thank you before you've finished. No callback.`
      : `You auditioned for "${c.title}" and didn't get it. Next time.`;
    addTimeline(s, `Auditioned for ${c.title} — no callback.`);
  }
  s.castingPool = (s.castingPool || []).filter((x) => x.id !== id);
  return s;
}
export const SHELVES = [['series','Series'],['film','Film'],['ads','Ads'],['gigs','Gigs']];
export const SHELF_BLURB = { series: 'Recurring work — slower money, but your face every week.', film: 'One shot, one release. The credits that define you.', ads: 'Brand money. Pays fast, spends a little credibility.', gigs: 'Small paid work. Keeps the lights on and the reps up.' };
