import { theme } from '../theme.js';
import { ENERGY_CAP } from '../../engine/energy.js';
// The month, as a bar with the number on it. Three dots became a hundred points, and a
// hundred points need a bar: how much is left, out of how much this month gave you.
export function EnergyBar({ g, accent, compact }) {
  const have = Math.max(0, Math.round(g.ap || 0)), max = Math.max(1, Math.round(g.apMaxEff || g.apMax || 100));
  const col = accent || theme.accent;
  const low = have < 15;
  const why = (g.apWhy || []).join(' · ');
  return (<div title={why ? `This month: ${why}` : 'A full month'} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: compact ? 92 : 140 }}>
    {!compact && <span style={{ fontSize: 10, color: theme.muted }}>Energy</span>}
    <div style={{ flex: 1, height: 7, background: 'rgba(255,255,255,.1)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
      <div style={{ width: Math.min(100, (have / ENERGY_CAP) * 100) + '%', height: '100%', background: low ? theme.bad : col, borderRadius: 4, transition: 'width .35s' }} />
      {max < ENERGY_CAP && <div style={{ position: 'absolute', left: (max / ENERGY_CAP) * 100 + '%', top: -1, bottom: -1, width: 1, background: 'rgba(255,255,255,.35)' }} />}
    </div>
    <span style={{ fontSize: 11, fontWeight: 900, color: low ? theme.bad : col, whiteSpace: 'nowrap' }}>{have}<span style={{ color: theme.muted, fontWeight: 700 }}>/{max}</span></span>
  </div>);
}
