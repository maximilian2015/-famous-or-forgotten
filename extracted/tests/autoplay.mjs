// An autoplayer that drives the REAL interface.
//
// The 44 probes in tests/probes all call engine functions directly. Not one of them touches a
// screen, which is why the whole suite was green on the day a negotiation room had four buttons
// that did nothing: the offer had expired out from under it, every handler returned early, and
// the only person who could find that was Maxi, playing. This is the thing that finds it next
// time.
//
//   node tests/autoplay.mjs            one life, default length
//   node tests/autoplay.mjs 5 400      five lives, 400 clicks each
//   node tests/autoplay.mjs 1 200 -v   and say what it is clicking
//
// It is not a test of whether the game is FUN. It answers three questions a unit test cannot:
// did anything throw, did a button do nothing at all, and how far can a life actually get.
//
// WHAT IT DOES NOT DO, stated plainly so nobody trusts it further than it goes: it does not
// land acting parts. An audition is a minigame - auditionFor(id, quality), and the quality
// comes from a timing bar - so a thing that clicks buttons fails them, the same way a bad
// actor would. It therefore exercises everything up TO a career and almost nothing inside
// one, which is exactly where this week has been finding bugs. Extending it to the career
// half means either playing the minigames or a test-only way to pass them, and that is the
// obvious next thing to build.
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const gameDir = fileURLToPath(new URL('../', import.meta.url));
const HTML = path.join(gameDir, 'dist/game.html');
if (!fs.existsSync(HTML)) {
  console.log('No dist/game.html — run `node build-singlefile.mjs` first.');
  process.exit(1);
}
const html = fs.readFileSync(HTML, 'utf8');

const LIVES = Number(process.argv[2] || 1);
const STEPS = Number(process.argv[3] || 300);
const LOUD = process.argv.includes('-v');

