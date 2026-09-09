import { theme } from '../theme.js';
import { FONT_DISPLAY } from '../chrome.js';

export function Stat({ label, value, max = 100, money, sub, onClick, vital }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  // A bar that is the same colour at 8 as at 80 is not telling you anything. Mental health
  // fell to 10 across a playtest and nothing on this screen ever changed colour.
  // Only Health and Mental warn, though: Fame and Respect start at zero for everybody, and
  // a red bar there is not an alarm, it is a lie about how you are doing.
  const low = vital && pct < 22, mid = vital && pct < 45;
  const barCol = low ? theme.bad : mid ? theme.gold : theme.accent;
  return (<div onClick={onClick} style={{
    background: `linear-gradient(180deg, ${theme.panel2}, ${theme.panel})`,
    border: `1px solid ${low ? theme.bad + '55' : 'rgba(255,255,255,.05)'}`,
    boxShadow: '0 1px 0 rgba(255,255,255,.04) inset',
    borderRadius: 12, padding: '9px 11px', cursor: onClick ? 'pointer' : 'default' }}>
    <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: theme.muted }}>{label}</div>
    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, lineHeight: 1.2,
      color: money ? theme.gold : low ? theme.bad : theme.text }}>
      {money ? '€' + Math.round(value).toLocaleString() : Math.round(value)}
    </div>
    {sub && <div style={{ fontSize: 10.5, fontWeight: 700, color: theme.accent, marginTop: 2 }}>{sub}</div>}
    {!money && <div style={{ height: 5, background: 'rgba(255,255,255,.07)', borderRadius: 3, marginTop: 5, overflow: 'hidden' }}>
      <div style={{ width: pct + '%', height: '100%', borderRadius: 3, transition: 'width .5s cubic-bezier(.2,.8,.3,1), background .3s',
        background: `linear-gradient(90deg, ${barCol}aa, ${barCol})` }} /></div>}
  </div>);
}
