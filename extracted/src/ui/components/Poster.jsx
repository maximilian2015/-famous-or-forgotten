import { FONT_DISPLAY } from '../chrome.js';

// A one-sheet, drawn. The game ships as one html file and cannot carry an image, so every poster
// is an SVG — the same film always gets the same one, seeded by its title.
//
// Maxi: "можно вообще быть креативным и сделать ну постеров 300". The honest way to three
// hundred is not to draw three hundred; it is to stop drawing POSTERS and start drawing the
// things posters are made of. A one-sheet is a backdrop, a subject, a light source, some
// weather and a colour. Ten by ten by seven by six, with the genre choosing which of each are
// plausible and the seed shifting the hue, runs to tens of thousands of combinations — and more
// to the point, two crime films now differ in what is IN them rather than only in where the
// figure happens to be standing.
//
// It still has to work at forty-four pixels in the filmography, which is most of where anybody
// sees it, so every layer is one big readable shape and the fine detail is weather, not subject.

function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
function rng(seed) { let x = seed || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return (x % 10000) / 10000; }; }
const one = (arr, r) => arr[Math.floor(r() * arr.length) % arr.length];

// ── colour ────────────────────────────────────────────────────────────────────
// A genre is a hue and a mood, not a fixed pair of hex codes — two horror films used to be
// exactly the same red. The seed moves the hue within the genre's range and decides how dark it
// sits, so a genre still reads as itself and no two pictures in it are the same colour.
const HUE = {
  Drama: [262, 26], Crime: [212, 22], Romance: [336, 24], Musical: [28, 26],
  Thriller: [188, 24], 'Sci-Fi': [206, 30], Comedy: [44, 22], Horror: [356, 20],
};
// Spread properly now. These used to sit inside ten degrees of each other for half the genres.
const LIGHT_HUE = { Drama: 36, Crime: 196, Romance: 342, Musical: 318, Thriller: 172, 'Sci-Fi': 190, Comedy: 50, Horror: 4 };
// How bright the picture itself is, which is the thing that was identical everywhere. A
// comedy is a bright poster and a horror film is nearly a black one; a drama is somewhere in
// between and should be allowed to be either.
const TONE = {
  Comedy: [46, 26], Musical: [42, 24], Romance: [34, 24], 'Sci-Fi': [22, 20],
  Drama: [24, 24], Thriller: [16, 16], Crime: [15, 15], Horror: [9, 12],
};
function palette(genre, r) {
  const [h0, spread] = HUE[genre] || HUE.Drama;
  const h = Math.round(h0 + (r() - 0.5) * spread * 2);
  const sat = 26 + Math.round(r() * 24);
  const [lo, span] = TONE[genre] || TONE.Drama;
  const top = lo + Math.round(r() * span);
  const lh = LIGHT_HUE[genre] ?? 40;
  return {
    sky: [`hsl(${h} ${sat}% ${top}%)`, `hsl(${h} ${Math.round(sat * 0.8)}% 5%)`],
    light: `hsl(${lh} ${55 + Math.round(r() * 30)}% ${66 + Math.round(r() * 20)}%)`,
    ink: `hsl(${h} ${Math.round(sat * 0.7)}% 7%)`,
  };
}

