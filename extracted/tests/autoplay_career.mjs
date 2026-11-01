// A career through the REAL interface: OpenCall → the read → the offer → the contract room →
// the shoot and its days → the premiere → the next one. tests/autoplay.mjs explores a life from
// birth and never lands a part — an audition is a minigame, and a thing that only presses
// buttons cannot play one (it never even saw the timing bar: it is a div, not a button). This
// one plays them, and starts from a young actor's first month in a rented room, so the clicks go
// on the career rather than on the childhood.
//
//   node tests/autoplay_career.mjs                 the fixed career (the regression test)
//   node tests/autoplay_career.mjs stress 6 1500   six random careers, 1500 clicks each
//   add -v to say every click
//
// Two modes (Maxi/ChatGPT, 29 Oct):
//   career   One seed, one policy, the same life every run. It must get through the whole loop at
//            least once — read, part, paper, shoot, premiere, next project — and say which step it
//            reached when it does not. The policy plays as a fair human would: the bar on the beat,
//            three tiles and stop, the take left to the character on the day.
//   stress   A new seed per life and every choice at random: reads blown on purpose, offers
//            passed, days played by hand, the first answer or any answer. What it looks for is a
//            screen it cannot leave, an error, a broken rule in the save, a save that will not
//            read back.
//
// It changes nothing in the game. A step that fails is reported as the game's, with the screen
// it happened on; a step the harness cannot play (a minigame it has no hands for) is reported
// as the harness's.
import { bootGame, sleep, rng } from './helpers/ui.mjs';

const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const LOUD = process.argv.includes('-v');
const MODE = args[0] === 'stress' ? 'stress' : 'career';
const LIVES = MODE === 'stress' ? Number(args[1] || 4) : 1;
const STEPS = Number(args[MODE === 'stress' ? 2 : 1] || (MODE === 'stress' ? 1200 : 1600));

const AVOID = /start anew|new life|reset|delete|export|import|wipe|hall of fame|💾|🔊|🔇|late show|retire|walk off|quit/i;
const NAV = /^(🏠|🎬|❤️|📱|🛍️|🏆)|^‹ Apps$/;
const ADVANCE = /^▶ Live one month$/;
const FULL = process.argv.includes('--full');   // the fixed career to the end of its presses, not just once round
// The phone's button carries a count when something is waiting ('📱Phone4'), and Home has a
// shortcut straight to the offers ('📨 2 offers waiting in Messages').
const PHONE = /Phone\d*\+?$/, MESSAGES = /Messages$|offers? waiting in Messages/;
const HANDS = new Set(['timing', 'grid', 'quick']);   // the scene minigames it can play with a mouse

// The young actor, made the way every probe makes one (tests/probes/probe_invariants.mjs).
async function firstMonth(seed) {
  const P = new URL('../src/', import.meta.url).href;
  const { createInitialState } = await import(P + 'state/initialState.js');
  const { beginLife } = await import(P + 'systems/life/origin.js');
  const keep = Math.random; Math.random = rng(seed);
  try {
    const t = createInitialState({ name: 'Ada Reel', dream: 'actor', created: true, gender: seed % 2 ? 'female' : 'male' });
    beginLife(t);
    Object.assign(t, { stage: 'career', ageY: 22, year: 2050, month: 0, hasApartment: true, livingWith: 'own_place', housing: 'room',
      cash: 12000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, acting: Math.max(t.acting || 0, 55) });
    return t;
  } finally { Math.random = keep; }
}

