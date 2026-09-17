import { useEffect, useState, useRef } from 'react';
import { theme } from '../theme.js';

// The back stairs, in the dark. Six doors light up one after another; you go through
// them in the same order. One wrong door is security. The third of the three doors
// — see systems/social/events.js.
const DOORS = 6;
export function StairsGame({ length = 5, onResult }) {
  const [seq] = useState(() => { const out = []; for (let i = 0; i < length; i++) { let d; do { d = Math.floor(Math.random() * DOORS); } while (d === out[out.length - 1]); out.push(d); } return out; });
  const [lit, setLit] = useState(-1);
  const [phase, setPhase] = useState('watch');   // watch → repeat → done
  const [at, setAt] = useState(0);
  const timers = useRef([]);
  useEffect(() => {
    let t = 500;
    seq.forEach((d, i) => {
      timers.current.push(setTimeout(() => setLit(d), t));
      timers.current.push(setTimeout(() => setLit(-1), t + 420));
      t += 640;
    });
    timers.current.push(setTimeout(() => setPhase('repeat'), t + 100));
    return () => timers.current.forEach(clearTimeout);
  }, []);
  function tap(d) {
    if (phase !== 'repeat') return;
    setLit(d); setTimeout(() => setLit(-1), 160);
    if (d !== seq[at]) { setPhase('done'); onResult(false); return; }
    if (at + 1 >= seq.length) { setPhase('done'); onResult(true); return; }
    setAt(at + 1);
  }
  return (<div>
    <div style={{ fontSize: 11.5, color: theme.gold, textAlign: 'center', marginBottom: 8, lineHeight: 1.45 }}>
      {phase === 'watch' ? 'Watch the doors light up.' : phase === 'repeat' ? `Now go through them in the same order — ${seq.length - at} to go.` : ''}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {Array.from({ length: DOORS }, (_, d) => (
        <button key={d} onClick={() => tap(d)} disabled={phase !== 'repeat'} style={{ height: 54, borderRadius: 10, border: `1px solid ${lit === d ? theme.gold : theme.line}`, cursor: phase === 'repeat' ? 'pointer' : 'default',
          background: lit === d ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : theme.panel, color: lit === d ? '#fff' : theme.muted, fontSize: 18, fontWeight: 900, transition: 'background .12s' }}>🚪</button>))}
    </div>
  </div>);
}
