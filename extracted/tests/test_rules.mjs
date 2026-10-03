// Does the game tell you how to play the game.
//
// Maxi, looking at a nonogram with a hint that said the numbers were runs of good takes:
// "вот как играть это, каждую игру надо объяснять?" Yes. Fourteen mechanics had a `hint`, and a
// hint is mood — it says what you are looking at. A bar with a green band on it explains itself;
// a five-by-five grid of numbers does not, and the rule that makes it solvable (that "1 1" is
// two separate runs with a gap between them) is not guessable by anybody who has not met one.
//
// Two things can go wrong and this checks both:
//   1. a mechanic has no rules at all, because somebody added a game or renamed an id;
//   2. the rules exist in the module and never reach the screen.
// The second is the one that cannot be checked by reading the source — career/scenes.js exports
// RULES, App.jsx renders it inside SceneModal's `ready` state, and nothing between the two is
// tested by anything else. autoplay.mjs cannot get here: it never lands an acting part, so it
// never sees a shooting day. So the save is injected with g.scene already set, the way
// test_filmography does it, and the card is read off the rendered DOM.
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SCENES, RULES, rulesFor } from '../src/systems/career/scenes.js';

const gameDir = fileURLToPath(new URL('../', import.meta.url));
const HTML = path.join(gameDir, 'dist/game.html');
let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

if (!fs.existsSync(HTML)) { console.log('FAIL  no dist/game.html — run node build-singlefile.mjs'); process.exit(1); }

// ── 1. every mechanic the game can throw has rules ────────────────────────────
const games = [...new Set(Object.values(SCENES).map((s) => s.game))].sort();
const keys = Object.keys(RULES).sort();
ok('every mechanic a scene can throw has rules', games.every((g) => keys.includes(g)),
  games.filter((g) => !keys.includes(g)).join(', ') || '');
ok('and there are no rules for a mechanic that no longer exists', keys.every((k) => games.includes(k)),
  keys.filter((k) => !games.includes(k)).join(', ') || '');
ok('an unknown mechanic returns nothing rather than throwing', rulesFor('not-a-game') === null);
// A rule that runs over two lines reads as a dropped line on screen: each entry is its own div.
for (const [k, v] of Object.entries(RULES)) {
  if (!v.length) { fails++; console.log('FAIL  ' + k + ' has an empty rule list'); }
  const broken = v.filter((l) => !/[.!?]$/.test(l.trim()));
  if (broken.length) { fails++; console.log('FAIL  ' + k + ' splits a sentence across lines :: ' + broken[0]); }
}
ok('every line is a whole sentence, because each one is drawn on its own', true);

// ── 2. it reaches the screen ──────────────────────────────────────────────────
// Four of the fourteen, one DOM each: the nonogram because it is the one Maxi was looking at,
// the press-your-luck because its real rule (a bad tile is a zero) is the least guessable, the
// timing bar because it is the one that needs rules least and must still have them, and the
// motive because it is the only one whose rules are three paragraphs.
const VERSION = (fs.readFileSync(path.join(gameDir, 'src/state/store.js'), 'utf8')
  .match(/CURRENT_VERSION = '([^']+)'/) || [])[1];
if (!VERSION) { console.log('FAIL  could not read CURRENT_VERSION from store.js'); process.exit(1); }

const sceneFor = (game) => {
  const id = Object.keys(SCENES).find((k) => SCENES[k].game === game);
  return { setId: 'p1', id, game, label: SCENES[id].label, hint: 'A day on it.',
    title: 'Buried Hunger', role: 'Lead', genre: 'Crime', director: 'Rosalind Varga',
    // `approach` already chosen: the modal opens on the brief when it is not, and the rules
    // live on the screen after it. Choosing it here is what a player has already done by then.
    approach: 'written', line: 'The scene before the one everybody remembers.', difficulty: 2 };
};

const saveFor = (game) => ({
  version: VERSION, stage: 'career', ageY: 44, year: 2066, month: 3, dream: 'actor', gender: 'female',
  name: 'Alex Moon', fame: 62, respect: 58, cash: 400000, acting: 74, quote: 900000,
  offers: [], releases: [], inbox: [], timeline: [], discography: [], genreXP: {}, filmography: [],
  productions: [{ id: 'p1', title: 'Buried Hunger', role: 'Lead', type: 'Feature Film', genre: 'Crime',
    scale: 'feature', months: 5, monthsLeft: 3, prepLeft: 0, meter: 55, stability: 80, director: 'Rosalind Varga',
    crew: [{ id: 'c0', name: 'Rosalind Varga', role: 'Director', bond: 52, bond0: 52 },
      { id: 'c1', name: 'Zora Sorensen', role: 'Co-star', bond: 44, bond0: 44 }] }],
  scene: sceneFor(game),
});

const render = async (game) => {
  const seeded = fs.readFileSync(HTML, 'utf8').replace('<body',
    `<script>try{localStorage.setItem('fof_react_save',${JSON.stringify(JSON.stringify(saveFor(game)))})}catch(e){}</script><body`);
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { if (!/navigation to another Document/.test(e.message)) errors.push(e.message); });
  vc.on('error', (...a) => errors.push(a.join(' ').slice(0, 200)));
  const dom = new JSDOM(seeded, { runScripts: 'dangerously', resources: 'usable',
    url: 'https://localhost/game.html', virtualConsole: vc });
  const W = dom.window, D = W.document;
  W.onerror = (m) => errors.push('onerror: ' + String(m).slice(0, 200));
  W.requestAnimationFrame = (f) => W.setTimeout(() => f(Date.now()), 16);
  if (W.URL && !W.URL.createObjectURL) W.URL.createObjectURL = () => 'blob:stub';
  await new Promise((r) => setTimeout(r, 1100));
  // Only what a person can read: body.textContent includes the inline bundle source, and a
  // search through that once reported a bug that was not on the screen at all.
  const text = [...D.body.querySelectorAll('*')]
    .filter((el) => el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE')
    .map((el) => [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join(' '))
    .join(' ').replace(/\s+/g, ' ');
  const out = { text, errors, dom };
  return out;
};

for (const game of ['nono', 'grid', 'timing', 'motive']) {
  const { text, errors, dom } = await render(game);
  ok(`${game}: the shooting day is on screen`, /Buried Hunger/.test(text), text.slice(0, 80));
  ok(`${game}: it says how it is played`, /How it is played/i.test(text));
  const missing = RULES[game].filter((l) => !text.includes(l));
  ok(`${game}: and every line of the rules is there`, missing.length === 0, missing[0] || '');
  ok(`${game}: nothing threw`, errors.length === 0, errors.slice(0, 1).join(''));
  dom.window.close();
}

// The one rule that is not on a scene card at all: press-your-luck is also every audition and
// every day job, and the cost of a bad tile is stated by the component so all five callers say it.
{
  const grid = fs.readFileSync(path.join(gameDir, 'src/ui/components/GridRisk.jsx'), 'utf8');
  ok('the grid says what a bad tile costs, wherever it is played', /is a zero/.test(grid));
  ok('and that the first one is safe, which it silently always was', /the first is always safe/.test(grid));
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