async function career(seed, mode) {
  const pick = rng(seed * 7919 + 1);                     // the harness's own dice, apart from the game's
  const rand = (a) => a[Math.floor(pick() * a.length)];
  const g = await bootGame({ seed, save: await firstMonth(seed) });
  const { W, D, label, click } = g;
  const buttons = () => g.buttons().filter((b) => !AVOID.test(label(b)));
  const find = (re) => buttons().find((b) => re.test(label(b)));
  // Back to the phone's apps. Inside an app, Phone is the tab you are already on and does nothing;
  // the way out is ‹ Apps.
  const toApps = () => press(find(/^‹ Apps$/) || find(PHONE));
  const press = async (b, ms = 110) => { if (!b) return false; if (LOUD) console.log(`    ${label(b)}`); click(b); n.clicks++; await sleep(ms); return true; };
  const n = { clicks: 0, reads: 0, won: 0, offers: 0, papers: 0, signed: 0, shoots: 0, days: 0, daysByHand: 0, premieres: 0, credits: 0, films: 0, series: 0, cycles: 0, months: 0 };
  const harness = {};                                    // minigames it had no hands for
  const stuck = [];
  const shoots = new Set(), credited = new Set(), premiered = new Set(), offered = new Set(), papers = new Set();
  let tried = new Set(), triedMonth = -1, opened = null, steps = 0;
  let phase = 'start', lastShot = '', same = 0, from = null, idle = 0;

  // ── the minigames it can play with a mouse ──
  async function timingBar(aim) {
    for (let k = 0; k < 600; k++) {
      const zone = [...D.querySelectorAll('div')].find((d) => /95,\s*206,\s*138,\s*0?\.4\)/.test(d.style.background));
      if (!zone) return false;
      const bar = zone.parentElement, mk = bar.children[1];
      const zl = parseFloat(zone.style.left), zw = parseFloat(zone.style.width);
      const pos = parseFloat(((mk.style.left || '').match(/calc\(([\d.]+)%/) || [])[1]);
      if (Math.abs(pos - (zl + zw / 2)) < zw * aim) { click(bar); n.clicks++; await sleep(250); return true; }
      await sleep(3);
    }
    return false;
  }
  async function grid(take) {
    for (let i = 0; i < take; i++) { const t = buttons().filter((b) => label(b) === '?'); if (!t.length) break; await press(t[mode === 'career' ? 0 : Math.floor(pick() * t.length)], 70); }
    if (!(await press(find(/^Stop here$/), 900))) await sleep(900);   // a wrong tile ends it on its own, after a beat
  }
  const hasBar = () => [...D.querySelectorAll('div')].some((d) => /95,\s*206,\s*138,\s*0?\.4\)/.test(d.style.background));
  const hasGrid = () => !!find(/^Stop here$/) || buttons().some((b) => label(b) === '?');
  async function minigame(blow) {
    if (hasBar()) return timingBar(blow ? 3 : 0.25);
    if (hasGrid()) { await grid(blow ? 7 : 3); return true; }
    return false;
  }

  // ── what the save says is in front of you ──
  function observe(s) {
    for (const o of s.offers || []) if (o.kind !== 'brand' && !offered.has(o.id)) { offered.add(o.id); n.offers++; if (o.via === 'casting') n.won++; }   // a yes to a read is an offer that came via casting
    for (const p of s.productions || []) { const k = p.id || p.title; if (!shoots.has(k)) { shoots.add(k); n.shoots++; } }
    for (const c of s.filmography || []) {
      const k = (c.projectId || '') + c.title;
      if (!credited.has(k) && !c.minor) { credited.add(k); if (from != null && (c.year || 0) >= from) { n.credits++; if (/Series|Soap|season/i.test((c.type || '') + ' ' + (c.title || ''))) n.series++; else n.films++; if (c.rating != null) n.cycles++; } }
    }
    // The night it comes out: a premiere card, or a verdict card for what goes straight to a screen (career/release.js).
    // It is the card's id that says so; its kind is good or bad.
    for (const m of [s.bigMoment, ...(s.moments || [])]) if (m && (m.id === 'premiere' || m.id === 'verdict') && m.title && !premiered.has(m.title)) { premiered.add(m.title); n.premieres++; }
  }

  for (let i = 0; i < STEPS; i++) {
    const s = g.save();
    if (!s) { stuck.push('no save'); break; }
    if (from == null) from = s.year;
    if (s.alive === false) { phase = 'died'; break; }
    observe(s);
    // The regression test needs the loop once and the start of the next one, not a whole life.
    if (mode === 'career' && !FULL && n.cycles >= 1 && n.shoots >= 2) { phase = 'the next project'; break; }
    const shot = g.shot();
    if (buttons().length) idle = 0;
    same = shot === lastShot ? same + 1 : 0; lastShot = shot;
    if (same >= 12) { stuck.push(`${phase}: the same screen for 12 presses — ${shot.slice(0, 140)}`); break; }
    const sets = (s.productions || []).length;
    const waiting = (s.offers || []).some((o) => o.signed);

    // A day on set. The brief, the way, then the take: by the character in the fixed career;
    // by hand when the harness has hands for that game, in stress.
    if (s.scene) {
      phase = 'a day on set';
      const ways = buttons().filter((b) => /as written|bigger|strip it back|change|your way/i.test(label(b)));
      if (ways.length && !find(/^Action$/)) { await press(mode === 'career' ? ways[0] : rand(ways)); continue; }
      if (find(/^That is the day|^Move on/)) { n.days++; await press(find(/^That is the day|^Move on/), 160); continue; }
      if (find(/^Action$/)) {
        // By hand only where it has hands: the bar, the grid, and the quick answer (three buttons).
        // The other thirteen are left to the character, and counted, so the report says how much
        // of the set it did not touch — a stuck screen inside one of those would be the harness's.
        if (mode === 'stress' && HANDS.has(s.scene.game) && pick() < 0.6) {
          await press(find(/^Action$/));
          if (s.scene.game === 'quick') { const opts = buttons().filter((b) => !NAV.test(label(b))); if (opts.length) await press(rand(opts), 300); n.daysByHand++; continue; }
          if (await minigame(pick() < 0.3)) { n.daysByHand++; continue; }
          continue;
        }
        if (!HANDS.has(s.scene.game)) harness[s.scene.game] = (harness[s.scene.game] || 0) + 1;
        await press(find(/^Let the take happen/)); continue;
      }
      if (await minigame(false)) { n.daysByHand++; continue; }
      const any = buttons().filter((b) => !NAV.test(label(b)));
      await press(mode === 'career' ? any[0] : rand(any)); continue;
    }
    // The contract room. Sign in the fixed career; in stress, sometimes ask, sometimes pass.
    if (s.openContract) {
      phase = 'the contract room';
      const paper = s.openContract.id || s.openContract.offerId || JSON.stringify(s.openContract).slice(0, 40);
      if (!papers.has(paper)) { papers.add(paper); n.papers++; }
      const sign = find(/^sign/i);
      if (mode === 'stress' && pick() < 0.25) { const other = buttons().filter((b) => !NAV.test(label(b)) && b !== sign); if (other.length) { await press(rand(other)); continue; } }
      if (sign) { await press(sign, 160); if (!g.save().openContract) n.signed++; continue; }
      const any = buttons().filter((b) => !NAV.test(label(b)));
      await press(mode === 'career' ? any[0] : rand(any)); continue;
    }
    // A question, a moment, a night: answer it and go on.
    if (s.pendingArc || s.bigMoment || s.night) {
      phase = s.pendingArc ? 'a question' : s.bigMoment ? `a moment (${s.bigMoment.kind || '?'})` : 'a night out';
      const any = buttons().filter((b) => !NAV.test(label(b)) && !ADVANCE.test(label(b)));
      if (any.length) { await press(mode === 'career' ? any[0] : rand(any), 140); continue; }
    }
    // Inside a minigame somewhere else (a read): play it.
    if (await minigame(mode === 'stress' && pick() < 0.3)) continue;
    // A read's result card.
    if (find(/^Back to listings$/)) {
      await press(find(/^Back to listings$/)); continue;
    }
    // An offer waiting in Messages: open its paper.
    const fresh = (s.offers || []).filter((o) => !o.signed && o.kind !== 'brand');
    // What it has already looked at this month, so a board it has read through, or a message it
    // could do nothing with, is left alone until the month turns.
    const month = (s.year || 0) * 12 + (s.month || 0);
    if (month !== triedMonth) { tried = new Set(); triedMonth = month; opened = null; steps = 0; }
    if (fresh.length && !sets && !waiting && !tried.has('messages')) {
      phase = 'an offer in Messages';
      const open = find(/^Open the contract$|^The paper came back$|^Accept$/);
      if (open) { if (/^Accept$/.test(label(open))) n.signed++; await press(open, 160); continue; }
      // Three presses to get to a paper (the Home shortcut opens the phone, the phone opens Messages);
      // after that there is nothing it can open this month — a part closed to it, or no button.
      steps = (steps || 0) + 1; if (steps > 3) { tried.add('messages'); continue; }
      if (find(MESSAGES)) { await press(find(MESSAGES)); continue; }
      // Inside an app already, with nothing here to press: pressing Phone again is the tab you are on.
      if (find(/^‹ Apps$/)) { tried.add('messages'); await press(find(/^‹ Apps$/)); continue; }
      if (find(PHONE)) { await toApps(); continue; }
    }
    // Free, nothing signed: go and read for something.
    if (!sets && !waiting && (s.ap || 0) >= 20) {
      phase = 'looking for work';
      const read = find(/^Audition ·/);
      if (read) { n.reads++; opened = null; await press(read, 160); continue; }
      opened = null;   // opened, and nothing to read for: already read, or closed to you
      const shelf = buttons().filter((b) => /^(Film|Indie|Streaming|TV) \d+$/.test(label(b)) && !tried.has('shelf ' + label(b)));
      // The fixed career goes to the pictures before it reads anything, so the regression covers a
      // film and not only a show: the board opens on TV.
      const picture = mode === 'career' && shelf.find((x) => /^(Film|Indie)/.test(label(x)));
      if (picture) { tried.add('shelf ' + label(picture)); await press(picture); continue; }
      const listing = buttons().filter((b) => /€[\d,.]+(\/ep)?(Lead|Supporting|Recurring|Guest|Featured|Cameo)/.test(label(b)) && !tried.has(label(b))
        && (mode === 'stress' || / Film\b/.test(label(b))));   // the fixed career reads for pictures only
      if (listing.length) { const b = mode === 'career' ? listing[0] : rand(listing); opened = label(b); tried.add(opened); await press(b); continue; }
      if (find(/^‹ Apps$/) && shelf.length) { const b = mode === 'career' ? shelf[0] : rand(shelf); tried.add('shelf ' + label(b)); await press(b); continue; }
      if (!tried.has('app') && find(/OpenCall$/)) { tried.add('app'); await press(find(/OpenCall$/)); continue; }
      if (!tried.has('app') && find(PHONE)) { await toApps(); continue; }
    }
    // Otherwise the month goes by. Home first if the button is not on this screen.
    phase = sets ? 'shooting' : waiting ? 'waiting for a signed start' : 'between jobs';
    const adv = find(ADVANCE);
    if (adv) { n.months++; await press(adv, 160); continue; }
    if (find(/^🏠Home$/)) { await press(find(/^🏠Home$/)); continue; }
    const any = buttons().filter((b) => !NAV.test(label(b)));
    if (any.length) { await press(rand(any)); continue; }
    // Some screens have no buttons for a few seconds on purpose — the calls you missed while away
    // are shown, then hidden, then asked about. Wait before calling it stuck.
    if (++idle <= 20) { await sleep(500); continue; }
    stuck.push(`${phase}: nothing to press for ten seconds — ${shot.slice(0, 160)}`); break;
  }

  // The save must read back as it was written (state/store.js persist and load).
  const end = g.save();
  const rules = [];
  if (end) {
    const txt = JSON.stringify(end);
    if (JSON.stringify(JSON.parse(txt)) !== txt) rules.push('the save changes when read back');
    if (!Number.isFinite(end.cash)) rules.push('cash is not a number');
    if ((end.productions || []).length > 3) rules.push('more than three sets');
    for (const k of ['fame', 'health', 'mental', 'strain']) if (end[k] != null && (end[k] < -0.001 || end[k] > 100.001)) rules.push(`${k} out of range: ${end[k]}`);
  }
  const out = { seed, n, harness, stuck, rules, errors: [...g.errors], phase,
    year: end && end.year, age: end && end.ageY, fame: end ? Math.round(end.fame || 0) : 0 };
  g.close();
  return out;
}

