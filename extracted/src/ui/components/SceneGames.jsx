// The games a day on set is made of. Four mechanics here, plus the two that already
// existed (TimingBar, GridRisk) — six in all, skinned by the scene and scaled by how hard
// the day is. Each returns one number, 0..100, and systems/career/scenes.js decides what
// that was worth.
//
// They are built to be played on a phone with one thumb: big targets, no precision beyond
// what a finger can do, and every one of them readable in the first second.
import { useState, useEffect, useRef } from 'react';
import { theme } from '../theme.js';
import { play } from '../sfx.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const raf = (cb) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : setTimeout(() => cb(Date.now()), 16));
const unraf = (h) => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(h) : clearTimeout(h));

const box = { background: theme.bg, border: `1px solid ${theme.line}`, borderRadius: 12, padding: 12 };
const bigBtn = (col) => ({ width: '100%', border: 'none', borderRadius: 12, padding: '15px 12px', fontSize: 15, fontWeight: 900, cursor: 'pointer', background: col || `linear-gradient(135deg,${theme.accent2},${theme.accent})`, color: '#fff' });

// ── the monologue: tap each line as it lands ────────────────────────────────────
// Eight beats at a steady tempo. Early is a rush, late is a drag, and the score is how
// close to the beat you were, not how fast.
export function RhythmLine({ difficulty = 1, lines, onResult }) {
  const L = lines && lines.length ? lines : ['I was there.', 'You were not.', 'Say it again.', 'No — slower.', 'That is the part you left out.', 'I am not asking.', 'Look at me.', 'Now say it.'];
  const gap = Math.max(620, 1000 - difficulty * 180);
  const tol = Math.max(110, 260 - difficulty * 60);
  const [i, setI] = useState(-1);
  const [hits, setHits] = useState([]);
  const at = useRef(0); const done = useRef(false);
  useEffect(() => {
    let n = -1; let timer = null;
    const step = () => {
      n += 1;
      if (n >= L.length) { done.current = true; setTimeout(() => finish(), 420); return; }
      at.current = performance.now(); setI(n); play('tap');
      timer = setTimeout(step, gap);
    };
    timer = setTimeout(step, 700);
    return () => clearTimeout(timer);
    function finish() {
      setHits((h) => { const score = h.length ? clamp(Math.round(h.reduce((a, b) => a + b, 0) / L.length)) : 0; onResult(score); return h; });
    }
  }, []);
  const tap = () => {
    if (done.current || i < 0) return;
    const off = Math.abs(performance.now() - at.current);
    const v = off <= tol * 0.35 ? 100 : off <= tol ? 100 - ((off - tol * 0.35) / (tol * 0.65)) * 55 : Math.max(0, 45 - (off - tol) / 8);
    play(v >= 70 ? 'good' : 'denied');
    setHits((h) => [...h, v]);
  };
  return (<div style={box}>
    <div style={{ minHeight: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: i >= 0 ? theme.text : theme.muted, transition: 'opacity .12s' }}>{i >= 0 ? L[i] : 'and… action'}</div>
    </div>
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', margin: '8px 0 10px' }}>
      {L.map((_, k) => (<div key={k} style={{ width: 9, height: 9, borderRadius: 5, background: k < hits.length ? (hits[k] >= 70 ? theme.good : hits[k] >= 40 ? theme.gold : theme.bad) : k === i ? theme.accent : 'rgba(255,255,255,.14)' }} />))}
    </div>
    <button onClick={tap} data-sfx="none" style={bigBtn()}>Say it</button>
  </div>);
}

// ── crying on cue: hold the marker in the light ────────────────────────────────
// A wobbling dot you steer by holding. Let go and it falls. Score is time inside the band.
export function HoldZone({ difficulty = 1, seconds = 6, onResult }) {
  const [v, setV] = useState(20);
  const [t, setT] = useState(0);
  const held = useRef(false); const inZone = useRef(0); const pos = useRef(20); const vel = useRef(0);
  const lo = 46, hi = 74;
  useEffect(() => {
    let last = performance.now(); let h = 0; let run = true;
    const tick = (now) => {
      if (!run) return;
      const dt = Math.min(64, now - last) / 1000; last = now;
      const drift = (Math.sin(now / 420) + Math.sin(now / 173)) * 3.4 * difficulty;
      vel.current += (held.current ? 52 : -46) * dt + drift * dt;
      vel.current *= 0.9;
      pos.current = clamp(pos.current + vel.current * dt * 2.6);
      if (pos.current >= lo && pos.current <= hi) inZone.current += dt;
      setV(pos.current);
      const el = (performance.now() - start) / 1000;
      setT(el);
      if (el >= seconds) { run = false; onResult(clamp(Math.round((inZone.current / (seconds * 0.82)) * 100))); return; }
      h = raf(tick);
    };
    const start = performance.now();
    h = raf(tick);
    return () => { run = false; unraf(h); };
  }, []);
  const on = v >= lo && v <= hi;
  return (<div style={box}>
    <div style={{ position: 'relative', height: 150, background: 'rgba(255,255,255,.04)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${lo}%`, height: `${hi - lo}%`, background: 'rgba(255,209,102,.16)', borderTop: `1px solid ${theme.gold}55`, borderBottom: `1px solid ${theme.gold}55` }} />
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: `calc(${v}% - 9px)`, width: 18, height: 18, borderRadius: 9, background: on ? theme.gold : theme.muted, boxShadow: on ? `0 0 14px ${theme.gold}` : 'none', transition: 'background .1s' }} />
    </div>
    <div style={{ height: 3, background: 'rgba(255,255,255,.08)', borderRadius: 2, margin: '8px 0 10px' }}><div style={{ width: `${Math.min(100, (t / seconds) * 100)}%`, height: '100%', background: theme.accent, borderRadius: 2 }} /></div>
    <button data-sfx="none"
      onPointerDown={(e) => { e.preventDefault(); held.current = true; }}
      onPointerUp={() => { held.current = false; }}
      onPointerLeave={() => { held.current = false; }}
      style={bigBtn()}>Hold</button>
  </div>);
}

