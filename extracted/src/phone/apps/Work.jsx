import { useState } from 'react';
import { theme } from '../../ui/theme.js';
import { dispatch } from '../../state/store.js';
import { availableJobs, takeJob, quitJob, JOBS, SHIFTS, doShift } from '../../systems/life/work.js';
import { INSURANCE, setInsurance, seeDoctor, treatmentCost } from '../../systems/life/health.js';
import { TimingBar } from '../../ui/components/TimingBar.jsx';
import { GridRisk } from '../../ui/components/GridRisk.jsx';

export function Work({ g }) {
  const job = g.job;
  const [tab, setTab] = useState('jobs');
  const [shift, setShift] = useState(null);
  const noEnergy = (g.ap || 0) <= 0;
  function openShift(sh) {
    setShift({ ...sh, game: Math.random() < 0.5 ? 'timing' : 'grid',
      zoneStart: 12 + Math.random() * 62, zoneWidth: 11 + Math.random() * 7, speed: 2.4 + Math.random() * 1.6, bad: 3 + (Math.random() < 0.5 ? 1 : 0) });
  }
  // A shift you actually work, rather than a button that hands you money.
  if (shift) {
    return (<div>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.accent, marginBottom: 6 }}>On shift</div>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{shift.title}</div>
      <div style={{ fontSize: 11.5, color: theme.gold, marginBottom: 12, lineHeight: 1.45 }}>
        {shift.game === 'timing' ? 'Keep the rhythm — tap dead centre of the green.' : 'Get through the night task by task. Some go wrong. Stop while you are ahead.'}
      </div>
      {shift.game === 'timing'
        ? <TimingBar zoneStart={shift.zoneStart} zoneWidth={shift.zoneWidth} speed={shift.speed} onResult={(q) => { dispatch(doShift, shift.id, q); setShift(null); }} />
        : <GridRisk cols={4} rows={3} bad={shift.bad} labelSafe="✓" labelBad="✕" onResult={(q) => { dispatch(doShift, shift.id, q); setShift(null); }} />}
    </div>);
  }
  const btn = (kind) => ({ width: '100%', border: 'none', borderRadius: 10, padding: '9px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
    background: kind === 'pri' ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : kind === 'dan' ? 'rgba(255,90,122,.15)' : 'rgba(158,116,255,.16)',
    color: kind === 'pri' ? '#fff' : kind === 'dan' ? '#ffa8bb' : '#d9cffa' });

  const tabs = (<div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
    {[['jobs', 'Jobs'], ['health', 'Health']].map(([id, label]) => (
      <button key={id} onClick={() => setTab(id)} style={{ flex: 1, border: 'none', borderRadius: 10, padding: '7px 4px', fontSize: 12, fontWeight: 800, cursor: 'pointer',
        background: tab === id ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : 'rgba(158,116,255,.16)', color: tab === id ? '#fff' : '#d9cffa' }}>{label}</button>))}
  </div>);
  if (tab === 'health') return (<div>{tabs}<HealthDesk g={g} /></div>);

  if (job) {
    const years = Math.floor(job.months / 12), months = job.months % 12;
    return (<div>{tabs}
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Currently employed</div>
      <div style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{job.title}</div>
          <div style={{ fontSize: 13, fontWeight: 900, color: theme.gold }}>€{job.pay.toLocaleString()}</div>
        </div>
        <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 10px' }}>
          {job.employer} · paid monthly{job.months ? ` · ${years ? `${years}y ` : ''}${months}mo in` : ''}
        </div>
        <div style={{ fontSize: 11.5, color: theme.gold, marginBottom: 10, lineHeight: 1.45 }}>
          Takes {job.slots} of your {g.apMax || 3} monthly actions. The money is steady; the time is gone.
        </div>
        {job.industry && <div style={{ fontSize: 11, color: theme.good, marginBottom: 10 }}>★ You're near the business here — people walk through.</div>}
        <button onClick={() => dispatch(quitJob)} style={btn('dan')}>Quit</button>
      </div>
      <div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', padding: '4px 10px 14px', lineHeight: 1.5 }}>Wages land automatically each month. You don't have to do anything.</div>
      <ShiftBoard g={g} onPick={openShift} noEnergy={noEnergy} />
    </div>);
  }

  const open = availableJobs(g);
  const tooYoung = JOBS.filter((j) => (g.ageY || 0) < j.minAge);
  return (<div>
    {tabs}
    <div style={{ fontSize: 11.5, color: theme.muted, padding: '2px 2px 10px', lineHeight: 1.5 }}>
      Steady money while you chase the other thing. A job pays every month without asking — but it takes your time.
    </div>
    {!open.length && <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: 22 }}>Nothing you're old enough for yet.</div>}
    {open.map((j) => (<div key={j.id} style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 13.5, fontWeight: 800 }}>{j.title}</div>
        <div style={{ fontSize: 13, fontWeight: 900, color: theme.gold }}>€{j.pay.toLocaleString()}</div>
      </div>
      <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 6px' }}>{j.employer} · takes {j.slots} action{j.slots > 1 ? 's' : ''}/month</div>
      {j.industry && <div style={{ fontSize: 10.5, color: theme.good, marginBottom: 6 }}>★ close to the industry</div>}
      <button onClick={() => dispatch(takeJob, j.id)} style={btn('pri')}>Take it</button>
    </div>))}
    {tooYoung.length > 0 && <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', padding: '10px 8px 14px', opacity: .75 }}>
      {tooYoung.length} more open up as you get older.
    </div>}
    <ShiftBoard g={g} onPick={openShift} noEnergy={noEnergy} />
  </div>);
}
// Insurance and the doctor live together — the same desk you deal with when the body fails.
function HealthDesk({ g }) {
  const cur = g.insurance || 'none';
  const ill = g.illness;
  const cost = ill ? treatmentCost(g, ill) : 0;
  const canPay = (g.cash || 0) >= cost;
  return (<div>
    {ill ? (<div style={{ background: theme.panel, border: '1px solid rgba(255,90,122,.45)', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.bad, marginBottom: 5 }}>🤒 {ill.name}{ill.serious ? ' · serious' : ''}</div>
      <div style={{ fontSize: 11.5, color: theme.muted, marginBottom: 9, lineHeight: 1.5 }}>
        Month {ill.months + 1} of about {ill.left}. Drains {ill.drain} health a month{ill.freezes ? ', and nothing on your calendar moves.' : '.'}
      </div>
      <button onClick={() => dispatch(seeDoctor)} disabled={!canPay} style={{ width: '100%', border: 'none', borderRadius: 10, padding: '10px', fontSize: 12.5, fontWeight: 800,
        cursor: canPay ? 'pointer' : 'default', background: canPay ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : 'rgba(120,110,150,.15)', color: canPay ? '#fff' : '#6b6390' }}>
        Book treatment · €{cost.toLocaleString()}{cost === 0 ? ' (covered)' : ''}
      </button>
      {!canPay && <div style={{ fontSize: 11, color: theme.bad, textAlign: 'center', marginTop: 6 }}>You can't cover that right now.</div>}
    </div>) : (<div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: '14px 10px', marginBottom: 6, lineHeight: 1.6 }}>Nothing wrong with you today.</div>)}

    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 4 }}>Insurance</div>
    <div style={{ fontSize: 11.5, color: theme.muted, marginBottom: 10, lineHeight: 1.5 }}>A bill every month against a bill you can't see coming. Covers treatment and hospital.</div>
    {Object.entries(INSURANCE).map(([key, i]) => { const active = cur === key;
      return (<div key={key} style={{ background: active ? 'rgba(158,116,255,.14)' : theme.panel, border: `1px solid ${active ? theme.accent : theme.line}`, borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>{i.label}{active ? ' · current' : ''}</div>
          <div style={{ fontSize: 12.5, fontWeight: 900, color: i.premium ? theme.gold : theme.muted }}>{i.premium ? `€${i.premium}/mo` : 'free'}</div>
        </div>
        <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3 }}>{i.covers ? `Pays ${Math.round(i.covers * 100)}% of any treatment.` : 'Every bill lands on you in full.'}</div>
        {!active && <button onClick={() => dispatch(setInsurance, key)} style={{ width: '100%', border: 'none', borderRadius: 10, padding: '8px', fontSize: 12, fontWeight: 800, cursor: 'pointer', background: 'rgba(158,116,255,.18)', color: '#d9cffa', marginTop: 8 }}>Switch to this</button>}
      </div>); })}
  </div>);
}
function ShiftBoard({ g, onPick, noEnergy }) {
  return (<div style={{ borderTop: `1px solid ${theme.line}`, paddingTop: 12 }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 4 }}>One-off shifts</div>
    <div style={{ fontSize: 11.5, color: theme.muted, marginBottom: 10, lineHeight: 1.5 }}>No commitment, cash today. How well you work it decides how much you take home.</div>
    {SHIFTS.slice(0, 3).map((sh) => (<div key={sh.id} style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>{sh.title}</div>
        <div style={{ fontSize: 12, fontWeight: 900, color: theme.gold }}>~€{sh.base.toLocaleString()}</div>
      </div>
      <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 8px' }}>{sh.blurb}</div>
      <button onClick={() => onPick(sh)} disabled={noEnergy} style={{ width: '100%', border: 'none', borderRadius: 10, padding: '8px', fontSize: 12, fontWeight: 800,
        cursor: noEnergy ? 'default' : 'pointer', background: noEnergy ? 'rgba(120,110,150,.15)' : 'rgba(158,116,255,.18)', color: noEnergy ? '#6b6390' : '#d9cffa' }}>Take the shift</button>
    </div>))}
  </div>);
}
