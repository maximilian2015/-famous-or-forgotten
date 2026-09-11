import { inCareer } from '../../engine/stage.js';
import { an } from '../../engine/text.js';
import { addTimeline } from '../../engine/timeline.js';
import { HOUSING, HOUSING_ORDER } from '../../engine/economy.js';
export const FAME_TIERS = [
  { id: 'unknown', label: 'Unknown', min: 0, housingMax: 'studio' },
  { id: 'rising', label: 'Rising Star', min: 15, housingMax: 'studio' },
  { id: 'known', label: 'Known Face', min: 35, housingMax: 'flat' },
  { id: 'star', label: 'Star', min: 55, housingMax: 'house' },
  { id: 'alist', label: 'A-lister', min: 75, housingMax: 'penthouse' },
  { id: 'icon', label: 'Icon', min: 90, housingMax: 'penthouse' },
];
export function fameTier(fame) {
  let cur = FAME_TIERS[0];
  for (const t of FAME_TIERS) if ((fame || 0) >= t.min) cur = t;
  return cur;
}

// The other half of the title. Fame cannot go below zero — you cannot be less known than
// not known — but a name that WAS known and is not any more is not the same thing as a
// newcomer, and the game was showing them the same rung: a fallen star at 10 read
// "Unknown · 5 to Rising Star" exactly like somebody who had never done anything.
//
// Forgotten is a state, entered by falling: you were at least a Known Face once and you
// are under fifteen now. It sits below Unknown on the ladder, the tube fills downward by
// how far you fell, and it does two real things — see castings.js boardSize and
// release.js closeRun.
export const FORGOTTEN = { id: 'forgotten', label: 'Forgotten', min: -1, note: 'the other half of the title' };
export function isForgotten(s) { return (s.peakFame || 0) >= 35 && (s.fame || 0) < 15; }
// How far down, as a fraction of the height you had. An Icon at 8 is more forgotten than
// a Known Face at 8, and it should look it.
export function forgottenDepth(s) {
  if (!isForgotten(s)) return 0;
  return Math.min(1, Math.max(0, ((s.peakFame || 0) - (s.fame || 0)) / Math.max(1, s.peakFame || 1)));
}
export const FORGOTTEN_OPENS = [
  'Nobody sends a script to the answer to a trivia question — the board is thinner than a newcomer’s',
  'But a comeback is a story, and the trades love a story: the first thing you land that reviews well is worth far more than it would be to anyone else',
];

// What each rung actually opens. Every line here is a real gate somewhere else in the
// game — the minFame column in the casting pools, the housing ceiling above, the tiers in
// generateOffer, computeAccess. Kept by hand rather than derived, because deriving it
// would mean status.js importing castings.js, which imports status.js. If a gate moves in
// systems/career/castings.js, it has to move here too.
export const TIER_OPENS = {
  unknown: [
    'Extras, student films and commercials',
    'Indie supporting parts',
    'A room, or a studio flat if you can pay for it',
  ],
  rising: [
    'Carrying an indie film',
    'Somebody will cook and train for you',
  ],
  known: [
    'Series regular on a network drama',
    'Carrying a feature film',
    'A talk show sofa, and a magazine cover at 40',
    'An agent starts bringing you things at 40 — and they are Lead parts now',
    'A two-bed flat, and a personal assistant',
  ],
  star: [
    'Season lead on a prestige series',
    'Presenting at an awards show',
    'A canal house — an extra Energy every month',
  ],
  alist: [
    'Studio blockbusters, once the tentpoles are open to you',
    'The face of a fashion house',
    'A penthouse, and a driver',
  ],
  icon: [
    'The top of every fee band in the business',
    'Once you have been here, the world does not un-know you: your name never falls below 75 again',
  ],
};

