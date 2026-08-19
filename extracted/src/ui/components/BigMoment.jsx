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

const HEAD = { premiere: 'Opening night' };
const CTA = { premiere: 'Read the reviews' };

export function BigMoment({ moment, look, onClose }) {
  const good = moment.kind === 'good';
  useEffect(() => {
    play(moment.id === 'premiere' ? (good ? 'fanfare' : 'flop') : good ? 'good' : 'bad');
  }, [moment.id]);
  const accent = good ? theme.gold : theme.bad;
  // This renders OUTSIDE the app shell, so it has to state its own text colour and font —
  // otherwise the title comes out near-black on a near-black panel.
  return (<div style={{ position: 'fixed', inset: 0, background: 'rgba(8,5,20,.96)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    color: theme.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
    <div style={{ maxWidth: 380, width: '100%', background: theme.panel, border: `1px solid ${accent}55`, borderRadius: 20, padding: '22px 20px 18px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.18em', textTransform: 'uppercase', color: accent, marginBottom: 14 }}>
        {HEAD[moment.id] || (good ? 'Something came to you' : 'This is happening')}
      </div>
      <Scene id={moment.id} look={look} accent={accent} moment={moment} />
      <div style={{ fontSize: 21, fontWeight: 900, margin: '16px 0 8px' }}>{moment.title}</div>
      {moment.id === 'premiere' && (
        <div style={{ display: 'flex', gap: 8, margin: '0 0 12px' }}>
          <Figure label="Score" value={`${moment.score}/10`} accent={accent} />
          <Figure label={moment.money.includes('watching') ? 'Audience' : 'Box office'} value={moment.money.replace(' at the box office', '').replace(' watching', '')} accent={accent} />
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
