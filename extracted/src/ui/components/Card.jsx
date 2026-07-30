import { theme } from '../theme.js';
export function Card({ children, style }) { return <div style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 16, padding: 14, ...style }}>{children}</div>; }
