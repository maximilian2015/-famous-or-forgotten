import { useState } from 'react';
import { comboOf, COMBOS } from '../../systems/meta/standing.js';
import { theme } from '../theme.js';
import { Card } from './Card.jsx';

// The full card, for the two ladder screens: what the combination is and what it does.
export function ComboCard({ g }) {
  const id = comboOf(g), c = COMBOS[id];
  const col = c.tone === 'bad' ? '#ff8d9e' : c.tone === 'good' ? theme.gold : theme.accent;
  return (<Card style={{ marginBottom: 14, borderColor: col + '44' }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: col, marginBottom: 4 }}>Fame × Standing · {c.label}</div>
    <div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.55 }}>{c.long}</div>
    {c.fx.length > 0 && <div style={{ marginTop: 8 }}>
      {c.fx.map((l, i) => <div key={i} style={{ fontSize: 11.5, color: theme.text, lineHeight: 1.5, display: 'flex', gap: 6, opacity: .9 }}><span style={{ color: col }}>·</span><span>{l}</span></div>)}
    </div>}
  </Card>);
}


// The climb, drawn once. Fame and standing are the same shape — rungs, a tube filling from
// the bottom, and what each one opens — so they are the same component rather than two that
// look alike until somebody edits one of them.
//
// `gateFor` is optional: fame has two doors that points alone will not open, standing has
// none, and a ladder with no gates simply does not draw any.
// `sunkAt` is for a rung you do not reach by the number at all — you are pushed into it from
// above. Forgotten is the one: fame never goes below zero, but a name that fell is sitting
// under Unknown, and the ladder has to show that. { id, fill } — which rung, and how deep.
export function Ladder({ tiers, opens, value, gateFor, sunkAt }) {
  // The bullet points under every rung took the whole screen — Maxi: "they take a lot of
  // space, put them in a guide". They are in the Guide app now; here they are one tap away.
  const [showOpens, setShowOpens] = useState(false);
  const v = Math.round(value || 0);
  let cur = tiers[0];
  for (const t of tiers) if (v >= t.min) cur = t;
  if (sunkAt) cur = tiers.find((t) => t.id === sunkAt.id) || cur;
  return (<div style={{ marginBottom: 16 }}>
    <button onClick={() => setShowOpens(!showOpens)} data-sfx="toggle" style={{ background: 'none', border: 'none', color: theme.accent, fontSize: 11.5, fontWeight: 800, cursor: 'pointer', padding: '0 0 8px', fontFamily: 'inherit' }}>
      {showOpens ? '▾ Hide what each rung opens' : '▸ Show what each rung opens · full rules in Phone › Guide'}</button>
    <div style={{ display: 'grid', gap: 8 }}>
    {[...tiers].reverse().map((t, ri, arr) => {
      const here = t.id === cur.id;
      const above = arr[ri - 1];
      const top = above ? above.min : 100;
      // A rung below zero is not something you climb, it is something you sink into. Its
      // tube fills from the top, in red, by how far down you have gone — and it never gets a
      // tick, because being above it is not an achievement, it is the default.
      const sunk = t.min < 0;
      // Pushed into a rung from above: nothing above it is an achievement any more.
      const done = !sunk && !sunkAt && v >= t.min;
      const fill = sunkAt && sunkAt.id === t.id ? sunkAt.fill * 100
        : sunk
        ? (v >= top ? 0 : v <= t.min ? 100 : ((top - v) / Math.max(1, top - t.min)) * 100)
        : (v >= top ? 100 : v <= t.min ? 0 : ((v - t.min) / Math.max(1, top - t.min)) * 100);
      const gate = gateFor ? gateFor(t) : null;
      return (<div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
        <Tube fill={fill} lit={done || (sunk && fill > 0)} here={here} sink={sunk} first={ri === 0} last={ri === arr.length - 1} />
        <div style={{ flex: 1,
          background: here ? (sunk ? 'rgba(255,90,114,.12)' : `${theme.accent}1e`) : theme.panel,
          border: `1px solid ${here ? (sunk ? '#ff5a72' : theme.accent) : done ? theme.line : 'rgba(255,255,255,.05)'}`,
          borderRadius: 12, padding: showOpens ? '11px 13px' : '9px 13px', opacity: done || here ? 1 : .62 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: here ? (sunk ? '#ff8d9e' : theme.accent) : theme.text }}>
              {done && !here ? '✓ ' : ''}{t.label}{here ? ' · you are here' : ''}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: theme.muted, flexShrink: 0 }}>
              {t.note ? t.note : sunk ? (v < top ? `below ${top}` : `from ${top - 1} down`) : (done || v >= t.min) ? t.min : `${Math.ceil(t.min - v)} to go`}
            </div>
          </div>
          {gate && (<div style={{ fontSize: 11.5, marginTop: 6, padding: '6px 9px', borderRadius: 8,
            background: gate.open ? 'rgba(79,192,127,.12)' : 'rgba(255,90,114,.1)',
            border: `1px solid ${gate.open ? 'rgba(79,192,127,.3)' : 'rgba(255,90,114,.25)'}`,
            color: gate.open ? '#7fd6a2' : '#ff8d9e', fontWeight: 700 }}>
            {gate.open ? `✓ ${gate.got}` : `🔒 ${gate.need} — points alone will not get you in`}
          </div>)}
          {showOpens && <div style={{ marginTop: 6 }}>
            {(opens[t.id] || []).map((line, i) => (
              <div key={i} style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5, display: 'flex', gap: 6 }}>
                <span style={{ opacity: .5 }}>·</span><span>{line}</span>
              </div>))}
          </div>}
        </div>
      </div>);
    })}
    </div>
  </div>);
}

