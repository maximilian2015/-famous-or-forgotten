// Fifty nights out, every kind of room, every button pressed — nothing throws, the
// hours run out, and what the room hands you lands where it should.
import fs from 'fs';
import { startNight, talkTo, nightAct, nightChoice, leaveNight, nightTick, HOURS } from '../../src/systems/social/night.js';
import { EVENT_TIERS } from '../../src/systems/social/events.js';
import { ensureWorld } from '../../src/systems/world/world.js';

const base = JSON.parse(fs.readFileSync(new URL('../../dist/_save.json', import.meta.url), 'utf8'));
const tally = { contacts: 0, leads: 0, numbers: 0, offers: 0, pendings: {}, fame: 0, scandal: 0, guests: 0 };
for (let i = 0; i < 200; i++) {
  const s = JSON.parse(JSON.stringify(base)); ensureWorld(s);
  s.fame = 20 + (i % 4) * 22; s.partner = i % 3 === 0 ? { name: 'Sam Rook', relationship: 60 } : null;
  const tier = EVENT_TIERS[i % 4];
  const ev = { id: 'e' + i, venue: 'The Loft', host: 'somebody', hostId: tier.id === 'local' ? s.world.actors[0].id : null };
  const fame0 = s.fame, sc0 = s.scandal || 0;
  startNight(s, ev, tier);
  const n = s.night; tally.guests += n.guests.length;
  let guard = 0;
  while (!n.done && guard++ < 40) {
    if (n.pending) { tally.pendings[n.pending.id] = (tally.pendings[n.pending.id] || 0) + 1; nightChoice(s, ['home', 'yes', 'bite', 'number'][i % 4]); continue; }
    const g = n.guests.find((x) => !x.done);
    if (i % 5 === 0) nightAct(s, 'drink');
    if (n.cameras && i % 2) nightAct(s, 'cameras');
    if (g && i % 7 !== 6) talkTo(s, g.id); else nightAct(s, i % 2 ? 'floor' : 'leave');
  }
  if (!n.done) throw new Error('night never ended');
  if (n.hour > HOURS.length && !n.log.some((l) => /left|Leave/.test(l.text))) { /* leave ends early */ }
  tally.contacts += n.gains.contacts.length; tally.leads += n.gains.leads; tally.numbers += n.gains.numbers;
  tally.fame += (s.fame - fame0); tally.scandal += ((s.scandal || 0) - sc0);
  leaveNight(s);
  if (s.night) throw new Error('night not cleared');
  // Monday
  s.month = (s.month || 0) + 1; if (s.month > 11) { s.month = 0; s.year += 1; }
  const before = (s.offers || []).length;
  nightTick(s);
  tally.offers += (s.offers || []).length - before;
  for (const o of s.offers || []) if (o.via === 'party' && !(o.salary > 0 && o.projectTitle && o.months)) throw new Error('bad lead offer ' + JSON.stringify(o));
}
console.log(JSON.stringify(tally));
console.log('avg guests', (tally.guests / 200).toFixed(1), '· contacts/night', (tally.contacts / 200).toFixed(2), '· leads/night', (tally.leads / 200).toFixed(2), '· offers per lead', tally.leads ? (tally.offers / tally.leads).toFixed(2) : '-', '· fame/night', (tally.fame / 200).toFixed(2), '· scandal/night', (tally.scandal / 200).toFixed(2));
