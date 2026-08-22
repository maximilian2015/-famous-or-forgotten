// Not every project that starts gets made. Financing walks, a studio changes its mind,
// a producer turns out not to have the money he said he had. The player has to be able
// to SEE that before signing, and be paid for taking it on.
//
// Two ways a project can stop, and they are not the same thing:
//   · frozen   — the crew goes home, the project sits. Months or years later it either
//                finds money and comes back, or it is quietly declared dead.
//   · collapsed — it is over on the day. Nothing comes back.
//
// The trade is the whole point. A studio tentpole is iron and pays the band. An indie
// with money nobody can name is shaky, pays a premium, carries better material — and
// swings wildly at the wrap, which is how an indie becomes the film of the year.
import { rint, chance } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

// How solid the money is, by what kind of thing it is. A studio does not lose its own
// blockbuster; a first-time producer loses everything.
const BACKING = {
  oneoff:      [88, 98],   // it is one day. Nothing has time to fall apart.
  blockbuster: [88, 97],
  feature:     [76, 92],
  recurring:   [74, 90],   // a network order is an order
  prestige:    [66, 86],
  episode:     [72, 90],
  small:       [40, 78],
  indie:       [32, 74],   // the shakiest money in the business
};
export function rollStability(scale) {
  const span = BACKING[scale] || [65, 88];
  return rint(span[0], span[1]);
}

// What the player is told before signing. Four bands, and each one says the true thing
// rather than a number pretending to be a personality.
const BANDS = [
  { min: 88, id: 'locked', label: 'Locked', note: 'The money is in the bank. This is happening.' },
  { min: 74, id: 'solid', label: 'Solid', note: 'Properly financed. Things go wrong on set, not in the accounts.' },
  { min: 55, id: 'shaky', label: 'Shaky', note: 'Financed, mostly. One backer walking would be felt.' },
  { min: 0, id: 'fragile', label: 'No real money', note: 'Nobody can name where the money is coming from.' },
];
export function stabilityBand(v) {
  for (const b of BANDS) if ((v || 0) >= b.min) return b;
  return BANDS[BANDS.length - 1];
}

// A shaky project does NOT pay more. It has no money — that is why it is shaky. This
// was backwards to begin with: paying a risk premium is what bonds do, not films. The
// producer who cannot say where the money is coming from pays you half of scale, and
// what you get instead is the part.
// Full rate once the money is properly there — Solid should not feel like a discount.
// Below that it falls away fast, to half at the very bottom.
export function feeFactor(stability) {
  return 0.5 + 0.5 * Math.min(1, Math.max(0, ((stability ?? 88) - 32) / 46));
}
// The part itself. This is the only currency a broke production has, and it has to be
// worth crossing the room for.
export function riskPrestige(stability) {
  return Math.round(Math.max(0, 88 - (stability ?? 88)) * 0.45);
}
// No money also means no days, no reshoots, no post. The finished thing is rougher.
export function roughness(stability) {
  return Math.max(0, 88 - (stability ?? 88)) * 0.045;
}
// The swing at the wrap. Locked money gives you exactly what you earned; shaky money
// throws a die on top of it, in both directions. The mean does not move — the width does.
export function volatility(stability) {
  return Math.round(Math.max(0, 92 - (stability || 92)) * 0.34);
}
export function volatileSwing(stability) {
  const v = volatility(stability);
  return v ? rint(-v, v) : 0;
}

// What the risk actually costs YOU, which is not the same thing as how risky it is.
// A nobody with an empty year is gambling months nobody else wanted. A star who takes a
// shaky project turned down a solid one to do it, and that is what makes it a decision.
export function riskCostFor(s, stability) {
  const b = stabilityBand(stability);
  // Solid money is not a gamble. Only say this where there is something to weigh.
  if (b.id === 'locked' || b.id === 'solid') return { id: 'none', line: '' };
  const fame = s.fame || 0;
  if (fame < 20) return { id: 'nothing', line: 'Nothing else is waiting. The only thing you are risking is months you had no other plan for.' };
  if (fame < 55) return { id: 'some', line: 'You have other things you could be doing with those months.' };
  return { id: 'real', line: 'At your level this is a real gamble — you will be turning down work that would definitely get made.' };
}