// One multiplier could not do this job. A rising star is worth €25,000 an episode on a
// network drama and €500,000 for a studio picture — those are different ratios, because
// the rate depends on the MEDIUM as much as on the name. Daytime soap and prestige
// streaming are different businesses that happen to both be television.
//
// Every cell is a BAND, not a price. Two unknowns on the same soap are not paid the
// same, and neither are two icons — what you get inside your band is the negotiation
// you have not had yet. `null` means the door is shut: an unknown is not offered a
// studio feature at any figure, and the listing does not appear at all.
//
// TELEVISION IS PER EPISODE AND FILM IS PER PICTURE, so these bands are NOT comparable
// side by side. They were calibrated backwards from what a whole project should pay,
// against the typical episode count of each format — otherwise a soap season at
// thirty-three episodes out-earned a blockbuster ten to one and film became pointless.
// The more episodes a format runs, the lower its rate per episode has to be.
//
// The ladder is still far steeper at the top than the real industry. That is the point:
// an icon is paid obscenely for anything. But film stays the biggest single prize.
export const QUOTE = {
  tv_daytime:   { unknown: [900, 2500],    rising: [2500, 9000],      known: [9000, 45000],       star: [45000, 200000],      alist: [200000, 550000],      icon: [550000, 900000] },
  tv_network:   { unknown: [1500, 4500],   rising: [4500, 25000],     known: [25000, 130000],     star: [130000, 600000],     alist: [600000, 1800000],     icon: [1800000, 3500000] },
  tv_prestige:  { unknown: null,           rising: [25000, 60000],    known: [60000, 320000],     star: [320000, 1500000],    alist: [1500000, 4000000],    icon: [4000000, 8000000] },
  film_indie:   { unknown: [25000, 60000], rising: [120000, 300000],  known: [300000, 800000],    star: [800000, 2500000],    alist: [2500000, 6000000],    icon: [6000000, 12000000] },
  film_studio:  { unknown: null,           rising: [500000, 1200000], known: [1500000, 4000000],  star: [5000000, 10000000],  alist: [12000000, 20000000],  icon: [20000000, 35000000] },
  film_tentpole:{ unknown: null,           rising: null,              known: [4000000, 8000000],  star: [12000000, 20000000], alist: [25000000, 40000000],  icon: [40000000, 80000000] },
  ad:           { unknown: [4000, 12000],  rising: [25000, 70000],    known: [100000, 400000],    star: [400000, 1500000],    alist: [1500000, 5000000],    icon: [5000000, 15000000] },
  gig:          { unknown: [250, 900],     rising: [900, 3000],       known: [3000, 12000],       star: [12000, 60000],       alist: [60000, 200000],       icon: [200000, 600000] },
};

// A band is quoted against a format's TYPICAL season length. A longer order pays more
// in total but less per episode — the studio is buying in bulk. The exponent keeps it
// from being a pure wash: 33% more episodes is about 11% more money, not 33%.
export function episodeRate(baseRate, typicalEpisodes, actualEpisodes) {
  if (!actualEpisodes || !typicalEpisodes) return baseRate;
  return Math.round(baseRate * Math.pow(typicalEpisodes / actualEpisodes, 0.65));
}
export const MEDIA = Object.keys(QUOTE);

export function quoteBand(s, medium) {
  const row = QUOTE[medium] || QUOTE.gig;
  return row[fameTier(s.fame).id] || null;
}
// What YOU are worth in this medium right now — rolled inside the band, so two jobs
// at the same standing are not the same money. Television returns a per-episode fee;
// film returns the fee for the whole picture. Zero means they would not have you.
export function quoteFor(s, medium) {
  const band = quoteBand(s, medium);
  if (!band) return 0;
  return Math.round(band[0] + Math.random() * (band[1] - band[0]));
}
// True when the medium will not have you at any price yet.
export function shutOutOf(s, medium) { return quoteBand(s, medium) === null; }

// The most anybody at your standing could ever be paid for a picture. Your quote was
// written in five places and clamped in none of them: a smash multiplied it by 1.6, a
// nomination by 1.25 and an Asker by 1.85, each one compounding on the last, so a long
// career ended up quoting ten BILLION euros a film. It is a real number that people read,
// so it has to mean something. Twice the top of what your tier commands, and no further.
export function quoteCeiling(s) {
  const tiers = ['film_tentpole', 'film_studio', 'film_indie'];
  for (const m of tiers) { const b = quoteBand(s, m); if (b) return Math.round(b[1] * 2); }
  return 250000;
}
export function setQuote(s, value) {
  s.quote = Math.min(Math.round(value || 0), quoteCeiling(s));
  return s.quote;
}

