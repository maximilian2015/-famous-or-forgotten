import { useRef, useState } from 'react';
import { theme } from '../theme.js';

// Press-your-luck grid, minesweeper-flavoured. Reveal tiles one at a time: each clean one
// gets you further, but some hide trouble. Bank what you've got, or push for more.
export function GridRisk({ cols = 4, rows = 3, bad = 4, labelSafe = '✓', labelBad = '✕', onResult }) {
  const total = cols * rows;
  const badSet = useRef(null);
  if (badSet.current === null) {
    const s = new Set();
    while (s.size < Math.min(bad, total - 1)) s.add(Math.floor(Math.random() * total));
    badSet.current = s;
  }
  const [revealed, setRevealed] = useState([]);
  const [busted, setBusted] = useState(null);
  const doneRef = useRef(false);
  const safeTotal = total - badSet.current.size;
  const quality = Math.round((revealed.length / safeTotal) * 100);

  function reveal(i) {
    if (doneRef.current || revealed.includes(i)) return;
    if (badSet.current.has(i)) {
      doneRef.current = true;
      setBusted(i);
      setTimeout(() => onResult(0), 700);
      return;
    }
    const next = [...revealed, i];
    setRevealed(next);
    if (next.length >= safeTotal) { doneRef.current = true; setTimeout(() => onResult(100), 500); }
  }
  function bank() {
    if (doneRef.current || revealed.length === 0) return;
    doneRef.current = true;
    onResult(quality);
  }

  return (<div>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6, marginBottom: 8 }}>
      {Array.from({ length: total }).map((_, i) => {
        const isRevealed = revealed.includes(i); const isBust = busted === i;
        return (<button key={i} onClick={() => reveal(i)} disabled={doneRef.current || isRevealed}
          style={{ aspectRatio: '1 / 1', border: `1px solid ${isBust ? 'rgba(255,90,122,.7)' : isRevealed ? 'rgba(95,206,138,.6)' : theme.line}`,
            borderRadius: 8, fontSize: 15, fontWeight: 900, cursor: doneRef.current || isRevealed ? 'default' : 'pointer',
            background: isBust ? 'rgba(255,90,122,.25)' : isRevealed ? 'rgba(95,206,138,.22)' : theme.panel,
            color: isBust ? theme.bad : isRevealed ? theme.good : theme.muted }}>
          {isBust ? labelBad : isRevealed ? labelSafe : '?'}
        </button>);
      })}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <div style={{ fontSize: 11.5, color: theme.muted }}>Progress <span style={{ color: theme.gold, fontWeight: 800 }}>{quality}%</span></div>
      <button onClick={bank} disabled={doneRef.current || revealed.length === 0}
        style={{ border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 800,
          cursor: doneRef.current || revealed.length === 0 ? 'default' : 'pointer',
          background: revealed.length === 0 ? 'rgba(120,110,150,.15)' : `linear-gradient(135deg,${theme.accent2},${theme.accent})`,
          color: revealed.length === 0 ? '#6b6390' : '#fff' }}>Stop here</button>
    </div>
  </div>);
}
