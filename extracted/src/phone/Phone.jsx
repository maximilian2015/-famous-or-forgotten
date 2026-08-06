import { useState } from 'react';
import { theme } from '../ui/theme.js';
import { visibleApps } from './apps/registry.js';
import { Messages } from './apps/Messages.jsx';
import { OpenCall } from './apps/OpenCall.jsx';
import { News } from './apps/News.jsx';
import { Email } from './apps/Email.jsx';
import { AAA } from './apps/AAA.jsx';
import { Spotlight } from './apps/Spotlight.jsx';
import { ArcadeGame } from './apps/ArcadeGame.jsx';
import { Work } from './apps/Work.jsx';
import { Dating } from './apps/Dating.jsx';
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export function Phone({ g }) {
  const [openApp, setOpenApp] = useState(null);
  const [ocTab, setOcTab] = useState(null);
  const apps = visibleApps(g);
  const teenMode = g.stage !== 'career';
  if (openApp) {
    const app = apps.find((a) => a.id === openApp);
    if (!app) { setOpenApp(null); return null; }
    return (<div style={{ background: theme.panel, borderRadius: 22, overflow: 'hidden', border: `1px solid ${theme.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(158,116,255,.12)', borderBottom: `1px solid ${theme.line}` }}>
        <button onClick={() => setOpenApp(null)} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: '#d8cff0', borderRadius: 9, padding: '6px 11px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>‹ Apps</button>
        <div style={{ fontSize: 15, fontWeight: 900, flex: 1 }}>{app.name}</div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {Array.from({ length: g.apMaxEff || g.apMax || 3 }).map((_, i) => (<span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i < (g.ap || 0) ? theme.accent : 'rgba(255,255,255,.14)' }} />))}
        </div>
      </div>
      {/* Without this, every button in every app just goes dead and the app reads as broken —
          the "out of energy" line only ever appeared on the Home screen. */}
      {(g.ap || 0) <= 0 && <div style={{ fontSize: 11.5, color: theme.gold, textAlign: 'center', padding: '8px 12px', background: 'rgba(255,209,102,.08)', borderBottom: `1px solid ${theme.line}`, lineHeight: 1.45 }}>
        Out of energy — nothing here will respond until you live some time.
      </div>}
      <div style={{ padding: '12px 13px' }}>
        {openApp === 'messenger' && <Messages g={g} />}
        {openApp === 'opencall' && <OpenCall g={g} ocTab={ocTab} setOcTab={setOcTab} teenMode={teenMode} />}
        {openApp === 'news' && <News g={g} />}
        {openApp === 'email' && <Email g={g} />}
        {openApp === 'aaa' && <AAA g={g} />}
        {openApp === 'spotlight' && <Spotlight g={g} />}
        {openApp === 'arcade' && <ArcadeGame g={g} />}
        {openApp === 'dating' && <Dating g={g} />}
        {openApp === 'work' && <Work g={g} />}
      </div>
    </div>);
  }
  return (<div style={{ background: 'linear-gradient(170deg,#3b2d7a,#241b4d 60%,#1a1436)', borderRadius: 26, padding: '12px 14px 20px', border: `1px solid ${theme.line}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#cfc6ee', fontWeight: 800, padding: '4px 8px 14px' }}><span>{MON[g.month]} {g.year}</span><span>{g.city}</span><span>{Math.round(g.mental)}%</span></div>
    {teenMode && <div style={{ fontSize: 11, color: '#cfc6ee', textAlign: 'center', padding: '0 8px 12px', opacity: .8 }}>Your first phone. More apps unlock when you start your career.</div>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px 10px' }}>
      {apps.map((a) => { const badge = a.badge ? a.badge(g) : 0; const locked = a.lock && a.lock(g);
        return (<button key={a.id} onClick={() => setOpenApp(a.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ position: 'relative', width: 58, height: 58, borderRadius: 15, background: a.bg, boxShadow: '0 4px 12px rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: a.icon.length > 2 ? 13 : 22, fontWeight: 900, color: '#fff' }}>{a.icon}</span>
            {locked && <span style={{ position: 'absolute', inset: 0, borderRadius: 15, background: 'rgba(10,8,20,.66)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🔒</span>}
            {badge > 0 && !locked && <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 19, height: 19, borderRadius: 10, background: '#ff3b30', color: '#fff', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', border: '2px solid #241b4d' }}>{badge > 9 ? '9+' : badge}</span>}
          </div>
          <span style={{ fontSize: 10.5, color: '#e6dffb', fontWeight: 700 }}>{a.name}</span>
        </button>); })}
    </div>
  </div>);
}
