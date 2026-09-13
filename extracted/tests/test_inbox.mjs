// The phone as a phone: texts from the people in your life, and an inbox with contracts,
// fan mail and spam in it. Random rolls are pinned where a test needs a specific letter.
const P = new URL('../src/', import.meta.url).href;
const { createInitialState } = await import(P + 'state/initialState.js');
const { beginLife } = await import(P + 'systems/life/origin.js');
const { advanceMonth } = await import(P + 'engine/time.js');
const SMS = await import(P + 'systems/social/sms.js');
const EM = await import(P + 'systems/meta/email.js');
const PR = await import(P + 'systems/career/production.js');
const O = await import(P + 'systems/career/offers.js');
const F = await import(P + 'systems/career/franchise.js');

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const realRandom = Math.random;
const pin = (v, fn) => { Math.random = () => v; try { return fn(); } finally { Math.random = realRandom; } };

function actor(over) {
  const s = createInitialState({ name: 'X', dream: 'actor', created: true }); beginLife(s);
  return Object.assign(s, { stage: 'career', ageY: 32, year: 2062, month: 3, alive: true, hasApartment: true, livingWith: 'own_place', housing: 'flat', cash: 50000,
    ap: 3, apMax: 3, apMaxEff: 3, fame: 30, peakFame: 30, respect: 10, scandal: 0, media: 0, acting: 60, charisma: 50, looks: 50, luck: 50, mental: 60,
    people: [{ id: 'c1', name: 'Nadia Onyx', relationship: 60, industryWeight: 40, lastSeen: 0 }],
    filmography: [{ id: 'f0', title: 'one', rating: 60, tier: 'lead', role: 'Lead', year: 2060, score: 6 }] }, over);
}
const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
const byTag = (s, tag) => (s.sms || []).find((m) => m.tag === tag);

