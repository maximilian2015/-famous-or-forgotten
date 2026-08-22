// The Asker. Once a year the industry decides which of the year's work was any good,
// and it does not consult the box office to do it.
//
// This is the mirror of systems/career/release.js. There, money is what a picture took;
// here, standing is what it was worth. The genre table below is deliberately the inverse
// of the one that sells tickets: horror prints money and never wins, drama wins and never
// sells. That single opposition is what makes choosing a project a decision rather than
// an arithmetic problem.
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
// The same diminishing curve the premieres use. Five nominations at a flat +6 each put a
// thirty-five-year-old on respect 97 with a career still ahead of her.
const headroom = (limit, cur) => Math.max(0.16, 1 - (cur || 0) / limit);

// What the voters like. Compare APPEAL in release.js — it runs the other way.
export const ASKER_GENRE = {
  Drama: 1.40, Crime: 1.15, Romance: 1.05, Musical: 1.00,
  Thriller: 0.95, 'Sci-Fi': 0.80, Comedy: 0.75, Horror: 0.55,
};
// And what they think of the size of the thing. A tentpole has to be extraordinary.
export const ASKER_SCALE = {
  prestige: 1.30, indie: 1.25, small: 1.10, feature: 1.00,
  recurring: 0.85, episode: 0.70, blockbuster: 0.60, oneoff: 0,
};

// Below this nobody is having the conversation about you at all.
export const FLOOR = 70;

export function isTelevision(scale) { return ['prestige', 'recurring', 'episode'].includes(scale); }
export function branchOf(scale) { return isTelevision(scale) ? 'television' : 'film'; }

// How strongly a piece of work argues for itself. Everything downstream — whether it is
// nominated, and whether it wins — is this number pushed around by people.
export function awardStrength(c) {
  const rating = c.rating || 0;
  if (rating < FLOOR) return 0;
  // Steep: the difference between 78 and 92 has to be enormous, or every competent film
  // would be in contention and a nomination would mean nothing.
  const base = Math.pow((rating - FLOOR) / 30, 1.8) * 100;
  const genre = ASKER_GENRE[c.genre] ?? 1;
  const scale = ASKER_SCALE[c.scale] ?? 1;
  const prestige = 0.7 + (c.prestigeScore || 50) / 160;
  return base * genre * scale * prestige;
}

// Lead and supporting are judged apart, so a small part in a great film is a real route in.
export const CATEGORIES = [
  { id: 'lead', label: 'Leading Performance', tiers: ['lead', 'tentpole'] },
  { id: 'supporting', label: 'Supporting Performance', tiers: ['supporting'] },
  { id: 'picture', label: 'Best Picture', tiers: ['lead', 'tentpole', 'supporting'] },
];
// Only in the first years — it is the one award you can never win twice.
export const BREAKTHROUGH = { id: 'breakthrough', label: 'Breakthrough of the Year' };

const RIVAL_FIRST = ['Mara', 'Idris', 'Juno', 'Kaspar', 'Lena', 'Osric', 'Thea', 'Bo', 'Nils', 'Ada',
  'Rafa', 'Sunny', 'Cato', 'Wren', 'Emeric', 'Petra', 'Hal', 'Marisol'];
const RIVAL_LAST = ['Vance', 'Okonjo', 'Brandt', 'Lindqvist', 'Moreau', 'Sato', 'Delacroix', 'Byrne',
  'Halloran', 'Ferreira', 'Novak', 'Castellan', 'Ashworth', 'Rune'];
const RIVAL_TITLE_A = ['The Quiet', 'A Fine', 'The Last', 'Small', 'The Weight of', 'Northern',
  'The Patient', 'Bitter', 'The Longest', 'Fair'];
const RIVAL_TITLE_B = ['Hours', 'Country', 'Winter', 'Mercies', 'Water', 'Light', 'Animals',
  'Distances', 'Weather', 'Kingdom'];

