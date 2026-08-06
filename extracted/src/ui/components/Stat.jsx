import { theme } from '../theme.js';
export function Stat({ label, value, max = 100, money, sub, onClick }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (<div onClick={onClick} style={{ background: theme.panel2, borderRadius: 12, padding: '9px 11px', cursor: onClick ? 'pointer' : 'default' }}>
    <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: theme.muted }}>{label}</div>
    <div style={{ fontSize: 17, fontWeight: 900, color: money ? theme.gold : theme.text }}>{money ? '€' + Math.round(value).toLocaleString() : Math.round(value)}</div>
    {sub && <div style={{ fontSize: 10.5, fontWeight: 700, color: theme.accent, marginTop: 2 }}>{sub}</div>}
    {!money && <div style={{ height: 5, background: 'rgba(255,255,255,.08)', borderRadius: 3, marginTop: 5 }}><div style={{ width: pct + '%', height: '100%', background: theme.accent, borderRadius: 3 }} /></div>}
  </div>);
}
