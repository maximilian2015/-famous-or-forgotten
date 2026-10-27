import { useState } from 'react';
import { dispatch } from '../../state/store.js';
import { declineOffer, declineConsequences } from '../../systems/career/offers.js';
import { theme } from '../theme.js';

// Pass, on the offer card and on the paper — one control, so the two cannot say different things.
// What a no does is decided in one place (career/offers.js declineConsequences) and declineOffer acts
// on the same answer. An ordinary no is one click. One that costs standing, breaks a paper, ends your
// own part or makes a director remember asks first, and says what will happen and what might —
// the fans, a letter — apart from each other, because only the first is promised (Maxi/ChatGPT, 23 Oct).
// `palette`: the contract room's paper colours, or the phone's by default.
export function PassControl({ g, o, onPassed, palette = null, label = 'Pass', buttonStyle = null }) {
  const [asking, setAsking] = useState(false);
  const c = declineConsequences(g, o);
  if (!c) return null;
  const P = palette || { ink: theme.text, muted: theme.muted, bad: theme.bad, good: theme.good, line: theme.line, panel: theme.panel2, accent: theme.bad };
  const pass = () => { dispatch(declineOffer, o.id); if (onPassed) onPassed(); };
  if (!asking) {
    return (<button onClick={() => (c.confirm ? setAsking(true) : pass())} style={buttonStyle || undefined}>{label}</button>);
  }
  const col = (tone) => (tone === 'bad' ? P.bad : tone === 'good' ? P.good : P.ink);
  return (<div style={{ flexBasis: '100%', border: `1px solid ${c.standing < 0 ? P.bad : P.line}`, borderRadius: 10, padding: '10px 11px', background: P.panel, color: P.ink, textAlign: 'left' }}>
    <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 4 }}>{c.heading}</div>
    <div style={{ fontSize: 11.5, lineHeight: 1.45, color: P.muted, marginBottom: 7 }}>{c.body}</div>
    {c.certain.map((x, i) => (<div key={i} style={{ fontSize: 11.5, fontWeight: x.tone === 'bad' ? 800 : 600, lineHeight: 1.4, color: col(x.tone), margin: '2px 0' }}>
      {x.tone === 'bad' ? '⚠ ' : x.tone === 'good' ? '✓ ' : '· '}{x.text}</div>))}
    {c.maybe.length > 0 && (<div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: P.muted }}>It could also mean</div>
      {c.maybe.map((x, i) => <div key={i} style={{ fontSize: 11, lineHeight: 1.4, color: P.muted, margin: '1px 0' }}>· {x}</div>)}
    </div>)}
    <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
      <button onClick={() => setAsking(false)} style={{ flex: 1, border: 'none', borderRadius: 8, padding: '9px 8px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: P.ink, color: P.panel }}>Keep it</button>
      <button onClick={pass} style={{ flex: 1, border: `1px solid ${P.bad}`, borderRadius: 8, padding: '9px 8px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: 'transparent', color: P.bad }}>{c.leave}</button>
    </div>
  </div>);
}
