// Relationships 2.0 — people who want things, and remember what you did.
// Design: docs/handoffs/2026-10-11-relationships-2-v1-design.md.
//
// person → need (from their own state) → they come to you → you choose → it is remembered →
// it comes back. A need is a card on the main screen ("Maya wants to talk") with a deadline;
// opening it puts the choice on the event screen (App.jsx ArcModal, through arcs.js arcCard),
// where every answer says what it does. Not opening it before the deadline is also an answer,
// and it is remembered as one.
//
// What lives on a person, all of it created only when first needed, so old saves load as
// they are (no version change):
//   p.need      { id, since, until, data }   at most one, live until answered or expired
//   p.needCool  a month before which they will not ask again
//   p.memory    [{ k, a, at, n?, due?, ok? }]  facts, never prose; at most MEMORY_CAP
//   p.neglect   how many times you said no or never answered (the drift rule reads it)
//   p.owes      already existed (favours.js wrote it, nobody read it); written and read here
// And on the player: s.needAt, the month the last need was put to you.
import { rint, chance } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { inCareer } from '../../engine/stage.js';
import { COST, canAfford, spend, tooTired } from '../../engine/energy.js';
import { applyBond } from './bonds.js';

export const SPACING = 3;       // months between two needs put to you, across everybody
export const MEMORY_CAP = 8;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
export const when = (at) => `${MON[((at % 12) + 12) % 12]} ${Math.floor(at / 12)}`;
const first = (p) => String((p && p.name) || '').split(' ')[0];
const money = (n) => `€${Math.round(n).toLocaleString('en-US')}`;

// ── memory ───────────────────────────────────────────────────────────────────
export function memoryOf(p) { return (p && p.memory) || []; }
export function remember(s, p, fact) {
  const m = (p.memory = p.memory || []);
  const entry = { at: stamp(s), ...fact };
  m.push(entry);
  while (m.length > MEMORY_CAP) m.shift();
  return entry;
}
export function recall(p, k, a) {
  const m = memoryOf(p);
  for (let i = m.length - 1; i >= 0; i--) if (m[i].k === k && (!a || m[i].a === a)) return m[i];
  return null;
}
// One line per fact, for the person's card. Generated, never stored.
export function memoryLines(p) {
  const name = first(p);
  const mem = memoryOf(p);
  return mem.map((m, i) => {
    const t = when(m.at);
    if (m.k === 'rent') {
      if (m.a === 'paid') return `You paid ${name}'s rent in ${t}.`;
      if (m.a === 'lent') {
        if (m.ok === true) { const back = mem.slice(i + 1).find((x) => x.k === 'rent' && x.a === 'repaid'); return `You lent ${name} ${money(m.n)} in ${t}; ${name} paid it back${back ? ` in ${when(back.at)}` : ''}.`; }
        return m.ok === false ? `You lent ${name} ${money(m.n)} in ${t}. It never came back.` : `You lent ${name} ${money(m.n)} in ${t}.`;
      }
      if (m.a === 'hosted') return `${name} slept on your sofa for a month in ${t}.`;
      if (m.a === 'refused') return `${name} asked for help with the rent in ${t}. You said no.`;
      if (m.a === 'ignored') return `${name} asked for help with the rent in ${t}. You never called back.`;
      if (m.a === 'repaid') return null;   // told on the loan's own line
    }
    if (m.k === 'favour' && m.a === 'returned') return `${name} covered you when you were short, in ${t}.`;
    return null;
  }).filter(Boolean);
}

// ── who can ask ──────────────────────────────────────────────────────────────
export function personById(s, id) {
  if (s.partner && s.partner.id === id) return s.partner;
  return (s.people || []).find((p) => p.id === id) || (s.family || []).find((p) => p.id === id) || null;
}
function everyone(s) {
  return [...(s.partner ? [s.partner] : []), ...(s.family || []).filter((p) => p.alive !== false), ...(s.people || [])];
}
// A close friend: the rule sms.js already uses for who texts you — a contact you are close to
// (40 or more) who has not gone cold — and not somebody who has drifted out of your life.
export function closeFriend(p) { return !!p && !!p.role && !p.agent && !p.cold && !p.drifted && (p.relationship || 0) >= 40; }
// A roof of your own to put somebody up under: not your parents', not the street, not theirs.
function ownRoof(s) { return !!s.hasApartment && !s.homeless && s.livingWith !== 'parents' && !s.hostedBy; }

