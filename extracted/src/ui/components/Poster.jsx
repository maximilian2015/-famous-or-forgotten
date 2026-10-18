import { FONT_DISPLAY } from '../chrome.js';
import { hash, one, G, posterPlan, fitTitle, stackTitle } from './poster-spec.js';

// A one-sheet, drawn. The game ships as one html file and cannot carry an image, so every poster
// is an SVG — the same film always gets the same one.
//
// Posters V2 (14 Oct 2026). The first version drew the things posters are made of — a backdrop,
// a subject, a light, some weather, a colour — and combined them by the tens of thousands. It
// was still one poster: the same LAYOUT every time, the figure in the middle and the title at
// the foot, and five comedy subjects in six the same round-headed body. Now a sheet is PLANNED
// (poster-spec.js posterPlan) from what the credit knows — the franchise, the part, the format,
// the size and the genre — into one of fourteen compositions, each a different structure with
// its own place for the title, around a motif. The layers below are still here; a composition
// uses the ones that belong to it.
//
// It still has to work at forty-four pixels in the filmography, which is most of where anybody
// sees it, so every composition is one or two big readable shapes and the detail is weather.

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


// ── people ────────────────────────────────────────────────────────────────────
// More than one body. The old sheet had one glyph — a round head on a rounded torso — and drew
// it alone, in pairs, in threes and in fives, which is why a filmography read as "two little
// people" over and over. Each of these is a different SHAPE at forty-four pixels.
const stand = (x, y, s, f) => (<g>
  <circle cx={x} cy={y} r={6 * s} fill={f} />
  <path d={`M${x} ${y + 7 * s} c${-7 * s} 0 ${-9 * s} ${14 * s} ${-9 * s} ${22 * s} l0 ${18 * s} h${18 * s} l0 ${-18 * s} c0 ${-8 * s} ${-2 * s} ${-22 * s} ${-9 * s} ${-22 * s} z`} fill={f} />
</g>);
// Striding: the legs apart and the arms moving. `lean` tips it forward into a run.
const walker = (x, y, s, f, dir = 1, lean = 0) => (<g transform={`translate(${x} ${y}) rotate(${lean * dir}) scale(${s * dir} ${s})`}>
  <circle cx="0" cy="0" r="6" fill={f} />
  <path d="M-5 8 C-6 14 -6 22 -4 30 L4 30 C6 22 6 14 5 8 Z" fill={f} />
  <path d="M-3 28 L-11 50 M3 28 L10 49" stroke={f} strokeWidth="5" strokeLinecap="round" />
  <path d="M-4 11 L-12 25 M4 11 L12 22" stroke={f} strokeWidth="3.4" strokeLinecap="round" />
</g>);
// Arms up: the dancer, the winner, the one at the edge of the roof.
const raised = (x, y, s, f) => (<g transform={`translate(${x} ${y}) scale(${s})`}>
  <circle cx="0" cy="0" r="6" fill={f} />
  <path d="M-5 8 C-6 14 -6 22 -4 30 L4 30 C6 22 6 14 5 8 Z" fill={f} />
  <path d="M-3 28 L-6 50 M3 28 L7 50" stroke={f} strokeWidth="5" strokeLinecap="round" />
  <path d="M-4 10 L-14 -6 M4 10 L14 -6" stroke={f} strokeWidth="3.4" strokeLinecap="round" />
</g>);
const seated = (x, y, s, f) => (<g transform={`translate(${x} ${y}) scale(${s})`}>
  <circle cx="0" cy="0" r="6" fill={f} />
  <path d="M-5 8 C-6 14 -6 22 -4 30 L5 30 C6 22 6 14 5 8 Z" fill={f} />
  <path d="M-2 29 L16 29 L16 46" stroke={f} strokeWidth="6" fill="none" strokeLinejoin="round" strokeLinecap="round" />
</g>);
// Head and shoulders, front on — the close-up and the panels.
const bust = (x, y, s, f) => (<g transform={`translate(${x} ${y}) scale(${s})`}>
  <ellipse cx="0" cy="0" rx="13" ry="16" fill={f} />
  <path d="M-7 13 L-6 22 C-22 25 -34 32 -38 52 L38 52 C34 32 22 25 6 22 L7 13 Z" fill={f} />
</g>);
// A head in profile, facing left. Flipped, it faces right; two of them are a face-off.
const PROFILE = 'M62 14 c-17 0 -28 13 -29 29 -1 9 -5 13 -7 18 -2 4 2 6 5 6 1 6 0 11 4 14 4 3 10 3 14 2 l0 17 -22 10 c-9 4 -13 11 -13 20 l0 20 h66 l0 -92 c0 -25 -9 -44 -18 -44 z';