// And it comes back down. Every single write to the quote was a Math.max or a multiplier —
// it could only ever rise. So an actor who was an Icon at forty and is a Known Face at
// sixty still asked for ninety million a picture, forever, and negotiate.js uses that
// number as the FLOOR of what they will accept. A wide audit caught the state directly:
// quote €92.8m against a ceiling of €8m.
//
// It falls slowly, because an agent does not re-price a client overnight and neither does
// the industry. Four per cent a month closes a doubling in about eighteen months, which is
// roughly how long it takes for people to stop returning the calls.
export function quoteTick(s) {
  const cap = quoteCeiling(s);
  if (!(s.quote > cap)) { s._quoteSaid = false; return; }
  // Eight per cent of the GAP, not of the number — so it takes about the same three years
  // to come down whether you slipped one tier or four. A flat percentage meant an icon who
  // fell all the way to Known Face was still quoting eight figures a decade later.
  const wasDouble = s.quote > cap * 1.9;
  s.quote = Math.max(cap, Math.round(cap + (s.quote - cap) * 0.92));
  if (wasDouble && s.quote <= cap * 1.9 && !s._quoteSaid) {
    s._quoteSaid = true;
    addTimeline(s, 'Your agent quietly stopped quoting the old number. Nobody was paying it.', true);
  }
}

// ── the last step ─────────────────────────────────────────────────────────────────────
//
// Fame was bought with volume and nothing else. Measured over twenty-five careers played
// by an optimiser: A-lister at a median age of 34, Icon at 38, twenty-five out of
// twenty-five, every one of them finishing between 97 and 100. Make ninety films and Icon
// is not a question of whether, only of when.
//
// Nobody becomes an icon by working a lot. They become one by being in something enormous,
// or by being handed the statuette in front of everybody. So the last stretch of the
// ladder is not something you can grind at all — it is a door, and it opens on an event.
//
// This is a GATE, not a curve: no threshold anywhere downstream moves, because the shape
// of the climb below it is untouched. And it only limits fame going UP — losing it is
// never blocked, or an icon who stopped working could never fade.
// TWO doors, not one, because the bottom half of the ladder and the top half are different
// things. Getting known is ordinary work and must stay ordinary — anybody who turns up for
// twenty years becomes a face people recognise, and making that hard would be a lie. But
// above Star it stops being about how much you did and starts being about what you did.
//
//   Unknown → Star   0–74   work. No door.
//   A-lister         75+    you carried something people loved, or the season noticed you.
//   Icon             90+    the whole world saw one, or they read your name out.
//
// Before this, all three players in the measurement reached A-list: the one who prepared
// every audition at 45, and the one who just pressed the button and averaged 3.2/10 at 39.
// Six years apart, for two completely different careers.
export const ALIST_WALL = 74;
export const ICON_WALL = 89;

