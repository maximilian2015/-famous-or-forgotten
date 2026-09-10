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
