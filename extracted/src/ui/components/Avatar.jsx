import { ageBand } from '../../systems/life/appearance.js';

// Style 07 from the mockups: big head, real face, separable parts.
// Everything is drawn in a fixed 60x100 box. Hair, face, arms and outfit are their own
// groups, so changing a wardrobe id swaps one shape and touches nothing else.

// A child is not a small adult — it is a nearly full-sized head on a short body.
// The body is squashed towards the feet so every age still stands on the same ground
// line, and the head is pushed down by exactly as much as the shoulders dropped.
// Growth is continuous, so every birthday shows.
const SHOULDER = 45, GROUND = 92;
function proportions(age) {
  const grown = Math.min(1, Math.max(0, age) / 19);
  let body = 0.62 + 0.38 * grown;
  let wide = 0.80 + 0.20 * grown;
  const head = 1.26 - 0.26 * grown;
  if (age > 55) {                       // people lose a little height as they get old
    const shrink = Math.min(1, (age - 55) / 30);
    body -= 0.09 * shrink;
    wide -= 0.03 * shrink;
  }
  return { body, wide, head };
}

function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = (sh) => Math.round((((pa >> sh) & 255) * (1 - t)) + (((pb >> sh) & 255) * t));
  return '#' + ((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0');
}
const lighten = (hex, t = 0.22) => mix(hex, '#ffffff', t);

// Hair greys on its own schedule — the player never picks this.
function greyed(colour, age) {
  if (age >= 72) return '#ddd9e6';
  if (age >= 60) return mix(colour, '#b3aebf', 0.6);
  if (age >= 48) return mix(colour, '#b3aebf', 0.28);
  return colour;
}

// ─── hair ──────────────────────────────────────────────────────────────────────
// The head is a circle at (30,26) r17, so every style is cut against that.
function Hair({ id, colour, skin }) {
  const hi = lighten(colour, 0.24);
  // GEOMETRY, because this was wrong in every style at once: the head is a circle at
  // (30,26) r17, so the scalp runs from y=9 to y=43. The outer edge of any hair has to
  // clear y=9 or a bare crescent shows above it — which is exactly what "half the head
  // is bald" looked like. A quadratic from (12,26) to (48,26) peaks at
  // 0.25*26 + 0.5*ctrlY + 0.25*26, so the control point has to be well negative.
  // Outer apex here lands at y≈5.5, three units of hair proud of the skull.
  // The inner edge is the hairline: y≈17.5 in the middle, dropping to 30 at the temples.
  const cap = 'M12 26 Q30 -15 48 26 L48 30 Q44 20 30 17.5 Q16 20 12 30 Z';
  switch (id) {
    case 'buzz':
      return <path d="M13.5 24 Q30 6 46.5 24 L46.5 27.5 Q42 20 30 19 Q18 20 13.5 27.5 Z" fill={mix(colour, skin, 0.26)} />;
    case 'long':
      return (<>
        <path d="M12 24 Q30 2 48 24 L49 52 Q47 30 30 19 Q13 30 11 52 Z" fill={colour} />
        <path d="M15 21 Q22 9 32 9 L30 14.5 Q21 15 16 25 Z" fill={hi} />
      </>);
    case 'waves':
      return (<>
        <path d="M11 27 Q30 2 49 27 L48 47 Q44 40 46 32 Q40 21 30 19 Q20 21 14 32 Q16 40 12 47 Z" fill={colour} />
        <path d="M30 19 Q22 21 16 30 L18 23 Q24 16 30 15.5 Z" fill={hi} />
        <path d="M13 34 Q17 40 14 45 M47 34 Q43 40 46 45" stroke={hi} strokeWidth="1.2" fill="none" />
      </>);
    case 'straight':
      // ironed flat and heavy — straight edges, no curve at the bottom
      return (<>
        <path d="M12 24 Q30 2 48 24 L48 60 L42 60 L42.5 30 Q40 20 30 18 Q20 20 17.5 30 L18 60 L12 60 Z" fill={colour} />
        <path d="M14 24 Q30 5 46 24 L46 28 Q40 19 30 17 Q20 19 14 28 Z" fill={colour} />
        <path d="M16 26 Q22 12 31 11 L30 15 Q22 17 18 28 Z" fill={hi} />
      </>);
    case 'volume':
      // lifted at the root and wide at the sides
      return (<>
        <path d="M8 30 Q6 6 30 3 Q54 6 52 30 Q50 44 46 48 Q49 32 44 24 Q40 18 30 17 Q20 18 16 24 Q11 32 14 48 Q10 44 8 30 Z" fill={colour} />
        <path d="M13 22 Q20 7 32 6 L30 12 Q21 14 16 26 Z" fill={hi} />
        <path d="M44 22 Q47 30 45 38" stroke={hi} strokeWidth="1.6" fill="none" />
      </>);
    case 'braid':
      return (<>
        <path d="M12 24 Q30 3 48 24 L48 30 Q42 19 30 17.5 Q18 19 12 30 Z" fill={colour} />
        <path d="M44 28 Q50 36 47 46 Q45 54 42 58" stroke={colour} strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M45.6 32 L47.4 36 M45 39 L48 42 M43.8 46 L46.4 49" stroke={hi} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M15 22 Q22 9 32 9 L30 14 Q21 15 16 25 Z" fill={hi} />
      </>);
    case 'undercut':
      return (<>
        <path d="M14 27 Q30 21 46 27 L46 29 Q40 25 30 24.5 Q20 25 14 29 Z" fill={mix(colour, skin, 0.45)} />
        <path d="M13 24 Q30 1 47 24 L46 27 Q40 15 30 13.5 Q19 15 14 27 Z" fill={colour} />
        <path d="M17 21 Q24 8 34 8 L31 14 Q22 15 18 24 Z" fill={hi} />
      </>);
    case 'bob':
      return (<>
        <path d="M12 25 Q30 4 48 25 L48 41 L42 41 Q44 22 30 18 Q16 22 18 41 L12 41 Z" fill={colour} />
        <path d="M15 22 Q22 11 32 11 L30 16 Q21 16 16 26 Z" fill={hi} />
      </>);
    case 'curly':
      return (<>
        <g fill={colour}>
          <circle cx="30" cy="9" r="8" /><circle cx="20" cy="13" r="7.6" /><circle cx="40" cy="13" r="7.6" />
          <circle cx="13.5" cy="22" r="7" /><circle cx="46.5" cy="22" r="7" />
          <circle cx="15" cy="31" r="5.6" /><circle cx="45" cy="31" r="5.6" />
        </g>
        <ellipse cx="30" cy="29" rx="12.6" ry="13.4" fill={skin} />
        <circle cx="23" cy="10" r="4.6" fill={hi} /><circle cx="16" cy="17" r="3.6" fill={hi} />
      </>);
    case 'ponytail':
      return (<>
        <path d="M46 25 Q54 32 51 46 Q49 54 44 51.5 Q49 41 44.5 30 Z" fill={colour} />
        <path d={cap} fill={colour} />
        <path d="M15 21 Q22 10 32 10 L30 15 Q21 15 16 25 Z" fill={hi} />
        <path d="M43 24 Q47 27 46.5 30" stroke={hi} strokeWidth="1.4" fill="none" />
      </>);
    case 'bun':
      return (<>
        <circle cx="30" cy="6.5" r="6.4" fill={colour} />
        <circle cx="30" cy="6.5" r="6.4" fill="none" stroke={hi} strokeWidth="1.1" />
        <path d="M14 23 Q30 6 46 23 L46 28 Q41 19 30 17.5 Q19 19 14 28 Z" fill={colour} />
        <path d="M18 25 Q24 18 30 17.5 L30 20 Q24 21 19 27 Z" fill={hi} />
      </>);
    case 'pigtails':
      return (<>
        <ellipse cx="10.5" cy="35" rx="5.2" ry="7.6" fill={colour} />
        <ellipse cx="49.5" cy="35" rx="5.2" ry="7.6" fill={colour} />
        <path d="M12 24 Q30 4 48 24 L48 29 Q42 19 30 17.5 Q18 19 12 29 Z" fill={colour} />
        <path d="M15 21 Q22 10 32 10 L30 15 Q21 15 16 25 Z" fill={hi} />
      </>);
    case 'mohawk':
      return (<>
        <path d="M14 24 Q30 13 46 24 L46 27 Q40 20 30 19 Q20 20 14 27 Z" fill={mix(colour, skin, 0.3)} />
        <path d="M21 18 L24 2 L28 13 L30.5 0 L33 12 L37 3 L40 18 Q31 12 21 18 Z" fill="#ff4db8" />
      </>);
    case 'bald':
    case 'beard':
      return <ellipse cx="24" cy="15" rx="6" ry="3.4" fill="#ffffff" opacity="0.26" />;
    case 'tuft': // babies get one curl and nothing else
      return <path d="M27 10 Q29 2 34 5 Q31 6 31.5 11 Z" fill={colour} />;
    default: // cropped
      return (<>
        <path d={cap} fill={colour} />
        <path d="M15 20 Q22 10 32 10 L30 14 Q21 14 15 24 Z" fill={hi} />
      </>);
  }
}

// ─── face ──────────────────────────────────────────────────────────────────────
function Face({ id, colour, age, sick, band, skin, eyes, lips }) {
  const old = age >= 60;
  const brow = greyed(colour, age);
  // Cheeks and shadows are shifted from the skin itself. A fixed pink over a deep tone
  // turned the face tomato-red — the whole face has to move together.
  const blush = mix(skin, '#a8384f', 0.42);
  const mouth = lips && lips !== 'natural' ? lips : mix(skin, '#8e2f45', 0.62);
  const pallor = mix(skin, '#7f9c86', 0.45);
  const iris = eyes || '#5b3a22';
  return (<>
    <path d="M19 21 Q24 18.6 28 20.4" stroke={brow} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <path d="M32 20.4 Q36 18.6 41 21" stroke={brow} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    {old ? (<>
      <path d="M20 26.4 Q24 24.4 28 26.4" stroke="#1a1420" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M33 26.4 Q37 24.4 41 26.4" stroke="#1a1420" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M18.5 31 Q20.5 33 18.5 35 M42.5 31 Q40.5 33 42.5 35" stroke={mix(skin, '#000000', 0.3)} strokeWidth="0.9" fill="none" />
    </>) : (<>
      <ellipse cx="24" cy="26" rx="3.2" ry="3.6" fill="#fff" />
      <ellipse cx="37" cy="26" rx="3.2" ry="3.6" fill="#fff" />
      <circle cx="24" cy="26.5" r="1.8" fill={iris} />
      <circle cx="37" cy="26.5" r="1.8" fill={iris} />
      <circle cx="24" cy="26.5" r="0.85" fill="#12101a" />
      <circle cx="37" cy="26.5" r="0.85" fill="#12101a" />
      <circle cx="23.4" cy="25.7" r="0.6" fill="#fff" />
      <circle cx="36.4" cy="25.7" r="0.6" fill="#fff" />
    </>)}
    <path d="M29 30 L28 33 Q29.5 34 31 33" stroke={mix(skin, '#000000', 0.22)} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    {id === 'beard' && (<>
      <path d="M14 27 Q15 47 30 47 Q45 47 46 27 Q42 41 30 41 Q18 41 14 27 Z" fill={greyed(colour, age)} />
      <path d="M24 34.5 Q30 32.5 36 34.5 Q30 37 24 37 Z" fill={greyed(colour, age)} />
    </>)}
    {sick
      ? <path d="M26 39 Q30 36.5 34 39" stroke={mouth} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      : old
        ? <path d="M27 39.5 Q30 38.6 33 39.5" stroke={mouth} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        : <path d={id === 'beard' ? 'M27 38.5 Q30 37.8 33 38.5 Q30 40.5 27 38.5 Z' : 'M26 37 Q30 36 34 37 Q30 40.5 26 37 Z'} fill={mouth} />}
    {!old && !sick && (<>
      <circle cx="18" cy="32" r="2.6" fill={blush} opacity="0.3" />
      <circle cx="43" cy="32" r="2.6" fill={blush} opacity="0.3" />
    </>)}
    {sick && (<>
      <circle cx="18" cy="31" r="3" fill={pallor} opacity="0.4" />
      <circle cx="43" cy="31" r="3" fill={pallor} opacity="0.4" />
    </>)}
  </>);
}

// ─── body ──────────────────────────────────────────────────────────────────────
// Nothing here may be as dark as the app background (#150f2c) or the figure turns
// into a floating head — the exact bug the first avatar round shipped with.
const DARK_LEG = '#332748';

// Limbs are strokes with round caps, which gives a clean shoulder-to-wrist taper for
// free. They are drawn AFTER the torso — tucked behind it they read as shoulder pads.
// `sleeve` null means a bare arm; `sleeveTo` is the y where the fabric stops.
const SHOULDER_Y = 47.5, WRIST_Y = 65.5;
function Arms({ skin, sleeve, sleeveTo = 61, cuff }) {
  const t = Math.max(0, Math.min(1, (sleeveTo - SHOULDER_Y) / (WRIST_Y - SHOULDER_Y)));
  const lx = 21 + (15.2 - 21) * t, rx = 39 + (44.8 - 39) * t;
  const y = SHOULDER_Y + (WRIST_Y - SHOULDER_Y) * t;
  return (<>
    <path d="M21 47.5 L15.2 65.5" stroke={skin} strokeWidth="5.2" strokeLinecap="round" fill="none" />
    <path d="M39 47.5 L44.8 65.5" stroke={skin} strokeWidth="5.2" strokeLinecap="round" fill="none" />
    {sleeve && (<>
      <path d={`M21 47.5 L${lx.toFixed(2)} ${y.toFixed(2)}`} stroke={sleeve} strokeWidth="5.9" strokeLinecap="round" fill="none" />
      <path d={`M39 47.5 L${rx.toFixed(2)} ${y.toFixed(2)}`} stroke={sleeve} strokeWidth="5.9" strokeLinecap="round" fill="none" />
    </>)}
    {cuff && (<>
      <circle cx={lx} cy={y} r="2.3" fill={cuff} />
      <circle cx={rx} cy={y} r="2.3" fill={cuff} />
    </>)}
    <circle cx="15.2" cy="65.5" r="2.9" fill={skin} />
    <circle cx="44.8" cy="65.5" r="2.9" fill={skin} />
  </>);
}

function Legs({ fill = DARK_LEG, shoes }) {
  return (<>
    <rect x="23" y="71" width="6" height="21" rx="3" fill={fill} />
    <rect x="32" y="71" width="6" height="21" rx="3" fill={fill} />
    {shoes}
  </>);
}

function Outfit({ id, skin }) {
  switch (id) {
    case 'hoodie':
      return (<>
        <path d="M20 45 L40 45 L42 72 L18 72 Z" fill="#7c5cff" />
        <path d="M20 45 L26 45 L24 72 L18 72 Z" fill="#5b45c2" />
        <path d="M27 45 L33 45 L33 52 L27 52 Z" fill="#ece7fb" />
        <Arms skin={skin} sleeve="#6a49e2" cuff="#4f3ab0" />
        <Legs />
      </>);
    case 'tracksuit':
      return (<>
        <path d="M20 45 L40 45 L42 72 L18 72 Z" fill="#2bb3a3" />
        <Arms skin={skin} sleeve="#219c8e" cuff="#17786d" />
        <path d="M22 45 L23.5 72 M38 45 L39.5 72" stroke="#ece7fb" strokeWidth="1.6" />
        <path d="M25 45 Q30 50 35 45" stroke="#1f8f82" strokeWidth="1.6" fill="none" />
        <Legs fill="#2bb3a3" shoes={<>
          <path d="M24.5 72 L24.5 90 M36.5 72 L36.5 90" stroke="#ece7fb" strokeWidth="1.2" />
          <path d="M22 89 L30 89 M32 89 L40 89" stroke="#ece7fb" strokeWidth="3" strokeLinecap="round" />
        </>} />
      </>);
    case 'leather':
      return (<>
        <path d="M20 45 L40 45 L42 72 L18 72 Z" fill="#3b3148" />
        <path d="M31 45 L36 45 L34 72 L31 72 Z" fill="#2a2236" />
        <path d="M22 45 L30 52 L38 45 L35 45 L30 49 L25 45 Z" fill="#544665" />
        <path d="M30.5 50 L30.5 71" stroke="#ffd166" strokeWidth="1" strokeLinecap="round" />
        <path d="M18 66 L42 66" stroke="#6e6080" strokeWidth="2.4" />
        <Arms skin={skin} sleeve="#4a3e5b" cuff="#615272" />
        <Legs fill="#2e2740" />
      </>);
    case 'tux':
      return (<>
        <path d="M20 45 L40 45 L42 72 L18 72 Z" fill="#2b2740" />
        <path d="M27 45 L33 45 L32.5 66 L27.5 66 Z" fill="#ece7fb" />
        <path d="M25 45 L30 53 L27 64 Z" fill="#3d3856" />
        <path d="M35 45 L30 53 L33 64 Z" fill="#3d3856" />
        <path d="M27 48 L30 50.5 L27 53 Z M33 48 L30 50.5 L33 53 Z" fill="#a8506a" />
        <Arms skin={skin} sleeve="#363150" cuff="#ece7fb" />
        <Legs fill="#2b2740" />
      </>);
    case 'skirt':
      return (<>
        <path d="M20 45 L40 45 L41 62 L19 62 Z" fill="#e8e3f2" />
        <path d="M27 45 L30 51 L33 45" fill="#cfc7e0" />
        <path d="M19 61 L41 61 L44 76 L16 76 Z" fill="#3f3564" />
        <Arms skin={skin} sleeve="#d8d2e8" sleeveTo={56} />
        <rect x="24" y="75" width="5" height="15" rx="2.5" fill={skin} />
        <rect x="32" y="75" width="5" height="15" rx="2.5" fill={skin} />
        <path d="M23 89 L30 89 M32 89 L39 89" stroke="#2e2740" strokeWidth="2.4" strokeLinecap="round" />
      </>);
    case 'coat':
      return (<>
        <path d="M19 45 L41 45 L44 82 L16 82 Z" fill="#6d5f4e" />
        <path d="M30 45 L41 45 L44 82 L30 82 Z" fill="#5d5142" />
        <path d="M23 45 L30 53 L37 45 L34 45 L30 49 L26 45 Z" fill="#8a7a63" />
        <path d="M16 64 L44 64" stroke="#3f372c" strokeWidth="3.4" />
        <rect x="28" y="62" width="5" height="4.6" rx="1" fill="#ffd166" />
        <Arms skin={skin} sleeve="#6d5f4e" cuff="#5d5142" />
        <Legs fill="#2e2740" />
      </>);
    case 'suit':
      return (<>
        <path d="M20 45 L40 45 L42 72 L18 72 Z" fill="#33436b" />
        <path d="M27 45 L33 45 L32.5 64 L27.5 64 Z" fill="#e8eef7" />
        <path d="M25 45 L30 53 L27 63 Z" fill="#3d4f7d" />
        <path d="M35 45 L30 53 L33 63 Z" fill="#3d4f7d" />
        <Arms skin={skin} sleeve="#3b4c76" cuff="#e8eef7" />
        <Legs fill="#33436b" />
      </>);
    case 'gown':
      return (<>
        <path d="M24 45 Q30 48 36 45 L37 58 Q46 68 48 92 L12 92 Q14 68 23 58 Z" fill="#2f6f8f" />
        <path d="M30 45 L36 45 L37 58 Q46 68 48 92 L30 92 Z" fill="#27607e" />
        <path d="M24 45 Q30 48 36 45 L36.6 53 Q30 56 23.4 53 Z" fill="#4f9dbd" />
        <path d="M26 44 L27.5 39 M34 44 L32.5 39" stroke="#2f6f8f" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M20 78 Q30 74 40 78" stroke="#4f9dbd" strokeWidth="1.4" fill="none" />
        <Arms skin={skin} />
      </>);
    case 'dress':
      return (<>
        <path d="M23 45 Q30 49 37 45 L45 72 L15 72 Z" fill="#e0345a" />
        <Arms skin={skin} />
        <path d="M23 45 Q30 49 37 45 L38 53 Q30 57 22 53 Z" fill="#c02348" />
        <path d="M25 44 L27 40 M35 44 L33 40" stroke="#e0345a" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="24" y="71" width="5" height="19" rx="2.5" fill={skin} />
        <rect x="32" y="71" width="5" height="19" rx="2.5" fill={skin} />
        <path d="M23 89 L30 89 M32 89 L39 89" stroke="#ffd166" strokeWidth="2.4" strokeLinecap="round" />
      </>);
    default: // tee — short sleeves, so most of the arm is bare
      return (<>
        <path d="M20 45 L40 45 L42 72 L18 72 Z" fill="#8d93b8" />
        <path d="M24 45 Q30 50 36 45" stroke="#767caa" strokeWidth="1.6" fill="none" />
        <Arms skin={skin} sleeve="#7d83a8" sleeveTo={54} />
        <Legs fill="#3d5a80" />
      </>);
  }
}

// Just the clothes, no person in them. A whole 40px figure told you nothing about
// which jacket you were looking at — this crops the viewBox to the torso and sleeves.
export function Garment({ id, skin = '#e5bb9a', size = 56, style }) {
  return (
    <svg viewBox="12 40 36 34" width={size} height={size * 0.94} style={{ display: 'block', ...style }} role="img" aria-label={id}>
      <Outfit id={id} skin={skin} />
    </svg>
  );
}

export function Avatar({ look, size = 40, title, style }) {
  const l = look || {};
  const age = l.age || 0;
  const band = ageBand(age);
  const b = proportions(age);
  const skin = l.sick ? mix(l.skin || '#e5bb9a', '#cfd8c6', 0.42) : (l.skin || '#e5bb9a');
  // A beard is not something a girl grows, and a baby has neither hair nor opinions.
  let hairId = band === 'baby' ? 'tuft' : (l.hair || 'cropped');
  if (hairId === 'beard' && l.gender !== 'male') hairId = 'bald';
  const hairColour = greyed(l.hairColor || '#241a2e', age);
  // however far the shoulders dropped, the head follows
  const drop = (GROUND - SHOULDER) * (1 - b.body);
  return (
    <svg viewBox="0 0 60 100" width={size * 0.6} height={size} style={{ display: 'block', overflow: 'visible', ...style }} role="img" aria-label={title || 'avatar'}>
      {title && <title>{title}</title>}
      <g transform={`translate(30 ${GROUND}) scale(${b.wide} ${b.body}) translate(-30 -${GROUND})`}>
        <Outfit id={l.outfit || 'tee'} skin={skin} />
        {/* the cane belongs in the hand, so it scales and stands with the body */}
        {band === 'elder' && <path d="M46.5 64 L46.5 92" stroke="#ffd166" strokeWidth="2.6" strokeLinecap="round" />}
      </g>
      <g transform={`translate(0 ${drop}) translate(30 26) scale(${b.head}) translate(-30 -26)`}>
        <circle cx="30" cy="26" r="17" fill={skin} />
        <Hair id={hairId} colour={hairColour} skin={skin} />
        <Face id={hairId} colour={l.hairColor || '#241a2e'} age={age} sick={!!l.sick} band={band}
          skin={skin} eyes={l.eyes} lips={l.lips} />
      </g>
    </svg>
  );
}
