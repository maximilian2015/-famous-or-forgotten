import { useEffect } from 'react';
import { theme } from '../theme.js';
import { Avatar } from './Avatar.jsx';

// Some things should stop the game rather than scroll past in a list. Eviction, an
// inheritance, the street. One modal, a drawn scene, and a sound made in code —
// no asset files, because the whole game ships as a single html file.

// Three cues. A premiere gets its own — it is the loudest night in the game and a
// three-note ding does not carry it.
const CUES = {
  good:     { notes: [523.25, 659.25, 783.99], type: 'sine', gain: 0.16, gap: 0.16, tail: 0.5 },
  bad:      { notes: [196, 146.83, 98], type: 'triangle', gain: 0.22, gap: 0.16, tail: 0.8 },
  fanfare:  { notes: [392, 523.25, 659.25, 783.99, 1046.5], type: 'sine', gain: 0.15, gap: 0.13, tail: 0.75 },
  flop:     { notes: [261.63, 220, 174.61, 116.54], type: 'triangle', gain: 0.2, gap: 0.19, tail: 1.0 },
  // The morning the list is read out: bright, quick, unresolved — it has not happened yet.
  nominated: { notes: [659.25, 880, 987.77, 1318.5], type: 'sine', gain: 0.13, gap: 0.10, tail: 0.45 },
  // The envelope. Slow, wide, and it lands on the octave — this one is finished.
  asker:    { notes: [392, 587.33, 783.99, 987.77, 1174.7, 1568], type: 'sine', gain: 0.17, gap: 0.155, tail: 1.1 },
  // Somebody else's name. Two chords that resolve politely and go nowhere.
  applause: { notes: [349.23, 329.63, 293.66], type: 'triangle', gain: 0.15, gap: 0.28, tail: 1.2 },
};
function play(kind) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const cue = CUES[kind] || CUES.good;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    cue.notes.forEach((f, i) => {
      const at = now + i * cue.gap;
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = cue.type;
      osc.frequency.setValueAtTime(f, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(cue.gain, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + cue.tail);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(at); osc.stop(at + cue.tail + 0.4);
    });
    setTimeout(() => { try { ctx.close(); } catch (e) {} }, 2400);
  } catch (e) { /* audio is a nicety, never a requirement */ }
}

