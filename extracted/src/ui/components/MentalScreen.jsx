import { dispatch } from '../../state/store.js';
import { count } from '../../engine/text.js';
import { COST, canAfford } from '../../engine/energy.js';
import { mentalReport, canCall, canGetAway, closestPerson, callSomebody, getAway } from '../../systems/life/mood.js';
import { seeSomebody } from '../../systems/life/strain.js';
import { usePills } from '../../systems/life/health.js';
import { theme } from '../theme.js';
import { FONT, FONT_DISPLAY } from '../chrome.js';
import { Card } from './Card.jsx';
import { DrinkButton } from './DepressionCard.jsx';


// Tapping Mental used to do nothing at all, while five systems read the number behind it.
// This screen answers the only two questions worth answering: why is it that, and what can
// I do about it this month. The arithmetic is the real arithmetic — see systems/life/mood.js.
export function MentalScreen({ g, onBack }) {
  const m = Math.round(g.mental || 0);
  const rep = mentalReport(g);
  const low = g._lowMonths || 0;
  const band = m >= 70 ? ['Steady', '#4fc07f'] : m >= 45 ? ['Flat', '#f0b429'] : m >= 25 ? ['Running on empty', '#ff9d5a'] : ['Not getting up', '#ff5a72'];
  const call = canCall(g), away = canGetAway(g);
  const scarred = (g.scarred || 0) > 0;
  const row = (l, sign) => (
    <div key={l.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 0', borderBottom: `1px solid ${theme.line}` }}>
      <div style={{ width: 46, flexShrink: 0, textAlign: 'right', fontSize: 13, fontWeight: 900, fontVariantNumeric: 'tabular-nums',
        color: l.per > 0 ? '#4fc07f' : l.per < 0 ? '#ff5a72' : theme.muted }}>
        {l.per === 0 ? '·' : (l.per > 0 ? '+' : '') + l.per}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>{l.label}</div>
        <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5, marginTop: 2 }}>{l.why}</div>
      </div>
    </div>);
  return (<div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: 'transparent', color: theme.text, padding: 16, paddingBottom: 40, fontFamily: FONT }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <button onClick={onBack} data-sfx="back" style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: theme.text, borderRadius: 9, padding: '6px 11px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>‹ Back</button>
      <div style={{ fontSize: 16, fontWeight: 900 }}>Your head</div>
    </div>

    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 700 }}>{m}</div>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: band[1] }}>{band[0]}</div>
      </div>
      <div style={{ height: 9, background: 'rgba(255,255,255,.08)', borderRadius: 5, margin: '9px 0 8px', overflow: 'hidden' }}>
        <div style={{ width: m + '%', height: '100%', background: band[1], borderRadius: 5, transition: 'width .5s' }} />
      </div>
      {/* The month-on-month sum, which is the number that actually decides where this ends up. */}
      <div style={{ fontSize: 12, color: theme.muted }}>
        As things stand you are <b style={{ color: rep.net > 0 ? '#4fc07f' : rep.net < 0 ? '#ff5a72' : theme.muted }}>
        {rep.net > 0 ? 'gaining' : rep.net < 0 ? 'losing' : 'holding at'} {rep.net === 0 ? '' : Math.abs(rep.net)}</b>
        {rep.net === 0 ? ' — nothing is pulling either way.' : ' a month, before anything that happens to you.'}
      </div>
      {low >= 2 && <div style={{ fontSize: 12, color: '#ff9d5a', marginTop: 7, fontWeight: 700 }}>
        {count(low, 'month')} at the bottom now.{low >= 6 ? ' This has stopped being a bad patch.' : ''}
      </div>}
    </Card>

    {g.depression && <Card style={{ marginBottom: 14, borderColor: '#ff5a7255' }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: '#ff5a72', marginBottom: 5 }}>This is not a bad month</div>
      <div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.55 }}>
        It followed you home and it stayed. Nothing below fixes it — what moves it is the medication,
        an hour a month with somebody, resting, and having one person left who is close to you.
      </div>
    </Card>}

    {rep.down.length > 0 && (<>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 4 }}>What is pulling you down</div>
      <Card style={{ marginBottom: 14, padding: '4px 14px' }}>{rep.down.map((l) => row(l))}</Card>
    </>)}
    {rep.notes.length > 0 && (<>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 4 }}>Worth knowing</div>
      <Card style={{ marginBottom: 14, padding: '4px 14px' }}>{rep.notes.map((l) => row(l))}</Card>
    </>)}
    {rep.up.length > 0 && (<>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 4 }}>What is holding you up</div>
      <Card style={{ marginBottom: 14, padding: '4px 14px' }}>{rep.up.map((l) => row(l))}</Card>
    </>)}

    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>What you can do this month</div>
    <div style={{ display: 'grid', gap: 8 }}>
      <ActRow label={call.ok ? `Ring ${(closestPerson(g) || {}).name?.split(' ')[0] || 'somebody'}` : 'Ring somebody'}
        blurb="An hour on the phone. How much it helps is how close they actually are."
        cost={`${COST.call} energy · free`} disabled={!call.ok} why={call.why} onClick={() => dispatch(callSomebody)} />
      <ActRow label="See somebody about it"
        blurb={scarred || g.depression ? 'The hour a month that is the only thing that actually moves this.' : 'An hour with a professional. Awkward, and it works.'}
        cost={`${COST.therapy} energy · €260`} disabled={!canAfford(g, COST.therapy) || (g.cash || 0) < 260 || (!g.depression && !scarred)
          /* and once a month, which life/strain.js has always enforced and this never asked */
          || (g.depression ? !!g.depression.sessionThisMonth : !!g._therapyThisMonth)}
        why={!g.depression && !scarred ? 'There is nothing to talk about right now.' : !canAfford(g, COST.therapy) ? 'Not enough energy left this month.' : 'You cannot cover it.'}
        onClick={() => dispatch(seeSomebody)} />
      {(g.meds || {}).sleeping > 0 && <ActRow label={`Take a sleeping pill · ${(g.meds || {}).sleeping} left`}
        blurb="For the head, not the body. It buys you a week."
        cost="free" onClick={() => dispatch(usePills, 'sleeping')} />}
      <ActRow label="Get away on the boat" blurb="Two weeks where the phone does not work and nobody knows where you are."
        cost={`${COST.therapy} energy`} disabled={!away.ok} why={away.why} onClick={() => dispatch(getAway)} />
      {/* The other way out. It lived inside the depression card, which does not render for
          anybody who is merely on the floor — so the one thing an ordinary tired actor
          actually reaches for was two taps inside the Shop and never mentioned. It belongs
          on the page you open when your head is at thirty. systems/life/drink.js */}
      <DrinkButton g={g} />
    </div>
    <div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', padding: '16px 10px', lineHeight: 1.6 }}>
      Resting properly is under Home, and the pills and the bottles are in the Shop. A month
      off is the only thing that pulls the strain down faster than time does.
    </div>
  </div>);
}
function ActRow({ label, blurb, cost, disabled, why, onClick }) {
  return (<button onClick={disabled ? undefined : onClick} disabled={disabled}
    data-sfx={disabled ? 'denied' : 'nav'}
    style={{ textAlign: 'left', background: theme.panel, border: `1px solid ${disabled ? 'transparent' : theme.line}`,
      borderRadius: 12, padding: '12px 14px', cursor: disabled ? 'default' : 'pointer', color: theme.text,
      opacity: disabled ? .5 : 1, fontFamily: 'inherit', width: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
      <div style={{ fontSize: 13.5, fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 800, color: theme.gold, flexShrink: 0 }}>{cost}</div>
    </div>
    <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, lineHeight: 1.5 }}>{disabled && why ? why : blurb}</div>
  </button>);
}
