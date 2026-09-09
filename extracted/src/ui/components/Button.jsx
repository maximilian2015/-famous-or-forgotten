import { theme } from '../theme.js';
import { useAccent } from '../appTheme.js';

// Two things were quietly broken here: `style` was dropped on the floor (every
// `<Button style={{marginTop:8}}>` in the game did nothing), and the colour was
// hard-wired to the game's purple even inside a phone app that has its own.
export function Button({ children, onClick, kind = 'default', disabled, style, sfx }) {
  const accent = useAccent();
  const pri = kind === 'pri';
  const bg = pri ? `linear-gradient(165deg, ${accent}, ${theme.accent2 || accent}dd)`
    : kind === 'danger' ? 'rgba(229,86,111,.14)' : `${accent}1c`;
  const col = pri ? (theme.warm ? '#1a1206' : '#fff') : kind === 'danger' ? '#ff9db0' : theme.text;
  return (<button onClick={onClick} disabled={disabled} data-sfx={sfx || (pri ? 'nav' : 'tap')} style={{
    background: disabled ? 'rgba(120,110,150,.12)' : bg,
    color: disabled ? '#6b6390' : col,
    border: pri ? '1px solid transparent' : `1px solid ${disabled ? 'transparent' : accent + '33'}`,
    // A primary button should look lit from above, not painted flat.
    boxShadow: disabled ? 'none' : pri
      ? `0 1px 0 rgba(255,255,255,.22) inset, 0 6px 16px -8px ${accent}`
      : '0 1px 0 rgba(255,255,255,.05) inset',
    borderRadius: 12, padding: '11px 16px', fontSize: 14, fontWeight: 800,
    letterSpacing: pri ? '.01em' : 0,
    cursor: disabled ? 'default' : 'pointer', width: '100%', ...style,
  }}>{children}</button>);
}
