// Somebody with money: gifts, the rent, living at theirs — and the one in forty who is in
// the business, and the room they can get you into.
const P = new URL('../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const D = await import(P + 'systems/life/dating.js');
const E = await import(P + 'engine/economy.js');
const SMS = await import(P + 'systems/social/sms.js');
const A = await import(P + 'systems/career/access.js');
const O = await import(P + 'systems/career/offers.js');
const PR = await import(P + 'systems/career/production.js');
const DR = await import(P + 'systems/life/drink.js');

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const realRandom = Math.random;
const pin = (v, fn) => { Math.random = () => v; try { return fn(); } finally { Math.random = realRandom; } };
function actor(over) {
  const s = createInitialState({ name: 'X', dream: 'actor', created: true }); beginLife(s);
  return Object.assign(s, { stage: 'career', ageY: 26, year: 2056, month: 3, alive: true, hasApartment: true, livingWith: 'own_place', housing: 'studio', cash: 4000,
    ap: 3, apMax: 3, apMaxEff: 3, fame: 12, peakFame: 12, respect: 5, scandal: 0, media: 0, acting: 40, charisma: 50, looks: 55, luck: 50, mental: 60,
    filmography: [{ id: 'f0', title: 'one', rating: 55, tier: 'supporting', role: 'Supporting', year: 2055 }] }, over);
}
const partner = (over) => ({ id: 'p1', name: 'Wren Hale', gender: 'f', age: 27, job: 'sits on boards', means: 'serious', wants: 'thelife', patience: 40, relationship: 62, dates: 4, livingTogether: false, married: false, ...over });
const byTag = (s, tag) => (s.sms || []).find((m) => m.tag === tag);

// ── who they are ──
{
  let inBiz = 0, rich = 0;
  const s = actor();
  for (let i = 0; i < 4000; i++) { const p = D.prospect(s); if (D.connected(p)) { inBiz++; if (['money', 'serious'].includes(p.means)) rich++; } }
  ok('about one prospect in forty is in the business', inBiz > 50 && inBiz < 160, String(inBiz));
  ok('and every one of them has money', rich === inBiz);
  const p = pin(0.01, () => D.prospect(s));
  ok('they have a job that says so', D.connected(p) && /producer|executive|production company|director|agency/.test(p.job), p.job);
}

// ── living at theirs ──
{
  const s = actor({ partner: partner() });
  const rent0 = E.monthlyCosts(s).rent;
  ok('you pay rent on your studio', rent0 > 0, String(rent0));
  ok('you can move in with them at 50', D.canMoveInWithThem(s).ok);
  ok('not with somebody who gets by', !D.canMoveInWithThem(actor({ partner: partner({ means: 'ordinary' }) })).ok);
  ok('not at 40', !D.canMoveInWithThem(actor({ partner: partner({ relationship: 40 }) })).ok);
  D.moveInWithThem(s);
  ok('and then the rent is theirs', E.monthlyCosts(s).rent === 0 && s.hostedBy === 'p1' && s.partner.livingTogether);
  ok('and the home is theirs: serious money is a house, with its Energy', E.home(s).label === E.HOUSING.house.label && E.homeEnergy(s) === (E.HOUSING.house.ap || 0));
  ok('a merely rich one is a flat', (() => { const t = actor({ partner: partner({ means: 'money' }) }); D.moveInWithThem(t); return E.home(t).label === E.HOUSING.flat.label; })());
  ok('the header says where you live', D.hostName(s) === 'Wren');
  // off the street
  const h = actor({ partner: partner(), homeless: true, hasApartment: false, housing: 'room', monthsOnStreet: 3 });
  D.moveInWithThem(h);
  ok('it is a roof if you had none', !h.homeless && h.hasApartment && h.hostedBy === 'p1');
  // and it ends when they do
  const e = actor({ partner: partner({ relationship: 62, patience: 30 }) }); D.moveInWithThem(e); e.partner.relationship = 5;
  pin(0.1, () => D.datingYear(e));
  ok('when they end it, the rent is yours again', !e.partner && !e.hostedBy && E.monthlyCosts(e).rent > 0 && (e.timeline || []).some((x) => /Two van loads back/.test(x.text)), JSON.stringify((e.timeline || []).slice(0, 2).map((x) => x.text)));
  // marriage keeps the house
  const m = actor({ partner: partner({ relationship: 90 }), cash: 200000 }); D.moveInWithThem(m);
  pin(0.5, () => D.proposeMarriage(m, 'registry', false));
  const spouse = (m.family || []).find((f) => f.relation === 'Spouse');
  ok('marrying them keeps you in their house', !!spouse && m.hostedBy === spouse.id && E.monthlyCosts(m).rent === 0, String(m.hostedBy));
  D.divorce(m, false);
  ok('and the divorce takes the house with it', !m.hostedBy && E.monthlyCosts(m).rent > 0);
  // the drink takes them too
  const d = actor({ partner: partner() }); D.moveInWithThem(d);
  d.partner = d.partner; // present
  const who = { where: 'partner' };
  ok('an old save with no hostedBy is fine', E.hostOf(actor()) === null && E.monthlyCosts(actor()).rent > 0);
}

// ── gifts, the rent, the offer to move in ──
{
  const s = actor({ partner: partner(), cash: 1000 });
  pin(0.01, () => SMS.smsTick(s));
  const g = byTag(s, 'gift');
  ok('serious money sends money', !!g && s.cash >= 41000, `${s.cash} ${JSON.stringify((s.sms || []).map((x) => x.tag))}`);
  ok('the text says how much', g && /€\d/.test(g.text), g && g.text);
  // the offer to move in, when you are broke (a 'money' partner, pinned past the gift roll)
  const b = actor({ partner: partner({ means: 'money' }), cash: 1000 });
  pin(0.12, () => SMS.smsTick(b));
  ok('broke, with somebody who has the room: the offer to move in', !!byTag(b, 'movein') && !byTag(b, 'gift'), JSON.stringify((b.sms || []).map((x) => x.tag)));
  const mv = byTag(b, 'movein');
  SMS.smsReply(b, mv.id, 0);
  ok('Yes moves you in', b.hostedBy === 'p1' && E.monthlyCosts(b).rent === 0);
  const nb = actor({ partner: partner({ means: 'money' }), cash: 90000 });
  pin(0.12, () => SMS.smsTick(nb));
  ok('not offered when you are fine for money', !byTag(nb, 'movein'));
  // the rent
  const r = actor({ partner: partner({ relationship: 50 }), rentMissed: 1, cash: -500, inbox: [{ id: 'em1', tag: 'rent', kind: 'bill', from: 'Landlord', subj: 'Payment failed', read: false }] });
  pin(0.9, () => SMS.smsTick(r));
  ok('a missed rent gets paid by them', r.rentMissed === 0 && r.cash > -500 && !!byTag(r, 'rentpaid') && !(r.inbox || []).some((m) => m.tag === 'rent'), `${r.cash}`);
  // not from somebody who gets by
  const o = actor({ partner: partner({ means: 'ordinary' }), cash: 1000 });
  pin(0.01, () => SMS.smsTick(o));
  ok('somebody who gets by sends none of it', !byTag(o, 'gift') && !byTag(o, 'movein'));
  // not from a rich partner you are not close to
  const c = actor({ partner: partner({ relationship: 30 }), cash: 1000 });
  pin(0.01, () => SMS.smsTick(c));
  ok('nor a rich one at 30', !byTag(c, 'gift') && !byTag(c, 'movein'));
}

// ── the room ──
{
  const s = actor({ partner: partner({ industryWeight: 90, job: 'film producer', relationship: 70 }) });
  ok('a connected partner is a power broker', A.knowsPowerBroker(s) && A.computeAccess(s).aaa && A.computeAccess(s).aaaReason === 'connection');
  ok('not at 50', !A.knowsPowerBroker(actor({ partner: partner({ industryWeight: 90, relationship: 50 }) })));
  ok('a spouse counts too', A.knowsPowerBroker(actor({ family: [{ id: 'sp', name: 'W', relation: 'Spouse', alive: true, industryWeight: 88, relationship: 65 }] })));
  pin(0.01, () => SMS.smsTick(s));
  const m = byTag(s, 'room');
  ok('once in a while there is a dinner', !!m && /casting|part/.test(m.text), JSON.stringify((s.sms || []).map((x) => x.tag)));
  s.ap = 1; SMS.smsReply(s, m.id, 0);
  const off = (s.offers || []).find((x) => x.kind === 'room');
  ok('and by dessert there is a studio picture on the phone', !!off && off.tier === 'tentpole' && off.scale === 'blockbuster' && off.viaPartner === 'Wren Hale', JSON.stringify(off));
  ok('at fame 12', s.fame === 12);
  ok('and the offer says how you got it', /got you in the room/.test(off.note));
  // the set knows
  PR.startProduction(s, off);
  const lead = s.production.crew[0];
  ok('the director starts ten colder', lead.bond <= 45 && lead.bond0 === lead.bond && s.production.viaPartner === 'Wren Hale', String(lead.bond));
  ok('and the game says so', (s.timeline || []).some((x) => /knows how you got the part/.test(x.text)));
  // a partner who is rich but not connected: no room
  const n = actor({ partner: partner({ relationship: 70 }) });
  pin(0.01, () => SMS.smsTick(n));
  ok('money alone does not get you in the room', !byTag(n, 'room'));
}

// ── the phone rings more ──
{
  // a life with a partner, a family and two friends: how many texts a year?
  function year(kind) {
    const s = actor({ ageY: 30, fame: 40, peakFame: 40, respect: 20, cash: 80000, media: 10,
      partner: partner({ means: 'ordinary', relationship: 65 }),
      people: [{ id: 'c1', name: 'Tomas Reel', relationship: 60, industryWeight: 40, lastSeen: 0 }, { id: 'c2', name: 'Ines Moreau', relationship: 50, industryWeight: 20, lastSeen: 0 }] });
    let n = 0;
    for (let m = 0; m < 12; m++) {
      s.month = (s.month + 1) % 12; if (s.month === 0) s.year += 1;
      for (const p of [s.partner, ...s.people, ...s.family]) p.lastSeen = (s.year * 12 + s.month);   // seen: nobody goes cold in this count
      s._smsTick = null; SMS.smsTick(s);
      n += (s.sms || []).filter((x) => x.when === s.year * 12 + s.month).length;
      s.sms = [];   // answered
    }
    return n;
  }
  const counts = []; for (let i = 0; i < 30; i++) counts.push(year());
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
  ok('a life with a partner, a family and two friends gets a text most months', avg >= 10 && avg <= 24, avg.toFixed(1) + ' a year');
  console.log('      texts a year with partner + family + two friends: ' + avg.toFixed(1));
}

// ── the door costs standing, and the film decides the rest ──
{
  const s = actor({ partner: partner({ industryWeight: 90, job: 'film producer', relationship: 70 }), respect: 20, scandal: 0, media: 0 });
  const off = O.roomOffer(s, s.partner);
  PR.startProduction(s, off);
  ok('taking the part through them costs five points of standing on day one', s.respect === 15 && s.scandal === 4 && s.media === 6, s.respect + ' ' + s.scandal);
  ok('and the trades say so', (s.timeline || []).some((x) => /trades have said plenty/.test(x.text)));
  const R = await import(P + 'systems/career/release.js');
  const rel = (rating, via) => {
    const x = actor({ ageY: 40, year: 2070, month: 0, fame: 40, respect: 30, cash: 90000 });
    const c = { title: 'Big One', role: 'Lead', tier: 'tentpole', type: 'Blockbuster', genre: 'Drama', scale: 'blockbuster', rating, status: 'Released', year: 2070, salary: 900000, weeks: 8, weeksTotal: 8, boxOffice: 300000000, running: true, id: 'r1',
      _rel: { rating, tier: 'tentpole', scale: 'blockbuster', salary: 900000, finalGross: 300000000, film: true, job: {}, meter: 60, viaPartner: via ? 'Wren Hale' : null } };
    x.filmography.unshift(c); x.running = ['r1']; R.runTick(x);
    return { d: x.respect - 30, tl: (x.timeline || []).map((y) => y.text).join(' | ') };
  };
  ok('a good film through the door earns it back with interest', rel(80, true).d > rel(80, false).d + 3 && /nobody mentions Wren/.test(rel(80, true).tl), rel(80, true).d + ' vs ' + rel(80, false).d);
  ok('a bad one costs five more, and they say it again', rel(45, true).d < rel(45, false).d - 4 && /saying it again/.test(rel(45, true).tl), rel(45, true).d + ' vs ' + rel(45, false).d);
  ok('a middling one: the door is neither here nor there', rel(65, true).d === rel(65, false).d);
}

// ── the anniversary, and evenings that read like evenings ──
{
  const since = 2056 * 12 + 3;
  const s = actor({ partner: partner({ means: 'ordinary', relationship: 60, since }), cash: 20000, year: 2057, month: 3 });
  const now = 2057 * 12 + 3;
  ok('twelve months on, the calendar has an anniversary', D.anniversaryMonth(s, now) && D.anniversaryYears(s, now) === 1 && !D.anniversaryMonth(s, now + 1) && !D.anniversaryMonth(s, since));
  // remembered: an evening in the month
  D.goOnDate(s, 'dinner');
  ok('an evening stamps the month', s.partner.lastEvening === now);
  ok('and the evening reads like one, with the number', /Dinner somewhere with Wren\. .+Closeness \+[0-9]+ \([0-9]+\)/.test(s.lastEvent || ''), s.lastEvent);
  const r1 = s.partner.relationship;
  s.month += 1; s._smsTick = null; SMS.smsTick(s);
  const a = byTag(s, 'anniv');
  ok('remembered: they say thank you, and it counts', !!a && /Thank you|remembered|good night/.test(a.text) && s.partner.relationship > r1, a && a.text);
  // forgotten
  const f = actor({ partner: partner({ means: 'ordinary', relationship: 60, since }), year: 2057, month: 4 });
  const r2 = f.partner.relationship;
  pin(0.9, () => SMS.smsTick(f));
  const b = byTag(f, 'anniv');
  ok('forgotten: they say so, and it costs nine', !!b && /forgot|did not say|Do not answer/.test(b.text) && f.partner.relationship === r2 - 9, b && b.text + ' ' + f.partner.relationship);
  f.ap = 2; SMS.smsReply(f, b.id, 0);
  ok('and you can make it up, for an energy', f.partner.relationship > r2 - 9 && f.ap === 1);
  // crossing a band is said
  const c = actor({ partner: partner({ means: 'ordinary', relationship: 54 }), cash: 20000 });
  D.goOnDate(c, 'home');
  ok('crossing a line is said out loud', /In touch → Close/.test(c.lastEvent || ''), c.lastEvent);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
