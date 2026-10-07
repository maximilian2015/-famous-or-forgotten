// Does every screen still draw.
//
// This is step zero of taking App.jsx apart, and it exists because of a hole rather than a plan.
// What protects the interface today:
//
//   build-singlefile.mjs  catches a JSX SYNTAX error and nothing else;
//   oxlint                catches an unused import and nothing about rendering;
//   autoplay.mjs          plays one life through the real interface — and never lands an acting
//                         part, because an audition is a minigame, so it never once reaches the
//                         career half of the game;
//   test_filmography      one screen, through a seeded save;
//   test_rules            one modal, through a seeded save.
//
// So the career side of the interface has no cover at all. That is not a theory: a change of
// mine put `{c.character}` — an object — straight into JSX, React threw, the whole filmography
// went black, and the build was fine and sixty tests were green. Moving components out of a
// 3,459-line file is exactly the operation that breaks a screen while everything stays green.
//
// This visits every screen there is and asserts two things that are hard to fake: that nothing
// threw, and that the screen has words on it. A React render exception leaves an empty root and
// logs to console.error; both are failures here.
//
// Deterministic on purpose. Math.random is replaced with a seeded generator INSIDE the page
// before a line of the bundle runs, so two runs of this file see the same game. A smoke test
// that fails one run in ten teaches people to re-run it, which is worse than not having it.
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { visibleApps } from '../src/phone/apps/registry.js';
import { callTheRoom } from '../src/systems/career/standoff.js';
import { signEndorsement } from '../src/systems/career/endorsement.js';
import { hangIt } from '../src/systems/career/bubble.js';

const gameDir = fileURLToPath(new URL('../', import.meta.url));
const HTML = path.join(gameDir, 'dist/game.html');
let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

if (!fs.existsSync(HTML)) { console.log('FAIL  no dist/game.html — run node build-singlefile.mjs'); process.exit(1); }

// store.js throws a save away in silence when the version does not match and starts a new life
// instead, so every check would run against the birth screen and pass nothing. Read it out of
// the source rather than writing it down here, where it would rot at the next bump.
const VERSION = (fs.readFileSync(path.join(gameDir, 'src/state/store.js'), 'utf8')
  .match(/CURRENT_VERSION = '([^']+)'/) || [])[1];
if (!VERSION) { console.log('FAIL  could not read CURRENT_VERSION from store.js'); process.exit(1); }

// ── a career with one of everything a screen knows how to draw ────────────────
// Shaped the way the game really stores these: a character is an object, a festival film has a
// festival, a season has episodes, a set has a crew with bonds on it.
const SET = { id: 'p1', title: 'Buried Hunger', type: 'Feature Film', genre: 'Crime', scale: 'feature',
  months: 6, monthsLeft: 3, prepLeft: 0, meter: 58, stability: 82, director: 'Rosalind Varga', role: 'Lead',
  salary: 600000, tier: 'lead', prestigeScore: 60,
  // Without a take on it, App.jsx shows the first-day StoryRoom over the whole screen and
  // every check below reports "no button for it". That room is a real screen and it gets its
  // own visit at the end, from a second set that has not been argued about yet.
  take: 'straight', takeWon: true, premise: 'A harbour town, a disappearance, a sister who will not leave.',
  crew: [{ id: 'c0', name: 'Rosalind Varga', role: 'Director', bond: 56, bond0: 50 },
    { id: 'c1', name: 'Zora Sorensen', role: 'Co-star', bond: 44, bond0: 44 },
    { id: 'c2', name: 'Ivo Prins', role: 'Camera Operator', bond: 49, bond0: 49 }] };