// ── the needs ────────────────────────────────────────────────────────────────
// Each: who can have it (from their state), how likely in a month it holds, how long they wait
// for an answer (deadline) and before asking again (cooldown), the call that puts it on your
// screen, the choice, and what not answering does. `shows` on every choice is what the event
// screen prints (life/choiceWords.js), and tests/test_needs.mjs holds it to `apply`.
export const NEEDS = {
  // A friend who cannot make the rent. The one need that tests the whole loop without touching
  // a set: money or no, a debt, a memory, and the debt coming back when it is you who is short.
  rent: {
    deadline: 2, cooldown: 18, urgency: 1,
    // A fellow actor — the contacts this business pays least — close to you, while you are doing
    // well enough to help. From their state, not a roll from a list.
    wants: (s, p) => closeFriend(p) && p.role === 'Fellow Actor' && (s.cash || 0) >= 20000 && !s.homeless,
    chance: () => 4,
    data: () => ({ amount: Math.round(rint(1800, 4500) / 100) * 100 }),
    call: (s, p) => `${p.name} rang. Twice. "Have you got a minute?"`,
    card: (s, p) => `${first(p)} wants to talk. It is about money; you can tell from how long they took to say so.`,
    build: (s, p, need) => {
      const n = need.data.amount; const name = first(p);
      const back = stamp(s) + 12;
      // The last time, if there was one — the call opens with it.
      const last = recall(p, 'rent');
      const opener = !last ? ''
        : last.a === 'paid' ? `"I hate asking twice. You just paid it last time." `
        : last.a === 'lent' && last.ok === true ? `"I paid you back last time, and I will this time." `
        : last.a === 'lent' ? `"I still owe you from last time. I know." `
        : last.a === 'hosted' ? `"Your sofa saved me once." `
        : last.a === 'refused' ? `"I know what you said last time. It is worse now." `
        : last.a === 'ignored' ? `"You did not call back last time. I am trying again." ` : '';
      const choices = [
        { id: 'pay', label: `Pay it — ${money(n)}`, hint: 'No conditions. A friend would.',
          shows: { fx: { cash: -n }, more: [{ t: `you and ${name}: closer`, good: true }, { t: `${name} owes you`, good: true }] },
          apply: () => { s.cash = (s.cash || 0) - n; applyBond(s, p, 12); p.owes = true; remember(s, p, { k: 'rent', a: 'paid', n });
            return `You transferred it before ${name} finished the sentence. ${name} did not say anything for a while, and then said thank you twice.`; } },
        { id: 'lend', label: `Lend it — ${money(n)}, back in a year`, hint: 'Help, and keep it a loan.',
          shows: { fx: { cash: -n }, more: [{ t: `back by ${when(back)}, if all is well between you`, good: true }, { t: `you and ${name}: a little closer`, good: true }] },
          apply: () => { s.cash = (s.cash || 0) - n; applyBond(s, p, 6); remember(s, p, { k: 'rent', a: 'lent', n, due: back });
            return `"A year," ${name} says. "I will pay you back in a year." You both write it down, which makes it feel like a thing friends do.`; } },
      ];
      if (ownRoof(s)) choices.push({ id: 'host', label: 'Stay at mine for a month', hint: 'A sofa, not a cheque.',
        locked: canAfford(s, COST.evening) ? null : tooTired(s, COST.evening),
        shows: { more: [{ t: `${COST.evening} energy`, good: false }, { t: `you and ${name}: closer`, good: true }, { t: `${name} owes you`, good: true }] },
        apply: () => {
          if (!canAfford(s, COST.evening)) return { refused: tooTired(s, COST.evening) };
          spend(s, COST.evening); applyBond(s, p, 10); p.owes = true; remember(s, p, { k: 'rent', a: 'hosted' });
          return `${name} arrives with two bags and a plant, and leaves a month later with the plant. The flat is quieter after, and you notice.`; } });
      choices.push({ id: 'no', label: 'I cannot right now', hint: 'Sometimes true.',
        shows: { more: [{ t: `you and ${name}: further apart`, good: false }] },
        apply: () => { applyBond(s, p, -5); p.neglect = (p.neglect || 0) + 1; remember(s, p, { k: 'rent', a: 'refused' });
          return `"No, of course. I shouldn't have asked." ${name} has already hung up by the time you think of what else to say.`; } });
      choices.push({ id: 'later', later: true, label: 'Let me think about it', hint: `${name} is waiting until ${when(need.until)}.`,
        shows: { more: [{ t: `if you never answer, ${name} remembers that too`, good: null }] } });
      return { speaker: `${p.name} · a friend`, text: `${opener}${name} is ${money(n)} short on the rent, and the landlord has stopped being patient. They would not be asking if there were anybody else to ask.`, choices };
    },
    ignored: (s, p) => {
      applyBond(s, p, -8, { seen: false }); p.neglect = (p.neglect || 0) + 1; remember(s, p, { k: 'rent', a: 'ignored' });
      addTimeline(s, `You never called ${first(p)} back about the rent. They sorted it out somehow.`, true);
    },
  },
};

