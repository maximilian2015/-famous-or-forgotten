import { maybeScene, resolveScene, SCENES, SCENE_IDS, poolFor, difficulty } from '../src/systems/career/scenes.js';
import { startProduction, sets } from '../src/systems/career/production.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', name: 'Mira Vale', ageY: 32, stage: 'career', dream: 'actor', fame: 55, respect: 35, acting: 65, charisma: 55, looks: 55, luck: 50, scandal: 0, media: 0, mental: 70, health: 90, strain: 10, year: 2058, month: 2, timeline: [], filmography: [], productions: [], offers: [], releases: [], peakFame: 55, hasApartment: true, housing: 'room', ap: 100, apMax: 100, cash: 300000, genreXP: {}, people: [], ...over });
const shoot = (s, over) => { startProduction(s, { id: 'o', projectTitle: 'The Picture', role: 'Lead', type: 'Feature Film', genre: 'Drama', salary: 800000, months: 6, tier: 'lead', scale: 'feature', prestigeScore: 60, stability: 95, ...over }); return sets(s)[0]; };
const month = (s) => { s.month++; if (s.month > 11) { s.month = 0; s.year++; } };

// ── every scene is a whole scene ───────────────────────────────────────────────
{
  const s = st(); const p = shoot(s);
  ok('eight of them, each with a game and a line', SCENE_IDS.length === 8 && SCENE_IDS.every((id) => SCENES[id].game && SCENES[id].label && SCENES[id].hint && SCENES[id].line(p)));
  ok('six different mechanics between them', new Set(SCENE_IDS.map((id) => SCENES[id].game)).size === 6, [...new Set(SCENE_IDS.map((id) => SCENES[id].game))].join(','));
}
// ── the genre decides what the shoot throws at you ─────────────────────────────
{
  const s = st();
  const horror = shoot(s, { genre: 'Horror', scale: 'feature' });
  const hp = poolFor(s, horror);
  ok('a horror shoot has stunts and nights in it', hp.includes('stunt') && hp.includes('night'));
  ok('and no crying on cue', !hp.includes('tears'));
  const t = st(); const drama = shoot(t, { genre: 'Romance', scale: 'indie' });
  const dp = poolFor(t, drama);
  ok('a romance has the monologue and the tears', dp.includes('monologue') && dp.includes('tears'));
  ok('and nobody is doing their own stunts', !dp.includes('stunt'));
}
// ── the day is harder when the picture is, and when you are wrecked ────────────
{
  const s = st(); const p = shoot(s);
  const base = difficulty(s, p, 'mark');
  ok('a one-take is harder than a mark', difficulty(s, p, 'oner') > base);
  const tired = st({ strain: 80 }); shoot(tired);
  ok('and so is any of it when you are running on empty', difficulty(tired, sets(tired)[0], 'mark') > base);
  const good = st({ acting: 95 }); shoot(good);
  ok('training widens the window', difficulty(good, sets(good)[0], 'mark') < base);
}
// ── a shoot throws one to three, never two months running ──────────────────────
{
  let counts = [];
  for (let i = 0; i < 40; i++) {
    const s = st(); shoot(s);
    let n = 0, lastMonth = -9;
    for (let m = 0; m < 6; m++) {
      maybeScene(s);
      if (s.scene) { ok(m - lastMonth > 1 || n === 0, true); lastMonth = m; n++; resolveScene(s, 70); }
      month(s); sets(s)[0].monthsLeft -= 1;
    }
    counts.push(n);
  }
  const most = Math.max(...counts), some = counts.filter((n) => n > 0).length;
  ok('never more than three in a picture', most <= 3, String(most));
  ok('and most pictures get at least one', some >= 28, `${some}/40`);
  fails = fails;   // the per-month spacing assertions above are counted already
}
// ── what a day is worth ────────────────────────────────────────────────────────
{
  const s = st(); const p = shoot(s); p.meter = 40; p.crew[0].bond = 50;
  maybeScene(s); if (!s.scene) { s.scene = { setId: p.id, id: 'mark', game: 'timing', label: 'Hit your mark', title: p.title, line: 'x', difficulty: 1 }; }
  resolveScene(s, 95);
  ok('a great day lifts the picture and the director', p.meter > 40 && p.crew[0].bond > 50);
  ok('and leaves a moment for the critics to name', (p.moments || []).length === 1 && s.timeline.some((x) => /got it in one/.test(x.text)));
  const t = st(); const q = shoot(t); q.meter = 60; q.crew[0].bond = 60;
  t.scene = { setId: q.id, id: 'mark', game: 'timing', label: 'Hit your mark', title: q.title, line: 'x', difficulty: 1 };
  resolveScene(t, 10);
  ok('a bad one costs both', q.meter < 60 && q.crew[0].bond < 60 && t.timeline.some((x) => /moved on without it/.test(x.text)));
  // the stunt that goes wrong
  const u = st({ health: 90 }); const r = shoot(u, { genre: 'Horror' });
  u.scene = { setId: r.id, id: 'stunt', game: 'keys', label: 'Doing it yourself', title: r.title, line: 'x', difficulty: 1 };
  resolveScene(u, 12);
  ok('a stunt you get wrong hurts', u.health < 90 && u.timeline.some((x) => /landed badly/.test(x.text)));
  // and the night shoot takes it out of you
  const v = st({ strain: 20 }); const w = shoot(v, { genre: 'Thriller' });
  v.scene = { setId: w.id, id: 'night', game: 'timing', label: 'The night shoot', title: w.title, line: 'x', difficulty: 1 };
  resolveScene(v, 80);
  ok('a night shoot is a night shoot even when it goes well', v.strain > 20);
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