function Scene({ id, look, accent, moment }) {
  // Opening night: searchlights, a lit marquee, and the score up where the title goes,
  // because on the night that number IS the title.
  if (id === 'premiere') {
    const bulbs = [];
    for (let i = 0; i < 11; i++) bulbs.push(<circle key={i} cx={44 + i * 11.2} cy={40 + Math.abs(i - 5) * 1.4} r="2.1" fill={accent} opacity={0.45 + (i % 2) * 0.45} />);
    return (<svg viewBox="0 0 200 120" style={{ width: '100%', maxWidth: 300, display: 'block', margin: '0 auto' }}>
      <defs>
        <radialGradient id="pglow" cx="50%" cy="26%" r="62%">
          <stop offset="0" stopColor={accent} stopOpacity=".26" /><stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="200" height="120" fill="url(#pglow)" />
      <g opacity=".16">
        <path d="M18 118 L50 12 L62 16 Z" fill="#ffd166" />
        <path d="M182 118 L150 12 L138 16 Z" fill="#ffd166" />
      </g>
      <rect x="34" y="30" width="132" height="80" rx="4" fill="#241e4a" stroke="#4a3f7a" strokeWidth="2" />
      <path d="M26 52 L44 36 L156 36 L174 52 Z" fill="#332b62" stroke="#5c4f92" strokeWidth="2" />
      {bulbs}
      <rect x="52" y="56" width="96" height="34" rx="3" fill="#1d1838" stroke={accent} strokeWidth="1.6" />
      <text x="100" y="76" textAnchor="middle" fontSize="19" fontWeight="900" fill={accent}>{moment.score}</text>
      <text x="100" y="86" textAnchor="middle" fontSize="7" fontWeight="800" fill="#9c8fd4" letterSpacing="1.8">
        {String(moment.verdict || '').toUpperCase()}
      </text>
      <rect x="86" y="96" width="28" height="14" rx="1.5" fill="#2c2558" stroke="#6b5cb0" strokeWidth="1.3" />
      <path d="M100 96 L100 110" stroke="#6b5cb0" strokeWidth="1.1" />
      <path d="M70 110 L130 110 L122 120 L78 120 Z" fill="#8a3459" opacity=".8" />
    </svg>);
  }
  // Awards night. A statuette on a lit plinth, and a room of seats facing it.
  if (id === 'nomination' || id === 'ceremony') {
    const won = moment.kind === 'good' && id === 'ceremony';
    return (<svg viewBox="0 0 200 120" style={{ width: '100%', maxWidth: 300, display: 'block', margin: '0 auto' }}>
      <defs>
        <radialGradient id="aglow" cx="50%" cy="42%" r="55%">
          <stop offset="0" stopColor={accent} stopOpacity=".30" /><stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="200" height="120" fill="url(#aglow)" />
      {/* rows of seats, facing away */}
      <g opacity=".4">
        {[0, 1, 2].map((r) => [0, 1, 2, 3, 4, 5, 6, 7].map((c) => (
          <rect key={`${r}-${c}`} x={14 + c * 23 + r * 4} y={92 + r * 9} width="15" height="7" rx="2.5"
            fill="#2c2558" stroke="#463c78" strokeWidth="1" />
        )))}
      </g>
      {/* plinth */}
      <path d="M78 92 L122 92 L116 78 L84 78 Z" fill="#2e2758" stroke="#5c4f92" strokeWidth="1.6" />
      {/* the statuette */}
      <g transform="translate(100 40)">
        <circle cx="0" cy="0" r="7.5" fill={accent} opacity={won ? 1 : 0.75} />
        <path d="M-6 8 L6 8 L4.5 30 L-4.5 30 Z" fill={accent} opacity={won ? 1 : 0.75} />
        <path d="M-6 9 L-12 22 M6 9 L12 22" stroke={accent} strokeWidth="2.6" strokeLinecap="round" opacity={won ? 1 : 0.75} />
        <path d="M-9 30 L9 30 L9 36 L-9 36 Z" fill="#3a3068" stroke={accent} strokeWidth="1.4" />
      </g>
      {/* spill of light down the plinth */}
      <path d="M86 78 L114 78 L124 92 L76 92 Z" fill={accent} opacity=".08" />
      {id === 'nomination' && (
        <text x="100" y="112" textAnchor="middle" fontSize="7" fontWeight="800" fill="#9c8fd4" letterSpacing="2">
          {moment.count > 1 ? `${moment.count} NOMINATIONS` : 'NOMINATED'}
        </text>
      )}
    </svg>);
  }
  // The body said no. An unmade bed and a phone face-down beside it.
  if (id === 'burnout') {
    return (<svg viewBox="0 0 200 120" style={{ width: '100%', maxWidth: 300, display: 'block', margin: '0 auto' }}>
      <path d="M20 108 L180 108" stroke="#3a3160" strokeWidth="3" strokeLinecap="round" />
      <rect x="34" y="72" width="132" height="36" rx="5" fill="#241e4a" stroke="#4a3f7a" strokeWidth="2" />
      <path d="M40 72 Q54 56 76 62 Q104 70 132 60 Q152 54 160 72 Z" fill="#2e2758" stroke="#4a3f7a" strokeWidth="1.5" />
      <rect x="44" y="56" width="34" height="18" rx="6" fill="#332b62" stroke="#5c4f92" strokeWidth="1.5" />
      <rect x="34" y="66" width="132" height="6" rx="3" fill="#3a3068" />
      {/* the phone, face down */}
      <rect x="132" y="96" width="22" height="11" rx="2" fill="#1d1838" stroke={accent} strokeWidth="1.3" opacity=".8" />
      {/* one window, curtains shut, daylight outside */}
      <rect x="146" y="16" width="34" height="34" rx="3" fill="#2a2352" stroke="#4a3f7a" strokeWidth="1.6" />
      <path d="M146 16 L163 16 L163 50 L146 50 Z M180 16 L163 16 L163 50 L180 50 Z" fill="#332b62" opacity=".85" />
      <circle cx="163" cy="33" r="3" fill={accent} opacity=".18" />
      <text x="86" y="34" textAnchor="middle" fontSize="8" fontWeight="800" fill="#8d80c0" letterSpacing="2.2">SIGNED OFF</text>
      <text x="86" y="47" textAnchor="middle" fontSize="15" fontWeight="900" fill={accent}>{moment.months} months</text>
    </svg>);
  }
  // The money walked. An empty stage, a light left on, and the set half struck.
  if (id === 'shutdown') {
    return (<svg viewBox="0 0 200 120" style={{ width: '100%', maxWidth: 300, display: 'block', margin: '0 auto' }}>
      <path d="M14 110 L186 110" stroke="#3a3160" strokeWidth="3" strokeLinecap="round" />
      <rect x="26" y="24" width="148" height="86" rx="4" fill="#1f1942" stroke="#3a3160" strokeWidth="2" />
      <g opacity=".35">
        <path d="M44 110 L44 46 L60 38 L60 110 Z" fill="#2e2758" stroke="#4a3f7a" strokeWidth="1.4" />
        <path d="M140 110 L140 52 L156 44 L156 110 Z" fill="#2e2758" stroke="#4a3f7a" strokeWidth="1.4" />
      </g>
      <g transform="translate(100 30)">
        <path d="M-9 0 L9 0 L6 13 L-6 13 Z" fill="#2e2758" stroke={accent} strokeWidth="1.6" />
        <path d="M0 -10 L0 0" stroke="#4a3f7a" strokeWidth="1.6" />
        <path d="M-14 24 A16 16 0 0 1 14 24 Z" fill={accent} opacity=".13" />
        <circle cx="0" cy="12" r="3" fill={accent} opacity=".7" />
      </g>
      {/* a clapperboard face down on the floor — the shot nobody called */}
      <g transform="translate(84 92) rotate(-9)">
        <rect x="0" y="0" width="34" height="20" rx="2" fill="#2a2352" stroke="#5c4f92" strokeWidth="1.5" />
        <path d="M0 6 L34 6" stroke="#5c4f92" strokeWidth="1.2" />
        <path d="M6 0 L3 6 M14 0 L11 6 M22 0 L19 6 M30 0 L27 6" stroke="#5c4f92" strokeWidth="1.2" />
      </g>
      <g opacity=".55">
        <rect x="34" y="76" width="16" height="34" rx="2" fill="#241e4a" stroke="#4a3f7a" strokeWidth="1.3" />
        <rect x="150" y="82" width="16" height="28" rx="2" fill="#241e4a" stroke="#4a3f7a" strokeWidth="1.3" />
      </g>
      <text x="100" y="66" textAnchor="middle" fontSize="8" fontWeight="800" fill="#8d80c0" letterSpacing="2.4">
        {moment.frozen ? 'ON HOLD' : 'STRUCK'}
      </text>
    </svg>);
  }
  if (id === 'inheritance') {
    return (<svg viewBox="0 0 200 120" style={{ width: '100%', maxWidth: 300, display: 'block', margin: '0 auto' }}>
      <rect x="46" y="44" width="108" height="66" rx="4" fill="#2b2450" stroke="#4a3f7a" strokeWidth="2" />
      <path d="M40 46 L100 14 L160 46 Z" fill="#3a3068" stroke="#5c4f92" strokeWidth="2" />
      <rect x="88" y="76" width="24" height="34" rx="2" fill="#1d1838" stroke="#6b5cb0" strokeWidth="1.5" />
      <circle cx="106" cy="94" r="1.8" fill={theme.gold} />
      <rect x="58" y="58" width="20" height="18" rx="2" fill="#ffd166" opacity=".22" stroke="#6b5cb0" strokeWidth="1.2" />
      <rect x="122" y="58" width="20" height="18" rx="2" fill="#ffd166" opacity=".22" stroke="#6b5cb0" strokeWidth="1.2" />
      <g transform="translate(150 26)">
        <circle cx="0" cy="0" r="7" fill="none" stroke={theme.gold} strokeWidth="2.4" />
        <path d="M0 7 L0 22 M0 14 L6 14 M0 18 L5 18" stroke={theme.gold} strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </svg>);
  }
  // evicted / street
  return (<svg viewBox="0 0 200 120" style={{ width: '100%', maxWidth: 300, display: 'block', margin: '0 auto' }}>
    <path d="M16 110 L184 110" stroke="#3a3160" strokeWidth="3" strokeLinecap="round" />
    <g opacity=".55">
      <rect x="18" y="30" width="52" height="80" rx="3" fill="#221c44" stroke="#3a3160" strokeWidth="2" />
      <rect x="28" y="42" width="14" height="14" fill="#2e2758" /><rect x="48" y="42" width="14" height="14" fill="#2e2758" />
      <rect x="28" y="64" width="14" height="14" fill="#2e2758" /><rect x="48" y="64" width="14" height="14" fill="#2e2758" />
      <rect x="36" y="88" width="18" height="22" rx="2" fill="#191536" stroke="#4a3f7a" strokeWidth="1.5" />
      <circle cx="50" cy="99" r="2" fill={theme.bad} />
    </g>
    <g transform="translate(150 22)">
      <path d="M0 0 L0 88" stroke="#4a3f7a" strokeWidth="3" strokeLinecap="round" />
      <circle cx="0" cy="0" r="6" fill="#ffd166" opacity=".9" />
      <path d="M-26 0 A26 26 0 0 1 26 0 Z" fill="#ffd166" opacity=".1" />
    </g>
    <g transform="translate(88 46) scale(0.62)">
      <Avatar look={look} size={100} />
    </g>
    <rect x="112" y="94" width="22" height="16" rx="2" fill="#3a3160" stroke="#5c4f92" strokeWidth="1.5" />
    <path d="M119 94 L119 90 L127 90 L127 94" stroke="#5c4f92" strokeWidth="1.5" fill="none" />
  </svg>);
}