// The rest of the field is the best work anybody else made that year — it does not care
// how good yours was. Scaling rivals off the player's own strength was a mistake: it made
// a flawless 10.0 drama and a marginal 7.8 thriller both come out around twelve per cent,
// so quality bought nothing on the night. Drawn absolutely, a great film really is the
// favourite and a lucky nomination really is an outsider.
// Calibrated against the real thing: Meryl Streep has three from twenty-one, so a strong
// nomination should convert around one time in six or seven, and even a masterpiece is
// only ever a one-in-four favourite. Nobody walks into that room certain.
const FIELD = [50, 305];
function makeRival(strength, taken) {
  // The rival's film must not be the player's film. "The Weight of" + "Water" really did
  // come out as the title the player was nominated for, and the ceremony then announced
  // somebody else winning for your own picture.
  let work = '';
  for (let i = 0; i < 40; i++) {
    work = `${pick(RIVAL_TITLE_A)} ${pick(RIVAL_TITLE_B)}`;
    if (!taken || !taken.has(work)) break;
  }
  if (taken) taken.add(work);
  return {
    id: 'riv' + Math.random().toString(36).slice(2, 8),
    name: `${pick(RIVAL_FIRST)} ${pick(RIVAL_LAST)}`,
    work,
    strength: FIELD[0] + Math.random() * (FIELD[1] - FIELD[0]),
    losses: rint(0, 3),      // everyone in that room has their own history of not winning
    them: true,
  };
}

// ── the weight that decides the night ─────────────────────────────────────────
// Not "highest score wins" — that would make the ceremony a formality and turn the whole
// game into rating arithmetic. Not a coin toss either. A weighted draw, with the reasons
// visible to the player before it happens.
export function campaignFactor(spentShare) { return 1 + Math.min(0.55, (spentShare || 0) * 0.55); }
export function standingFactor(respect) { return 0.75 + clamp(respect, 0, 100) / 200; }
// The room eventually decides it is somebody's turn. This is why losing four times is
// worth something rather than nothing.
export function overdueFactor(losses) { return 1 + Math.min(0.45, (losses || 0) * 0.11); }

export function weightOf(n) {
  return Math.max(0.5, (n.strength || 0)
    * campaignFactor(n.campaign)
    * standingFactor(n.respect ?? 50)
    * overdueFactor(n.losses)
    * (0.75 + Math.random() * 0.60));
}

// How it is put to the player. A percentage is something you can do arithmetic against,
// and that is exactly what ruins the night — nobody sitting in that room knows a number.
// They know whether people have been saying their name. So the odds stay internal and
// the player gets the sentence instead.
export function buzzOf(pct) {
  if (pct >= 42) return 'Everyone says it is yours';
  if (pct >= 30) return 'They are calling you the favourite';
  if (pct >= 20) return 'You are in the conversation';
  if (pct >= 12) return 'Nobody is betting on you';
  return 'Just being there is the prize, they say';
}

// Odds are computed WITHOUT the luck term so the read is stable, then the draw applies
// luck on the night. A favourite really does lose most of the time.
export function oddsFor(nominees) {
  const raw = nominees.map((n) => Math.max(0.5, (n.strength || 0)
    * campaignFactor(n.campaign) * standingFactor(n.respect ?? 50) * overdueFactor(n.losses)));
  const total = raw.reduce((a, b) => a + b, 0) || 1;
  return raw.map((r) => Math.round((r / total) * 100));
}

export function pickWinner(nominees) {
  const weights = nominees.map(weightOf);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < nominees.length; i++) { if ((r -= weights[i]) <= 0) return nominees[i]; }
  return nominees[nominees.length - 1];
}

// ── the season ────────────────────────────────────────────────────────────────
// The Asker is held every other year, and it judges both of them. Annually it came
// round too often to mean anything — a specialist could collect five statuettes and
// sixteen nomination nights in a thirty-year career. Held biennially over a two-year
// field, a win is rare enough to be the thing it is supposed to be, and two of your own
// films land in the same race more often, which is when the vote splits.
export const EVERY = 2;
export function isSeasonYear(year) { return year % EVERY === 0; }
export function eligibleWork(s, year) {
  const from = year - (EVERY - 1);
  return [...(s.filmography || []), ...(s.discography || [])]
    .filter((c) => c.year >= from && c.year <= year && !c.minor && (c.rating || 0) >= FLOOR);
}

