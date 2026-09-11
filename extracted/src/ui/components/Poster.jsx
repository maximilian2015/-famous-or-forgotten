import { theme } from '../theme.js';
import { FONT_DISPLAY } from '../chrome.js';

// A one-sheet, drawn. The game ships as one html file and cannot carry an image, so every
// poster is an SVG composed from the genre and seeded by the title — the same film always
// gets the same poster, two films never get quite the same one. Eight genres, eight
// compositions, each built the way the real ones are: one big shape, one light source,
// the title in a serif at the bottom, and a credits block under it that nobody can read.

function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
// A few deterministic numbers off the seed, in 0..1.
function rng(seed) { let x = seed || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return (x % 10000) / 10000; }; }

// Two tints per genre — the wash and the light — and a third for the accent shape.
const PALETTE = {
  Drama:    { sky: ['#3a2c5e', '#0e0a17'], light: '#f2d6a0', ink: '#1a1426' },
  Crime:    { sky: ['#1c2b3f', '#070b12'], light: '#ffcc66', ink: '#0b1119' },
  Romance:  { sky: ['#7a2f52', '#1f0a17'], light: '#ffd6e0', ink: '#2a0f1c' },
  Musical:  { sky: ['#7a3c12', '#1c0d04'], light: '#ffe08a', ink: '#2a1806' },
  Thriller: { sky: ['#1f3d44', '#060f12'], light: '#bfe9f2', ink: '#0b1717' },
  'Sci-Fi': { sky: ['#0f3d6e', '#050e1e'], light: '#8fd3ff', ink: '#08172a' },
  Comedy:   { sky: ['#e9a63a', '#5a3a0c'], light: '#fff3c4', ink: '#2c1c06' },
  Horror:   { sky: ['#3d0b12', '#0a0203'], light: '#ff3b4a', ink: '#150507' },
};

