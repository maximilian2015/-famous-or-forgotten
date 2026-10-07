import { dispatch } from '../../state/store.js';
import { count } from '../../engine/text.js';
import { rehabCost, rehabMonths, takeTheUltimatum } from '../../systems/life/depression.js';
import { GRACE_MONTHS, answerUltimatum } from '../../systems/life/drink.js';
import { theme } from '../theme.js';
import { FONT } from '../chrome.js';


// The one time anybody in your life says it out loud. Three answers, and the game holds you
// to all three — see systems/life/drink.js.
export function UltimatumModal({ g }) {
  const p = g.drink?.pending;
  if (!p) return null;
  const cost = rehabCost(g), months = rehabMonths(g);
  const canPay = (g.cash || 0) >= cost;
  const shooting = !!g.production;
  const opt = (label, sub, onClick, off) => (
    <button onClick={onClick} disabled={off} style={{ width: '100%', textAlign: 'left', marginTop: 9,
      background: off ? 'rgba(120,110,150,.12)' : 'rgba(158,116,255,.14)', border: `1px solid ${off ? 'transparent' : theme.line}`,
      borderRadius: 12, padding: '11px 13px', cursor: off ? 'default' : 'pointer', color: off ? '#6b6390' : theme.text }}>
      <div style={{ fontSize: 13.5, fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, lineHeight: 1.45 }}>{sub}</div>
    </button>);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,5,20,.96)', zIndex: 60, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16, color: theme.text, fontFamily: FONT }}>
      <div style={{ maxWidth: 380, width: '100%', background: theme.panel, border: `1px solid ${theme.bad}55`, borderRadius: 20, padding: '22px 20px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.18em', textTransform: 'uppercase', color: theme.bad, marginBottom: 12, textAlign: 'center' }}>
          The light is still on
        </div>
        <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 8 }}>{p.title}</div>
        <div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.6 }}>{p.body}</div>
        {opt(canPay ? `Go with them · €${cost.toLocaleString()}` : `You cannot cover the clinic · €${cost.toLocaleString()}`,
          canPay ? `${count(months, 'month')}, starting tonight.${shooting ? ` "${g.production.title}" carries on without you.` : ''}`
            : 'They looked it up too. Neither of you can find the money.',
          () => dispatch(takeTheUltimatum), !canPay)}
        {opt('Promise them you will stop',
          `No drinking for ${GRACE_MONTHS} months. If they find a bottle before then, they go — and they will not ask again.`,
          () => dispatch(answerUltimatum, 'promise'))}
        {opt('Tell them to leave it alone',
          'They will. Tonight.',
          () => dispatch(answerUltimatum, 'refuse'))}
      </div>
    </div>);
}
