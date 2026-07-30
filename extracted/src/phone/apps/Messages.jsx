import { theme } from '../../ui/theme.js';
import { dispatch } from '../../state/store.js';
import { acceptOffer, declineOffer, runCampaign, campaignCost } from '../../systems/career/offers.js';
import { hotGenre } from '../../systems/meta/news.js';
export function Messages({ g }) {
  const agent = g.agent && g.agent.level > 0 ? g.agent.name : null;
  const offers = g.offers || [];
  const trend = hotGenre(g);
  return (<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    {!agent && <div style={{ background: theme.panel2, borderRadius: 14, padding: 12 }}><div style={{ fontSize: 11, fontWeight: 900, color: theme.accent, textTransform: 'uppercase', marginBottom: 4 }}>OpenCall · System</div><div style={{ fontSize: 13, lineHeight: 1.5 }}>No agent yet. Offers this good come through people. Until then, work the open castings.</div></div>}
    {!offers.length && <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: 24, lineHeight: 1.6 }}>No new offers.<br />Build credits and buzz — people write to stars they can sell.</div>}
    {offers.map((o) => { const tc = o.prestigeScore >= 70 ? ['A-list', theme.good] : o.prestigeScore >= 45 ? ['Solid', theme.accent] : ['Small', theme.muted];
      const big = o.tier !== 'supporting'; const onTrend = o.genre === trend; const cost = campaignCost(o);
      return (<div key={o.id} style={{ background: theme.panel2, border: `1px solid ${theme.line}`, borderRadius: 14, padding: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: theme.accent, textTransform: 'uppercase', marginBottom: 4 }}>{agent || 'Unknown Producer'}</div>
        <div style={{ fontSize: 13 }}>{o.projectTitle} — {o.role} · {o.type}</div>
        <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 5 }}>€{o.salary.toLocaleString()} · {o.months} mo · answer within {o.deadline} mo</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: 'rgba(158,116,255,.18)', color: tc[1] }}>{tc[0]}</span>
          <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: onTrend ? 'rgba(95,206,138,.18)' : 'rgba(158,116,255,.12)', color: onTrend ? theme.good : theme.muted }}>{o.genre}{onTrend ? ' · trending' : ''}</span>
          {o.campaign && <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: 'rgba(255,209,102,.18)', color: theme.gold }}>📣 campaign running</span>}
        </div>
        {big && !o.campaign && <button onClick={() => dispatch(runCampaign, o.id)} style={{ ...btn(''), width: '100%', marginTop: 8 }}>Run a campaign · €{cost.toLocaleString()}</button>}
        {big && <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 8 }}>Lead and tentpole roles go into production — you'll shoot it over {o.months} months, with real choices on set.</div>}
        <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
          <button onClick={() => dispatch(acceptOffer, o.id)} style={btn('pri')}>Accept</button>
          <button onClick={() => dispatch(declineOffer, o.id)} style={btn('dan')}>Pass</button>
        </div>
      </div>); })}
  </div>);
}
const btn = (k) => ({ flex: 1, border: 'none', borderRadius: 10, padding: '9px 8px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: k === 'pri' ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : k === 'gold' ? 'rgba(255,209,102,.18)' : k === 'dan' ? 'rgba(255,90,122,.15)' : 'rgba(158,116,255,.16)', color: k === 'pri' ? '#fff' : k === 'gold' ? theme.gold : k === 'dan' ? '#ffa8bb' : '#d9cffa' });