// ── texts ──
{
  // somebody saw the film
  const s = actor();
  s.filmography.unshift({ id: 'f1', title: 'Paper Line', rating: 74, tier: 'lead', role: 'Lead', year: 2062, score: 7.4, closedAt: stamp(s) });
  SMS.smsTick(s);
  const m = byTag(s, 'sawit');
  const who = m && [...(s.family || []), ...(s.people || []), s.partner].filter(Boolean).find((p) => p.id === m.pid);
  const top = Math.max(...[...(s.family || []).filter((f) => f.alive), ...(s.people || [])].map((p) => p.relationship || 0));
  ok('a film that closed this month gets a text from the closest person', !!m && who && (who.relationship || 0) === top, JSON.stringify((s.sms || []).map((x) => x.from)) + ' top ' + top);
  ok('a good film gets a kind one', m && /best thing|shut up|cried|properly good/.test(m.text), m && m.text);
  const rel0 = who.relationship, men0 = s.mental;
  SMS.smsReply(s, m.id, 0);
  ok('replying moves the relationship through applyBond, and helps', who.relationship > rel0 && s.mental > men0, `${rel0}→${who.relationship}, ${men0}→${s.mental}`);
  ok('and the text is gone', !byTag(s, 'sawit'));
  ok('the event line quotes the text', new RegExp('💬 ' + who.name).test(s.lastEvent || ''), s.lastEvent);
  // a bad one
  const b = actor(); b.filmography.unshift({ id: 'f2', title: 'Bad One', rating: 38, tier: 'lead', role: 'Lead', year: 2062, closedAt: stamp(b) });
  SMS.smsTick(b);
  ok('a bad film gets a tactful one', byTag(b, 'sawit') && /do not have to talk|popcorn|Next one|liked YOU/.test(byTag(b, 'sawit').text));
  // a middling one: nobody texts
  const c = actor(); c.filmography.unshift({ id: 'f3', title: 'Meh', rating: 58, tier: 'lead', role: 'Lead', year: 2062, closedAt: stamp(c) });
  SMS.smsTick(c);
  ok('a middling film gets no text — nobody texts about a 5.8', !byTag(c, 'sawit'));
  // the same month twice: not twice
  ok('the tick is once a month', (() => { const n = (s.sms || []).length; SMS.smsTick(s); return (s.sms || []).length === n; })());
}
{
  // somebody went cold
  const s = actor({ people: [{ id: 'c1', name: 'Tomas Reel', relationship: -3, cold: true, lastSeen: 0 }] });
  SMS.smsTick(s);
  const m = byTag(s, 'while');
  ok('a contact who went cold texts once', !!m && m.from === 'Tomas Reel');
  s.month += 1; SMS.smsTick(s);
  ok('and only once', (s.sms || []).filter((x) => x.tag === 'while').length === 1);
  const r0 = s.people[0].relationship;
  SMS.smsReply(s, m.id, 1);
  ok('leaving it costs the relationship', s.people[0].relationship < r0, `${r0}→${s.people[0].relationship}`);
  ok('and the timeline says so', (s.timeline || []).some((x) => /did not really answer/.test(x.text)));
}
{
  // the papers, and the list
  const s = actor({ scandal: 4 });
  SMS.smsTick(s);
  s.month += 1; s.scandal = 18; SMS.smsTick(s);
  const m = byTag(s, 'papers');
  ok('a jump in scandal: a parent has seen the papers', !!m && s.family.some((f) => f.name === m.from && /Mother|Father/.test(f.relation)), m && m.from);
  const ap0 = s.ap; const mother = s.family.find((f) => f.name === m.from); const r0 = mother.relationship;
  SMS.smsReply(s, m.id, 0);
  ok('calling them costs an energy and mends it', s.ap === ap0 - 1 && mother.relationship > r0);
  s.month += 1; s.awards = { nominations: [{ title: 'x' }], wins: [], history: [] }; SMS.smsTick(s);
  ok('a nomination: somebody saw the list', !!byTag(s, 'proud'), JSON.stringify((s.sms || []).map((x) => x.tag)));
  // no energy: the reply is refused
  s.ap = 0; const m2 = byTag(s, 'proud'); SMS.smsReply(s, m2.id, 0);
  ok('a free reply works with no energy', !byTag(s, 'proud'));
}
{
  // the partner, and living together
  const s = actor({ partner: { id: 'p1', name: 'Ines Moreau', relationship: 70 } });
  pin(0.001, () => SMS.smsTick(s));
  const m = byTag(s, 'over');
  ok('the partner asks', !!m && m.from === 'Ines Moreau', JSON.stringify((s.sms || []).map((x) => x.tag)));
  s.ap = 0; SMS.smsReply(s, m.id, 0);
  ok('going costs an energy, and with none you cannot', !!byTag(s, 'over') && /No energy/.test(s.lastEvent || ''));
  // and not twice while one is sitting there unanswered
  s.month += 1; pin(0.001, () => SMS.smsTick(s));
  ok('they do not ask twice while one is unanswered', (s.sms || []).filter((x) => x.tag === 'over').length === 1);
  s.ap = 2; SMS.smsReply(s, m.id, 0);
  ok('with one, you go: relationship and mental up', !byTag(s, 'over') && s.partner.relationship > 70 && s.ap === 1);
}
{
  // housekeeping
  const s = actor();
  for (let i = 0; i < 14; i++) { s.filmography.unshift({ id: 'g' + i, title: 't' + i, rating: 80, tier: 'lead', role: 'Lead', closedAt: stamp(s) }); s._smsTick = null; s._smsCool = {}; SMS.smsTick(s); }
  ok('the phone holds ten texts, not forty', (s.sms || []).length <= 10, String((s.sms || []).length));
  s.month += 7; s._smsTick = null; SMS.smsTick(s);
  ok('and texts older than six months are gone', !(s.sms || []).some((m) => stamp(s) - m.when >= 6), String((s.sms || []).length));
  const old = actor(); delete old.sms; SMS.smsTick(old);
  ok('an old save with no sms field is fine', Array.isArray(old.sms) || old.sms === undefined);
  // and it runs inside the month
  const live = actor({ scandal: 0 }); let t = live; t = advanceMonth(t); t.scandal = 30; t = advanceMonth(t);
  ok('and it runs from the monthly tick', !!byTag(t, 'papers'));
}