// ── while you are shooting ────────────────────────────────────────────────────
// A month's chance that something goes wrong with the money. Spread across the whole
// shoot, so a fourteen-month blockbuster is not fourteen times as likely to die as a
// one-month job of the same standing.
export function troubleOdds(p) {
  const risk = Math.max(0, 92 - (p.stability || 92)) / 92;
  return Math.min(9, risk * risk * 16);
}

// When it goes wrong, freezing is the commoner outcome — a producer would much rather
// say "we are pausing" than admit the thing is dead.
export function productionTrouble(s, p) {
  if (!chance(troubleOdds(p))) return null;
  return chance(65) ? freezeProject(s, p) : collapseProject(s, p);
}

const FROZEN_REASONS = [
  'the lead financier pulled out three days ago',
  'the completion bond was never actually signed',
  'the money was coming from a fund that has stopped returning calls',
  'the studio has put everything of this size on hold',
  'a producer has been arrested and the accounts are sealed',
];
const DEAD_REASONS = [
  'the financing was never real and everyone has now admitted it',
  'the studio wrote it off as a tax loss this morning',
  'the rights reverted and the new owner does not want it made',
  'the director walked and took the money with him',
];

export function freezeProject(s, p) {
  const why = FROZEN_REASONS[rint(0, FROZEN_REASONS.length - 1)];
  const frozen = {
    id: 'frz' + Date.now() + Math.floor(Math.random() * 1000),
    title: p.title, role: p.role, type: p.type, genre: p.genre, scale: p.scale, tier: p.tier,
    genrePrestige: p.prestigeScore, prestigeScore: p.prestigeScore,
    monthsLeft: Math.max(1, p.monthsLeft || 1), episodes: p.episodes || 0, episodeFee: p.episodeFee || 0,
    season: p.season || 0, part: p.part || 1, optioned: !!p.optioned, optionParts: p.optionParts || 0,
    stability: p.stability, since: (s.year || 0) * 12 + (s.month || 0),
    // How long they will hold it for you, decided by who you were when it stopped.
    patience: patienceFor(s.fame || 0),
    // Whatever is left of the fee, which is what you would be paid if it ever restarts.
    owed: Math.max(0, (p.salary || 0) - (p.paid || 0)),
    paid: p.paid || 0, salary: p.salary || 0, why,
  };
  (s.frozen = s.frozen || []).push(frozen);
  s.production = null;
  s.lastEvent = `"${frozen.title}" has stopped. They say ${why}. Everyone was sent home with no date to come back.`;
  addTimeline(s, `"${frozen.title}" went into freeze — ${why}.`, true);
  s.mental = Math.max(0, (s.mental || 50) - 6);
  s.bigMoment = {
    id: 'shutdown', kind: 'bad', frozen: true, title: frozen.title,
    reason: why, months: frozen.monthsLeft, paid: frozen.paid,
    body: `The crew was sent home this morning — ${why}. It is not cancelled. It is not happening either. `
      + (frozen.paid > 0
        ? `You keep the €${Math.round(frozen.paid).toLocaleString()} you were paid, and the rest waits for money that may never come.`
        : 'You had not been paid a cent yet. All of it waits for money that may never come.'),
  };
  return frozen;
}

export function collapseProject(s, p) {
  const why = DEAD_REASONS[rint(0, DEAD_REASONS.length - 1)];
  const paid = p.paid || 0;
  const months = (p.months || 1) - (p.monthsLeft || 0);
  s.production = null;
  s.lastEvent = `"${p.title}" is dead — ${why}. ${months} month${months === 1 ? '' : 's'} of your life, and no film at the end of it.`;
  addTimeline(s, `"${p.title}" collapsed — ${why}.`, true);
  s.mental = Math.max(0, (s.mental || 50) - 9);
  s.bigMoment = {
    id: 'shutdown', kind: 'bad', frozen: false, title: p.title,
    reason: why, months, paid,
    body: `It is over — ${why}. `
      + (paid > 0 ? `You keep the €${Math.round(paid).toLocaleString()} you were paid and nothing else. ` : 'You were never paid a cent. ')
      + `There is no film, so there is no premiere, and nobody outside the crew will ever know you did it.`,
  };
  return { title: p.title, why, paid, months };
}