// ── the backdrop ──────────────────────────────────────────────────────────────
const BACK = {
  plain: () => null,
  skyline: (r, c) => (<g>
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <rect key={i} x={-2 + i * 13} y={72 + r() * 34} width={11 + r() * 3} height="80" fill={c.ink} opacity=".92" />)}
    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => <rect key={'w' + i} x={2 + i * 10} y={84 + r() * 34} width="2" height="2" fill={c.light} opacity={r() > 0.55 ? 0.9 : 0.25} />)}
  </g>),
  horizon: (r, c) => { const y = 96 + r() * 12; return (<g>
    <rect x="0" y={y} width="100" height="60" fill={c.ink} opacity=".9" />
    <path d={`M0 ${y} L100 ${y}`} stroke={c.light} strokeWidth="1" opacity=".45" />
  </g>); },
  sea: (r, c) => (<g>
    <rect x="0" y="88" width="100" height="62" fill={c.ink} opacity=".82" />
    {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${-4 + r() * 10} ${98 + i * 9} q24 ${-3 - r() * 4} 48 0 t48 0`} stroke={c.light} strokeWidth=".8" fill="none" opacity={0.35 - i * 0.04} />)}
  </g>),
  trees: (r, c) => (<g>
    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
      <path key={i} d={`M${2 + i * 12} 150 L${2 + i * 12} ${64 + r() * 34}`} stroke={c.ink} strokeWidth={3 + r() * 3} opacity=".92" />))}
  </g>),
  room: (r, c) => { const x = 18 + r() * 10, y = 26 + r() * 10, w = 30 + r() * 14, h = 52 + r() * 12; return (<g>
    <rect x="0" y="100" width="100" height="50" fill={c.ink} opacity=".75" />
    <rect x={x} y={y} width={w} height={h} fill={c.light} opacity=".14" />
    <rect x={x} y={y} width={w} height={h} stroke={c.ink} strokeWidth="2" fill="none" opacity=".65" />
  </g>); },
  corridor: (r, c) => (<g>
    <path d="M0 0 L32 54 L32 106 L0 150 Z" fill={c.ink} opacity=".85" />
    <path d="M100 0 L68 54 L68 106 L100 150 Z" fill={c.ink} opacity=".85" />
    <rect x="32" y="54" width="36" height="52" fill={c.light} opacity=".15" />
  </g>),
  hills: (r, c) => (<g>
    <path d={`M0 ${104 + r() * 10} q26 ${-22 - r() * 14} 52 0 t52 0 L100 150 L0 150 Z`} fill={c.ink} opacity=".88" />
  </g>),
  road: (r, c) => (<g>
    <path d={`M${40 + r() * 6} 70 L8 150 L92 150 L${58 + r() * 6} 70 Z`} fill={c.ink} opacity=".8" />
    {[0, 1, 2, 3].map((i) => <rect key={i} x={48 - i * 0.6} y={88 + i * 16} width={2 + i} height={5 + i * 2} fill={c.light} opacity=".4" />)}
  </g>),
  grid: (r, c) => (<g>
    {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M0 ${100 + i * 9} L100 ${100 + i * 9}`} stroke={c.light} strokeWidth=".6" opacity={0.3 - i * 0.04} />)}
    {[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={'v' + i} d={`M50 100 L${-30 + i * 27} 150`} stroke={c.light} strokeWidth=".6" opacity=".18" />)}
  </g>),
};

