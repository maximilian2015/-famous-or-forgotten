import { uid } from '../../engine/id.js';
// A career is not a list of unrelated jobs. The show that ran six years and the
// franchise you could not get out of are the things a life is remembered for.
//
// Nothing here existed: a series wrapped and vanished, a film never had a sequel.
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { quoteBand } from '../meta/status.js';

// How long a format can plausibly run. Daytime soaps run for decades; prestige
// streaming shows are written to end. This is the ceiling, not the expectation —
// most shows die at the first or second renewal regardless.
// A soap's cap is the show's, not yours: the board now casts you INTO season fourteen of a
// soap that has been on for years (castings.js seasonFor), so the ceiling has to sit well
// above where you can join. Twenty. The fatigue line below is what actually ends them.
export const SEASON_CAP = {
  'Soap Opera': 20,
  'Talent Series': 10,
  'Crime Series': 8,
  'Drama Series': 7,
  'Network Drama': 6,
  'Music Show': 6,
  'Prestige Series': 5,
};
export function seasonCap(type) { return SEASON_CAP[type] || 5; }

// The network decides on the numbers. A flop is gone; a hit is renewed before the
// finale airs. Long-running shows also get tired — each season shaves the odds.
// Television is renewed on the audience, not the reviews. A soap is a habit — it comes
// back unless it is unwatchable, and even then somebody has to decide. Network drama
// lives on its numbers: the middle of the scale is a coin toss and a flop is gone.
// Prestige is renewed on acclaim, which is the one place the reviews are the numbers.
// Maxi: "so few continuations; in life it is different" — measured over six hundred
// lives, six of ten soaps got no second season, because renewal hung on a critics'
// score a soap does not live by.
// What the network expects the slot to draw, in millions. This is the number the decision
// is made against — Maxi: "how is it done in life? ratings, the viewers, the channel
// decides?" Yes: the numbers against the slot, the trend against last season, the cost
// of the cast; the reviews only where the reviews ARE the numbers, which is prestige.
export const SLOT_NORM = { 'Soap Opera': 4, 'Network Drama': 2.6, 'Crime Series': 2.6, 'Drama Series': 2.6, 'Talent Series': 3, 'Music Show': 2, 'Prestige Series': 6 };
export function slotNorm(type) { return SLOT_NORM[type] || 2.6; }
export function renewalOdds(rating, season, type, viewers = null, prevViewers = null) {
  const soap = type === 'Soap Opera', prestige = type === 'Prestige Series';
  let base;
  if (viewers == null) {
    // No numbers to hand (an old save, a direct question): the reviews stand in.
    base = soap ? (rating >= 45 ? 92 : rating >= 30 ? 70 : 40)
      : prestige ? (rating >= 68 ? 92 : rating >= 55 ? 75 : rating >= 45 ? 40 : 12)
      : (rating >= 60 ? 84 : rating >= 50 ? 62 : rating >= 40 ? 36 : 12);
  } else {
    const pull = viewers / slotNorm(type);
    if (soap) base = pull >= 0.6 ? 92 : pull >= 0.4 ? 66 : 30;                     // a habit dies slowly
    else if (prestige) base = (rating >= 68 ? 78 : rating >= 55 ? 58 : rating >= 45 ? 30 : 10) + (pull >= 1.2 ? 14 : pull >= 0.8 ? 6 : pull >= 0.5 ? -8 : -20);
    else base = pull >= 1.3 ? 92 : pull >= 1 ? 80 : pull >= 0.75 ? 56 : pull >= 0.5 ? 30 : 10;   // the slot, and nothing else
    // The trend. Falling numbers make a network nervous; rising ones make it patient.
    if (prevViewers) base += viewers < prevViewers * 0.8 ? -12 : viewers > prevViewers * 1.15 ? 6 : 0;
  }
  const fatigue = Math.max(0, season - 3) * (soap ? 2 : 4);      // long runs tire slowly; a soap barely
  const room = season >= seasonCap(type) ? -100 : 0;            // the format runs out
  return Math.max(0, Math.min(97, base - fatigue + room));
}
// The network's reasons, in one line, for the night the season ends.
export function networkLine(type, viewers, prevViewers, rating, decision) {
  const norm = slotNorm(type);
  const drew = viewers != null ? `You drew ${viewers}m against the ${norm}m the slot wants` : `The slot wants ${norm}m`;
  const trend = prevViewers ? (viewers < prevViewers * 0.8 ? ', down from last season' : viewers > prevViewers * 1.15 ? ', up on last season' : ', about where it was') : '';
  const said = decision === 'renewed' ? 'Renewed.' : decision === 'writtenOut' ? 'Renewed — without you. Your character was written out.' : decision === 'capped' ? 'The format ran its course.' : 'Cancelled.';
  return `${drew}${trend}. ${said}`;
}

