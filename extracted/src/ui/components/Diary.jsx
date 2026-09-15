import { theme } from '../theme.js';
import { onCooldown } from '../../engine/cooldown.js';
import { anniversaryMonth, anniversaryYears } from '../../systems/life/dating.js';
import { tierById } from '../../systems/social/events.js';

// The year ahead, as a wall calendar: twelve month cards in two columns, each one saying in
// words what is in it — the shoot and which month of it, what is in post and when it opens,
// the run in cinemas, a read coming back, a party, an offer running out, the Askers night.
// The first version was a four-by-three grid of cells fifty pixels tall that said "🎬 📞 🎉"
// and nothing else; the second was a bare list, which Maxi called terrible. This is the
// grid again, with room to read.
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function linesFor(g, i, abs) {
  const out = [];
  const gold = theme.gold, mute = theme.muted, acc = theme.accent;
  if (g.burnout && i < (g.burnout.left || 0)) out.push({ icon: '🚫', text: i === (g.burnout.left || 0) - 1 ? 'Signed off — cleared next month' : 'Signed off', col: theme.bad, strong: true });
  if (g.production && i < g.production.monthsLeft) {
    const p = g.production; const n = (p.months || 0) - (p.monthsLeft || 0) + i + 1;
    out.push({ icon: '🎬', text: `${p.title} — ${i === p.monthsLeft - 1 ? 'wraps' : `shooting, month ${n} of ${p.months}`}`, col: gold, strong: true, key: 'shoot' });
  }
  for (const r of (g.releases || [])) {
    if (r.due === abs) out.push({ icon: '🍿', text: `${r.title} opens`, col: gold, strong: true, key: 'premiere' });
    else if (r.due > abs) out.push({ icon: '🎞', text: `${r.title} — in post, opens ${MON[r.due % 12]}`, col: mute });
  }
  for (const c of (g.filmography || [])) {
    if (!c.running) continue;
    const left = Math.max(0, Math.ceil(((c.weeksTotal || 0) - (c.weeks || 0)) / 4));
    if (i < left) out.push({ icon: '🎟', text: `${c.title} — in cinemas${i === left - 1 ? ', last weeks' : ''}`, col: mute });
    else if (i === 0 && left === 0) out.push({ icon: '🎟', text: `${c.title} — the run ends`, col: mute });
  }
  for (const x of (g.submissions || [])) if (x.due === abs) out.push({ icon: '📞', text: `${x.title} — they answer`, col: acc });
  for (const o of (g.offers || [])) if ((o.deadline || 0) - 1 === i && !(o.waitsForWrap && g.production)) out.push({ icon: '⏳', text: `${String(o.projectTitle || '').replace('⭐ ', '')} — offer runs out`, col: theme.bad });
  for (const e of (g.events || [])) if (e.monthsLeft - 1 === i && !e.attended) out.push({ icon: '🎉', text: `${tierById(e.tier).label} — last month`, col: acc });
  if (i === 0) for (const m of (g.inbox || [])) if (m.kind === 'invite') out.push({ icon: '✉️', text: `${m.subj} — in Email`, col: acc });
  if (g.partner && anniversaryMonth(g, abs)) { const y = anniversaryYears(g, abs); out.push({ icon: '💍', text: `${y} ${y === 1 ? 'year' : 'years'} with ${g.partner.name.split(' ')[0]}`, col: '#ff8d9e' }); }
  if (i === 0 && g.partner && onCooldown(g, 'partner')) out.push({ icon: '💞', text: `An evening with ${g.partner.name.split(' ')[0]}`, col: '#ff8d9e' });
  else if (i === 0 && (g.sms || []).some((m) => m.tag === 'over' || m.tag === 'anniv')) out.push({ icon: '💬', text: 'They texted — in Messages', col: '#ff8d9e' });
  const pend = g.awards && g.awards.pending && g.awards.pending[0];
  if (pend && pend.due === abs) out.push({ icon: '🏆', text: g.awards.pending.every((p) => p.theirs) ? 'The Askers — on television' : 'The Askers — you are up', col: gold, strong: true });
  return out;
}

export function Diary({ g }) {
  const now = (g.year || 0) * 12 + (g.month || 0);
  const cells = [];
  for (let i = 0; i < 12; i++) { const abs = now + i; cells.push({ i, yr: Math.floor(abs / 12), mo: abs % 12, lines: linesFor(g, i, abs) }); }
  return (<div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>The year ahead</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
      {cells.map((c) => {
        const shoot = c.lines.some((l) => l.key === 'shoot'), premiere = c.lines.some((l) => l.key === 'premiere');
        const off = c.lines.some((l) => l.icon === '🚫');
        const edge = off ? 'rgba(255,106,138,.45)' : premiere ? 'rgba(255,209,102,.7)' : shoot ? 'rgba(255,209,102,.4)' : c.i === 0 ? theme.accent : theme.line;
        const bg = off ? 'rgba(255,106,138,.08)' : c.i === 0 ? 'rgba(158,116,255,.14)' : shoot ? 'rgba(255,209,102,.06)' : theme.panel;
        const shown = c.lines.slice(0, 4);
        return (<div key={c.i} style={{ background: bg, border: `1px solid ${edge}`, borderRadius: 11, padding: '8px 9px 9px', minHeight: 64 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: c.lines.length ? 5 : 0 }}>
            <span style={{ fontSize: 12.5, fontWeight: 900, color: off ? theme.bad : c.i === 0 ? theme.accent : theme.text }}>{c.i === 0 ? FULL[c.mo] : MON[c.mo]}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: theme.muted }}>{c.mo === 0 || c.i === 0 ? `’${String(c.yr).slice(2)}` : ''}</span>
          </div>
          {shown.map((l, k) => (<div key={k} style={{ display: 'flex', gap: 5, fontSize: 10.5, lineHeight: 1.35, color: l.col, fontWeight: l.strong ? 800 : 600, marginTop: k ? 3 : 0 }}>
            <span style={{ flex: 'none', fontSize: 10 }}>{l.icon}</span><span style={{ minWidth: 0 }}>{l.text}</span>
          </div>))}
          {c.lines.length > 4 && <div style={{ fontSize: 9.5, color: theme.muted, marginTop: 3 }}>+{c.lines.length - 4} more</div>}
          {!c.lines.length && <div style={{ fontSize: 10, color: theme.muted, opacity: .55, marginTop: 6 }}>nothing booked</div>}
        </div>);
      })}
    </div>
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', fontSize: 10.5, color: theme.muted, flexWrap: 'wrap', marginTop: 8 }}>
      <span>🎬 shooting</span><span>🎞 in post</span><span>🍿 premiere</span><span>🎟 in cinemas</span><span>📞 they answer</span><span>⏳ offer runs out</span><span>🎉 party</span><span>🏆 the Askers</span>
    </div>
  </div>);
}
