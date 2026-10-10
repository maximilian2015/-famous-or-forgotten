import { theme } from '../theme.js';
import { FONT, FONT_DISPLAY } from '../chrome.js';
import { posterPalette, hash } from './poster-spec.js';

// The set, drawn. Maxi wanted the choices on a shooting day to feel like a shooting day and not a
// questionnaire, with no pictures from outside the file. So: a clapperboard and a lamp in the
// colours of this picture's own poster (poster-spec.js), the scene written on the board in
// chalk, and the decision on a script page under it. Everything printed here is real — the
// title, the scene, the director, the trust on this set, the reasons the day is harder — and
// nothing that only looks like a number the game keeps.
const TYPE = "'Courier New', Courier, monospace";
const PAPER = { paper: '#fff7e7', ink: '#302d26', muted: '#786d5d', line: '#e2d4b5', accent: '#8b432f' };
const CSS = `
@keyframes fofClap { 0% { transform: rotate(-26deg) } 55% { transform: rotate(4deg) } 75% { transform: rotate(-2deg) } 100% { transform: rotate(0) } }
@keyframes fofGlow { 0%, 100% { opacity: .55 } 50% { opacity: .8 } }
.fof-clap { transform-origin: 18px 32px; animation: fofClap .7s cubic-bezier(.3,1.4,.5,1) .15s both; }
.fof-glow { animation: fofGlow 4.5s ease-in-out infinite; }
.fof-choice { transition: border-color .15s, transform .15s; }
.fof-choice:not(:disabled):hover { border-color: rgba(255,209,102,.55) !important; }
.fof-choice:not(:disabled):active { transform: scale(.985); }
@media (prefers-reduced-motion: reduce) { .fof-clap, .fof-glow { animation: none !important; } }`;

