import { useState } from 'react';
import { useGame, dispatch, newLife } from './state/store.js';
import { advanceTime, stepIsYear } from './engine/time.js';
import { rentApartment, STAGE_LABEL } from './systems/life/stages.js';
import { runAction, availableActions } from './systems/career/actions.js';
import { acceptOffer, declineOffer } from './systems/career/offers.js';
import { computeAccess } from './systems/career/access.js';
import { resolveArc } from './systems/life/arcs.js';
import { deepenRelationship } from './systems/life/relationships.js';
import { spendWithFamily } from './systems/life/family.js';
import { spendWithPartner } from './systems/life/dating.js';
import { computeLegacy, getHall } from './systems/meta/legacy.js';
import { fameTier, setLifestyle } from './systems/meta/status.js';
import { rehearse, riskyTake, bondWithCrew, meterTier } from './systems/career/production.js';
import { TimingBar } from './ui/components/TimingBar.jsx';
import { GridRisk } from './ui/components/GridRisk.jsx';
import { tierById, isInvited, attendEvent, askForInvite, sneakIntoEvent, inviteHelpers, helperOdds, hasAsked } from './systems/social/events.js';
import { LIFESTYLE, LIFESTYLE_ORDER } from './engine/economy.js';
import { Phone } from './phone/Phone.jsx';
import { theme } from './ui/theme.js';
import { Button } from './ui/components/Button.jsx';
import { Card } from './ui/components/Card.jsx';
import { Stat } from './ui/components/Stat.jsx';
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function App() {
  const g = useGame();
  const [screen, setScreen] = useState('life');
  const [confirmEnd, setConfirmEnd] = useState(false);
  if (!g.alive) return <EndOfLifeScreen g={g} />;
  if (g.pendingArc) return <ArcModal g={g} />;
  if (confirmEnd) return <EndLifeModal onCancel={() => setConfirmEnd(false)} onConfirm={() => { import('./systems/meta/legacy.js').then(m => { m.enshrine(g); newLife(); setConfirmEnd(false); }); }} />;
  return (
    <div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: theme.bg, color: theme.text, padding: 16, paddingBottom: 90, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{g.name}</div>
          <div style={{ fontSize: 12.5, color: theme.muted }}>{g.ageY} yrs · {MON[g.month]} {g.year} · {g.city}</div>
          <div style={{ fontSize: 10, color: theme.accent, marginTop: 2, opacity: .7 }}>Rebuild · Step 21</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.accent }}>{STAGE_LABEL[g.stage]}</div>
          <div style={{ fontSize: 12, color: theme.muted }}>{g.livingWith === 'parents' ? 'Living with parents' : 'Own apartment'}</div>
        </div>
      </div>

      {screen === 'people' ? <PeopleScreen g={g} /> :
       screen === 'phone' ? (g.stage === 'career' || g.ageY >= 13 ? <Phone g={g} /> : <ChildPhoneLocked />) :
       screen === 'career' ? (g.stage === 'career' ? <CareerScreen g={g} /> : <LockedScreen label="Career" />) :
       screen === 'style' ? <StyleScreen g={g} /> :
       screen === 'legacy' ? <LegacyScreen g={g} /> :
       <>
        <Card style={{ marginBottom: 14, background: `linear-gradient(135deg, rgba(124,92,255,.18), rgba(158,116,255,.06))` }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: theme.accent, marginBottom: 6 }}>Right now</div>
          <StageBody g={g} />
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <Stat label="Cash" value={g.cash} money />
          <Stat label="Health" value={g.health} />
          <Stat label="Mental" value={g.mental} />
          <Stat label="Fame" value={g.fame} sub={fameTier(g.fame).label} />
          <Stat label={g.dream === 'singer' ? 'Singing' : 'Acting'} value={g.dream === 'singer' ? g.singing : g.acting} />
          <Stat label="Charisma" value={g.charisma} />
        </div>
        {g.lastEvent && <Card style={{ marginBottom: 14, borderColor: 'rgba(255,209,102,.35)' }}><div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{g.lastEvent}</div></Card>}
        {g.stage === 'career' && g.production && (<Card style={{ marginBottom: 14, borderColor: 'rgba(255,209,102,.35)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.gold }}>🎬 On set</div>
            <div style={{ fontSize: 11.5, color: theme.muted }}>{meterTier(g.production.meter).label}</div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3 }}>{g.production.title} · {g.production.monthsLeft} mo left</div>
          <div style={{ fontSize: 11, color: theme.muted, marginTop: 4 }}>Manage it from the Career tab.</div>
        </Card>)}
        {g.stage === 'career' && (g.offers || []).length > 0 && (<div style={{ marginBottom: 14 }}><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Offers</div>{g.offers.map((o) => (<Card key={o.id} style={{ marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><div style={{ fontSize: 14, fontWeight: 800 }}>{o.projectTitle}</div><div style={{ fontSize: 13, fontWeight: 900, color: theme.gold }}>€{o.salary.toLocaleString()}</div></div><div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 8px' }}>{o.role} · {o.type} · {o.months} mo · prestige {o.prestigeScore}</div><div style={{ display: 'flex', gap: 7 }}><Button kind="pri" onClick={() => dispatch(acceptOffer, o.id)}>Accept</Button><Button kind="danger" onClick={() => dispatch(declineOffer, o.id)}>Pass</Button></div></Card>))}</div>)}
        {g.stage === 'career' && <AaaTracker g={g} />}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted }}>What now</div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><span style={{ fontSize: 10, color: theme.muted, marginRight: 4 }}>Energy</span>{Array.from({ length: g.apMax || 3 }).map((_, i) => (<span key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: i < (g.ap || 0) ? theme.accent : 'rgba(255,255,255,.12)' }} />))}</div>
        </div>
        <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
          {availableActions(g).map((a) => { const noEnergy = (g.ap || 0) <= 0;
            return (<button key={a.id} onClick={() => dispatch(runAction, a.id)} disabled={noEnergy} style={{ textAlign: 'left', background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '10px 13px', cursor: noEnergy ? 'default' : 'pointer', color: theme.text, opacity: noEnergy ? .4 : 1 }}><div style={{ fontSize: 14, fontWeight: 800 }}>{a.label(g)}</div><div style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>{a.desc(g)}</div></button>); })}
          {(g.ap || 0) <= 0 && <div style={{ fontSize: 11.5, color: theme.gold, textAlign: 'center', padding: '4px 0' }}>Out of energy — live time to refresh your actions.</div>}
        </div>
        <Button kind="pri" onClick={() => dispatch(advanceTime)}>{stepIsYear(g) ? '▶ Live one year' : '▶ Live one month'}</Button>
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Timeline</div>
          {(g.timeline || []).slice(0, 8).map((e, i) => (<div key={i} style={{ fontSize: 12.5, color: e.bad ? theme.bad : theme.text, padding: '6px 0', borderBottom: `1px solid ${theme.line}` }}><span style={{ color: theme.muted, marginRight: 8 }}>{e.when}</span>{e.text}</div>))}
          {(!g.timeline || !g.timeline.length) && <div style={{ fontSize: 12.5, color: theme.muted }}>Your story starts here. Live a year.</div>}
        </div>
        <LegacyPanel g={g} />
       </>}

      <div style={{ marginTop: 14 }}>
        <Button kind="danger" onClick={() => setConfirmEnd(true)}>End this life & start anew</Button>
      </div>
      <BottomNav screen={screen} setScreen={setScreen} g={g} />
    </div>
  );
}

