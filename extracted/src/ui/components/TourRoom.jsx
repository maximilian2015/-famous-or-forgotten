import { theme } from '../theme.js';
import { FONT } from '../chrome.js';
import { dispatch } from '../../state/store.js';
import { tourChoice, closeTour, stopNow, stopsTotal } from '../../systems/career/tour.js';

// Two weeks of press, one stop at a time: where you are, what happened so far, and the
// two ways through this one — the safe line and the real one.
const TONE = { good: '#6fc98d', bad: '#e5566f', note: null };

export function TourRoom({ g }) {
  const t = g.tour; if (!t) return null;
  const stop = stopNow(g);
  const btn = (kind) => ({ width: '100%', textAlign: 'left', border: `1px solid ${theme.line}`, borderRadius: 12, padding: '11px 13px', cursor: 'pointer', color: theme.text, marginBottom: 9,
    background: kind === 'pri' ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : theme.panel });
  return (<div style={{ position: 'fixed', inset: 0, background: 'rgba(8,5,20,.97)', zIndex: 60, overflowY: 'auto', padding: 16, color: theme.text, fontFamily: FONT }}>
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.18em', textTransform: 'uppercase', color: theme.accent }}>{t.done ? 'The tour is done' : `The press tour · ${stop ? stop.label : ''}`}</div>
        {!t.done && <div style={{ fontSize: 10.5, color: theme.muted }}>stop {Math.min(t.stop + 1, stopsTotal())} of {stopsTotal()} · buzz {t.buzz}</div>}
      </div>
      <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>{t.title}</div>
      <div style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '9px 12px', marginBottom: 12 }}>
        {t.log.slice(t.done ? 0 : -3).map((l, i) => (<div key={i} style={{ fontSize: 12.5, lineHeight: 1.5, color: TONE[l.tone] || theme.text, padding: '2px 0' }}>{l.text}</div>))}
      </div>
      {t.done ? (<>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
          {[['Buzz', t.buzz], ['Opening', t.buzz > 0 ? `+${Math.round(Math.min(4, t.buzz) * 3.5)}%` : '—'], ['Went', t.went === 'good' ? 'well' : t.went === 'flat' ? 'fine' : 'badly']].map(([k, v]) => (
            <div key={k} style={{ background: theme.panel2, border: `1px solid ${theme.line}`, borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: k === 'Went' && t.went === 'bad' ? theme.bad : theme.text }}>{v}</div>
              <div style={{ fontSize: 9.5, color: theme.muted, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 800 }}>{k}</div>
            </div>))}
        </div>
        <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5, marginBottom: 12, textAlign: 'center' }}>Buzz is worth money on opening night and a little noise around your name. It is not fame; the film decides that.</div>
        <button onClick={() => dispatch(closeTour)} style={{ ...btn('pri'), textAlign: 'center', fontWeight: 800, fontSize: 13 }}>Home</button>
      </>) : stop && (<>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, margin: '4px 0 14px', fontStyle: 'italic', color: '#e6dfff' }}>{stop.text}</div>
        {[['safe', stop.safe], ['real', stop.real]].map(([id, c]) => (
          <button key={id} onClick={() => dispatch(tourChoice, id)} style={btn(id === 'real' ? 'pri' : '')}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>{c.label}</div>
            <div style={{ fontSize: 11.5, color: id === 'real' ? 'rgba(255,255,255,.85)' : theme.muted, marginTop: 4, lineHeight: 1.5 }}>{c.blurb}</div>
          </button>))}
        <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', lineHeight: 1.5, marginTop: 4 }}>
          The real one is a roll: charisma {Math.round(g.charisma || 0)}, looks {Math.round(g.looks || 0)}, how your head is, and what the papers already think of you.
        </div>
      </>)}
    </div>
  </div>);
}
