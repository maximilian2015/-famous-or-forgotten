import { theme, onSkinChange } from './theme.js';

// Everything inline styles cannot reach: the page itself, the grain over it, motion, the
// scrollbar, the focus ring, what a number looks like. One stylesheet, rewritten whenever
// the skin changes.
//
// Why this exists at all: html and body had NO background, so on any screen wider than the
// 440px column the browser's default white showed down both sides and under the fold. The
// game looked unfinished everywhere except a phone.

export const FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
// No web fonts — the game ships as one offline html file. Georgia is on every machine
// that has ever run a browser, and a real serif next to the sans is most of what makes
// this read as a poster credit block instead of a settings screen.
export const FONT_DISPLAY = "'Playfair Display', 'Didot', 'Bodoni MT', Georgia, 'Times New Roman', serif";

const ID = 'fof-chrome';

function css() {
  return `
  html, body { background: ${theme.bgDeep || theme.bg}; margin: 0; }
  body { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
  * { -webkit-tap-highlight-color: transparent; }

  /* The room the game sits in: the column is lit, the edges fall away. */
  #root { position: relative; min-height: 100vh;
    background:
      radial-gradient(120% 65% at 50% 0%, ${theme.glow || 'transparent'} 0%, transparent 62%),
      linear-gradient(180deg, ${theme.bg} 0%, ${theme.bgDeep || theme.bg} 100%);
    background-attachment: fixed; }

  /* Grain. Two per cent of a very fine noise, fixed to the viewport so it does not travel
     with the scroll — that is the difference between film and a texture on a div. */
  #root::before { content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 9;
    opacity: .035; mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E"); }

  /* Vignette: the corners of a dark room. */
  #root::after { content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 8;
    background: radial-gradient(115% 78% at 50% 42%, transparent 52%, rgba(0,0,0,.42) 100%); }

  /* Motion. There was none anywhere in the game — every state change simply appeared.
     Nothing here is slow enough to wait for. */
  button { transition: transform .11s cubic-bezier(.2,.9,.3,1), filter .16s ease, box-shadow .16s ease, background .16s ease, border-color .16s ease; }
  button:not(:disabled):hover { filter: brightness(1.13); }
  button:not(:disabled):active { transform: scale(.972); filter: brightness(.94); }
  button:disabled { opacity: .55; }

  @keyframes fofIn { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: none; } }
  .fof-in { animation: fofIn .26s cubic-bezier(.2,.8,.3,1) both; }

  @keyframes fofPop { 0% { opacity: 0; transform: scale(.955) translateY(14px); }
                      60% { transform: scale(1.006) translateY(0); } 100% { opacity: 1; transform: none; } }
  .fof-pop { animation: fofPop .34s cubic-bezier(.2,.9,.3,1) both; }

  /* A month passing should be felt, not just read. */
  @keyframes fofTick { 0% { opacity: .35; transform: translateY(-4px); } 100% { opacity: 1; transform: none; } }
  .fof-tick { animation: fofTick .32s ease-out both; }

  /* Something arrived. */
  @keyframes fofPing { 0%,100% { transform: scale(1); } 35% { transform: scale(1.22); } }
  .fof-ping { animation: fofPing .5s ease-out; }

  /* The one thing worth a slow animation: a marquee bulb. */
  @keyframes fofBulb { 0%,100% { opacity: .35; } 50% { opacity: 1; } }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
  }

  /* Numbers in a column should line up. Cash, fame, box office, a person's age. */
  body { font-variant-numeric: tabular-nums; }

  ::selection { background: ${theme.accent}55; color: ${theme.text}; }
  :focus-visible { outline: 2px solid ${theme.accent}; outline-offset: 2px; border-radius: 6px; }

  ::-webkit-scrollbar { width: 9px; height: 9px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${theme.accent}33; border-radius: 9px; }
  ::-webkit-scrollbar-thumb:hover { background: ${theme.accent}55; }
  `;
}

export function installChrome() {
  if (typeof document === 'undefined') return;
  const write = () => {
    let el = document.getElementById(ID);
    if (!el) { el = document.createElement('style'); el.id = ID; document.head.appendChild(el); }
    el.textContent = css();
    document.documentElement.style.colorScheme = 'dark';
  };
  write();
  onSkinChange(write);
}

// A short physical acknowledgement that something happened, for the places where the only
// other feedback is a number changing by one.
export function flash(el, cls = 'fof-ping') {
  if (!el || !el.classList) return;
  el.classList.remove(cls);
  void el.offsetWidth;          // restart the animation
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 700);
}
