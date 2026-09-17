import { useEffect } from 'react';
import { theme } from '../../ui/theme.js';
import { smsReply, smsReadAll } from '../../systems/social/sms.js';
import { dispatch } from '../../state/store.js';
import { canTakeSet } from '../../engine/sets.js';
import { phoneGone } from '../../systems/social/night.js';
import { acceptOffer, declineOffer, runCampaign, campaignCost } from '../../systems/career/offers.js';
import { hotGenre } from '../../systems/meta/news.js';
import { agentLine, fireAgent } from '../../systems/career/agent.js';
import { agentDropped } from '../../systems/meta/standing.js';
import { canWork } from '../../systems/life/strain.js';
import { openContract } from '../../systems/career/contract.js';
export function Messages({ g }) {
  if (phoneGone(g)) return (<div style={{ fontSize: 13, color: theme.muted, textAlign: 'center', padding: '40px 18px', lineHeight: 1.6 }}>📵 No phone.<br />It went somewhere on a night you do not remember. A new one next month — and not every number is coming back.</div>);
  const agent = g.agent && g.agent.level > 0 ? g.agent.name : null;
  const offers = g.offers || [];
  const trend = hotGenre(g);
  const al = agentLine(g);
  // Why Accept would do nothing. It used to do nothing silently: signed off, or mid-shoot, and
  // the button just sat there while the reason was printed on a different screen.
  const fit = canWork(g);
  // A banner only when NO part could start: every set full, or an exclusive one running.
  const room = canTakeSet(g, null);
  const blocked = !fit.ok ? fit.why : !room.ok && offers.some((o) => o.tier !== 'supporting' || (o.months || 0) >= 2) ? room.why : '';
  const sms = g.sms || [];
  // Opening the app is reading the texts. The reply is the only thing that costs anything.
  useEffect(() => { if (sms.some((m) => !m.read)) dispatch(smsReadAll); }, [sms.length]);
  return (<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    {/* Who represents you. They arrive by email when you are worth a desk — see agent.js. */}
    {al ? (<div style={{ background: theme.panel2, border: '1px solid ' + theme.line, borderRadius: 14, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: theme.gold, textTransform: 'uppercase' }}>Your agent · {al.name}</div>
        <div style={{ fontSize: 10.5, color: theme.muted, fontWeight: 800 }}>{al.cut}% of everything</div>
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 4 }}>{al.desk}. {al.blurb}</div>
      <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5, marginTop: 3 }}>Right now: {al.doing}.</div>
      <button onClick={() => { if (window.confirm('Let ' + al.name + ' go? Offers dry up until somebody else asks.')) dispatch(fireAgent); }} style={{ ...btn(''), marginTop: 8, fontSize: 11 }}>Let them go</button>
    </div>)
    : <div style={{ background: theme.panel2, borderRadius: 14, padding: 12 }}><div style={{ fontSize: 11, fontWeight: 900, color: theme.accent, textTransform: 'uppercase', marginBottom: 4 }}>OpenCall · System</div><div style={{ fontSize: 13, lineHeight: 1.5 }}>{agentDropped(g) ? 'No agent. Nobody represents the liability — get off the Avoided rung and somebody will ask.' : (g.fame || 0) >= 40 || (g.respect || 0) >= 50 ? 'No agent. When one wants you, the letter is in Email.' : 'No agent yet. Offers this good come through people — an agent asks at fame 40, or at standing 50 if directors know you before the public does. Until then, work the open castings.'}</div></div>}
    {/* The people in your life. Every text here was triggered by something that happened this
        month — a film that closed, a scandal, a list — see systems/social/sms.js. */}
    {sms.map((m) => (<div key={m.id} style={{ background: theme.panel2, border: '1px solid ' + theme.line, borderRadius: 14, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: theme.good, textTransform: 'uppercase' }}>💬 {m.from}</div>
        <div style={{ fontSize: 10.5, color: theme.muted }}>{monthsAgo(g, m.when)}</div>
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, marginTop: 4 }}>{m.text}</div>
      <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
        {(m.replies || []).map((r, i) => <button key={i} onClick={() => dispatch(smsReply, m.id, i)} disabled={!!r.ap && (g.ap || 0) < r.ap} style={{ ...btn(i === 0 ? 'pri' : ''), opacity: r.ap && (g.ap || 0) < r.ap ? .5 : 1 }}>{r.label}{r.ap ? ` · ${r.ap} energy` : ''}</button>)}
      </div>
    </div>))}
    {/* This told an A-lister with four films to build credits and buzz. An empty inbox
        means something different depending on who is looking at it. */}
    {!offers.length && !sms.length && <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: 24, lineHeight: 1.6 }}>
      {(g.fame || 0) >= 75 ? <>Nothing new today.<br />At your level they wait until they have something worth your name on.</>
        : (g.fame || 0) >= 40 ? <>No new offers.<br />Keep something coming out — an empty year is what makes the phone go quiet.</>
        : <>No new offers.<br />Build credits and buzz — people write to stars they can sell.</>}</div>}
    {!!offers.length && blocked && <div style={{ fontSize: 12, color: theme.bad, background: 'rgba(255,106,138,.10)', border: '1px solid rgba(255,106,138,.35)', borderRadius: 10, padding: '9px 11px', lineHeight: 1.5 }}>{blocked}</div>}
    {offers.map((o) => { const tc = o.prestigeScore >= 70 ? ['A-list', theme.good] : o.prestigeScore >= 45 ? ['Solid', theme.accent] : ['Small', theme.muted];
      const big = o.tier !== 'supporting'; const onTrend = o.genre === trend; const cost = campaignCost(o);
      return (<div key={o.id} style={{ background: theme.panel2, border: `1px solid ${theme.line}`, borderRadius: 14, padding: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: theme.accent, textTransform: 'uppercase', marginBottom: 4 }}>
          {o.kind === 'renewal' ? 'The network' : o.kind === 'sequel' ? 'The studio'
            : o.via === 'casting' ? 'Casting · you read for this'
            : o.via === 'party' ? `${o.from || 'Somebody'} · you met at a party`
            : o.via === 'pitch' ? `${o.from || 'Somebody'} · your own picture, from your own sofa`
            : o.via === 'studio' ? (o.kind === 'renewal' ? 'The network · they want you back for another season' : 'The studio · the sequel, and they want you back')
            : o.via === 'partner' ? `${(o.viaPartner || 'a friend').split(' ')[0]} got you in the room`
            : o.via === 'agent' || agent ? `${agent || 'Your agent'} · your agent brought it` : 'A producer'}
        </div>
        <div style={{ fontSize: 13 }}>{o.projectTitle} — {o.role} · {o.type}</div>
        {/* A returning show or a sequel should read as the same thing coming back. */}
        {o.note && <div style={{ fontSize: 11.5, color: theme.gold, marginTop: 5, lineHeight: 1.45 }}>{o.note}</div>}
        <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 5 }}>
          {o.episodes ? `€${o.episodeFee.toLocaleString()}/ep × ${o.episodes} = €${o.salary.toLocaleString()}` : `€${o.salary.toLocaleString()}`} · {o.months} mo · {o.signed ? (o.waitsForWrap ? 'signed — starts when a set frees up' : 'signed') : o.contract && o.contract.sent ? 'the paper is with them' : o.waitsForWrap && !canTakeSet(g, o).ok ? 'they will wait for a free set' : `answer within ${o.deadline} mo`}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {o.kind === 'renewal' && <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: 'rgba(255,209,102,.18)', color: theme.gold }}>Season {o.season}</span>}
          {o.kind === 'sequel' && <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: 'rgba(255,209,102,.18)', color: theme.gold }}>Part {o.part}{o.optioned ? ' · optioned' : ''}</span>}
          <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: 'rgba(158,116,255,.18)', color: tc[1] }}>{tc[0]}</span>
          <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: onTrend ? 'rgba(95,206,138,.18)' : 'rgba(158,116,255,.12)', color: onTrend ? theme.good : theme.muted }}>{o.genre}{onTrend ? ' · trending' : ''}</span>
          {o.campaign && <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: 'rgba(255,209,102,.18)', color: theme.gold }}>📣 campaign running</span>}
        </div>
        {big && !o.campaign && <button onClick={() => dispatch(runCampaign, o.id)} style={{ ...btn(''), width: '100%', marginTop: 8 }}>Run a campaign · €{cost.toLocaleString()}</button>}
        {big && <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 8 }}>Lead and tentpole roles go into production — you'll shoot it over {o.months} months, with real choices on set.</div>}
        <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
          {big
            ? <button onClick={() => dispatch(openContract, o.id)} disabled={!fit.ok} style={{ ...btn('pri'), opacity: !fit.ok ? .45 : 1 }}>{o.signed ? 'Signed — see the paper' : o.contract && o.contract.sent ? 'With them — see the paper' : o.contract && o.contract.round ? 'The paper came back' : 'Open the contract'}</button>
            : <button onClick={() => dispatch(acceptOffer, o.id)} disabled={!fit.ok} style={{ ...btn('pri'), opacity: !fit.ok ? .45 : 1 }}>Accept</button>}
          {!o.signed && <button onClick={() => dispatch(declineOffer, o.id)} style={btn('dan')}>Pass</button>}
        </div>
      </div>); })}
  </div>);
}
const btn = (k) => ({ flex: 1, border: 'none', borderRadius: 10, padding: '9px 8px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: k === 'pri' ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : k === 'gold' ? 'rgba(255,209,102,.18)' : k === 'dan' ? 'rgba(255,90,122,.15)' : 'rgba(158,116,255,.16)', color: k === 'pri' ? '#fff' : k === 'gold' ? theme.gold : k === 'dan' ? '#ffa8bb' : '#d9cffa' });

function monthsAgo(g, when) { const d = ((g.year || 0) * 12 + (g.month || 0)) - (when || 0); return d <= 0 ? 'this month' : d === 1 ? 'last month' : d + ' months ago'; }
