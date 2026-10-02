// The screen the autoplayer cannot reach.
//
// autoplay.mjs plays a life through the real interface and never lands an acting part, because
// an audition is a minigame. So it never sees a screen with a credit on it — and that is
// exactly where a change of mine put `{c.character}` straight into JSX. makeCharacter returns
// an OBJECT, { name, what, tier }, so React threw #31 and the whole filmography went black. The
// build was fine. The 60 tests were fine. The autoplayer was fine. Maxi opened his filmography.
//
// The fix for the blind spot is not a cleverer autoplayer: it is being able to START from a
// career instead of walking to one. A save is injected before the bundle runs, because
// location.reload() is not implemented in jsdom — the first version of this probe set
// localStorage and reloaded, the page kept its old state, and the check quietly passed nothing.
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const gameDir = fileURLToPath(new URL('../', import.meta.url));
const HTML = path.join(gameDir, 'dist/game.html');
let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

if (!fs.existsSync(HTML)) {
  console.log('FAIL  no dist/game.html — run node build-singlefile.mjs');
  process.exit(1);
}

// A career with one of everything the credit row knows how to draw, in the shapes the game
// really stores them in: a character object, a festival film nobody bought, a TV season.
// store.js discards a save whose version is not the current one and starts a new life instead,
// silently - the first fixture here said version 'x' and every check ran against the birth
// screen. Read it out of the source so this cannot rot the next time it is bumped.
const VERSION = (fs.readFileSync(path.join(gameDir, 'src/state/store.js'), 'utf8')
  .match(/CURRENT_VERSION = '([^']+)'/) || [])[1];
if (!VERSION) { console.log('FAIL  could not read CURRENT_VERSION from store.js'); process.exit(1); }

const save = {
  version: VERSION, stage: 'career', ageY: 44, year: 2066, month: 3, dream: 'actor', gender: 'female',
  name: 'Alex Moon', fame: 62, respect: 58, cash: 400000, acting: 74, quote: 900000,
  offers: [], releases: [], inbox: [], timeline: [], discography: [], genreXP: {},
  filmography: [
    { title: 'Buried Hunger', role: 'Lead', type: 'Feature Film', genre: 'Crime', year: 2064,
      rating: 72, score: 7.2, status: 'Well-received', verdict: 'profitable', critical: 'well received',
      boxOffice: 240000000, needed: 182000000, director: 'Rosalind Varga', running: false,
      character: { name: 'Nadia Kerr', what: 'a detective who is also the suspect', tier: 'lead' },
      premise: 'A harbour town, a disappearance, a sister who will not leave.',
      onSet: ['In the film now: a four-minute monologue played in one.'],
      career: 'the right people noticed', careerTone: 'good', careerRespect: 5, careerFame: 3 },
    { title: 'WellPlanned', role: 'Lead', type: 'Festival Film', genre: 'Thriller', year: 2063,
      rating: 68, score: 6.8, status: 'Released', verdict: 'unsold', critical: 'mixed',
      director: 'Kaspar Hartigan', running: false, character: { name: 'Ilse Brandt', what: 'a forger', tier: 'lead' },
      festival: { name: 'the Croisette', result: 'unsold' } },
    { title: 'Night Shift · Season 3', role: 'Series regular', type: 'TV Series', genre: 'Drama',
      year: 2062, season: 3, episodes: 10, rating: 75, score: 7.5, status: 'Well-received',
      verdict: 'watched', critical: 'well received', viewers: 6.4, running: false,
      director: 'Mira Croft', character: { name: 'Kaspar Hartigan', what: 'the one who stayed', tier: 'lead' } },
  ],
};

// Injected ahead of the bundle. The app reads localStorage on first render, so it has to be
// there before a line of the game runs.
const seeded = fs.readFileSync(HTML, 'utf8').replace('<body',
  `<script>try{localStorage.setItem('fof_react_save',${JSON.stringify(JSON.stringify(save))})}catch(e){}</script><body`);

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1100);

// NOT body.textContent: that includes the contents of the inline <script>, so a search for
// '[object Object]' found React's own error-message source and reported a bug that was not on
// the screen at all. Only what a person can actually read.
const text = () => [...D.body.querySelectorAll('*')]
  .filter((el) => el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE')
  .map((el) => [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join(' '))
  .join(' ').replace(/\s+/g, ' ');
const label = (b) => (b.textContent || '').replace(/\s+/g, ' ').trim();
const press = async (re) => {
  const b = [...D.querySelectorAll('button')].filter((x) => !x.disabled).find((x) => re.test(label(x)));
  if (!b) return false;
  b.dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
  await sleep(320);
  return true;
};

ok('the save loaded into a career', /Alex Moon|Buried Hunger|Career/i.test(text()), text().slice(0, 90));
await press(/^(🎬)?Career$/);
await press(/Filmography|Film\/TV|Credits/i);

const t = text();
ok('the filmography renders at all', t.length > 300 && /Buried Hunger/.test(t));
ok('nothing threw', errors.length === 0, errors.slice(0, 2).join(' | '));
// The actual regression: a character is an object and must be drawn by its name.
ok('a character is drawn by name, not as an object', /Nadia Kerr/.test(t),
  /\[object Object\]/.test(t) ? 'rendered [object Object]' : 'name missing from the row');
ok('and what the picture was about is on it', /harbour town/.test(t));
ok('a film nobody bought says so in words', /nobody bought it/i.test(t) || /NO BUYER/.test(t));

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
