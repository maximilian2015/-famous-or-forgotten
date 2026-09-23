// What you are working toward. Maxi asked for a board of goals on the screen, and the
// ambition chosen at ten made it necessary: a life now has a thing it wanted, and nothing
// in the game said how far off it was or what would move it. Every goal here is read off
// the state — nothing new is stored — and each one carries the single next thing that
// would move it, because a goal with no next step is a scoreboard, not a goal.
//
// Three at a time, most urgent first. A life that is going well shows the climb; a life
// with something wrong shows that instead, because that is what you are working toward now.
import { fameTier, FAME_TIERS, respectTier, RESPECT_TIERS, alistKey, iconKey, isForgotten, fameCeiling } from './status.js';
import { ambitionProgress } from './ambition.js';
import { computeAccess } from '../career/access.js';
import { hasAgent } from '../career/agent.js';
import { liveRisks } from './risk.js';
import { inCareer } from '../../engine/stage.js';

const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const pct = (v) => Math.max(0, Math.min(1, v));

export function goals(s) {
  if (!inCareer(s)) return [];
  const out = [];
  const fame = s.fame || 0, resp = s.respect || 0;
  const now = stamp(s);

  // ── the things that are wrong, which are what you are working toward ──────────
  if (!s.hasApartment || s.homeless) {
    out.push({ id: 'room', urgent: true, label: 'A room of your own', now: null,
      next: 'Any job in your Phone pays for one. Nothing starts until you have an address.' });
  }
  if ((s.poisonUntil || 0) > now) {
    out.push({ id: 'poison', urgent: true, label: 'Off the poison list', now: `${(s.poisonUntil || 0) - now} months left`,
      progress: pct(1 - ((s.poisonUntil || 0) - now) / 12),
      next: 'Nothing but time and a smaller part that works. The studios are not insuring you this year.' });
  }
  if (isForgotten(s)) {
    out.push({ id: 'comeback', urgent: true, label: 'A comeback', now: `you were ${fameTier(s.peakFame).label}`,
      next: 'One film rated 70 and the trades use the word. The board is thinner than a newcomer’s — take what comes.' });
  }
  // A risk about to bite is already on the screen, in its own card with the same words —
  // Maxi had "No month off" twice, one above the other. Worth watching owns the risks; this
  // board owns what you are climbing toward. It only takes a risk when there is nothing else.
  if (inCareer(s) && !hasAgent(s) && fame >= 8) {
    out.push({ id: 'agent', label: 'An agent', now: 'none',
      next: 'They come to you: keep working, keep the standing up, and one of them asks. Everything above Known Face goes through a desk.' });
  }

  // ── the ambition you chose at ten ────────────────────────────────────────────
  const amb = ambitionProgress(s);
  if (amb && !amb.met) {
    out.push({ id: 'ambition', label: amb.label, now: `${Math.round(amb.progress * 100)}% of the way`, progress: amb.progress,
      next: { star: 'Tentpoles. A lead on a picture that opens big, and then another.',
        serious: 'Prestige and festival work, and a film rated eighty. The Askers read the lists, not the grosses.',
        tv: 'Seasons. A show that comes back, and then comes back again.',
        face: 'Be seen: the covers, the campaigns, a night that goes everywhere.',
        working: 'Work every year and stay out of debt. That is the whole ambition, and most people miss it.' }[amb.id] });
  }

  // ── the climb ────────────────────────────────────────────────────────────────
  const tier = fameTier(fame);
  const nextTier = FAME_TIERS[FAME_TIERS.indexOf(tier) + 1];
  if (nextTier && !isForgotten(s)) {
    const ceil = fameCeiling(s);
    const walled = ceil < nextTier.min;
    out.push({ id: 'fame', label: nextTier.label, now: `${Math.round(nextTier.min - fame)} to go`,
      progress: pct((fame - tier.min) / Math.max(1, nextTier.min - tier.min)),
      next: walled
        ? (nextTier.id === 'alist' ? 'The wall, not the number: A-list needs a hit you carried or an Asker nomination.' : 'The wall, not the number: Icon needs a world hit or an Asker, and a chair at the very top to be free.')
        : nextTier.id === 'alist' && !alistKey(s) ? 'Fame alone will not do it — carry a film to a rating of 85, or get nominated.'
        : nextTier.id === 'icon' && !iconKey(s) ? 'Fame alone will not do it — a world hit, or an Asker on the shelf.'
        : 'Work that opens. The bigger the picture and the better it is received, the faster.' });
  }
  // ── the tentpoles. Above the climb, because being shut out of the biggest pictures
  // matters more than the next rung of standing — and it was always fourth of three,
  // which meant it was never shown at all.
  const acc = computeAccess(s);
  if (!acc.aaa && fame >= 25) {
    out.push({ id: 'aaa', label: 'The tentpoles', now: 'closed',
      next: 'Two ways in: land a hit rated 85, or get genuinely close to somebody powerful — an agent’s desk will not do it.' });
  }
  // ── standing, when it is the thing in the way ────────────────────────────────
  const rt = respectTier(resp);
  const nextR = RESPECT_TIERS[RESPECT_TIERS.indexOf(rt) + 1];
  if (nextR && resp < 60) {
    out.push({ id: 'respect', label: nextR.label, now: `standing ${Math.round(resp)} of ${nextR.min}`,
      progress: pct((resp - rt.min) / Math.max(1, nextR.min - rt.min)),
      next: resp < 0 ? 'Finish what you start and end a set warm. Standing below zero is the room hearing about you first.'
        : nextR.min >= 40 ? 'Good reviews, not big openings — and a second set at once needs 25, a third 50.'
        : 'Turn up prepared, finish the shoot, and let the director have a good word for the next one.' });
  }
  const urgent = out.filter((g) => g.urgent), rest = out.filter((g) => !g.urgent);
  const board = [...urgent, ...rest];
  // Nothing to climb toward at all — then the thing biting is the thing you are working on.
  if (!board.length) {
    const hot = liveRisks(s).filter((r) => r.level === 2)[0];
    if (hot) board.push({ id: 'risk:' + hot.id, urgent: true, label: hot.label, now: 'about to bite', next: hot.fix });
  }
  return board.slice(0, 3);
}