// ── the subject ───────────────────────────────────────────────────────────────
const body = (x, y, s, c) => (<g>
  <circle cx={x} cy={y} r={6 * s} fill={c.ink} />
  <path d={`M${x} ${y + 7 * s} c${-7 * s} 0 ${-9 * s} ${14 * s} ${-9 * s} ${22 * s} l0 ${18 * s} h${18 * s} l0 ${-18 * s} c0 ${-8 * s} ${-2 * s} ${-22 * s} ${-9 * s} ${-22 * s} z`} fill={c.ink} />
</g>);
const SUBJ = {
  none: () => null,
  figure: (r, c) => body(42 + r() * 16, 56 + r() * 14, 0.9 + r() * 0.5, c),
  pair: (r, c) => (<g>{body(30 + r() * 6, 62, 0.85, c)}{body(66 - r() * 6, 62, 0.85, c)}</g>),
  three: (r, c) => (<g>{[0, 1, 2].map((i) => <g key={i}>{body(28 + i * 22, 60 + (i === 1 ? -7 : 0), 0.8, c)}</g>)}</g>),
  looming: (r, c) => { const y = 48 + r() * 8, rad = 17 + r() * 5; return (<g>
    <circle cx="50" cy={y} r={rad} fill={c.ink} />
    <path d={`M50 ${y + 18} c-24 0 -30 30 -30 48 l0 40 h60 l0 -40 c0 -18 -6 -48 -30 -48 z`} fill={c.ink} />
  </g>); },
  car: (r, c) => (<g>
    <path d="M28 102 l6 -17 h32 l6 17 z" fill={c.ink} />
    <circle cx="36" cy="96" r="4.5" fill={c.light} opacity=".95" />
    <circle cx="64" cy="96" r="4.5" fill={c.light} opacity=".95" />
    <path d="M36 96 L8 150 L62 150 Z" fill={c.light} opacity=".10" />
    <path d="M64 96 L40 150 L92 150 Z" fill={c.light} opacity=".10" />
  </g>),
  door: (r, c) => (<g>
    <rect x="33" y="32" width="34" height="68" fill={c.ink} opacity=".96" />
    <rect x="33" y="32" width="34" height="68" stroke={c.light} strokeWidth="1.5" fill="none" opacity=".45" />
    <rect x={37 + r() * 9} y="36" width={4 + r() * 4} height="60" fill={c.light} opacity=".55" />
  </g>),
  chair: (r, c) => (<g>
    <path d="M36 100 l0 -28 l16 0 l0 28" stroke={c.light} strokeWidth="2.5" fill="none" opacity=".55" />
    <path d="M36 86 l16 0" stroke={c.light} strokeWidth="2" opacity=".4" />
    <path d="M60 100 l0 -28 l16 0 l0 28" stroke={c.light} strokeWidth="2.5" fill="none" opacity=".3" />
  </g>),
  window: (r, c) => (<g>
    <rect x="30" y="24" width="40" height="64" fill={c.light} opacity=".16" />
    <path d="M50 24 L50 88 M30 56 L70 56" stroke={c.ink} strokeWidth="2" opacity=".7" />
    <rect x="30" y="24" width="40" height="64" stroke={c.ink} strokeWidth="2" fill="none" opacity=".7" />
  </g>),
  orb: (r, c) => { const y = 40 + r() * 10, rad = 18 + r() * 8; return (<g>
    <circle cx="50" cy={y} r={rad} fill={c.light} opacity=".2" />
    <circle cx="50" cy={y} r={rad} stroke={c.light} strokeWidth="1.4" fill="none" opacity=".65" />
  </g>); },
};

// ── the light ─────────────────────────────────────────────────────────────────
const LIT = {
  none: () => null,
  sun: (r, c) => <circle cx={30 + r() * 40} cy={30 + r() * 14} r={8 + r() * 5} fill={c.light} opacity=".85" />,
  cone: (r, c) => <path d={`M${20 + r() * 40} -6 L4 150 L96 150 Z`} fill={c.light} opacity=".09" />,
  shaft: (r, c) => <path d={`M${14 + r() * 20} 0 L${50 + r() * 16} 0 L${72 + r() * 14} 150 L${30 + r() * 14} 150 Z`} fill={c.light} opacity=".08" />,
  halo: (r, c) => <ellipse cx="50" cy={52 + r() * 20} rx={32 + r() * 12} ry={22 + r() * 8} fill={c.light} opacity=".11" />,
  pool: (r, c) => <ellipse cx={40 + r() * 20} cy={110 + r() * 12} rx={24 + r() * 10} ry="7" fill={c.light} opacity=".16" />,
  rim: (r, c) => <path d={`M0 ${86 + r() * 16} L100 ${86 + r() * 16}`} stroke={c.light} strokeWidth="2" opacity=".5" />,
};

