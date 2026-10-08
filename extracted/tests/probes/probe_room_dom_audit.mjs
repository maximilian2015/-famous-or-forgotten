// Regression from the 73edbb9 audit. Assert the NEW, agreed behaviour through
// the REAL built JSX and store.dispatch, not a mock component.
// Build first: node build-singlefile.mjs
// Run: node tests/probes/probe_room_dom_audit.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { createInitialState } from '../../src/state/initialState.js';
import { draftContract } from '../../src/systems/career/contract.js';
import { callTheRoom, standoffTick } from '../../src/systems/career/standoff.js';

const s = { ...createInitialState({ created: true }), name: 'Audit Actor', ageY: 35, stage: 'career',
  hasApartment: true, livingWith: 'alone', fame: 80, peakFame: 80, respect: 60, acting: 80,
  cash: 1e7, year: 2058, month: 0, productions: [], inbox: [], people: [], ap: 100,
  apMax: 100, apMaxEff: 100, talent: 95, genreXP: {},
  filmography: [{ title: 'Black Harbor · season 2', type: 'Drama Series', season: 2,
    year: 2057, rating: 80, openViewers: 4, endViewers: 4.5, viewers: 4.3, running: false, renewal: 'renewed' }] };
const o = { id: 'renewal', projectTitle: 'Black Harbor · season 3', seriesTitle: 'Black Harbor',
  kind: 'renewal', role: 'Lead', tier: 'lead', type: 'Drama Series', genre: 'Drama', scale: 'recurring',
  season: 3, episodes: 10, episodeFee: 100000, salary: 1000000, perEpisode: true,
  months: 5, prestigeScore: 80, stability: 95, deadline: 3,
  character: { name: 'Ethan Cole', what: 'the son who stayed', tier: 'lead' },
  premise: 'The son who stayed.', potential: 'open' };
let seed = 1;
const random = Math.random;
try {
  Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  s.offers = [o]; draftContract(s, o); callTheRoom(s, o);
  assert.ok(s.standoff, 'fixture did not book a room');
  s.year = Math.floor(s.standoff.due / 12); s.month = s.standoff.due % 12;
  standoffTick(s);
} finally { Math.random = random; }
s.openContract = o.id;
const expected = { ...s.standoff.pack };
const html = fs.readFileSync(new URL('../../dist/game.html', import.meta.url), 'utf8');
const sourceVersion = fs.readFileSync(new URL('../../src/state/store.js', import.meta.url), 'utf8')
  .match(/CURRENT_VERSION = '([^']+)'/)[1];
s.version = sourceVersion;
const errors = [], vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(e.message));
vc.on('error', (...args) => errors.push(args.join(' ').slice(0, 250)));
const dom = new JSDOM(html, { url: 'https://localhost/game.html', runScripts: 'dangerously',
  resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) { w.localStorage.setItem('fof_react_save', JSON.stringify(s)); } });
const w = dom.window, d = w.document;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const readSave = () => JSON.parse(w.localStorage.getItem('fof_react_save'));
// Read visible text nodes only; body.textContent includes the entire inline bundle.
const text = () => [...d.body.querySelectorAll('*')].filter(el => !['SCRIPT', 'STYLE'].includes(el.tagName))
  .map(el => [...el.childNodes].filter(c => c.nodeType === 3).map(c => c.textContent).join(' '))
  .join(' ').replace(/\s+/g, ' ');
async function press(label) {
  const b = [...d.querySelectorAll('button')].find(el => el.textContent.trim() === label);
  assert.ok(b, `no button: ${label}`); assert.equal(b.disabled, false, `disabled button: ${label}`);
  b.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await delay(350);
}
try {
  await delay(1100);
  assert.match(text(), /The meeting/, 'the fixture was not loaded into RoomModal');
  assert.match(text(), /season 3/, 'the meeting should name the offered season');
  assert.doesNotMatch(text(), /season 4/, 'the meeting added an extra season');
  await press('Shake on it');
  const shaken = readSave();
  assert.equal(shaken.standoff, null);
  assert.equal(shaken.offers[0].episodeFee, expected.fee, 'handshake control');
  assert.equal(shaken.offers[0].contract.clauses.find(c => c.id === 'fee').value, expected.fee);
  const paperFee = `€${expected.fee.toLocaleString()} an episode, ${expected.episodes} episodes — €${(expected.fee * expected.episodes).toLocaleString()}`;
  assert.ok(text().includes(paperFee), 'the visible contract still displays the pre-meeting fee/episodes');
  await press('Sign it');
  const signed = readSave(), p = signed.productions.find(x => x.offerId === o.id);
  assert.ok(p, 'signing did not actually start a production');
  assert.equal(p.episodeFee, expected.fee);
  assert.equal(p.salary, expected.fee * expected.episodes);
  assert.equal(p.episodes, expected.episodes);
  assert.equal(errors.length, 0, errors.join(' | '));
  console.log(JSON.stringify({ surface: 'built JSX in jsdom (not a real-browser visual check)',
    offeredSeason: 3, displayedSeason: 3,
    displayedPaperFee: paperFee,
    agreed: { fee: expected.fee, episodes: expected.episodes, total: expected.fee * expected.episodes },
    signed: { fee: p.episodeFee, episodes: p.episodes, total: p.salary }, uiErrors: errors }, null, 2));
  console.log('all agreed DOM behaviour passed through enabled buttons');
} finally { dom.window.close(); }
