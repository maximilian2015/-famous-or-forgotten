// Around town. Measured on a sensible player's first six years: half the month's energy
// went unspent every month — a lesson, one read, and "live one month". Maxi: "the start
// is press-the-month with half the energy wasted." These are the cheap things an actor
// with an evening and no work actually does: a reading night, the bar where the crews
// drink, a post. Each once a month, each a roll, each capable of nothing at all.
import { COST, canAfford, spend, tooTired } from '../../engine/energy.js';
import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { onCooldown, markUsed } from '../../engine/cooldown.js';
import { makePerson } from './relationships.js';
import { addSentListing } from '../career/castings.js';
import { setFame } from '../meta/status.js';
import { addHype, bumpHype } from '../meta/hype.js';
import { theLens } from '../meta/price.js';
import { skillCap } from '../career/actions.js';
import { inCareer } from '../../engine/stage.js';

const clamp = (v) => Math.max(0, Math.min(100, v));
const priceFactor = (s) => 1 + Math.min(3, (s.fame || 0) / 40);

export const TOWN = [
  { id: 'reading', label: 'An open reading night', blurb: 'A room above a pub, twelve actors, a scene each. Somebody there is always about to be somebody.', ap: 15, cost: 0, minFame: 0, maxFame: 45 },
  { id: 'bar', label: 'The actors’ bar', blurb: 'Where the crews drink after wrap. You hear who is casting what before it is anywhere else.', ap: 15, cost: 60, minFame: 0, maxFame: 70 },
  { id: 'post', label: 'Post something', blurb: 'A photograph, a line, a hundred strangers. It adds up, and one of them is always waiting for you to slip.', ap: 10, cost: 0, minFame: 0, maxFame: 101 },
];
export function townCost(s, id) { const t = TOWN.find((x) => x.id === id); return t ? Math.round(t.cost * priceFactor(s)) : 0; }
export function townOpen(s) { return inCareer(s) && !!s.hasApartment; }
export function townFor(s) {
  return TOWN.filter((t) => (s.fame || 0) >= t.minFame && (s.fame || 0) < t.maxFame).map((t) => {
    const cost = townCost(s, t.id);
    const used = onCooldown(s, 'town:' + t.id);
    const why = used ? 'Already, this month.' : !canAfford(s, t.ap) ? tooTired(s, t.ap) : cost > (s.cash || 0) ? `You need €${cost.toLocaleString()}.` : '';
    return { ...t, cost, open: !why, why };
  });
}
export function goOut(s, id) {
  const t = TOWN.find((x) => x.id === id); if (!t || !townOpen(s)) return s;
  const cost = townCost(s, id);
  if (onCooldown(s, 'town:' + id)) { s.lastEvent = 'Already, this month.'; return s; }
  if (!canAfford(s, t.ap)) { s.lastEvent = tooTired(s, t.ap); return s; }
  if (cost > (s.cash || 0)) { s.lastEvent = `That is €${cost.toLocaleString()} and you do not have it.`; return s; }
  markUsed(s, 'town:' + id); spend(s, t.ap); s.cash = (s.cash || 0) - cost;
  const charm = (s.charisma || 0);
  // An hour in public, priced by how well they know the face (meta/price.js).
  const lens = id === 'post' ? null : theLens(s, id === 'reading' ? 'a reading' : 'a drink');
  if (id === 'reading') {
    const r = Math.random() * 100;
    if (r < 12 + charm * 0.1) { const p = makePerson(s, 'Fellow Actor'); (s.people = s.people || []).push(p); s.lastEvent = `${p.name} read after you and bought you a drink afterwards. In your phone now — a fellow actor, which is worth more than it sounds.`; addTimeline(s, `Met ${p.name} at a reading.`); }
    else if (r < 32 + charm * 0.12) { const c = addSentListing(s, 'somebody at the reading'); s.lastEvent = c ? `Somebody at the reading is casting. "${c.title}" — they told you to come in, and they will remember the face.` : 'Somebody at the reading is casting, and they will remember the face.'; addTimeline(s, 'Heard about a part at a reading.'); }
    else if (r < 70) { const cap = skillCap(s); if ((s.acting || 0) < cap) { s.acting = Math.min(cap, (s.acting || 0) + 1); s.lastEvent = 'Twelve monologues, one of them yours. You learned something from the eleven. Acting +1.'; } else { s.mental = clamp((s.mental || 0) + 2); s.lastEvent = 'Twelve monologues, one of them yours. Nobody learned anything, and it was a good night.'; } }
    else { s.mental = clamp((s.mental || 0) + 1); s.lastEvent = 'A room above a pub, other people’s monologues, and a bus home. Some nights are only that.'; }
  } else if (id === 'bar') {
    const r = Math.random() * 100;
    if (r < 10 + charm * 0.1) { const p = makePerson(s, pick(['Casting Director', 'Fellow Actor', 'Journalist', 'Fellow Actor'])); (s.people = s.people || []).push(p); s.lastEvent = `${p.name} — ${p.role.toLowerCase()} — was two stools down and stayed two hours. In your phone now.`; addTimeline(s, `Met ${p.name} at the bar.`); }
    else if (r < 48) { const c = addSentListing(s, 'the bar'); s.lastEvent = c ? `A second AD, three drinks in, told you what is casting next month: "${c.title}". It is on the board — and you walk in knowing more than the room.` : 'A second AD told you what is casting next month. Nothing you could read for.'; addTimeline(s, 'Heard what is casting at the bar.'); }
    else if (r < 62) {
      // One more than you meant to: a small step up the drink's own curve (life/drink.js), not a
      // bottle at home — but it counts as a night, and the level remembers it.
      s.drink = s.drink || { level: 0, months: 0, dryMonths: 0, worstLevel: 0 };
      s.drink.level = clamp((s.drink.level || 0) + 2); s.drink.worstLevel = Math.max(s.drink.worstLevel || 0, s.drink.level); s.drink.dryMonths = 0;
      s.mental = clamp((s.mental || 0) + 3); s.strain = clamp((s.strain || 0) + 1); s.lastEvent = 'One more than you meant to. A good night, a slow morning, and nothing came of it.';
    }
    else { s.mental = clamp((s.mental || 0) + 2); s.lastEvent = 'Crews, gossip, somebody’s wrap party spilling in at midnight. You were in the room. That is all it was tonight.'; }
  } else if (id === 'post') {
    const r = Math.random() * 100;
    const small = (s.fame || 0) < 25;
    if (r < 8) { s.scandal = clamp((s.scandal || 0) + (small ? 2 : 4)); addHype(s, small ? 15 : 28, 'scandal'); s.lastEvent = 'You posted it, and then you read it back. A screenshot is already going round. Not career-ending. Not good.'; addTimeline(s, 'A post that did not read the way you meant it.', true); }
    else if (r < 30 + charm * 0.2) { if (!small && chance(8)) { addHype(s, 40, 'viral'); addTimeline(s, 'A post of yours went everywhere. Forty seconds, and everybody has seen it.'); } else bumpHype(s, 3); if (small) setFame(s, (s.fame || 0) + 0.5); s.lastEvent = small ? 'A few hundred strangers, and one of them shared it. The number under your name went up by a digit.' : 'It did the numbers. A day of being looked at, which is the job.'; }
    else { bumpHype(s, 1); s.lastEvent = 'You posted it. Forty people liked it. Your mother commented.'; }
  }
  if (lens) s.lastEvent = `${s.lastEvent} ${lens}`;
  return s;
}