// ── the month ────────────────────────────────────────────────────────────────
export function liveNeeds(s) { return everyone(s).filter((p) => p.need && NEEDS[p.need.id]); }
function raise(s, p, id) {
  const N = NEEDS[id]; const now = stamp(s);
  p.need = { id, since: now, until: now + N.deadline, data: N.data(s, p) };
  s.needAt = now;
  addTimeline(s, N.call(s, p));
}
function settle(s, p) {
  const N = NEEDS[p.need.id];
  p.needCool = stamp(s) + (N ? N.cooldown : 12);
  p.need = null;
}
// What is promised falls due; a debt comes back when it is you who is short.
function laterTick(s) {
  const now = stamp(s);
  for (const p of s.people || []) {
    for (const m of memoryOf(p)) {
      if (m.k === 'rent' && m.a === 'lent' && m.ok == null && m.due <= now) {
        if (!p.drifted && (p.relationship || 0) >= 0) {
          m.ok = true; s.cash = (s.cash || 0) + m.n; remember(s, p, { k: 'rent', a: 'repaid', n: m.n });
          addTimeline(s, `${first(p)} paid back the ${money(m.n)}, on the day, and would not hear a word about it.`);
        } else {
          m.ok = false;
          addTimeline(s, `The ${money(m.n)} ${first(p)} owed you is not coming back. Neither of you mentions it.`, true);
        }
      }
    }
  }
  // Short yourself: somebody who owes you hears about it. Once per debt.
  if ((s.cash || 0) < 0) {
    const p = (s.people || []).find((x) => x.owes && !x.drifted && !x.cold && (x.relationship || 0) >= 25);
    if (p) {
      const why = recall(p, 'rent', 'paid') || recall(p, 'rent', 'hosted');
      const give = Math.max(1500, why && why.n ? why.n : 2500);
      s.cash = (s.cash || 0) + give; p.owes = false;
      remember(s, p, { k: 'favour', a: 'returned', n: give });
      const reason = why ? (why.a === 'paid' ? `You paid my rent in ${when(why.at)}.` : `You put me up in ${when(why.at)}.`) : 'You put in a word for me once.';
      s.lastEvent = `${first(p)} heard you were short. "${reason} My turn." ${money(give)}, and no conversation about it.`;
      addTimeline(s, `${first(p)} covered you: ${money(give)}. "${reason}"`);
    }
  }
}
export function needsTick(s) {
  if (!s || !s.alive || !inCareer(s)) return s;
  const now = stamp(s);
  // Unanswered past the deadline is an answer.
  for (const p of liveNeeds(s)) if (p.need.until < now) { NEEDS[p.need.id].ignored(s, p, p.need); settle(s, p); }
  laterTick(s);
  // One at a time, and not too often.
  if (liveNeeds(s).length) return s;
  if (s.needAt != null && now - s.needAt < SPACING) return s;
  const cands = [];
  for (const p of everyone(s)) {
    if (p.need || (p.needCool || 0) > now) continue;
    for (const [id, N] of Object.entries(NEEDS)) if (N.wants(s, p)) cands.push({ p, id, N });
  }
  if (!cands.length) return s;
  cands.sort((a, b) => b.N.urgency - a.N.urgency);
  const c = cands[0];
  if (!chance(c.N.chance(s, c.p))) return s;
  raise(s, c.p, c.id);
  return s;
}

// ── the screen ───────────────────────────────────────────────────────────────
// The card on Home: who, what, how long they will wait.
export function needCards(s) {
  return liveNeeds(s).map((p) => ({ pid: p.id, id: p.need.id, name: p.name, text: NEEDS[p.need.id].card(s, p), until: when(p.need.until) }));
}
// Opening it puts the choice on the event screen.
export function openNeed(s, pid) {
  const p = personById(s, pid); if (!p || !p.need || !NEEDS[p.need.id]) { s.lastEvent = 'They have sorted it out already.'; return s; }
  if (s.pendingArc) return s;
  const built = NEEDS[p.need.id].build(s, p, p.need);
  s.pendingArc = { need: p.need.id, pid, speaker: built.speaker, text: built.text,
    kicker: 'Somebody close · a favour', choices: built.choices.map((c) => ({ label: c.label, hint: c.hint || null, shows: c.shows || null, later: !!c.later, locked: c.locked || null })) };
  return s;
}
// arcs.js resolveArc hands a need back here, as it hands a story beat to stories.js.
export function resolveNeed(s, arc, i) {
  const p = personById(s, arc.pid);
  if (!p || !p.need || p.need.id !== arc.need || !NEEDS[arc.need]) { s.pendingArc = null; return s; }
  const built = NEEDS[arc.need].build(s, p, p.need);
  const c = built.choices[i]; if (!c) return s;
  if (c.locked) { s.lastEvent = c.locked; return s; }   // the screen says so on the card; the need stays
  s.pendingArc = null;
  if (c.later) { s.lastEvent = `${first(p)} is waiting until ${when(p.need.until)}.`; return s; }
  const out = c.apply();
  if (out && out.refused) { s.lastEvent = out.refused; return s; }   // could not do it; the need stays
  settle(s, p);
  s.lastEvent = out;
  addTimeline(s, `${p.name} asked for help; you answered: ${c.label.toLowerCase()}.`);
  return s;
}