// Staying gets you a bump; being in a hit gets you a raise. A slipping show does not
// hand out money — the network knows the numbers as well as you do, and a cast with no
// leverage takes a cut. This is why the same season five can be worth +70% or −10%.
//
// Three parts: the automatic bump for coming back, what the last season actually rated,
// and whether it is climbing or sliding.
export function seasonBase(season) {
  if (season <= 2) return 1.10;
  if (season === 3) return 1.35;       // the season the whole cast renegotiates together
  if (season <= 6) return 1.15;
  return 1.08;
}
export function performanceFactor(rating) {
  if (rating >= 88) return 1.45;
  if (rating >= 78) return 1.25;
  if (rating >= 68) return 1.10;
  if (rating >= 60) return 1.00;
  if (rating >= 50) return 0.92;       // they trim the cast budget
  return 0.85;
}
export function trendFactor(rating, prevRating) {
  if (prevRating == null) return 1;
  if (rating >= prevRating + 5) return 1.12;   // the show is growing and you are why
  if (rating <= prevRating - 5) return 0.94;
  return 1;
}
export function seasonRaise(season, rating = 70, prevRating = null) {
  return seasonBase(season) * performanceFactor(rating) * trendFactor(rating, prevRating);
}
// The name of the show itself, with however many season suffixes have accumulated
// stripped off. Season 3 was being built from the season-2 TITLE, so shows were coming
// out as "Lost Signal · season 2 · season 3" and growing a segment every year.
export function seriesRoot(title) {
  return String(title || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim();
}
// What the season before this one rated, so a trend can exist at all.
function previousViewers(s, root, season) {
  if (season < 2) return null;
  const prev = (s.filmography || []).find((c) => (c.season || (c.job && c.job.season)) === season - 1 && seriesRoot((c.job && c.job.seriesTitle) || c.title) === root);
  return prev && prev.viewers > 0 ? prev.viewers : null;
}
function previousRating(s, title, season) {
  if (!season || season < 2) return null;
  const root = seriesRoot(title);
  const prev = [...(s.filmography || []), ...(s.discography || [])]
    .find((c) => c.season === season - 1 && seriesRoot(c.title) === root);
  return prev ? prev.rating : null;
}

const SEQUEL_WORDS = ['II', 'III', 'IV', 'V', 'VI'];
function sequelTitle(title, n) {
  const clean = String(title).replace(/\s+(II|III|IV|V|VI)$/, '');
  return `${clean} ${SEQUEL_WORDS[n - 2] || n}`;
}

// Films continue when they made money, and a franchise you optioned continues whether
// you want it to or not.
//
// Reviews are the smaller half of this. A studio greenlights a sequel off the opening
// weekend, which is why beloved films die and stupid ones run five parts — the verdict
// can rescue a mediocre picture and can bury a well-reviewed one that nobody bought.
const SEQUEL_MONEY = { smash: 45, profitable: 18, 'broke even': -8, bomb: -55 };
export function sequelOdds(rating, part, obliged, verdict = null) {
  if (obliged) return 100;
  if (part > 4) return 0;
  // MONEY first, and it is not close. A studio greenlights a sequel off what the last one
  // took; the reviews are a rounding error beside that. It is why beloved films die and
  // stupid ones run five parts, and it is the whole reason franchises exist at all.
  //
  // These thresholds used to be written against ratings that averaged 8.8 out of ten. Once
  // films started scoring like films, nothing cleared them and franchises simply stopped
  // happening — thirty-six of sixty got no second part.
  // With no verdict to hand — an old save, or anybody asking the question directly — fall
  // back to the reviews rather than answering "almost never" to everything.
  const base = verdict === 'smash' ? 76 : verdict === 'profitable' ? 44
    : verdict === 'broke even' ? 14 : verdict === 'bomb' ? 2
    : rating >= 92 ? 72 : rating >= 84 ? 52 : rating >= 78 ? 30 : rating >= 70 ? 9 : 0;
  const liked = rating >= 85 ? 10 : rating >= 72 ? 4 : rating >= 55 ? 0 : -10;
  return Math.max(0, Math.min(92, base + liked - (part - 1) * 10));
}
export function sequelRaise(part) { return part === 2 ? 1.6 : part === 3 ? 2.2 : 2.6; }

// ── what a sequel is actually FOR ─────────────────────────────────────────────
// A studio does not make a fourth one because the third was a masterpiece. It makes it
// because the idea still sells tickets, and by then everyone involved is squeezing. The
// game had Creepy Man rating 8.8, 9.7, 8.6, 9.5, 9.0 — five in a row, every one adored,
// every one over a billion, and no explanation for why it ever stopped. Real franchises
// slide: the second is occasionally the better film (Terminator 2 is the reason anybody
// argues about this) and after that it is almost always downhill.
//
// This is the CEILING the next part is written against — the material gets thinner even
// when the money gets bigger.
// A franchise has a CHARACTER, rolled once when the second one is greenlit, and then it
// behaves like that. "Every part is a bit worse than the last" is a formula, not a life —
// some of these hold up for five films and some fall off a cliff after the second, and
// which one you are in is the thing nobody knows at the time.
export const ARCS = {
  holds:      { weight: 26, label: 'holds up',   drift: [-4, 4] },    // Fast & Furious: it just keeps going
  slides:     { weight: 42, label: 'slides',     drift: [-14, -2] },  // the usual story
  collapses:  { weight: 20, label: 'collapses',  drift: [-30, -12] }, // everything after the second one
  climbs:     { weight: 12, label: 'gets better', drift: [1, 10] },   // Terminator 2, and not many others
};
export function rollArc() {
  const keys = Object.keys(ARCS);
  const total = keys.reduce((n, k) => n + ARCS[k].weight, 0);
  let r = Math.random() * total;
  for (const k of keys) { r -= ARCS[k].weight; if (r <= 0) return k; }
  return 'slides';
}
export function sequelMaterial(prevPrestige, part, arc = 'slides') {
  const a = ARCS[arc] || ARCS.slides;
  // Even a franchise that holds up gets tired eventually, and one that is collapsing has
  // further to fall each time. The arc sets the shape; the part number tilts it.
  const tilt = arc === 'holds' ? -(part - 2) * 2 : arc === 'climbs' ? -(part - 2) * 4 : -(part - 2) * 3;
  return Math.max(8, Math.min(96, prevPrestige + rint(a.drift[0], a.drift[1]) + tilt));
}
// And nobody shoots them back to back. Two to five years, sometimes far longer, and the
// gap is why a franchise is a thing that happens ACROSS a career rather than instead of one.
// A smash is fast-tracked; a picture that merely made money waits for a script. Maxi: "in
// life, if it is a good project, they sometimes offer you the sequel — I have not seen it."
// It was there, two to three years out, said once on the timeline; now it is months, and
// on the calendar, and on the credit.
export function sequelGap(part, verdict = null) {
  if (verdict === 'smash') return part === 2 ? rint(8, 16) : rint(12, 22);
  if (verdict === 'profitable') return part === 2 ? rint(12, 24) : rint(16, 30);
  return part === 2 ? rint(18, 36) : rint(24, 48);
}
// What is on its way, for the calendar and the filmography.
export function sequelDue(s, title) {
  const root = String(title || '').replace(/\s+(II|III|IV|V|VI)$/, '');
  const x = (s.laterOffers || []).find((y) => y.offer && String(y.offer.projectTitle || '').replace(/\s+(II|III|IV|V|VI)$/, '') === root);
  return x ? { due: x.due, title: x.offer.projectTitle } : null;
}

// A show does not peak in its last season. It finds itself around two or three, holds, and
// then everybody can feel it going — which is when the network cancels it. Rating 9.4 in
// season seven, immediately followed by the end, was the exact opposite of how this reads.
// Same for a show, and for the same reason: nine seasons of Friends were not nine slow
// declines. A show gets a character too — some hold their whole run, some rot from four on.
export function seasonMaterial(prevPrestige, season, arc = 'slides') {
  if (season <= 3) return Math.min(94, prevPrestige + rint(-2, 8));  // everything finds itself
  const a = ARCS[arc] || ARCS.slides;
  const tilt = arc === 'holds' ? -(season - 4) : -(season - 4) * 2;
  return Math.max(10, Math.min(94, prevPrestige + rint(a.drift[0], a.drift[1]) + tilt));
}

// Anything a franchise offers you arrives LATER, not the month the last one closed.
// And a sequel's paper comes before its cameras. Maxi: "if a sequel is happening, the new
// contract for part two should come six months before, once it is decided — not a yes/no
// button the month they shoot." `due` is the month the cameras roll; the contract arrives
// this many months ahead of it with that date in the schedule, and once signed it waits
// on the calendar for its month like any held part.
export const SEQUEL_LEAD = 6;
export function laterOffersTick(s) {
  const now = (s.year || 0) * 12 + (s.month || 0);
  const lead = (x) => (x.offer && x.offer.kind === 'sequel' ? SEQUEL_LEAD : 0);
  const due = (s.laterOffers || []).filter((x) => x.due - lead(x) <= now);
  if (!due.length) return s;
  s.laterOffers = (s.laterOffers || []).filter((x) => x.due - lead(x) > now);
  for (const x of due) {
    const ahead = Math.max(0, x.due - now);
    const o = { ...x.offer, expires: now + rint(3, 6), via: x.offer.via || 'studio', from: 'the studio', deadline: ahead > 2 ? 3 : (x.offer.deadline || 2) };
    if (ahead > 1) o.startAt = x.due;   // the studio's date, on the paper
    (s.offers = s.offers || []).push(o);
    // A sequel is "they want you back"; a studio that saw you at a festival is something else.
    addTimeline(s, x.line || (ahead > 1 ? `"${o.projectTitle}" is greenlit. The contract is in Messages — cameras in ${ahead} months.` : `They are making "${o.projectTitle}", and they want you back.`));
    s.lastEvent = x.event || (ahead > 1 ? `"${o.projectTitle}" is happening. The studio sent the paper — they shoot in ${ahead} months, and they want it signed well before.` : `"${o.projectTitle}" is happening. They called — the paper is in Messages.`);
  }
  return s;
}

// The ceiling on any of this. Franchise money is real money — a fourth outing pays far more
// than the first — but it is still bounded by what somebody of your standing can command,
// and it was not bounded by anything at all: the raise multiplied the PREVIOUS part's fee,
// so part 4 paid nine times the first, part 8 four hundred times, and part 12 nineteen
// thousand times. A €5m picture became a €95bn one and the player ended a career on a
// billion euros. Every raise is measured against the FIRST part now, and capped here.
// A fourth outing pays a premium over the top of your band. Half again, not triple — the
// top of the icon band is already €80m for a tentpole, and tripling that put a career on
// nine figures a picture.
const FRANCHISE_PREMIUM = 1.5;
function ceilingFor(s, medium, share = 1) {
  const band = quoteBand(s, medium);
  if (!band) return Infinity;
  return Math.round(band[1] * share * FRANCHISE_PREMIUM);
}
function mediumOf(p) {
  if (p.episodes || p.season) return p.scale === 'prestige' ? 'tv_prestige' : 'tv_network';
  return p.tier === 'tentpole' ? 'film_tentpole' : p.scale === 'blockbuster' ? 'film_studio'
    : p.scale === 'feature' ? 'film_studio' : 'film_indie';
}

// Called at the end of every production. Returns an offer to push, or null.
// `force` — a name in the room pushed for it (favours.js): the roll is skipped, the rest is the same.
export function maybeContinue(s, credit, p, force = false) {
  // A guest spot is somebody else's show. Two episodes of a crime series used to come back as
  // YOUR season two, and then three, and then eight — 453 of them in 120 lives.
  if (p.scale === 'episode') return null;
  // Nobody makes a sequel to a festival picture. What it leads to is a different film.
  if (p.scale === 'festival') return null;
  const isSeries = !!p.episodes || !!p.season;
  const season = p.season || 1;
  const part = p.part || 1;

  if (isSeries) {
    // Always build from the name of the SHOW, never from last season's project title.
    const root = seriesRoot(p.seriesTitle || p.title);
    const prevV = previousViewers(s, root, season);
    const odds = renewalOdds(credit.rating, season, p.type, credit.viewers != null ? credit.viewers : null, prevV);
    if (!force && !chance(odds)) {
      credit.renewal = season >= seasonCap(p.type) ? 'capped' : 'cancelled';
      if (season > 1) addTimeline(s, `"${root}" was not renewed after ${season} season${season === 1 ? '' : 's'}.`, true);
      return null;
    }
    // The show goes on; whether you do is a different desk. A character the audience did
    // not take to gets written out of a renewed soap; a lead of a flop season is recast.
    const aud = credit.reviews && credit.reviews.audience != null ? credit.reviews.audience : null;
    const out = !force && ((p.type === 'Soap Opera' && aud != null && aud < 4.5 && chance(30)) || (p.type !== 'Soap Opera' && credit.rating < 40 && chance(35)));
    if (out) {
      credit.renewal = 'writtenOut';
      addTimeline(s, `"${root}" was renewed — without you. Your character was written out.`, true);
      return null;
    }
    credit.renewal = 'renewed';
    const nextSeason = season + 1;
    // Rolled once, when the show first comes back, and it is what the show IS from then on.
    const arc = p.arc || rollArc();
    const raise = seasonRaise(nextSeason, credit.rating, previousRating(s, root, season));
    const pct = Math.round((raise - 1) * 100);
    // Television does compound season on season, and it still cannot outrun what somebody
    // of your standing is paid — twelve renewals used to reach numbers with no meaning.
    const wasFee = p.episodeFee || Math.round(p.salary / Math.max(1, p.episodes || 1));
    const episodeFee = Math.min(Math.round(wasFee * raise), ceilingFor(s, mediumOf(p)));
    const episodes = Math.max(4, Math.round((p.episodes || 8) * (0.9 + Math.random() * 0.3)));
    addTimeline(s, `"${root}" was renewed for season ${nextSeason}.`);
    return {
      id: uid(s, 'ren'),
      // A show that got renewed is a show that works. The money is not the question here.
      kind: 'renewal', seriesTitle: root, season: nextSeason, scale: p.scale,
      stability: Math.max(82, p.stability || 82),
      projectTitle: `${root} · season ${nextSeason}`, role: p.role, type: p.type, genre: p.genre,
      episodes, episodeFee, salary: episodeFee * episodes, baseSalary: p.baseSalary || p.salary,
      prestigeScore: seasonMaterial(p.prestigeScore || 50, nextSeason, arc), arc,
      months: Math.max(2, Math.round((p.months || 4) * (0.9 + Math.random() * 0.25))),
      prestigeScore: Math.min(96, (p.prestigeScore || 45) + rint(2, 7)), tier: p.tier || 'lead',
      fame: p.tier === 'tentpole' ? 9 : 5, deadline: rint(2, 3), waitsForWrap: true,   // your own show waits for you
      note: nextSeason === 3 && pct > 0
        ? `Third season — the whole cast renegotiates together and the network knows it. ${pct}% more an episode.`
        : pct > 0 ? `The network wants you back. Same part, ${pct}% more an episode.`
        : pct < 0 ? `The network wants you back — at ${-pct}% less an episode. The numbers were not good.`
        : 'The network wants you back. Same part, same money.',
    };
  }

  const obliged = !!p.optioned && part < (p.optionParts || 3);
  const odds = sequelOdds(credit.rating, part, obliged, credit.verdict);
  if (!force && !chance(odds)) return null;
  const nextPart = part + 1;
  const arc = p.arc || rollArc();
  // Against the first part, never against the last one. See ceilingFor above.
  const first = p.baseSalary || p.salary;
  const raw = obliged ? p.salary : Math.round(first * sequelRaise(nextPart));
  const salary = Math.min(raw, ceilingFor(s, mediumOf(p)));
  // Nobody shoots them back to back. It is announced, and then it is years.
  const gap = sequelGap(nextPart, credit.verdict);
  addTimeline(s, credit.verdict === 'smash' ? `"${p.title}" printed money. A sequel is in development — they want you, and it will not be years.` : `There is talk of a sequel to "${p.title}". These things take time.`);
  s.lastEvent = credit.verdict === 'smash' ? `The studio is developing a sequel to "${p.title}". Cameras in about ${gap} months — the contract comes ${SEQUEL_LEAD} before that.` : s.lastEvent;
  (s.laterOffers = s.laterOffers || []).push({
    due: (s.year || 0) * 12 + (s.month || 0) + gap,
    offer: {
    id: uid(s, 'seq'),
    kind: 'sequel', part: nextPart, optioned: p.optioned, optionParts: p.optionParts, scale: p.scale,
    stability: Math.max(85, p.stability || 85),   // nobody defunds a sequel to something that made money
    projectTitle: sequelTitle(p.title, nextPart), role: p.role, type: p.type, genre: p.genre,
    salary, baseSalary: first, months: Math.max(2, Math.round((p.months || 5) * (0.95 + Math.random() * 0.25))),
    prestigeScore: sequelMaterial(p.prestigeScore || 50, nextPart, arc), arc,
    tier: p.tier || 'lead', fame: p.tier === 'tentpole' ? 9 : 5, deadline: rint(2, 3), waitsForWrap: true,   // and so does your own sequel
    note: obliged
      ? 'You signed for this one. The fee is the fee you agreed to years ago.'
      : credit.verdict === 'smash'
      ? `That one printed money — years ago now. They are paying ${Math.round((sequelRaise(nextPart) - 1) * 100)}% more and they are not haggling.`
      : `The first one made money, and somebody has finally got the script working. ${Math.round((sequelRaise(nextPart) - 1) * 100)}% more this time.`,
    },
  });
  // Nothing lands on the board today. laterOffersTick brings it when it is real.
  return null;
}