// A supporting part in a wonderful film does not make you A-list. Carrying one does.
//
// The test has to be the ROLE, not the tier. `tier` is a money band — an Indie Film Lead is
// tier 'supporting' because that is what indies pay — and carrying a brilliant indie is one
// of the most real ways anybody has ever broken through. Using the tier would have shut
// exactly that door.
export function carried(c) {
  if (!c || c.minor) return false;
  if (c.tier === 'tentpole' || c.tier === 'lead') return true;
  return /lead|headliner|matriarch|regular/i.test(c.role || '');
}
export function alistKey(s) {
  const shelf = [...(s.filmography || []), ...(s.discography || [])];
  if (shelf.some((c) => carried(c) && (c.rating || 0) >= 85)) return 'led';
  if (((s.awards && s.awards.nominations) || []).length > 0) return 'nominated';
  return null;
}
export function iconKey(s) {
  if ((s.worldHits || 0) > 0) return 'hit';
  if (((s.awards && s.awards.wins) || []).length > 0) return 'asker';
  return null;
}
export function fameCeiling(s) {
  if (iconKey(s)) return 100;
  if (alistKey(s)) return ICON_WALL;
  return ALIST_WALL;
}
// What is still in the way, in one line, for the Fame tile. A wall the player cannot see
// is not a design, it is a bug they will report.
//
// Keyed on the ceiling that is actually holding them, not on the first unmet door: an actor
// at 72 who has just carried a hit is nowhere near the Icon wall, and telling them about it
// is noise seventeen points early.
export function ladderBlurb(s) {
  const c = fameCeiling(s);
  if (c === ALIST_WALL) return 'A-list needs a hit you carried, or a nomination';
  if (c === ICON_WALL) return 'Icon needs a world hit or an Asker — not more work';
  return null;
}

// What a bad name is costing you, right now, in the six places that actually read it. Same
// rule as the Mental panel: every number below is computed from the code that runs it, not
// from a plausible story. Scandal moved sixteen things and the player could not see it at
// all — there is no tile for it on the main screen.
export function scandalReport(s) {
  const sc = s.scandal || 0;
  const out = [];
  if (sc <= 0) return out;
  // systems/career/castings.js castingChance
  out.push({ id: 'casting', label: 'In the room', why: `Every audition is ${Math.round(sc * 0.3)} points harder.` });
  // systems/career/offers.js maybeGenerateOffer
  const agent = Math.round((1 - Math.max(0.25, 1 - sc / 90)) * 100);
  if (agent > 0) out.push({ id: 'agent', label: 'What your agent brings', why: `${agent}% fewer calls. People are nervous about the name.` });
  // systems/career/negotiate.js
  if (sc > 25) out.push({ id: 'money', label: 'At the table', why: 'They hold ten points firmer on the money.' });
  // engine/economy.js relevanceDrift
  out.push({ id: 'drift', label: 'Being forgotten', why: `Bad press speeds the slide by ${(sc / 45).toFixed(2)} a month.` });
  // systems/life/children.js
  if (sc > 40) out.push({ id: 'adopt', label: 'An adoption board', why: 'They read the same papers as everyone else.' });
  const relief = (s.staff && s.staff.publicist) ? 2.4 : 1;
  out.push({ id: 'fade', label: 'How fast it goes', why: relief > 1
    ? `${(0.4 * relief).toFixed(1)} a month — your publicist is earning it.`
    : '0.4 a month on its own. A publicist makes that nearly three times faster.' });
  return out;
}

// What standing is worth, in the six places that read it. Respect is moved by twelve
// different things and read by six, and the player was shown a bare number with no tap and
// no explanation anywhere in the game.
//
// The one worth knowing is the first: respect is the BIGGEST single term in whether a
// director shoots your version of the film rather than the one on the page. Fame gets you
// in the room; standing is what makes them listen once you are in it.
export function respectReport(s) {
  const r = s.respect || 0;
  const out = [];
  // systems/career/story.js pushOdds — standing = respect * 0.46 + fame * 0.34
  const inRoom = Math.round(r * 0.46), fameRoom = Math.round((s.fame || 0) * 0.34);
  out.push({ id: 'room', label: 'Whether the director listens',
    why: r < 0
      ? `Taking ${Math.abs(inRoom)} points OFF the odds of shooting your version. Your name is an argument against you in that room, before you have said anything.`
      : `Worth ${inRoom} points on the odds of shooting your version${inRoom > fameRoom ? ` — more than your fame is (${fameRoom})` : ` — your fame is worth ${fameRoom}`}. This is the biggest thing respect does.` });
  // systems/career/negotiate.js
  const neg = Math.round((r - 40) * 0.12 * 10) / 10;
  out.push({ id: 'money', label: 'At the table',
    why: neg >= 0 ? `They are ${neg} points likelier to meet your number.` : `They are ${Math.abs(neg)} points harder to move. Below forty, standing costs you money.` });
  // systems/career/access.js
  out.push({ id: 'elite', label: 'The room above the room',
    why: r >= 60 ? 'Sixty is its own way in, whatever your fame says.' : `At 60 it becomes a way into the elite on its own — ${Math.ceil(60 - r)} to go.` });
  // systems/life/children.js adoptionOdds
  if (r > 60) out.push({ id: 'adopt', label: 'An adoption board', why: 'Eight points in your favour. They read the good pieces too.' });
  // systems/meta/legacy.js
  out.push({ id: 'legacy', label: 'What is written afterwards', why: `${Math.round(r * 1.5)} points on the stone.` });
  return out;
}

