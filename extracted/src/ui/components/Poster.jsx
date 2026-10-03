import { FONT_DISPLAY } from '../chrome.js';
import { hash, rng, one, palette, G } from './poster-spec.js';

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
  bridge: (r, c) => (<g>
    <path d={`M0 ${86 + r() * 10} L100 ${86 + r() * 10}`} stroke={c.ink} strokeWidth="6" opacity=".9" />
    {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${10 + i * 20} ${88 + r() * 8} L${10 + i * 20} 150`} stroke={c.ink} strokeWidth="3" opacity=".8" />)}
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <path key={'c' + i} d={`M${6 + i * 13} ${86} q6 ${-14 - r() * 8} 13 0`} stroke={c.light} strokeWidth=".8" fill="none" opacity=".3" />)}
  </g>),
  stairs: (r, c) => (<g>
    {[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} x={10 + i * 6} y={150 - (i + 1) * 13} width={80 - i * 12} height="13" fill={c.ink} opacity={0.92 - i * 0.03} />)}
    <rect x="0" y="0" width="100" height={62 + r() * 8} fill={c.ink} opacity=".35" />
  </g>),
  crowd: (r, c) => (<g>
    {Array.from({ length: 14 }, (_, i) => <circle key={i} cx={4 + (i % 7) * 15 + r() * 6} cy={104 + Math.floor(i / 7) * 18} r={5 + r() * 2} fill={c.ink} opacity=".88" />)}
    <rect x="0" y="118" width="100" height="32" fill={c.ink} opacity=".8" />
  </g>),
  moonrise: (r, c) => (<g>
    <circle cx={26 + r() * 48} cy={34 + r() * 10} r={14 + r() * 7} fill={c.light} opacity=".55" />
    <rect x="0" y={100 + r() * 10} width="100" height="56" fill={c.ink} opacity=".92" />
  </g>),
  grid: (r, c) => (<g>
    {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M0 ${100 + i * 9} L100 ${100 + i * 9}`} stroke={c.light} strokeWidth=".6" opacity={0.3 - i * 0.04} />)}
    {[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={'v' + i} d={`M50 100 L${-30 + i * 27} 150`} stroke={c.light} strokeWidth=".6" opacity=".18" />)}
  </g>),
  // ── four more, because "чем больше тем лучше" and because the ones above are all
  // architecture and weather. These are graphic: they read at forty-four pixels as a SHAPE,
  // which is what a one-sheet is supposed to do.
  sunburst: (r, c) => { const cy = 56 + r() * 20; return (<g>
    {Array.from({ length: 16 }, (_, i) => <path key={i} d={`M50 ${cy} L${50 + Math.cos(i * 0.3927) * 120} ${cy + Math.sin(i * 0.3927) * 120} L${50 + Math.cos((i + 0.45) * 0.3927) * 120} ${cy + Math.sin((i + 0.45) * 0.3927) * 120} Z`} fill={c.light} opacity=".16" />)}
  </g>); },
  blocks: (r, c) => (<g>
    {Array.from({ length: 5 }, (_, i) => <rect key={i} x={r() * 70} y={14 + i * 27} width={22 + r() * 44} height={11 + r() * 9} fill={i % 2 ? c.light : c.ink} opacity={i % 2 ? 0.5 : 0.8} />)}
  </g>),
  arch: (r, c) => { const w = 26 + r() * 12, y = 40 + r() * 14; return (<g>
    <path d={`M${50 - w} 150 L${50 - w} ${y + w} a${w} ${w} 0 0 1 ${w * 2} 0 L${50 + w} 150 Z`} fill={c.light} opacity=".17" />
    <path d={`M${50 - w} 150 L${50 - w} ${y + w} a${w} ${w} 0 0 1 ${w * 2} 0 L${50 + w} 150`} stroke={c.ink} strokeWidth="3" fill="none" opacity=".8" />
    <rect x="0" y="134" width="100" height="16" fill={c.ink} opacity=".85" />
  </g>); },
  wires: (r, c) => (<g>
    {[0, 1, 2].map((i) => <path key={i} d={`M-4 ${44 + i * 13 + r() * 6} q50 ${10 + r() * 12} 108 0`} stroke={c.ink} strokeWidth="1.3" fill="none" opacity=".75" />)}
    {[0, 1].map((i) => <path key={'p' + i} d={`M${20 + i * 56} 150 L${20 + i * 56} ${36 + r() * 8}`} stroke={c.ink} strokeWidth="3.4" opacity=".85" />)}
    <rect x="0" y={126 + r() * 10} width="100" height="26" fill={c.ink} opacity=".7" />
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
  // A figure seen from behind, filling the lower half: the commonest poster there is.
  back: (r, c) => (<g>
    <circle cx="50" cy={72 + r() * 8} r={14 + r() * 4} fill={c.ink} />
    <path d={`M50 ${88 + r() * 8} c-22 0 -28 26 -28 42 l0 24 h56 l0 -24 c0 -16 -6 -42 -28 -42 z`} fill={c.ink} />
  </g>),
  // Two of them, one much nearer than the other.
  apart: (r, c) => (<g>
    <circle cx={24 + r() * 6} cy="78" r="11" fill={c.ink} />
    <path d={`M${24 + r() * 6} 90 c-16 0 -20 20 -20 32 l0 30 h40 l0 -30 c0 -12 -4 -32 -20 -32 z`} fill={c.ink} />
    <circle cx={76 - r() * 6} cy="56" r="5" fill={c.ink} opacity=".9" />
    <path d={`M${76 - r() * 6} 62 c-6 0 -8 10 -8 17 l0 14 h16 l0 -14 c0 -7 -2 -17 -8 -17 z`} fill={c.ink} opacity=".9" />
  </g>),
  // A hand, reaching into the frame from below.
  hand: (r, c) => (<g>
    <path d={`M${42 + r() * 10} 150 l0 -40 l5 -16 l3 15 l3 -19 l3 19 l3 -15 l4 14 l0 42 z`} fill={c.ink} />
  </g>),
  orb: (r, c) => { const y = 40 + r() * 10, rad = 18 + r() * 8; return (<g>
    <circle cx="50" cy={y} r={rad} fill={c.light} opacity=".2" />
    <circle cx="50" cy={y} r={rad} stroke={c.light} strokeWidth="1.4" fill="none" opacity=".65" />
  </g>); },
  // A head in profile, filling most of the sheet. After the figure seen from behind this is
  // the commonest one-sheet there is, and it reads at any size at all.
  profile: (r, c) => { const s = 1 + r() * 0.25, x = 50, y = 62; return (<g transform={`translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`}>
    <path d="M62 14 c-17 0 -28 13 -29 29 -1 9 -5 13 -7 18 -2 4 2 6 5 6 1 6 0 11 4 14 4 3 10 3 14 2 l0 17 -22 10 c-9 4 -13 11 -13 20 l0 20 h66 l0 -92 c0 -25 -9 -44 -18 -44 z" fill={c.ink} />
  </g>); },
  // The ensemble: five of them in a row, which is a comedy poster and nothing else.
  group: (r, c) => (<g>
    {Array.from({ length: 5 }, (_, i) => { const h = 0.62 + (i === 2 ? 0.14 : 0) + r() * 0.1; return (<g key={i}>
      <circle cx={13 + i * 18.5} cy={70 - h * 10} r={6.4 * h + 2} fill={c.ink} />
      <path d={`M${13 + i * 18.5} ${78 - h * 10} c-9 0 -11 16 -11 26 l0 ${34 + h * 12} h22 l0 ${-34 - h * 12} c0 -10 -2 -26 -11 -26 z`} fill={c.ink} />
    </g>); })}
  </g>),
  // Somebody falling, read from the top of the frame. Thriller, horror, the odd sci-fi.
  fall: (r, c) => { const x = 36 + r() * 24; return (<g transform={`rotate(${152 + r() * 50} ${x} 56)`}>
    <circle cx={x} cy="40" r="8.5" fill={c.ink} />
    <path d={`M${x} 50 c-13 0 -17 20 -17 32 l0 26 h34 l0 -26 c0 -12 -4 -32 -17 -32 z`} fill={c.ink} />
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
        {/* The title block. It used to fade to c.ink, which was black on every poster ever
            drawn; on a high-key or washed sheet that is a bar of tar across the bottom of it.
            Each scheme says what its own foot fades to and what the type is legible in. */}
        <linearGradient id={id + 'fade'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.fade} stopOpacity="0" /><stop offset="1" stopColor={c.fade} stopOpacity=".95" />
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
        fontSize={long ? 9 : 11.5} fill={c.type} letterSpacing=".04em" style={{ textTransform: 'uppercase' }}>
        {long ? <>
          <tspan x="50" dy="-6">{words.slice(0, Math.ceil(words.length / 2)).join(' ')}</tspan>
          <tspan x="50" dy="10">{words.slice(Math.ceil(words.length / 2)).join(' ')}</tspan>
        </> : words.join(' ')}
      </text>}
      {/* the credits block: a line of tiny type nobody can read, exactly like the real thing */}
      {!mini && <text x="50" y="136" textAnchor="middle" fontSize="3.2" fill={c.type} opacity=".55" letterSpacing=".08em" fontFamily="system-ui, sans-serif">
        {(director ? 'A FILM BY ' + director.toUpperCase() : 'A FILM').slice(0, 30)}
      </text>}
      {!mini && <text x="50" y="142" textAnchor="middle" fontSize="2.4" fill={c.type} opacity=".35" letterSpacing=".05em" fontFamily="system-ui, sans-serif">
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
