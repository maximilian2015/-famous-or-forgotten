import { COST, canAfford, spend, tooTired } from '../../engine/energy.js';
import { count } from '../../engine/text.js';
import { uid } from '../../engine/id.js';
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline, showMoment } from '../../engine/timeline.js';
import { onCooldown, markUsed } from '../../engine/cooldown.js';
import { markReleased } from '../../engine/economy.js';
import { paid } from './agent.js';
import { GENRES } from '../meta/news.js';
import { addGenreXP, genreBonus } from './genres.js';
import { startProduction } from './production.js';
import { canTakeSet } from '../../engine/sets.js';
import { facePenalty } from '../life/face.js';
import { quoteFor, episodeRate, setFame, isForgotten } from '../meta/status.js';
import { reachFromStanding, prestigeShut, insuranceShut, roomHasHeard, boardThinned } from '../meta/standing.js';
import { rollStability, feeFactor, riskPrestige } from './stability.js';
import { askerStanding } from './awards.js';
import { ageFit, seenForIt } from './age.js';
import { canWork, insurability, depressed } from '../life/strain.js';
import { sendMail } from '../meta/email.js';
import { newTitle } from '../world/titles.js';
import { seasonCap, slotNorm, tvMonths } from './franchise.js';
import { rumourFactor } from '../meta/trouble.js';
import { typeFit, typeFactor, typecastAfterDayWork, strongLabels } from '../meta/typecast.js';
import { storyCastFactor, hiding } from '../meta/stories.js';
import { hypeReach, hypeBrands } from '../meta/hype.js';
export { tvMonths, TV_PACE } from './franchise.js';
// What a casting office will see you for. Usually that is fame — but an Asker counts,
// and it is the one route into work above your level that does not run through
// blockbusters. An actor with a statuette and forty fame gets read for parts that used
// to want seventy.
// And standing, once it is high enough to be talked about: a respected nobody is sent parts
// their fame does not justify. See systems/meta/standing.js — the actor's actor.
// Box office poison: two leads that bombed inside two years (release.js). A year without
// the studio's pictures, and the agent brings half as much.
export { hiding };
export function poisoned(s) { return (s.poisonUntil || 0) > (s.year || 0) * 12 + (s.month || 0); }
// A name they have heard this month reads as a bigger name (meta/hype.js).
export function reach(s) { return (s.fame || 0) + askerStanding(s) + reachFromStanding(s) + hypeReach(s); }
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
// The board has four shelves now — Maxi: "OpenCall should be split: TV, films, and
// arthouse/indie — three columns; films are hard." Television is the soaps, the series
// and the prestige seasons (they air on television and the network renews them, however
// much they are cast like films). Film is the studio's pictures, and the studios do not
// send scripts to strangers. Indie is the small pictures, the horror, the character parts
// that win things and sell nothing. And a day's work — adverts, covers, a voice session,
// a theatre run — is its own shelf, because it fits around any set.
//
// tv:  [type, role, [minMo,maxMo], [minEps,maxEps], medium, scale, minFame, share]
// film / indie / day: [type, role, [minMo,maxMo], medium, scale, minFame, share, maxFame]
// Months are principal photography, the way it is: a studio picture two to four months, a
// tentpole five to eight (and prep before it), an indie a month or two. Maxi: "fourteen
// months?" — only Avatar. A supporting part is not there for the whole shoot.
const POOLS = {
  actor: {
    tv: [
      ['Soap Opera', 'Recurring', [3, 5], [22, 44], 'tv_daytime', 'recurring'],
      // A guest spot is a week's work at a guest's rate, not a season at a regular's. Maxi:
      // "one episode, three months of shooting, €20k an episode — that does not add up."
      // The months follow the episodes now (below), and the share is a guest's share.
      ['Drama Series', 'Guest role', [1, 2], [2, 4], 'tv_network', 'episode', 0, 0.2, 62],
      ['Crime Series', 'Episode', [1, 1], [1, 3], 'tv_network', 'episode', 0, 0.22, 62],
      ['Network Drama', 'Series regular', [5, 8], [10, 16], 'tv_network', 'recurring', 25],
      ['Prestige Series', 'Season lead', [7, 10], [8, 10], 'tv_prestige', 'prestige', 55],
      // Opens late. It pays in standing, and it is the shelf that replaces the one that closes.
      ['Prestige Series', 'The matriarch', [6, 9], [6, 9], 'tv_prestige', 'prestige', 30, 0.8],
    ],
    film: [
      ['Feature Film', 'Supporting', [3, 4], 'film_studio', 'feature', 18, 0.5],
      ['Feature Film', 'Lead', [3, 5], 'film_studio', 'feature', 30],
      ['Studio Blockbuster', 'Lead', [5, 8], 'film_tentpole', 'blockbuster', 70],
      ['Feature Film', 'Elder statesman', [2, 3], 'film_studio', 'feature', 25, 0.55],
    ],
    indie: [
      ['Short Film', 'Lead', [1, 2], 'film_indie', 'small', 0, 0.12, 42],
      ['Horror Movie', 'Victim', [1, 2], 'film_indie', 'small', 0, 0.3, 52],
      ['Indie Film', 'Supporting', [2, 3], 'film_indie', 'indie', 0, 0.5],
      ['Indie Film', 'Lead', [2, 4], 'film_indie', 'indie', 15],
      // The other way in. A festival picture pays nothing and nobody sees it — unless a jury
      // does. Maxi: "independent films that go to festivals are the real alternative; a nobody
      // can get in, and if it works there, you know what happens." See release.js, festivals.
      ['Festival Film', 'Lead', [2, 3], 'film_indie', 'festival', 0, 0.3],
      ['Festival Film', 'Supporting', [2, 3], 'film_indie', 'festival', 0, 0.18],
      // The late-career shelf: the parts that win things and do not sell tickets.
      ['Prestige Drama', 'Character lead', [3, 5], 'film_indie', 'indie', 20, 1.6],
      ['Indie Film', 'Grandparent', [2, 3], 'film_indie', 'indie', 0, 0.7],
    ],
    // The eighth number is a CEILING. Nobody sends an A-lister a background call, and the
    // things that only start arriving once people know your face have to arrive from
    // somewhere — a star was being offered TV Extra work and no brand campaigns at all.
    day: [
      ['Brand Campaign', 'Face', [1, 1], 'ad', 'oneoff', 15],
      ['Commercial', 'Actor', [1, 1], 'ad', 'oneoff', 0, 0.35],
      ['Magazine Cover', 'The cover', [1, 1], 'ad', 'oneoff', 40, 0.3],
      ['Awards Show', 'Presenting', [1, 1], 'ad', 'oneoff', 58, 0.45],
      ['Fashion House', 'The face of it', [1, 1], 'ad', 'oneoff', 66, 1.4],
      ['Theatre Run', 'Stage', [2, 2], 'gig', 'small', 0, 4],
      ['Voice Session', 'Voice', [1, 1], 'gig', 'oneoff', 0, 2],
      ['TV Extra', 'Background', [1, 1], 'gig', 'oneoff', 0, 1, 38],
      ['Student Film', 'Lead', [1, 1], 'gig', 'oneoff', 0, 1.5, 30],
    ],
  },
  singer: {
    tv: [
      ['Music Show', 'Guest', [1, 1], [1, 2], 'tv_network', 'episode', 0, 0.25],
      ['Talent Series', 'Judge', [4, 7], [10, 16], 'tv_network', 'recurring', 40],
    ],
    film: [
      ['Concert Film', 'Headliner', [2, 3], 'film_indie', 'feature', 30],
      ['Stadium Tour', 'Headliner', [5, 8], 'film_tentpole', 'blockbuster', 70],
    ],
    indie: [['Music Video', 'Star', [1, 1], 'ad', 'oneoff', 0, 0.5]],
    day: [['Jingle', 'Voice', [1, 1], 'ad', 'oneoff', 0, 0.3], ['Brand Song', 'Artist', [1, 1], 'ad', 'oneoff'], ['Open Mic', 'Performer', [1, 1], 'gig', 'oneoff', 0, 0.4], ['Festival Slot', 'Act', [1, 1], 'gig', 'oneoff', 0, 3], ['Session Work', 'Session', [1, 1], 'gig', 'oneoff', 0, 1.5]],
  },
};
// What the shoot is worth to your name, and how the world treats the credit.
const SCALE = {
  oneoff:      { prestige: [8, 20],  tier: 'supporting', label: 'One-off' },
  small:       { prestige: [15, 30], tier: 'supporting', label: 'Small' },
  episode:     { prestige: [30, 45], tier: 'supporting', label: 'Episode' },
  indie:       { prestige: [35, 55], tier: 'supporting', label: 'Indie' },
  // The material is the point of it. Nobody makes one of these for the money.
  festival:    { prestige: [48, 76], tier: 'supporting', label: 'Festival' },
  recurring:   { prestige: [40, 55], tier: 'lead', label: 'Recurring' },
  feature:     { prestige: [55, 72], tier: 'lead', label: 'Feature' },
  prestige:    { prestige: [70, 88], tier: 'lead', label: 'Prestige' },
  blockbuster: { prestige: [80, 96], tier: 'tentpole', label: 'Blockbuster' },
};
export function scaleOf(c) { return SCALE[c?.scale] || SCALE.episode; }
// What the picture can afford. The film_indie band is priced for a twelve-million indie;
// a horror picture made for one million and a short made for nothing cannot pay a fifth
// of that. Maxi: "€58k for the victim in an indie horror? I don't think so." Folded into
// the listing's share so the negotiation argues inside the same, smaller band.
const SCALE_MONEY = { small: 0.16, festival: 0.45 };
// Which season a television listing is for. Maxi: "a casting for a series should say which
// season — either the first, the premiere, or a show that is already running: season 3, 8,
// 14." Most television that is casting is television that already exists — a soap has been
// on for years and needs a new face, a drama is replacing somebody for season four, a guest
// spot is by definition on somebody else's running show. A new show is the rarer thing, and
// the bigger gamble: nobody knows if anyone will watch, and if they do it is yours from the
// pilot. An established show comes with an audience you can read off the listing.
export function seasonFor(type, scale) {
  const cap = seasonCap(type);
  if (scale === 'episode') return rint(2, Math.max(2, Math.min(cap - 1, 9)));      // always somebody else's show
  if (type === 'Soap Opera') return chance(28) ? 1 : rint(2, Math.min(cap - 2, 16));
  if (type === 'Talent Series') return chance(35) ? 1 : rint(2, Math.min(cap - 1, 8));
  if (scale === 'prestige') return chance(62) ? 1 : rint(2, Math.min(cap - 1, 3));
  return chance(50) ? 1 : rint(2, Math.min(cap - 1, 4));                            // network drama
}
// What a running show is drawing, in millions an episode — against what its slot wants
// (franchise.js SLOT_NORM). This is the number the network will renew on, and it is on
// the listing so you can read it before you sign: a soap drawing 2m against a 4m slot is
// a soap that is ending, however many seasons it has behind it.
export function showAudience(type) {
  return Math.round(slotNorm(type) * (0.5 + Math.random() * 0.95) * 10) / 10;
}
// Six words by six words is thirty-six titles, and six listings drawn out of that
// collide constantly — the board regularly showed the same film twice on two shelves,
// and two films of the same name collapsed into one row in the filmography.
// Titles now come from the world's generator (world/titles.js), which leans on the genre
// and keeps every title used in a life, yours or anybody's, from coming round twice.
function titleFor(s, genre, taken) { return newTitle(s, genre, taken); }
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
  let base = 8 + Math.round(standing * 10);             // 8 at nobody, 18 at the top
  // Nobody sends a script to the answer to a trivia question. A name that fell is sent LESS
  // than a newcomer, because a newcomer is a blank page and a has-been is a story everyone
  // already knows the ending of. See isForgotten in systems/meta/status.js.
  // Unless the business is still asking about you — see standing.js.
  if (isForgotten(s) && boardThinned(s)) base = 5;
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