// ── the stunt, and the one-take: the sequence, in order ────────────────────────
// Four to seven steps shown once, then repeated back against a clock. One wrong step and
// you are on the floor.
const MOVES = [['↑', 'up'], ['↓', 'down'], ['←', 'left'], ['→', 'right'], ['●', 'mark'], ['✶', 'turn']];
export function KeySequence({ difficulty = 1, length, onResult }) {
  const n = Math.max(4, Math.min(7, length || Math.round(4 + difficulty)));
  const [seq] = useState(() => Array.from({ length: n }, () => MOVES[Math.floor(Math.random() * MOVES.length)]));
  const [phase, setPhase] = useState('show');
  const [at, setAt] = useState(0);
  const [got, setGot] = useState([]);
  const [left, setLeft] = useState(100);
  const span = Math.max(3.2, 7 - difficulty * 1.1) * 1000;
  useEffect(() => {
    let k = 0; let timer = null;
    const step = () => { if (k >= seq.length) { setAt(-1); setPhase('play'); return; } setAt(k); play('tap'); k += 1; timer = setTimeout(step, Math.max(380, 620 - difficulty * 90)); };
    timer = setTimeout(step, 420);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (phase !== 'play') return;
    const start = performance.now(); let h = 0; let run = true;
    const tick = () => { if (!run) return; const el = performance.now() - start; setLeft(Math.max(0, 100 - (el / span) * 100));
      if (el >= span) { run = false; onResult(clamp(Math.round((got.length / seq.length) * 70))); return; } h = raf(tick); };
    h = raf(tick);
    return () => { run = false; unraf(h); };
  }, [phase, got.length]);
  const hit = (m) => {
    if (phase !== 'play') return;
    const want = seq[got.length];
    if (!want) return;
    if (m[1] === want[1]) {
      play('tap');
      const next = [...got, m];
      setGot(next);
      if (next.length === seq.length) { play('good'); onResult(clamp(Math.round(72 + left * 0.28))); }
    } else { play('denied'); onResult(clamp(Math.round((got.length / seq.length) * 40))); }
  };
  return (<div style={box}>
    <div style={{ display: 'flex', gap: 7, justifyContent: 'center', minHeight: 46, alignItems: 'center' }}>
      {seq.map((m, k) => (<div key={k} style={{ width: 38, height: 38, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900,
        background: phase === 'show' ? (k === at ? theme.gold : 'rgba(255,255,255,.06)') : (k < got.length ? 'rgba(95,206,138,.25)' : 'rgba(255,255,255,.06)'),
        color: phase === 'show' && k === at ? '#241a05' : theme.text }}>{phase === 'show' ? (k === at ? m[0] : '') : (k < got.length ? m[0] : '?')}</div>))}
    </div>
    {phase === 'play' && <div style={{ height: 3, background: 'rgba(255,255,255,.08)', borderRadius: 2, margin: '8px 0 10px' }}><div style={{ width: `${left}%`, height: '100%', background: left > 35 ? theme.accent : theme.bad, borderRadius: 2 }} /></div>}
    {phase === 'show' && <div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', margin: '10px 0' }}>Watch it once.</div>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
      {MOVES.map((m) => (<button key={m[1]} disabled={phase !== 'play'} onClick={() => hit(m)} data-sfx="none"
        style={{ border: `1px solid ${theme.line}`, borderRadius: 10, padding: '13px 0', fontSize: 18, fontWeight: 900, cursor: phase === 'play' ? 'pointer' : 'default', background: phase === 'play' ? theme.panel : 'rgba(120,110,150,.10)', color: phase === 'play' ? theme.text : '#6b6390' }}>{m[0]}</button>))}
    </div>
  </div>);
}

// ── they changed the line: three seconds, three ways to go ─────────────────────
export function QuickPick({ difficulty = 1, prompt, options, onResult }) {
  const span = Math.max(2200, 4200 - difficulty * 700);
  const [left, setLeft] = useState(100);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const start = performance.now(); let h = 0; let run = true;
    const tick = () => { if (!run || done) return; const el = performance.now() - start; setLeft(Math.max(0, 100 - (el / span) * 100));
      if (el >= span) { run = false; setDone(true); onResult(8); return; } h = raf(tick); };
    h = raf(tick); return () => { run = false; unraf(h); };
  }, [done]);
  const pick = (o) => { if (done) return; setDone(true); play(o.good >= 70 ? 'good' : o.good >= 40 ? 'tap' : 'denied'); onResult(clamp(o.good + Math.round(left * 0.12))); };
  return (<div style={box}>
    <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.5, marginBottom: 4 }}>{prompt}</div>
    <div style={{ height: 3, background: 'rgba(255,255,255,.08)', borderRadius: 2, margin: '8px 0 10px' }}><div style={{ width: `${left}%`, height: '100%', background: left > 35 ? theme.accent : theme.bad, borderRadius: 2, transition: 'width .05s linear' }} /></div>
    <div style={{ display: 'grid', gap: 7 }}>
      {options.map((o, k) => (<button key={k} disabled={done} onClick={() => pick(o)} data-sfx="none"
        style={{ textAlign: 'left', border: `1px solid ${theme.line}`, borderRadius: 10, padding: '11px 12px', fontSize: 13.5, fontWeight: 700, cursor: done ? 'default' : 'pointer', background: theme.panel, color: theme.text, opacity: done ? .5 : 1 }}>{o.label}</button>))}
    </div>
  </div>);
}
