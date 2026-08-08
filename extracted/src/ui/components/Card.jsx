import { theme } from '../theme.js';
// ...rest matters: without it a Card silently swallowed onClick, which is how the first
// tappable person card ended up doing nothing at all.
export function Card({ children, style, ...rest }) {
  return <div {...rest} style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 16, padding: 14, ...style }}>{children}</div>;
}
