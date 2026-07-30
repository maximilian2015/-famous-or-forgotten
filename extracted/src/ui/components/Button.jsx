import { theme } from '../theme.js';
export function Button({ children, onClick, kind = 'default', disabled }) {
  const bg = kind === 'pri' ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : kind === 'danger' ? 'rgba(255,90,122,.15)' : 'rgba(158,116,255,.16)';
  const col = kind === 'pri' ? '#fff' : kind === 'danger' ? '#ffa8bb' : '#d9cffa';
  return (<button onClick={onClick} disabled={disabled} style={{ background: disabled ? 'rgba(120,110,150,.15)' : bg, color: disabled ? '#6b6390' : col, border: 'none', borderRadius: 12, padding: '11px 16px', fontSize: 14, fontWeight: 800, cursor: disabled ? 'default' : 'pointer', width: '100%' }}>{children}</button>);
}
