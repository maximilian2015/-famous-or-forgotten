import { theme } from '../theme.js';
import { useAccent } from '../appTheme.js';

// Two things were quietly broken here: `style` was dropped on the floor (every
// `<Button style={{marginTop:8}}>` in the game did nothing), and the colour was
// hard-wired to the game's purple even inside a phone app that has its own.
export function Button({ children, onClick, kind = 'default', disabled, style }) {
  const accent = useAccent();
  const bg = kind === 'pri' ? `linear-gradient(135deg,${accent},${accent}bb)`
    : kind === 'danger' ? 'rgba(255,90,122,.15)' : `${accent}26`;
  const col = kind === 'pri' ? '#fff' : kind === 'danger' ? '#ffa8bb' : '#eae3ff';
  return (<button onClick={onClick} disabled={disabled} style={{
    background: disabled ? 'rgba(120,110,150,.15)' : bg,
    color: disabled ? '#6b6390' : col,
    border: kind === 'pri' ? 'none' : `1px solid ${disabled ? 'transparent' : accent + '3a'}`,
    borderRadius: 12, padding: '11px 16px', fontSize: 14, fontWeight: 800,
    cursor: disabled ? 'default' : 'pointer', width: '100%', ...style,
  }}>{children}</button>);
}