export function refreshCastingPool(s, force, extra = 0) {
  s.castingPool = s.castingPool || [];
  const now = (s.year || 0) * 12 + (s.month || 0);
  // Throw out anything whose window has closed BEFORE deciding there is nothing to do.
  // The early return was above this line, so a full board never expired anything and the
  // same four listings sat there for the rest of the life.
  s.castingPool = force ? [] : s.castingPool.filter((c) => (c._expires || 0) > now);
  // Out of sight for a month (stories.js): nothing reaches you, which is the point.
  if (hiding(s)) { s.castingPool = []; return; }
  const want = boardSize(s) + extra;
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
  // The studios do not send scripts to strangers: below Rising Star the film shelf has no
  // floor, and the three or four things on it are things you cannot read for yet.
  const floorOf = (id) => (id === 'film' && reach(s) < 18 ? 0 : SHELF_FLOOR);
  const countOn = (id) => s.castingPool.filter((x) => x.shelf === id).length;
  let guard = 0;
  while (s.castingPool.length < want && guard++ < 400) {
    const short = shelfNames.filter((id) => countOn(id) < floorOf(id));
    const shelf = short.length ? pick(short) : pick(shelfNames);
    const row = pick(shelves[shelf]);
    const perEpisode = shelf === 'tv';
    const [type, role, span] = row;
    // A casting office reading somebody else's age never sends you the sides at all.
    if (!seenForIt(s, role)) continue;
    const [eps, medium, scale, minFame, share, maxFame] = perEpisode ? row.slice(3) : [null, ...row.slice(3)];
    // The brands ring when you are being talked about — most of all the tabloid kind (meta/hype.js).
    if (shelf === 'day' && /Brand|Commercial|Cover|Fashion/.test(type) && chance(Math.max(0, 40 - (hypeBrands(s) - 1) * 100))) continue;
    // Above the ceiling this kind of work simply stops being sent to you. Nobody offers an
    // A-lister a background call.
    if (maxFame != null && reach(s) > maxFame) continue;
    // A strong label moves the board: the parts against it are sent to you less often, and
    // the ones on it more. See meta/typecast.js.
    const genre = pick(GENRES);
    if (strongLabels(s).length) { const tf = typeFit(s, { genre, scale, type, perEpisode }); if (tf <= -0.5 && chance(45)) continue; }
    // And a board that is all locked is not a board. A shelf of two rows drew two series
    // regulars at 'fame 25' for an Unknown at 0 — every line locked. One rung above your
    // reach can show (something to aim at); anything further up does not exist for you yet.
    if ((minFame || 0) > reach(s) + 12) continue;
    // And nobody good wants a name they do not respect on their prestige series. The face —
    // famous, unrespected — does not see that shelf at all. See systems/meta/standing.js.
    const prestigeRow = scale === 'prestige' || /^Prestige/.test(type);
    if (prestigeRow && prestigeShut(s) && !s._openShelfOnce) continue;
    // A word with the studio (favours.js): one prestige listing, and only a prestige one.
    if (s._openShelfOnce && !prestigeRow) continue;
    // And nobody will insure the liability on a studio picture, whatever the audience says.
    if ((scale === 'feature' || scale === 'blockbuster') && (insuranceShut(s) || poisoned(s))) continue;
    // What YOU are worth in this medium. Zero means they would not have you at any
    // price yet — the listing simply does not appear.
    const cut = (share || 1) * (/^film/.test(medium) ? (SCALE_MONEY[scale] || 1) : 1);   // a theatre run is priced as a gig already
    const quoted = Math.round(quoteFor(s, medium) * cut);
    if (quoted <= 0) continue;
    const episodes = perEpisode ? rint(eps[0], eps[1]) : 0;
    // A guest spot shoots for as long as its episodes take: one or two is a week or so
    // inside a month, three or four is two.
    // Television shoots by the episode, so the months follow the order. Maxi: "do they really
    // shoot a series that long?" — ten episodes took eight months because the months were a
    // range of their own. A network hour is eight to ten days a piece; a soap does one a day;
    // prestige is slower and dearer. See TV_PACE.
    const months = scale === 'episode' ? (episodes <= 2 ? 1 : 2) : perEpisode ? tvMonths(type, scale, episodes) : rint(span[0], span[1]);
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
    const title = titleFor(s, genre, taken);
    // Television: which season, and — for a show that is already on — what it is drawing.
    const season = perEpisode ? seasonFor(type, scale) : 0;
    const audience = season > 1 ? showAudience(type) : 0;
    s.castingPool.push({
      id: uid(s, 'cast'), title: title, type, role, shelf, scale, medium,
      share: cut,   // negotiation needs it to know the top of YOUR band for this part
      stability, feeFactor: fee,   // negotiation argues inside the band this job actually pays in
      months, episodes, perEpisode, episodeFee: perEpisode ? rate : 0,
      salary: perEpisode ? rate * episodes : rate,        // the whole fee, paid across the shoot
      season, audience,
      genre, minFame: minFame || 0,
      _expires: (s.year || 0) * 12 + (s.month || 0) + rint(2, 4),
    });
    roomFor(s, s.castingPool[s.castingPool.length - 1]);   // who else is reading, decided now
    if (s._openShelfOnce) { s.castingPool[s.castingPool.length - 1].openedByName = true; delete s._openShelfOnce; }
  }
  delete s._openShelfOnce;
}
// One prestige listing on the board because you asked for it. See favours.js openShelf.
// A casting director who liked you sends you a read for something good. On the board next
// to everything else, with their name on it and a better chance in the room — and that is
// the most they will do. Maxi: "a casting director can push you or send you a casting for a
// good film, but that is the maximum; from there you are on your own."
export function addSentListing(s, from) {
  const before = new Set((s.castingPool || []).map((c) => c.id));
  refreshCastingPool(s, false, 1);
  const fresh = (s.castingPool || []).filter((c) => !before.has(c.id));
  const c = fresh.sort((a, b) => (b.salary || 0) - (a.salary || 0))[0];
  if (c) { c.sentBy = from; c.boost = 15; }
  return c || null;
}
export function addPrestigeListing(s) {
  s._openShelfOnce = true;
  refreshCastingPool(s, false, 1);
  return (s.castingPool || []).find((c) => c.openedByName) || null;
}
// ── the room ─────────────────────────────────────────────────────────────────
// Who else is reading, and what they are looking for. Maxi: "becoming a star is easy — there
// are no obstacles." There were none in the room: a read was you against a number, and the
// number was mostly the minigame. Now every part wants something — a face, a presence, the
// craft, a name the poster can sell — and two to six other people are reading for it, drawn
// from the business at the part's level. Your odds are your fit against theirs. Learning
// the sides tells you what they want; the field you see only as a count.
const WANTS = ['looks', 'charisma', 'craft', 'name'];
function wantFor(type, scale, genre) {
  if (scale === 'blockbuster') return chance(55) ? 'name' : 'looks';
  if (scale === 'prestige' || /Prestige|Festival/.test(type)) return chance(75) ? 'craft' : 'charisma';
  if (/Soap/.test(type)) return chance(60) ? 'looks' : 'charisma';
  if (genre === 'Comedy' || genre === 'Romance') return chance(60) ? 'charisma' : 'looks';
  if (scale === 'feature') return pick(['craft', 'name', 'looks', 'charisma']);
  return chance(60) ? 'craft' : pick(['looks', 'charisma']);
}
function hashOf(str) { let h = 0; for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
// A world actor's face and presence: not stored, derived, and the same every time.
function rivalTrait(a, want) {
  if (want === 'craft') return a.craft || 50;
  if (want === 'name') return a.fame || 0;
  const h = hashOf(a.id + want);
  return 38 + (h % 52);
}
function fitOf(skill, charisma, looks, fame, want) {
  const w = { craft: skill, charisma, looks, name: fame }[want] || skill;
  return 0.35 * skill + 0.15 * charisma + 0.15 * looks + 0.35 * w;
}
export function roomFor(s, c) {
  if (c.room) return c.room;
  const want = wantFor(c.type, c.scale, c.genre);
  const level = Math.max(c.minFame || 0, Math.min(90, reach(s)));
  const pool = ((s.world && s.world.actors) || []).filter((a) => a.alive && !a.retired && Math.abs((a.fame || 0) - level) <= 18);
  const n = c.scale === 'blockbuster' ? rint(4, 6) : c.scale === 'feature' || c.scale === 'prestige' ? rint(3, 5) : c.scale === 'recurring' ? rint(2, 4) : rint(2, 3);
  const picked = pool.sort(() => Math.random() - 0.5).slice(0, n);
  const fits = picked.map((a) => fitOf(a.craft || 50, rivalTrait(a, 'charisma'), rivalTrait(a, 'looks'), a.fame || 0, want));
  const field = fits.length ? fits.reduce((x, y) => x + y, 0) / fits.length : 45;
  c.room = { want, readers: n, field: Math.round(field) };
  return c.room;
}
export function yourFit(s, c) {
  const skill = s.dream === 'singer' ? s.singing : s.acting;
  return fitOf(skill || 0, s.charisma || 0, s.looks || 0, s.fame || 0, (c.room || roomFor(s, c)).want);
}
// Against the field: even money when you are the room's average, half when you are well
// under it, half again over it when you are clearly the best in the room.
export function fieldFactor(s, c) {
  const r = roomFor(s, c);
  const me = yourFit(s, c);
  const ratio = me / Math.max(1, r.field);
  return Math.max(0.45, Math.min(1.45, 0.25 + ratio * 0.75));
}
export function castingChance(s, c) {
  const skill = s.dream === 'singer' ? s.singing : s.acting;
  // Scandal was purely cosmetic before — it accumulated and did nothing.
  // And a face that does not move is a face they do not cast — see life/face.js.
  const base = clamp(15 + skill * 0.5 + s.charisma * 0.2 + s.looks * 0.15 + s.luck * 0.1 - (s.scandal || 0) * 0.3 - facePenalty(s));
  // And at the edge of a part's age you are the second choice in the room. And nobody
  // wants to bond an actor who has walked off three sets — see systems/life/strain.js.
  const fit = c ? ageFit(s, c.role) : 1;
  // And you are not yourself in a room when you are carrying this.
  const raw = base * (0.35 + 0.65 * fit) * insurability(s) * (depressed(s) ? 0.62 : 1);
  // Below zero, the room has heard about you before you read. See standing.js.
  return Math.round(raw * reachFactor(s, c) * roomHasHeard(s) * rumourFactor(s) * (c ? fieldFactor(s, c) * typeFactor(s, c) * storyCastFactor(s, c) : 1));
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
  // The small things are cast FROM unknowns — a short, a student film, a day as an extra. Reaching
  // over your head is a long shot; these are not over anybody's head. Measured: a sensible
  // player's first real credit came in month seventeen, eight reads to a booking, because
  // even a short film read as a reach for somebody at zero.
  if ((c.scale === 'small' || c.scale === 'oneoff') && reach(s) < 15) return 1;
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
  if (!canAfford(s, COST.sides)) { s.lastEvent = tooTired(s, COST.sides); return s; }
  const cost = Math.round(step.cost * (1 + Math.min(2, (s.fame || 0) / 60)));
  if (cost > (s.cash || 0)) { s.lastEvent = `A coach for this costs €${cost.toLocaleString()}. You cannot cover it.`; return s; }
  spend(s, COST.sides); s.cash = (s.cash || 0) - cost;
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
    sendMail(s, { from: 'Casting', subj: `Re: ${c.title}`, tag: 'reply', kind: 'reply', body: `Thank you for coming in to read for ${c.role} on ${c.title}. They have decided to go in a different direction. We will keep you in mind.`, cta: [{ label: 'Delete', fx: {}, reply: 'Kept on file, they said. Nobody has ever been taken off a file.' }] });
    return s;
  }
  // A yes is an offer, not a summons. If you are shooting, it waits on the board until it
  // does not — which is the other half of the job nobody tells you about.
  const sc = scaleOf(c);
  // A running show is "Title · season 8" on the call sheet and "Title" in the filmography —
  // the same convention a renewal uses (franchise.js), so the seasons group under one name.
  const season = c.perEpisode ? (c.season || 1) : 0;
  (s.offers = s.offers || []).push({
    id: uid(s, 'off'), via: 'casting',
    projectTitle: season > 1 ? `${c.title} · season ${season}` : c.title, role: c.role, type: c.type, genre: c.genre,
    salary: c.salary, months: c.months, tier: sc.tier, scale: c.scale,
    episodes: c.episodes, episodeFee: c.episodeFee, season, seriesTitle: c.perEpisode ? c.title : undefined,
    joined: season > 1, audience: c.audience || 0,
    stability: c.stability, perEpisode: c.perEpisode, medium: c.medium,
    prestigeScore: rint(sc.prestige[0], sc.prestige[1]) + Math.round((sub.quality - 50) * 0.12) + riskPrestige(c.stability),
    // Counted down by offersTick like every other offer. This used to be an absolute month
    // under a different name that nothing read: a part you won and never answered sat in
    // Messages for life, and two of them shut the agent's pipeline for good. One extra,
    // because offersTick runs later in the same tick and takes the first month straight off.
    deadline: rint(2, 4) + 1,
    waitsForWrap: false,   // the contract decides how it waits, and whether they will — see contract.js
  });
  s.lastEvent = `You got "${c.title}". They want you.`;
  addTimeline(s, `Booked ${c.title}.`);
  const offerId = s.offers[s.offers.length - 1].id;
  sendMail(s, { from: 'Casting', subj: `Re: ${c.title} — offer`, tag: 'reply', kind: 'reply', offerId,
    body: `Good news. They would like to offer you ${c.role} on ${c.title} — €${(c.salary || 0).toLocaleString()}${c.perEpisode ? ` for ${c.episodes} episodes` : ''}, ${c.months || 1} month${(c.months || 1) === 1 ? '' : 's'}. They need an answer. The full card is in Messages.`,
    cta: [{ label: 'Open the contract', offer: 'open', reply: 'The paper.' }, { label: 'Pass', offer: 'pass', reply: 'You write back politely. Somebody else will be very happy.' }] });
  showMoment(s, { id: 'booked', kind: 'good', title: 'You got it',
    body: `"${c.title}" is yours. ${c.role}${c.months ? `, ${count(c.months, 'month')} of shooting` : ''}. `
      + 'Somebody in an office made a list and your name was at the top of it, and you will never find out why.' });
  return s;
}