const NAV = [ { id: 'life', label: 'Home', icon: '🏠' }, { id: 'career', label: 'Career', icon: '🎬' }, { id: 'people', label: 'People', icon: '❤️' }, { id: 'style', label: 'Style', icon: '🛍️' }, { id: 'legacy', label: 'Legacy', icon: '🏆' }, { id: 'phone', label: 'Phone', icon: '📱' } ];
function BottomNav({ screen, setScreen, g }) {
  return (<div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 440, margin: '0 auto', background: 'rgba(21,15,44,.96)', borderTop: `1px solid ${theme.line}`, display: 'flex', padding: '8px 6px 10px', zIndex: 40 }}>
    {NAV.map((n) => { const active = screen === n.id; const badge = n.id === 'career' && g.stage === 'career' ? (g.offers || []).length : n.id === 'phone' && g.stage === 'career' ? ((g.inbox||[]).filter(m=>!m.read).length) : 0;
      return (<button key={n.id} onClick={() => setScreen(n.id)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 0', position: 'relative' }}><span style={{ fontSize: 20, filter: active ? 'none' : 'grayscale(.4) opacity(.6)' }}>{n.icon}</span><span style={{ fontSize: 10, fontWeight: active ? 800 : 600, color: active ? theme.accent : theme.muted }}>{n.label}</span>{badge > 0 && <span style={{ position: 'absolute', top: 0, right: '26%', minWidth: 15, height: 15, borderRadius: 8, background: '#ff3b30', color: '#fff', fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>}</button>); })}
  </div>);
}
function LockedScreen({ label }) { return (<div style={{ fontSize: 13, color: theme.muted, textAlign: 'center', padding: '40px 20px', lineHeight: 1.7 }}>🔒 {label} unlocks once you move out and start your career.<br /><br />Grow up, rent your own place, and this opens up.</div>); }
function ChildPhoneLocked() { return (<div style={{ fontSize: 13, color: theme.muted, textAlign: 'center', padding: '40px 20px', lineHeight: 1.7 }}>📱 You're too young for a phone.<br /><br />You'll get your first one as a teenager (13).</div>); }
const CAREER_TABS = [['calendar', 'Calendar'], ['credits', 'Credits'], ['events', 'Events']];
function CareerScreen({ g }) {
  const [tab, setTab] = useState('calendar');
  const credits = [...(g.filmography || []), ...(g.discography || [])];
  const creditsLabel = g.dream === 'singer' ? 'Discography' : 'Filmography';
  return (<div>
    <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
      {CAREER_TABS.map(([id, label]) => (<button key={id} onClick={() => setTab(id)} style={{ flex: 1, border: 'none', borderRadius: 10, padding: '8px 4px', fontSize: 12, fontWeight: 800, cursor: 'pointer', background: tab === id ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : 'rgba(158,116,255,.16)', color: tab === id ? '#fff' : '#d9cffa' }}>{label}</button>))}
    </div>
    {tab === 'calendar' && (g.production ? <ProductionCard g={g} /> : <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: 24, lineHeight: 1.6 }}>🎬 No active production.<br /><br />Accept a Lead or Tentpole offer in Messages to start shooting.</div>)}
    {tab === 'credits' && (<div><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>{creditsLabel}</div>{credits.length === 0 ? <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: 20 }}>No credits yet. Audition through the phone's OpenCall app, or accept an offer in Messages.</div> : credits.map((c, i) => (<Card key={i} style={{ marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><div style={{ fontSize: 14, fontWeight: 800 }}>{c.title}</div><div style={{ fontSize: 13, fontWeight: 900, color: theme.gold }}>{Math.round(c.rating || 0)}</div></div><div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3 }}>{c.role} · {c.type} · {c.year} {c.status ? `· ${c.status}` : ''}</div></Card>))}</div>)}
    {tab === 'events' && <EventsScreen g={g} />}
  </div>);
}
function StyleScreen({ g }) {
  const tier = fameTier(g.fame);
  const allowedIdx = LIFESTYLE_ORDER.indexOf(tier.lifestyleMax);
  const current = g.lifestyle || 'modest';
  return (<div>
    <Card style={{ marginBottom: 14, background: `linear-gradient(135deg, rgba(124,92,255,.18), rgba(158,116,255,.06))` }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: theme.accent, marginBottom: 6 }}>Your status</div>
      <div style={{ fontSize: 18, fontWeight: 900 }}>{tier.label}</div>
      <div style={{ fontSize: 12.5, color: theme.muted, marginTop: 4 }}>Fame {Math.round(g.fame || 0)}/100. Higher status unlocks a bigger lifestyle to grow into.</div>
    </Card>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Lifestyle</div>
    <div style={{ display: 'grid', gap: 8 }}>
      {LIFESTYLE_ORDER.map((key, i) => {
        const l = LIFESTYLE[key]; const locked = i > allowedIdx; const active = key === current;
        return (<div key={key} style={{ background: active ? 'rgba(158,116,255,.14)' : theme.panel, border: `1px solid ${active ? theme.accent : theme.line}`, borderRadius: 12, padding: '12px 14px', opacity: locked ? .5 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{l.label}{active ? ' · current' : ''}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.gold }}>{l.cost ? `€${l.cost.toLocaleString()}/mo` : 'Free'}</div>
          </div>
          {locked ? <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 6 }}>🔒 Needs more fame to pull off without looking fake.</div> :
            !active && <Button onClick={() => dispatch(setLifestyle, key)} style={{ marginTop: 8 }}>Switch</Button>}
        </div>); })}
    </div>
    <div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', padding: '14px 10px', lineHeight: 1.6 }}>Living better than "Modest" gives a small mental boost each month — but costs more rent. Wardrobe items come in a later step.</div>
  </div>);
}
function LegacyScreen({ g }) { return <div><LegacyPanel g={g} /></div>; }
function ArcModal({ g }) {
  const a = g.pendingArc;
  return (<div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: theme.bg, color: theme.text, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', color: theme.accent, marginBottom: 10 }}>{a.speaker}</div><div style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>{a.text}</div><div style={{ display: 'grid', gap: 9 }}>{a.choices.map((c, i) => (<button key={i} onClick={() => dispatch(resolveArc, i)} style={{ textAlign: 'left', background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '13px 15px', cursor: 'pointer', color: theme.text, fontSize: 14, fontWeight: 700 }}>{c.label}</button>))}</div></div>);
}
function EndLifeModal({ onConfirm, onCancel }) {
  return (<div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: theme.bg, color: theme.text, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', color: theme.accent, marginBottom: 10 }}>Start a new life?</div>
    <div style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>Your current life will be enshrined in the Hall of Fame, and a brand new one begins. This can't be undone.</div>
    <div style={{ display: 'grid', gap: 9 }}>
      <button onClick={onConfirm} style={{ textAlign: 'center', background: 'rgba(255,90,122,.18)', border: '1px solid rgba(255,90,122,.4)', borderRadius: 12, padding: '13px 15px', cursor: 'pointer', color: '#ffa8bb', fontSize: 14, fontWeight: 800 }}>Yes, start anew</button>
      <button onClick={onCancel} style={{ textAlign: 'center', background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '13px 15px', cursor: 'pointer', color: theme.text, fontSize: 14, fontWeight: 700 }}>Cancel</button>
    </div>
  </div>);
}
function PeopleScreen({ g }) {
  const family = (g.family || []).filter((p) => p.alive);
  const deceased = (g.family || []).filter((p) => !p.alive);
  const people = g.people || [];
  return (<div>
    {g.partner && (<><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Partner</div>
    <Card style={{ marginBottom: 14 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><div style={{ fontSize: 14, fontWeight: 800 }}>{g.partner.name}</div><div style={{ fontSize: 12, color: theme.muted }}>closeness {g.partner.relationship}</div></div><div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 8px' }}>{g.partner.job} · {g.partner.age}</div><Button onClick={() => dispatch(spendWithPartner)}>Spend time together</Button></Card></>)}
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Family</div>
    {family.map((p) => (<Card key={p.id} style={{ marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><div style={{ fontSize: 14, fontWeight: 800 }}>{p.name} {p.ill && <span style={{ fontSize: 11, color: theme.bad }}>· ill</span>}</div><div style={{ fontSize: 12, color: theme.muted }}>{p.relation}, {p.age}</div></div><div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 8px' }}>{p.job} · closeness {p.relationship} · health {p.health}</div><Button onClick={() => dispatch(spendWithFamily, p.id)}>Spend time together</Button></Card>))}
    {deceased.length > 0 && <div style={{ fontSize: 11, color: theme.muted, marginTop: 4, marginBottom: 10, opacity: .7 }}>In memory: {deceased.map((p) => `${p.name} (${p.relation})`).join(', ')}</div>}
    {people.length > 0 && (<><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, margin: '14px 0 8px' }}>Industry contacts</div>{people.map((p) => { const opensDoor = p.unlocks === 'aaa' && p.industryWeight >= 80;
      return (<Card key={p.id} style={{ marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><div style={{ fontSize: 14, fontWeight: 800 }}>{p.name}{p.fromSchool && <span style={{ fontSize: 10.5, color: theme.accent }}> · from school</span>}</div><div style={{ fontSize: 12, color: theme.muted }}>weight {p.industryWeight}</div></div><div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 8px' }}>{p.role} · closeness {p.relationship}{opensDoor && p.relationship >= 60 ? ' · opens A-list ★' : opensDoor ? ' · could open doors' : ''}</div><Button onClick={() => dispatch(deepenRelationship, p.id)}>Spend time together</Button></Card>); })}</>)}
    {g.stage !== 'career' && <div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', padding: '14px 10px', opacity: .8 }}>Industry contacts start once your career begins. Keep school friends close on Spotlight — some of them go far.</div>}
  </div>);
}
function EndOfLifeScreen({ g }) {
  const L = computeLegacy(g);
  const hall = getHall();
  const rank = hall.findIndex((h) => h.name === g.name && h.points === L.points) + 1;
  const credits = [...(g.filmography || []), ...(g.discography || [])];
  const best = [...credits].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
  const spouse = (g.family || []).find((p) => p.relation === 'Spouse');
  const kids = (g.family || []).filter((p) => p.relation === 'Child').length;
  const row = (k, v) => (<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '5px 0', borderBottom: `1px solid ${theme.line}` }}>
    <span style={{ color: theme.muted }}>{k}</span><span style={{ fontWeight: 700 }}>{v}</span></div>);
  return (<div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: theme.bg, color: theme.text, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', color: theme.muted, textAlign: 'center', marginBottom: 10 }}>A life, ended</div>
    <div style={{ fontSize: 26, fontWeight: 900, textAlign: 'center' }}>{g.name}</div>
    <div style={{ fontSize: 13, color: theme.muted, textAlign: 'center', marginTop: 4 }}>
      {g.year - (g.deathAge || g.ageY)} — {g.deathYear || g.year} · died at {g.deathAge || g.ageY}, {g.deathCause || 'quietly'}
    </div>
    <Card style={{ margin: '18px 0 14px', background: `linear-gradient(135deg, rgba(255,209,102,.16), rgba(158,116,255,.06))`, borderColor: 'rgba(255,209,102,.35)' }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: theme.gold, textAlign: 'center' }}>{L.tier}</div>
      <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', marginTop: 3 }}>{L.points} legacy points{rank > 0 ? ` · #${rank} in the Hall of Fame` : ''}</div>
    </Card>
    <div style={{ marginBottom: 16 }}>
      {row('Peak fame', Math.round(L.peakFame))}
      {row('Credits', L.credits)}
      {row('Hits', L.hits)}
      {L.worldHits > 0 && row('🌍 World hits', L.worldHits)}
      {best && row('Best work', `${best.title} (${Math.round(best.rating)})`)}
      {row('Left behind', `€${Math.round(g.cash || 0).toLocaleString()}`)}
      {row('Family', spouse ? `${spouse.name}${kids ? ` · ${kids} child${kids > 1 ? 'ren' : ''}` : ''}` : kids ? `${kids} child${kids > 1 ? 'ren' : ''}` : 'None of their own')}
    </div>
    <div style={{ fontSize: 13, lineHeight: 1.6, color: theme.muted, textAlign: 'center', marginBottom: 20 }}>
      {L.tier === 'Forgotten' ? 'The obituaries were short. Somewhere, a few people still remember what you were trying to do.'
        : L.tier === 'Legend' ? 'They will be teaching your work long after everyone who knew you is gone.'
        : `The name still means something to the people who were paying attention.`}
    </div>
    <Button kind="pri" onClick={() => newLife()}>Begin a new life</Button>
  </div>);
}
function EventsScreen({ g }) {
  const [sneak, setSneak] = useState(null);
  const [asking, setAsking] = useState(null);
  const events = g.events || [];
  const noEnergy = (g.ap || 0) <= 0;
  const helpers = inviteHelpers(g);
  const btn = (kind) => ({ flex: 1, border: 'none', borderRadius: 10, padding: '9px', fontSize: 12.5, fontWeight: 800, cursor: noEnergy ? 'default' : 'pointer', background: noEnergy ? 'rgba(120,110,150,.15)' : kind === 'pri' ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : 'rgba(158,116,255,.16)', color: noEnergy ? '#6b6390' : kind === 'pri' ? '#fff' : '#d9cffa' });
  if (!events.length) return (<div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: 24, lineHeight: 1.6 }}>🎉 Nothing on the calendar right now.<br /><br />Parties and premieres come and go — live a month and check back.</div>);
  return (<div>
    <div style={{ fontSize: 11.5, color: theme.muted, padding: '2px 2px 10px', lineHeight: 1.5 }}>Rooms where careers actually move. Get in, meet people — some open doors, some are just good company.</div>
    {events.map((ev) => {
      const t = tierById(ev.tier); const onList = isInvited(g, ev) || ev.invited;
      return (<Card key={ev.id} style={{ marginBottom: 10, borderColor: onList ? 'rgba(95,206,138,.35)' : theme.line }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>{t.label}</div>
          <div style={{ fontSize: 11, color: theme.muted }}>{ev.monthsLeft} mo left</div>
        </div>
        <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 8px' }}>{ev.venue} · hosted by {ev.host}</div>
        {onList ? (<>
          <div style={{ fontSize: 11, color: theme.good, marginBottom: 8 }}>✓ You're on the list</div>
          <button onClick={() => dispatch(attendEvent, ev.id)} disabled={noEnergy} style={{ ...btn('pri'), width: '100%' }}>Go</button>
        </>) : sneak && sneak.id === ev.id ? (<div>
          <div style={{ fontSize: 11.5, color: theme.gold, textAlign: 'center', marginBottom: 8, lineHeight: 1.45 }}>
            {sneak.game === 'timing'
              ? 'Time your walk past the door — tap dead centre of the green.'
              : 'Pick your way through the back corridors. Some are watched. Stop while you\'re ahead.'}
          </div>
          {sneak.game === 'timing'
            ? <TimingBar zoneStart={sneak.cfg.zoneStart} zoneWidth={sneak.cfg.zoneWidth} speed={sneak.cfg.speed}
                onResult={(q) => { dispatch(sneakIntoEvent, ev.id, q); setSneak(null); }} />
            : <GridRisk cols={4} rows={3} bad={sneak.cfg.bad} labelSafe="·" labelBad="!"
                onResult={(q) => { dispatch(sneakIntoEvent, ev.id, q); setSneak(null); }} />}
        </div>) : asking === ev.id ? (<div>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase', color: theme.muted, marginBottom: 6 }}>Who could get you in?</div>
          {helpers.length === 0 && <div style={{ fontSize: 11.5, color: theme.muted, padding: '6px 0' }}>You don't know anyone who could. Network first, or try the door yourself.</div>}
          {helpers.slice(0, 4).map((p) => { const used = hasAsked(ev, p.id); const odds = Math.round(helperOdds(p));
            return (<div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${theme.line}`, opacity: used ? .45 : 1 }}>
              <div><div style={{ fontSize: 12.5, fontWeight: 700 }}>{p.name}</div><div style={{ fontSize: 10.5, color: theme.muted }}>{p.role} · closeness {p.relationship} · {used ? 'already asked' : `${odds}% shot`}</div></div>
              <button onClick={() => { dispatch(askForInvite, ev.id, p.id); setAsking(null); }} disabled={noEnergy || used} style={{ ...btn(''), flex: 'none', padding: '6px 12px', fontSize: 11, opacity: used ? .5 : 1 }}>Ask</button>
            </div>); })}
          <button onClick={() => setAsking(null)} style={{ ...btn(''), width: '100%', marginTop: 8 }}>Back</button>
        </div>) : (<>
          <div style={{ fontSize: 11, color: theme.gold, marginBottom: 8 }}>🔒 Not on the list — you'd need a way in</div>
          <div style={{ display: 'flex', gap: 7 }}>
            <button onClick={() => setAsking(ev.id)} disabled={noEnergy} style={btn('')}>Ask a contact</button>
            <button onClick={() => setSneak({ id: ev.id, game: Math.random() < 0.5 ? 'timing' : 'grid',
              cfg: { zoneStart: 12 + Math.random() * 62, zoneWidth: 9 + Math.random() * 5, speed: 2.8 + Math.random() * 1.8, bad: 4 + (Math.random() < 0.5 ? 1 : 0) } })}
              disabled={noEnergy} style={btn('')}>Talk your way in</button>
          </div>
        </>)}
      </Card>);
    })}
  </div>);
}
function ProductionCard({ g }) {
  const p = g.production; const tier = meterTier(p.meter); const noEnergy = (g.ap || 0) <= 0;
  const [minigame, setMinigame] = useState(null);
  const actBtn = (danger) => ({ flex: 1, border: 'none', borderRadius: 10, padding: '9px', fontSize: 12.5, fontWeight: 800, cursor: noEnergy ? 'default' : 'pointer', background: noEnergy ? 'rgba(120,110,150,.15)' : danger ? 'rgba(255,209,102,.18)' : `linear-gradient(135deg,${theme.accent2},${theme.accent})`, color: noEnergy ? '#6b6390' : danger ? theme.gold : '#fff' });
  function openRiskyTake() {
    setMinigame({ game: Math.random() < 0.5 ? 'timing' : 'grid',
      zoneStart: 10 + Math.random() * 64, zoneWidth: 10 + Math.random() * 6, speed: 2.6 + Math.random() * 1.6,
      bad: 3 + (Math.random() < 0.5 ? 1 : 0) });
  }
  function onMinigameResult(quality) {
    dispatch(riskyTake, quality);
    setMinigame(null);
  }
  return (<Card style={{ marginBottom: 14, borderColor: 'rgba(255,209,102,.35)' }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.gold, marginBottom: 6 }}>🎬 On set · {p.monthsLeft} mo left</div>
    <div style={{ fontSize: 15, fontWeight: 800 }}>{p.title}</div>
    <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 8px' }}>{p.role} · {p.type}</div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: theme.muted, marginBottom: 4 }}><span>Shoot quality</span><span>{tier.label} · {Math.round(p.meter)}</span></div>
    <div style={{ height: 7, background: 'rgba(255,255,255,.08)', borderRadius: 4, marginBottom: 10 }}><div style={{ width: p.meter + '%', height: '100%', background: theme.gold, borderRadius: 4 }} /></div>
    {minigame ? (<div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11.5, color: theme.gold, textAlign: 'center', marginBottom: 8, lineHeight: 1.45 }}>
        {minigame.game === 'timing' ? 'Hit your mark — tap dead centre of the green.' : 'Push the scene take by take. Some choices fall flat. Stop while it still works.'}
      </div>
      {minigame.game === 'timing'
        ? <TimingBar zoneStart={minigame.zoneStart} zoneWidth={minigame.zoneWidth} speed={minigame.speed} onResult={onMinigameResult} />
        : <GridRisk cols={4} rows={3} bad={minigame.bad} labelSafe="✓" labelBad="✕" onResult={onMinigameResult} />}
    </div>) : (<div style={{ display: 'flex', gap: 7, marginBottom: 12 }}>
      <button onClick={() => dispatch(rehearse)} disabled={noEnergy} style={actBtn(false)}>Rehearse</button>
      <button onClick={openRiskyTake} disabled={noEnergy} style={actBtn(true)}>Risky take</button>
    </div>)}
    <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.muted, marginBottom: 6 }}>Crew</div>
    {p.crew.map((c) => (<div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${theme.line}` }}>
      <div><div style={{ fontSize: 12.5, fontWeight: 700 }}>{c.name}</div><div style={{ fontSize: 10.5, color: theme.muted }}>{c.role} · {c.trait} · bond {c.bond}</div></div>
      <button onClick={() => dispatch(bondWithCrew, c.id)} disabled={noEnergy} style={{ ...actBtn(false), flex: 'none', width: 'auto', padding: '6px 10px', fontSize: 11 }}>Bond</button>
    </div>))}
  </Card>);
}
function AaaTracker({ g }) {
  const acc = computeAccess(g);
  return (<Card style={{ marginBottom: 14, borderColor: acc.aaa ? 'rgba(95,206,138,.4)' : theme.line }}><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: acc.aaa ? theme.good : theme.muted, marginBottom: 6 }}>{acc.aaa ? '★ A-list access unlocked' : 'A-list access — locked'}</div><div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.5 }}>{acc.aaa ? (acc.aaaReason === 'hit' ? 'You made a hit. Studios take your calls now.' : 'You know the right person. Doors open through them.') : 'Two ways in: land a hit (rating 85+), or befriend someone powerful in the industry (weight 80+, close ties). Either opens the tentpoles.'}</div></Card>);
}
function LegacyPanel({ g }) {
  if (g.stage === 'child' || g.stage === 'teen') return null;
  const L = computeLegacy(g); const hall = getHall();
  return (<div style={{ marginTop: 18 }}><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Legacy</div><Card><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><div style={{ fontSize: 15, fontWeight: 900, color: theme.gold }}>{L.tier}</div><div style={{ fontSize: 13, fontWeight: 800, color: theme.muted }}>{L.points} pts</div></div><div style={{ fontSize: 11.5, color: theme.muted, marginTop: 4 }}>Peak fame {Math.round(L.peakFame)} · {L.credits} credits · {L.hits} hit{L.hits !== 1 ? 's' : ''}{L.worldHits > 0 ? ` · 🌍 ${L.worldHits} world hit${L.worldHits !== 1 ? 's' : ''}` : ''}</div></Card>{hall.length > 0 && <div style={{ marginTop: 10 }}><div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.muted, marginBottom: 6 }}>Hall of Fame</div>{hall.slice(0, 5).map((h, i) => (<div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: theme.muted, padding: '5px 0', borderBottom: `1px solid ${theme.line}` }}><span>{i + 1}. {h.name} · {h.tier}</span><span style={{ color: theme.gold }}>{h.points}</span></div>))}</div>}</div>);
}
function StageBody({ g }) {
  if (g.stage === 'child') return <div style={{ fontSize: 14, lineHeight: 1.55 }}>You are a kid living with your parents. School, cartoons, and the first hints of a dream. Live through the years — the real choices come when you grow up.</div>;
  if (g.stage === 'teen') return <div style={{ fontSize: 14, lineHeight: 1.55 }}>A teenager now. You daydream about being {g.dream === 'singer' ? 'on stage' : 'on screen'}. You've got your first phone, you can pick up side work, and a few years left under your parents' roof.</div>;
  if (g.stage === 'moving_out') return <div><div style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 10 }}>You are 18. Staying with your parents is comfortable — and going nowhere. Rent your own place to actually begin your path.</div><Button kind="pri" onClick={() => dispatch(rentApartment, 800)}>Rent an apartment · €800/mo</Button></div>;
  return <div style={{ fontSize: 14, lineHeight: 1.55 }}>You have your own place and your own path. Chase auditions and offers through your Phone, build your craft, and make a name. Your story is yours to write.</div>;
}
