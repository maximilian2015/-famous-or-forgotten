import { theme } from '../theme.js';
import { useAccent } from '../appTheme.js';
// ...rest matters: without it a Card silently swallowed onClick, which is how the first
// tappable person card ended up doing nothing at all.
export function Card({ children, style, ...rest }) {
  const accent = useAccent();
  return <div {...rest} style={{
    // A card used to be one flat fill. It is now lit: a touch brighter at the top edge,
    // with a hairline of light on it and a real shadow underneath, so a stack of them
    // reads as objects on a surface rather than rectangles in a list.
    background: `linear-gradient(180deg, ${theme.panel2} 0%, ${theme.panel} 62%)`,
    border: `1px solid ${accent}1f`,
    boxShadow: `0 1px 0 rgba(255,255,255,.055) inset, 0 10px 22px -18px #000`,
    borderRadius: 16, padding: 14, ...style,
  }}>{children}</div>;
}