console.log(`AUTOPLAY CAREER — ${MODE === 'career' ? 'the fixed career' : `${LIVES} random careers`}, up to ${STEPS} presses each.\n`);
const results = [];
for (let k = 1; k <= LIVES; k++) {
  // SEED=1238 replays one stress career exactly, to see what it saw.
  const seed = process.env.SEED ? Number(process.env.SEED) : MODE === 'career' ? 2050 : 1000 + k * 37 + Math.floor(Math.random() * 1000);
  const r = await career(seed, MODE);
  results.push(r);
  const { n } = r;
  console.log(`  seed ${r.seed}: ${n.clicks} presses · ${n.months} months · to ${r.year}, age ${r.age}, fame ${r.fame}`);
  console.log(`    reads ${n.reads} (won ${n.won}) · offers ${n.offers} · papers opened ${n.papers} · signed ${n.signed} · shoots ${n.shoots} · days on set ${n.days} (by hand ${n.daysByHand})`);
  console.log(`    premieres ${n.premieres} · new credits ${n.credits} (films ${n.films}, series ${n.series}) · full cycles ${n.cycles}`);
  if (Object.keys(r.harness).length) console.log(`    days left to the character (no hands for): ${Object.entries(r.harness).map(([k, v]) => `${k} ×${v}`).join(', ')}`);
  for (const x of r.stuck) console.log(`    ✗ STUCK — ${x}`);
  for (const x of r.rules) console.log(`    ✗ RULE — ${x}`);
  for (const x of [...new Set(r.errors)].slice(0, 5)) console.log(`    ✗ ERROR — ${x}`);
  if (!n.cycles) console.log(`    no full cycle: stopped at "${r.phase}"`);
}
const failed = results.filter((r) => r.stuck.length || r.rules.length || r.errors.length || (MODE === 'career' && (r.n.cycles < 1 || r.n.films < 1)));
console.log(`\n${results.length - failed.length}/${results.length} ${MODE === 'career' ? 'fixed career' : 'careers'} clean${MODE === 'career' ? ' and through the whole loop' : ''}.`);
process.exit(failed.length ? 1 : 0);
