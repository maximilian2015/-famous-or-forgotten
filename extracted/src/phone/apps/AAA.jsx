import { theme } from '../../ui/theme.js';
import { dispatch } from '../../state/store.js';
import { computeAccess } from '../../systems/career/access.js';
import { boardFor, putForward } from '../../systems/career/tentpoles.js';
import { COST } from '../../engine/energy.js';
import { canAfford } from '../../engine/energy.js';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const money = (n) => (n >= 1e6 ? `€${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}m` : `€${Math.round(n / 1000)}k`);

// The tentpole board. Nobody auditions for these: there is a picture in development with a
// studio, a director and somebody already attached, and your agent either puts your name in
// or does not. See systems/career/tentpoles.js.
export function AAA({ g }) {
  const acc = computeAccess(g);
  if (!acc.aaa) return (<div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: 24, lineHeight: 1.7 }}>🔒 Locked.<br /><br />AAA is where the studio tentpoles are — pictures with budgets that need insurance, cast a year before anybody rolls. Two ways in: land a hit, or get close to somebody powerful in the industry.<br /><br />Get one job done. Any job.</div>);
  const board = boardFor(g);
  const tired = !canAfford(g, COST.careerAction);
  return (<div>
    <div style={{ fontSize: 11.5, color: theme.good, marginBottom: 4, lineHeight: 1.5 }}>
      {acc.aaaReason === 'hit' ? '★ Unlocked by your hit. Studios take your calls.' : '★ Unlocked through your connections. The right person vouched for you.'}
    </div>
    <div style={{ fontSize: 11, color: theme.muted, marginBottom: 11, lineHeight: 1.5 }}>
      In development. Nobody reads for these — your agent puts your name in, and then you wait. Signed papers are in Messages.
    </div>
    {!board.length && <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: 18, lineHeight: 1.6 }}>
      Nothing in development this month. The studios make four of these a year between them.
    </div>}
    {board.map((p) => {
      const dim = p.odds <= 3 && !p.sent;
      return (<div key={p.id} style={{ background: theme.panel2, border: `1px solid ${p.sent ? theme.gold + '66' : theme.line}`, borderRadius: 14, padding: 12, marginBottom: 8, opacity: dim ? 0.72 : 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: theme.accent, textTransform: 'uppercase' }}>{p.studio}</div>
          <div style={{ fontSize: 10.5, color: theme.muted, flex: 'none' }}>€{p.budget}m · {p.genre}</div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{p.title}</div>
        <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, lineHeight: 1.45 }}>
          {p.role} — {p.want}. {p.director} directing{p.withName ? `, with ${p.withName}` : ''}.
        </div>
        <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 4 }}>
          {money(p.fee)} · {p.months} mo{p.prep ? ' + 1 prep' : ''} · cameras {p.startIn <= 1 ? 'soon' : `in ${p.startIn} months`}
        </div>
        {!p.fits.ok && <div style={{ fontSize: 11, color: theme.gold, marginTop: 4, lineHeight: 1.4 }}>{p.fits.why}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <div style={{ fontSize: 11, color: p.odds >= 25 ? theme.good : p.odds >= 8 ? theme.gold : theme.muted, fontWeight: 800 }}>
            {p.odds}% they say yes
          </div>
          <div style={{ fontSize: 10.5, color: theme.muted }}>{p.sent ? 'your name is in' : `they decide in ${p.decideIn <= 1 ? 'weeks' : `${p.decideIn} months`}`}</div>
        </div>
        {!!p.why.length && <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 3, lineHeight: 1.4 }}>{p.why.join(' · ')}</div>}
        <button disabled={!!p.sent || tired} onClick={() => dispatch(putForward, p.id)}
          style={{ width: '100%', marginTop: 9, border: 'none', borderRadius: 10, padding: 9, fontSize: 12.5, fontWeight: 800,
            cursor: p.sent || tired ? 'default' : 'pointer',
            background: p.sent ? 'rgba(255,209,102,.14)' : tired ? 'rgba(120,110,150,.15)' : `linear-gradient(135deg,${theme.accent2},${theme.accent})`,
            color: p.sent ? theme.gold : tired ? '#6b6390' : '#fff' }}>
          {p.sent ? 'Waiting to hear' : tired ? `Put your name in · ${COST.careerAction} energy` : `Put your name in · ${COST.careerAction} energy`}
        </button>
      </div>);
    })}
  </div>);
}
