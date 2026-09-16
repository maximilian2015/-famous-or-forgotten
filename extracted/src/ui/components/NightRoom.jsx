import { theme } from '../theme.js';
import { FONT } from '../chrome.js';
import { dispatch } from '../../state/store.js';
import { HOURS, talkOdds, talkTo, nightAct, nightChoice, leaveNight } from '../../systems/social/night.js';

// The room. Full screen, like the first day on a set: the hour at the top, what has
// happened so far, the question somebody just asked you, the people you have not talked
// to yet with the odds written next to them, and the four things you can do instead.
const TONE = { good: '#6fc98d', bad: '#e5566f', note: null };
const KIND_ICON = { actor: '🎭', industry: '💼', contact: '🤝', press: '📰', prospect: '💫' };

export function NightRoom({ g }) {
  const n = g.night; if (!n) return null;
  const hour = Math.min(n.hour, HOURS.length - 1);
  const open = n.guests.filter((x) => !x.done);
  const talked = n.guests.filter((x) => x.done);
  const btn = (kind, off) => ({ border: 'none', borderRadius: 10, padding: '9px 10px', fontSize: 12, fontWeight: 800, cursor: off ? 'default' : 'pointer', opacity: off ? .45 : 1,
    background: kind === 'pri' ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : kind === 'bad' ? 'rgba(229,86,111,.16)' : 'rgba(255,255,255,.08)', color: kind === 'pri' ? '#fff' : kind === 'bad' ? theme.bad : theme.text });
  return (<div style={{ position: 'fixed', inset: 0, background: 'rgba(8,5,20,.97)', zIndex: 60, overflowY: 'auto', padding: 16, color: theme.text, fontFamily: FONT }}>
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.18em', textTransform: 'uppercase', color: theme.accent }}>{n.done ? 'The morning after' : `The night · ${HOURS[hour]}`}</div>
        {!n.done && <div style={{ fontSize: 10.5, color: theme.muted }}>hour {hour + 1} of {HOURS.length}{n.drinks ? ` · 🍸 ${n.drinks}` : ''}</div>}
      </div>
      <div style={{ fontSize: 18, fontWeight: 900 }}>{n.label}</div>
      <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 2, marginBottom: 12 }}>{n.venue}{n.host ? ` · hosted by ${n.host}` : ''}</div>

      {/* what has happened */}
      <div style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '9px 12px', marginBottom: 12 }}>
        {n.log.slice(n.done ? 0 : -4).map((l, i) => (<div key={i} style={{ fontSize: 12.5, lineHeight: 1.5, color: TONE[l.tone] || theme.text, padding: '2px 0' }}>{l.text}</div>))}
      </div>

      {n.done ? (<>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
          {[['Contacts', n.gains.contacts.length], ['Leads', n.gains.leads], ['Numbers', n.gains.numbers], ['Fame', n.gains.fame ? `+${n.gains.fame}` : '—'], ['Respect', n.gains.respect ? `+${n.gains.respect}` : '—'], ['Rumours', n.gains.scandal ? `+${n.gains.scandal}` : '—']].map(([k, v]) => (
            <div key={k} style={{ background: theme.panel2, border: `1px solid ${theme.line}`, borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: k === 'Rumours' && v !== '—' ? theme.bad : theme.text }}>{v}</div>
              <div style={{ fontSize: 9.5, color: theme.muted, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 800 }}>{k}</div>
            </div>))}
        </div>
        <button onClick={() => dispatch(leaveNight)} style={{ ...btn('pri'), width: '100%', padding: 12 }}>Go home</button>
      </>) : n.pending ? (
        <div style={{ background: theme.panel, border: `1px solid ${theme.gold}66`, borderRadius: 12, padding: '12px 13px', marginBottom: 12 }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 10 }}>{n.pending.text}</div>
          <div style={{ display: 'grid', gap: 7 }}>
            {n.pending.id === 'prospect' && (<>
              <button onClick={() => dispatch(nightChoice, 'number')} style={btn('pri')}>Get their number</button>
              <button onClick={() => dispatch(nightChoice, 'home')} style={btn('')}>Go home with them{g.partner ? ` — ${g.partner.name.split(' ')[0]} would not like it` : ''}</button>
              <button onClick={() => dispatch(nightChoice, 'night')} style={btn('')}>Say goodnight</button>
            </>)}
            {n.pending.id === 'leaveWith' && (<>
              <button onClick={() => dispatch(nightChoice, 'home')} style={btn('pri')}>Go{g.partner ? ` — ${g.partner.name.split(' ')[0]} would not like it` : ' — the photographers are outside'}</button>
              <button onClick={() => dispatch(nightChoice, 'night')} style={btn('')}>An early call tomorrow</button>
            </>)}
            {n.pending.id === 'couch' && (<>
              <button onClick={() => dispatch(nightChoice, 'yes')} style={btn('bad')}>Get in the car. The part is yours.</button>
              <button onClick={() => dispatch(nightChoice, 'no')} style={btn('pri')}>Say goodnight</button>
            </>)}
            {n.pending.id === 'dig' && (<>
              <button onClick={() => dispatch(nightChoice, 'bite')} style={btn('')}>Answer them</button>
              <button onClick={() => dispatch(nightChoice, 'laugh')} style={btn('pri')}>Laugh it off</button>
            </>)}
          </div>
        </div>
      ) : (<>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.muted, marginBottom: 6 }}>In the room</div>
        {open.map((x) => { const odds = Math.round(talkOdds(g, x));
          return (<div key={x.id} style={{ display: 'flex', gap: 10, alignItems: 'center', background: theme.panel, border: `1px solid ${x.icon ? theme.gold + '88' : theme.line}`, borderRadius: 12, padding: '9px 11px', marginBottom: 7 }}>
            <div style={{ fontSize: 20, flex: 'none' }}>{x.icon ? '👑' : KIND_ICON[x.kind] || '🎭'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{x.name}{x.role && x.kind !== 'actor' ? <span style={{ color: theme.muted, fontWeight: 600 }}> · {x.role}</span> : null}</div>
              <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.4 }}>{x.line}</div>
            </div>
            <button onClick={() => dispatch(talkTo, x.id)} style={{ ...btn('pri'), flex: 'none', padding: '8px 10px' }}>
              Talk <span style={{ fontWeight: 700, opacity: .85 }}>· {odds}%</span>
            </button>
          </div>); })}
        {!open.length && <div style={{ fontSize: 12, color: theme.muted, padding: '4px 0 10px' }}>You have talked to everybody worth talking to.</div>}
        {talked.length > 0 && <div style={{ fontSize: 10.5, color: theme.muted, margin: '2px 0 10px' }}>{talked.map((x) => `${x.name.split(' ')[0]} ${x.went === 'good' ? '✓' : '✗'}`).join(' · ')}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: n.cameras ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: 6, marginTop: 6 }}>
          <button onClick={() => dispatch(nightAct, 'drink')} style={btn('')}>🍸 A drink</button>
          <button onClick={() => dispatch(nightAct, 'floor')} style={btn('')}>💃 The floor</button>
          {n.cameras && <button onClick={() => dispatch(nightAct, 'cameras')} style={btn('')}>📸 Cameras</button>}
          <button onClick={() => dispatch(nightAct, 'leave')} style={btn('bad')}>🚪 Leave</button>
        </div>
        <div style={{ fontSize: 10.5, color: theme.muted, textAlign: 'center', lineHeight: 1.5, marginTop: 10 }}>
          Every talk and every hour on the floor is an hour of the night. The second drink helps; the fourth does not.
        </div>
      </>)}
    </div>
  </div>);
}
