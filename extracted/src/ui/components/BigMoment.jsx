import { useEffect } from 'react';
import { theme } from '../theme.js';
import { Avatar } from './Avatar.jsx';

// Some things should stop the game rather than scroll past in a list. Eviction, an
// inheritance, the street. One modal, a drawn scene, and a sound made in code —
// no asset files, because the whole game ships as a single html file.

function play(kind) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const notes = kind === 'good' ? [523.25, 659.25, 783.99] : [196, 146.83, 98];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = kind === 'good' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.16);
      gain.gain.setValueAtTime(0.0001, now + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(kind === 'good' ? 0.16 : 0.22, now + i * 0.16 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + (kind === 'good' ? 0.5 : 0.8));
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now + i * 0.16); osc.stop(now + i * 0.16 + 1);
    });
    setTimeout(() => { try { ctx.close(); } catch (e) {} }, 1600);
  } catch (e) { /* audio is a nicety, never a requirement */ }
}

function Scene({ id, look }) {
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

export function BigMoment({ moment, look, onClose }) {
  useEffect(() => { play(moment.kind === 'good' ? 'good' : 'bad'); }, [moment.id]);
  const accent = moment.kind === 'good' ? theme.gold : theme.bad;
  return (<div style={{ position: 'fixed', inset: 0, background: 'rgba(8,5,20,.96)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div style={{ maxWidth: 380, width: '100%', background: theme.panel, border: `1px solid ${accent}55`, borderRadius: 20, padding: '22px 20px 18px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.18em', textTransform: 'uppercase', color: accent, marginBottom: 14 }}>
        {moment.kind === 'good' ? 'Something came to you' : 'This is happening'}
      </div>
      <Scene id={moment.id} look={look} />
      <div style={{ fontSize: 21, fontWeight: 900, margin: '16px 0 8px' }}>{moment.title}</div>
      <div style={{ fontSize: 13.5, color: theme.muted, lineHeight: 1.6, marginBottom: 20 }}>{moment.body}</div>
      <button onClick={onClose} style={{ width: '100%', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 800, cursor: 'pointer',
        background: `linear-gradient(135deg,${theme.accent2},${theme.accent})`, color: '#fff' }}>
        {moment.kind === 'good' ? 'Take it in' : 'Face it'}
      </button>
    </div>
  </div>);
}
