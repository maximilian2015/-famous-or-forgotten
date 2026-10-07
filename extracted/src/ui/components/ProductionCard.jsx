import { dispatch } from '../../state/store.js';
import { canAfford, COST } from '../../engine/energy.js';
import { sceneState } from '../../systems/career/scenes.js';
import { demandOf, optionsFor, answerDemand } from '../../systems/career/demands.js';
import { meterTier } from '../../systems/career/production.js';
import { canSmooth, smoothOver, canUse, FAVOURS, costOf } from '../../systems/career/favours.js';
import { theme } from '../theme.js';
import { Card } from './Card.jsx';
import { TitleLine } from './TitleLine.jsx';

// What this month on set needs from you, and how the director feels about you — on the
// home screen, where the month actually gets lived.
export function OnSetNow({ g, p }) {
  const lead = (p.crew || [])[0];
  const stamp = (g.year || 0) * 12 + (g.month || 0);
  const worked = p._workedMonth === stamp;
  // A lesson costs COST.train, not COST.rehearse. Between 15 and 19 energy the button was
  // bright and the lesson refused. career/training.js
  const b = lead ? lead.bond : 50;
  const mood = b >= 70 ? ['warm to you', '#4fc07f'] : b >= 45 ? ['fine with you', theme.muted] : b >= 26 ? ['cooling on you', '#f0b429'] : ['done with you', '#ff5a72'];
  return (<div style={{ marginTop: 8 }}>
    {/* THE MONTH FIRST. It used to sit fifth, under four lines of mechanics that read the same
        every month for six months — which is why a card with something new on it still looked
        like a card with nothing on it. career/setlife.js */}
    {p._lifeLine && <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.55, marginBottom: 8 }}>{p._lifeLine}</div>}
    {lead && <div style={{ fontSize: 11.5, color: theme.muted, marginBottom: 8 }}>
      {lead.name}, directing, is <b style={{ color: mood[1] }}>{mood[0]}</b>.
      {b < 45 && ' A cold director is what costs you standing at wrap.'}
    </div>}
    {/* What you said last time they asked, so an answer is a thing that happened rather than
        a button that vanished. */}
    {p._lastAnswer && !p.demand && <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5, marginBottom: 8, fontStyle: 'italic' }}>{p._lastAnswer}</div>}
    <DemandRow g={g} p={p} />
    {(() => { const sc = sceneState(g, p); return sc && sc.left > 0 ? (<div style={{ fontSize: 11, color: theme.gold, marginTop: 6, lineHeight: 1.45 }}>🎬 {sc.line}</div>) : null; })()}
    <div style={{ fontSize: 11, color: theme.muted, marginTop: 6, lineHeight: 1.45 }}>
      {/* The month costs you nothing to work any more. You turn up and the film gets made; what
          the month asks of you is the card above, when it asks anything at all. */}
      {p.demand ? 'Nothing else is needed from you this month.'
        : worked ? 'The work is done. Nobody has asked you for anything this month.'
        : 'The set is under Career.'}
    </div>
  </div>);
}
// What the production wants of you this month, and what each answer costs. This replaced the
// three stance chips, which differed only in price and so were never a decision — see
// career/demands.js for the whole of why.
function DemandRow({ g, p }) {
  const d = demandOf(p);
  if (!d) return null;
  const opts = optionsFor(g, p);
  return (<div style={{ background: 'rgba(255,209,102,.07)', border: `1px solid ${theme.gold}44`, borderRadius: 12, padding: '10px 11px', margin: '2px 0 4px' }}>
    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.gold, marginBottom: 5 }}>They want an answer</div>
    <div style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 9 }}>{d.ask(p)}</div>
    {opts.map((o) => (<button key={o.id} onClick={() => dispatch(answerDemand, p.id, o.id)}
      style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 5, border: `1px solid ${theme.line}`,
        borderRadius: 10, padding: '8px 10px', background: theme.panel, color: theme.text, font: 'inherit',
        fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
      {o.label}
      {/* The price, before it is pressed. Every one of these costs something different, which
          is the point: there is no answer that is simply better. */}
      <div style={{ fontSize: 10.5, fontWeight: 500, color: theme.muted, marginTop: 2 }}>{o.hint}</div>
    </button>))}
    <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 2, lineHeight: 1.4 }}>
      Live the month without answering and they take it as {opts.find((o) => o.passive) ? `"${opts.find((o) => o.passive).label.toLowerCase()}"` : 'a no'}.
    </div>
  </div>);
}
export function ProductionCard({ g, p }) {
  const tier = meterTier(p.meter); const noEnergy = !canAfford(g, COST.rehearse);
  const actBtn = (danger) => ({ flex: 1, border: 'none', borderRadius: 10, padding: '9px', fontSize: 12.5, fontWeight: 800, cursor: noEnergy ? 'default' : 'pointer', background: noEnergy ? 'rgba(120,110,150,.15)' : danger ? 'rgba(255,209,102,.18)' : `linear-gradient(135deg,${theme.accent2},${theme.accent})`, color: noEnergy ? '#6b6390' : danger ? theme.gold : '#fff' });
  return (<Card style={{ marginBottom: 14, borderColor: 'rgba(255,209,102,.35)' }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.gold, marginBottom: 6 }}>🎬 {p.prepLeft > 0 ? `Preparing · ${p.prepLeft} mo before the first day` : `On set · ${p.monthsLeft} mo left`}</div>
    <TitleLine g={g} kind="set" id={p.id} title={p.title} />
    <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 8px' }}>{p.role} · {p.type}</div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: theme.muted, marginBottom: 4 }}><span>Your performance</span><span>{tier.label} · {Math.round(p.meter)}</span></div>
    <div style={{ height: 7, background: 'rgba(255,255,255,.08)', borderRadius: 4, marginBottom: 8 }}><div style={{ width: p.meter + '%', height: '100%', background: theme.gold, borderRadius: 4 }} /></div>
    {/* The other three, in words. A set is a story, not a progress bar. */}
    {(() => {
      const dir = (p.crew || [])[0], co = (p.crew || [])[1];
      const row = (k, v, col) => (<div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, padding: '2px 0' }}>
        <span style={{ color: theme.muted }}>{k}</span><span style={{ color: col, fontWeight: 700 }}>{v}</span></div>);
      const word = (b) => (b >= 72 ? ['Delighted with you', theme.gold] : b >= 55 ? ['Pleased', theme.good]
        : b >= 38 ? ['Professional', theme.muted] : b >= 22 ? ['Cooling', theme.bad] : ['Has stopped looking at you', theme.bad]);
      const chem = (b) => (b >= 70 ? ['You two have it', theme.gold] : b >= 52 ? ['Easy enough', theme.good]
        : b >= 34 ? ['Polite', theme.muted] : ['Uneasy', theme.bad]);
      const press = (st) => ((st ?? 70) >= 80 ? ['Running smoothly', theme.good] : (st ?? 70) >= 60 ? ['The usual chaos', theme.muted]
        : (st ?? 70) >= 42 ? ['Behind schedule', theme.bad] : ['Falling apart', theme.bad]);
      return (<div style={{ marginBottom: 10 }}>
        {dir && row('Director', ...[word(dir.bond || 0)].flatMap((x) => x))}
        {co && row('Chemistry', ...[chem(co.bond || 0)].flatMap((x) => x))}
        {row('Production', ...[press(p.stability)].flatMap((x) => x))}
      </div>);
    })()}
    {p.prepLeft > 0 ? null : <div style={{ marginBottom: 10 }}><DemandRow g={g} p={p} /></div>}
    {/* The days on this shoot that are a scene rather than a month — see career/scenes.js. */}
    {p.prepLeft > 0 ? null : (() => { const sc = sceneState(g, p); if (!sc) return null; return (<div style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,209,102,.06)', border: `1px solid ${theme.line}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.gold }}>The days</div>
        <div style={{ fontSize: 10.5, color: theme.muted }}>{sc.done} of {sc.cap} shot</div>
      </div>
      {sc.days.map((d, k) => (<div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11.5, padding: '3px 0' }}>
        <span style={{ fontWeight: 700 }}>{d.label}</span>
        <span style={{ color: d.q >= 70 ? theme.gold : d.q >= 45 ? theme.muted : theme.bad }}>{d.word} · {d.q}</span>
      </div>))}
      <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.45, marginTop: 3 }}>{sc.line}</div>
      {!!sc.moments.length && <div style={{ fontSize: 11.5, color: theme.text, lineHeight: 1.45, marginTop: 4 }}>★ In the film now: {sc.moments.join('; ')}.</div>}
    </div>); })()}
    {/* One favour, not a grind: somebody owes you and you spend it. The month itself is the
        stance above, and the shooting is the days. */}
    {canSmooth(g) && <div style={{ marginBottom: 12 }}>
      <button onClick={() => dispatch(smoothOver)} disabled={!canUse(g, 'smooth').ok} title={canUse(g, 'smooth').ok ? FAVOURS.smooth.blurb : canUse(g, 'smooth').why}
        style={{ ...actBtn(true), width: '100%', background: canUse(g, 'smooth').ok ? 'rgba(255,209,102,.18)' : 'rgba(120,110,150,.15)', color: canUse(g, 'smooth').ok ? theme.gold : '#6b6390' }}>◆ Have a word · −{costOf(g, 'smooth')}</button>
    </div>}
    <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.muted, marginBottom: 6 }}>Crew</div>
    {p.crew.map((c) => (<div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${theme.line}` }}>
      <div><div style={{ fontSize: 12.5, fontWeight: 700 }}>{c.name}</div><div style={{ fontSize: 10.5, color: theme.muted }}>{c.role} · {c.trait} · bond {Math.round(c.bond || 0)}</div></div>

    </div>))}
  </Card>);
}