const CTA = { premiere: 'Read the reviews', shutdown: 'Go home', nomination: 'Let it sink in', ceremony: 'Take the night', burnout: 'Sleep' };
function headFor(m) {
  if (m.id === 'burnout') return 'You could not get up';
  if (m.id === 'premiere') return 'Opening night';
  if (m.id === 'shutdown') return m.frozen ? 'The shoot has stopped' : 'The project is dead';
  if (m.id === 'nomination') return 'The Askers';
  if (m.id === 'ceremony') return m.kind === 'good' ? 'And the Asker goes to' : 'And the Asker goes to';
  return m.kind === 'good' ? 'Something came to you' : 'This is happening';
}

export function BigMoment({ moment, look, onClose }) {
  const good = moment.kind === 'good';
  useEffect(() => {
    const cue = moment.id === 'premiere' ? (good ? 'fanfare' : 'flop')
      : moment.id === 'nomination' ? 'nominated'
      : moment.id === 'ceremony' ? (good ? 'asker' : 'applause')
      : good ? 'good' : 'bad';
    play(cue);
  }, [moment.id]);
  const accent = good ? theme.gold : theme.bad;
  // This renders OUTSIDE the app shell, so it has to state its own text colour and font —
  // otherwise the title comes out near-black on a near-black panel.
  return (<div style={{ position: 'fixed', inset: 0, background: 'rgba(8,5,20,.96)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    color: theme.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
    <div style={{ maxWidth: 380, width: '100%', background: theme.panel, border: `1px solid ${accent}55`, borderRadius: 20, padding: '22px 20px 18px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.18em', textTransform: 'uppercase', color: accent, marginBottom: 14 }}>
        {headFor(moment)}
      </div>
      <Scene id={moment.id} look={look} accent={accent} moment={moment} />
      <div style={{ fontSize: 21, fontWeight: 900, margin: '16px 0 8px' }}>{moment.title}</div>
      {moment.id === 'premiere' && (
        <div style={{ display: 'flex', gap: 8, margin: '0 0 12px' }}>
          <Figure label="Score" value={`${moment.score}/10`} accent={accent} />
          <Figure label={moment.money.includes('watching') ? 'Audience' : 'Box office'} value={moment.money.replace(' at the box office', '').replace(' watching', '')} accent={accent} />
        </div>
      )}
      {(moment.id === 'nomination' || moment.id === 'ceremony') && moment.lines && (
        <div style={{ margin: '0 0 12px', textAlign: 'left' }}>
          {moment.lines.map((l, i) => (
            <div key={i} style={{ fontSize: 11.5, color: theme.muted, padding: '6px 10px', borderRadius: 8,
              background: '#1d1838', border: '1px solid #332b60', marginBottom: 5, whiteSpace: 'pre-line', lineHeight: 1.5 }}>{l}</div>
          ))}
        </div>
      )}
      {moment.id === 'shutdown' && (
        <div style={{ display: 'flex', gap: 8, margin: '0 0 12px' }}>
          <Figure label="Kept" value={`€${Math.round(moment.paid || 0).toLocaleString()}`} accent={accent} />
          <Figure label={moment.frozen ? 'Still to shoot' : 'Months gone'} value={`${moment.months} mo`} accent={accent} />
        </div>
      )}
      <div style={{ fontSize: 13.5, color: theme.muted, lineHeight: 1.6, marginBottom: 20 }}>{moment.body}</div>
      <button onClick={onClose} style={{ width: '100%', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 800, cursor: 'pointer',
        background: `linear-gradient(135deg,${theme.accent2},${theme.accent})`, color: '#fff' }}>
        {CTA[moment.id] || (good ? 'Take it in' : 'Face it')}
      </button>
    </div>
  </div>);
}

function Figure({ label, value, accent }) {
  return (<div style={{ flex: 1, background: '#1d1838', border: '1px solid #332b60', borderRadius: 12, padding: '9px 6px' }}>
    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: theme.muted }}>{label}</div>
    <div style={{ fontSize: 16, fontWeight: 900, color: accent, marginTop: 2 }}>{value}</div>
  </div>);
}