export function SetVignette({ title, genre, scene, director }) {
  const pal = posterPalette(title, genre);
  const k = 'v' + (hash(String(title || '') + (scene || '')) % 100000);
  const chalk = (t, n) => { const s = String(t || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  return (<div style={{ position: 'relative', height: 118, borderRadius: 14, overflow: 'hidden', marginBottom: 12, border: `1px solid ${theme.line}` }}>
    <style>{CSS}</style>
    <svg viewBox="0 0 360 118" width="100%" height="118" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={k + 's'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={pal.sky[0]} /><stop offset="1" stopColor={pal.sky[1]} /></linearGradient>
        <radialGradient id={k + 'l'} cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor={pal.light} stopOpacity=".9" /><stop offset="1" stopColor={pal.light} stopOpacity="0" /></radialGradient>
        <linearGradient id={k + 'c'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={pal.light} stopOpacity=".35" /><stop offset="1" stopColor={pal.light} stopOpacity="0" /></linearGradient>
      </defs>
      <rect width="360" height="118" fill={`url(#${k}s)`} />
      {/* the lamp: a stand, a head, the light it throws across the floor */}
      <circle className="fof-glow" cx="292" cy="30" r="46" fill={`url(#${k}l)`} />
      <polygon points="282,36 302,36 352,104 232,104" fill={`url(#${k}c)`} />
      <line x1="292" y1="40" x2="292" y2="96" stroke={pal.ink} strokeWidth="3" />
      <line x1="292" y1="96" x2="276" y2="106" stroke={pal.ink} strokeWidth="3" />
      <line x1="292" y1="96" x2="308" y2="106" stroke={pal.ink} strokeWidth="3" />
      <rect x="280" y="22" width="24" height="16" rx="3" fill={pal.ink} />
      <rect x="283" y="34" width="18" height="3" rx="1" fill={pal.light} opacity=".9" />
      {/* the floor, and a strip of film along it */}
      <rect y="104" width="360" height="14" fill="#0d0b10" />
      {Array.from({ length: 24 }, (_, i) => <rect key={i} x={6 + i * 15} y="108" width="7" height="5" rx="1" fill="#2a2630" />)}
      {/* the clapperboard */}
      <g transform="translate(16 30)">
        <rect x="0" y="12" width="150" height="62" rx="4" fill="#17151b" stroke="#2c2934" />
        <g className="fof-clap">
          <rect x="0" y="0" width="150" height="13" rx="3" fill="#f2efe8" />
          {Array.from({ length: 6 }, (_, i) => <polygon key={i} points={`${8 + i * 25},0 ${20 + i * 25},0 ${10 + i * 25},13 ${-2 + i * 25},13`} fill="#17151b" />)}
        </g>
        <line x1="8" y1="38" x2="142" y2="38" stroke="#3a3642" />
        <line x1="8" y1="56" x2="142" y2="56" stroke="#3a3642" />
      </g>
    </svg>
    {/* chalk on the board: the real title, scene and director, not a take number nobody keeps */}
    <div style={{ position: 'absolute', left: 24, top: 46, width: 136, fontFamily: TYPE, color: '#f4efe4', fontSize: 9.5, lineHeight: '18px', letterSpacing: '.02em' }}>
      <div><span style={{ opacity: .55 }}>PROD </span>{chalk(title, 17)}</div>
      <div><span style={{ opacity: .55 }}>SCENE </span>{chalk(scene, 16)}</div>
      <div><span style={{ opacity: .55 }}>DIR </span>{chalk(director, 18)}</div>
    </div>
  </div>);
}

// The decision, on a page of the script.
export function ScriptPage({ kicker, title, line, children }) {
  return (<div style={{ background: PAPER.paper, color: PAPER.ink, borderRadius: 10, padding: '12px 14px 11px', marginBottom: 14, boxShadow: '0 6px 18px rgba(0,0,0,.35)', position: 'relative' }}>
    <div style={{ fontFamily: TYPE, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: PAPER.accent }}>{kicker}</div>
    {title && <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 700, lineHeight: 1.2, marginTop: 3 }}>{title}</div>}
    {line && <div style={{ fontFamily: TYPE, fontSize: 12.5, lineHeight: 1.55, marginTop: 7 }}>{line}</div>}
    {children && <div style={{ borderTop: `1px dashed ${PAPER.line}`, marginTop: 9, paddingTop: 7, fontFamily: FONT, fontSize: 11.5, color: PAPER.muted, lineHeight: 1.5 }}>{children}</div>}
  </div>);
}

// A small mark for each way of doing it, so the four are told apart before they are read.
const MARK = {
  page: <g><rect x="6" y="3" width="12" height="16" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><line x1="9" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.4" /><line x1="9" y1="11" x2="15" y2="11" stroke="currentColor" strokeWidth="1.4" /><line x1="9" y1="14" x2="13" y2="14" stroke="currentColor" strokeWidth="1.4" /></g>,
  burst: <path d="M12 2l2.2 6.1L20 6l-3.4 5.2L22 14l-6.2.6L16 21l-4-4.6L8 21l.2-6.4L2 14l5.4-2.8L4 6l5.8 2.1z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />,
  quiet: <g><circle cx="12" cy="12" r="3.2" fill="currentColor" /><circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".55" /></g>,
  pencil: <g><path d="M5 19l1.2-4.4L15.6 5.2a1.6 1.6 0 012.3 0l.9.9a1.6 1.6 0 010 2.3L9.4 17.8z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><line x1="13.6" y1="7.2" x2="16.8" y2="10.4" stroke="currentColor" strokeWidth="1.4" /></g>,
  deeper: <g><circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><line x1="14.6" y1="14.6" x2="20" y2="20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></g>,
  strange: <path d="M12 4c4.5 0 6.5 3 6.5 5.5 0 3.2-3 4.6-5.5 4.6-2.2 0-3.6-1.4-3.6-3.1 0-1.6 1.2-2.6 2.6-2.6 1.3 0 2 .8 2 1.7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
  lock: <g><rect x="6" y="11" width="12" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M8.5 11V8.5a3.5 3.5 0 017 0V11" fill="none" stroke="currentColor" strokeWidth="1.6" /></g>,
};
export function Mark({ name, color }) {
  return (<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style={{ color, flex: 'none' }}>{MARK[name] || MARK.page}</svg>);
}

// One way of doing it. `right` is a fact about it (the odds they listen); `locked` carries the
// real condition and how far you are from it.
export function ChoiceCard({ mark, tone, label, right, rightColor, blurb, tags, locked, why, progress, onClick }) {
  const col = locked ? '#6b6390' : tone || theme.muted;
  return (<button className="fof-choice" disabled={!!locked} onClick={locked ? undefined : onClick}
    style={{ width: '100%', textAlign: 'left', display: 'flex', gap: 11, alignItems: 'flex-start', background: locked ? 'rgba(120,110,150,.08)' : theme.panel,
      border: `1px solid ${theme.line}`, borderRadius: 12, padding: '11px 12px', marginBottom: 9, cursor: locked ? 'default' : 'pointer', color: theme.text, fontFamily: FONT }}>
    <div style={{ width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
      background: locked ? 'rgba(120,110,150,.12)' : 'rgba(255,255,255,.05)', border: `1px solid ${theme.line}` }}>
      <Mark name={locked ? 'lock' : mark} color={col} />
    </div>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: locked ? '#8d84ad' : theme.text }}>{label}</span>
        {right && <span style={{ fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', color: rightColor || theme.muted }}>{right}</span>}
      </div>
      <div style={{ fontSize: 11.5, color: locked ? '#7d7499' : theme.muted, marginTop: 3, lineHeight: 1.45 }}>{locked ? why : blurb}</div>
      {!locked && tags && tags.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
        {tags.map((t, i) => <span key={i} style={{ fontSize: 10.5, fontWeight: 700, color: i === 0 ? col : theme.muted, border: `1px solid ${theme.line}`, borderRadius: 999, padding: '2px 8px', lineHeight: 1.4 }}>{t}</span>)}
      </div>}
      {locked && progress && <div style={{ marginTop: 7 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#8d84ad', fontWeight: 700 }}><span>{progress.label}</span><span>{progress.value} / {progress.need}</span></div>
        <div style={{ height: 4, background: 'rgba(255,255,255,.07)', borderRadius: 2, marginTop: 4 }}>
          <div style={{ width: `${Math.max(3, Math.min(100, (progress.value / progress.need) * 100))}%`, height: '100%', background: theme.accent, borderRadius: 2 }} />
        </div>
      </div>}
    </div>
  </button>);
}
