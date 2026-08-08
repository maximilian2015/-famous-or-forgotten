import { theme } from '../../ui/theme.js';
import { dispatch } from '../../state/store.js';
import { PILLS, buyPills, usePills } from '../../systems/life/health.js';

export function Shopping({ g }) {
  const meds = g.meds || {};
  const btn = (kind, off) => ({ flex: 1, border: 'none', borderRadius: 10, padding: '8px', fontSize: 12, fontWeight: 800,
    cursor: off ? 'default' : 'pointer',
    background: off ? 'rgba(120,110,150,.15)' : kind === 'pri' ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : 'rgba(158,116,255,.16)',
    color: off ? '#6b6390' : kind === 'pri' ? '#fff' : '#d9cffa' });
  return (<div>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 4 }}>Pharmacy</div>
    <div style={{ fontSize: 11.5, color: theme.muted, marginBottom: 10, lineHeight: 1.5 }}>Buy them now, take them when you need them. Cheaper than a doctor, and they do not run out of appointments.</div>
    {Object.entries(PILLS).map(([key, p]) => { const have = meds[key] || 0; const broke = (g.cash || 0) < p.cost;
      return (<div key={key} style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>{p.label}{have > 0 ? <span style={{ color: theme.good, fontWeight: 700 }}> · you own {have}</span> : ''}</div>
          <div style={{ fontSize: 12.5, fontWeight: 900, color: theme.gold }}>€{p.cost}</div>
        </div>
        <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 8px' }}>{p.blurb}</div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button onClick={() => dispatch(buyPills, key, 1)} disabled={broke} style={btn('pri', broke)}>{broke ? 'Too expensive' : 'Buy'}</button>
          <button onClick={() => dispatch(usePills, key)} disabled={have <= 0} style={btn('', have <= 0)}>Take one</button>
        </div>
      </div>); })}
    <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', padding: '10px 8px', lineHeight: 1.55, opacity: .8 }}>
      Clothes and things for the flat come later — this shelf is medicine for now.
    </div>
  </div>);
}
