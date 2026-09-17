// Fuzz. Six hundred nights with a monkey at the buttons — every export in every order —
// and the state has to stay sane: no throw, every night ends, nothing NaN, nothing off
// the scale, no double contact, the phone comes back, the dates hold.
import fs from 'fs';
import * as N from '../../src/systems/social/night.js';
import * as E from '../../src/systems/social/events.js';
import { ensureWorld } from '../../src/systems/world/world.js';
import { advanceMonth } from '../../src/engine/time.js';

const base = JSON.parse(fs.readFileSync(new URL('../../dist/_save.json', import.meta.url), 'utf8'));
const num = (v) => typeof v === 'number' && Number.isFinite(v);
function sane(s, where) {
  for (const k of ['cash', 'fame', 'respect', 'mental', 'looks', 'scandal', 'ap', 'strain']) if (!num(s[k])) throw new Error(`${where}: ${k} is ${s[k]}`);
  for (const k of ['fame', 'mental', 'looks', 'scandal']) if (s[k] < 0 || s[k] > 100) throw new Error(`${where}: ${k} off the scale ${s[k]}`);
  if (s.night) { if (!num(s.night.buzz) || s.night.buzz < 0 || s.night.buzz > 100) throw new Error(`${where}: buzz ${s.night.buzz}`); if (!num(s.night.hour)) throw new Error('hour NaN'); }
  const seen = new Set();
  for (const p of s.people || []) { if (p.worldId) { if (seen.has(p.worldId)) throw new Error(`${where}: contact twice ${p.name}`); seen.add(p.worldId); } if (!num(p.relationship)) throw new Error(`${where}: relationship NaN for ${p.name}`); }
}
const ACTS = ['goOver', 'startTalk', 'moveOn', 'excuse', 'toastYes', 'toastNo', 'reply', 'ask', 'together', 'drink', 'floor', 'terrace', 'cameras', 'leave', 'choice', 'test', 'pitch', 'skipPitch', 'walk'];
const counts = {}; let blackouts = 0, hosted = 0, ended = 0, refusedDates = 0;
for (let i = 0; i < 600; i++) {
  const s = JSON.parse(JSON.stringify(base)); ensureWorld(s);
  s.fame = [5, 30, 62, 80][i % 4]; s.respect = 10 + (i % 6) * 10; s.cash = i % 7 === 0 ? 30 : 90000; s.ap = 100; s._wentOut = 0;
  s.hasApartment = i % 3 !== 0; s.housing = ['room', 'flat', 'house', 'penthouse'][i % 4];
  s.partner = i % 5 === 0 ? { name: 'Sam Rook', relationship: 55 } : null;
  if (i % 4 === 2) { s.production = { id: 'st', title: 'Late River', months: 3, monthsLeft: 2, meter: 50, crew: [{ id: 'c', name: 'X', role: 'Director', bond: 45 }] }; s.productions = [s.production]; } else { s.production = null; s.productions = []; }
  const tier = E.EVENT_TIERS[i % 4];
  if (i % 9 === 8 && N.canHost(s).ok) { N.hostNight(s); if (!s.night) continue; hosted++; }
  else { const ev = { id: 'e' + i, tier: tier.id, venue: 'The Loft', host: 'the Aurora Fund', hostId: tier.id === 'local' ? s.world.actors[0].id : null, at: (s.year * 12 + s.month) + (i % 3 === 0 ? 1 : 0), invited: true };
    s.events = [ev]; E.attendEvent(s, ev.id);
    if (!E.isTonight(s, ev)) { if (s.night) throw new Error('went to a party that is next month'); refusedDates++; continue; } }
  if (!s.night) throw new Error('no night: ' + s.lastEvent);
  let guard = 0; const hist = [];
  while (!s.night.done && guard++ < 700) {
    const n = s.night; const a = ACTS[Math.floor(Math.random() * ACTS.length)]; counts[a] = (counts[a] || 0) + 1; hist.push(a + ":" + (n.talk ? n.talk.stage : "-") + ":" + (n.pending ? n.pending.id : "-") + ":h" + n.hour);
    const t = n.talk; const g = t && n.guests.find((x) => x.id === t.guestId);
    try {
      if (a === 'goOver') { const c = n.guests.filter((x) => !x.done); if (c.length) N.goOver(s, c[Math.floor(Math.random() * c.length)].id); }
      else if (a === 'startTalk') N.startTalk(s);
      else if (a === 'moveOn') N.moveOn(s);
      else if (a === 'excuse') N.excuseYourself(s);
      else if (a === 'toastYes') N.answerToast(s, true);
      else if (a === 'toastNo') N.answerToast(s, false);
      else if (a === 'reply') { if (t && t.options.length) N.reply(s, t.options[Math.floor(Math.random() * t.options.length)].id); }
      else if (a === 'ask') { if (t) { const o = t.options.find((x) => x.ask); if (o) N.reply(s, o.id); } }
      else if (a === 'together') N.drinkTogether(s);
      else if (a === 'drink') N.nightDrink(s);
      else if (a === 'floor') N.nightAct(s, 'floor');
      else if (a === 'terrace') N.nightAct(s, 'terrace');
      else if (a === 'cameras') N.nightAct(s, 'cameras');
      else if (a === 'leave') { if (Math.random() < 0.15) N.nightAct(s, 'leave'); }
      else if (a === 'choice') { if (n.pending && !['test', 'pitch'].includes(n.pending.id)) N.nightChoice(s, ['home', 'yes', 'bite', 'number', 'night', 'laugh', 'no'][Math.floor(Math.random() * 7)]); }
      else if (a === 'test') { if (n.pending && n.pending.id === 'test') N.heavyTest(s, Math.random() * 100); }
      else if (a === 'pitch') { if (n.pending && n.pending.id === 'pitch') N.sendPitch(s, { genre: 'Comedy', scale: ['indie', 'feature', 'blockbuster', 'nonsense'][i % 4], months: [3, 6, 99, 'x'][i % 4], title: i % 2 ? 'Fuzz ' + i : '' }); }
      else if (a === 'skipPitch') N.skipPitch(s);
      else if (a === 'walk') N.moveTo(s, ['bar', 'floor', 'booth', 'terrace', 'nowhere'][i % 5], 50, 50);
    } catch (e) { throw new Error(`night ${i} action ${a} threw: ${e.stack}`); }
    sane(s, `night ${i} after ${a}`);
    // a stuck night: pending test/pitch not answered by the monkey for a long time is fine; guard covers it
    if (guard === 699 && n.pending) { if (n.pending.id === 'test') N.heavyTest(s, 50); else if (n.pending.id === 'pitch') N.skipPitch(s); else N.nightChoice(s, 'night'); }
  }
  if (!s.night.done) throw new Error(`night ${i} never ended: hour ${s.night.hour} talk ${JSON.stringify(s.night.talk && s.night.talk.stage)} pending ${JSON.stringify(s.night.pending && s.night.pending.id)} guests ${s.night.guests.filter((x) => !x.done).length} open | ${hist.slice(-25).join(" | ")}`);
  if (s.night.blackout) blackouts++;
  ended++;
  N.leaveNight(s); if (s.night) throw new Error('night not cleared');
  sane(s, `night ${i} after leaving`);
  // the months after: the phone comes back, the leads and pitches resolve, events expire
  let r = s;
  for (let m = 0; m < 3; m++) { r.bigMoment = null; r.pendingArc = null; r.moments = []; r = advanceMonth(r); sane(r, `night ${i} month ${m}`); }
  if (N.phoneGone(r)) throw new Error('phone still gone after three months');
  for (const ev of r.events || []) if (E.atOf(r, ev) < r.year * 12 + r.month) throw new Error('a past party is still on the list');
}
console.log(JSON.stringify({ ended, blackouts, hosted, refusedDates, counts }));
console.log('fuzz clean');
