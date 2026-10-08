import { dispatch } from '../../state/store.js';
import { liveStandoff, canPush, PUSH_COST, askFor, takeTheRoom, walkTheRoom, walkCost } from '../../systems/career/standoff.js';
import { theme } from '../theme.js';
import { FONT_DISPLAY } from '../chrome.js';
import { Card } from './Card.jsx';


// The afternoon itself. Maxi: "a letter comes, a meeting with the producers, a date on the
// calendar — what day, what month — and then a window opens, music, little figures at a
// table." It is a room rather than a card because everything about the season is waiting on
// it, and because a card is something you scroll past. career/standoff.js
export function RoomModal({ g }) {
  const k = liveStandoff(g);
  if (!k) return null;
  const fit = canPush(g);
  return (<div style={{ position: 'fixed', inset: 0, background: 'rgba(8,5,20,.94)', zIndex: 70,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto', color: theme.text }}>
    <div style={{ maxWidth: 460, width: '100%', marginTop: 24 }}>

      {/* The table, seen from the door. */}
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 34, letterSpacing: 6 }}>🪑🪑🪑🪑</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 23, fontWeight: 700, marginTop: 6 }}>The meeting</div>
        <div style={{ fontSize: 12.5, color: theme.muted, marginTop: 2 }}>
          "{k.title}" · season {k.season}
        </div>
      </div>

      {/* Who is in it. */}
      <Card style={{ marginBottom: 10 }}>
        {k.chairs.map((c, i) => (
          <div key={i} style={{ fontSize: 11.5, lineHeight: 1.5, color: theme.muted, padding: '2px 0' }}>
            <span style={{ fontWeight: 800, color: theme.text }}>{c.who}</span> — {c.line}
          </div>
        ))}
      </Card>

      {/* The only number anybody at that table cares about. */}
      {k.because && <Card style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11.5, lineHeight: 1.5, color: k.grew ? theme.good : theme.muted }}>📈 {k.because}</div>
      </Card>}

      {/* What your agent says on the way in. Every line is a real thing agents weigh, and
          seeing them is most of what makes this a decision rather than a menu. */}
      {!!(k.leverage || []).length && <Card style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.muted }}>Your leverage</span>
          <span style={{ fontSize: 11, color: theme.muted }}>replacing you: <b style={{ color: k.dependency >= 65 ? theme.gold : theme.text }}>{k.replacement}</b></span>
        </div>
        {k.leverage.map((l, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, lineHeight: 1.6 }}>
            <span style={{ color: theme.muted }}>{l.what}</span>
            <span style={{ fontWeight: 900, letterSpacing: 1, color: l.mark.startsWith('-') ? theme.bad : l.mark === '·' ? theme.muted : theme.good }}>{l.mark}</span>
          </div>
        ))}
      </Card>}

      {/* What they have brought with them. */}
      <Card style={{ marginBottom: 10, borderColor: 'rgba(255,209,102,.4)' }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.gold, marginBottom: 5 }}>On the table</div>
        {k.terms.map((t, i) => <div key={i} style={{ fontSize: 12.5, lineHeight: 1.55 }}>· {t}</div>)}
        <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 6, lineHeight: 1.45 }}>{k.mood}</div>
      </Card>

      {/* One thing, once. */}
      {!k.asked && <Card style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: fit.ok ? theme.muted : theme.bad, marginBottom: 5 }}>
          Ask for one thing · {PUSH_COST} energy
        </div>
        {/* The reason goes ABOVE the list, where it is read before the pressing rather than
            after it. Underneath, it read as a footnote to buttons that looked live. */}
        {!fit.ok && fit.why && <div style={{ fontSize: 11.5, color: theme.bad, lineHeight: 1.45, marginBottom: 7 }}>{fit.why}</div>}
        {k.asks.map((x) => (
          <button key={x.id} onClick={() => dispatch(askFor, x.id)} disabled={!fit.ok}
            style={{ width: '100%', textAlign: 'left', border: 'none', borderRadius: 10, padding: '8px 11px', marginBottom: 5,
              cursor: fit.ok ? 'pointer' : 'not-allowed', opacity: fit.ok ? 1 : 0.45,
              background: fit.ok ? 'rgba(158,116,255,.15)' : 'rgba(120,110,150,.12)', color: fit.ok ? '#d9cffa' : '#6b6390' }}>
            <div style={{ fontSize: 12.5, fontWeight: 800 }}>{x.label}</div>
            <div style={{ fontSize: 11, opacity: .8, lineHeight: 1.4, marginTop: 1 }}>{x.ask}</div>
          </button>
        ))}
      </Card>}
      {k.asked && <div style={{ fontSize: 11.5, color: k.gave ? theme.good : theme.muted, lineHeight: 1.5, marginBottom: 10 }}>
        {k.gave ? 'They gave you that. Everything on the table is what you leave with.' : 'You asked. They did not move. What is on the table is what is on the table.'}
      </div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => dispatch(takeTheRoom)} style={{ flex: 2, border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 800,
          cursor: 'pointer', background: `linear-gradient(135deg,${theme.gold},#c9962f)`, color: '#1a1206' }}>Shake on it</button>
        <button onClick={() => dispatch(walkTheRoom)} style={{ flex: 1, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '13px', fontSize: 13, fontWeight: 800,
          cursor: 'pointer', background: 'transparent', color: theme.bad }}>Walk out</button>
      </div>
      {/* What it costs YOU, said before the pressing rather than discovered after it. The old
          line here was about what happens to the SHOW, which is not the part a player needs to
          weigh. career/standoff.js walkCost. */}
      {(() => { const c = walkCost(g, (g.offers || []).find((o) => o.id === (g.standoff || {}).offerId));
        return (<div style={{ marginTop: 10, padding: '9px 11px', borderRadius: 10,
          background: c.band === 'theirs' ? 'rgba(255,90,122,.10)' : 'rgba(255,255,255,.04)',
          border: `1px solid ${c.band === 'theirs' ? 'rgba(255,90,122,.35)' : theme.line}` }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase',
            color: c.band === 'theirs' ? theme.bad : theme.muted, marginBottom: 4 }}>If you walk</div>
          {c.lines.map((l, i) => (<div key={i} style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5 }}>· {l}</div>))}
        </div>); })()}
    </div>
  </div>);
}
