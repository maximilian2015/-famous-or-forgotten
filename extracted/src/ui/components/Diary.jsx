import { useState } from 'react';
import { theme } from '../theme.js';
import { onCooldown } from '../../engine/cooldown.js';
import { anniversaryMonth, anniversaryYears } from '../../systems/life/dating.js';
import { tierById } from '../../systems/social/events.js';
import { sets, canTakeSet, monthsUntilFree } from '../../engine/sets.js';
import { toursFor } from '../../systems/career/tour.js';
import { SEQUEL_LEAD } from '../../systems/career/franchise.js';

// The agenda. This is the calendar from the first prototype, the one Maxi remembered when
// none of ten new ones would do: a card a month, two across, "Jan 2052 · 1/12" with a pill
// saying whether the month is yours, and inside it a card for each thing — the shoot in
// purple with a bar that fills as it goes, the premiere in gold with the whole month lit,
// and "free" written small where nothing is. Post-production is not on it — you are not
// there for it. Maxi: "the shoot one colour, the premiere gold; only the premiere."
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const clean = (t) => String(t || '').replace('⭐ ', '');
// Every project gets a colour of its own, so two shoots in one month cannot be confused —
// Maxi: "each project a different colour, the soap one, the film another." Drawn from the
// title, so a project keeps its colour from the first month to the premiere.
const HUES = ['#a78bfa', '#5fd3c9', '#ff9f6e', '#ff8dc7', '#6fb3ff', '#c5e06a', '#f2c265', '#ff7d7d'];
export const hueOf = (title) => { let h = 0; for (const ch of String(title || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return HUES[h % HUES.length]; };
// A premiere has a day, not just a month. Drawn from the title so it never moves.
const dayOf = (title) => { let h = 0; for (const ch of String(title || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return 5 + (h % 23); };

// The colours, in one place: the item cards, the month cells and the legend all read these.
export const INK = { onair: '#7fb3ff', tour: '#f2c265', shoot: '#a78bfa', prep: '#c4b5fd', signed: '#a78bfa', post: '#60a5fa', premiere: '#ffd166', cinemas: '#06d6a0', off: '#ff6b8a', hold: '#94a3b8', answer: '#e2ddf5', reply: '#e2ddf5', party: '#06d6a0', love: '#ff8d9e', askers: '#ffd166' };
const SKIN = {
  shoot: { bg: 'linear-gradient(135deg, rgba(139,92,246,.26), rgba(255,255,255,.03))', border: '1px solid rgba(167,139,250,.42)', bar: 'linear-gradient(90deg,#8b5cf6,#ffd166)' },
  prep: { bg: 'linear-gradient(135deg, rgba(139,92,246,.12), rgba(255,255,255,.03))', border: '1px dashed rgba(167,139,250,.5)', bar: 'rgba(167,139,250,.75)' },
  signed: { bg: 'linear-gradient(135deg, rgba(139,92,246,.12), rgba(255,255,255,.03))', border: '1px dashed rgba(167,139,250,.5)' },
  post: { bg: 'linear-gradient(135deg, rgba(96,165,250,.18), rgba(255,255,255,.025))', border: '1px solid rgba(96,165,250,.4)', bar: 'linear-gradient(90deg,#3b82f6,#93c5fd)' },
  premiere: { bg: 'linear-gradient(135deg, #3a2a08, #241a0f)', border: '1.5px solid #ffd166', shadow: '0 0 22px rgba(255,209,102,.13), inset 0 0 0 1px rgba(255,255,255,.08)' },
  cinemas: { bg: 'linear-gradient(135deg, rgba(6,214,160,.16), rgba(255,255,255,.03))', border: '1px solid rgba(6,214,160,.36)' },
  onair: { bg: 'linear-gradient(135deg, rgba(127,179,255,.16), rgba(255,255,255,.03))', border: '1px solid rgba(127,179,255,.36)' },
  off: { bg: 'linear-gradient(135deg, rgba(255,107,138,.18), rgba(255,255,255,.03))', border: '1px solid rgba(255,107,138,.4)' },
  hold: { bg: 'linear-gradient(135deg, rgba(148,163,184,.18), rgba(255,255,255,.03))', border: '1px solid rgba(148,163,184,.36)' },
  answer: { bg: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.13)' },
  reply: { bg: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.13)' },
  party: { bg: 'linear-gradient(135deg, rgba(6,214,160,.12), rgba(255,255,255,.03))', border: '1px solid rgba(6,214,160,.3)' },
  love: { bg: 'linear-gradient(135deg, rgba(255,141,158,.16), rgba(255,255,255,.03))', border: '1px solid rgba(255,141,158,.36)' },
  askers: { bg: 'linear-gradient(135deg, rgba(255,209,102,.16), rgba(255,255,255,.03))', border: '1px solid rgba(255,209,102,.4)' },
};

// Everything in month i (0 = this month), as cards. Time-use first, then the rest.
function itemsFor(g, i, abs) {
  const out = [];
  const now = (g.year || 0) * 12 + (g.month || 0);
  const it = (kind, icon, label, title, sub, extra) => out.push({ kind, icon, label, title, sub, ...(extra || {}) });
  if (g.burnout && i < (g.burnout.left || 0)) it('off', '🚫', 'Signed off', 'Nothing gets booked', i === (g.burnout.left || 0) - 1 ? 'Cleared next month' : `${(g.burnout.left || 0) - i} month${(g.burnout.left || 0) - i === 1 ? '' : 's'} to go`);
  // The shoots — up to three at once: preparation first, then the months on set.
  for (const p of sets(g)) {
    const prepLeft = p.prepLeft || 0, shootLeft = p.monthsLeft || 0;
    if (i === 0 && ((g.illness && g.illness.freezes) || (g.burnout && g.burnout.rest && g.burnout.left > 0))) it('hold', '🧊', 'On hold', p.title, 'The set waits while you recover');
    if (i < prepLeft) it('prep', '🥊', 'Preparation', p.title, `Month ${(p.prep || 1) - prepLeft + i + 1} of ${p.prep || 1} before the first day`, { bar: ((p.prep || 1) - prepLeft + i + 1) / (p.prep || 1), hue: hueOf(p.title), ref: { kind: 'set', id: p.id } });
    else if (i < prepLeft + shootLeft) {
      const n = (p.months || 0) - shootLeft + (i - prepLeft) + 1;
      it('shoot', '🎥', p.episodes ? 'Shooting · series' : 'Shooting', p.title, i === prepLeft + shootLeft - 1 ? `Month ${n} of ${p.months} — wraps` : `Month ${n} of ${p.months}${p.with ? ` · with ${p.with}` : ''}`, { bar: n / (p.months || 1), hue: hueOf(p.title), ref: { kind: 'set', id: p.id } });
    }
  }
  // A signed paper waiting for a set: it starts the month one frees up.
  for (const o of (g.offers || [])) {
    if (!o.signed) continue;
    const start = Math.max((o.startAt || now + 1) - now, canTakeSet(g, o).ok ? 0 : monthsUntilFree(g, o));
    const prep = o.prep || 0, months = o.months || 1;
    if (i >= start && i < start + prep) it('prep', '🥊', 'Preparation', clean(o.projectTitle), `Month ${i - start + 1} of ${prep} before the first day`, { bar: (i - start + 1) / prep, hue: hueOf(clean(o.projectTitle)), ref: { kind: 'offer', id: o.id } });
    else if (i >= start + prep && i < start + prep + months) it('signed', '✍️', 'Signed', clean(o.projectTitle), `Shooting, month ${i - start - prep + 1} of ${months}`, { hue: hueOf(clean(o.projectTitle)), ref: { kind: 'offer', id: o.id } });
  }
  for (const r of (g.releases || [])) {
    // Post-production is not on here: you are not there for it. Maxi: "only the premiere."
    // The month before: the studio's two weeks of you, if it is that kind of picture.
    if (r.due === abs + 1 && toursFor(r)) it('tour', '🎤', 'Press tour', r.title, r.tour ? `Done · buzz ${r.tour.buzz}` : r.tourSkipped ? 'Skipped' : r.tourAsked ? 'The letter is in Email' : 'Next month');
    if (r.due === abs) { const tv = !['small', 'indie', 'festival', 'feature', 'blockbuster'].includes(r.scale); const fest = r.scale === 'festival';
      it('premiere', fest ? '🎞️' : tv ? '📺' : '🎬', fest ? 'The festival' : tv ? (r.scale === 'recurring' ? 'On air' : (r.season || 0) > 1 && r.joined ? 'Your first episode' : 'First episode') : 'Premiere', r.title, fest ? `In competition · ${MON[abs % 12]} ${Math.floor(r.due / 12)}` : `${dayOf(r.title)} ${MON[abs % 12]} ${Math.floor(r.due / 12)}`, { big: true, ref: { kind: 'release', id: r.id } }); }
  }
  for (const c of (g.filmography || [])) {
    if (!c.running) continue;
    const weeksLeft = Math.max(0, (c.weeksTotal || 0) - (c.weeks || 0)), left = Math.ceil(weeksLeft / 4);
    const tv = !!c.tv || !['small', 'indie', 'festival', 'feature', 'blockbuster'].includes(c.scale);
    const epLeft = tv && c.episodes ? Math.max(1, Math.round((weeksLeft - i * 4) / Math.max(1, c.weeksTotal || 1) * c.episodes)) : 0;
    if (i < left) it(tv ? 'onair' : 'cinemas', tv ? '📺' : '🎟️', tv ? 'On air' : 'In cinemas', c.title, tv ? (i === left - 1 ? 'The last episodes' : `${epLeft} episode${epLeft === 1 ? '' : 's'} still to go out`) : (i === left - 1 ? 'Last weeks of the run' : `${weeksLeft - i * 4} weeks of the run left`), { card: i === 0 });
    else if (i === 0 && left === 0) it(tv ? 'onair' : 'cinemas', tv ? '📺' : '🎟️', tv ? 'On air' : 'In cinemas', c.title, tv ? 'The season ends' : 'The run ends');
  }
  for (const x of (g.submissions || [])) if (x.due === abs) it('answer', '📞', 'They answer', x.title, 'About the part you read for');
  // A sequel on its way: the paper comes months before the cameras (franchise.js SEQUEL_LEAD).
  for (const x of (g.laterOffers || [])) if (x.offer) {
    const seq = x.offer.kind === 'sequel';
    if (seq && x.due - SEQUEL_LEAD === abs) it('answer', '📝', 'The sequel', clean(x.offer.projectTitle), 'The contract arrives');
    else if (x.due === abs) it('answer', seq ? '🎥' : '📝', seq ? 'The sequel' : x.offer.kind === 'renewal' ? 'New season' : 'On its way', clean(x.offer.projectTitle), seq ? 'Cameras planned for this month' : 'The script is expected');
  }
  for (const o of (g.offers || [])) {
    if (o.signed) continue;
    // An unsigned paper with the studio's date on it: the month they mean to shoot.
    if ((o.startAt || 0) > now + 1 && o.startAt === abs) it('answer', '🎥', 'Cameras planned', clean(o.projectTitle), 'Unsigned — the paper is in Messages');
    const k = o.contract;
    if (k && k.sent && (k.sent < now ? i === 0 : i === 1)) { it('reply', '📨', 'Their answer', clean(o.projectTitle), `The contract comes back${k.round > 1 ? ` — round ${k.round}` : ''}`); continue; }
    if ((o.deadline || 0) - 1 === i && !(o.waitsForWrap && !canTakeSet(g, o).ok)) it('off', '⏳', 'Offer runs out', clean(o.projectTitle), i === 0 ? 'Answer it this month' : `Answer by ${MON[abs % 12]}`);
  }
  for (const e of (g.events || [])) if ((e.at != null ? e.at : now + (e.monthsLeft || 1) - 1) === abs && !e.attended) it('party', '🎉', 'Party', tierById(e.tier).label, e.invited || (g.fame || 0) >= tierById(e.tier).minFame ? 'You are on the list' : 'Not on the list yet');
  if (i === 0) for (const m of (g.inbox || [])) if (m.kind === 'invite') it('party', '✉️', 'Invitation', m.subj, 'In Email');
  if (g.partner && anniversaryMonth(g, abs)) { const y = anniversaryYears(g, abs); it('love', '💍', 'Anniversary', `${y} ${y === 1 ? 'year' : 'years'} with ${g.partner.name.split(' ')[0]}`, i === 0 ? 'Do something' : `${MON[abs % 12]}`); }
  if (i === 0 && g.partner && onCooldown(g, 'partner')) it('love', '💞', 'An evening', `With ${g.partner.name.split(' ')[0]}`, 'This month');
  else if (i === 0 && (g.sms || []).some((m) => m.tag === 'over' || m.tag === 'anniv')) it('love', '💬', 'They texted', g.partner ? g.partner.name.split(' ')[0] : 'Somebody', 'In Messages');
  const pend = g.awards && g.awards.pending && g.awards.pending[0];
  if (pend && pend.due === abs) it('askers', '🏆', 'The Askers', g.awards.pending.every((q) => q.theirs) ? 'On television' : 'You are up', `${MON[abs % 12]} ${Math.floor(abs / 12)}`);
  return out;
}

// Two sizes of thing. What takes the month is a card; the rest is a line, so twelve
// months fit on one screen. Maxi: "smaller, so I do not have to scroll."
// Post-production and a run in cinemas are a card this month and a blue or green line after,
// because a picture sits in post for half a year and six cards of it is a wall.
const CARD = new Set(['shoot', 'prep', 'signed', 'premiere', 'off', 'hold']);
function Item({ x, onOpen, open }) {
  const sk0 = SKIN[x.kind] || SKIN.answer;
  // A shoot in its own colour; everything else in the kind's.
  const sk = x.hue ? { bg: `linear-gradient(135deg, ${x.hue}44, rgba(255,255,255,.03))`, border: `1px ${x.kind === 'shoot' ? 'solid' : 'dashed'} ${x.hue}99`, bar: x.hue } : sk0;
  if ((!CARD.has(x.kind) && !x.card) || (x.kind === 'off' && x.icon === '⏳')) {
    const color = x.kind === 'off' ? INK.off : x.kind === 'askers' ? INK.premiere : x.kind === 'love' ? INK.love : x.kind === 'post' ? INK.post : x.kind === 'cinemas' ? INK.cinemas : x.kind === 'onair' ? INK.onair : theme.muted;
    return (<div style={{ display: 'flex', gap: 3, alignItems: 'baseline', marginTop: 3, fontSize: 8.5, lineHeight: 1.25, color, fontWeight: 700, minWidth: 0 }}>
      <span style={{ flex: 'none' }}>{x.icon}</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.title}</span>
    </div>);
  }
  return (<div onClick={x.ref && onOpen ? () => onOpen(x.ref) : undefined} style={{ marginTop: 4, borderRadius: 8, padding: '4px 6px 5px', border: sk.border, background: sk.bg, boxShadow: open ? `0 0 0 2px ${x.hue || INK.premiere}` : (sk.shadow || 'inset 0 0 0 1px rgba(255,255,255,.035)'), cursor: x.ref ? 'pointer' : 'default' }}>
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 2, minWidth: 0 }}>
      <span style={{ fontSize: 10 }}>{x.icon}</span>
      <span style={{ fontSize: 7.5, fontWeight: 1000, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: x.kind === 'premiere' ? INK.premiere : theme.text }}>{x.label}</span>
    </div>
    <div style={{ fontSize: 10.5, lineHeight: 1.15, fontWeight: 850, color: '#fff', overflowWrap: 'anywhere' }}>{x.title}</div>
    {x.big
      ? <div style={{ fontSize: 12, fontWeight: 900, color: INK.premiere, marginTop: 2, letterSpacing: '.02em' }}>{x.sub}</div>
      : <div style={{ fontSize: 8.5, lineHeight: 1.2, marginTop: 2, color: theme.muted }}>{x.sub}</div>}
    {x.bar != null && <div style={{ height: 3, background: 'rgba(255,255,255,.08)', borderRadius: 999, overflow: 'hidden', marginTop: 4 }}>
      <span style={{ display: 'block', height: '100%', borderRadius: 999, width: `${Math.max(5, Math.min(100, Math.round(x.bar * 100)))}%`, background: sk.bar || INK[x.kind] }} />
    </div>}
  </div>);
}

// What the month is, for the pill and the cell: the thing that takes your time wins.
function stateOf(items) {
  const has = (k) => items.some((x) => x.kind === k);
  if (has('off') && items.some((x) => x.kind === 'off' && x.icon === '🚫')) return 'off';
  if (has('hold')) return 'hold';
  if (has('shoot')) return 'shoot';
  if (has('prep')) return 'prep';
  if (has('signed')) return 'signed';
  return 'free';
}
const PILL = {
  free: { text: 'free', bg: 'rgba(255,255,255,.06)', border: 'rgba(255,255,255,.14)', color: '#a9a1c4' },
  shoot: { text: 'shoot', bg: 'rgba(139,92,246,.28)', border: 'rgba(167,139,250,.55)', color: '#e6dcff' },
  prep: { text: 'prep', bg: 'rgba(139,92,246,.16)', border: 'rgba(167,139,250,.45)', color: '#e6dcff' },
  signed: { text: 'booked', bg: 'rgba(139,92,246,.16)', border: 'rgba(167,139,250,.45)', color: '#e6dcff' },
  off: { text: 'off', bg: '#4a1724', border: '#ff6b8a', color: '#ffd5df' },
  hold: { text: 'hold', bg: 'rgba(148,163,184,.18)', border: 'rgba(148,163,184,.5)', color: '#e2e8f0' },
};

// What a project is, when you tap it on the calendar. Maxi: "when you press a project it
// should show what the project is, how many months of shooting, your role — everything."
function Detail({ g, target, onClose }) {
  const ref = target;
  const MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const now = (g.year || 0) * 12 + (g.month || 0);
  const when = (abs) => `${MONF[((abs % 12) + 12) % 12]} ${Math.floor(abs / 12)}`;
  const row = (k, v) => v == null || v === '' ? null : (<div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11.5, padding: '4px 0', borderBottom: `1px solid ${theme.line}` }}><span style={{ color: theme.muted }}>{k}</span><span style={{ fontWeight: 700, textAlign: 'right' }}>{v}</span></div>);
  let title = '', hue = INK.premiere, rows = [], head = '';
  if (ref.kind === 'set') {
    const p = sets(g).find((x) => x.id === ref.id); if (!p) return null;
    title = p.title; hue = hueOf(p.title); head = p.episodes ? `${p.type || 'Series'} · season ${p.season || 1}` : (p.type || 'Film');
    const done = (p.months || 0) - (p.monthsLeft || 0);
    const start = now - done, wrap = now + (p.prepLeft || 0) + (p.monthsLeft || 0) - 1;
    rows = [row('Your part', `${p.role || 'Lead'}${p.genre ? ` · ${p.genre}` : ''}`), row('Shooting', `${p.months} month${p.months === 1 ? '' : 's'}${p.episodes ? ` · ${p.episodes} episodes` : ''}`), row('On set', `${when(start)} → ${when(wrap)}`),
      p.prepLeft > 0 ? row('Preparation', `${p.prepLeft} month${p.prepLeft === 1 ? '' : 's'} to go`) : null,
      row('Fee', `€${Math.round(p.salary || 0).toLocaleString()} · €${Math.round((p.salary || 0) / Math.max(1, p.months || 1)).toLocaleString()} a month`),
      row('Director', ((p.crew || [])[0] || {}).name), p.with ? row('Opposite', p.with) : null,
      row('Shoot quality', Math.round(p.meter || 0)), p.exclusive ? row('Contract', 'Exclusive — nothing else while you shoot') : null, p.backend ? row('Back end', `${p.backend}% past break-even`) : null];
  } else if (ref.kind === 'offer') {
    const o = (g.offers || []).find((x) => x.id === ref.id); if (!o) return null;
    title = clean(o.projectTitle); hue = hueOf(title); head = `${o.type || 'Film'} · signed, waiting for a set`;
    const start = Math.max((o.startAt || now + 1), now + 1);
    rows = [row('Your part', `${o.role || 'Lead'}${o.genre ? ` · ${o.genre}` : ''}`), row('Shooting', `${o.months} month${o.months === 1 ? '' : 's'}`), row('Starts', `${when(start)} at the earliest`), o.prep ? row('Preparation', `${o.prep} month${o.prep === 1 ? '' : 's'} first`) : null,
      row('Fee', `€${Math.round(o.salary || 0).toLocaleString()}`), o.exclusive ? row('Contract', 'Exclusive') : null];
  } else if (ref.kind === 'release') {
    const r = (g.releases || []).find((x) => x.id === ref.id); if (!r) return null;
    title = r.title; head = `${r.type || 'Film'} · premiere`;
    rows = [row('Opens', `${dayOf(r.title)} ${when(r.due)}`), row('Your part', `${r.role || 'Lead'}${r.genre ? ` · ${r.genre}` : ''}`), row('Size', r.scale), r.with ? row('Opposite', r.with) : null, r.director ? row('Director', r.director) : null, row('In post since', when(r.due - (r.wait || 0)))];
  }
  return (<div style={{ background: theme.panel, border: `1px solid ${hue}88`, borderLeft: `4px solid ${hue}`, borderRadius: 10, padding: '9px 11px', marginBottom: 8 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
      <div><div style={{ fontSize: 13.5, fontWeight: 900 }}>{title}</div><div style={{ fontSize: 10.5, color: theme.muted }}>{head}</div></div>
      <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: theme.muted, fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>✕</button>
    </div>
    <div style={{ marginTop: 6 }}>{rows}</div>
  </div>);
}
export function Diary({ g }) {
  const [two, setTwo] = useState(false);
  const [open, setOpen] = useState(null);
  const now = (g.year || 0) * 12 + (g.month || 0);
  const cells = [];
  for (let i = 0; i < (two ? 24 : 12); i++) { const abs = now + i; cells.push({ i, abs, yr: Math.floor(abs / 12), mo: abs % 12, items: itemsFor(g, i, abs) }); }
  const pillStyle = (k) => ({ display: 'inline-block', padding: '1px 5px', borderRadius: 999, background: PILL[k].bg, border: `1px solid ${PILL[k].border}`, fontSize: 8, fontWeight: 900, color: PILL[k].color, whiteSpace: 'nowrap' });
  return (<div style={{ marginBottom: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted }}>Agenda</div>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 9, color: theme.muted }}>
        {[['🎥', 'shoot'], ['🎬', 'premiere'], ['🎟️', 'cinemas'], ['📺', 'on air']].map(([ic, t]) => <span key={t}>{ic} {t}</span>)}
        <button onClick={() => setTwo(!two)} style={{ background: 'transparent', border: `1px solid ${theme.line}`, color: theme.muted, borderRadius: 999, padding: '2px 7px', fontSize: 9, fontWeight: 800, cursor: 'pointer', marginLeft: 3 }}>{two ? '12 months' : '24 months'}</button>
      </div>
    </div>
    {open && <Detail g={g} target={open} onClose={() => setOpen(null)} />}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
      {cells.map((c) => {
        const st = stateOf(c.items);
        const prem = c.items.some((x) => x.kind === 'premiere');
        // The cell: gold and lit for a premiere, red when you are signed off, a wash of
        // purple for a shoot, a cool blue for a month something of yours is in post.
        const cell = prem ? { background: 'linear-gradient(135deg,#3a2a08,#1e1430)', border: '1.5px solid #ffd166', boxShadow: '0 0 0 1px rgba(255,209,102,.18), 0 0 22px rgba(255,209,102,.2), inset 0 0 14px rgba(255,209,102,.06)' }
          : st === 'off' ? { background: 'linear-gradient(135deg,#3a1421,#2b1320)', border: '1px solid #ff6b8a', boxShadow: '0 0 0 1px rgba(255,107,138,.25)' }
          : st === 'shoot' || st === 'prep' ? { background: `linear-gradient(135deg, ${theme.panel}, rgba(139,92,246,.10))`, border: '1px solid rgba(167,139,250,.35)' }
          : { background: theme.panel, border: `1px solid ${c.i === 0 ? theme.accent : theme.line}` };
        return (<div key={c.i} style={{ ...cell, borderRadius: 9, padding: '5px 6px 6px', minHeight: 54, overflow: 'hidden', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 3 }}>
            <b style={{ fontSize: 10, color: c.i === 0 ? theme.accent : theme.text, whiteSpace: 'nowrap' }}>{MON[c.mo]} {c.i === 0 || c.mo === 0 ? c.yr : `’${String(c.yr).slice(2)}`}</b>
            <span style={pillStyle(st)}>{PILL[st].text}</span>
          </div>
          {c.mo === 0 && c.i !== 0 && <span style={{ display: 'block', margin: '4px 0 0', fontSize: 8, background: `linear-gradient(135deg,${theme.accent2},${theme.accent})`, color: '#fff', borderRadius: 6, padding: '3px 5px', fontWeight: 1000, letterSpacing: '.04em' }}>✨ NEW YEAR</span>}
          {c.items.map((x, k) => <Item key={k} x={x} onOpen={(r) => setOpen(open && open.kind === r.kind && open.id === r.id ? null : r)} open={open && x.ref && open.kind === x.ref.kind && open.id === x.ref.id} />)}
          {!c.items.length && <p style={{ color: theme.muted, fontSize: 9, margin: '6px 0 0', opacity: .6 }}>free</p>}
        </div>);
      })}
    </div>
  </div>);
}
