// The fair crisis. Maxi, after twenty perfect lives: "reputation never goes bad, nothing
// comes for you." Then trouble.js came for you — and a story that lands out of a clear
// sky is not difficulty, it is a dice roll with your name on it. So every story has a
// warning it must be preceded by, and the warning is on the main screen for at least a
// month before the story can run: the drinking, the nights out, the months without a
// month off, the flop and the flop after it, the car outside the house, the walk-off
// somebody's lawyer kept the paper on. You always see it coming. What you do about it
// is the game.
//
// A risk is a level — 0 quiet, 1 worth watching, 2 about to bite — read fresh every
// month from the state; s.risks remembers when each one first showed so trouble.js can
// ask "did they have a chance to see this?" (warned). Nothing here changes a number.
import { addTimeline } from '../../engine/timeline.js';
import { level as drinkLevel } from '../life/drink.js';
import { insurability } from '../life/strain.js';
import { rentDue, staffBill, upkeepBill } from '../life/money.js';
import { hasAgent } from '../career/agent.js';
import { inCareer } from '../../engine/stage.js';

const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
// trouble.js reads this file, so the rumour rule is repeated here rather than imported.
const rumourOn = (s) => !!(s.rumour && s.rumour.until > stamp(s));
const within = (s, list, months) => (list || []).filter((t) => stamp(s) - t < months).length;

// What a month costs to stand still: rent, the people, the things. money.js bills it.
function monthlyBills(s) { return rentDue(s) + staffBill(s) + upkeepBill(s) + 900; }

export const RISKS = {
  nights: { label: 'The party face', fix: 'Stay in for a season.',
    level: (s) => { const n = within(s, s.nights, 6); return n >= 5 ? 2 : n >= 3 ? 1 : 0; },
    line: (s, l) => `Out ${within(s, s.nights, 6)} nights in six months. ${l === 2 ? 'Everybody at those tables has a phone, and one of them is recording.' : 'People have started to say you are always out.'}` },
  drink: { label: 'The drinking', fix: 'Fewer bottles in the house. A doctor, if it is past that.',
    level: (s) => (drinkLevel(s) >= 45 ? 2 : drinkLevel(s) >= 18 ? 1 : 0),
    line: (s, l) => (l === 2 ? 'The drinking is a thing people say about you now. A night that ends at a police station is one bad decision away.' : 'The drinking has been noticed. Nothing has happened yet; that is the word to hold on to.') },
  norest: { label: 'No month off', fix: 'A month with nothing on the calendar.',
    level: (s) => ((s.strain || 0) >= 82 ? 2 : (s.strain || 0) >= 60 ? 1 : 0),
    line: (s, l) => (l === 2 ? 'Running on empty. The next set is where you stop, whether you decide to or not.' : 'Tired, and it shows on the set. One month off would fix it; two more without would not.') },
  flops: { label: 'The last one bombed', fix: 'A smaller part that works. Not another swing.',
    level: (s) => { const n = within(s, s.bombs, 24); return n >= 2 ? 2 : n >= 1 ? 1 : 0; },
    line: (s, l) => (l === 2 ? 'Two leads that bombed inside two years. The trades have a phrase for it and the insurers are using it.' : 'A lead that bombed. One more inside two years and the phrase is box office poison.') },
  exposure: { label: 'Cameras outside', fix: 'A month out of sight. A publicist, if you can afford one.',
    level: (s) => ((s.media || 0) >= 80 ? 2 : (s.media || 0) >= 60 ? 1 : 0),
    line: (s, l) => (l === 2 ? 'There is a car outside most days. Whatever you do next is a photograph, and the caption is not yours to write.' : 'You are in the papers more than you are in the work. That is when the long lenses come.') },
  money: { label: 'Running out', fix: 'Work that pays this month, or a cheaper month.',
    level: (s) => { if (!inCareer(s) || !s.hasApartment) return 0; const c = s.cash || 0, b = monthlyBills(s); return c < b ? 2 : c < b * 3 ? 1 : 0; },
    line: (s, l) => (l === 2 ? `Less in the bank than the month costs. Next month the landlord’s letter is not polite.` : `Three months of bills and no more. A quiet stretch and you are choosing which one not to pay.`) },
  agent: { label: 'Your agent', fix: 'Turn up, finish what you start, stay out of the papers.',
    level: (s) => { if (!hasAgent(s)) return 0; const r = s.respect || 0, ins = insurability(s); return r < -10 || ins < 0.6 ? 2 : r < 0 || ins < 0.8 ? 1 : 0; },
    line: (s, l) => (l === 2 ? 'Your agent is doing more explaining than selling. One more rung down and the calls stop being returned.' : 'Your agent has to argue for you now. Agents do that for a while, and then they do not.') },
  difficult: { label: 'Difficult', fix: 'A set that ends warm. Time.',
    level: (s) => (rumourOn(s) || (s.respect || 0) < -15 ? 2 : (s.burnouts || 0) >= 2 ? 1 : 0),
    line: (s, l) => (l === 2 ? 'The word is difficult, and it is in the room before you are. A co-star with an interview to fill will use it.' : 'Two sets stopped because of you. It gets said about people; it is starting to be said about you.') },
  paper: { label: 'A lawyer has the paper', fix: 'Nothing but time. Do not walk off another.',
    level: (s) => { const n = within(s, s.walkedOff, 24); return n >= 2 ? 2 : n >= 1 ? 1 : 0; },
    line: (s, l) => (l === 2 ? 'Two sets walked off in two years. Somebody’s lawyer has both contracts in a drawer and your quote in a spreadsheet.' : 'You walked off a set. The money you cost them is on a piece of paper, and paper keeps.') },
};
export const RISK_ORDER = ['norest', 'money', 'drink', 'nights', 'exposure', 'flops', 'difficult', 'agent', 'paper'];

export function riskLevel(s, id) { const r = RISKS[id]; return r ? r.level(s) : 0; }
// The live list for the main screen: what is worth watching, worst first.
export function liveRisks(s) {
  const out = [];
  for (const id of RISK_ORDER) {
    const l = riskLevel(s, id); if (!l) continue;
    const r = RISKS[id];
    out.push({ id, level: l, label: r.label, line: r.line(s, l), fix: r.fix, since: (s.risks && s.risks[id] && s.risks[id].since) || stamp(s) });
  }
  return out.sort((a, b) => b.level - a.level);
}
// Has the player been able to see this coming for at least `months` months? trouble.js
// asks before every story; the answer is no in the month a risk first shows.
export function warned(s, id, months = 1) {
  const r = s.risks && s.risks[id];
  return !!r && stamp(s) - r.since >= months;
}
// Monthly, before the stories. Remembers when each risk first showed and says so once —
// on the timeline, not in your face — the month it starts and the month it gets worse.
export function riskTick(s) {
  if (!s.risks) s.risks = {};
  const now = stamp(s);
  for (const id of RISK_ORDER) {
    const l = riskLevel(s, id);
    const had = s.risks[id];
    if (!l) { if (had) delete s.risks[id]; continue; }
    if (!had) { s.risks[id] = { since: now, level: l }; addTimeline(s, `Worth watching — ${RISKS[id].label.toLowerCase()}: ${RISKS[id].line(s, l)}`); }
    else if (l > had.level) { had.level = l; addTimeline(s, `${RISKS[id].label}: ${RISKS[id].line(s, l)}`, true); }
    else had.level = l;
  }
  return s;
}
