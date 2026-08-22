import { useEffect, useState } from 'react';
import { theme } from '../../ui/theme.js';
import { dispatch, getState } from '../../state/store.js';
import { refreshCastingPool, auditionFor, castingChance, reach, SHELVES, SHELF_BLURB } from '../../systems/career/castings.js';
import { TimingBar } from '../../ui/components/TimingBar.jsx';
import { GridRisk } from '../../ui/components/GridRisk.jsx';
import { useAccent } from '../../ui/appTheme.js';
import { negotiationFor, haggleOdds, applyHaggle } from '../../systems/career/negotiate.js';
import { stabilityBand, riskCostFor, volatility } from '../../systems/career/stability.js';
import { ageFit } from '../../systems/career/age.js';

// Only appears once you are somebody. Below Star you are told the number.
function Haggle({ g, c }) {
  const [open, setOpen] = useState(false);
  const accent = useAccent();
  const n = negotiationFor(g, c);
  if (!n) return null;
  if (c.negotiated) return (<div style={{ fontSize: 10.5, color: theme.muted, marginTop: 7, fontWeight: 700 }}>
    Terms settled — €{(c.perEpisode ? c.episodeFee : c.salary).toLocaleString()}{c.perEpisode ? '/ep' : ''}
  </div>);
  if (!open) return (<button onClick={() => setOpen(true)} style={{ marginTop: 7, width: '100%', border: `1px solid ${accent}44`,
    borderRadius: 10, padding: '7px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', background: 'transparent', color: accent }}>
    Have your people talk to them ›
  </button>);
  return (<div style={{ marginTop: 8, border: `1px solid ${accent}33`, borderRadius: 10, padding: '9px 10px', background: 'rgba(255,255,255,.03)' }}>
    <div style={{ fontSize: 10.5, color: theme.muted, marginBottom: 8, lineHeight: 1.5 }}>
      They opened at €{n.quoted.toLocaleString()}{n.perEpisode ? '/ep' : ''}. You are worth up to €{n.bandTop.toLocaleString()}
      {n.ceiling > n.bandTop ? `, and your agent can reach €${n.ceiling.toLocaleString()}` : ''}.
    </div>
    <div style={{ display: 'grid', gap: 6 }}>
      {n.asks.map((a) => { const odds = haggleOdds(g, c, a.amount);
        return (<button key={a.id} onClick={() => { dispatch(applyHaggle, c.id, a.amount); setOpen(false); }}
          style={{ textAlign: 'left', border: `1px solid ${theme.line}`, borderRadius: 9, padding: '8px 10px', cursor: 'pointer',
            background: theme.panel, color: theme.text }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800 }}>€{a.amount.toLocaleString()}{n.perEpisode ? '/ep' : ''}</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: odds.accept >= 60 ? theme.good : odds.accept >= 30 ? theme.gold : theme.bad }}>
              {odds.accept}% yes{odds.walk > 4 ? ` · ${odds.walk}% they walk` : ''}
            </span>
          </div>
          <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 2 }}>{a.label}</div>
        </button>); })}
      <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'none', color: theme.muted, fontSize: 11, cursor: 'pointer', padding: 4 }}>Leave it as it is</button>
    </div>
  </div>);
}
// How solid the money behind a listing is, said out loud BEFORE you sign. A risky
// project pays over the band and carries better material — that is the trade, and the
// player has to be able to see both halves of it to make the decision.
const BAND_COL = { locked: theme.good, solid: theme.accent, shaky: theme.gold, fragile: theme.bad };
function Backing({ g, c }) {
  // A day's work is over by the evening — there is no shoot for the money to walk out of.
  if (c.stability == null || (c.months || 1) < 2) return null;
  const band = stabilityBand(c.stability);
  const cost = riskCostFor(g, c.stability);
  const under = Math.round((1 - (c.feeFactor || 1)) * 100);
  const swing = volatility(c.stability);
  const col = BAND_COL[band.id] || theme.muted;
  return (<div style={{ marginTop: 7, border: `1px solid ${col}33`, borderRadius: 10, padding: '7px 9px', background: 'rgba(255,255,255,.025)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', color: col }}>
        {band.label}
      </span>
      {under >= 4 && <span style={{ fontSize: 10, fontWeight: 800, color: theme.gold, whiteSpace: 'nowrap' }}>{under}% under the rate</span>}
    </div>
    <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 3, lineHeight: 1.45 }}>{band.note}</div>
    {/* The reason to say yes: shaky money cannot pay you, so it pays in the part and in
        the chance the finished thing is something. Both halves have to be visible. */}
    {swing >= 10 && <div style={{ fontSize: 10.5, color: theme.accent, marginTop: 3, lineHeight: 1.45 }}>
      Better part than the money deserves — and it could come out anywhere from a disaster to the best thing you have done.
    </div>}
    {cost.line && <div style={{ fontSize: 10.5, color: cost.id === 'nothing' ? theme.good : theme.muted, marginTop: 3, lineHeight: 1.45 }}>{cost.line}</div>}
  </div>);
}
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
    {list.map((c) => { const locked = reach(g) < (c.minFame || 0); const ch = castingChance(g, c); const chipCol = ch >= 70 ? theme.good : ch >= 45 ? theme.accent : theme.gold;
      // An Asker counts toward the gate, and the player should be told that is why.
      const byAsker = locked === false && (g.fame || 0) < (c.minFame || 0);
      return (<div key={c.id} style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>{c.title}</div>
          <div style={{ textAlign: 'right' }}>
            {/* Television is quoted per episode, film for the picture. Same as real life. */}
            <div style={{ fontSize: 13, fontWeight: 900, color: theme.gold }}>
              €{(c.perEpisode ? c.episodeFee : c.salary).toLocaleString()}
              <span style={{ fontSize: 10, fontWeight: 700, color: theme.muted }}>{c.perEpisode ? '/ep' : ''}</span>
            </div>
            <div style={{ fontSize: 10, color: theme.muted, fontWeight: 700 }}>
              {c.perEpisode ? `€${c.salary.toLocaleString()} for ${c.episodes} eps` : 'for the picture'}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3 }}>{c.role} · {c.type}</div>
        {/* Why the odds on this one are worse than on the one below it. */}
        {(() => { const f = ageFit(g, c.role);
          if (f >= 0.98) return null;
          const lateShelf = /Character lead|matriarch|Elder|Grandparent/.test(c.role);
          return (<div style={{ fontSize: 10.5, color: f < 0.6 ? theme.bad : theme.gold, marginTop: 3, lineHeight: 1.4 }}>
            {lateShelf ? 'Written for someone who has lived a bit. That is you now.'
              : f < 0.6 ? 'They are picturing someone younger. You would be a stretch.'
              : 'You are at the top end of what they had in mind.'}
          </div>); })()}
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
        {byAsker && <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: 'rgba(255,209,102,.16)', color: theme.gold, marginTop: 7, marginLeft: 6 }}>🏆 they read you on the Asker</span>}
        <Backing g={g} c={c} />
        {!locked && <Haggle g={g} c={c} />}
        {!locked && <div style={{ marginTop: 8 }}><button onClick={() => openAudition(c)} disabled={(g.ap||0)<=0} style={{ width: '100%', border: 'none', borderRadius: 10, padding: '9px', fontSize: 12.5, fontWeight: 800, cursor: (g.ap||0)<=0?'default':'pointer', background: (g.ap||0)<=0?'rgba(120,110,150,.15)':`linear-gradient(135deg,${theme.accent2},${theme.accent})`, color: (g.ap||0)<=0?'#6b6390':'#fff' }}>Audition</button></div>}
      </div>); })}
    <div style={{ marginTop: 4 }}><button onClick={() => dispatch((s) => { refreshCastingPool(s, true); return s; })} style={{ width: '100%', border: 'none', borderRadius: 10, padding: '9px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: 'rgba(158,116,255,.16)', color: '#d9cffa' }}>Refresh listings</button></div>
  </div>);
}