// ── the long wait ─────────────────────────────────────────────────────────────
// A frozen project is not a corpse and not a plan. Every month it might find money,
// and every month the odds of it ever doing so get a little worse.
// `since` can legitimately be 0 (month zero of year zero), so it has to be ?? and not ||.
function waitedBy(frozen, now) { return Math.max(0, now - (frozen.since ?? now)); }

// How long a production will hold a part open for you. A financier will wait years for a
// name and will not wait eighteen months for somebody nobody has heard of — they recast
// and move on. Everyone runs out of patience eventually.
export function patienceFor(fame) {
  return Math.round(14 + Math.min(90, fame || 0) * 0.42);    // 14 months at nobody, ~52 at icon
}
export function thawOdds(frozen, now) {
  const waited = waitedBy(frozen, now);
  if (waited < 2) return 0;                                  // nothing moves for the first couple of months
  if (waited > (frozen.patience ?? 30)) return 0;            // they have recast it by now
  const base = 1.5 + (frozen.stability ?? 50) / 16;          // better projects get rescued
  return Math.max(1.5, base - waited * 0.15);
}
// Nobody formally kills a project for over a year. After that the odds of anyone ever
// finishing it get worse every month — and once the patience window is gone, it is gone.
export function deathOdds(frozen, now) {
  const waited = waitedBy(frozen, now);
  if (waited > (frozen.patience ?? 30)) return 100;
  if (waited < 15) return 0;
  return Math.min(6, (waited - 15) * 0.18);
}

export function frozenTick(s) {
  if (!(s.frozen || []).length) return s;
  const now = (s.year || 0) * 12 + (s.month || 0);
  const survivors = [];
  for (const f of s.frozen) {
    if (chance(thawOdds(f, now))) {
      const waited = now - (f.since ?? now);
      const years = Math.round(waited / 12);
      (s.offers = s.offers || []).push({
        id: 'thaw' + Date.now() + Math.floor(Math.random() * 1000),
        kind: 'thaw', projectTitle: f.title, role: f.role, type: f.type, genre: f.genre,
        scale: f.scale, tier: f.tier, prestigeScore: f.prestigeScore,
        salary: f.owed, months: f.monthsLeft, episodes: f.episodes, episodeFee: f.episodeFee,
        season: f.season, part: f.part, optioned: f.optioned, optionParts: f.optionParts,
        // Whoever rescued it has real money, or they could not have rescued it.
        stability: Math.min(95, (f.stability || 50) + rint(12, 26)),
        fame: f.tier === 'tentpole' ? 9 : 5, deadline: rint(2, 3),
        note: waited >= 12
          ? `Somebody found the money. After ${years} year${years === 1 ? '' : 's'} they want to finish it — €${f.owed.toLocaleString()} for the ${f.monthsLeft} month${f.monthsLeft === 1 ? '' : 's'} still owed.`
          : `The money came back. They want to finish it — €${f.owed.toLocaleString()} for the ${f.monthsLeft} month${f.monthsLeft === 1 ? '' : 's'} still owed.`,
      });
      s.lastEvent = `"${f.title}" is alive again. Somebody found the money.`;
      addTimeline(s, `"${f.title}" came out of freeze after ${waited} months.`);
      continue;                                              // it leaves the freezer either way
    }
    if (chance(deathOdds(f, now))) {
      const waited = now - (f.since ?? now);
      const ranOut = waited > (f.patience ?? 30);
      // A film that dies with your name on it costs you something. It costs more when it
      // was you who walked off it, and more again when they held it open and you never
      // came back for it.
      const cost = (f.byYou ? 6 : 3) + (ranOut ? 3 : 0);
      s.respect = clamp((s.respect || 0) - cost);
      if (ranOut) {
        addTimeline(s, `"${f.title}" was recast. They held it open ${Math.round(waited / 12)} year${waited >= 24 ? 's' : ''} and you never went back for it.`, true);
        s.lastEvent = `They recast "${f.title}". It waited as long as anyone was going to wait.`;
      } else {
        addTimeline(s, `"${f.title}" was formally abandoned. It had been frozen ${waited} months.`, true);
        s.lastEvent = `"${f.title}" will never be finished. They have written it off.`;
      }
      continue;
    }
    survivors.push(f);
  }
  s.frozen = survivors;
  return s;
}