// ── objects ───────────────────────────────────────────────────────────────────
// One bold shape each, drawn round (0, 0) about forty units across, in the ink with the light
// picking out one thing. What a sheet is built around when it is not built around a person.
const MOTIFS = {
  balloon: (c) => (<g><ellipse cx="0" cy="-8" rx="15" ry="19" fill={c.ink} /><path d="M0 11 q-6 12 2 22 q6 8 -2 18" stroke={c.ink} strokeWidth="1.6" fill="none" /><ellipse cx="-5" cy="-15" rx="4" ry="6" fill={c.light} opacity=".6" /></g>),
  umbrella: (c) => (<g><path d="M-26 0 a26 22 0 0 1 52 0 q-6.5 -5 -13 0 q-6.5 -5 -13 0 q-6.5 -5 -13 0 q-6.5 -5 -13 0 z" fill={c.ink} /><path d="M0 0 L0 30 q0 6 -6 6 q-5 0 -5 -5" stroke={c.ink} strokeWidth="3" fill="none" strokeLinecap="round" /></g>),
  car: (c) => (<g><path d="M-30 8 l4 -12 l12 -2 l8 -10 h22 l10 10 l10 3 l2 11 z" fill={c.ink} /><circle cx="-17" cy="9" r="6" fill={c.ink} /><circle cx="17" cy="9" r="6" fill={c.ink} /><circle cx="-17" cy="9" r="2.4" fill={c.light} /><circle cx="17" cy="9" r="2.4" fill={c.light} /><rect x="-3" y="-13" width="10" height="7" fill={c.light} opacity=".55" /></g>),
  cake: (c) => (<g><rect x="-22" y="0" width="44" height="18" rx="2" fill={c.ink} /><rect x="-15" y="-14" width="30" height="15" rx="2" fill={c.ink} /><rect x="-1.5" y="-26" width="3" height="12" fill={c.ink} /><ellipse cx="0" cy="-30" rx="3" ry="5" fill={c.light} /></g>),
  mic: (c) => (<g><rect x="-9" y="-30" width="18" height="26" rx="9" fill={c.ink} /><path d="M-9 -22 h18 M-9 -16 h18" stroke={c.light} strokeWidth="1" opacity=".6" /><path d="M0 -4 L0 26 M-12 28 h24" stroke={c.ink} strokeWidth="4" strokeLinecap="round" /></g>),
  star: (c) => (<path d="M0 -30 L8 -9 L30 -9 L12 4 L19 26 L0 12 L-19 26 L-12 4 L-30 -9 L-8 -9 Z" fill={c.ink} />),
  note: (c) => (<g><ellipse cx="-8" cy="18" rx="10" ry="7" transform="rotate(-20 -8 18)" fill={c.ink} /><path d="M1 16 L1 -26 q14 6 16 20" stroke={c.ink} strokeWidth="4" fill="none" strokeLinecap="round" /></g>),
  ring: (c) => (<g><circle cx="0" cy="8" r="20" fill="none" stroke={c.ink} strokeWidth="6" /><path d="M-8 -12 L0 -24 L8 -12 L0 -6 Z" fill={c.light} stroke={c.ink} strokeWidth="1.5" /></g>),
  flowers: (c) => (<g>{[[-12, -14], [0, -24], [12, -12]].map(([x, y], i) => (<g key={i}><path d={`M${x} ${y} Q${x / 2} 10 0 30`} stroke={c.ink} strokeWidth="2" fill="none" /><circle cx={x} cy={y} r="7" fill={i === 1 ? c.light : c.ink} /></g>))}</g>),
  heart: (c) => (<path d="M0 26 C-30 4 -30 -22 -12 -24 C-4 -25 0 -18 0 -14 C0 -18 4 -25 12 -24 C30 -22 30 4 0 26 Z" fill={c.ink} />),
  letter: (c) => (<g><rect x="-26" y="-16" width="52" height="34" fill={c.ink} /><path d="M-26 -16 L0 4 L26 -16" stroke={c.light} strokeWidth="2" fill="none" opacity=".7" /></g>),
  chair: (c) => (<g><path d="M-12 -30 L-12 24 M-12 4 L14 4 L14 24 M-12 -30 L4 -30 L4 4" stroke={c.ink} strokeWidth="4.5" fill="none" strokeLinejoin="round" /></g>),
  window: (c) => (<g><rect x="-20" y="-28" width="40" height="56" fill={c.light} opacity=".45" /><path d="M0 -28 L0 28 M-20 0 L20 0" stroke={c.ink} strokeWidth="3" /><rect x="-20" y="-28" width="40" height="56" stroke={c.ink} strokeWidth="3.5" fill="none" /></g>),
  house: (c) => (<g><path d="M-26 28 L-26 -4 L0 -26 L26 -4 L26 28 Z" fill={c.ink} /><rect x="-6" y="2" width="11" height="12" fill={c.light} opacity=".85" /></g>),
  knife: (c) => (<g transform="rotate(-35)"><path d="M-3 -34 C6 -26 7 -6 4 6 L-4 6 Z" fill={c.light} stroke={c.ink} strokeWidth="1.5" /><rect x="-5" y="6" width="10" height="22" rx="2" fill={c.ink} /></g>),
  eye: (c) => (<g><path d="M-30 0 Q0 -24 30 0 Q0 24 -30 0 Z" fill={c.ink} /><circle cx="0" cy="0" r="9" fill={c.light} /><circle cx="0" cy="0" r="4" fill={c.ink} /></g>),
  key: (c) => (<g transform="rotate(-30)"><circle cx="0" cy="-18" r="11" fill="none" stroke={c.ink} strokeWidth="5" /><path d="M0 -7 L0 30 M0 18 h8 M0 26 h6" stroke={c.ink} strokeWidth="5" strokeLinecap="round" /></g>),
  phone: (c) => (<g><rect x="-13" y="-26" width="26" height="52" rx="5" fill={c.ink} /><rect x="-10" y="-21" width="20" height="38" rx="2" fill={c.light} opacity=".8" /></g>),
  badge: (c) => (<g><path d="M0 -28 L22 -18 L18 14 L0 28 L-18 14 L-22 -18 Z" fill={c.ink} /><path d="M0 -14 L4 -3 L15 -3 L6 4 L9 15 L0 8 L-9 15 L-6 4 L-15 -3 L-4 -3 Z" fill={c.light} opacity=".85" /></g>),
  moon: (c) => (<g><circle cx="0" cy="0" r="24" fill={c.light} /><circle cx="10" cy="-6" r="21" fill={c.sky[0]} /></g>),
  hand: (c) => (<path d="M-10 34 L-10 -2 L-14 -18 L-9 -20 L-4 -6 L-4 -28 L1 -28 L2 -8 L5 -30 L10 -29 L8 -7 L13 -24 L18 -22 L13 0 L12 34 Z" fill={c.ink} />),
  mask: (c) => (<g><path d="M-20 -22 Q0 -32 20 -22 Q24 8 0 30 Q-24 8 -20 -22 Z" fill={c.light} opacity=".9" /><ellipse cx="-8" cy="-6" rx="5" ry="3.5" fill={c.ink} /><ellipse cx="8" cy="-6" rx="5" ry="3.5" fill={c.ink} /><path d="M-6 14 q6 -4 12 0" stroke={c.ink} strokeWidth="2" fill="none" /></g>),
  planet: (c) => (<g><circle cx="0" cy="0" r="18" fill={c.ink} /><ellipse cx="0" cy="0" rx="34" ry="8" fill="none" stroke={c.light} strokeWidth="2.4" transform="rotate(-18)" /><circle cx="-6" cy="-6" r="5" fill={c.light} opacity=".35" /></g>),
  helmet: (c) => (<g><path d="M-22 18 L-22 -4 A22 24 0 0 1 22 -4 L22 18 Z" fill={c.ink} /><path d="M-15 -4 h30 v9 h-30 z" fill={c.light} opacity=".9" /></g>),
  // The adverts sell one thing, and it is a thing.
  bottle: (c) => (<g><path d="M-5 -34 h10 v10 q12 6 12 20 v34 q0 4 -4 4 h-26 q-4 0 -4 -4 v-34 q0 -14 12 -20 z" fill={c.ink} /><rect x="-12" y="2" width="24" height="14" fill={c.light} opacity=".85" /></g>),
  box: (c) => (<g><path d="M-22 -12 L0 -24 L22 -12 L22 18 L0 30 L-22 18 Z" fill={c.ink} /><path d="M-22 -12 L0 0 L22 -12 M0 0 L0 30" stroke={c.light} strokeWidth="1.4" opacity=".7" fill="none" /></g>),
  watch: (c) => (<g><rect x="-8" y="-34" width="16" height="68" rx="4" fill={c.ink} /><circle cx="0" cy="0" r="17" fill={c.ink} /><circle cx="0" cy="0" r="13" fill={c.light} /><path d="M0 0 L0 -9 M0 0 L6 3" stroke={c.ink} strokeWidth="2" strokeLinecap="round" /></g>),
};
const motif = (name, x, y, s, c) => <g transform={`translate(${x} ${y}) scale(${s})`}>{(MOTIFS[name] || MOTIFS.star)(c)}</g>;