function categoryFor(c) {
  return (c.tier === 'supporting' || c.role === 'Supporting' || /Guest|Episode|Background/.test(c.role || ''))
    ? 'supporting' : 'lead';
}

// Called once a year. Decides what, if anything, you are up for.
export function runNominations(s) {
  if (!isSeasonYear(s.year || 0)) return null;
  const year = (s.year || 0) - 1;         // the season judges the two years just gone
  const work = eligibleWork(s, year);
  s.awards = s.awards || { losses: 0, wins: [], nominations: [], pending: null, history: [] };
  if (!work.length) return null;

  const noms = [];
  for (const c of work) {
    const strength = awardStrength(c);
    if (strength <= 0) continue;
    // Getting into the five is itself a contest against everything else made that year.
    if (chance(clamp(strength * 0.72, 0, 88))) {
      noms.push({ credit: c, category: categoryFor(c), branch: branchOf(c.scale), strength });
    }
    // The film itself can be up for the night's biggest award whether or not you are.
    // It is harder to get into and it is not really about you — but it is the one that
    // makes a good year feel like a good year.
    if (chance(clamp(strength * 0.42, 0, 70))) {
      noms.push({ credit: c, category: 'picture', branch: branchOf(c.scale), strength: strength * 0.9 });
    }
  }
  if (!noms.length) return null;

  // Two of your own in one category split the room. The classic good-year trap.
  const perCat = {};
  for (const n of noms) perCat[n.category] = (perCat[n.category] || 0) + 1;
  for (const n of noms) if (perCat[n.category] > 1) n.strength *= 0.72;

  const pending = noms.map((n) => {
    const you = { id: 'you', name: s.name || 'You', work: n.credit.title, strength: n.strength,
      respect: s.respect || 50, losses: s.awards.losses || 0, campaign: n.credit.campaignShare || 0, them: false };
    const taken = new Set([n.credit.title, ...work.map((c) => c.title)]);
    const field = [you];
    while (field.length < 5) field.push(makeRival(n.strength, taken));
    const odds = oddsFor(field);
    return { category: n.category, branch: n.branch, title: n.credit.title, creditYear: n.credit.year,
      field, odds, yourOdds: odds[0], due: (s.year || 0) * 12 + (s.month || 0) + rint(2, 4) };
  });

  s.awards.pending = pending;
  s.awards.nominations = (s.awards.nominations || []).concat(pending.map((p) => ({ title: p.title, category: p.category, year })));
  // A nomination is a title you keep. It moves what you can ask for, immediately.
  s.quote = Math.round((s.quote || 0) * 1.25) || s.quote;
  s.respect = clamp((s.respect || 0) + 6 * headroom(112, s.respect));
  s.fame = clamp((s.fame || 0) + 3 * headroom(118, s.fame));
  const labels = pending.map((p) => CATEGORIES.find((c) => c.id === p.category)?.label || p.category);
  addTimeline(s, `Asker nominations: ${labels.join(', ')} for "${pending[0].title}".`);
  s.bigMoment = {
    id: 'nomination', kind: 'good', title: 'Asker nominations',
    work: pending[0].title, count: pending.length,
    lines: pending.map((p) => `${CATEGORIES.find((c) => c.id === p.category)?.label} — "${p.title}"\n${buzzOf(p.yourOdds)}`),
    body: pending.length > 1
      ? `${pending.length} nominations. The phone has not stopped since six this morning.`
      : `Nominated for ${labels[0]}. Whatever else happens now, that stays after your name.`,
  };
  return pending;
}

