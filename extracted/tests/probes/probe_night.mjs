// Two hundred nights out, every kind of room, every button pressed — nothing throws, the
// hours run out or the night ends on the glass, and what the room hands you lands.
import fs from 'fs';
import { startNight, goOver, answerToast, reply, drinkTogether, nightDrink, nightAct, nightChoice, leaveNight, nightTick, HOURS } from '../../src/systems/social/night.js';
import { EVENT_TIERS, sneakIntoEvent, answerDoor, stairsResult } from '../../src/systems/social/events.js';
import { ensureWorld } from '../../src/systems/world/world.js';

const base = JSON.parse(fs.readFileSync(new URL('../../dist/_save.json', import.meta.url), 'utf8'));
const tally = { contacts: 0, leads: 0, numbers: 0, offers: 0, pendings: {}, fame: 0, scandal: 0, guests: 0, blackouts: 0, spent: 0, turns: 0, went: { good: 0, flat: 0, bad: 0 }, buzzEnd: 0 };
for (let i = 0; i < 200; i++) {
  const s = JSON.parse(JSON.stringify(base)); ensureWorld(s);
  s.fame = 20 + (i % 4) * 22; s.partner = i % 3 === 0 ? { name: 'Sam Rook', relationship: 60 } : null; s.cash = 5000;
  const tier = EVENT_TIERS[i % 4];
  const ev = { id: 'e' + i, venue: 'The Loft', host: 'the Aurora Fund', hostId: tier.id === 'local' ? s.world.actors[0].id : null };
  const fame0 = s.fame, sc0 = s.scandal || 0;
  startNight(s, ev, tier);
  const n = s.night; tally.guests += n.guests.length;
  const heavy = i % 5 === 0;   // one in five drinks like it is a job
  let guard = 0;
  while (!n.done && guard++ < 60) {
    if (n.pending) { tally.pendings[n.pending.id] = (tally.pendings[n.pending.id] || 0) + 1; nightChoice(s, ['home', 'yes', 'bite', 'number'][i % 4]); continue; }
    if (n.talk) {
      if (n.talk.toast === 'ask') { answerToast(s, i % 4 !== 3); continue; }
      if (heavy && i % 2) { drinkTogether(s); if (n.done) break; }
      const o = n.talk.options[i % n.talk.options.length]; if (!o) throw new Error('no options');
      reply(s, o.id); tally.turns++; continue;
    }
    if (heavy) { nightDrink(s); nightDrink(s); if (n.done) break; }
    const g = n.guests.find((x) => !x.done);
    if (n.cameras && i % 2) nightAct(s, 'cameras');
    if (g && i % 7 !== 6) goOver(s, g.id); else nightAct(s, i % 2 ? 'floor' : (i % 4 ? 'terrace' : 'leave'));
  }
  if (!n.done) throw new Error('night never ended: hour ' + n.hour + ' talk ' + !!n.talk + ' pending ' + !!n.pending);
  if (n.blackout) tally.blackouts++;
  for (const g of n.guests) if (g.went) tally.went[g.went]++;
  tally.contacts += n.gains.contacts.length; tally.leads += n.gains.leads; tally.numbers += n.gains.numbers; tally.spent += n.spent; tally.buzzEnd += n.buzz;
  tally.fame += (s.fame - fame0); tally.scandal += ((s.scandal || 0) - sc0);
  leaveNight(s);
  if (s.night) throw new Error('night not cleared');
  s.month = (s.month || 0) + 1; if (s.month > 11) { s.month = 0; s.year += 1; }
  const before = (s.offers || []).length; nightTick(s); tally.offers += (s.offers || []).length - before;
}
console.log(JSON.stringify(tally));
console.log('avg guests', (tally.guests / 200).toFixed(1), '· contacts/night', (tally.contacts / 200).toFixed(2), '· leads/night', (tally.leads / 200).toFixed(2), '· fame/night', (tally.fame / 200).toFixed(2), '· scandal/night', (tally.scandal / 200).toFixed(2), '· blackouts', tally.blackouts, '· avg buzz at end', (tally.buzzEnd / 200).toFixed(0));

// The three doors: the quiz is answerable from the card and the wall, and one wrong is out.
const doors = { in: 0, wrongOut: 0, stairsOut: 0 };
for (let i = 0; i < 60; i++) {
  const s = JSON.parse(JSON.stringify(base)); ensureWorld(s); s.ap = 100;
  const ev = { id: 'd' + i, tier: 'mixer', venue: 'The Loft', host: 'the Aurora Fund', monthsLeft: 2 };
  s.events = [ev];
  sneakIntoEvent(s, ev.id, 90);
  if (!ev.door || ev.door.stage !== 1) throw new Error('quiz did not open: ' + s.lastEvent);
  for (const q of ev.door.quiz) if (!q.options.includes(q.answer) || q.options.length < 2) throw new Error('bad question ' + JSON.stringify(q));
  if (i % 3 === 0) { answerDoor(s, ev.id, ev.door.quiz[0].options.find((o) => o !== ev.door.quiz[0].answer)); if (!ev.doorTried || ev.invited) throw new Error('wrong answer should bounce'); doors.wrongOut++; continue; }
  while (ev.door && ev.door.stage === 1) answerDoor(s, ev.id, ev.door.quiz[ev.door.asked].answer);
  if (!ev.door || ev.door.stage !== 2) throw new Error('stairs did not open');
  stairsResult(s, ev.id, i % 2 === 0);
  if (i % 2 === 0) { if (!ev.invited) throw new Error('stairs pass should invite'); doors.in++; } else { if (!ev.doorTried) throw new Error('stairs fail should bounce'); doors.stairsOut++; }
}
console.log('doors', JSON.stringify(doors));
