import { liveRisks, riskTick, warned, riskLevel, RISKS, RISK_ORDER } from '../src/systems/meta/risk.js';
import { storyTick } from '../src/systems/meta/trouble.js';
import { startNight } from '../src/systems/social/night.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', name: 'Mira Vale', ageY: 30, stage: 'career', dream: 'actor', fame: 40, respect: 20, acting: 60, charisma: 50, looks: 50, luck: 50, scandal: 0, year: 2050, month: 2, timeline: [], filmography: [], productions: [], peakFame: 40, hasApartment: true, housing: 'room', ap: 100, cash: 200000, genreXP: {}, people: [], ...over });
const stamp = (s) => s.year * 12 + s.month;
const month = (s) => { s.month++; if (s.month > 11) { s.month = 0; s.year++; } };

// ── a clean life shows nothing ──────────────────────────────────────────────────
{
  const s = st();
  ok('a careful life has a clean screen', liveRisks(s).length === 0, liveRisks(s).map((r) => r.id).join(','));
  ok('every risk has a label, a line and a fix', RISK_ORDER.every((id) => RISKS[id].label && RISKS[id].fix && RISKS[id].line(s, 1) && RISKS[id].line(s, 2)));
}
// ── the story cannot land the month the warning first shows ─────────────────────
{
  const s = st({ drink: { level: 60 } });
  ok('the drinking is a risk', riskLevel(s, 'drink') === 2);
  riskTick(s);
  ok('it is on the screen', liveRisks(s).some((r) => r.id === 'drink' && r.level === 2));
  ok('and on the timeline', s.timeline.some((x) => /Worth watching — the drinking/.test(x.text)));
  ok('but not yet a warning that counts', !warned(s, 'drink'));
  let hit = 0;
  for (let i = 0; i < 200; i++) { const t = JSON.parse(JSON.stringify(s)); storyTick(t); if (t.timeline.some((x) => /Pulled over/.test(x.text))) hit++; }
  ok('no story lands the month the warning shows', hit === 0, `${hit}/200`);
  month(s); riskTick(s);
  ok('a month later it counts', warned(s, 'drink'));
  hit = 0;
  for (let i = 0; i < 300; i++) { const t = JSON.parse(JSON.stringify(s)); storyTick(t); if (t.timeline.some((x) => /Pulled over/.test(x.text))) hit++; }
  ok('and now the story can run', hit > 0, `${hit}/300`);
}
// ── the nights add up ──────────────────────────────────────────────────────────
{
  const s = st();
  for (let i = 0; i < 4; i++) { startNight(s, { id: 'e' + i, venue: 'a bar', host: '', guestsPre: [] }, { id: 'local', label: 'A night', roles: [] }); s.night = null; month(s); }
  ok('four nights in four months is the party face', riskLevel(s, 'nights') === 1, String(riskLevel(s, 'nights')));
  for (let i = 0; i < 2; i++) { startNight(s, { id: 'f' + i, venue: 'a bar', host: '', guestsPre: [] }, { id: 'local', label: 'A night', roles: [] }); s.night = null; month(s); }
  ok('six is about to bite', riskLevel(s, 'nights') === 2);
  for (let i = 0; i < 7; i++) month(s);
  ok('a season in and it is gone', riskLevel(s, 'nights') === 0);
}
// ── the rest of the board ──────────────────────────────────────────────────────
{
  ok('no month off', riskLevel(st({ strain: 70 }), 'norest') === 1 && riskLevel(st({ strain: 90 }), 'norest') === 2);
  const s = st(); s.bombs = [stamp(s) - 3];
  ok('a flop is worth watching', riskLevel(s, 'flops') === 1);
  ok('cameras outside', riskLevel(st({ media: 65 }), 'exposure') === 1 && riskLevel(st({ media: 85 }), 'exposure') === 2 && riskLevel(st({ media: 50 }), 'exposure') === 0 && riskLevel(st({ media: 50, hypeSource: 'scandal' }), 'exposure') === 2);
  ok('running out', riskLevel(st({ cash: 1000 }), 'money') === 2 && riskLevel(st({ cash: 200000 }), 'money') === 0);
  const w = st(); w.walkedOff = [stamp(w) - 2];
  ok('a walk-off is paper a lawyer keeps', riskLevel(w, 'paper') === 1);
  ok('difficult: the rumour', riskLevel(st({ rumour: { until: 99999999, who: 'X' } }), 'difficult') === 2);
  ok('worst first', liveRisks(st({ strain: 70, media: 85 }))[0].id === 'exposure');
}
// ── the tick forgets what went away and says so once when it gets worse ─────────
{
  const s = st({ media: 70 });
  riskTick(s); const n = s.timeline.length;
  month(s); riskTick(s);
  ok('the same risk is not announced twice', s.timeline.length === n);
  s.media = 90; month(s); riskTick(s);
  ok('getting worse is said', s.timeline.length === n + 1 && /Cameras outside/.test(s.timeline[0].text));
  s.media = 10; month(s); riskTick(s);
  ok('gone from the record when it goes', !s.risks.exposure && !warned(s, 'exposure'));
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