// ── the weather ───────────────────────────────────────────────────────────────
const WEATHER = {
  none: () => null,
  rain: (r, c) => (<g>{Array.from({ length: 18 }, (_, i) => <path key={i} d={`M${r() * 100} ${r() * 120} l-2.5 8`} stroke={c.light} strokeWidth=".7" opacity=".32" />)}</g>),
  snow: (r, c) => (<g>{Array.from({ length: 20 }, (_, i) => <circle key={i} cx={r() * 100} cy={r() * 130} r={0.7 + r() * 0.9} fill={c.light} opacity=".5" />)}</g>),
  stars: (r, c) => (<g>{Array.from({ length: 16 }, (_, i) => <circle key={i} cx={r() * 100} cy={r() * 80} r={0.5 + r() * 0.7} fill={c.light} opacity={0.4 + r() * 0.5} />)}</g>),
  fog: (r, c) => (<g>{[0, 1, 2].map((i) => <rect key={i} x="0" y={56 + i * 18 + r() * 8} width="100" height={8 + r() * 6} fill={c.light} opacity=".07" />)}</g>),
  scan: (r, c) => (<g>{Array.from({ length: 14 }, (_, i) => <rect key={i} x="0" y={i * 11} width="100" height="1" fill={c.light} opacity=".09" />)}</g>),
};

// ── which of them a genre is allowed ──────────────────────────────────────────
// The gate is the whole point. A musical does not get rain on a motorway and a horror film does
// not get three people in a sunbeam. Inside the gate the seed does as it likes.
const G = {
  Drama: { back: ['room', 'horizon', 'hills', 'plain'], subj: ['figure', 'pair', 'chair', 'window'], lit: ['shaft', 'halo', 'pool', 'rim'], wx: ['none', 'fog', 'rain'] },
  Crime: { back: ['skyline', 'road', 'corridor', 'horizon'], subj: ['figure', 'car', 'pair', 'looming'], lit: ['cone', 'pool', 'rim', 'none'], wx: ['rain', 'fog', 'none'] },
  Romance: { back: ['room', 'sea', 'hills', 'plain'], subj: ['pair', 'window', 'figure', 'chair'], lit: ['sun', 'halo', 'shaft'], wx: ['snow', 'none', 'rain'] },
  Musical: { back: ['room', 'plain', 'skyline', 'horizon'], subj: ['three', 'figure', 'pair', 'chair'], lit: ['cone', 'pool', 'halo', 'sun'], wx: ['none', 'stars', 'snow'] },
  Thriller: { back: ['corridor', 'road', 'room', 'skyline'], subj: ['figure', 'door', 'looming', 'car'], lit: ['shaft', 'rim', 'none', 'cone'], wx: ['rain', 'fog', 'none'] },
  'Sci-Fi': { back: ['grid', 'horizon', 'hills', 'plain'], subj: ['orb', 'figure', 'looming', 'none'], lit: ['halo', 'rim', 'sun'], wx: ['stars', 'scan', 'none'] },
  Comedy: { back: ['room', 'hills', 'plain', 'skyline', 'sea'], subj: ['three', 'pair', 'figure', 'car'], lit: ['sun', 'halo', 'pool', 'shaft'], wx: ['none', 'snow', 'rain'] },
  Horror: { back: ['trees', 'room', 'corridor', 'plain'], subj: ['door', 'looming', 'figure', 'window'], lit: ['none', 'shaft', 'pool'], wx: ['fog', 'rain', 'none'] },
};
// For anybody counting: how many one-sheets a genre can actually produce, before the hue and the
// dozen seeded positions inside each layer are counted at all.
export function posterCount(genre) {
  const g = G[genre] || G.Drama;
  return g.back.length * g.subj.length * g.lit.length * g.wx.length;
}

