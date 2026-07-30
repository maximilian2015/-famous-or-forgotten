import { useState } from 'react';
import { theme } from '../../ui/theme.js';
import { dispatch } from '../../state/store.js';
import { emailAct, markRead } from '../../systems/meta/email.js';
export function Email({ g }) {
  const [openId, setOpenId] = useState(null);
  const box = g.inbox || [];
  if (openId) { const m = box.find((x) => x.id === openId);
    if (m) return (<div><button onClick={() => setOpenId(null)} style={{ ...btn(), maxWidth: 120, marginBottom: 10 }}>‹ Inbox</button><div style={{ background: theme.panel2, borderRadius: 14, padding: 12 }}><div style={{ fontSize: 11, fontWeight: 900, color: theme.accent, textTransform: 'uppercase' }}>{m.from}</div><div style={{ fontSize: 14, fontWeight: 800, margin: '2px 0 6px' }}>{m.subj}</div><div style={{ fontSize: 13, lineHeight: 1.5 }}>{m.body}</div><div style={{ display: 'flex', gap: 7, marginTop: 10 }}>{(m.cta || []).map((c, i) => (<button key={i} onClick={() => { dispatch(emailAct, m.id, i); setOpenId(null); }} style={btn(i === 0 ? 'pri' : '')}>{c.label}</button>))}</div></div></div>); }
  if (!box.length) return <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: 24, lineHeight: 1.6 }}>Inbox zero.<br />Bills and invitations land here as life happens.</div>;
  return (<div>{box.map((m) => { const chip = m.kind === 'bill' ? ['bill', theme.gold] : m.tag === 'vip' ? ['VIP', theme.good] : ['invite', theme.accent];
    return (<button key={m.id} onClick={() => { dispatch(markRead, m.id); setOpenId(m.id); }} style={{ width: '100%', textAlign: 'left', background: theme.panel, border: 'none', borderRadius: 12, padding: '10px 12px', marginBottom: 8, cursor: 'pointer' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><div style={{ fontSize: 13, fontWeight: 800, color: theme.text }}>{!m.read && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#4a90ff', marginRight: 7 }} />}{m.from}</div><span style={{ fontSize: 10.5, fontWeight: 800, color: chip[1] }}>{chip[0]}</span></div><div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3 }}>{m.subj}</div></button>); })}</div>);
}
const btn = (k) => ({ flex: 1, border: 'none', borderRadius: 10, padding: '9px 8px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: k === 'pri' ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : 'rgba(158,116,255,.16)', color: k === 'pri' ? '#fff' : '#d9cffa' });