// ── compositions ──────────────────────────────────────────────────────────────
// Fourteen structures. Each one decides where the picture's weight sits and where the title goes,
// so two sheets differ in shape before they differ in colour — which is what a thumbnail shows.
// Every one returns { art, title } where title is 'foot', 'head', 'mid' or 'none'.
const pickBack = (p, list, r) => { const allowed = (G[p.genre] || G.Drama).back.filter((b) => list.includes(b)); return BACK[one(allowed.length ? allowed : list, r)]; };
const COMPOSE = {
  hero: (r, c, p) => {
    const back = BACK[one((G[p.genre] || G.Drama).back, r)] || BACK.plain;
    const big = p.tier === 'event' ? 1.95 : 1.6;
    const pose = one(['stand', 'walk', 'stand', 'raised', /Drama|Romance/.test(p.genre) ? 'sit' : 'stand'], r);
    const x = 50, y = 46 - (big - 1.6) * 8;
    return { title: 'foot', art: (<g>
      {p.tier === 'event' && BACK.sunburst(r, c)}
      {back(r, c)}
      {(LIT[one((G[p.genre] || G.Drama).lit, r)] || LIT.none)(r, c)}
      {pose === 'walk' ? walker(x, y, big, c.ink) : pose === 'raised' ? raised(x, y, big, c.ink) : pose === 'sit' ? seated(x - 6, y + 22, big * 0.95, c.ink) : stand(x, y, big, c.ink)}
    </g>) };
  },
  faceoff: (r, c) => ({ title: 'foot', art: (<g>
    <ellipse cx="50" cy="52" rx={8 + r() * 6} ry="40" fill={c.light} opacity=".5" />
    <g transform="translate(62 18) scale(-0.86 0.86)"><path d={PROFILE} fill={c.ink} /></g>
    <g transform="translate(38 18) scale(0.86)"><path d={PROFILE} fill={c.ink} opacity=".92" /></g>
  </g>) }),
  ensemble: (r, c, p) => {
    const n = p.tier === 'event' ? 5 : one([4, 5, 6], r);
    const w = 92 / n;
    return { title: 'head', art: (<g>
      {p.tier === 'event' && BACK.sunburst(r, c)}
      <rect x="0" y="128" width="100" height="22" fill={c.ink} />
      {Array.from({ length: n }, (_, i) => {
        const mid = Math.abs(i - (n - 1) / 2) < 0.6;
        const s = (mid ? 1.12 : 0.82 + r() * 0.18) * (4.6 / Math.max(5, n));
        const x = 4 + w / 2 + i * w;
        const y = 127 - s * 48;   // feet on the ground strip, whatever the size
        return <g key={i}>{i % 3 === 1 && !mid ? walker(x, y, s, c.ink, i % 2 ? 1 : -1) : mid && p.genre === 'Musical' ? raised(x, y, s, c.ink) : stand(x, y, s, c.ink)}</g>;
      })}
    </g>) };
  },
  symbol: (r, c, p) => ({ title: 'foot', art: (<g>
    <circle cx="50" cy="60" r={30 + r() * 8} fill={c.light} opacity=".22" />
    {motif(p.motif, 50, 62, 1.25 + r() * 0.2, c)}
    {p.tier !== 'small' && r() > 0.5 && stand(78, 92, 0.42, c.ink)}
  </g>) }),
  vista: (r, c, p) => {
    const back = pickBack(p, ['horizon', 'hills', 'sea', 'moonrise', 'road', 'trees', 'plain'], r) || BACK.horizon;
    // Below the title, which sits at the head of this one.
    const sky = p.genre === 'Sci-Fi' ? motif('planet', 30 + r() * 40, 62, 0.9, c)
      : p.genre === 'Horror' ? motif('moon', 30 + r() * 40, 60, 0.7, c)
      : <circle cx={28 + r() * 44} cy={60 + r() * 10} r={10 + r() * 8} fill={c.light} opacity=".75" />;
    const fx = 26 + r() * 48;
    return { title: 'head', art: (<g>
      {sky}
      {back(r, c)}
      <rect x="0" y="118" width="100" height="32" fill={c.ink} opacity=".9" />
      {stand(fx, 104, 0.34, c.ink)}
      {p.genre === 'Romance' && stand(fx + 6, 104, 0.32, c.ink)}
    </g>) };
  },
  closeup: (r, c, p) => {
    const eyes = /Thriller|Crime/.test(p.genre) ? <rect x="0" y="63" width="100" height={5 + r() * 3} fill={c.light} opacity=".75" />
      : p.genre === 'Horror' ? <g><circle cx="42" cy="66" r="2.6" fill={c.light} /><circle cx="58" cy="66" r="2.6" fill={c.light} /></g>
      : p.genre === 'Sci-Fi' ? <rect x="32" y="60" width="36" height="10" rx="4" fill={c.light} opacity=".9" />
      : <path d="M70 40 a26 34 0 0 1 0 62" stroke={c.light} strokeWidth="2.5" fill="none" opacity=".7" />;
    return { title: 'foot', art: (<g>
      {bust(50, 70, 2.1, c.ink)}
      {eyes}
    </g>) };
  },
  corridor: (r, c, p) => ({ title: 'head', art: (<g>
    <path d="M0 0 L36 52 L36 112 L0 150 Z" fill={c.ink} opacity=".92" />
    <path d="M100 0 L64 52 L64 112 L100 150 Z" fill={c.ink} opacity=".92" />
    <path d="M0 150 L36 112 L64 112 L100 150 Z" fill={c.ink} opacity=".7" />
    <rect x="40" y="58" width="20" height="54" fill={c.light} opacity=".85" />
    {p.genre === 'Horror' ? <path d="M40 58 L48 60 L48 112 L40 112 Z" fill={c.ink} opacity=".8" /> : null}
    {stand(50, 88, 0.32, c.ink)}
    {[0, 1, 2].map((i) => <path key={i} d={`M${36 - i * 12} ${112 + i * 13} L${64 + i * 12} ${112 + i * 13}`} stroke={c.light} strokeWidth=".6" opacity=".25" />)}
  </g>) }),
  split: (r, c) => {
    const vertical = r() > 0.5;
    const cut = vertical ? 'M0 0 L50 0 L50 150 L0 150 Z' : 'M0 0 L100 0 L0 150 Z';
    return { title: 'mid', art: (<g>
      <path d={cut} fill={c.ink} />
      {vertical
        ? <g>{bust(26, 92, 0.95, c.light)}{bust(74, 92, 0.95, c.ink)}</g>
        : <g>{stand(28, 40, 0.9, c.light)}{stand(72, 92, 0.9, c.ink)}</g>}
    </g>) };
  },
  stage: (r, c, p) => ({ title: 'head', art: (<g>
    <path d="M50 18 L18 128 L82 128 Z" fill={c.light} opacity=".22" />
    <ellipse cx="50" cy="128" rx="30" ry="6" fill={c.light} opacity=".35" />
    {p.genre === 'Musical' ? raised(50, 82, 0.95, c.ink) : stand(50, 80, 0.95, c.ink)}
    {p.genre === 'Musical' && motif('mic', 66, 108, 0.45, c)}
    <path d="M0 0 L22 0 C18 40 26 90 16 150 L0 150 Z" fill={c.ink} />
    <path d="M100 0 L78 0 C82 40 74 90 84 150 L100 150 Z" fill={c.ink} />
    <path d="M6 0 C8 50 4 100 8 150 M92 0 C90 50 96 100 92 150" stroke={c.light} strokeWidth=".8" opacity=".25" fill="none" />
    <path d={`M0 0 L100 0 L100 12 ${Array.from({ length: 8 }, (_, i) => `Q${93.75 - i * 12.5} 20 ${87.5 - i * 12.5} 12`).join(' ')} Z`} fill={c.ink} />
    <rect x="0" y="136" width="100" height="14" fill={c.ink} />
    {Array.from({ length: 9 }, (_, i) => <circle key={i} cx={10 + i * 10} cy="136" r="1.4" fill={c.light} opacity=".85" />)}
  </g>) }),
  skyline: (r, c, p) => ({ title: 'head', art: (<g>
    {p.tier === 'event' && [0, 1].map((i) => <path key={i} d={`M${30 + i * 40} 150 L${12 + i * 70 + r() * 10} 0 L${20 + i * 70 + r() * 10} 0 Z`} fill={c.light} opacity=".14" />)}
    <circle cx={22 + r() * 56} cy={40 + r() * 10} r={12 + r() * 6} fill={c.light} opacity=".6" />
    {Array.from({ length: 9 }, (_, i) => { const h = 50 + r() * 50; return (<g key={i}>
      <rect x={-2 + i * 11.5} y={150 - h} width={11} height={h} fill={c.ink} />
      {Array.from({ length: 4 }, (_, k) => <rect key={k} x={1 + i * 11.5 + (k % 2) * 4} y={150 - h + 6 + k * 9} width="2" height="2.5" fill={c.light} opacity={r() > 0.45 ? 0.85 : 0.18} />)}
    </g>); })}
    {r() > 0.4 && stand(50, 54 + r() * 10, 0.3, c.ink)}
  </g>) }),
  action: (r, c, p) => ({ title: 'foot', art: (<g>
    <circle cx={50 + r() * 20} cy="44" r="34" fill={c.light} opacity=".28" />
    {BACK.sunburst(r, c)}
    {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M${-10 + i * 8} ${150 - i * 4} L${40 + i * 8} ${60 - i * 4}`} stroke={c.light} strokeWidth="1.2" opacity=".35" />)}
    {p.genre === 'Sci-Fi' && motif('planet', 78, 28, 0.6, c)}
    {walker(52, 50, 1.85, c.ink, r() > 0.5 ? 1 : -1, 18)}
  </g>) }),
  // The title IS the picture. At thumbnail size the words are unreadable, so the thumbnail is the
  // initial — one huge letter is the same idea at forty-four pixels.
  type: (r, c, p, mini, words) => {
    const { lines, size: big } = stackTitle(words, 5, p.format === 'festival' ? 58 : 80);
    return { title: 'none', art: (<g>
      <rect x="10" y="20" width="80" height="1.4" fill={c.ink} />
      {mini
        ? <text x="50" y="112" textAnchor="middle" fontFamily={FONT_DISPLAY} fontWeight="700" fontSize="96" fill={c.ink}>{(words[0] || '?')[0]}</text>
        : <text x="12" y="52" fontFamily={FONT_DISPLAY} fontWeight="700" fontSize={big} fill={c.ink} style={{ textTransform: 'uppercase' }}>
            {lines.map((w, i) => <tspan key={i} x="12" dy={i ? big * 1.02 : 0}>{w}</tspan>)}
          </text>}
      {p.format !== 'festival' && motif(p.motif, 76, 118, 0.42, c)}
      <rect x="10" y="132" width="80" height="1" fill={c.ink} opacity=".6" />
    </g>) };
  },
  // A season of television is a cast. Four of them, each in their own frame.
  panels: (r, c) => ({ title: 'foot', art: (<g>
    {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([i, j], k) => (<g key={k}>
      <rect x={3 + i * 48} y={14 + j * 54} width="46" height="52" fill={k % 3 === 0 ? c.light : c.ink} opacity={k % 3 === 0 ? 0.35 : 0.25} />
      {bust(26 + i * 48, 34 + j * 54, k === 1 ? 0.6 : 0.55, c.ink)}
    </g>))}
  </g>) }),
  product: (r, c, p) => ({ title: 'foot', art: (<g>
    <ellipse cx="50" cy="112" rx="30" ry="5" fill={c.ink} opacity=".25" />
    <circle cx="50" cy="66" r="38" fill={c.light} opacity=".3" />
    {motif(p.motif, 50, 72, 1.3, c)}
    <path d="M34 30 L40 30 L36 104 L32 104 Z" fill="#fff" opacity=".25" />
  </g>) }),
};

// ── the marks around the picture ──────────────────────────────────────────────
const ROMAN = ['', '', 'II', 'III', 'IV', 'V', 'VI'];
// A wreath: two branches curving up round an open middle, leaves along them. Two straight rows of
// leaves read as a pair of ears at thumbnail size; a ring open at the top reads as laurels.
const laurel = (x, y, s, f) => (<g transform={`translate(${x} ${y}) scale(${s})`} fill={f}>
  {[-1, 1].map((d) => (<g key={d} transform={`scale(${d} 1)`}>
    <path d="M-1 13 A13 13 0 0 1 -12 -6" stroke={f} strokeWidth="1.2" fill="none" />
    {[0, 1, 2, 3, 4].map((i) => { const a = (100 + i * 32) * Math.PI / 180; const lx = Math.cos(a) * 13, ly = Math.sin(a) * 13;
      return <ellipse key={i} cx={lx} cy={ly} rx="1.9" ry="4.2" transform={`rotate(${(100 + i * 32) - 14} ${lx} ${ly})`} />; })}
  </g>))}
</g>);

export function Poster({ title, type, genre, director, scale, size = 52, tall, compact }) {
  const w = tall ? Math.round(size) : 44, h = Math.round(w * 1.5);
  const plan = posterPlan({ title, genre, type, scale });
  const { c, r } = plan;
  // Below about sixty pixels the type is noise and the fine detail is a smudge.
  const mini = compact ?? w < 60;
  const words = String(title || '').replace(/^⭐\s*/, '').replace(/\s*·\s*season\s+\d+/gi, '').replace(/\s+(II|III|IV|V|VI)$/, '').split(' ').filter(Boolean);
  // One line if it fits, two if it does not, and the size comes down until the longest line
  // does. A fixed fourteen-character rule let "LIGHT AND RAIN" (fourteen) run off both edges.
  const base = plan.tier === 'event' ? 13 : plan.tier === 'small' ? 10 : 11.5;
  const { lines, size: fs } = fitTitle(words, base);
  const long = lines.length > 1;
  const id = 'p' + (hash(String(title || '') + (genre || '')) % 100000);
  const comp = (COMPOSE[plan.composition] || COMPOSE.hero)(r, c, plan, mini, words);
  const wx = WEATHER[one((G[plan.genre] || G.Drama).wx, r)] || WEATHER.none;
  const weather = !mini && ['vista', 'corridor', 'skyline', 'hero', 'closeup'].includes(plan.composition);
  const series = plan.format === 'series' || plan.format === 'soap';
  const top = series ? 13 : 0;
  // Where the title sits is the composition's, and so is the light behind it.
  const event = plan.tier === 'event';
  const titleText = (y) => (<text x="50" y={y} textAnchor="middle" fontFamily={FONT_DISPLAY} fontWeight="700" fontSize={fs} fill={c.type} letterSpacing=".04em" style={{ textTransform: 'uppercase' }}>
    {long ? <>
      <tspan x="50" dy={-fs * 0.5}>{lines[0]}</tspan>
      <tspan x="50" dy={fs * 0.95}>{lines[1]}</tspan>
    </> : words.join(' ')}
  </text>);
  return (<div style={{ width: w, height: h, flex: 'none', borderRadius: 5, overflow: 'hidden', position: 'relative',
    border: '1px solid rgba(255,255,255,.14)', boxShadow: '0 5px 12px -6px #000' }}>
    <svg viewBox="0 0 100 150" width={w} height={h} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={id + 'sky'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.sky[0]} /><stop offset="1" stopColor={c.sky[1]} />
        </linearGradient>
        <linearGradient id={id + 'fade'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.fade} stopOpacity="0" /><stop offset="1" stopColor={c.fade} stopOpacity=".95" />
        </linearGradient>
        <linearGradient id={id + 'top'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.fade} stopOpacity=".9" /><stop offset="1" stopColor={c.fade} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="100" height="150" fill={`url(#${id}sky)`} />
      {/* A part two is the same sheet turned round: mirrored, and its colour moved a little. */}
      {/* and a little closer, so a symmetrical sheet (a stage, a face, a corridor) is still not the same one */}
      <g transform={plan.mirror ? 'translate(100 0) scale(-1 1) translate(50 72) scale(1.22) translate(-50 -72)' : undefined}>{comp.art}</g>
      {weather && wx(r, c)}
      {/* the title, where the composition put it */}
      {!mini && comp.title === 'foot' && <rect x="0" y="92" width="100" height="58" fill={`url(#${id}fade)`} />}
      {!mini && comp.title === 'foot' && titleText(long ? 122 : 124)}
      {!mini && comp.title === 'head' && <rect x="0" y={top} width="100" height="44" fill={`url(#${id}top)`} />}
      {!mini && comp.title === 'head' && titleText(top + (long ? 20 : 22))}
      {!mini && comp.title === 'mid' && <rect x="0" y="66" width="100" height={long ? 22 : 16} fill={c.fade} opacity=".82" />}
      {!mini && comp.title === 'mid' && titleText(long ? 78 : 77.5)}
      {/* the credits block: a line of tiny type nobody can read, exactly like the real thing */}
      {!mini && plan.format !== 'ad' && <text x="50" y="140" textAnchor="middle" fontSize="3.2" fill={c.type} opacity=".55" letterSpacing=".08em" fontFamily="system-ui, sans-serif">
        {(director ? (series ? 'CREATED BY ' : 'A FILM BY ') + director.toUpperCase() : series ? 'A SERIES' : 'A FILM').slice(0, 30)}
      </text>}
      {!mini && plan.format !== 'ad' && <text x="50" y="145" textAnchor="middle" fontSize="2.4" fill={c.type} opacity=".35" letterSpacing=".05em" fontFamily="system-ui, sans-serif">
        EXECUTIVE PRODUCER · MUSIC BY · EDITED BY · CASTING · PRODUCTION DESIGN
      </text>}
      {/* A tentpole is sold as an event: a frame round the whole sheet. */}
      {event && <rect x="3" y={top + 3} width="94" height={144 - top} fill="none" stroke={c.light} strokeWidth={mini ? 3 : 1.6} opacity=".8" />}
      {/* A festival picture wears its laurels, on the side of the sheet the title is not on. */}
      {plan.format === 'festival' && (() => { const low = comp.title === 'head' || plan.composition === 'type'; const lx = plan.composition === 'type' ? 74 : 50, ly = low ? 116 : 26;
        return (<g>{laurel(lx, ly, mini ? 1.5 : 1.05, c.light)}{!mini && <text x={lx} y={ly + 1.2} textAnchor="middle" fontSize="2.6" fontWeight="800" fill={c.light} letterSpacing=".06em" fontFamily="system-ui, sans-serif">
          <tspan x={lx} dy="-1.4">OFFICIAL</tspan><tspan x={lx} dy="3">SELECTION</tspan></text>}</g>); })()}
      {/* The number of a sequel is the first thing on its poster and still readable as a thumbnail. */}
      {plan.part >= 2 && <text x="92" y={mini ? top + 30 : comp.title === 'head' ? 132 : top + 22} textAnchor="end" fontFamily={FONT_DISPLAY} fontWeight="700" fontSize={mini ? 30 : 17} fill={c.light}
        stroke={c.ink} strokeWidth={mini ? 1.6 : 0.8} paintOrder="stroke">{ROMAN[plan.part] || plan.part}</text>}
      {series && <>
        <rect x="0" y="0" width="100" height="11" fill={c.ink} opacity=".88" />
        <text x="50" y="7.8" textAnchor="middle" fontSize="5.2" fontWeight="900" fill={c.light} letterSpacing=".2em" fontFamily="system-ui, sans-serif">{plan.format === 'soap' ? 'WEEKNIGHTS AT SEVEN' : 'A SERIES'}</text>
      </>}
    </svg>
    {/* a sheen across the glass */}
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,255,255,.14) 0%, rgba(255,255,255,0) 40%)', pointerEvents: 'none' }} />
  </div>);
}