// Anything that would end the run or wipe the save. The autoplayer is here to play a life, not
// to keep starting new ones.
const AVOID = /start anew|new life|reset|delete|export|import|wipe|hall of fame/i;
// What moves time on. Clicking these is how a career happens at all; everything else is a
// detour, and a detour is where the bugs are.
// The real labels, read off App.jsx rather than guessed. The first version looked for 'next
// month' and the button is called '▶ Live one month', so the autoplayer almost never pressed
// it: three lives, 750 clicks, and not one of them ever reached a film set.
const ADVANCE = /live one (month|year)|live until|be born|^continue$|^go on$/i;
// The navigation bar. Pressing the tab you are already on correctly does nothing, so these
// are counted apart rather than drowning the list that matters.
const NAV = /^(🏠|🎬|❤️|📱|🛍️|🏆)|^(Home|Career|People|Phone|Style|Legacy)$/;
// The handful of presses a career is actually made of. Pressed whenever they are available
// and enabled, before anything else.
// Found by watching it fail: a character who answers every prompt and presses time for
// seventy-eight years ends up broke, homeless and never acts in anything. The money is in the
// phone, in the Work app, behind a button that says 'Take it' - three screens deep and
// discoverable only by exploring. So the autoplayer carries a small map of the critical path:
//
//   a job (phone -> Work -> Take it)  ->  cash  ->  a rented room  ->  stage 'career'  ->  parts
//
// Writing it down is itself a finding: that is how far a new player has to get on their own.
const GATE = /^take it$|move into a rented room|audition|accept|^sign|shift at|apply for|take the part/i;
// And how to reach it. Opened when the thing it leads to has not happened yet.
const ROUTE = /^(📱Phone|💼Work|Work)$/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function live(seed) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('threw: ' + e.message));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ').slice(0, 200)));

  const dom = new JSDOM(html, {
    runScripts: 'dangerously', resources: 'usable',
    // An http origin, not file://. jsdom gives a file:// page an opaque origin where
    // localStorage silently does nothing — so every life reported zero credits, no year and
    // no age, and the numbers looked like the game rather than like the harness.
    url: 'https://localhost/game.html',
    virtualConsole: vc,
  });
  const W = dom.window, D = W.document;
  // jsdom does not implement these two. Left alone they surface as 'the game threw', which
  // is the harness blaming its subject for its own gaps: the arcade game uses rAF and the
  // save-to-file button uses createObjectURL, and both work perfectly in a real browser.
  if (!W.requestAnimationFrame) {
    W.requestAnimationFrame = (fn) => W.setTimeout(() => fn(Date.now()), 16);
    W.cancelAnimationFrame = (id) => W.clearTimeout(id);
  }
  // Same again: jsdom has no confirm/alert/prompt, and a game that asks 'are you sure?' would
  // otherwise be reported as having crashed.
  W.confirm = () => true; W.alert = () => {}; W.prompt = () => '';
  if (W.URL && !W.URL.createObjectURL) {
    W.URL.createObjectURL = () => 'blob:stub';
    W.URL.revokeObjectURL = () => {};
  }
  W.onerror = (msg) => errors.push('window.onerror: ' + String(msg).slice(0, 200));
  W.addEventListener('unhandledrejection', (e) => errors.push('unhandled: ' + String(e.reason).slice(0, 200)));
  // A fresh life every time, not whatever the last run left behind.
  try { W.localStorage.clear(); } catch (e) { /* private mode, nothing to clear */ }

  await sleep(900);

  const shot = () => (D.body.textContent || '').replace(/\s+/g, ' ');
  const buttons = () => Array.from(D.querySelectorAll('button')).filter((b) => !b.disabled);
  const label = (b) => (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);

  const dead = [];          // a button that changed nothing at all
  let ended = false;        // ran out of things it was willing to press
  const seen = new Set();   // screens visited, by their first eighty characters
  let clicks = 0, stuck = 0;

  for (let i = 0; i < STEPS; i++) {
    const before = shot();
    if (!before) { errors.push('the screen went blank'); break; }
    seen.add(before.slice(0, 80));

    const all = buttons().filter((b) => !AVOID.test(label(b)));
    // Not an error: a life that has ended, or a screen whose only ways out are the ones this
    // refuses to press. Counted separately, because calling it a crash would be the harness
    // blaming the game for the harness's own stopping condition.
    if (!all.length) { stuck++; if (stuck > 3) { ended = true; break; } await sleep(60); continue; }
    stuck = 0;

    // Mostly move time on, sometimes wander. The wandering is the point: a screen nobody
    // visits is a screen nobody tests.
    // A gate first, if one is open. Then mostly move time on, and now and again wander —
    // because a screen nobody visits is a screen nobody tests.
    const gates = all.filter((b) => GATE.test(label(b)));
    const movers = all.filter((b) => ADVANCE.test(label(b)));
    // The navigation bar is six buttons that are ALWAYS on screen, so a uniform random pick
    // spends most of a life changing tabs. Measured: 400 clicks, and barely any of them landed
    // on anything a career is made of. Tabs get one press in six; the rest goes to content.
    // Down-weighting the tabs alone made it worse, not better: the one press a career needs -
    // renting a room - lives on Home, so an autoplayer that never navigates never finds it and
    // all three lives died at thirty-six still living with their parents. It needs a ROUTE, not
    // a weighting. So: take a gate if one is showing, otherwise go back to Home every few
    // presses to see whether one has opened, otherwise move time on, otherwise wander.
    const home = all.find((b) => /^(🏠)?Home$/.test(label(b)));
    // No money and no job yet: go and find the Work app rather than wandering into it by luck.
    let broke = false;
    try { const sv = JSON.parse(W.localStorage.getItem('fof_react_save') || 'null');
      broke = !!sv && (sv.stage === 'moving_out' || sv.stage === 'teen') && !sv.job; } catch (e) { broke = false; }
    const route = broke ? all.find((b) => ROUTE.test(label(b))) : null;
    const content = all.filter((b) => !NAV.test(label(b)));
    const pool = gates.length ? gates
      : (route && i % 3 === 0) ? [route]
      : (home && i % 9 === 0) ? [home]
      : (movers.length && i % 3 !== 0) ? movers
      : (content.length && i % 5 !== 0) ? content
      : all;
    const btn = pool[Math.floor(Math.random() * pool.length)];
    const name = label(btn);

    btn.dispatchEvent(new W.MouseEvent('click', { bubbles: true, cancelable: true }));
    clicks++;
    await sleep(45);
    const after = shot();

    if (after === before) {
      // It was enabled, it was pressed, and the screen is identical. Either it is genuinely
      // inert or it needed a moment — so give it one before accusing it.
      await sleep(180);
      if (shot() === before) dead.push(name);
    }
    if (LOUD) console.log(`  ${String(i).padStart(3)} ${after === before ? '·' : '→'} ${name}`);
  }

  // How far the life actually got — read out of the save, not scraped off the screen. The
  // first version regexed the body for a year and reported that all three lives reached
  // "2048" every time. 2048 is the arcade game in the phone. A number that comes out
  // identical three runs running is a reason to check the instrument, not to believe it.
  let save = null;
  try { save = JSON.parse(W.localStorage.getItem('fof_react_save') || 'null'); } catch (e) { save = null; }
  const year = save && save.year ? save.year : null;
  const age = save && save.ageY ? save.ageY : null;
  const credits = save ? ((save.filmography || []).length + (save.discography || []).length) : 0;
  const fame = save ? Math.round(save.fame || 0) : 0;
  const stage = save ? save.stage : null;
  const counts = {}, navCounts = {};
  for (const d of dead) (NAV.test(d) ? navCounts : counts)[d] = ((NAV.test(d) ? navCounts : counts)[d] || 0) + 1;

  dom.window.close();
  return { clicks, screens: seen.size, errors, dead: counts, nav: navCounts, age, year, credits, fame, stage, ended };
}

