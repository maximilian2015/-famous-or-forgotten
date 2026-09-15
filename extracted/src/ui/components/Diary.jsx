import { theme } from '../theme.js';
import { onCooldown } from '../../engine/cooldown.js';
import { anniversaryMonth, anniversaryYears } from '../../systems/life/dating.js';
import { tierById } from '../../systems/social/events.js';

// The year ahead, as a list. It was a four-by-three grid of cells fifty pixels tall, and a
// month with a shoot, a film in post, a read coming back and a party in it said "🎬 📞 🎉"
// and nothing else. Maxi: "the calendar should show the shoot every month with the title
// and the status, and after the shoot the premiere — you remember how many things can be
// in one month?" A row a month, and every line written out.
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function linesFor(g, i, abs) {
  const out = [];
  const gold = theme.gold, mute = theme.muted, acc = theme.accent;
  // Signed off. These months are not yours.
  if (g.burnout && i < (g.burnout.left || 0)) out.push({ icon: '🚫', text: i === (g.burnout.left || 0) - 1 ? 'Signed off — cleared next month' : 'Signed off', col: theme.bad });
  // The shoot, month by month.
  if (g.production && i < g.production.monthsLeft) {
    const p = g.production; const n = (p.months || 0) - (p.monthsLeft || 0) + i + 1;
    out.push({ icon: '🎬', text: `${p.title} · ${i === p.monthsLeft - 1 ? 'wraps' : `shooting, month ${n} of ${p.months}`}`, col: gold, strong: true });
  }
  // In post, and the night it opens.
  for (const r of (g.releases || [])) {
    if (r.due === abs) out.push({ icon: '🍿', text: `${r.title} opens`, col: gold, strong: true });
    else if (r.due > abs) out.push({ icon: '🎞', text: `${r.title} · in post, opens ${MON[r.due % 12]}`, col: mute });
  }
  // In cinemas, until the run closes.
  for (const c of (g.filmography || [])) {
    if (!c.running) continue;
    const left = Math.max(0, Math.ceil(((c.weeksTotal || 0) - (c.weeks || 0)) / 4));
    if (i < left) out.push({ icon: '🎟', text: `${c.title} · in cinemas${i === left - 1 ? ', the run ends' : ''}`, col: mute });
    else if (i === left && left === 0) out.push({ icon: '🎟', text: `${c.title} · the run ends`, col: mute });
  }
  // The answer to a read.
  for (const x of (g.submissions || [])) if (x.due === abs) out.push({ icon: '📞', text: `${x.title} — they answer`, col: acc });
  // Offers running out.
  for (const o of (g.offers || [])) if ((o.deadline || 0) - 1 === i && !(o.waitsForWrap && g.production)) out.push({ icon: '⏳', text: `${String(o.projectTitle || '').replace('⭐ ', '')} — answer by now or it goes`, col: theme.bad });
  // Parties and premieres you could go to.
  for (const e of (g.events || [])) if (e.monthsLeft - 1 === i && !e.attended) out.push({ icon: '🎉', text: `${tierById(e.tier).label} at ${e.venue} — last month to go`, col: acc });
  // An invitation waiting in the inbox is a thing to do this month.
  if (i === 0) for (const m of (g.inbox || [])) if (m.kind === 'invite') out.push({ icon: '✉️', text: `${m.subj} — in your Email`, col: acc });
  // The other person in your life.
  if (g.partner && anniversaryMonth(g, abs)) { const y = anniversaryYears(g, abs); out.push({ icon: '💍', text: `${y} ${y === 1 ? 'year' : 'years'} with ${g.partner.name.split(' ')[0]}${i === 0 ? ' — do something' : ''}`, col: '#ff8d9e' }); }
  if (i === 0 && g.partner && onCooldown(g, 'partner')) out.push({ icon: '💞', text: `An evening with ${g.partner.name.split(' ')[0]} this month`, col: '#ff8d9e' });
  else if (i === 0 && (g.sms || []).some((m) => m.tag === 'over' || m.tag === 'anniv')) out.push({ icon: '💬', text: 'They texted — it is in Messages', col: '#ff8d9e' });
  // The Askers, if a night is coming.
  const pend = g.awards && g.awards.pending && g.awards.pending[0];
  if (pend && pend.due === abs) out.push({ icon: '🏆', text: pend.theirs && g.awards.pending.every((p) => p.theirs) ? 'The Askers — on television' : 'The Askers — you are up', col: gold, strong: true });
  return out;
}

export function Diary({ g }) {
  const now = (g.year || 0) * 12 + (g.month || 0);
  const rows = [];
  for (let i = 0; i < 12; i++) { const abs = now + i; rows.push({ i, yr: Math.floor(abs / 12), mo: abs % 12, lines: linesFor(g, i, abs) }); }
  return (<div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>The year ahead</div>
    <div style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, overflow: 'hidden' }}>
      {rows.map((r) => (<div key={r.i} style={{ display: 'flex', gap: 10, padding: '7px 10px', borderTop: r.i ? `1px solid ${theme.line}` : 'none',
        background: r.i === 0 ? 'rgba(158,116,255,.12)' : 'transparent' }}>
        <div style={{ width: 52, flex: 'none', fontSize: 11, fontWeight: 900, color: r.i === 0 ? theme.accent : theme.muted, paddingTop: 1 }}>
          {MON[r.mo]}{r.mo === 0 || r.i === 0 ? <span style={{ fontWeight: 600, opacity: .7 }}> ’{String(r.yr).slice(2)}</span> : null}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {r.lines.length === 0 && <div style={{ fontSize: 11, color: theme.muted, opacity: .55 }}>—</div>}
          {r.lines.map((l, k) => (<div key={k} style={{ display: 'flex', gap: 6, fontSize: 11.5, lineHeight: 1.45, color: l.col, fontWeight: l.strong ? 800 : 600 }}>
            <span style={{ flex: 'none' }}>{l.icon}</span><span style={{ minWidth: 0 }}>{l.text}</span>
          </div>))}
        </div>
      </div>))}
    </div>
  </div>);
}