// One segment of the climb, drawn as a glass tube with a level in it. Fills from the
// bottom, because that is the direction you are going. Segments rather than one long bar:
// the cards are different heights, so a single fill would put the marks in the wrong
// places, and a picture that does not line up with its own numbers is worse than none.
function Tube({ fill, lit, here, sink, first, last }) {
  // Below zero the level comes DOWN from the top in red. Above it, up from the bottom in
  // the accent. Same glass, opposite direction — which is exactly the point.
  const col = sink ? '#ff5a72' : theme.accent;
  const col2 = sink ? '#b03246' : (theme.accent2 || theme.accent);
  return (<div style={{ width: 16, flexShrink: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
    <div style={{ position: 'absolute', inset: 0,
      background: 'rgba(255,255,255,.05)',
      border: '1px solid rgba(255,255,255,.07)',
      borderTopLeftRadius: first ? 9 : 0, borderTopRightRadius: first ? 9 : 0,
      borderBottomLeftRadius: last ? 9 : 0, borderBottomRightRadius: last ? 9 : 0,
      overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, [sink ? 'top' : 'bottom']: 0, height: fill + '%',
        background: sink ? 'linear-gradient(180deg, ' + col2 + ', ' + col + ')' : 'linear-gradient(180deg, ' + col + ', ' + col2 + ')',
        boxShadow: fill > 0 ? '0 0 12px -2px ' + col : 'none',
        transition: 'height .6s cubic-bezier(.2,.8,.3,1)' }} />
      {/* the glass: a highlight down one side */}
      <div style={{ position: 'absolute', left: 2, top: 0, bottom: 0, width: 3, borderRadius: 3,
        background: 'linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,.02))' }} />
    </div>
    {/* the mark at the rung itself, at the bottom of its own segment */}
    <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)',
      width: here ? 14 : 10, height: here ? 14 : 10, borderRadius: 9,
      background: lit ? col : theme.panel2,
      border: '2px solid ' + (lit ? col : 'rgba(255,255,255,.14)'),
      boxShadow: here ? '0 0 12px ' + col : 'none',
      zIndex: 2, transition: 'all .3s' }} />
  </div>);
}