export function Poster({ title, type, genre, director, size = 52, tall, compact }) {
  const w = tall ? Math.round(size) : 44, h = Math.round(w * 1.5);
  const seed = hash(String(title || '') + (genre || ''));
  const r = rng(seed);
  const c = palette(genre, r);
  const g = G[genre] || G.Drama;
  const back = BACK[one(g.back, r)] || BACK.plain;
  const subj = SUBJ[one(g.subj, r)] || SUBJ.figure;
  const lit = LIT[one(g.lit, r)] || LIT.none;
  const wx = WEATHER[one(g.wx, r)] || WEATHER.none;
  // Below about sixty pixels the type is noise and the fine detail is a smudge.
  const mini = compact ?? w < 60;
  const finish = one(['foot', 'head', 'edge', 'corner', 'split', 'none'], r);
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
      {/* The light sits under the backdrop, so a sunset is behind the skyline and a spotlight
          falls in front of the figure rather than on top of everything. */}
      {lit(r, c)}
      {back(r, c)}
      {/* A thumbnail enlarges the subject and drops it, so the shape that says what kind of film
          this is fills the frame instead of sitting politely in the middle of it. */}
      {mini ? <g transform="translate(-14 -8) scale(1.28)">{subj(r, c)}</g> : subj(r, c)}
      {wx(r, c)}
      {/* At forty-four pixels a hard band of the genre's own light is the thing a person actually
          tells one picture from another by. */}
      {/* Five ways to finish a thumbnail instead of one. A single fixed stripe along the foot
          made every picture in the list rhyme with every other one, whatever was inside it. */}
      {mini && finish === 'foot' && <rect x="0" y="132" width="100" height="18" fill={c.light} opacity=".9" />}
      {mini && finish === 'head' && <rect x="0" y="0" width="100" height="14" fill={c.light} opacity=".85" />}
      {mini && finish === 'edge' && <rect x="2" y="2" width="96" height="146" stroke={c.light} strokeWidth="4" fill="none" opacity=".75" />}
      {mini && finish === 'corner' && <path d="M100 0 L100 46 L56 0 Z" fill={c.light} opacity=".85" />}
      {mini && finish === 'split' && <rect x="0" y="0" width="9" height="150" fill={c.light} opacity=".85" />}
      {!mini && <rect x="0" y="92" width="100" height="58" fill={`url(#${id}fade)`} />}
      {!mini && <text x="50" y={long ? 120 : 124} textAnchor="middle" fontFamily={FONT_DISPLAY} fontWeight="700"
        fontSize={long ? 9 : 11.5} fill="#f6f1e6" letterSpacing=".04em" style={{ textTransform: 'uppercase' }}>
        {long ? <>
          <tspan x="50" dy="-6">{words.slice(0, Math.ceil(words.length / 2)).join(' ')}</tspan>
          <tspan x="50" dy="10">{words.slice(Math.ceil(words.length / 2)).join(' ')}</tspan>
        </> : words.join(' ')}
      </text>}
      {/* the credits block: a line of tiny type nobody can read, exactly like the real thing */}
      {!mini && <text x="50" y="136" textAnchor="middle" fontSize="3.2" fill="#f6f1e6" opacity=".55" letterSpacing=".08em" fontFamily="system-ui, sans-serif">
        {(director ? 'A FILM BY ' + director.toUpperCase() : 'A FILM').slice(0, 30)}
      </text>}
      {!mini && <text x="50" y="142" textAnchor="middle" fontSize="2.4" fill="#f6f1e6" opacity=".35" letterSpacing=".05em" fontFamily="system-ui, sans-serif">
        EXECUTIVE PRODUCER · MUSIC BY · EDITED BY · CASTING · PRODUCTION DESIGN
      </text>}
      {tv && <>
        <rect x="0" y="0" width="100" height="11" fill={c.ink} opacity=".85" />
        <text x="50" y="7.8" textAnchor="middle" fontSize="5.5" fontWeight="900" fill={c.light} letterSpacing=".2em" fontFamily="system-ui, sans-serif">A SERIES</text>
      </>}
    </svg>
    {/* a sheen across the glass */}
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,255,255,.14) 0%, rgba(255,255,255,0) 40%)', pointerEvents: 'none' }} />
  </div>);
}
