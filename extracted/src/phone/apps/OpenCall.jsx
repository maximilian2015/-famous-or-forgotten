import { useEffect, useState } from 'react';
import { theme } from '../../ui/theme.js';
import { dispatch, getState } from '../../state/store.js';
import { refreshCastingPool, auditionFor, castingChance, SHELVES, SHELF_BLURB } from '../../systems/career/castings.js';
import { TimingBar } from '../../ui/components/TimingBar.jsx';
import { GridRisk } from '../../ui/components/GridRisk.jsx';
export function OpenCall({ g, ocTab, setOcTab, teenMode }) {
  const [audition, setAudition] = useState(null);
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!g.castingPool || !g.castingPool.length) dispatch((s) => { refreshCastingPool(s); return s; });
  }, [g.castingPool]);
  const pool = g.castingPool || [];
  function openAudition(c) {
    setAudition({ id: c.id, title: c.title, game: Math.random() < 0.5 ? 'timing' : 'grid',
      zoneStart: 12 + Math.random() * 62, zoneWidth: 10 + Math.random() * 6, speed: 2.6 + Math.random() * 1.7,
      bad: 3 + (Math.random() < 0.5 ? 1 : 0) });
  }
  function finishAudition(quality) {
    dispatch(auditionFor, audition.id, quality);
    setResult(getState().lastEvent);
    setAudition(null);
  }

  // The read itself — takes over the app so the result lands where you actually are.
  if (audition) {
    return (<div>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.accent, marginBottom: 6 }}>Audition</div>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{audition.title}</div>
      <div style={{ fontSize: 11.5, color: theme.gold, marginBottom: 12, lineHeight: 1.45 }}>
        {audition.game === 'timing'
          ? 'They are watching. Land the line on the beat — tap dead centre of the green.'
          : 'Work through the scene beat by beat. Some choices die in the room. Stop while it still plays.'}
      </div>
      {audition.game === 'timing'
        ? <TimingBar zoneStart={audition.zoneStart} zoneWidth={audition.zoneWidth} speed={audition.speed} onResult={finishAudition} />
        : <GridRisk cols={4} rows={3} bad={audition.bad} labelSafe="✓" labelBad="✕" onResult={finishAudition} />}
    </div>);
  }
  if (result) {
    return (<div style={{ textAlign: 'center', padding: '10px 4px' }}>
      <div style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 14 }}>{result}</div>
      <button onClick={() => setResult(null)} style={{ width: '100%', border: 'none', borderRadius: 10, padding: '10px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: `linear-gradient(135deg,${theme.accent2},${theme.accent})`, color: '#fff' }}>Back to listings</button>
    </div>);
  }
  // teens only see gigs (background/extra work)
  const shelves = teenMode ? SHELVES.filter(([id]) => id === 'gigs') : SHELVES;
  const cur = teenMode ? 'gigs' : (ocTab || (shelves.find(([id]) => pool.some((c) => c.shelf === id)) || ['series'])[0]);
  const list = pool.filter((c) => c.shelf === cur);
  return (<div>
    {!teenMode && <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>{shelves.map(([id, label]) => { const n = pool.filter((c) => c.shelf === id).length;
      return (<button key={id} onClick={() => setOcTab(id)} style={{ flex: 1, border: 'none', borderRadius: 10, padding: '8px 4px', fontSize: 12, fontWeight: 800, cursor: 'pointer', background: cur === id ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : 'rgba(158,116,255,.16)', color: cur === id ? '#fff' : '#d9cffa' }}>{label}{n ? ` ${n}` : ''}</button>); })}</div>}
    {teenMode && <div style={{ fontSize: 11.5, color: theme.accent, padding: '2px 2px 8px', fontWeight: 700 }}>As a teen you can only take background/extra gigs — real roles come once you're older.</div>}
    <div style={{ fontSize: 11.5, color: theme.muted, padding: '2px 2px 8px' }}>{SHELF_BLURB[cur]}</div>
    {!list.length && <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: 22 }}>Nothing on this shelf right now.</div>}
    {list.map((c) => { const locked = (g.fame || 0) < (c.minFame || 0); const ch = castingChance(g, c); const chipCol = ch >= 70 ? theme.good : ch >= 45 ? theme.accent : theme.gold;
      return (<div key={c.id} style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>{c.title}</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: theme.gold }}>€{(c.monthlyRate || c.salary).toLocaleString()}<span style={{ fontSize: 10, fontWeight: 700, color: theme.muted }}>{c.months > 1 ? '/mo' : ''}</span></div>
            {c.months > 1 && <div style={{ fontSize: 10, color: theme.muted, fontWeight: 700 }}>€{c.salary.toLocaleString()} total</div>}
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3 }}>{c.role} · {c.type}</div>
        {/* How long this eats of your life, before you say yes to it. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
          <div style={{ display: 'flex', gap: 2, flex: 1 }}>
            {Array.from({ length: 14 }).map((_, i) => (<span key={i} style={{ flex: 1, height: 5, borderRadius: 1,
              background: i < (c.months || 1) ? (c.months >= 8 ? theme.gold : theme.accent) : 'rgba(255,255,255,.09)' }} />))}
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: c.months >= 8 ? theme.gold : theme.muted, whiteSpace: 'nowrap' }}>
            {c.months > 1 ? `${c.months} mo shoot` : 'one day'}
          </span>
        </div>
        <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: 'rgba(158,116,255,.18)', color: chipCol, marginTop: 7 }}>{locked ? `Needs fame ${c.minFame}` : ch + '% shot'}</span>
        {!locked && <div style={{ marginTop: 8 }}><button onClick={() => openAudition(c)} disabled={(g.ap||0)<=0} style={{ width: '100%', border: 'none', borderRadius: 10, padding: '9px', fontSize: 12.5, fontWeight: 800, cursor: (g.ap||0)<=0?'default':'pointer', background: (g.ap||0)<=0?'rgba(120,110,150,.15)':`linear-gradient(135deg,${theme.accent2},${theme.accent})`, color: (g.ap||0)<=0?'#6b6390':'#fff' }}>Audition</button></div>}
      </div>); })}
    <div style={{ marginTop: 4 }}><button onClick={() => dispatch((s) => { refreshCastingPool(s, true); return s; })} style={{ width: '100%', border: 'none', borderRadius: 10, padding: '9px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: 'rgba(158,116,255,.16)', color: '#d9cffa' }}>Refresh listings</button></div>
  </div>);
}