// Standing goes BELOW zero, the way closeness does — because a blank name and a bad one
// are not the same thing, and the game was showing them as the same number. Somebody who
// walked off three shoots and made three bad films sat at exactly the 0 a newcomer starts
// on. Every write clamped it there, while origin.js was already handing an heir −40 at
// birth: the intent was there, the floor was not.
//
// −40 is the floor. Below that there is nobody left to have an opinion.
export const RESPECT_FLOOR = -40;
export function setRespect(s, value) {
  s.respect = Math.max(RESPECT_FLOOR, Math.min(100, value || 0));
  return s.respect;
}

// Standing has rungs too, and they are not invented: three of the four above zero are real
// thresholds somewhere else in the game, and the one at the top says it is not.
//   30 — the brand-deal arc opens (systems/life/arcs.js sellOut)
//   40 — the break-even at the table (systems/career/negotiate.js: (respect − 40) × 0.12)
//   60 — its own way into the elite, and an adoption board counts it (access.js, children.js)
// The two below zero are where the number itself starts working against you: at the table,
// in the room, and in what a director says to the next one.
export const RESPECT_TIERS = [
  { id: 'avoided', label: 'Avoided', min: -40 },
  { id: 'careful', label: 'A name people check', min: -15 },
  { id: 'unproven', label: 'Unproven', min: 0 },
  { id: 'reliable', label: 'Reliable', min: 30 },
  { id: 'serious', label: 'Taken seriously', min: 40 },
  { id: 'name', label: 'A name in the room', min: 60 },
  { id: 'spoken', label: 'Spoken of', min: 80 },
];
export function respectTier(r) {
  let cur = RESPECT_TIERS[0];
  for (const t of RESPECT_TIERS) if ((r || 0) >= t.min) cur = t;
  return cur;
}
export const RESPECT_OPENS = {
  avoided: [
    'Crews ask not to be put on your call sheet',
    'At the table you are nearly ten points harder to move than somebody at forty',
    'Your standing is actively COSTING you the argument for your version of the film',
  ],
  careful: [
    'A name people look up before they say yes',
    'The last director you worked with is the reason',
  ],
  unproven: [
    'Nobody has formed an opinion. That is not the same as a good one',
    'At the table you are nearly five points harder to move than somebody at forty',
  ],
  reliable: [
    'Brands start putting your name on a list',
    'Directors take the meeting',
  ],
  serious: [
    'The break-even at the table — every point above forty makes them likelier to meet your number',
    'Your standing starts to weigh more than your fame in whether they shoot your version',
  ],
  name: [
    'Sixty is its own way into the elite, whatever your fame says',
    'An adoption board counts it in your favour',
  ],
  spoken: [
    'No gate here — this is simply what a long run of good work looks like',
    'At eighty, standing alone is worth 37 points on whether the director listens to you',
  ],
};