// ── the inbox ──
{
  // the option
  function shooting(scale) {
    const s = actor({ fame: 50, peakFame: 50, respect: 30, cash: 100000 });
    PR.startProduction(s, { id: 'o', projectTitle: 'North Water', role: 'Lead', type: 'Feature Film', genre: 'Drama', salary: 800000, months: 6, prestigeScore: 55, tier: 'lead', scale, stability: 100 });
    s.production.monthsLeft = 5; s.production.stability = 100;   // month two of the shoot
    return s;
  }
  const s = shooting('feature'); pin(0.2, () => EM.emailTick(s));
  const m = (s.inbox || []).find((x) => x.tag === 'option');
  ok('during a studio feature the studio asks for an option', !!m && /North Water/.test(m.subj), JSON.stringify((s.inbox || []).map((x) => x.tag)));
  ok('it says the fee and the money now', m && /800,000/.test(m.body) && /120,000/.test(m.body), m && m.body);
  const cash0 = s.cash;
  EM.emailAct(s, m.id, 0);
  ok('signing pays the bonus and options the picture', s.cash - cash0 === 120000 && s.production.optioned === true && s.production.optionParts === 3, `${s.cash - cash0}`);
  ok('and once asked, never asked again on this picture', (s._emTick = null, EM.emailTick(s), !(s.inbox || []).some((x) => x.tag === 'option')));
  const r = shooting('feature'); pin(0.2, () => EM.emailTick(r));
  const rm = (r.inbox || []).find((x) => x.tag === 'option'); const rc = r.cash;
  EM.emailAct(r, rm.id, 1);
  ok('refusing: no money, no option', r.cash === rc && !r.production.optioned);
  const ind = shooting('indie'); pin(0.2, () => EM.emailTick(ind));
  ok('an indie does not ask — there is no studio', !(ind.inbox || []).some((x) => x.tag === 'option'));
  // lapses at wrap
  const w = shooting('feature'); pin(0.2, () => EM.emailTick(w));
  w.production = null; w._emTick = null; EM.emailTick(w);
  ok('an unanswered option lapses when the picture wraps', !(w.inbox || []).some((x) => x.tag === 'option'));
  // and the sequel comes obliged, at the same fee
  const credit = { id: 'nw', title: 'North Water', rating: 80, tier: 'lead', role: 'Lead', verdict: 'profitable', type: 'Feature Film', genre: 'Drama' };
  const job = { title: 'North Water', role: 'Lead', type: 'Feature Film', genre: 'Drama', salary: 800000, baseSalary: 800000, months: 6, tier: 'lead', scale: 'feature', prestigeScore: 55, part: 1, optioned: true, optionParts: 3, stability: 100 };
  const q = actor({ fame: 60, peakFame: 60 });
  pin(0.5, () => F.maybeContinue(q, credit, job));
  const later = (q.laterOffers || [])[0];
  ok('the sequel is guaranteed and at the fee you signed', !!later && later.offer.salary === 800000 && /signed for this one/.test(later.offer.note), later && later.offer.note);
  const q2 = actor({ fame: 60, peakFame: 60 });
  pin(0.5, () => F.maybeContinue(q2, credit, { ...job, optioned: false, optionParts: 0 }));
  const l2 = (q2.laterOffers || [])[0];
  ok('without the option the same film pays 60% more, if it comes at all', !l2 || l2.offer.salary > 800000, l2 && String(l2.offer.salary));
  // walking out of it
  const d = actor({ respect: 20 }); d.offers = [{ id: 'sq', kind: 'sequel', part: 2, optioned: true, optionParts: 3, projectTitle: 'North Water II' }];
  O.declineOffer(d, 'sq');
  ok('passing on an optioned sequel is walking out of a contract: −6', d.respect === 14 && /lawyers/.test(d.lastEvent || ''), String(d.respect));
  const d2 = actor({ respect: 20 }); d2.offers = [{ id: 'sq', kind: 'sequel', part: 2, optioned: false, projectTitle: 'North Water II' }];
  O.declineOffer(d2, 'sq');
  ok('passing on an ordinary sequel is your business', d2.respect === 20);
}
{
  // fan mail, hate mail, spam
  const f = actor({ fame: 40 }); pin(0.05, () => EM.emailTick(f));
  const fm = (f.inbox || []).find((x) => x.tag === 'fan');
  ok('fan mail at fame 35+', !!fm && fm.kind === 'fan', JSON.stringify((f.inbox || []).map((x) => x.kind)));
  const men = f.mental; EM.emailAct(f, fm.id, 0);
  ok('reading it helps a little', f.mental === men + 2);
  const h = actor({ fame: 40 }); h.filmography.unshift({ id: 'fl', title: 'Flop', rating: 30, tier: 'lead', closedAt: stamp(h) - 1 }); pin(0.05, () => EM.emailTick(h));
  const hm = (h.inbox || []).find((x) => x.tag === 'fan');
  ok('after a flop it is the other kind', !!hm && hm.kind === 'hate', hm && hm.kind);
  const men2 = h.mental; EM.emailAct(h, hm.id, 1);
  ok('deleting it unread costs nothing', h.mental === men2);
  const sp = actor({ fame: 10 }); pin(0.05, () => EM.emailTick(sp));
  const spm = (sp.inbox || []).find((x) => x.tag === 'spam');
  ok('spam arrives at any fame', !!spm && spm.kind === 'spam');
  const c0 = sp.cash; EM.emailAct(sp, spm.id, 1);
  ok('clicking the link costs money', sp.cash < c0 && sp.cash >= c0 - 9000, `${c0}→${sp.cash}`);
  const sp2 = actor({ fame: 10 }); pin(0.05, () => EM.emailTick(sp2));
  const c1 = sp2.cash; EM.emailAct(sp2, (sp2.inbox || []).find((x) => x.tag === 'spam').id, 0);
  ok('deleting it does not', sp2.cash === c1);
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
