import { useState } from 'react';
import { theme } from '../theme.js';
import { onCooldown } from '../../engine/cooldown.js';
import { anniversaryMonth, anniversaryYears } from '../../systems/life/dating.js';
import { tierById } from '../../systems/social/events.js';

// The agenda. This is the calendar from the first prototype, the one Maxi remembered when
// none of ten new ones would do: a card a month, two across, "Jan 2052 · 1/12" with a pill
// saying whether the month is yours, and inside it a card for each thing — the shoot in
// purple with a bar that fills as it goes, post-production in blue, the premiere in gold
// with the whole month lit, and "free" written small where nothing is. Maxi: "post one
// colour, the shoot another, the premiere gold, so nothing gets confused."
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const clean = (t) => String(t || '').replace('⭐ ', '');
// A premiere has a day, not just a month. Drawn from the title so it never moves.
const dayOf = (title) => { let h = 0; for (const ch of String(title || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return 5 + (h % 23); };

// The colours, in one place: the item cards, the month cells and the legend all read these.
export const INK = { shoot: '#a78bfa', prep: '#c4b5fd', signed: '#a78bfa', post: '#60a5fa', premiere: '#ffd166', cinemas: '#06d6a0', off: '#ff6b8a', hold: '#94a3b8', answer: '#e2ddf5', reply: '#e2ddf5', party: '#06d6a0', love: '#ff8d9e', askers: '#ffd166' };
const SKIN = {
  shoot: { bg: 'linear-gradient(135deg, rgba(139,92,246,.26), rgba(255,255,255,.03))', border: '1px solid rgba(167,139,250,.42)', bar: 'linear-gradient(90deg,#8b5cf6,#ffd166)' },
  prep: { bg: 'linear-gradient(135deg, rgba(139,92,246,.12), rgba(255,255,255,.03))', border: '1px dashed rgba(167,139,250,.5)', bar: 'rgba(167,139,250,.75)' },
  signed: { bg: 'linear-gradient(135deg, rgba(139,92,246,.12), rgba(255,255,255,.03))', border: '1px dashed rgba(167,139,250,.5)' },
  post: { bg: 'linear-gradient(135deg, rgba(96,165,250,.18), rgba(255,255,255,.025))', border: '1px solid rgba(96,165,250,.4)', bar: 'linear-gradient(90deg,#3b82f6,#93c5fd)' },
  premiere: { bg: 'linear-gradient(135deg, #3a2a08, #241a0f)', border: '1.5px solid #ffd166', shadow: '0 0 22px rgba(255,209,102,.13), inset 0 0 0 1px rgba(255,255,255,.08)' },
  cinemas: { bg: 'linear-gradient(135deg, rgba(6,214,160,.16), rgba(255,255,255,.03))', border: '1px solid rgba(6,214,160,.36)' },
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
  // The shoot: preparation first, then the months on set. Both take the month.
  const p = g.production;
  const prepLeft = p ? (p.prepLeft || 0) : 0, shootLeft = p ? (p.monthsLeft || 0) : 0;
  if (p && i === 0 && ((g.illness && g.illness.freezes) || (g.burnout && g.burnout.rest && g.burnout.left > 0))) it('hold', '🧊', 'On hold', p.title, 'The set waits while you recover');
  if (p && i < prepLeft) it('prep', '🥊', 'Preparation', p.title, `Month ${(p.prep || 1) - prepLeft + i + 1} of ${p.prep || 1} before the first day`, { bar: ((p.prep || 1) - prepLeft + i + 1) / (p.prep || 1) });
  else if (p && i < prepLeft + shootLeft) {
    const n = (p.months || 0) - shootLeft + (i - prepLeft) + 1;
    it('shoot', '🎥', 'Shooting', p.title, i === prepLeft + shootLeft - 1 ? `Month ${n} of ${p.months} — wraps` : `Month ${n} of ${p.months}${p.with ? ` · with ${p.with}` : ''}`, { bar: n / (p.months || 1) });
  }
  // A signed paper waiting for the set: it starts the month you are free.
  for (const o of (g.offers || [])) {
    if (!o.signed) continue;
    const start = Math.max((o.startAt || now + 1) - now, prepLeft + shootLeft);
    const prep = o.prep || 0, months = o.months || 1;
    if (i >= start && i < start + prep) it('prep', '🥊', 'Preparation', clean(o.projectTitle), `Month ${i - start + 1} of ${prep} before the first day`, { bar: (i - start + 1) / prep });
    else if (i >= start + prep && i < start + prep + months) it('signed', '✍️', 'Signed', clean(o.projectTitle), `Shooting, month ${i - start - prep + 1} of ${months}`);
  }
  for (const r of (g.releases || [])) {
    if (r.due === abs) it('premiere', '🎬', 'Premiere', r.title, `${dayOf(r.title)} ${MON[abs % 12]} ${Math.floor(abs / 12)}`, { big: true });
    else if (r.due > abs) { const wait = r.wait || (r.due - now) || 1; it('post', '✂️', 'Post-production', r.title, `Editing · opens ${MON[r.due % 12]} ${Math.floor(r.due / 12)}`, { bar: Math.max(.05, (wait - (r.due - abs)) / wait) }); }
  }
  for (const c of (g.filmography || [])) {
    if (!c.running) continue;
    const weeksLeft = Math.max(0, (c.weeksTotal || 0) - (c.weeks || 0)), left = Math.ceil(weeksLeft / 4);
    if (i < left) it('cinemas', '🎟️', 'In cinemas', c.title, i === left - 1 ? 'Last weeks of the run' : `${weeksLeft - i * 4} weeks of the run left`);
    else if (i === 0 && left === 0) it('cinemas', '🎟️', 'In cinemas', c.title, 'The run ends');
  }
  for (const x of (g.submissions || [])) if (x.due === abs) it('answer', '📞', 'They answer', x.title, 'About the part you read for');
  for (const o of (g.offers || [])) {
    if (o.signed) continue;
    const k = o.contract;
    if (k && k.sent && (k.sent < now ? i === 0 : i === 1)) { it('reply', '📨', 'Their answer', clean(o.projectTitle), `The contract comes back${k.round > 1 ? ` — round ${k.round}` : ''}`); continue; }
    if ((o.deadline || 0) - 1 === i && !(o.waitsForWrap && g.production)) it('off', '⏳', 'Offer runs out', clean(o.projectTitle), i === 0 ? 'Answer it this month' : `Answer by ${MON[abs % 12]}`);
  }
  for (const e of (g.events || [])) if (e.monthsLeft - 1 === i && !e.attended) it('party', '🎉', 'Party', tierById(e.tier).label, 'Last month to go');
  if (i === 0) for (const m of (g.inbox || [])) if (m.kind === 'invite') it('party', '✉️', 'Invitation', m.subj, 'In Email');
  if (g.partner && anniversaryMonth(g, abs)) { const y = anniversaryYears(g, abs); it('love', '💍', 'Anniversary', `${y} ${y === 1 ? 'year' : 'years'} with ${g.partner.name.split(' ')[0]}`, i === 0 ? 'Do something' : `${MON[abs % 12]}`); }
  if (i === 0 && g.partner && onCooldown(g, 'partner')) it('love', '💞', 'An evening', `With ${g.partner.name.split(' ')[0]}`, 'This month');
  else if (i === 0 && (g.sms || []).some((m) => m.tag === 'over' || m.tag === 'anniv')) it('love', '💬', 'They texted', g.partner ? g.partner.name.split(' ')[0] : 'Somebody', 'In Messages');
  const pend = g.awards && g.awards.pending && g.awards.pending[0];
  if (pend && pend.due === abs) it('askers', '🏆', 'The Askers', g.awards.pending.every((q) => q.theirs) ? 'On television' : 'You are up', `${MON[abs % 12]} ${Math.floor(abs / 12)}`);
  return out;
}

function Item({ x }) {
  const sk = SKIN[x.kind] || SKIN.answer;
  return (<div style={{ marginTop: 7, borderRadius: 12, padding: '8px 9px', border: sk.border, background: sk.bg, boxShadow: sk.shadow || 'inset 0 0 0 1px rgba(255,255,255,.035)' }}>
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, minWidth: 0 }}>
      <span style={{ fontSize: 14 }}>{x.icon}</span>
      <span style={{ fontSize: 10, fontWeight: 1000, letterSpacing: '.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', color: x.kind === 'premiere' ? INK.premiere : theme.text }}>{x.label}</span>
    </div>
    <div style={{ fontSize: 13, lineHeight: 1.15, fontWeight: 850, color: '#fff', overflowWrap: 'anywhere' }}>{x.title}</div>
    {x.big
      ? <div style={{ fontSize: 17, fontWeight: 900, color: INK.premiere, marginTop: 4, letterSpacing: '.02em' }}>{x.sub}</div>
      : <div style={{ fontSize: 11, lineHeight: 1.2, marginTop: 3, color: theme.muted }}>{x.sub}</div>}
    {x.bar != null && <div style={{ height: 5, background: 'rgba(255,255,255,.08)', borderRadius: 999, overflow: 'hidden', marginTop: 7 }}>
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
  shoot: { text: 'shooting', bg: 'rgba(139,92,246,.28)', border: 'rgba(167,139,250,.55)', color: '#e6dcff' },
  prep: { text: 'prep', bg: 'rgba(139,92,246,.16)', border: 'rgba(167,139,250,.45)', color: '#e6dcff' },
  signed: { text: 'booked', bg: 'rgba(139,92,246,.16)', border: 'rgba(167,139,250,.45)', color: '#e6dcff' },
  off: { text: 'signed off', bg: '#4a1724', border: '#ff6b8a', color: '#ffd5df' },
  hold: { text: 'on hold', bg: 'rgba(148,163,184,.18)', border: 'rgba(148,163,184,.5)', color: '#e2e8f0' },
};

export function Diary({ g }) {
  const [two, setTwo] = useState(false);
  const now = (g.year || 0) * 12 + (g.month || 0);
  const cells = [];
  for (let i = 0; i < (two ? 24 : 12); i++) { const abs = now + i; cells.push({ i, abs, yr: Math.floor(abs / 12), mo: abs % 12, items: itemsFor(g, i, abs) }); }
  const pillStyle = (k) => ({ display: 'inline-block', padding: '3px 8px', borderRadius: 999, background: PILL[k].bg, border: `1px solid ${PILL[k].border}`, fontSize: 10.5, fontWeight: 900, color: PILL[k].color, whiteSpace: 'nowrap' });
  return (<div style={{ marginBottom: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted }}>Agenda</div>
      <button onClick={() => setTwo(!two)} style={{ background: 'transparent', border: `1px solid ${theme.line}`, color: theme.muted, borderRadius: 999, padding: '3px 9px', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}>{two ? 'This year' : 'Next year too'}</button>
    </div>
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '0 0 10px', fontSize: 11, color: theme.muted }}>
      {[['🎥', 'Shooting'], ['✂️', 'Post'], ['🎬', 'Premiere'], ['🎟️', 'In cinemas'], ['🚫', 'Signed off']].map(([ic, t]) => (
        <span key={t} style={{ border: '1px solid rgba(255,255,255,.12)', borderRadius: 999, padding: '4px 8px', background: 'rgba(255,255,255,.04)' }}>{ic} {t}</span>))}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {cells.map((c) => {
        const st = stateOf(c.items);
        const prem = c.items.some((x) => x.kind === 'premiere'), post = c.items.some((x) => x.kind === 'post');
        // The cell: gold and lit for a premiere, red when you are signed off, a wash of
        // purple for a shoot, a cool blue for a month something of yours is in post.
        const cell = prem ? { background: 'linear-gradient(135deg,#3a2a08,#1e1430)', border: '2px solid #ffd166', boxShadow: '0 0 0 2px rgba(255,209,102,.18), 0 0 32px rgba(255,209,102,.2), inset 0 0 18px rgba(255,209,102,.06)' }
          : st === 'off' ? { background: 'linear-gradient(135deg,#3a1421,#2b1320)', border: '1px solid #ff6b8a', boxShadow: '0 0 0 1px rgba(255,107,138,.25)' }
          : st === 'shoot' || st === 'prep' ? { background: `linear-gradient(135deg, ${theme.panel}, rgba(139,92,246,.10))`, border: '1px solid rgba(167,139,250,.35)' }
          : post ? { background: 'linear-gradient(135deg,#151523,#151927)', border: `1px solid ${theme.line}`, boxShadow: 'inset 0 0 0 1px rgba(96,165,250,.14)' }
          : { background: theme.panel, border: `1px solid ${c.i === 0 ? theme.accent : theme.line}` };
        return (<div key={c.i} style={{ ...cell, borderRadius: 12, padding: 8, minHeight: 82, overflow: 'hidden', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <b style={{ fontSize: 12, color: c.i === 0 ? theme.accent : theme.text }}>{MON[c.mo]} {c.yr} · {c.mo + 1}/12</b>
            <span style={pillStyle(st)}>{PILL[st].text}</span>
          </div>
          {c.mo === 0 && c.i !== 0 && <span style={{ display: 'block', margin: '6px 0 2px', fontSize: 12, background: `linear-gradient(135deg,${theme.accent2},${theme.accent})`, color: '#fff', borderRadius: 10, padding: '7px 8px', fontWeight: 1000 }}>✨ NEW YEAR</span>}
          {c.items.map((x, k) => <Item key={k} x={x} />)}
          {!c.items.length && <p style={{ color: theme.muted, fontSize: 11, margin: '8px 0 0', opacity: .65 }}>free</p>}
        </div>);
      })}
    </div>
  </div>);
}