const save = {
  version: VERSION, created: true, stage: 'career', alive: true, dream: 'actor', gender: 'female',
  name: 'Alex Moon', ageY: 44, year: 2066, month: 3, city: 'Amsterdam',
  fame: 62, peakFame: 64, respect: 58, media: 24, scandal: 4, mental: 62, health: 78, strain: 14,
  acting: 74, charisma: 58, looks: 60, luck: 50, cash: 820000, quote: 900000,
  hasApartment: true, livingWith: 'own_place', housing: 'flat',
  ap: 100, apMax: 100, apMaxEff: 100,
  production: SET, productions: [SET],
  offers: [
    { id: 'o1', projectTitle: 'Sisters and Liars', role: 'Lead', type: 'Feature Film', genre: 'Drama',
      tier: 'lead', scale: 'feature', months: 3, salary: 400000, deadline: 2, prestigeScore: 58, stability: 80,
      director: 'Vera Salazar', via: 'agent' },
    { id: 'o2', projectTitle: 'Night Shift · Season 4', role: 'Series regular', type: 'TV Series', genre: 'Drama',
      tier: 'lead', scale: 'recurring', months: 5, salary: 300000, episodes: 10, season: 4, kind: 'renewal',
      deadline: 3, signed: true, startAt: 2066 * 12 + 6, prestigeScore: 52, stability: 85, director: 'Mira Croft' },
  ],
  inbox: [
    { id: 'm1', from: 'Aurora Films · business affairs', subj: 'A note about the schedule', tag: 'contract',
      kind: 'contract', read: false, body: 'We are holding the dates and will write again.',
      cta: [{ label: 'Understood', fx: {}, reply: 'Understood.' }] },
  ],
  filmography: [
    { title: 'Buried Hunger', role: 'Lead', type: 'Feature Film', genre: 'Crime', year: 2064, scale: 'feature',
      rating: 74, score: 7.4, status: 'Well-received', verdict: 'profitable', critical: 'well received',
      boxOffice: 240000000, needed: 182000000, director: 'Rosalind Varga', running: false, tier: 'lead',
      character: { name: 'Nadia Kerr', what: 'a detective who is also the suspect', tier: 'lead' },
      premise: 'A harbour town, a disappearance, a sister who will not leave.',
      onSet: ['In the film now: a four-minute monologue played in one.'],
      career: 'the right people noticed', careerTone: 'good', careerRespect: 5, careerFame: 3 },
    { title: 'WellPlanned', role: 'Lead', type: 'Festival Film', genre: 'Thriller', year: 2063, scale: 'festival',
      rating: 68, score: 6.8, status: 'Released', verdict: 'unsold', critical: 'mixed', tier: 'lead',
      director: 'Kaspar Hartigan', running: false, character: { name: 'Ilse Brandt', what: 'a forger', tier: 'lead' },
      festival: { name: 'the Croisette', result: 'unsold' } },
    { title: 'Night Shift · Season 3', role: 'Series regular', type: 'TV Series', genre: 'Drama', scale: 'recurring',
      year: 2062, season: 3, episodes: 10, rating: 75, score: 7.5, status: 'Well-received', tier: 'lead',
      verdict: 'watched', critical: 'well received', viewers: 6.4, running: false, director: 'Mira Croft',
      character: { name: 'Prue Vance', what: 'the one who stayed', tier: 'lead' } },
  ],
  releases: [], discography: [], timeline: [{ text: 'A life began.', year: 2022, month: 4 }],
  genreXP: { Crime: 40, Drama: 28 },
  awards: { wins: [{ name: 'Best Actress', body: 'The Academy', year: 2065 }], nominations: [{ name: 'Best Actress', body: 'The Academy', year: 2063 }] },
  people: [
    { id: 'pp1', name: 'Juno Vance', role: 'friend', relationship: 62, met: 2052, cold: false },
    { id: 'pp2', name: 'Rosalind Varga', role: 'director', relationship: 55, met: 2063, cold: false, weight: 70 },
  ],
  family: [
    { id: 'f1', name: 'Marta Moon', relation: 'Mother', role: 'mother', alive: true, born: 1996, relationship: 58 },
    { id: 'f2', name: 'Pelle Moon', relation: 'Brother', role: 'sibling', alive: true, born: 2024, relationship: 44 },
  ],
  partner: { id: 'f3', name: 'Tomas Berg', job: 'an architect', age: 46, relationship: 70, born: 2020 },
  staff: { assistant: true },
  castingPool: [], submissions: [], datingPool: [],
  // Back trouble rather than nothing: a healthy body is one line and a "take one" list, and the
  // Health screen's real work — the bill, the ride-it-out, the pills — is all on the ill side.
  illness: { id: 'back', name: 'Back trouble', drain: 2, cure: 420, months: 0, left: 2, serious: false },
  meds: { painkillers: 2, antibiotics: 1 },
};

