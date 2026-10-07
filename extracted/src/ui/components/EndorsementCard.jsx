import { dispatch } from '../../state/store.js';
import { liveEndorsement, dutiesDue, canAttend as canAttendDuty, attendDuty } from '../../systems/career/endorsement.js';
import { theme } from '../theme.js';
import { Card } from './Card.jsx';


// Being somebody's face, which is twelve months rather than a cheque. The dates are theirs
// and they are counting. career/endorsement.js
export function EndorsementCard({ g }) {
  const e = liveEndorsement(g);
  if (!e) return null;
  const due = dutiesDue(g);
  return (<Card style={{ marginBottom: 14, borderColor: e.strikes ? 'rgba(255,141,158,.35)' : 'rgba(255,209,102,.28)' }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.gold, marginBottom: 4 }}>
      The face of {e.house}
    </div>
    <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.45 }}>
      {e.what}{e.abroad ? ` · ${e.abroad} only` : ''} · {e.monthsLeft} month{e.monthsLeft === 1 ? '' : 's'} to run · {e.done} of {e.total} appearances done
    </div>
    {e.clause && <div style={{ fontSize: 11, color: theme.muted, marginTop: 3 }}>📄 {e.clause}, while it runs.</div>}
    {e.strikes > 0 && <div style={{ fontSize: 11, color: theme.bad, marginTop: 3, fontWeight: 700 }}>One date missed. Another and they tear it up.</div>}
    {due.map((d) => {
      const fit = canAttendDuty(g, d.id);
      return (<div key={d.id} style={{ marginTop: 8, paddingTop: 7, borderTop: `1px solid ${theme.line}` }}>
        <div style={{ fontSize: 12.5, fontWeight: 800 }}>{d.label} · this month</div>
        <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.45, marginTop: 2 }}>{d.line}</div>
        <button onClick={() => dispatch(attendDuty, d.id)} disabled={!fit.ok}
          style={{ marginTop: 5, border: 'none', borderRadius: 9, padding: '6px 11px', fontSize: 11.5, fontWeight: 800,
            cursor: fit.ok ? 'pointer' : 'default', background: fit.ok ? 'rgba(255,209,102,.18)' : 'rgba(120,110,150,.15)', color: fit.ok ? theme.gold : '#6b6390' }}>
          Turn up · {d.ap} energy
        </button>
        {!fit.ok && fit.why && <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 3 }}>{fit.why}</div>}
      </div>);
    })}
    {!due.length && e.next && <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 6 }}>
      Next: {e.next.label.toLowerCase()}, {e.next.inMonths <= 1 ? 'next month' : `in ${e.next.inMonths} months`}.
    </div>}
  </Card>);
}
