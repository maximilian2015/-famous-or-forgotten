import { useState, useRef, useEffect } from 'react';
import { theme } from '../../ui/theme.js';
import { dispatch, getState } from '../../state/store.js';

// A tiny flappy-style tap game. Playing it relieves stress (mental).
export function ArcadeGame({ g }) {
  const [y, setY] = useState(120);
  const [vy, setVy] = useState(0);
  const [pipes, setPipes] = useState([{ x: 300, gap: 110 }]);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(g.arcadeBest || 0);
  const [running, setRunning] = useState(false);
  const [dead, setDead] = useState(false);
  const raf = useRef(null);
  const st = useRef({ y: 120, vy: 0, pipes: [{ x: 300, gap: 110 }], score: 0 });

  const W = 300, H = 260, BIRD = 22, PIPE_W = 44;

  function reset() { st.current = { y: 120, vy: 0, pipes: [{ x: 300, gap: 110 }], score: 0 }; setY(120); setVy(0); setPipes([{ x: 300, gap: 110 }]); setScore(0); setDead(false); setRunning(true); }
  function flap() { if (dead) { reset(); return; } if (!running) { setRunning(true); } st.current.vy = -4.2; }

  useEffect(() => {
    if (!running) return;
    function tick() {
      const s = st.current;
      s.vy += 0.28; s.y += s.vy;
      s.pipes = s.pipes.map((p) => ({ ...p, x: p.x - 2.2 }));
      if (s.pipes[s.pipes.length - 1].x < 150) s.pipes.push({ x: W + 20, gap: 60 + Math.random() * 120 });
      s.pipes = s.pipes.filter((p) => p.x > -PIPE_W);
      // scoring + collision
      for (const p of s.pipes) {
        if (!p.passed && p.x + PIPE_W < 40) { p.passed = true; s.score += 1; }
        const inX = 40 + BIRD > p.x && 40 < p.x + PIPE_W;
        const hit = inX && (s.y < p.gap - 55 || s.y + BIRD > p.gap + 55);
        if (hit) return die(s.score);
      }
      if (s.y < 0 || s.y + BIRD > H) return die(s.score);
      setY(s.y); setPipes([...s.pipes]); setScore(s.score);
      raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [running]);

  function die(finalScore) {
    cancelAnimationFrame(raf.current); setRunning(false); setDead(true);
    if (finalScore > best) { setBest(finalScore);
      // reward mental for a good run, persist best — spends no AP, it's downtime
      dispatch((state) => { state.arcadeBest = finalScore; state.mental = Math.min(100, (state.mental || 50) + Math.min(6, Math.ceil(finalScore / 2))); return state; });
    } else if (finalScore > 0) {
      dispatch((state) => { state.mental = Math.min(100, (state.mental || 50) + 1); return state; });
    }
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: theme.muted, marginBottom: 8 }}>Tap to fly. Dodge the pipes. A good run clears your head.</div>
      <div onClick={flap} style={{ position: 'relative', width: W, height: H, margin: '0 auto', background: 'linear-gradient(180deg,#1a2a4a,#0f1830)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${theme.line}` }}>
        {/* bird */}
        <div style={{ position: 'absolute', left: 40, top: y, width: BIRD, height: BIRD, borderRadius: '50%', background: theme.gold, boxShadow: '0 0 8px rgba(255,209,102,.6)' }} />
        {/* pipes */}
        {pipes.map((p, i) => (
          <div key={i}>
            <div style={{ position: 'absolute', left: p.x, top: 0, width: PIPE_W, height: p.gap - 55, background: theme.accent2, borderRadius: '0 0 6px 6px', opacity: .85 }} />
            <div style={{ position: 'absolute', left: p.x, top: p.gap + 55, width: PIPE_W, bottom: 0, background: theme.accent2, borderRadius: '6px 6px 0 0', opacity: .85 }} />
          </div>
        ))}
        {/* overlays */}
        {!running && !dead && <Overlay title="Spotlight Bird" sub="Tap to start" />}
        {dead && <Overlay title={`Score: ${score}`} sub="Tap to play again" />}
        <div style={{ position: 'absolute', top: 8, right: 10, fontSize: 18, fontWeight: 900, color: '#fff', textShadow: '0 1px 3px #000' }}>{score}</div>
      </div>
      <div style={{ fontSize: 12, color: theme.muted, marginTop: 8 }}>Best: <span style={{ color: theme.gold, fontWeight: 800 }}>{best}</span></div>
    </div>
  );
}
function Overlay({ title, sub }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,12,26,.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{title}</div>
      <div style={{ fontSize: 13, color: '#cfc6ee' }}>{sub}</div>
    </div>
  );
}
