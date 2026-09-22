// Four ways to play, thirty years each, and what each one ends up with. The review of the
// hype design asked for exactly this: does the party face out-earn the craftsman, does the
// television lifer ever get a studio picture, is the blockbuster chaser famous and
// forgotten, does anybody get to be all three. Numbers, not opinions.
//   craft   — indie and prestige only, never a party, never a brand, rests when tired
//   party   — out every month it can be, takes every brand and cover, the biggest part it can get
//   tent    — blockbusters and studio features only; never reads for anything smaller
//   tv      — television only, season after season
const P = new URL('../../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const K = await import(P + 'systems/career/castings.js');
const PR = await import(P + 'systems/career/production.js');
const ST = await import(P + 'systems/career/story.js');
const T = await import(P + 'systems/career/training.js');
const H = await import(P + 'systems/life/health.js');
const C = await import(P + 'systems/career/contract.js');
const AR = await import(P + 'systems/life/arcs.js');
const EM = await import(P + 'systems/meta/email.js');
const EV = await import(P + 'systems/social/events.js');
const NI = await import(P + 'systems/social/night.js');
const A = await import(P + 'systems/career/actions.js');
const HY = await import(P + 'systems/meta/hype.js');
const N = +(process.argv[2] || 6), YEARS = 30;
const WANT = {
  craft: (c) => ['indie', 'festival', 'prestige', 'small'].includes(c.scale) || /^Prestige/.test(c.type),
  party: (c) => ['blockbuster', 'feature', 'oneoff'].includes(c.scale) || /Brand|Cover|Commercial|Fashion/.test(c.type),
  tent: (c, s) => ['blockbuster', 'feature'].includes(c.scale) || ((s.fame || 0) < 35 && !K.dayWork(c) && !c.perEpisode),
  tv: (c) => !!c.perEpisode,
};
const out = {};
for (const kind of Object.keys(WANT)) {
  const rows = [];
  for (let i = 0; i < N; i++) {
    let t = createInitialState({ name: 'P', dream: 'actor', created: true, gender: i % 2 ? 'female' : 'male' }); beginLife(t);
    Object.assign(t, { stage: 'career', ageY: 22, year: 2050, month: 0, hasApartment: true, livingWith: 'own_place', housing: 'room', cash: 9000, alive: true, ap: 100, apMax: 100, apMaxEff: 100, fame: 0, peakFame: 0 });
    let maxHype = 0, hypeMonths = 0, shows = 0, brands = 0, stories = 0, quiet = 0;
    for (let m = 0; m < YEARS * 12; m++) {
      t.bigMoment = null; t.night = null; t.openContract = null;
      if (t.pendingArc && t.pendingArc.story) AR.resolveArc(t, Math.floor(Math.random() * t.pendingArc.choices.length)); t.pendingArc = null;
      for (const p of PR.sets(t)) if (!p.take) ST.pushTake(t, 'about');
      if (t.illness && (t.cash || 0) > H.treatmentCost(t, t.illness)) H.seeDoctor(t);
      if (kind === 'craft' && (t.strain || 0) >= 60) A.runAction(t, 'rest');
      if (kind === 'craft' && !t.production) { const b = [...T.SCHOOLS].reverse().find((sc) => (t.cash || 0) > sc.cost * 4); if (b && (t.ap || 0) >= 20) T.train(t, b.id); }
      if (kind === 'party' && HY.hype(t) >= 60 && (t.scandal || 0) >= 30) { A.runAction(t, 'quiet'); quiet++; }
      K.refreshCastingPool(t);
      for (const o of [...(t.offers || [])]) {
        // an offer is taken only if it is the kind of thing this life does (a sequel to its own film counts)
        if (!(o.kind === 'renewal' || o.kind === 'sequel' || WANT[kind](o, t))) continue;
        const k = C.draftContract(t, o); if (k.sent) continue;
        const sched = k.clauses.find((c) => c.id === 'schedule');
        if (sched && sched.must && sched.result !== 'agreed') { C.markClause(t, o.id, 'schedule', sched.options[0].id); C.sendContract(t, o.id); continue; }
        C.signContract(t, o.id);
      }
      const pool = (t.castingPool || []).filter((c) => WANT[kind](c, t) && c.minFame <= (t.fame || 0));
      const day = pool.filter((c) => K.dayWork(c));
      if (kind === 'party' && day.length && (t.ap || 0) >= 20) { K.auditionFor(t, day[0].id, 80); brands++; }
      if (!PR.sets(t).length && (t.ap || 0) >= 30) {
        const g = pool.filter((c) => !K.dayWork(c)).sort((a, b) => (b.salary || 0) - (a.salary || 0));
        const c = kind === 'tent' ? g[0] : (g.length ? g : pool)[0];
        if (c) { K.prepareFor(t, c.id); K.auditionFor(t, c.id, 85); }
      }
      for (let k = 0; k < 3 && t.production && (t.ap || 0) >= 15; k++) PR.rehearse(t);
      // the party face goes out whenever it can
      if (kind === 'party') { const ev = (t.events || []).find((e) => EV.isInvited(t, e) && EV.isTonight(t, e)); if (ev && (t.ap || 0) >= 30) { EV.attendEvent(t, ev.id); for (let h = 0; h < 6 && t.night && !t.night.done; h++) NI.nightAct(t, 'move'); t.night = null; } }
      t = advanceMonth(t);
      const L = (t.inbox || []).find((x) => x.tag === 'agent'); if (L) EM.emailAct(t, L.id, 0);
      const S = (t.inbox || []).find((x) => x.tag === 'show'); if (S) { if (kind !== 'craft') { EM.emailAct(t, S.id, 0); shows++; } else EM.emailAct(t, S.id, 1); }
      maxHype = Math.max(maxHype, HY.hype(t)); if (HY.hype(t) >= 30) hypeMonths++;
      if (!t.alive) break;
    }
    for (const k of Object.keys(t._storyLog || {})) stories += t._storyLog[k].length;
    rows.push({ fame: t.fame || 0, peak: t.peakFame || 0, resp: t.respect || 0, cash: (t.cash || 0) / 1e6, credits: (t.filmography || []).filter((c) => !c.minor).length, askers: ((t.awards && t.awards.wins) || []).length, maxHype, hypeMonths, shows, brands, stories, quiet, scandal: t.scandal || 0, labels: ((t.typecast && t.typecast.active) || []).join('/') });
  }
  out[kind] = rows;
}
const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
console.log(`${N} lives each, ${YEARS} years. Medians.`);
for (const kind of Object.keys(out)) {
  const r = out[kind];
  console.log(`  ${kind.padEnd(6)} fame ${med(r.map((x) => Math.round(x.fame)))} (peak ${med(r.map((x) => Math.round(x.peak)))}) · standing ${med(r.map((x) => Math.round(x.resp)))} · cash €${med(r.map((x) => Math.round(x.cash)))}m · credits ${med(r.map((x) => x.credits))} · Askers ${med(r.map((x) => x.askers))} · hype peak ${med(r.map((x) => Math.round(x.maxHype)))}, months ≥30: ${med(r.map((x) => x.hypeMonths))} · sofas ${med(r.map((x) => x.shows))} · brands ${med(r.map((x) => x.brands))} · stories ${med(r.map((x) => x.stories))} · quiet months ${med(r.map((x) => x.quiet))} · scandal ${med(r.map((x) => Math.round(x.scandal)))} · labels ${r.map((x) => x.labels || '-').join(', ')}`);
}