// A day's work: over by the evening, answered in the room, kept under Other work. A guest
// spot on a series is a month or less too, but it is television — it airs, it has a season,
// it goes in the filmography — so it takes the long road like everything else that shoots.
export function dayWork(c) { return (c.months || 1) < 2 && !c.perEpisode; }
// quality (0-100) comes from the audition minigame: nail the read and your odds jump,
// fumble it and the room cools on you.
export function auditionFor(s, id, quality = 50) {
  const c = (s.castingPool || []).find((x) => x.id === id); if (!c) return s;
  // One real job at a time — you cannot be on two call sheets. But a voice session or a day
  // as an extra is an afternoon, and an actor in the middle of a fourteen-month blockbuster
  // does those on a Saturday. Blocking them meant the longest shoots were also the emptiest
  // months in the game: three Energy and nothing whatsoever to spend it on.
  // A read is a read: you go up for a part while you are on a set — Maxi: "during a shoot I
  // cannot even do a casting; that is not real." If you win it, the part starts alongside when
  // they will allow that (engine/sets.js) and waits for a free set when they will not. Only
  // a day's work is blocked, and only by an exclusive contract.
  if (dayWork(c) && s.production && s.production.exclusive) {
    s.lastEvent = `"${s.production.title}" is exclusive. You signed that — not a day, not a voice session, until you wrap.`;
    return s;
  }
  const fit = canWork(s);
  if (!fit.ok) { s.lastEvent = fit.why; return s; }
  if (reach(s) < (c.minFame || 0)) { s.lastEvent = 'You need more fame before they will see you for this.'; return s; }
  if (!canAfford(s, COST.audition)) { s.lastEvent = tooTired(s, COST.audition); return s; }
  spend(s, COST.audition);
  // The read itself is worth five points either way. It used to be worth twenty-six: land
  // the bar and the part was yours whoever else was in the room.
  const odds = clamp(castingChance(s, c) + Math.max(-5, Math.min(5, (quality - 50) * 0.12)) + prepBonus(c) + (c.boost || 0));
  // Anything with a real schedule does not answer you in the room. You did your read, you
  // went home, and somewhere between one and three months later a phone rings or it does
  // not. This is the whole rhythm of the job, and the game used to skip it: audition, book,
  // shoot, audition, book — 86% of a forty-five-year career was spent on a set.
  if (!dayWork(c)) {
    // The small things answer fast — a short, a guest spot, a festival picture knows by the
    // end of the month. A studio takes its one to three.
    const wait = ['small', 'oneoff', 'episode', 'festival'].includes(c.scale) ? 1 : rint(1, 3);
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
    paid(s, c.salary, `"${c.title}" paid`); markReleased(s); setFame(s, s.fame + rint(1, 3)); s.confidence = clamp(s.confidence + 2);
    typecastAfterDayWork(s, c);
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
export const SHELVES = [['tv', 'TV'], ['film', 'Film'], ['indie', 'Indie'], ['day', 'Day work']];
export const SHELF_BLURB = {
  tv: 'Soaps, series, the prestige seasons. Paid by the episode, renewed by the network, your face every week.',
  film: 'The studio pictures. One shot, one release, the credits that define you — and the studios do not send scripts to strangers.',
  indie: 'Small pictures, horror, the festival films. Where a career starts, where it goes to be taken seriously — and the one door a nobody can walk through, if a jury opens it.',
  day: 'A day\'s work — adverts, covers, a voice session, a run on stage. Fits around any set that is not exclusive.',
};
export const SHELF_EMPTY = {
  tv: 'Nothing on television this month. Live a month and look again.',
  film: 'Nothing from the studios. They send scripts to names — get one, or get an agent who has one.',
  hiding: 'Phone off. Nothing reaches you this month, which was the idea.',
  poison: 'Nothing from the studios this year. Two leads that bombed, and nobody will insure you on a picture until the phrase wears off.',
  indie: 'Nothing small this month. It comes and goes.',
  day: 'No day work this month.',
};
