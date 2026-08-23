import { useEffect, useRef, useState } from 'react';
import { theme } from '../theme.js';
export function TimingBar({ zoneStart = 40, zoneWidth = 20, speed = 1.8, onResult }) {
  const [pos, setPos] = useState(0);
  const dirRef = useRef(1);
  const posRef = useRef(0);
  const rafRef = useRef(null);
  const doneRef = useRef(false);
  const lastRef = useRef(0);
  useEffect(() => {
    // Time-based, not frame-based. Moving the marker a fixed amount PER FRAME meant the bar
    // ran at 60 units a second on a 60Hz screen and 144 on a gaming monitor — the same
    // audition was two and a half times harder depending on what you happened to own.
    // Speed is now "units per frame at 60fps", so the old numbers all still mean what they
    // meant, and the clamp stops a background tab resuming with one enormous jump.
    lastRef.current = 0;
    function tick(now) {
      const dt = lastRef.current ? Math.min(100, now - lastRef.current) : 16.67;
      lastRef.current = now;
      posRef.current += dirRef.current * speed * (dt / 16.67);
      if (posRef.current >= 100) { posRef.current = 100; dirRef.current = -1; }
      if (posRef.current <= 0) { posRef.current = 0; dirRef.current = 1; }
      setPos(posRef.current);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [speed]);
  function stop() {
    if (doneRef.current) return;
    doneRef.current = true;
    cancelAnimationFrame(rafRef.current);
    const center = zoneStart + zoneWidth / 2;
    const dist = Math.abs(posRef.current - center);
    // Tight falloff: drift outside the zone and the score drops off fast.
    const quality = Math.max(0, Math.min(100, Math.round(100 - (dist / (zoneWidth / 2 + 6)) * 100)));
    onResult(quality, posRef.current);
  }
  return (<div onClick={stop} style={{ position: 'relative', height: 30, background: 'rgba(255,255,255,.08)', borderRadius: 8, cursor: 'pointer', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', left: zoneStart + '%', width: zoneWidth + '%', top: 0, bottom: 0, background: 'rgba(95,206,138,.4)', borderLeft: '1px solid rgba(95,206,138,.7)', borderRight: '1px solid rgba(95,206,138,.7)' }} />
    <div style={{ position: 'absolute', left: `calc(${pos}% - 2px)`, width: 4, top: 0, bottom: 0, background: theme.gold, boxShadow: '0 0 6px rgba(255,209,102,.8)' }} />
  </div>);
}
