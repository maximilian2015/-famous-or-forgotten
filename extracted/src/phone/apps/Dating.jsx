import { useEffect } from 'react';
import { theme } from '../../ui/theme.js';
import { dispatch } from '../../state/store.js';
import { onCooldown } from '../../engine/cooldown.js';
import { refreshDatingPool, askOut, spendWithPartner, proposeMarriage, tryForBaby } from '../../systems/life/dating.js';
function btn(disabled) { return { width: '100%', border: 'none', borderRadius: 10, padding: '9px', fontSize: 12.5, fontWeight: 800, cursor: disabled ? 'default' : 'pointer', background: disabled ? 'rgba(120,110,150,.15)' : `linear-gradient(135deg,${theme.accent2},${theme.accent})`, color: disabled ? '#6b6390' : '#fff' }; }
export function Dating({ g }) {
  useEffect(() => {
    if (!g.partner && (!g.datingPool || !g.datingPool.length)) dispatch((s) => refreshDatingPool(s));
  }, [g.partner, g.datingPool]);
  // Dating is evenings, not workdays — gated by the other person, not by energy.
  const spouse = (g.family || []).find((p) => p.relation === 'Spouse' && p.alive);

  if (spouse) {
    return (<div>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Married</div>
      <div style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>{spouse.name}</div>
        <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 10px' }}>{spouse.job} · closeness {spouse.relationship}</div>
        <button onClick={() => dispatch(tryForBaby)} disabled={onCooldown(g,'baby')} style={btn(onCooldown(g,'baby'))}>Try for a baby</button>
      </div>
      <div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', padding: '4px 10px' }}>Spend time with {spouse.name.split(' ')[0]} from the People tab — they're family now.</div>
    </div>);
  }

  if (g.partner) {
    const p = g.partner;
    return (<div>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Seeing</div>
      <div style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>{p.name}</div>
        <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 10px' }}>{p.job}, {p.age} · closeness {p.relationship}</div>
        <button onClick={() => dispatch(spendWithPartner)} disabled={onCooldown(g,'partner')} style={btn(onCooldown(g,'partner'))}>Spend time together</button>
      </div>
      <button onClick={() => dispatch(proposeMarriage)} disabled={onCooldown(g,'propose')} style={btn(onCooldown(g,'propose'))}>Propose marriage</button>
      {p.relationship < 65 && <div style={{ fontSize: 11.5, color: theme.gold, textAlign: 'center', padding: '8px 0' }}>Grow closer before popping the question.</div>}
    </div>);
  }

  const pool = g.datingPool || [];
  return (<div>
    <div style={{ fontSize: 11.5, color: theme.muted, padding: '2px 2px 8px' }}>People nearby, open to meeting someone.</div>
    {!pool.length && <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: 22 }}>Nobody new right now. Check back later.</div>}
    {pool.map((p) => (<div key={p.id} style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><div style={{ fontSize: 13.5, fontWeight: 800 }}>{p.name}</div><div style={{ fontSize: 11.5, color: theme.muted }}>{p.age}</div></div>
      <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 8px' }}>{p.job}{p.dates ? ` · ${p.dates} date${p.dates > 1 ? 's' : ''} so far` : ''}</div>
      <button onClick={() => dispatch(askOut, p.id)} disabled={onCooldown(g,'date:'+p.id)} style={btn(onCooldown(g,'date:'+p.id))}>Ask out</button>
    </div>))}
  </div>);
}
