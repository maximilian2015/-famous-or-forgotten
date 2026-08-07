import { ageBand } from '../../systems/life/appearance.js';

// Style 07 from the mockups: big head, real face, separable parts.
// Everything is drawn in a fixed 60x100 box. Hair, outfit and legs are their own
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

function Hair({ id, colour }) {
  const hi = lighten(colour, 0.24);
  switch (id) {
    case 'long':
      return (<>
        <path d="M12 24 Q30 2 48 24 L49 52 Q47 28 30 17 Q13 28 11 52 Z" fill={colour} />
        <path d="M14 21 Q22 9 32 9 L30 14 Q21 14 15 25 Z" fill={hi} />
      </>);
    case 'bob':
      return (<>
        <path d="M12 25 Q30 4 48 25 L48 41 L42 41 Q44 21 30 15 Q16 21 18 41 L12 41 Z" fill={colour} />
        <path d="M15 22 Q22 11 32 11 L30 15 Q21 15 16 26 Z" fill={hi} />
      </>);
    case 'mohawk':
      return (<>
        <path d="M14 24 Q30 13 46 24 L46 27 Q40 20 30 19 Q20 20 14 27 Z" fill={colour} />
        <path d="M21 18 L24 2 L28 13 L30.5 0 L33 12 L37 3 L40 18 Q31 12 21 18 Z" fill="#ff4db8" />
      </>);
    case 'bald':
      return <ellipse cx="24" cy="15" rx="6" ry="3.4" fill="#ffffff" opacity="0.28" />;
    case 'tuft': // babies get one curl and nothing else
      return <path d="M27 10 Q29 2 34 5 Q31 6 31.5 11 Z" fill={colour} />;
    default: // short
      return (<>
        <path d="M13 22 Q30 3 47 22 L47 27 Q42 15 30 13 Q18 15 13 27 Z" fill={colour} />
        <path d="M15 20 Q22 10 32 10 L30 14 Q21 14 15 24 Z" fill={hi} />
      </>);
  }
}

