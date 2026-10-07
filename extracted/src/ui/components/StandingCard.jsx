import { dispatch } from '../../state/store.js';
import { COST } from '../../engine/energy.js';
import { liveRisks } from '../../systems/meta/risk.js';
import { priceLine } from '../../systems/meta/price.js';
import { goals } from '../../systems/meta/goals.js';
import { availableActions, runAction } from '../../systems/career/actions.js';
import { theme } from '../theme.js';
import { Card } from './Card.jsx';

// Where you stand: what is biting, and what you are climbing toward, in one card. Every
// row carries the one next thing that moves it, and when that thing is an action the game
// has, the row does it. See meta/risk.js, meta/goals.js and meta/price.js.
export function StandingCard({ g }) {
  const risks = liveRisks(g).slice(0, 2);
  const price = priceLine(g);
  const board = goals(g).slice(0, 2);
  if (!risks.length && !price && !board.length) return null;
  const canRest = availableActions(g).some((x) => x.id === 'rest');
  const canQuiet = availableActions(g).some((x) => x.id === 'quiet');
  // The two pieces of advice the game can carry out for you.
  const actionFor = (fix) => (/month with nothing on the calendar|month off/i.test(fix) && canRest ? ['rest', 'Take the month off']
    : /out of sight/i.test(fix) && canQuiet ? ['quiet', 'Go out of sight'] : null);
  const row = (key, label, tone, detail, fix) => {
    const act = fix ? actionFor(fix) : null;
    return (<div key={key} style={{ padding: '6px 0', borderTop: key === 'first' ? 'none' : `1px solid ${theme.line}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: tone }}>{label}</div>
        {detail && <div style={{ fontSize: 10.5, color: theme.muted, flex: 'none' }}>{detail}</div>}
      </div>
      {fix && <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.45, marginTop: 2 }}>→ {fix}</div>}
      {act && <button onClick={() => dispatch(runAction, act[0])} style={{ marginTop: 5, border: 'none', borderRadius: 9, padding: '6px 11px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', background: 'rgba(255,209,102,.18)', color: theme.gold }}>{act[1]} · {COST.careerAction} energy</button>}
    </div>);
  };
  let first = true;
  const mark = () => { const k = first ? 'first' : ''; first = false; return k; };
  return (<Card style={{ marginBottom: 14, borderColor: risks.some((r) => r.level === 2) ? 'rgba(255,90,122,.4)' : theme.line }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 4 }}>Where you stand</div>
    {risks.map((r) => row(mark() + r.id, r.label, r.level === 2 ? theme.bad : theme.gold, r.level === 2 ? 'about to bite' : 'worth watching', r.fix))}
    {price && row(mark() + 'price', price.label, theme.text, 'the price of the name', price.fix)}
    {board.map((x) => (<div key={x.id} style={{ padding: '6px 0', borderTop: `1px solid ${theme.line}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800 }}>{x.label}</div>
        {x.now && <div style={{ fontSize: 10.5, color: theme.muted, flex: 'none' }}>{x.now}</div>}
      </div>
      {x.progress != null && <div style={{ height: 3, background: 'rgba(255,255,255,.08)', borderRadius: 2, margin: '4px 0 3px' }}><div style={{ width: `${Math.round(x.progress * 100)}%`, height: '100%', background: theme.accent, borderRadius: 2 }} /></div>}
      <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.45 }}>→ {x.next}</div>
    </div>))}
  </Card>);
}
