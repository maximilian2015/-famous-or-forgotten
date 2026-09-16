import { theme } from '../theme.js';
import { onCooldown } from '../../engine/cooldown.js';
import { anniversaryMonth, anniversaryYears } from '../../systems/life/dating.js';
import { tierById } from '../../systems/social/events.js';

// The year ahead, as a wall calendar: twelve month pages, two across. Each page has the
// little grid of days a real calendar has, tinted by what the month is — one colour for a
// shoot, another for post-production, gold for a premiere — and under it, in words, what
// is in the month. Maxi: "like a real calendar; post one colour, the shoot another, the
// premiere gold, so nothing gets confused."
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// The colours. Kept in one place so the legend and the pages cannot disagree.
export const INK = { shoot: '#ff8a5c', prep: '#ffb07a', post: '#6f8cff', premiere: '#ffd166', cinemas: '#5fce8a', off: '#ff6a8a', answer: '#c9b6ff', party: '#c9b6ff', love: '#ff8d9e', askers: '#ffd166' };

function linesFor(g, i, abs) {
  const out = [];
  if (g.burnout && i < (g.burnout.left || 0)) out.push({ kind: 'off', text: i === (g.burnout.left || 0) - 1 ? 'Signed off — cleared next month' : 'Signed off', strong: true });
  if (g.production && i < g.production.monthsLeft) {
    const p = g.production; const n = (p.months || 0) - (p.monthsLeft || 0) + i + 1;
    out.push({ kind: 'shoot', text: `${p.title} — ${i === p.monthsLeft - 1 ? 'wraps' : `shooting, month ${n} of ${p.months}`}`, strong: true });
  }
  for (const r of (g.releases || [])) {
    if (r.due === abs) out.push({ kind: 'premiere', text: `${r.title} — premiere`, strong: true });
    else if (r.due > abs) out.push({ kind: 'post', text: `${r.title} — in post, opens ${MON[r.due % 12]}` });
  }
  for (const c of (g.filmography || [])) {
    if (!c.running) continue;
    const left = Math.max(0, Math.ceil(((c.weeksTotal || 0) - (c.weeks || 0)) / 4));
    if (i < left) out.push({ kind: 'cinemas', text: `${c.title} — in cinemas${i === left - 1 ? ', last weeks' : ''}` });
    else if (i === 0 && left === 0) out.push({ kind: 'cinemas', text: `${c.title} — the run ends` });
  }
  for (const x of (g.submissions || [])) if (x.due === abs) out.push({ kind: 'answer', text: `${x.title} — they answer` });
  for (const o of (g.offers || [])) if ((o.deadline || 0) - 1 === i && !(o.waitsForWrap && g.production)) out.push({ kind: 'off', text: `${String(o.projectTitle || '').replace('⭐ ', '')} — offer runs out` });
  for (const e of (g.events || [])) if (e.monthsLeft - 1 === i && !e.attended) out.push({ kind: 'party', text: `${tierById(e.tier).label} — last month` });
  if (i === 0) for (const m of (g.inbox || [])) if (m.kind === 'invite') out.push({ kind: 'party', text: `${m.subj} — in Email` });
  if (g.partner && anniversaryMonth(g, abs)) { const y = anniversaryYears(g, abs); out.push({ kind: 'love', text: `${y} ${y === 1 ? 'year' : 'years'} with ${g.partner.name.split(' ')[0]}` }); }
  if (i === 0 && g.partner && onCooldown(g, 'partner')) out.push({ kind: 'love', text: `An evening with ${g.partner.name.split(' ')[0]}` });
  else if (i === 0 && (g.sms || []).some((m) => m.tag === 'over' || m.tag === 'anniv')) out.push({ kind: 'love', text: 'They texted — in Messages' });
  const pend = g.awards && g.awards.pending && g.awards.pending[0];
  if (pend && pend.due === abs) out.push({ kind: 'askers', text: g.awards.pending.every((p) => p.theirs) ? 'The Askers — on television' : 'The Askers — you are up', strong: true });
  return out;
}