function Face({ id, colour, age, sick, band, skin }) {
  const old = age >= 60;
  const brow = greyed(colour, age);
  // Cheeks and lips are shifted from the skin itself. A fixed pink over a deep tone
  // turned the face tomato-red — the whole face has to move together.
  const blush = mix(skin, '#a8384f', 0.42);
  const lip = mix(skin, '#8e2f45', 0.62);
  const pallor = mix(skin, '#7f9c86', 0.45);
  return (<>
    {id !== 'bald' && (<>
      <path d="M19 21 Q24 18.6 28 20.4" stroke={brow} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M32 20.4 Q36 18.6 41 21" stroke={brow} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>)}
    {old ? (<>
      <path d="M20 26.4 Q24 24.4 28 26.4" stroke="#1a1420" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M33 26.4 Q37 24.4 41 26.4" stroke="#1a1420" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M18.5 31 Q20.5 33 18.5 35 M42.5 31 Q40.5 33 42.5 35" stroke={mix(skin, '#000000', 0.3)} strokeWidth="0.9" fill="none" />
    </>) : (<>
      <ellipse cx="24" cy="26" rx="3.2" ry="3.6" fill="#fff" />
      <ellipse cx="37" cy="26" rx="3.2" ry="3.6" fill="#fff" />
      <circle cx="24" cy="26.5" r="1.8" fill="#5b3a22" />
      <circle cx="37" cy="26.5" r="1.8" fill="#5b3a22" />
      <circle cx="23.4" cy="25.7" r="0.6" fill="#fff" />
      <circle cx="36.4" cy="25.7" r="0.6" fill="#fff" />
    </>)}
    <path d="M29 30 L28 33 Q29.5 34 31 33" stroke={mix(skin, '#000000', 0.22)} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    {id === 'bald' && (<>
      <path d="M14 27 Q15 47 30 47 Q45 47 46 27 Q42 41 30 41 Q18 41 14 27 Z" fill={greyed(colour, age)} />
      <path d="M24 34.5 Q30 32.5 36 34.5 Q30 37 24 37 Z" fill={greyed(colour, age)} />
    </>)}
    {sick
      ? <path d="M26 39 Q30 36.5 34 39" stroke={lip} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      : old
        ? <path d="M27 39.5 Q30 38.6 33 39.5" stroke={lip} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        : <path d={id === 'bald' ? 'M27 38.5 Q30 37.8 33 38.5 Q30 40.5 27 38.5 Z' : 'M26 37 Q30 36 34 37 Q30 40.5 26 37 Z'} fill={lip} />}
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

// Nothing here may be as dark as the app background (#150f2c) or the figure turns
// into a floating head — the exact bug the first avatar round shipped with.
const DARK_LEG = '#332748';
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
        <Legs />
      </>);
    case 'tracksuit':
      return (<>
        <path d="M20 45 L40 45 L42 72 L18 72 Z" fill="#2bb3a3" />
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
        <Legs fill="#2e2740" />
      </>);
    case 'tux':
      return (<>
        <path d="M20 45 L40 45 L42 72 L18 72 Z" fill="#2b2740" />
        <path d="M27 45 L33 45 L32.5 66 L27.5 66 Z" fill="#ece7fb" />
        <path d="M25 45 L30 53 L27 64 Z" fill="#3d3856" />
        <path d="M35 45 L30 53 L33 64 Z" fill="#3d3856" />
        <path d="M27 48 L30 50.5 L27 53 Z M33 48 L30 50.5 L33 53 Z" fill="#a8506a" />
        <Legs fill="#2b2740" />
      </>);
    case 'dress':
      return (<>
        <path d="M23 45 Q30 49 37 45 L45 72 L15 72 Z" fill="#e0345a" />
        <path d="M23 45 Q30 49 37 45 L38 53 Q30 57 22 53 Z" fill="#c02348" />
        <path d="M25 44 L27 40 M35 44 L33 40" stroke="#e0345a" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="24" y="71" width="5" height="19" rx="2.5" fill={skin} />
        <rect x="32" y="71" width="5" height="19" rx="2.5" fill={skin} />
        <path d="M23 89 L30 89 M32 89 L39 89" stroke="#ffd166" strokeWidth="2.4" strokeLinecap="round" />
      </>);
    default: // tee
      return (<>
        <path d="M20 45 L40 45 L42 72 L18 72 Z" fill="#8d93b8" />
        <path d="M24 45 Q30 50 36 45" stroke="#767caa" strokeWidth="1.6" fill="none" />
        <Legs fill="#3d5a80" />
      </>);
  }
}

export function Avatar({ look, size = 40, title, style }) {
  const l = look || {};
  const age = l.age || 0;
  const band = ageBand(age);
  const b = proportions(age);
  const skin = l.sick ? mix(l.skin || '#e3b48a', '#cfd8c6', 0.42) : (l.skin || '#e3b48a');
  const hairId = band === 'baby' ? 'tuft' : (l.hair || 'short');
  const hairColour = greyed(l.hairColor || '#241a2e', age);
  // however far the shoulders dropped, the head follows
  const drop = (GROUND - SHOULDER) * (1 - b.body);
  return (
    <svg viewBox="0 0 60 100" width={size * 0.6} height={size} style={{ display: 'block', overflow: 'visible', ...style }} role="img" aria-label={title || 'avatar'}>
      {title && <title>{title}</title>}
      {band === 'elder' && <path d="M47 58 L47 92" stroke="#ffd166" strokeWidth="2.4" strokeLinecap="round" />}
      <g transform={`translate(30 ${GROUND}) scale(${b.wide} ${b.body}) translate(-30 -${GROUND})`}>
        <Outfit id={l.outfit || 'tee'} skin={skin} />
      </g>
      <g transform={`translate(0 ${drop}) translate(30 26) scale(${b.head}) translate(-30 -26)`}>
        <circle cx="30" cy="26" r="17" fill={skin} />
        <Hair id={hairId} colour={hairColour} />
        <Face id={hairId} colour={l.hairColor || '#241a2e'} age={age} sick={!!l.sick} band={band} skin={skin} />
      </g>
    </svg>
  );
}
