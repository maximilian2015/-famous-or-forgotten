import { theme } from '../../ui/theme.js';
import { dispatch } from '../../state/store.js';
import { acceptOffer } from '../../systems/career/offers.js';
import { computeAccess } from '../../systems/career/access.js';
export function AAA({ g }) {
  const acc = computeAccess(g);
  if (!acc.aaa) return (<div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: 24, lineHeight: 1.7 }}>🔒 Locked.<br /><br />AAA lists studio tentpoles — films with budgets that need insurance. Two ways in: land a hit, or get close to someone powerful in the industry.<br /><br />Get one job done. Any job.</div>);
  const big = (g.offers || []).filter((o) => (o.prestigeScore || 0) >= 60 || (o.salary || 0) >= 60000);
  return (<div><div style={{ fontSize: 11.5, color: theme.good, marginBottom: 10, lineHeight: 1.5 }}>{acc.aaaReason === 'hit' ? '★ Unlocked by your hit. Studios take your calls.' : '★ Unlocked through your connections. The right person vouched for you.'}</div>{!big.length && <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: 18 }}>Nothing on the board right now. Tentpoles come to names — keep your ratings up.</div>}{big.map((o) => (<div key={o.id} style={{ background: theme.panel2, borderRadius: 14, padding: 12, marginBottom: 8 }}><div style={{ fontSize: 11, fontWeight: 900, color: theme.accent, textTransform: 'uppercase' }}>Studio · Tentpole</div><div style={{ fontSize: 13, marginTop: 2 }}>{o.projectTitle} — {o.role}</div><div style={{ fontSize: 11.5, color: theme.muted, marginTop: 5 }}>€{o.salary.toLocaleString()} · {o.months} mo · prestige {o.prestigeScore}</div><button onClick={() => dispatch(acceptOffer, o.id)} style={{ width: '100%', marginTop: 9, border: 'none', borderRadius: 10, padding: 9, fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: `linear-gradient(135deg,${theme.accent2},${theme.accent})`, color: '#fff' }}>Accept</button></div>))}</div>);
}