// Where standing comes from and where it goes. Not a log — the game keeps no history of
// this — but the real list of what moves it, so a player can aim.
export const RESPECT_MOVES = {
  up: [
    { by: '+5', what: 'A film that reviews well', note: 'at 85 and over. +2 from 70.' },
    { by: '+6', what: 'Being nominated', note: 'and +6 again if you win it.' },
    { by: '+15', what: 'Winning an Asker', note: 'on top of the nomination.' },
    { by: '+3', what: 'The director on your last shoot', note: 'if they liked you enough to say so out loud.' },
    { by: '+1', what: 'Arguing for a better version and winning', note: 'every time you talk them round.' },
    { by: '+1', what: 'A conservatory intensive', note: 'the kind of place casting directors have heard of.' },
  ],
  down: [
    { by: '−4', what: 'A film that is genuinely bad', note: 'under 45.' },
    { by: '−3', what: 'The director on your last shoot', note: 'if they have started telling a different story about you.' },
    { by: '−9', what: 'Walking off a shoot', note: '−7 on a series. This is the expensive one.' },
    { by: '−5', what: 'Refusing to finish something', note: 'they held your part open for years.' },
  ],
};
// The only place fame is allowed to go up. It was written in fifteen files and clamped in
// none, which is exactly how the quote ran to ten billion before setQuote existed.
export function setFame(s, value) {
  const v = Math.max(0, Math.min(100, value || 0));
  const cur = s.fame || 0;
  s.fame = v <= cur ? v : Math.min(v, Math.max(cur, fameCeiling(s)));
  return s.fame;
}

// Say it out loud, once each way. A ceiling the player runs into with no explanation is
// the single worst thing a progression system can do — they will assume the game is broken,
// and they will be right to.
export function iconTick(s) {
  if (!inCareer(s)) return;
  const fame = s.fame || 0;

  // ── the A-list door ──
  const aKey = alistKey(s);
  if (!aKey && fame >= ALIST_WALL - 0.5 && !s._alistWallSaid) {
    s._alistWallSaid = true;
    addTimeline(s, 'People know your face and nobody can name the film. You have never carried '
      + 'anything anyone loved, and until you do, this is as far as a working actor gets.');
    if (!s.lastEvent) s.lastEvent = 'You are working constantly and going nowhere. What is missing is one good film with your name above the title.';
  }
  if (aKey && !s._alistDoorSaid) {
    s._alistDoorSaid = true;
    if (s._alistWallSaid) {
      addTimeline(s, aKey === 'led'
        ? 'You carried one and it was good. That is the film people will name when they introduce you now.'
        : 'The season put your name on the list. Everything above you just moved within reach.');
    }
  }

  // ── the Icon door ──
  const key = iconKey(s);
  if (!key && fame >= ICON_WALL - 0.5 && !s._iconWallSaid) {
    s._iconWallSaid = true;
    addTimeline(s, 'You are as known as work alone can make you. The last step is not another credit — '
      + 'it is one enormous picture or a statuette, and neither of those can be scheduled.');
    if (!s.lastEvent) s.lastEvent = 'As far as work alone goes, you are there. The rest is not something you can book.';
  }
  if (key && !s._iconDoorSaid) {
    s._iconDoorSaid = true;
    // Only worth saying if they were actually against it.
    if (s._iconWallSaid) {
      addTimeline(s, key === 'hit'
        ? 'The whole world saw that one. The ceiling you had been sitting under is gone.'
        : 'They read your name out. Whatever was left between you and the very top went with it.');
    }
  }
}
export function setHousing(s, key) {
  if (!HOUSING[key]) return s;
  if (!s.hasApartment) { s.lastEvent = 'You still live with your parents.'; return s; }
  const tier = fameTier(s.fame);
  const allowedIdx = HOUSING_ORDER.indexOf(tier.housingMax);
  const wantIdx = HOUSING_ORDER.indexOf(key);
  if (wantIdx > allowedIdx) { s.lastEvent = `No landlord is handing that to a "${tier.label}". Get bigger first.`; return s; }
  if (s.housing === key) return s;
  const h = HOUSING[key];
  const deposit = Math.round(h.cost * 1.5);
  if ((s.cash || 0) < deposit) { s.lastEvent = `Moving in needs €${deposit.toLocaleString()} up front. You don't have it.`; return s; }
  s.cash -= deposit;
  s.housing = key;
  s.lastEvent = `You moved into ${an(h.label.toLowerCase())} — €${h.cost.toLocaleString()}/month, €${deposit.toLocaleString()} deposit.`;
  return s;
}