console.log(`AUTOPLAY — ${LIVES} ${LIVES === 1 ? 'life' : 'lives'}, up to ${STEPS} clicks each.\n`);
let bad = 0;
const allDead = {}, allErr = [];
for (let n = 1; n <= LIVES; n++) {
  const r = await live(n);
  const deadList = Object.entries(r.dead).sort((a, b) => b[1] - a[1]);
  for (const [k, v] of deadList) allDead[k] = (allDead[k] || 0) + v;
  for (const e of r.errors) allErr.push(e);
  const ok = !r.errors.length;
  if (!ok) bad++;
  console.log(`  life ${n}: ${r.clicks} clicks · ${r.screens} screens`
    + (r.age ? ` · age ${r.age}` : '') + (r.year ? ` in ${r.year}` : '')
    + (r.stage ? ` · ${r.stage}` : '')
    + ` · ${r.credits} credit${r.credits === 1 ? '' : 's'} · fame ${r.fame}`
    + (r.ended ? ' · ran out of moves' : '')
    + ` · ${r.errors.length} error${r.errors.length === 1 ? '' : 's'}`
    + ` · ${deadList.length} inert`);
}

if (allErr.length) {
  console.log('\nTHINGS THAT THREW');
  const uniq = {};
  for (const e of allErr) uniq[e] = (uniq[e] || 0) + 1;
  for (const [e, n] of Object.entries(uniq).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`  ${String(n).padStart(3)}x  ${e}`);
  }
}

const deadSorted = Object.entries(allDead).sort((a, b) => b[1] - a[1]);
if (deadSorted.length) {
  console.log('\nBUTTONS THAT WERE PRESSED AND DID NOTHING');
  console.log('  (Some are honest — a tab you are already on, a card that only highlights.');
  console.log('   A button near the top of this list that should DO something is a bug.)');
  for (const [name, n] of deadSorted.slice(0, 20)) console.log(`  ${String(n).padStart(3)}x  ${name}`);
}

console.log(`\n${LIVES - bad}/${LIVES} lives ran without throwing.`);
process.exit(bad ? 1 : 0);
