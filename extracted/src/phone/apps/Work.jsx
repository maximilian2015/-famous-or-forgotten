import { theme } from '../../ui/theme.js';
import { dispatch } from '../../state/store.js';
import { availableJobs, takeJob, quitJob, JOBS } from '../../systems/life/work.js';

export function Work({ g }) {
  const job = g.job;
  const btn = (kind) => ({ width: '100%', border: 'none', borderRadius: 10, padding: '9px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
    background: kind === 'pri' ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : kind === 'dan' ? 'rgba(255,90,122,.15)' : 'rgba(158,116,255,.16)',
    color: kind === 'pri' ? '#fff' : kind === 'dan' ? '#ffa8bb' : '#d9cffa' });

  if (job) {
    const years = Math.floor(job.months / 12), months = job.months % 12;
    return (<div>
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
      <div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', padding: '4px 10px', lineHeight: 1.5 }}>Wages land automatically each month. You don't have to do anything.</div>
    </div>);
  }

  const open = availableJobs(g);
  const tooYoung = JOBS.filter((j) => (g.ageY || 0) < j.minAge);
  return (<div>
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
    {tooYoung.length > 0 && <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', padding: '10px 8px', opacity: .75 }}>
      {tooYoung.length} more open up as you get older.
    </div>}
  </div>);
}