// Runs monthly. The ceremony lands a couple of months after the nominations.
export function ceremonyTick(s) {
  const a = s.awards;
  if (!a || !a.pending || !a.pending.length) return s;
  const now = (s.year || 0) * 12 + (s.month || 0);
  if (a.pending[0].due > now) return s;

  const results = [];
  for (const p of a.pending) {
    const winner = pickWinner(p.field);
    results.push({ category: p.category, title: p.title, won: !winner.them, winner: winner.name, work: winner.work, odds: p.yourOdds });
  }
  a.pending = null;

  // Best Picture belongs to the producers. Being in it is a fine night and it is worth
  // something, but it is not your statuette and it never goes on your shelf — counting
  // it as one was handing out four and five Askers a lifetime when real careers top out
  // at one to three.
  const acting = results.filter((r) => r.won && r.category !== 'picture');
  const picture = results.filter((r) => r.won && r.category === 'picture');
  const won = acting;
  for (const r of picture) {
    const c = [...(s.filmography || []), ...(s.discography || [])].find((x) => x.title === r.title);
    if (c) c.bestPicture = true;
    s.respect = clamp((s.respect || 0) + 6 * headroom(112, s.respect));
    s.fame = clamp((s.fame || 0) + 4 * headroom(118, s.fame));
    addTimeline(s, `"${r.title}" won Best Picture. You were in it, and everybody knows.`);
  }
  if (won.length) {
    a.wins = (a.wins || []).concat(won.map((r) => ({ title: r.title, category: r.category, year: s.year })));
    a.losses = 0;
    // Marked in the filmography for good.
    for (const r of won) {
      const c = [...(s.filmography || []), ...(s.discography || [])].find((x) => x.title === r.title);
      if (c) c.asker = (c.asker || 0) + 1;
    }
    // An Asker really does make you famous overnight — that is most of what it is for.
    // The first version of this gave +8 and called it "not about tickets", which was
    // wrong: winning one moves you into the room where the A-list is, whatever your
    // box office says. So it lifts you toward the top of Star even from nowhere.
    s.quote = Math.round((s.quote || 0) * 1.85) || s.quote;
    s.respect = clamp((s.respect || 0) + 15);
    s.fame = clamp(Math.max((s.fame || 0) + 18, Math.min(70, (s.fame || 0) + 34)));
    s.peakFame = Math.max(s.peakFame || 0, s.fame);
    addTimeline(s, `🏆 Won the Asker for ${won.map((r) => CATEGORIES.find((c) => c.id === r.category)?.label).join(' and ')}.`);
  } else if (!picture.length) {
    a.losses = (a.losses || 0) + 1;
    addTimeline(s, `Went to the Askers and came home empty-handed. ${results[0].winner} took it.`, true);
  }
  a.history = (a.history || []).concat(results.map((r) => ({ ...r, year: s.year })));

  const first = results[0];
  const anyGood = won.length || picture.length;
  s.bigMoment = {
    id: 'ceremony', kind: anyGood ? 'good' : 'bad',
    title: won.length ? 'You won' : picture.length ? 'Best Picture' : first.winner,
    work: won.length ? won[0].title : picture.length ? picture[0].title : first.work,
    category: CATEGORIES.find((c) => c.id === first.category)?.label || '',
    odds: first.odds, losses: a.losses,
    lines: results.map((r) => `${CATEGORIES.find((c) => c.id === r.category)?.label} — ${r.won ? 'YOU' : r.winner}`),
    body: won.length
      ? (won.length > 1
        ? `Twice in one night. You are going to be introduced differently for the rest of your life.`
        : `They read your name. The walk to the stage is longer than it looks on television.`)
      : picture.length
      ? `"${picture[0].title}" took Best Picture. The producers went up; you stood and clapped from the second row, and every photograph of that stage has you in it.`
      : a.losses >= 4
        ? `Again. ${first.winner} for "${first.work}". You have now sat through this ${a.losses} times, and people have started counting out loud.`
        : `${first.winner} for "${first.work}". You clapped. The camera was on you the whole time.`,
  };
  s.lastEvent = won.length ? `You won the Asker for "${won[0].title}".` : `${first.winner} won. You did not.`;
  return s;
}

// The doors an Asker opens. Read by the casting board — standing can substitute for fame,
// which is the only route into prestige work that does not run through blockbusters.
export function askerStanding(s) {
  const wins = (s.awards?.wins || []).length;
  const noms = (s.awards?.nominations || []).length;
  return wins * 22 + Math.min(18, noms * 5);
}
