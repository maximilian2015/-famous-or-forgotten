import { dispatch } from '../../state/store.js';
import { canAfford, COST } from '../../engine/energy.js';
import { count } from '../../engine/text.js';
import { inRehab, rehabCost, therapyProgress, THERAPY_FOR_A_SLOT, enterRehab, rehabMonths, standingOf,
  monthsIn, EVERY_MONTHS, CHECKPOINTS, slotsLost, MIN_MONTHS, onMeds, owedSlots } from '../../systems/life/depression.js';
import { depressed, seeSomebody } from '../../systems/life/strain.js';
import { level as drinkLevel, drankThisMonth, band as drinkBand, bottlesInHouse, drinkThrough, dependent } from '../../systems/life/drink.js';
import { theme } from '../theme.js';

const softBtn = (dead) => ({ width: '100%', marginTop: 8, border: 'none', borderRadius: 10, padding: '9px',
  fontSize: 12.5, fontWeight: 800, cursor: dead ? 'default' : 'pointer',
  background: dead ? 'rgba(120,110,150,.15)' : `linear-gradient(135deg,${theme.accent2},${theme.accent})`,
  color: dead ? '#6b6390' : '#fff' });

// The state you are in after ignoring it four times. It is long and slow, so the one
// thing it must not be is opaque — the player is told exactly what moves it and which of
// those three things they are currently doing.
export function DepressionCard({ g }) {
  if (inRehab(g)) {
    return (<div style={{ background: 'rgba(158,116,255,.08)', border: `1px solid ${theme.line}`, borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: theme.accent }}>You are away</div>
      <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 5, lineHeight: 1.55 }}>
        {g.rehab.left} month{g.rehab.left === 1 ? '' : 's'} left. No cameras, no phone, nobody watching. When you come
        out you will have your Energy back.
      </div>
    </div>);
  }
  // Cured, but it kept something. The long road back, or living with it.
  if (!depressed(g) && (g.scarred || 0) > 0) {
    const noEnergy = !canAfford(g, COST.therapy), poor = (g.cash || 0) < 260, went = !!g._therapyThisMonth;
    const canRehab = (g.cash || 0) >= rehabCost(g);
    return (<div style={{ background: 'rgba(255,106,138,.06)', border: '1px solid rgba(255,106,138,.28)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: theme.bad }}>What it left behind</div>
      <div style={{ fontSize: 11.5, color: theme.muted, margin: '4px 0 8px', lineHeight: 1.55 }}>
        {g.scarred} Energy a month you no longer have. Two ways back, and both are expensive:
        a year in a clinic, or roughly two years of sessions for each one.
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(therapyProgress(g) / THERAPY_FOR_A_SLOT * 100)}%`, height: '100%', background: theme.accent }} />
      </div>
      <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 4 }}>{therapyProgress(g)} of {THERAPY_FOR_A_SLOT} sessions toward the next hour</div>
      <button onClick={() => dispatch(seeSomebody)} disabled={noEnergy || poor || went} style={softBtn(noEnergy || poor || went)}>
        {went ? 'You went this month' : poor ? 'An hour costs €260' : `A session · €260 · ${COST.therapy} energy`}
      </button>
      <button onClick={() => dispatch(enterRehab)} disabled={!canRehab} style={{ ...softBtn(!canRehab), background: canRehab ? 'rgba(255,106,138,.18)' : 'rgba(120,110,150,.15)', color: canRehab ? theme.bad : '#6b6390' }}>
        {canRehab ? `${count(rehabMonths(g), 'month')} in a clinic · €${rehabCost(g).toLocaleString()}` : `A clinic costs €${rehabCost(g).toLocaleString()}`}
      </button>
      <DrinkButton g={g} />
    </div>);
  }
  if (!depressed(g)) return null;

  const st = standingOf(g);
  const months = monthsIn(g);
  const due = Math.max(0, EVERY_MONTHS - (g.depression.windowMonths || 0));
  const line = (on, text) => (<div style={{ fontSize: 11.5, color: on ? theme.good : theme.muted, padding: '2px 0' }}>
    {on ? '✓' : '·'} {text}
  </div>);
  const noEnergy = !canAfford(g, COST.therapy), poor = (g.cash || 0) < 260;
  const went = !!g.depression.sessionThisMonth;
  return (<div style={{ background: 'rgba(255,106,138,.08)', border: '1px solid rgba(255,106,138,.35)', borderRadius: 12, padding: '12px 14px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: theme.bad }}>You are not well</div>
      <div style={{ fontSize: 10.5, color: theme.muted }}>{g.depression.passed || 0} of {CHECKPOINTS} back</div>
    </div>
    <div style={{ fontSize: 11.5, color: theme.muted, margin: '4px 0 8px', lineHeight: 1.5 }}>
      {months} month{months === 1 ? '' : 's'}. It is taking {slotsLost(g)} Energy of every month — you have {g.apMaxEff ?? g.apMax ?? 3} instead of {g.apMax || 3}.
      {months >= MIN_MONTHS ? ` Something will come to a head in about ${due || 1} month${due === 1 ? '' : 's'}.` : ' Nothing is asked of you yet.'}
    </div>
    {st.parts.map((p) => <div key={p.id}>{line(p.on, p.label)}</div>)}
    {!onMeds(g) && <div style={{ fontSize: 11, color: theme.bad, marginTop: 6, lineHeight: 1.45 }}>
      Nothing else counts for much until you are on the medication. The Shop has it.
    </div>}
    <button onClick={() => dispatch(seeSomebody)} disabled={noEnergy || poor || went} style={softBtn(noEnergy || poor || went)}>
      {went ? 'You went this month' : poor ? 'An hour costs €260' : `Go and talk to somebody · €260 · ${COST.therapy} energy`}
    </button>
    <DrinkButton g={g} />
  </div>);
}

// The other way out. It is offered plainly, it works every single month, and the card
// says exactly what it is taking while it does.
export function DrinkButton({ g }) {
  const owed = owedSlots(g);
  // It used to appear only once the months were already being taken from you — a clinical
  // diagnosis, or a drink problem you somehow already had. Nobody starts there. They start
  // on a bad month: the head is on the floor, the shoot is grinding, and there is a bottle
  // in the kitchen. Mental runs at about 26 across a working life, so that month is most of
  // them, and the one honest way out of it was hidden two taps inside the Shop.
  const hard = (g.mental || 100) < 45 || (g.strain || 0) >= 60;
  if (owed <= 0 && !drinkLevel(g) && !hard) return null;
  const had = drankThisMonth(g);
  const lv = drinkLevel(g), b = drinkBand(g);
  const stocked = bottlesInHouse(g) > 0;
  return (<div style={{ marginTop: 10, borderTop: `1px solid ${theme.line}`, paddingTop: 9 }}>
    {lv > 0 && (<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: lv >= 45 ? theme.bad : theme.gold }}>{b.label}</span>
      <span style={{ fontSize: 10.5, color: theme.muted }}>craft −{(lv >= 78 ? 1.1 : lv >= 45 ? 0.7 : 0.35).toFixed(2)}/mo</span>
    </div>)}
    {lv > 0 && <div style={{ fontSize: 10.5, color: theme.muted, marginBottom: 6, lineHeight: 1.45 }}>{b.note}</div>}
    {lv === 0 && <div style={{ fontSize: 10.5, color: theme.muted, marginBottom: 6, lineHeight: 1.45 }}>
      A quiet evening on your own. It puts four points back on your head tonight and takes a
      third of a point off the craft, every month, for as long as you keep doing it — and it climbs.
    </div>}
    <button onClick={() => dispatch(drinkThrough)} disabled={had || !stocked}
      style={{ ...softBtn(had || !stocked), marginTop: 0, background: had || !stocked ? 'rgba(120,110,150,.15)' : 'rgba(255,209,102,.16)', color: had || !stocked ? '#6b6390' : theme.gold }}>
      {had ? (owed > 0 ? `You drank. The month is open — ${owed} Energy back.` : 'You drank. The evening was easier than the day was.')
        : !stocked ? 'Nothing in the house · the Shop delivers'
        : dependent(g) ? 'Drink — you have to now'
        : owed > 0 ? `Drink through it · opens ${owed} Energy`
        : 'Drink through it · the evening lifts'}
    </button>
  </div>);
}