// ── booting it, with the dice nailed down ─────────────────────────────────────
const SEED = '<script>(function(){var x=123456789;Math.random=function(){x^=x<<13;x>>>=0;x^=x>>17;x^=x<<5;x>>>=0;return (x>>>0)/4294967296;};})()</script>';
const seeded = fs.readFileSync(HTML, 'utf8')
  .replace('<div id="root"></div><script>',
    `<div id="root"></div><script>try{localStorage.setItem('fof_react_save',${JSON.stringify(JSON.stringify(save))})}catch(e){}</script>${SEED}<script>`);

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => { if (!/navigation to another Document/.test(e.message)) errors.push('jsdom: ' + e.message); });
// React reports a render exception through console.error before the tree comes down. Without
// this a screen could go black and the only sign would be a short page.
vc.on('error', (...a) => errors.push('console: ' + a.join(' ').slice(0, 220)));
const dom = new JSDOM(seeded, { runScripts: 'dangerously', resources: 'usable',
  url: 'https://localhost/game.html', virtualConsole: vc });
const W = dom.window, D = W.document;
W.onerror = (m) => errors.push('onerror: ' + String(m).slice(0, 220));
W.requestAnimationFrame = (f) => W.setTimeout(() => f(Date.now()), 16);
if (W.URL && !W.URL.createObjectURL) W.URL.createObjectURL = () => 'blob:stub';
W.confirm = () => false;   // nothing in a smoke test gets to end the life

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1200);

