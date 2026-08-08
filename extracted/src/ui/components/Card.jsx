import { theme } from '../theme.js';
import { useAccent } from '../appTheme.js';
// ...rest matters: without it a Card silently swallowed onClick, which is how the first
// tappable person card ended up doing nothing at all.
export function Card({ children, style, ...rest }) {
  const accent = useAccent();
  return <div {...rest} style={{ background: theme.panel, border: `1px solid ${accent}22`, borderRadius: 16, padding: 14, ...style }}>{children}</div>;
}