// The little grid of days. Thirty-ish squares, seven across, the way a page of a calendar
// looks from a distance. The whole page is tinted by the month's main thing; a premiere
// lights one day gold; a shoot burns the whole row.
function Days({ tint, premiere, seed }) {
  const cells = [];
  const star = premiere ? 9 + (seed % 17) : -1;
  for (let d = 0; d < 35; d++) {
    const blank = d < seed % 5 || d >= 30 + (seed % 5);   // the empty squares before the 1st and after the last day
    const gold = d === star;
    cells.push(<span key={d} style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 2,
      background: blank ? 'transparent' : gold ? INK.premiere : tint ? `${tint}55` : 'rgba(255,255,255,.07)',
      boxShadow: gold ? `0 0 6px ${INK.premiere}` : 'none' }} />);
  }
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, margin: '6px 0 7px' }}>{cells}</div>;
}

export function Diary({ g }) {
  const now = (g.year || 0) * 12 + (g.month || 0);
  const cells = [];
  for (let i = 0; i < 12; i++) { const abs = now + i; cells.push({ i, abs, yr: Math.floor(abs / 12), mo: abs % 12, lines: linesFor(g, i, abs) }); }
  return (<div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>The year ahead</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {cells.map((c) => {
        const has = (k) => c.lines.some((l) => l.kind === k);
        // What tints the page: signed off, else a shoot, else a premiere, else post, else a run.
        const main = has('off') ? 'off' : has('shoot') ? 'shoot' : has('premiere') ? 'premiere' : has('post') ? 'post' : has('cinemas') ? 'cinemas' : null;
        const tint = main ? INK[main] : null;
        const shown = c.lines.slice(0, 4);
        return (<div key={c.i} style={{ background: theme.panel, border: `1px solid ${tint ? tint + '66' : c.i === 0 ? theme.accent : theme.line}`, borderRadius: 11, overflow: 'hidden' }}>
          {/* the header strip a wall calendar has */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 9px 4px',
            background: tint ? `${tint}22` : c.i === 0 ? 'rgba(158,116,255,.16)' : 'rgba(255,255,255,.03)', borderBottom: `1px solid ${tint ? tint + '44' : theme.line}` }}>
            <span style={{ fontSize: 12.5, fontWeight: 900, letterSpacing: '.04em', color: tint || (c.i === 0 ? theme.accent : theme.text) }}>{(c.i === 0 ? FULL[c.mo] : MON[c.mo]).toUpperCase()}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: theme.muted }}>{c.yr}</span>
          </div>
          <div style={{ padding: '2px 9px 8px' }}>
            <Days tint={tint} premiere={has('premiere')} seed={c.abs} />
            {shown.map((l, k) => (<div key={k} style={{ display: 'flex', gap: 6, alignItems: 'baseline', fontSize: 10.5, lineHeight: 1.35, color: l.strong ? theme.text : theme.muted, fontWeight: l.strong ? 800 : 600, marginTop: k ? 3 : 0 }}>
              <span style={{ flex: 'none', width: 7, height: 7, borderRadius: '50%', background: INK[l.kind] || theme.muted, position: 'relative', top: -1 }} /><span style={{ minWidth: 0 }}>{l.text}</span>
            </div>))}
            {c.lines.length > 4 && <div style={{ fontSize: 9.5, color: theme.muted, marginTop: 3 }}>+{c.lines.length - 4} more</div>}
            {!c.lines.length && <div style={{ fontSize: 10, color: theme.muted, opacity: .5 }}>nothing booked</div>}
          </div>
        </div>);
      })}
    </div>
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', fontSize: 10.5, color: theme.muted, flexWrap: 'wrap', marginTop: 9 }}>
      {[['shoot', 'shooting'], ['post', 'in post'], ['premiere', 'premiere'], ['cinemas', 'in cinemas'], ['answer', 'they answer'], ['off', 'signed off / offer runs out']].map(([k, label]) => (
        <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: INK[k] }} />{label}</span>))}
    </div>
  </div>);
}
