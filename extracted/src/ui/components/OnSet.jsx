import { theme } from '../theme.js';
import { FONT, FONT_DISPLAY } from '../chrome.js';
import { posterPalette, hash, rng } from './poster-spec.js';
import { setPalette } from './set-spec.js';

// The set, drawn. Maxi wanted the choices on a shooting day to feel like a shooting day and not a
// questionnaire, with no pictures from outside the file. Two pictures, because the two screens
// are two different moments of the job:
//   SetVignette  — a shooting day, from behind the camera: the lit mark on the floor, the boom
//                  over it, the slate in front with the real title, scene and director on it, and
//                  behind them a set that depends on the genre (five of them, not one in new
//                  colours: a room, a street at night, woods, a stage, a green screen).
//   DeskVignette — the first day, before anybody rolls: the script on a table with the title and
//                  the director on its cover, a page of it marked up, a pencil, a coffee.
// Everything printed in them is real. Nothing in them moves after the first second: the lamp
// used to glow on a loop, which cost a repaint every frame for as long as the screen was open.
const TYPE = "'Courier New', Courier, monospace";
const PAPER = { paper: '#fff7e7', ink: '#302d26', muted: '#6f6453', line: '#e2d4b5', accent: '#8b432f' };
const CSS = `
@keyframes fofClap { 0% { transform: rotate(-26deg) } 55% { transform: rotate(4deg) } 75% { transform: rotate(-2deg) } 100% { transform: rotate(0) } }
@keyframes fofIn { from { opacity: 0; transform: translateY(5px) } to { opacity: 1; transform: none } }
.fof-clap { transform-origin: 2px 13px; animation: fofClap .7s cubic-bezier(.3,1.4,.5,1) .2s both; }
.fof-in { animation: fofIn .45s ease-out both; }
.fof-choice { transition: border-color .15s, transform .15s; }
.fof-choice:not(:disabled):hover { border-color: rgba(255,209,102,.55) !important; }
.fof-choice:not(:disabled):active { transform: scale(.985); }
@media (prefers-reduced-motion: reduce) { .fof-clap, .fof-in { animation: none !important; } }`;
const cut = (t, n) => { const s = String(t || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

// Which set a genre is shot on. A small number of compositions that really differ, rather than
// one in eight colours.
const FAMILY = { Drama: 'room', Romance: 'room', Comedy: 'room', Crime: 'street', Thriller: 'street', Horror: 'woods', Musical: 'stage', 'Sci-Fi': 'screen' };
export function setFamily(genre) { return FAMILY[genre] || 'room'; }

// ── the five sets, everything above the floor line (y 108) ──────────────────────
function Room({ k, pal }) {
  return (<g>
    <rect width="360" height="108" fill="#0c0a10" />
    {/* the top of the flat, and the dark studio above it, where the rig hangs */}
    <g stroke="#2b2733" strokeWidth="1.1">
      <line x1="0" y1="4" x2="360" y2="4" /><line x1="0" y1="10" x2="360" y2="10" />
      {Array.from({ length: 30 }, (_, i) => <line key={i} x1={i * 12} y1="4" x2={i * 12 + 6} y2="10" />)}
    </g>
    <rect x="0" y="15" width="360" height="93" fill={`url(#${k}w)`} />
    <line x1="0" y1="15" x2="360" y2="15" stroke={pal.light} strokeOpacity=".35" />
    <rect x="0" y="82" width="360" height="26" fill={pal.ink} opacity=".38" />
    <line x1="0" y1="82" x2="360" y2="82" stroke={pal.light} strokeOpacity=".22" />
    {Array.from({ length: 9 }, (_, i) => <rect key={i} x={6 + i * 40} y="87" width="32" height="16" fill="none" stroke={pal.ink} strokeOpacity=".5" />)}
    {/* the window, with the outside lit behind it */}
    <rect x="146" y="26" width="66" height="48" fill={`url(#${k}o)`} />
    <g stroke={pal.ink} strokeWidth="3" fill="none"><rect x="146" y="26" width="66" height="48" /><line x1="179" y1="26" x2="179" y2="74" /><line x1="146" y1="50" x2="212" y2="50" /></g>
    <path d="M212 22 q7 28 1 56 l10 0 q-5 -28 2 -56z" fill={pal.ink} opacity=".6" />
    <path d="M146 22 q-7 28 -1 56 l-10 0 q5 -28 -2 -56z" fill={pal.ink} opacity=".6" />
    <rect x="244" y="34" width="28" height="21" fill="none" stroke={pal.ink} strokeOpacity=".65" strokeWidth="2.2" />
  </g>);
}
function Street({ k, pal, seed }) {
  const r = rng(seed); const blds = []; let x = 0;
  while (x < 360) { const w = 24 + Math.floor(r() * 34), h = 36 + Math.floor(r() * 50); blds.push({ x, w, h }); x += w + 3; }
  const lit = [];
  blds.forEach((b, i) => { for (let cx = b.x + 5; cx < b.x + b.w - 6; cx += 9) for (let cy = 108 - b.h + 7; cy < 100; cy += 11) if (r() < 0.24) lit.push(<rect key={i + '-' + cx + '-' + cy} x={cx} y={cy} width="4" height="5" fill={pal.light} opacity={0.5 + r() * 0.4} />); });
  return (<g>
    <rect width="360" height="108" fill={`url(#${k}s)`} />
    <circle cx="300" cy="20" r="40" fill={`url(#${k}l)`} opacity=".35" />
    {blds.map((b, i) => <rect key={i} x={b.x} y={108 - b.h} width={b.w} height={b.h} fill={pal.ink} />)}
    {lit}
    {/* a street lamp */}
    <line x1="128" y1="108" x2="128" y2="44" stroke={pal.ink} strokeWidth="3" />
    <path d="M128 46 q0 -8 12 -8" fill="none" stroke={pal.ink} strokeWidth="3" />
    <circle cx="142" cy="40" r="16" fill={`url(#${k}l)`} opacity=".7" />
    <rect x="137" y="37" width="10" height="4" rx="1.5" fill={pal.light} />
  </g>);
}
function Woods({ k, pal, seed }) {
  const r = rng(seed);
  const pine = (x, base, h, w, key, op) => (<polygon key={key} opacity={op} fill={pal.ink}
    points={`${x},${base - h} ${x + w * 0.32},${base - h * 0.62} ${x + w * 0.2},${base - h * 0.62} ${x + w * 0.46},${base - h * 0.3} ${x + w * 0.3},${base - h * 0.3} ${x + w * 0.5},${base} ${x - w * 0.5},${base} ${x - w * 0.3},${base - h * 0.3} ${x - w * 0.46},${base - h * 0.3} ${x - w * 0.2},${base - h * 0.62} ${x - w * 0.32},${base - h * 0.62}`} />);
  return (<g>
    <rect width="360" height="108" fill={`url(#${k}s)`} />
    {/* mist on the horizon, so the trees stand against something */}
    <rect y="36" width="360" height="72" fill={`url(#${k}h)`} />
    <circle cx="232" cy="30" r="34" fill={`url(#${k}l)`} opacity=".45" />
    <circle cx="232" cy="30" r="13" fill={pal.light} opacity=".85" />
    {Array.from({ length: 11 }, (_, i) => pine(8 + i * 34 + r() * 14, 108, 44 + r() * 26, 26, 'f' + i, 0.5))}
    {/* a house a long way off, one window lit */}
    <path d="M176 108 v-20 l14 -11 l14 11 v20z" fill={pal.ink} />
    <rect x="186" y="92" width="5" height="6" fill={pal.light} opacity=".85" />
    {[58, 140, 304].map((x, i) => pine(x, 110, 76 + r() * 18, 40, 'n' + i, 1))}
    <ellipse cx="180" cy="104" rx="210" ry="9" fill="#fff" opacity=".07" />
    <ellipse cx="120" cy="99" rx="120" ry="5" fill="#fff" opacity=".05" />
  </g>);
}
function Stage({ k, pal }) {
  const folds = (x0, dir) => Array.from({ length: 7 }, (_, i) => <rect key={i} x={x0 + dir * i * 10 - (dir < 0 ? 4 : 0)} y="0" width="4" height="108" fill={pal.light} opacity={0.05 + (i % 2) * 0.05} />);
  return (<g>
    <rect width="360" height="108" fill="#0d0a10" />
    <rect x="70" y="14" width="220" height="94" fill={`url(#${k}s)`} />
    <path d="M0 0 h76 q-10 54 -2 108 h-74z" fill={pal.ink} /><path d="M360 0 h-76 q10 54 2 108 h74z" fill={pal.ink} />
    {folds(6, 1)}{folds(350, -1)}
    <path d={'M0 0 h360 v12 ' + Array.from({ length: 12 }, () => 'q-15 12 -30 0').join(' ') + 'z'} fill={pal.ink} />
    <path d={'M0 12 ' + Array.from({ length: 12 }, () => 'q15 12 30 0').join(' ')} fill="none" stroke={pal.light} strokeOpacity=".25" />
    {Array.from({ length: 11 }, (_, i) => <circle key={i} cx={64 + i * 23} cy="106" r="2" fill={pal.light} />)}
    <rect x="56" y="100" width="248" height="10" fill={`url(#${k}l)`} opacity=".35" />
  </g>);
}
function Screen({ k }) {
  return (<g>
    <rect width="360" height="108" fill="#0b0c0f" />
    <g stroke="#262a31" strokeWidth="1.1">
      <line x1="0" y1="4" x2="360" y2="4" /><line x1="0" y1="10" x2="360" y2="10" />
      {Array.from({ length: 30 }, (_, i) => <line key={i} x1={i * 12} y1="4" x2={i * 12 + 6} y2="10" />)}
    </g>
    {/* a green screen with its tracking crosses: whatever this film is, it is put in later */}
    <rect x="34" y="16" width="326" height="92" fill={`url(#${k}g)`} />
    <g stroke="#e3f6e8" strokeOpacity=".75" strokeWidth="1.4">
      {Array.from({ length: 21 }, (_, i) => { const cx = 66 + (i % 7) * 44, cy = 32 + Math.floor(i / 7) * 26; return <g key={i}><line x1={cx - 4} y1={cy} x2={cx + 4} y2={cy} /><line x1={cx} y1={cy - 4} x2={cx} y2={cy + 4} /></g>; })}
    </g>
  </g>);
}
const SETS = { room: Room, street: Street, woods: Woods, stage: Stage, screen: Screen };

export function SetVignette({ title, genre, scene, director }) {
  // The poster's colours, held inside one band of brightness so no poster can wash the set out
  // or black it in (set-spec.js). The first day's desk keeps the poster's own, for its tabs.
  const pal = setPalette(title, genre);
  const fam = setFamily(genre);
  const seed = hash(String(title || '') + (genre || '')) || 1;
  const k = 'v' + (hash(String(title || '') + (scene || '')) % 100000);
  const Back = SETS[fam];
  // The floor's planks run to one vanishing point behind the mark, at (202, 60): at the floor line
  // (y 108) a plank is 48/90 of the way from that point to where it leaves the bottom (y 150).
  const vx = 202;
  const planks = [-120, -40, 30, 100, 170, 250, 330, 420, 500].map((x) => ({ x1: x, x2: vx + (x - vx) * (48 / 90) }));
  const twoBeams = fam === 'stage';
  return (<div className="fof-in" style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', marginBottom: 12, border: `1px solid ${theme.line}`, background: '#0b0a0f' }}>
    <style>{CSS}</style>
    <svg viewBox="0 0 360 150" width="100%" aria-hidden="true" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={k + 's'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={pal.sky[0]} /><stop offset="1" stopColor={pal.sky[1]} /></linearGradient>
        <linearGradient id={k + 'w'} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={pal.sky[1]} /><stop offset=".55" stopColor={pal.sky[0]} /><stop offset="1" stopColor={pal.sky[1]} /></linearGradient>
        <linearGradient id={k + 'o'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={pal.light} stopOpacity=".95" /><stop offset="1" stopColor={pal.light} stopOpacity=".45" /></linearGradient>
        <linearGradient id={k + 'g'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3aa865" /><stop offset="1" stopColor="#1d6e3c" /></linearGradient>
        <radialGradient id={k + 'l'} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor={pal.light} stopOpacity=".9" /><stop offset="1" stopColor={pal.light} stopOpacity="0" /></radialGradient>
        <linearGradient id={k + 'c'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={pal.light} stopOpacity=".05" /><stop offset="1" stopColor={pal.light} stopOpacity=".3" /></linearGradient>
        <linearGradient id={k + 'h'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={pal.light} stopOpacity="0" /><stop offset="1" stopColor={pal.light} stopOpacity=".32" /></linearGradient>
        <linearGradient id={k + 'f'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={fam === 'screen' ? '#174f2e' : '#17141c'} /><stop offset="1" stopColor="#08070b" /></linearGradient>
        <radialGradient id={k + 'v'} cx=".55" cy=".55" r=".75"><stop offset=".55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".6" /></radialGradient>
      </defs>
      <Back k={k} pal={pal} seed={seed} />
      {/* the floor, and the planks running back to the mark */}
      <rect y="108" width="360" height="42" fill={`url(#${k}f)`} />
      <g stroke={pal.light} strokeOpacity=".07">{planks.map((p, i) => <line key={i} x1={p.x2} y1="108" x2={p.x1} y2="150" />)}</g>
      {fam === 'street' && <g fill={pal.light}>{[142, 60, 250, 300].map((x, i) => <rect key={i} x={x - 3} y="110" width="6" height="34" opacity={i ? 0.06 : 0.16} />)}</g>}
      {/* the light, and the mark it is aimed at: a cross of tape where you have to stand */}
      {twoBeams
        ? <><polygon points="40,0 64,0 214,131 176,131" fill={`url(#${k}c)`} /><polygon points="296,0 320,0 228,131 190,131" fill={`url(#${k}c)`} /></>
        : <polygon points="226,0 262,0 248,131 156,131" fill={`url(#${k}c)`} />}
      <ellipse cx="202" cy="131" rx="52" ry="10" fill={`url(#${k}l)`} opacity=".75" />
      <g stroke="#f3e6a6" strokeWidth="2.4" strokeLinecap="round"><line x1="193" y1="128" x2="211" y2="134" /><line x1="193" y1="134" x2="211" y2="128" /></g>
      {/* the boom, over the mark */}
      <line x1="30" y1="-4" x2="172" y2="34" stroke="#0a090d" strokeWidth="4" />
      <line x1="30" y1="-6" x2="172" y2="32" stroke={pal.light} strokeOpacity=".3" strokeWidth=".8" />
      <g transform="translate(170 33) rotate(62)"><rect x="-3" y="-5.5" width="28" height="11" rx="5.5" fill="#1b1920" stroke={pal.light} strokeOpacity=".3" strokeWidth=".8" /></g>
      {/* the camera, close and dark, rim-lit from the set */}
      <g>
        <line x1="318" y1="94" x2="292" y2="152" stroke="#09080c" strokeWidth="4" /><line x1="320" y1="94" x2="338" y2="152" stroke="#09080c" strokeWidth="4" /><line x1="322" y1="94" x2="366" y2="140" stroke="#09080c" strokeWidth="4" />
        <rect x="308" y="86" width="22" height="10" rx="2" fill="#0d0c11" />
        <rect x="284" y="60" width="70" height="28" rx="3.5" fill="#0f0e14" />
        <rect x="300" y="51" width="30" height="9" rx="2" fill="#0f0e14" />
        <rect x="262" y="66" width="24" height="16" rx="2" fill="#141219" />
        <polygon points="246,58 262,64 262,84 246,90" fill="#0f0e14" />
        <path d="M246 58 L262 64 L284 64 M284 60 H354" fill="none" stroke={pal.light} strokeOpacity=".4" strokeWidth=".9" />
        <circle cx="344" cy="68" r="1.7" fill="#ff5a5a" />
      </g>
      {/* the slate, held into frame: the real title, scene and director, not a take number nobody keeps */}
      <g transform="translate(14 82) rotate(-5)">
        <rect x="0" y="13" width="138" height="62" rx="4" fill="#17151b" stroke="#34303d" />
        <g className="fof-clap">
          <rect x="0" y="0" width="138" height="12" rx="2.5" fill="#f2efe8" />
          {Array.from({ length: 6 }, (_, i) => <polygon key={i} points={`${8 + i * 23},0 ${19 + i * 23},0 ${10 + i * 23},12 ${-1 + i * 23},12`} fill="#17151b" />)}
        </g>
        <g fontFamily={TYPE} fontSize="9" fill="#f4efe4">
          <text x="8" y="29"><tspan opacity=".55">PROD </tspan>{cut(title, 18)}</text>
          <text x="8" y="45"><tspan opacity=".55">SCENE </tspan>{cut(scene, 17)}</text>
          <text x="8" y="61"><tspan opacity=".55">DIR </tspan>{cut(director, 19)}</text>
        </g>
        <line x1="6" y1="34" x2="132" y2="34" stroke="#3a3642" /><line x1="6" y1="50" x2="132" y2="50" stroke="#3a3642" />
      </g>
      <rect width="360" height="150" fill={`url(#${k}v)`} />
    </svg>
  </div>);
}

// The first day: the script on the table. Its cover carries the real title and director.
export function DeskVignette({ title, genre, director }) {
  const pal = posterPalette(title, genre);
  const k = 'd' + (hash(String(title || '') + 'desk') % 100000);
  const r = rng(hash(String(title || '') + 'grain') || 1);
  const words = String(title || '').toUpperCase();
  // A long title takes two lines on the cover rather than an ellipsis.
  let l1 = words, l2 = '';
  if (words.length > 15) { const at = words.lastIndexOf(' ', 15); if (at > 3) { l1 = words.slice(0, at); l2 = cut(words.slice(at + 1), 15); } else l1 = cut(words, 15); }
  // A page of screenplay: action across, a character name in the middle, dialogue indented.
  const page = [[0, 92], [0, 80], [0, 54], null, [34, 26], [18, 60], [18, 52], null, [0, 88], [0, 70], null, [36, 22], [18, 58]];
  return (<div className="fof-in" style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', marginBottom: 12, border: '1px solid rgba(240,196,130,.22)', background: '#3b2416' }}>
    <style>{CSS}</style>
    <svg viewBox="0 0 360 150" width="100%" aria-hidden="true" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={k + 'w'} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6e4629" /><stop offset=".6" stopColor="#4d2f1b" /><stop offset="1" stopColor="#3a2314" /></linearGradient>
        <linearGradient id={k + 'sun'} x1="0" y1="0" x2="1" y2=".6"><stop offset="0" stopColor="#fff4d8" stopOpacity=".22" /><stop offset=".7" stopColor="#fff4d8" stopOpacity="0" /></linearGradient>
        <radialGradient id={k + 'c'} cx=".45" cy=".4" r=".6"><stop offset="0" stopColor="#5a3820" /><stop offset="1" stopColor="#2c1a0e" /></radialGradient>
        <radialGradient id={k + 'v'} cx=".45" cy=".45" r=".75"><stop offset=".6" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".5" /></radialGradient>
        <filter id={k + 'sh'} x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="2" dy="3" stdDeviation="2.5" floodColor="#000" floodOpacity=".45" /></filter>
      </defs>
      <rect width="360" height="150" fill={`url(#${k}w)`} />
      <g fill="none" stroke="#2a180c" strokeOpacity=".35" strokeWidth=".8">
        {Array.from({ length: 9 }, (_, i) => { const y = 8 + i * 17 + r() * 6; return <path key={i} d={`M0 ${y} C 90 ${y + 4 - r() * 8}, 220 ${y - 5 + r() * 8}, 360 ${y + 2}`} />; })}
      </g>
      {/* morning through a window: a band of light and the shadow of its frame */}
      <polygon points="0,0 190,0 360,96 360,150 300,150 0,-10" fill={`url(#${k}sun)`} />
      <line x1="0" y1="34" x2="300" y2="150" stroke="#000" strokeOpacity=".1" strokeWidth="7" />
      {/* a page of it, marked up */}
      <g transform="translate(184 18) rotate(5)" filter={`url(#${k}sh)`}>
        <rect width="118" height="112" fill="#f4eddd" />
        {page.map((ln, i) => ln && <rect key={i} x={12 + ln[0]} y={14 + i * 7.2} width={ln[1]} height="2.6" rx="1" fill="#857a6b" opacity=".6" />)}
        <rect x="28" y="54" width="64" height="6.5" fill="#f5e04f" opacity=".55" />
        <rect x="28" y="61.4" width="56" height="6.5" fill="#f5e04f" opacity=".55" />
        <path d="M100 52 q8 6 0 16" fill="none" stroke="#a33d2a" strokeWidth="1.2" />
      </g>
      {/* the script: two brass brads in three holes, the way they come */}
      <g transform="translate(54 16) rotate(-6)">
        <rect x="5" y="5" width="116" height="114" fill="#ddd1b8" />
        <rect x="2.5" y="2.5" width="116" height="114" fill="#ebe2cd" />
        <g filter={`url(#${k}sh)`}><rect width="116" height="114" fill="#fbf6ea" /></g>
        {[[0.18, true], [0.5, false], [0.82, true]].map(([f, brad], i) => brad
          ? <g key={i}><circle cx="9" cy={114 * f} r="3.4" fill="#b8913c" /><circle cx="8.2" cy={114 * f - 0.8} r="1.3" fill="#f2d98b" /></g>
          : <circle key={i} cx="9" cy={114 * f} r="2.4" fill="#d8ccb2" />)}
        {[0, 1, 2].map((i) => <rect key={i} x="116" y={20 + i * 14} width="7" height="9" rx="1" fill={i === 1 ? '#e4785c' : pal.light} opacity=".9" />)}
        <g fontFamily={TYPE} fill="#2d2a24" textAnchor="middle">
          <text x="62" y={l2 ? 40 : 46} fontSize="10" fontWeight="700">{l1}</text>
          {l2 && <text x="62" y="52" fontSize="10" fontWeight="700">{l2}</text>}
          <text x="62" y="70" fontSize="6.5" opacity=".7">directed by</text>
          <text x="62" y="80" fontSize="7.5">{cut(director, 22)}</text>
        </g>
        <g transform="translate(70 98) rotate(-9)" fontFamily={TYPE}>
          <rect x="-29" y="-8" width="58" height="13" rx="1.5" fill="none" stroke="#a83a26" strokeOpacity=".75" strokeWidth="1.2" />
          <text x="0" y="2" fontSize="7.5" fontWeight="700" fill="#a83a26" fillOpacity=".8" textAnchor="middle" letterSpacing="1.2">FIRST DAY</text>
        </g>
      </g>
      {/* a pencil and a coffee */}
      <g transform="translate(232 128) rotate(-22)" filter={`url(#${k}sh)`}>
        <rect x="0" y="0" width="74" height="6" fill="#e3ad2c" /><rect x="0" y="0" width="74" height="2" fill="#f2c54f" />
        <rect x="74" y="0" width="7" height="6" fill="#b9b4ab" /><rect x="81" y="0" width="7" height="6" rx="1.5" fill="#e07f86" />
        <polygon points="0,0 -12,3 0,6" fill="#e9c99a" /><polygon points="-8,2 -12,3 -8,4" fill="#3a3530" />
      </g>
      <circle cx="318" cy="38" r="14" fill="none" stroke="#2a170b" strokeOpacity=".3" strokeWidth="2" strokeDasharray="60 28" transform="translate(-40 34)" />
      <g filter={`url(#${k}sh)`}>
        <circle cx="318" cy="36" r="24" fill="#efe9de" /><circle cx="318" cy="36" r="17" fill="#fbf8f2" />
        <rect x="333" y="31" width="14" height="10" rx="5" fill="#fbf8f2" />
      </g>
      <circle cx="318" cy="36" r="13" fill={`url(#${k}c)`} />
      <ellipse cx="313" cy="31" rx="4" ry="2" fill="#fff" opacity=".18" />
      <rect width="360" height="150" fill={`url(#${k}v)`} />
    </svg>
  </div>);
}

// The decision, on a page of the script.
export function ScriptPage({ kicker, title, line, children }) {
  return (<div style={{ background: PAPER.paper, color: PAPER.ink, borderRadius: 10, padding: '12px 14px 11px', marginBottom: 16, boxShadow: '0 6px 18px rgba(0,0,0,.35)', position: 'relative' }}>
    <div style={{ fontFamily: TYPE, fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: PAPER.accent }}>{kicker}</div>
    {title && <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 700, lineHeight: 1.2, marginTop: 3 }}>{title}</div>}
    {line && <div style={{ fontFamily: TYPE, fontSize: 13, lineHeight: 1.55, marginTop: 7 }}>{line}</div>}
    {children && <div style={{ borderTop: `1px dashed ${PAPER.line}`, marginTop: 9, paddingTop: 7, fontFamily: FONT, fontSize: 12.5, color: PAPER.muted, lineHeight: 1.5 }}>{children}</div>}
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

// One way of doing it. `right` is a fact about it (the odds they listen, how hard the day is);
// `effects` are what it does, each { t, good } — marked + when it is good for you, − when it
// costs, • when it is neither (career/scenes.js approachSpec, career/story.js takeTags).
// `locked` carries the real condition and how far you are from it. `warm` is the first day's
// paper-and-wood version; a shooting day is the dark one.
const SIGN = { true: '+', false: '−', null: '•' };
export function ChoiceCard({ mark, tone, label, right, rightColor, blurb, effects, locked, why, progress, onClick, warm }) {
  const col = locked ? '#b2aad2' : tone || theme.muted;
  const ink = (good) => (good === true ? theme.good : good === false ? theme.bad : theme.muted);
  return (<button className="fof-choice" disabled={!!locked} onClick={locked ? undefined : onClick}
    style={{ width: '100%', textAlign: 'left', display: 'flex', gap: 12, alignItems: 'flex-start',
      background: locked ? 'rgba(178,170,210,.06)' : warm ? '#1e1712' : theme.panel,
      border: locked ? '1px dashed rgba(178,170,210,.4)' : warm ? '1px solid rgba(240,196,130,.2)' : `1px solid ${theme.line}`,
      borderRadius: 12, padding: '12px 13px', marginBottom: 10, cursor: locked ? 'default' : 'pointer', color: theme.text, fontFamily: FONT }}>
    <div style={{ width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
      background: locked ? 'rgba(178,170,210,.1)' : 'rgba(255,255,255,.05)', border: `1px solid ${locked ? 'rgba(178,170,210,.3)' : theme.line}` }}>
      <Mark name={locked ? 'lock' : mark} color={col} />
    </div>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: locked ? '#d4cdea' : theme.text }}>{label}</span>
        {right && !locked && <span style={{ fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', color: rightColor || theme.muted }}>{right}</span>}
      </div>
      <div style={{ fontSize: 12.5, color: locked ? '#bdb5da' : theme.muted, marginTop: 3, lineHeight: 1.45 }}>{locked ? why : blurb}</div>
      {!locked && effects && effects.length > 0 && <div style={{ marginTop: 8, display: 'grid', gap: 3 }}>
        {effects.map((e, i) => (<div key={i} style={{ display: 'flex', gap: 7, fontSize: 13, lineHeight: 1.4, color: theme.text }}>
          <span style={{ width: 10, flex: 'none', fontWeight: 900, textAlign: 'center', color: ink(e.good) }}>{SIGN[e.good]}</span>
          <span style={{ opacity: 0.9 }}>{e.t}</span>
        </div>))}
      </div>}
      {locked && progress && <div style={{ marginTop: 9 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#d4cdea', fontWeight: 700 }}><span>{progress.label}</span><span>{progress.value} / {progress.need}</span></div>
        <div style={{ height: 6, background: 'rgba(255,255,255,.12)', borderRadius: 3, marginTop: 5 }}>
          <div style={{ width: `${Math.max(3, Math.min(100, (progress.value / progress.need) * 100))}%`, height: '100%', background: theme.gold, borderRadius: 3 }} />
        </div>
        {progress.need > progress.value && <div style={{ fontSize: 12, color: '#bdb5da', marginTop: 5 }}>{progress.need - progress.value} more and it opens.</div>}
      </div>}
    </div>
  </button>);
}