// Each scene draws into a 100×150 box. Shapes only — no text — so the title block below
// is the same for all of them.
const SCENES = {
  Drama: (r, c) => (<>
    {/* a window, and somebody standing in the light from it */}
    <rect x="30" y="18" width="40" height="70" rx="2" fill={c.light} opacity=".16" />
    <rect x="32" y="20" width="36" height="66" fill={c.light} opacity=".08" />
    <path d="M50 20 L50 86" stroke={c.ink} strokeWidth="1.5" opacity=".7" />
    <path d="M32 52 L68 52" stroke={c.ink} strokeWidth="1.5" opacity=".7" />
    <ellipse cx={44 + r() * 12} cy="118" rx="26" ry="7" fill={c.light} opacity=".08" />
    <path d={`M${44 + r() * 12} 66 c-7 0 -8 14 -8 22 l-3 30 h22 l-3 -30 c0 -8 -1 -22 -8 -22 z`} fill={c.ink} />
    <circle cx={44 + r() * 12} cy="60" r="6.5" fill={c.ink} />
  </>),
  Crime: (r, c) => (<>
    {/* a skyline, a spotlight, rain */}
    {[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} x={6 + i * 13.5} y={70 + r() * 30} width="11" height="70" fill={c.ink} opacity=".9" />)}
    {[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={'w' + i} x={9 + i * 13.5} y={80 + r() * 30} width="2" height="2" fill={c.light} opacity={r() > 0.5 ? .9 : .3} />)}
    <path d={`M${20 + r() * 40} 0 L${5} 140 L${95} 140 Z`} fill={c.light} opacity=".07" />
    <circle cx={50} cy={34} r="9" fill={c.light} opacity=".85" />
    <path d="M50 50 c-6 0 -8 10 -8 16 l-2 22 h20 l-2 -22 c0 -6 -2 -16 -8 -16 z" fill={c.ink} />
    <path d="M42 50 l-6 -10 h28 l-6 10 z" fill={c.ink} />
  </>),
  Romance: (r, c) => (<>
    {/* two figures, close, and a warm sun low behind them */}
    <circle cx="50" cy={62 + r() * 10} r="30" fill={c.light} opacity=".14" />
    <circle cx="50" cy={62 + r() * 10} r="18" fill={c.light} opacity=".22" />
    <path d="M41 78 c-6 0 -7 12 -7 18 l-3 34 h18 l-1 -34 c0 -6 -1 -18 -7 -18 z" fill={c.ink} />
    <circle cx="41" cy="72" r="6" fill={c.ink} />
    <path d="M59 78 c-6 0 -7 12 -7 18 l-1 34 h18 l-3 -34 c0 -6 -1 -18 -7 -18 z" fill={c.ink} />
    <circle cx="59" cy="72" r="6" fill={c.ink} />
    <path d="M46 88 q4 -6 8 0" stroke={c.ink} strokeWidth="3" fill="none" />
  </>),
  Musical: (r, c) => (<>
    {/* a curtain, footlights, one figure mid-step */}
    <path d="M0 0 h100 v22 q-25 14 -50 0 q-25 14 -50 0 z" fill={c.ink} opacity=".9" />
    {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={12 + i * 19} cy="140" r="3.5" fill={c.light} opacity=".9" />)}
    {[0, 1, 2, 3, 4].map((i) => <path key={'b' + i} d={`M${12 + i * 19} 140 L${12 + i * 19 - 14} 60 L${12 + i * 19 + 14} 60 Z`} fill={c.light} opacity=".06" />)}
    <path d="M52 62 c-6 0 -8 10 -8 16 l-8 30 h8 l6 -20 l6 20 h8 l-6 -30 c0 -6 -2 -16 -6 -16 z" fill={c.ink} />
    <circle cx="52" cy="55" r="6.5" fill={c.ink} />
    <path d="M44 72 l-12 -8 M60 72 l14 -10" stroke={c.ink} strokeWidth="3.5" strokeLinecap="round" />
  </>),
  Thriller: (r, c) => (<>
    {/* rain, a running figure, a cold light behind */}
    {Array.from({ length: 18 }).map((_, i) => <path key={i} d={`M${r() * 100} ${r() * 150} l-6 14`} stroke={c.light} strokeWidth=".8" opacity=".35" />)}
    <circle cx={70 + r() * 20} cy={30} r="14" fill={c.light} opacity=".22" />
    <path d="M40 66 c-6 0 -8 10 -6 16 l-10 26 h8 l10 -18 l2 18 h8 l-2 -26 c2 -6 -2 -16 -8 -16 z" fill={c.ink} />
    <circle cx="42" cy="59" r="6.5" fill={c.ink} />
    <path d="M0 120 L100 128 L100 150 L0 150 Z" fill={c.ink} />
  </>),
  'Sci-Fi': (r, c) => (<>
    {/* a planet on the horizon, a grid floor, a small figure */}
    <circle cx={50} cy={46} r={26 + r() * 8} fill={c.light} opacity=".28" />
    <circle cx={50} cy={46} r={18} fill={c.light} opacity=".2" />
    <path d="M0 96 L100 96" stroke={c.light} strokeWidth=".8" opacity=".5" />
    {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${i * 25} 150 L50 96`} stroke={c.light} strokeWidth=".6" opacity=".25" />)}
    {[0, 1, 2].map((i) => <path key={'h' + i} d={`M0 ${104 + i * 14} L100 ${104 + i * 14}`} stroke={c.light} strokeWidth=".6" opacity=".2" />)}
    <path d="M50 70 c-4 0 -5 7 -5 11 l-2 18 h14 l-2 -18 c0 -4 -1 -11 -5 -11 z" fill={c.ink} />
    <circle cx="50" cy="65" r="4.5" fill={c.ink} />
  </>),
  Comedy: (r, c) => (<>
    {/* bright, a big tilted circle, a figure caught mid-fall */}
    <circle cx={60 + r() * 10} cy={50} r="34" fill={c.light} opacity=".22" />
    <g transform={`rotate(${-18 + r() * 36} 50 90)`}>
      <path d="M50 70 c-6 0 -8 10 -8 16 l-6 26 h9 l5 -18 l5 18 h9 l-6 -26 c0 -6 -2 -16 -8 -16 z" fill={c.ink} />
      <circle cx="50" cy="63" r="6.5" fill={c.ink} />
      <path d="M42 78 l-14 6 M58 78 l14 -14" stroke={c.ink} strokeWidth="3.5" strokeLinecap="round" />
    </g>
    <path d="M0 130 h100" stroke={c.ink} strokeWidth="3" opacity=".6" />
  </>),
  Horror: (r, c) => (<>
    {/* one figure with the light behind it, and a slash of red */}
    <circle cx="50" cy="52" r="30" fill={c.light} opacity=".12" />
    <path d="M50 44 c-9 0 -12 16 -12 26 l-6 60 h36 l-6 -60 c0 -10 -3 -26 -12 -26 z" fill={c.ink} />
    <circle cx="50" cy="38" r="8" fill={c.ink} />
    <circle cx="47" cy="37" r="1.2" fill={c.light} /><circle cx="53" cy="37" r="1.2" fill={c.light} />
    <path d={`M${10 + r() * 20} ${100 + r() * 20} L${70 + r() * 25} ${20 + r() * 30}`} stroke={c.light} strokeWidth="2.5" opacity=".8" strokeLinecap="round" />
  </>),
};

export function Poster({ title, type, genre, director, size = 52, tall }) {
  const w = tall ? Math.round(size) : 44, h = Math.round(w * 1.5);
  const seed = hash(String(title || '') + (genre || ''));
  const r = rng(seed);
  const c = PALETTE[genre] || PALETTE.Drama;
  const Scene = SCENES[genre] || SCENES.Drama;
  const tv = /Series|Soap|Show|Opera/i.test(type || '');
  const words = String(title || '').replace(/\s*·\s*season\s+\d+/gi, '').split(' ').filter(Boolean);
  const long = words.join(' ').length > 14;
  const id = 'p' + (seed % 100000);
  return (<div style={{ width: w, height: h, flex: 'none', borderRadius: 5, overflow: 'hidden', position: 'relative',
    border: '1px solid rgba(255,255,255,.14)', boxShadow: '0 5px 12px -6px #000' }}>
    <svg viewBox="0 0 100 150" width={w} height={h} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={id + 'sky'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.sky[0]} /><stop offset="1" stopColor={c.sky[1]} />
        </linearGradient>
        <linearGradient id={id + 'fade'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.ink} stopOpacity="0" /><stop offset="1" stopColor={c.ink} stopOpacity=".95" />
        </linearGradient>
      </defs>
      <rect width="100" height="150" fill={`url(#${id}sky)`} />
      {Scene(r, c)}
      {/* the bottom of every poster is dark, so the title always reads */}
      <rect x="0" y="92" width="100" height="58" fill={`url(#${id}fade)`} />
      <text x="50" y={long ? 120 : 124} textAnchor="middle" fontFamily={FONT_DISPLAY} fontWeight="700"
        fontSize={long ? 9 : 11.5} fill="#f6f1e6" letterSpacing=".04em" style={{ textTransform: 'uppercase' }}>
        {long ? <>
          <tspan x="50" dy="-6">{words.slice(0, Math.ceil(words.length / 2)).join(' ')}</tspan>
          <tspan x="50" dy="10">{words.slice(Math.ceil(words.length / 2)).join(' ')}</tspan>
        </> : words.join(' ')}
      </text>
      {/* the credits block: a line of tiny type nobody can read, exactly like the real thing */}
      <text x="50" y="136" textAnchor="middle" fontSize="3.2" fill="#f6f1e6" opacity=".55" letterSpacing=".08em" fontFamily="system-ui, sans-serif">
        {(director ? 'A FILM BY ' + director.toUpperCase() : 'A FILM BY SOMEBODY').slice(0, 30)}
      </text>
      <text x="50" y="142" textAnchor="middle" fontSize="2.4" fill="#f6f1e6" opacity=".35" letterSpacing=".05em" fontFamily="system-ui, sans-serif">
        EXECUTIVE PRODUCER · MUSIC BY · EDITED BY · CASTING · PRODUCTION DESIGN
      </text>
      {tv && <>
        <rect x="0" y="0" width="100" height="11" fill={c.ink} opacity=".85" />
        <text x="50" y="7.8" textAnchor="middle" fontSize="5.5" fontWeight="900" fill={c.light} letterSpacing=".2em" fontFamily="system-ui, sans-serif">A SERIES</text>
      </>}
    </svg>
    {/* a sheen across the glass */}
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,255,255,.14) 0%, rgba(255,255,255,0) 40%)', pointerEvents: 'none' }} />
  </div>);
}
