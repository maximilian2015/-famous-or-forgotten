import { useState } from 'react';
import { theme } from '../ui/theme.js';
import { AppTheme } from '../ui/appTheme.js';
import { visibleApps } from './apps/registry.js';
import { Messages } from './apps/Messages.jsx';
import { OpenCall } from './apps/OpenCall.jsx';
import { News } from './apps/News.jsx';
import { Email } from './apps/Email.jsx';
import { AAA } from './apps/AAA.jsx';
import { Spotlight } from './apps/Spotlight.jsx';
import { ArcadeGame } from './apps/ArcadeGame.jsx';
import { Work } from './apps/Work.jsx';
import { Shopping } from './apps/Shopping.jsx';
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
    const accent = app.accent || theme.accent;
    return (<AppTheme.Provider value={accent}>
      <div style={{ background: `linear-gradient(180deg, ${app.wash || theme.panel} 0%, ${theme.panel} 220px)`, borderRadius: 22, overflow: 'hidden', border: `1px solid ${accent}33`, position: 'relative' }}>
      {/* the light the screen throws, plus a faint scanline so it reads as a device */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse at 50% 0%, ${accent}22, transparent 58%)` }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .16,
        backgroundImage: `repeating-linear-gradient(0deg, ${accent}00 0px, ${accent}00 2px, ${accent}55 3px, ${accent}00 4px)` }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
        background: `linear-gradient(180deg, ${accent}2e, ${accent}0d)`, borderBottom: `1px solid ${accent}44` }}>
        <button onClick={() => setOpenApp(null)} style={{ background: `${accent}26`, border: `1px solid ${accent}44`, color: '#f2ecff', borderRadius: 9, padding: '6px 11px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>‹ Apps</button>
        <div style={{ width: 22, height: 22, borderRadius: 7, background: app.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: app.icon.length > 2 ? 8 : 12, fontWeight: 900, color: '#fff', boxShadow: `0 0 12px ${accent}66` }}>{app.icon}</div>
        <div style={{ fontSize: 15, fontWeight: 900, flex: 1, color: accent, textShadow: `0 0 14px ${accent}66` }}>{app.name}</div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {Array.from({ length: g.apMaxEff || g.apMax || 3 }).map((_, i) => (<span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i < (g.ap || 0) ? accent : 'rgba(255,255,255,.14)', boxShadow: i < (g.ap || 0) ? `0 0 6px ${accent}` : 'none' }} />))}
        </div>
      </div>
      {/* Without this, every button in every app just goes dead and the app reads as broken —
          the "out of energy" line only ever appeared on the Home screen. */}
      {(g.ap || 0) <= 0 && <div style={{ fontSize: 11.5, color: theme.gold, textAlign: 'center', padding: '8px 12px', background: 'rgba(255,209,102,.08)', borderBottom: `1px solid ${theme.line}`, lineHeight: 1.45 }}>
        Out of energy — nothing here will respond until you live some time.
      </div>}
      <div style={{ position: 'relative', padding: '12px 13px' }}>
        {openApp === 'messenger' && <Messages g={g} />}
        {openApp === 'opencall' && <OpenCall g={g} ocTab={ocTab} setOcTab={setOcTab} teenMode={teenMode} />}
        {openApp === 'news' && <News g={g} />}
        {openApp === 'email' && <Email g={g} />}
        {openApp === 'aaa' && <AAA g={g} />}
        {openApp === 'spotlight' && <Spotlight g={g} />}
        {openApp === 'arcade' && <ArcadeGame g={g} />}
        {openApp === 'dating' && <Dating g={g} />}
        {openApp === 'work' && <Work g={g} />}
        {openApp === 'shopping' && <Shopping g={g} />}
      </div>
      </div>
    </AppTheme.Provider>);
  }
  return (<div style={{ position: 'relative', background: 'linear-gradient(170deg,#3b2d7a,#241b4d 60%,#1a1436)', borderRadius: 26, padding: '12px 14px 20px', border: `1px solid ${theme.line}`, overflow: 'hidden' }}>
    {/* the glass: a sweep of light across the screen and a fine grid under it */}
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .5,
      background: 'linear-gradient(115deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,0) 34%, rgba(255,255,255,0) 62%, rgba(255,255,255,.06) 100%)' }} />
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .14,
      backgroundImage: 'linear-gradient(rgba(180,150,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(180,150,255,.5) 1px, transparent 1px)',
      backgroundSize: '26px 26px' }} />
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#cfc6ee', fontWeight: 800, padding: '4px 8px 14px' }}><span>{MON[g.month]} {g.year}</span><span>{g.city}</span><span>{Math.round(g.mental)}%</span></div>
    {teenMode && <div style={{ fontSize: 11, color: '#cfc6ee', textAlign: 'center', padding: '0 8px 12px', opacity: .8 }}>Your first phone. More apps unlock when you start your career.</div>}
    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px 10px' }}>
      {apps.map((a) => { const badge = a.badge ? a.badge(g) : 0; const locked = a.lock && a.lock(g);
        return (<button key={a.id} onClick={() => setOpenApp(a.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ position: 'relative', width: 58, height: 58, borderRadius: 15, background: a.bg,
            boxShadow: locked ? '0 4px 12px rgba(0,0,0,.35)' : `0 4px 12px rgba(0,0,0,.35), 0 0 18px ${a.accent}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {/* the shine that makes a flat square look like a lit tile */}
            <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(150deg, rgba(255,255,255,.34), rgba(255,255,255,0) 46%)' }} />
            <span style={{ position: 'relative', fontSize: a.icon.length > 2 ? 13 : 22, fontWeight: 900, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,.4)' }}>{a.icon}</span>
            {locked && <span style={{ position: 'absolute', inset: 0, borderRadius: 15, background: 'rgba(10,8,20,.66)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🔒</span>}
            {badge > 0 && !locked && <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 19, height: 19, borderRadius: 10, background: '#ff3b30', color: '#fff', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', border: '2px solid #241b4d' }}>{badge > 9 ? '9+' : badge}</span>}
          </div>
          <span style={{ fontSize: 10.5, color: '#e6dffb', fontWeight: 700 }}>{a.name}</span>
        </button>); })}
    </div>
  </div>);
}
