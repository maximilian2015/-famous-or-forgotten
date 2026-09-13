import { seriesRoot } from '../src/systems/career/franchise.js';
import { startProduction, productionTick } from '../src/systems/career/production.js';
import { releaseTick, runTick } from '../src/systems/career/release.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

// Found by playing: season three was built by appending to season TWO's project title,
// so shows came out as "Lost Signal · season 2 · season 3" and grew a segment a year.
ok('one suffix strips', seriesRoot('Lost Signal · season 2') === 'Lost Signal');
ok('many suffixes strip', seriesRoot('Lost Signal · season 2 · season 3 · season 4') === 'Lost Signal',
  seriesRoot('Lost Signal · season 2 · season 3 · season 4'));
ok('a film keeps its name', seriesRoot('Golden Echo II') === 'Golden Echo II');
ok('a plain show keeps its name', seriesRoot('Lost Signal') === 'Lost Signal');

const st = () => ({ version: 'x', ageY: 30, stage: 'career', dream: 'actor', cash: 0, fame: 60, respect: 50,
  mental: 70, acting: 90, singing: 0, looks: 60, confidence: 50, quote: 0, genreXP: {}, filmography: [],
  discography: [], offers: [], releases: [], frozen: [], timeline: [], year: 2060, month: 0, alive: true });

function runShow() {
  const s = st();
  let offer = { id: 'o', projectTitle: 'Lost Signal', role: 'Series regular', type: 'Soap Opera', genre: 'Drama',
    salary: 300000, months: 3, episodes: 20, episodeFee: 15000, season: 1, prestigeScore: 60, tier: 'lead',
    scale: 'recurring', stability: 95 };
  const titles = [];
  for (let season = 1; season <= 10; season++) {
    startProduction(s, offer);
    s.production.meter = 88;
    for (let m = 0; m < 10 && s.production; m++) productionTick(s);
    for (let m = 0; m < 30 && (s.releases.length || (s.running || []).length); m++) { s.month++; if (s.month > 11) { s.month = 0; s.year++; } releaseTick(s); runTick(s); }
    if (s.filmography[0] && !titles.includes(s.filmography[0].title)) titles.push(s.filmography[0].title);
    const next = s.offers.pop();
    if (!next) break;
    offer = next;
  }
  return titles;
}
// A show can be cancelled after one season, so the long-run check is taken over many
// runs — the compounding check applies to every title from every one of them.
let allTitles = [], longest = [];
for (let i = 0; i < 40; i++) { const t = runShow(); allTitles = allTitles.concat(t); if (t.length > longest.length) longest = t; }
console.log('      longest run —\n      ' + longest.join('\n      '));
const compound = allTitles.filter((t) => (t.match(/season/gi) || []).length > 1);
ok('no title ever compounds, across 40 shows', compound.length === 0, compound.slice(0, 3).join(' | '));
ok('shows do run for several seasons', longest.length > 2, longest.length + ' seasons at best');
ok('every season groups under one show', new Set(longest.map(seriesRoot)).size === 1, [...new Set(longest.map(seriesRoot))].join(' | '));
ok('and the seasons are numbered in order',
  longest.slice(1).every((t, i) => t.endsWith(`season ${i + 2}`)), longest.join(' | '));

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
