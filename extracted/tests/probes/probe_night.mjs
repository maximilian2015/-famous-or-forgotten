// Two hundred nights out, every kind of room, every button pressed — nothing throws, the
// hours run out or the night ends on the glass, and what the room hands you lands.
import fs from 'fs';
import { startNight, goOver, startTalk, moveOn, answerToast, reply, drinkTogether, nightDrink, nightAct, nightChoice, leaveNight, nightTick, HOURS } from '../../src/systems/social/night.js';
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
    if (n.talk && n.talk.stage === 'meet') { const gg = n.guests.find((x) => x.id === n.talk.guestId); if (gg.kind === 'extra' && i % 3) { moveOn(s); tally.moved = (tally.moved || 0) + 1; } else startTalk(s); continue; }
    if (n.talk) {
      if (n.talk.toast === 'ask') { answerToast(s, i % 4 !== 3); continue; }
      if (n.talk.turn === 0 && i % 2) { const a = n.talk.options.find((x) => x.ask); if (a) { reply(s, a.id); tally.asked = (tally.asked || 0) + 1; continue; } }
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

// The names at the premieres, the test after the talk, and your own night with a pitch.
{
  const { hostNight, canHost, heavyTest, sendPitch, skipPitch } = await import('../../src/systems/social/night.js');
  const T = { heavy: 0, tests: 0, trusted: 0, alist: 0, pitches: 0, yes: 0, no: 0, setCost: 0 };
  for (let i = 0; i < 150; i++) {
    const s = JSON.parse(JSON.stringify(base)); ensureWorld(s);
    s.fame = 70; s.respect = 40; s.cash = 200000; s.hasApartment = true; s.housing = 'house'; s.ap = 100; s._wentOut = 0;
    s.production = { id: 'set1', title: 'Late River', months: 4, monthsLeft: 2, meter: 60, crew: [{ id: 'c', name: 'X', role: 'Director', bond: 50 }] }; s.productions = [s.production];
    s.people = [{ id: 'pd', name: 'Nadia Roy', role: 'Film Director', industryWeight: 80, relationship: 55 }, { id: 'pc', name: 'Bruno Kade', role: 'Casting Director', industryWeight: 60, relationship: 40 }];
    if (i % 2 === 0) {
      const tier = EVENT_TIERS[i % 4 === 0 ? 2 : 3];
      startNight(s, { id: 'h' + i, venue: 'The Atrium', host: 'the festival board' }, tier);
      const n = s.night;
      const h = n.guests.find((x) => x.heavy); if (!h) throw new Error('no name at a premiere');
      T.heavy++;
      goOver(s, h.id); startTalk(s); if (n.talk && n.talk.toast === 'ask') answerToast(s, true);
      while (n.talk) { const o = n.talk.options.find((x) => h.taste.likes.includes(x.tone) && !x.ask) || n.talk.options[0]; reply(s, o.id); }
      if (n.pending && n.pending.id === 'test') { T.tests++; heavyTest(s, i % 3 === 0 ? 95 : 60); if ((s.people || []).some((p) => p.name === h.name && (p.relationship || 0) >= 58)) T.trusted++; if ((s.leads || []).some((l) => l.alist)) T.alist++; }
      nightDrink(s); nightDrink(s); nightDrink(s); nightAct(s, 'leave');
      if (n.log.some((l) => /Late to the call/.test(l.text))) T.setCost++;
      leaveNight(s);
    } else {
      if (!canHost(s).ok) throw new Error('should be able to host: ' + canHost(s).why);
      hostNight(s);
      const n = s.night; if (!n || n.tier !== 'yours') throw new Error('no night hosted: ' + s.lastEvent);
      const d = n.guests.find((x) => x.decides); if (!d) { T.nobody = (T.nobody || 0) + 1; leaveNight(s); continue; }
      goOver(s, d.id); startTalk(s); if (n.talk && n.talk.toast === 'ask') answerToast(s, true);
      while (n.talk) { const o = n.talk.options.find((x) => d.taste.likes.includes(x.tone) && !x.ask) || n.talk.options[0]; reply(s, o.id); }
      if (n.pending && n.pending.id === 'pitch') { T.pitches++; if (i % 5 === 1) skipPitch(s); else sendPitch(s, { genre: 'Drama', scale: 'feature', months: 6, title: 'The Long Room' }); }
      nightAct(s, 'leave'); leaveNight(s);
      for (let m = 0; m < 3; m++) { s.month += 1; if (s.month > 11) { s.month = 0; s.year += 1; } nightTick(s); }
      if ((s.offers || []).some((o) => o.via === 'pitch')) { T.yes++; const o = s.offers.find((o) => o.via === 'pitch'); if (o.projectTitle !== 'The Long Room' || o.genre !== 'Drama' || o.months !== 6) throw new Error('pitch offer lost its shape ' + JSON.stringify(o)); }
      else if ((s.sms || []).some((m) => m.tag === 'pitch')) T.no++;
    }
  }
  console.log('names', JSON.stringify(T));
}

// Bringing one of yours back from the sofa: the sequel or the season lands as a real offer.
{
  const { hostNight, sendPitch, revivable } = await import('../../src/systems/social/night.js');
  const T = { offered: 0, yes: 0, seasons: 0, sequels: 0, none: 0 };
  for (let i = 0; i < 80; i++) {
    const s = JSON.parse(JSON.stringify(base)); ensureWorld(s);
    s.fame = 70; s.respect = 40; s.cash = 300000; s.hasApartment = true; s.housing = 'house'; s.ap = 100; s._wentOut = 0; s._hosted = []; s.production = null; s.productions = []; s.offers = []; s.laterOffers = [];
    s.people = [{ id: 'pd', name: 'Nadia Roy', role: 'Film Director', industryWeight: 85, relationship: 80 }];
    s.filmography = [
      { id: 'f1', title: 'Glass and Glass', rating: 84, verdict: 'smash', genre: 'Thriller', scale: 'feature', job: { title: 'Glass and Glass', role: 'Lead', type: 'Feature Film', genre: 'Thriller', salary: 600000, months: 5, part: 1, tier: 'lead', scale: 'feature', stability: 90, prestigeScore: 60 } },
      { id: 'f2', title: 'Small Hours · season 2', rating: 78, genre: 'Drama', scale: 'prestige', job: { title: 'Small Hours · season 2', seriesTitle: 'Small Hours', role: 'Lead', type: 'Prestige Series', genre: 'Drama', salary: 900000, months: 4, episodes: 8, episodeFee: 112500, season: 2, tier: 'lead', scale: 'prestige', stability: 90, prestigeScore: 70 } },
      { id: 'f3', title: 'Bad One', rating: 30, verdict: 'bomb', genre: 'Comedy', scale: 'indie', job: { title: 'Bad One', role: 'Lead', type: 'Feature Film', genre: 'Comedy', salary: 40000, months: 3, part: 1, tier: 'lead', scale: 'indie', stability: 80, prestigeScore: 40 } },
    ];
    const rv = revivable(s);
    if (rv.length !== 2) throw new Error('revivable should list the two that were any good: ' + JSON.stringify(rv.map((x) => x.title)));
    hostNight(s); const n = s.night; if (!n) throw new Error('no night ' + s.lastEvent);
    const d = n.guests.find((x) => x.decides); if (!d) { T.none++; leaveNight(s); continue; }
    goOver(s, d.id); startTalk(s); if (n.talk && n.talk.toast === 'ask') answerToast(s, true);
    while (n.talk) { const o = n.talk.options.find((x) => d.taste.likes.includes(x.tone) && !x.ask) || n.talk.options[0]; reply(s, o.id); }
    if (!(n.pending && n.pending.id === 'pitch')) { T.none++; leaveNight(s); continue; }
    T.offered++;
    sendPitch(s, { reviveId: i % 2 ? 'f1' : 'f2' });
    nightAct(s, 'leave'); leaveNight(s);
    for (let m = 0; m < 3; m++) { s.month += 1; if (s.month > 11) { s.month = 0; s.year += 1; } nightTick(s); }
    const o = (s.offers || []).find((x) => x.via === 'pitch');
    if (o) { T.yes++; if (o.kind === 'renewal') { T.seasons++; if (o.season !== 3 || o.seriesTitle !== 'Small Hours') throw new Error('season wrong ' + JSON.stringify(o)); } else { T.sequels++; if (o.part !== 2 || !/Glass and Glass II/.test(o.projectTitle)) throw new Error('sequel wrong ' + JSON.stringify(o)); } if (o.waitsForWrap) throw new Error('should not wait'); }
  }
  console.log('revive', JSON.stringify(T));
}