// Only what a person can read. body.textContent includes the inline bundle source, and a search
// through that once reported a bug that was not on the screen at all.
const textOf = (doc) => [...doc.body.querySelectorAll('*')]
  .filter((el) => el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE')
  .map((el) => [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join(' '))
  .join(' ').replace(/\s+/g, ' ').trim();
const visible = () => textOf(D);
const label = (b) => (b.textContent || '').replace(/\s+/g, ' ').trim();
const click = async (b) => { if (!b) return false; b.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await sleep(260); return true; };
// Emoji are surrogate pairs, so a pattern like /^📱?\s*Phone$/ without the u flag applies the ?
// to half a character and never matches — which is how the phone came back unreachable. Worse
// was what the matching ones were doing: the first button on the page reading "Home" belongs to
// the Style tab bar, not the navigation, so those screens were being "covered" by accident.
// So the navigation is addressed by what it IS — BottomNav marks every one of its buttons
// data-sfx="nav" — and text is compared with the pictures stripped out.
// ...and the pictures are not the only thing in a label. Career and Phone carry an unread
// badge, so stripping emoji leaves "Career1" and "Phone2" and neither matched. A trailing
// count is not part of the name.
const plain = (b) => label(b).replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').replace(/\d+$/, '').trim();
// And data-sfx="nav" is not unique to the bottom bar — the Style tab strip uses it too, so
// excluding everything with it also excluded four of the screens being looked for. The bottom
// bar is the LAST six of them in document order, because it renders after everything else.
const NAV6 = ['Home', 'Career', 'People', 'Style', 'Legacy', 'Phone'];
const navs = () => [...D.querySelectorAll('button[data-sfx="nav"]')]
  .filter((x) => !x.disabled && NAV6.includes(plain(x))).slice(-6);
const goNav = (name) => () => click(navs().find((b) => plain(b) === name));
// Anything that is not one of those six: a tab inside a screen, an app on the phone.
const inside = (test) => { const bar = new Set(navs());
  return [...D.querySelectorAll('button')].filter((x) => !x.disabled && !bar.has(x)).find((x) => test(plain(x))); };
const press = (test) => () => click(inside(typeof test === 'function' ? test : (t) => t === test));

ok('the save loaded into a career rather than a birth screen', /Alex Moon/.test(visible()), visible().slice(0, 90));
ok('nothing threw while it booted', errors.length === 0, errors.slice(0, 2).join(' | '));

// ── every screen ──────────────────────────────────────────────────────────────
// A screen is covered when it draws words. The floor is deliberately low: this is not a test of
// what a screen says, it is a test of whether React got through it. An exception leaves an empty
// root, which is nowhere near 120 characters.
const FLOOR = 120;
// How much of what is on screen has to be NEW. Measuring the whole page instead does not work
// and I had it that way first: a tab whose contents render as nothing still sits under a header,
// a stat block and a tab strip, which is six hundred characters of chrome. Emptying a screen
// entirely left the test green. What a dead screen actually looks like is a switch that brings
// nothing with it, so what gets measured is the text that was not there a moment ago.
const MIN_NEW = 40;
const bag = (t) => { const m = new Map(); for (const w of t.split(' ')) if (w) m.set(w, (m.get(w) || 0) + 1); return m; };
const freshChars = (before, after) => { const b = bag(before); let n = 0;
  for (const w of after.split(' ')) { if (!w) continue; const have = b.get(w) || 0; if (have) b.set(w, have - 1); else n += w.length + 1; }
  return n; };
const seen = [], missed = [];
const visit = async (name, go) => {
  const errs = errors.length;
  const was = visible();
  const got = await go();
  if (!got) { missed.push(name + ' (could not get there)'); ok(`${name}: reachable`, false, 'no button for it'); return; }
  const text = visible();
  const nodes = D.body.querySelectorAll('*').length;
  const threw = errors.slice(errs);
  if (threw.length) { missed.push(name + ' (threw)'); ok(`${name}: nothing threw`, false, threw[0]); return; }
  if (text.length < FLOOR || nodes < 25) { missed.push(name + ' (blank)'); ok(`${name}: has something on it`, false, `${text.length} chars, ${nodes} nodes`); return; }
  const fresh = freshChars(was, text);
  if (fresh < MIN_NEW) { missed.push(name + ' (brought nothing)'); ok(`${name}: brought something of its own`, false, `${fresh} new characters`); return; }
  seen.push(name);
  ok(`${name}`, true);
};

ok('the navigation has all six of its tabs', navs().length === 6, navs().map(plain).join(', '));

// The tab a screen opens ON is visited LAST. Pressing the tab you are already looking at brings
// nothing new by definition, and that is indistinguishable from a tab that renders nothing.
await visit('Career', goNav('Career'));
for (const t of ['Training', 'Filmography', 'Events', 'Calendar']) await visit('Career · ' + t, press(t));
await visit('People', goNav('People'));
for (const t of ['Contacts', 'Family']) await visit('People · ' + t, press(t));
await visit('Style', goNav('Style'));
for (const t of ['People', 'Things', 'Body', 'Home']) await visit('Style · ' + t, press(t));
await visit('Legacy', goNav('Legacy'));
await visit('Home', goNav('Home'));

// The numbers on Home that open a screen of their own, and the passport behind your face with
// the room behind that. A Stat is a div with an onClick, not a button, so these are found by the
// label they print. Each is left by its own back control, which puts Home back underneath for
// the next one — and if it does not, the next tile is not there and that is the failure.
const tile = (name) => () => click([...D.querySelectorAll('div')]
  .find((d) => d.style.cursor === 'pointer' && d.firstElementChild && label(d.firstElementChild) === name));
const back = () => click([...D.querySelectorAll('button')].find((b) => ['Back', 'Close the door'].includes(plain(b))));
for (const [name, on] of [['Health', 'Health'], ['Mental', 'Mental'], ['Fame', 'Fame'], ['Genres', 'Acting'], ['Standing', 'Standing']]) {
  await visit('Home · ' + name, tile(on));
  await back();
}
await visit('Passport', () => click(D.querySelector('div[title="Who you are"]')));
// The Directors bar is the one faction that opens: the names it is made of.
await visit('Passport · The directors', press((t) => t.startsWith('The directors')));
await back();
await visit('Passport · Your room', press('Your room'));
await back();

await visit('Phone', goNav('Phone'));

// The phone's apps come from a registry, so the test knows what SHOULD be there rather than
// only what it happened to find — an app added later is reported as uncovered instead of
// quietly never being visited.
const apps = visibleApps(save).filter((a) => !(a.lock && a.lock(save)));
for (const app of apps) {
  await visit('Phone · ' + app.name, async () => {
    await click(inside((t) => t === 'Apps'));                  // out of whichever app is open
    await click(navs().find((b) => plain(b) === 'Phone'));     // and onto the phone itself
    return click(inside((t) => t === app.name || t.endsWith(app.name)));
  });
}

// The Guide opens on Fame; the Directors section is where the Directors screen sends you.
await visit('Phone · Guide · Directors', async () => {
  await click(inside((t) => t === 'Apps'));
  await click(navs().find((b) => plain(b) === 'Phone'));
  await click(inside((t) => t === 'Guide' || t.endsWith('Guide')));
  return click(inside((t) => t === 'Directors'));
});

// ── screens that only exist in a particular state ─────────────────────────────
// Some screens are not reached by pressing anything: they take the whole page over when the life
// is in a certain state — an ultimatum about the drinking, a set nobody has argued about yet, a
// death — and some cards on Home only draw when there is something to say. Each of these boots
// the same save again with that state written into it and asserts what the walk asserts: nothing
// threw, and words that only that component prints are on the page.
// `go`, when given, is pressed through inside the booted page before it is read — for a screen
// that a state alone does not put up, but that is reached by a tap from one it does.
const drawWith = async (patch, go) => {
  const html = fs.readFileSync(HTML, 'utf8').replace('<div id="root"></div><script>',
    `<div id="root"></div><script>try{localStorage.setItem('fof_react_save',${JSON.stringify(JSON.stringify({ ...save, ...patch }))})}catch(e){}</script>${SEED}<script>`);
  const errs = [];
  const vc2 = new VirtualConsole();
  vc2.on('jsdomError', (e) => { if (!/navigation to another Document/.test(e.message)) errs.push('jsdom: ' + e.message); });
  vc2.on('error', (...a) => errs.push('console: ' + a.join(' ').slice(0, 220)));
  const d2 = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://localhost/game.html', virtualConsole: vc2 });
  const W2 = d2.window;
  W2.onerror = (m) => errs.push('onerror: ' + String(m).slice(0, 220));
  W2.requestAnimationFrame = (f) => W2.setTimeout(() => f(Date.now()), 16);
  if (W2.URL && !W2.URL.createObjectURL) W2.URL.createObjectURL = () => 'blob:stub';
  W2.confirm = () => false;
  await sleep(1200);
  if (go) await go(W2);
  const text = textOf(W2.document);
  W2.close();
  return { text, errs };
};
const inState = async (name, patch, words, go) => {
  const { text, errs } = await drawWith(patch, go);
  if (errs.length) { missed.push(name + ' (threw)'); ok(`${name}: nothing threw`, false, errs[0]); return; }
  if (!words.test(text)) { missed.push(name + ' (not drawn)'); ok(`${name}: drew its own words`, false, text.slice(0, 140)); return; }
  seen.push(name);
  ok(name, true);
};
const NOW = 2066 * 12 + 3;
await inState('Home · not well', { mental: 30, depression: { since: NOW - 5, sessions: 1, checks: 0, passed: 0,
  windowMonths: 2, windowSessions: 1, windowRests: 0, medMonths: 0, medsThisMonth: false, pending: null } }, /You are not well/);
await inState('The drink ultimatum', { drink: { level: 62, thisMonth: false,
  pending: { title: 'Tomas has had enough', body: 'He says it once, at the kitchen table, and then he waits.' } } }, /Tomas has had enough/);
// The negotiation: opened by the system that opens it, on a renewal it would really call a
// meeting about, rather than by writing a standoff out by hand that the game might not recognise.
{
  const s = JSON.parse(JSON.stringify(save));
  const o = { id: 'o3', kind: 'renewal', tier: 'lead', projectTitle: 'Night Shift · Season 4', role: 'Series regular',
    type: 'TV Series', genre: 'Drama', scale: 'recurring', season: 4, episodes: 10, episodeFee: 30000, salary: 300000, months: 5 };
  s.offers = [...s.offers.filter((x) => x.id !== 'o2'), o];
  callTheRoom(s, o);
  ok('the negotiation was really called', !!s.standoff, s.lastEvent);
  if (s.standoff) s.standoff.open = true;
  await inState('The negotiation room', { offers: s.offers, standoff: s.standoff }, /Your leverage/);
}
// A set nobody has argued about yet opens on the first day, over everything.
await inState('The first day', { productions: [{ ...SET, take: undefined, takeWon: undefined }],
  production: { ...SET, take: undefined, takeWon: undefined } }, /They listen to standing, not volume/);
await inState('The end of a life', { alive: false, ageY: 81, year: 2103, causeOfDeath: 'old age' }, /A life, ended/);
// With somebody left to carry it on: the heirs only draw when there is a child alive.
await inState('The end of a life · heirs', { alive: false, ageY: 81, year: 2103, causeOfDeath: 'old age',
  family: [...save.family, { id: 'f9', name: 'Ines Moon', relation: 'Child', role: 'child', alive: true, born: 2070,
    relationship: 66, looks: 60, acting: 30, charisma: 50 }] }, /They are still here/);
// The cards on Home that draw only when there is something to say. Where you stand is about
// the save as it is; the other three need the state their own system writes.
await inState('Home · where you stand', {}, /Where you stand/);
// An awards campaign is offered only for this year's work that rated well enough, before the
// nominations; a brand deal and a season on the bubble are written by the systems that sign them.
await inState('Home · for your consideration', { filmography: [...save.filmography,
  { title: 'The Long Quiet', role: 'Lead', type: 'Feature Film', genre: 'Drama', year: 2066, scale: 'feature',
    rating: 82, score: 8.2, status: 'Well-received', verdict: 'profitable', critical: 'acclaimed', tier: 'lead',
    director: 'Vera Salazar', running: false }] }, /For your consideration/);
{
  const s = JSON.parse(JSON.stringify(save));
  signEndorsement(s, { projectTitle: 'Brand Campaign — the face of Maison Lune', from: 'Maison Lune', salary: 1500000, brandFor: 12 });
  await inState('Home · the brand deal', { endorsement: s.endorsement }, /Maison Lune/);
  const t = JSON.parse(JSON.stringify(save));
  hangIt(t, t.filmography[2], { title: 'Night Shift · Season 4', role: 'Series regular' }, 48);
  await inState('Home · a season on the bubble', { bubbles: t.bubbles }, /Nobody has decided/);
}
// The directors behind the Passport bar: one warm from a set, one cold who walked out on, and the
// grudge that walk-off filed (production.js walkOffSet's shape) — reached the way a player
// reaches it, through the face and the bar.
{
  const people = [{ id: 'dw', name: 'Rosalind Varga', role: 'Film Director', relationship: 72, industryWeight: 70, fromSet: 'Buried Hunger' },
    { id: 'dc', name: 'Kaspar Hartigan', role: 'Film Director', relationship: 8, industryWeight: 76, cold: true, fromSet: 'WellPlanned' },
    // Cold with no grudge: the screen says what the state can say (yourDirectors.js coldWhy).
    { id: 'dz', name: 'Zora Whitlock', role: 'Film Director', relationship: 0, industryWeight: 70, cold: true, fromSet: 'Night Shift', lastSeen: NOW - 30 }];
  const grudges = [{ who: 'Kaspar Hartigan', title: 'North Window', scale: 'feature', since: NOW - 49, due: NOW - 49 + 9999, until: NOW + 11, hit: false, gross: 0, opened: true }];
  const tap = async (W2, find) => { const el = find(W2.document); if (el) el.dispatchEvent(new W2.MouseEvent('click', { bubbles: true })); await sleep(300); };
  await inState('Passport · the directors, warm, cold and a grudge', { people, grudges },
    /^(?=[\s\S]*Rosalind Varga Warm)(?=[\s\S]*Relationship · 72)(?=[\s\S]*Kaspar Hartigan Cold)(?=[\s\S]*Relationship · 8)(?=[\s\S]*Grudge · Until Mar 2067 · 11 months left)(?=[\s\S]*Walked off the set of "North Window")(?=[\s\S]*on set now: "Buried Hunger")(?=[\s\S]*Kaspar Hartigan holds a grudge until Mar 2067\.)(?=[\s\S]*Faded No word between you since Oct 2063 — 2 years\.)(?![\s\S]*call you again)/,
    async (W2) => {
      await tap(W2, (d) => d.querySelector('div[title="Who you are"]'));
      await tap(W2, (d) => [...d.querySelectorAll('button')].find((b) => /^The directors/.test((b.textContent || '').trim())));
    });
}
// The set asking for something this month: the row with the answers, on Home and in the Calendar.
{
  const asked = { ...SET, demand: { id: 'nights', at: NOW } };
  await inState('Home · they want an answer', { productions: [asked], production: asked }, /Three weeks of nights/);
}

console.log();
console.log('      covered (' + seen.length + '): ' + seen.join(', '));
console.log('      NOT covered (' + missed.length + '): ' + (missed.join(', ') || 'nothing'));
// What this file still does not reach, said out loud so nobody reads a green run as more than
// it is. These need a state the save cannot simply assert into being, or a flow to walk.
console.log('      still uncovered by any test: the contract room, the scene minigames themselves,');
console.log('      the awards night, the creator.');

ok('every screen that exists was reached and drew something', missed.length === 0, missed.join(', '));
ok('and nothing threw anywhere in the whole walk', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
