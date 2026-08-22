import { useState } from 'react';
import { useGame, dispatch, newLife } from './state/store.js';
import { advanceTime, stepIsYear } from './engine/time.js';
import { rentApartment, STAGE_LABEL } from './systems/life/stages.js';
import { runAction, availableActions } from './systems/career/actions.js';
import { acceptOffer, declineOffer } from './systems/career/offers.js';
import { computeAccess } from './systems/career/access.js';
import { SCHOOLS, train, trainingKey } from './systems/career/training.js';
import { skillCap } from './systems/career/actions.js';
import { seeDoctor, treatmentCost, pushThrough, PILLS, usePills, infectionOdds } from './systems/life/health.js';
import { resolveArc } from './systems/life/arcs.js';
import { computeLegacy, getHall } from './systems/meta/legacy.js';
import { fameTier, setHousing, FAME_TIERS } from './systems/meta/status.js';
import { rehearse, riskyTake, bondWithCrew, meterTier } from './systems/career/production.js';
import { TimingBar } from './ui/components/TimingBar.jsx';
import { GridRisk } from './ui/components/GridRisk.jsx';
import { tierById, isInvited, attendEvent, askForInvite, sneakIntoEvent, inviteHelpers, helperOdds, hasAsked } from './systems/social/events.js';
import { HOUSING, HOUSING_ORDER, monthlyCosts, DIET, GYM_COST, setDiet, toggleGym } from './engine/economy.js';
import { GENRES } from './systems/meta/news.js';
import { genreXP, genreBonus, genreLabel } from './systems/career/genres.js';
import { Phone } from './phone/Phone.jsx';
import { theme } from './ui/theme.js';
import { Button } from './ui/components/Button.jsx';
import { Card } from './ui/components/Card.jsx';
import { Stat } from './ui/components/Stat.jsx';
import { Avatar, Garment } from './ui/components/Avatar.jsx';
import { PARTIES, PARTY_ORDER, partyRisk, canThrowParty, throwParty } from './systems/life/party.js';
import { lookOf, lookOfPerson, companionOf, HAIRSTYLES, HAIR_ORDER, hairChoices, HAIR_COLORS, EYES, EYE_COLOURS, LIPS, OUTFITS, OUTFIT_ORDER, SKINS, buyHair, setHairColour, wearOutfit, ownsOutfit, DRESS_UP_AGE } from './systems/life/appearance.js';
import { classOf } from './systems/life/origin.js';
import { interactionsFor, interact, findPerson, GROUPS } from './systems/life/interactions.js';
import { relBand } from './systems/life/bonds.js';
import { BigMoment } from './ui/components/BigMoment.jsx';
import { stabilityBand } from './systems/career/stability.js';
import { strainBand, burnedOut, unreliable, depressed, seeSomebody } from './systems/life/strain.js';
import { monthsIn, slotsLost, standingOf, onMeds, SCENES, CHECKPOINTS, EVERY_MONTHS, MIN_MONTHS,
  answerCheckpoint, inRehab, enterRehab, rehabCost, therapyProgress, THERAPY_FOR_A_SLOT } from './systems/life/depression.js';
// Big moments live on state so a system can raise one; the UI only clears it.
function clearBigMoment(s) { s.bigMoment = null; return s; }
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function App() {
  const g = useGame();
  const [screen, setScreen] = useState('life');
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [showGenres, setShowGenres] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [openPerson, setOpenPerson] = useState(null);
  const [showRoom, setShowRoom] = useState(false);
  if (!g.created) return <CreatorScreen />;
  if (!g.alive) return <EndOfLifeScreen g={g} />;
  if (g.pendingArc) return <ArcModal g={g} />;
  if (showGenres) return <GenreScreen g={g} onBack={() => setShowGenres(false)} />;
  if (showHealth) return <HealthScreen g={g} onBack={() => setShowHealth(false)} />;
  if (g.bigMoment) return <BigMoment moment={g.bigMoment} look={lookOf(g)} onClose={() => dispatch(clearBigMoment)} />;
  if (g.depression?.pending) return <CheckpointModal g={g} />;
  if (showRoom) return <RoomScreen g={g} onBack={() => setShowRoom(false)} />;
  if (confirmEnd) return <EndLifeModal onCancel={() => setConfirmEnd(false)} onConfirm={() => { import('./systems/meta/legacy.js').then(m => { m.enshrine(g); newLife(); setConfirmEnd(false); }); }} />;
  return (
    <div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: theme.bg, color: theme.text, padding: 16, paddingBottom: 90, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9 }}>
          <HeaderFigures g={g} onOpen={() => setShowRoom(true)} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>{g.name}</div>
            <div style={{ fontSize: 12.5, color: theme.muted, marginTop: 3 }}>{g.ageY} yrs · {MON[g.month]} {g.year}</div>
            {/* "who is that standing next to me" should never be a question */}
            <div style={{ fontSize: 10, color: theme.accent, marginTop: 2, opacity: .75 }}>
              {companionOf(g) ? `with ${companionOf(g).person.name.split(' ')[0]} · ${companionOf(g).married ? 'married' : 'together'}` : g.city}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.accent }}>{STAGE_LABEL[g.stage]}</div>
          <div style={{ fontSize: 12, color: g.homeless ? theme.bad : theme.muted }}>
            {g.homeless ? 'On the street' : g.livingWith === 'parents' ? 'Living with parents' : g.inheritedHome ? 'The family house' : 'Own apartment'}
          </div>
        </div>
      </div>

      {screen === 'people' ? <PeopleScreen g={g} openId={openPerson} setOpenId={setOpenPerson} /> :
       screen === 'phone' ? (g.stage === 'career' || g.ageY >= 13 ? <Phone g={g} /> : <ChildPhoneLocked />) :
       screen === 'career' ? (g.stage === 'career' ? <CareerScreen g={g} />
         : g.stage === 'teen' ? <CareerScreen g={g} teenOnly />   /* teens can still take lessons */
         : <LockedScreen label="Career" />) :
       screen === 'style' ? <StyleScreen g={g} /> :
       screen === 'legacy' ? <LegacyScreen g={g} /> :
       <>
        {(g.ageY || 0) <= 1 && <OriginCard g={g} />}
        <Card style={{ marginBottom: 14, background: `linear-gradient(135deg, rgba(124,92,255,.18), rgba(158,116,255,.06))` }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: theme.accent, marginBottom: 6 }}>Right now</div>
          <StageBody g={g} />
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <Stat label="Cash" value={g.cash} money />
          <Stat label="Health" value={g.health} sub={g.illness ? `🤒 ${g.illness.name} ›` : 'tap ›'} onClick={() => setShowHealth(true)} />
          <Stat label="Mental" value={g.mental} />
          <Stat label="Fame" value={g.fame} sub={fameSub(g)} />
          <Stat label={g.dream === 'singer' ? 'Singing' : 'Acting'} value={g.dream === 'singer' ? g.singing : g.acting}
            sub={g.stage === 'career' ? 'tap for genres ›' : undefined} onClick={g.stage === 'career' ? () => setShowGenres(true) : undefined} />
          <Stat label="Charisma" value={g.charisma} />
          <Stat label="Looks" value={g.looks} />
          <Stat label="Respect" value={g.respect} />
        </div>
        {g.lastEvent && <Card style={{ marginBottom: 14, borderColor: 'rgba(255,209,102,.35)' }}><div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{g.lastEvent}</div></Card>}
        {g.illness && (<Card style={{ marginBottom: 14, borderColor: 'rgba(255,90,122,.5)' }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.bad, marginBottom: 5 }}>🤒 {g.illness.name}{g.illness.serious ? ' · serious' : ''}</div>
          <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.5, marginBottom: 9 }}>
            {g.illness.freezes ? 'Everything on your calendar is frozen until you are through this.' : 'It drains you every month, and small things left alone become big ones.'}
          </div>
          <Button kind="pri" onClick={() => setShowHealth(true)}>Deal with it ›</Button>
        </Card>)}
        {g.stage === 'career' && g.production && (<Card style={{ marginBottom: 14, borderColor: 'rgba(255,209,102,.35)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.gold }}>🎬 On set</div>
            <div style={{ fontSize: 11.5, color: theme.muted }}>{meterTier(g.production.meter).label}</div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3 }}>{g.production.title} · {g.production.monthsLeft} mo left</div>
          <div style={{ fontSize: 11, color: theme.muted, marginTop: 4 }}>Manage it from the Career tab.</div>
        </Card>)}
        {g.stage === 'career' && (g.offers || []).length > 0 && (<div style={{ marginBottom: 14 }}><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Offers</div>{g.offers.map((o) => (<Card key={o.id} style={{ marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><div style={{ fontSize: 14, fontWeight: 800 }}>{o.projectTitle}</div><div style={{ fontSize: 13, fontWeight: 900, color: theme.gold }}>€{o.salary.toLocaleString()}</div></div><div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 4px' }}>{o.role} · {o.type} · {o.months} mo · prestige {o.prestigeScore}</div>
          {/* An offer can collapse mid-shoot exactly like a casting, so it has to say how
              solid the money is before you sign, not after. */}
          <OfferBacking o={o} />
          {o.note && <div style={{ fontSize: 11, color: theme.accent, margin: '0 0 6px', lineHeight: 1.45 }}>{o.note}</div>}
          <div style={{ display: 'flex', gap: 7 }}><Button kind="pri" onClick={() => dispatch(acceptOffer, o.id)}>Accept</Button><Button kind="danger" onClick={() => dispatch(declineOffer, o.id)}>Pass</Button></div></Card>))}</div>)}
        {g.stage === 'career' && <AaaTracker g={g} />}
        <LifeCard g={g} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted }}>What now</div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><span style={{ fontSize: 10, color: theme.muted, marginRight: 4 }}>Energy</span>{Array.from({ length: g.apMaxEff || g.apMax || 3 }).map((_, i) => (<span key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: i < (g.ap || 0) ? theme.accent : 'rgba(255,255,255,.12)' }} />))}</div>
        </div>
        <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
          <DepressionCard g={g} />
          {availableActions(g).map((a) => { const noEnergy = (g.ap || 0) <= 0;
            return (<button key={a.id} onClick={() => dispatch(runAction, a.id)} disabled={noEnergy} style={{ textAlign: 'left', background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '10px 13px', cursor: noEnergy ? 'default' : 'pointer', color: theme.text, opacity: noEnergy ? .4 : 1 }}><div style={{ fontSize: 14, fontWeight: 800 }}>{a.label(g)}</div><div style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>{a.desc(g)}</div></button>); })}
          {(g.ap || 0) <= 0 && <div style={{ fontSize: 11.5, color: theme.gold, textAlign: 'center', padding: '4px 0' }}>Out of energy — live time to refresh your actions.</div>}
          {g.stage === 'career' && <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', padding: '6px 8px', lineHeight: 1.55, opacity: .85 }}>
            Auditions and shifts are in your Phone. Training and parties are under Career. Family is under People.
          </div>}
          {g.stage === 'teen' && <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', padding: '6px 8px', lineHeight: 1.55, opacity: .85 }}>
            Extra work and shifts are in your Phone. Acting lessons are under Career. These are the things you can only do once.
          </div>}
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
// Tapping Health opens the body: the bar, what you've got, and the three ways out —
// pay a doctor, push through it yourself, or reach into the medicine cabinet.
function HealthScreen({ g, onBack }) {
  const [game, setGame] = useState(null);
  const ill = g.illness;
  const cost = ill ? treatmentCost(g, ill) : 0;
  const canPay = (g.cash || 0) >= cost;
  const meds = g.meds || {};
  const h = Math.round(g.health || 0);
  const band = h >= 75 ? ['Strong', theme.good] : h >= 50 ? ['Wearing down', theme.gold] : h >= 25 ? ['Fragile', '#ff9d5a'] : ['Falling apart', theme.bad];
  const btn = (kind, off) => ({ width: '100%', border: 'none', borderRadius: 10, padding: '10px', fontSize: 12.5, fontWeight: 800, cursor: off ? 'default' : 'pointer',
    background: off ? 'rgba(120,110,150,.15)' : kind === 'pri' ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : 'rgba(158,116,255,.16)', color: off ? '#6b6390' : kind === 'pri' ? '#fff' : '#d9cffa' });
  return (<div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: theme.bg, color: theme.text, padding: 16, fontFamily: 'system-ui, sans-serif' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <button onClick={onBack} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: '#d8cff0', borderRadius: 9, padding: '6px 11px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>‹ Back</button>
      <div style={{ fontSize: 16, fontWeight: 900 }}>Your body</div>
    </div>
    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 26, fontWeight: 900 }}>{h}</div>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: band[1] }}>{band[0]}</div>
      </div>
      <div style={{ height: 9, background: 'rgba(255,255,255,.08)', borderRadius: 5, margin: '9px 0 8px' }}>
        <div style={{ width: h + '%', height: '100%', background: band[1], borderRadius: 5 }} />
      </div>
      <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5 }}>
        Health is your immune system. At {h} — with how you eat, where you live and how old you are — you catch something in roughly {Math.round(infectionOdds(g))}% of months.
      </div>
    </Card>

    {ill ? (game ? (<Card style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11.5, color: theme.gold, textAlign: 'center', marginBottom: 10, lineHeight: 1.45 }}>
        {game.kind === 'timing' ? 'Pace yourself — rest and push in the right rhythm.' : 'Get through the week day by day. Overdo it and you set yourself back.'}
      </div>
      {game.kind === 'timing'
        ? <TimingBar zoneStart={game.zoneStart} zoneWidth={game.zoneWidth} speed={game.speed} onResult={(q) => { dispatch(pushThrough, q); setGame(null); }} />
        : <GridRisk cols={4} rows={3} bad={game.bad} labelSafe="✓" labelBad="✕" onResult={(q) => { dispatch(pushThrough, q); setGame(null); }} />}
    </Card>) : (<Card style={{ marginBottom: 14, borderColor: 'rgba(255,90,122,.5)' }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.bad, marginBottom: 5 }}>🤒 {ill.name}{ill.serious ? ' · serious' : ''}</div>
      <div style={{ fontSize: 11.5, color: theme.muted, marginBottom: 4 }}>Month {ill.months + 1} of about {ill.left} · −{ill.drain} health a month</div>
      <div style={{ height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 3, margin: '6px 0 10px' }}>
        <div style={{ width: Math.min(100, ((ill.months + 1) / Math.max(1, ill.left)) * 100) + '%', height: '100%', background: theme.bad, borderRadius: 3 }} />
      </div>
      {ill.freezes && <div style={{ fontSize: 11.5, color: theme.gold, marginBottom: 10, lineHeight: 1.45 }}>❄ Your calendar is frozen — shooting and everything scheduled waits for you.</div>}
      <div style={{ display: 'grid', gap: 8 }}>
        <button onClick={() => dispatch(seeDoctor)} disabled={!canPay} style={btn('pri', !canPay)}>See a doctor · €{cost.toLocaleString()}{cost === 0 ? ' (covered)' : ''}</button>
        <button onClick={() => setGame({ kind: Math.random() < 0.5 ? 'timing' : 'grid', zoneStart: 14 + Math.random() * 58, zoneWidth: 12 + Math.random() * 7, speed: 2.2 + Math.random() * 1.5, bad: 3 + (Math.random() < 0.5 ? 1 : 0) })}
          disabled={(g.ap || 0) <= 0} style={btn('', (g.ap || 0) <= 0)}>Ride it out yourself</button>
        {(meds.antibiotics > 0) && !ill.serious && <button onClick={() => dispatch(usePills, 'antibiotics')} style={btn('')}>Take antibiotics ({meds.antibiotics})</button>}
        {(meds.painkillers > 0) && ill.freezes && <button onClick={() => dispatch(usePills, 'painkillers')} style={btn('')}>Take painkillers to keep working ({meds.painkillers})</button>}
      </div>
      {!canPay && <div style={{ fontSize: 11, color: theme.bad, textAlign: 'center', marginTop: 8 }}>Treatment is out of reach right now.</div>}
    </Card>)) : (<div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: '14px 10px 18px', lineHeight: 1.6 }}>
      Nothing wrong with you today.{(g.immuneUntil || 0) > ((g.year || 0) * 12 + (g.month || 0)) ? ' Still shrugging off the last thing.' : ''}
    </div>)}

    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Medicine you own</div>
    {Object.entries(PILLS).filter(([k]) => (meds[k] || 0) > 0).length === 0
      ? <div style={{ fontSize: 11.5, color: theme.muted, padding: '4px 2px 10px' }}>Empty. The Shop app on your phone sells the basics.</div>
      : Object.entries(PILLS).map(([k, p]) => (meds[k] || 0) > 0 && (<div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${theme.line}` }}>
          <div><div style={{ fontSize: 12.5, fontWeight: 700 }}>{p.label}</div><div style={{ fontSize: 10.5, color: theme.muted }}>{meds[k]} left</div></div>
          <button onClick={() => dispatch(usePills, k)} style={{ border: 'none', borderRadius: 9, padding: '6px 12px', fontSize: 11, fontWeight: 800, cursor: 'pointer', background: 'rgba(158,116,255,.18)', color: '#d9cffa' }}>Take one</button>
        </div>))}
    <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', padding: '14px 8px', lineHeight: 1.55 }}>Insurance is under Work → Health. It pays most of the bill when this goes badly.</div>
  </div>);
}
// Fame reads as a ladder: who you are now, and how far to the next rung.
function fameSub(g) {
  const t = fameTier(g.fame);
  const next = FAME_TIERS[FAME_TIERS.indexOf(t) + 1];
  return next ? `${t.label} · ${Math.max(1, Math.ceil(next.min - (g.fame || 0)))} to ${next.label}` : t.label;
}
// Acting isn't one number — it's the lanes you've actually worked in. Genre experience
// comes only from finished credits and pays back as a rating bonus in that genre.
function GenreScreen({ g, onBack }) {
  const key = g.dream === 'singer' ? 'Singing' : 'Acting';
  return (<div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: theme.bg, color: theme.text, padding: 16, fontFamily: 'system-ui, sans-serif' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <button onClick={onBack} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: '#d8cff0', borderRadius: 9, padding: '6px 11px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>‹ Back</button>
      <div style={{ fontSize: 16, fontWeight: 900 }}>{key} · genres</div>
    </div>
    <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.6, marginBottom: 14 }}>
      Every finished credit teaches its genre. Experience in a lane adds up to <span style={{ color: theme.gold, fontWeight: 700 }}>+10</span> to ratings when you work in it again — mastery of a lane is half a hit.
    </div>
    {GENRES.map((gr) => {
      const xp = genreXP(g, gr); const bonus = genreBonus(g, gr);
      return (<div key={gr} style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '10px 13px', marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>{gr}</div>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: bonus > 0 ? theme.gold : theme.muted }}>{bonus > 0 ? `+${bonus} to ratings` : '—'}</div>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 3, margin: '7px 0 5px' }}>
          <div style={{ width: Math.min(100, xp * 5) + '%', height: '100%', background: theme.accent, borderRadius: 3 }} />
        </div>
        <div style={{ fontSize: 11, color: theme.muted }}>{genreLabel(xp)}</div>
      </div>);
    })}
  </div>);
}
// The Home screen is a passport, not a button drawer: who you are, where you live, what
// you do for money, what's on the horizon. Actions moved to the sections they belong to.
// The state you are in after ignoring it four times. It is long and slow, so the one
// thing it must not be is opaque — the player is told exactly what moves it and which of
// those three things they are currently doing.
const softBtn = (dead) => ({ width: '100%', marginTop: 8, border: 'none', borderRadius: 10, padding: '9px',
  fontSize: 12.5, fontWeight: 800, cursor: dead ? 'default' : 'pointer',
  background: dead ? 'rgba(120,110,150,.15)' : `linear-gradient(135deg,${theme.accent2},${theme.accent})`,
  color: dead ? '#6b6390' : '#fff' });

function DepressionCard({ g }) {
  if (inRehab(g)) {
    return (<div style={{ background: 'rgba(158,116,255,.08)', border: `1px solid ${theme.line}`, borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: theme.accent }}>You are away</div>
      <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 5, lineHeight: 1.55 }}>
        {g.rehab.left} month{g.rehab.left === 1 ? '' : 's'} left. No cameras, no phone, nobody watching. When you come
        out you will have your hours back.
      </div>
    </div>);
  }
  // Cured, but it kept something. The long road back, or living with it.
  if (!depressed(g) && (g.scarred || 0) > 0) {
    const noEnergy = (g.ap || 0) <= 0, poor = (g.cash || 0) < 260, went = !!g._therapyThisMonth;
    const canRehab = (g.cash || 0) >= rehabCost(g);
    return (<div style={{ background: 'rgba(255,106,138,.06)', border: '1px solid rgba(255,106,138,.28)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: theme.bad }}>What it left behind</div>
      <div style={{ fontSize: 11.5, color: theme.muted, margin: '4px 0 8px', lineHeight: 1.55 }}>
        {g.scarred} hour{g.scarred === 1 ? '' : 's'} a month you no longer have. Two ways back, and both are expensive:
        a year in a clinic, or roughly two years of sessions for each one.
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(therapyProgress(g) / THERAPY_FOR_A_SLOT * 100)}%`, height: '100%', background: theme.accent }} />
      </div>
      <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 4 }}>{therapyProgress(g)} of {THERAPY_FOR_A_SLOT} sessions toward the next hour</div>
      <button onClick={() => dispatch(seeSomebody)} disabled={noEnergy || poor || went} style={softBtn(noEnergy || poor || went)}>
        {went ? 'You went this month' : poor ? 'An hour costs €260' : 'A session · €260 · 1 energy'}
      </button>
      <button onClick={() => dispatch(enterRehab)} disabled={!canRehab} style={{ ...softBtn(!canRehab), background: canRehab ? 'rgba(255,106,138,.18)' : 'rgba(120,110,150,.15)', color: canRehab ? theme.bad : '#6b6390' }}>
        {canRehab ? `A year in a clinic · €${rehabCost(g).toLocaleString()}` : `A clinic costs €${rehabCost(g).toLocaleString()}`}
      </button>
    </div>);
  }
  if (!depressed(g)) return null;

  const st = standingOf(g);
  const months = monthsIn(g);
  const due = Math.max(0, EVERY_MONTHS - (g.depression.windowMonths || 0));
  const line = (on, text) => (<div style={{ fontSize: 11.5, color: on ? theme.good : theme.muted, padding: '2px 0' }}>
    {on ? '✓' : '·'} {text}
  </div>);
  const noEnergy = (g.ap || 0) <= 0, poor = (g.cash || 0) < 260;
  const went = !!g.depression.sessionThisMonth;
  return (<div style={{ background: 'rgba(255,106,138,.08)', border: '1px solid rgba(255,106,138,.35)', borderRadius: 12, padding: '12px 14px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: theme.bad }}>You are not well</div>
      <div style={{ fontSize: 10.5, color: theme.muted }}>{g.depression.passed || 0} of {CHECKPOINTS} back</div>
    </div>
    <div style={{ fontSize: 11.5, color: theme.muted, margin: '4px 0 8px', lineHeight: 1.5 }}>
      {months} month{months === 1 ? '' : 's'}. It is taking {slotsLost(g)} hour{slotsLost(g) === 1 ? '' : 's'} of every month.
      {months >= MIN_MONTHS ? ` Something will come to a head in about ${due || 1} month${due === 1 ? '' : 's'}.` : ' Nothing is asked of you yet.'}
    </div>
    {st.parts.map((p) => <div key={p.id}>{line(p.on, p.label)}</div>)}
    {!onMeds(g) && <div style={{ fontSize: 11, color: theme.bad, marginTop: 6, lineHeight: 1.45 }}>
      Nothing else counts for much until you are on the medication. The Shop has it.
    </div>}
    <button onClick={() => dispatch(seeSomebody)} disabled={noEnergy || poor || went} style={softBtn(noEnergy || poor || went)}>
      {went ? 'You went this month' : poor ? 'An hour costs €260' : 'Go and talk to somebody · €260 · 1 energy'}
    </button>
  </div>);
}

// The scene that decides whether the last five months counted for anything.
function CheckpointModal({ g }) {
  const p = g.depression?.pending;
  const scene = SCENES.find((x) => x.id === p?.scene);
  if (!scene) return null;
  return (<div style={{ position: 'fixed', inset: 0, background: 'rgba(8,5,20,.96)', zIndex: 60, display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: 16, color: theme.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
    <div style={{ maxWidth: 380, width: '100%', background: theme.panel, border: `1px solid ${theme.bad}55`, borderRadius: 20, padding: '22px 20px 18px' }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.18em', textTransform: 'uppercase', color: theme.bad, marginBottom: 12, textAlign: 'center' }}>
        Five months later
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>{scene.title}</div>
      <div style={{ fontSize: 13.5, color: theme.muted, lineHeight: 1.6, marginBottom: 16 }}>{scene.body}</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {scene.choices.map((c) => (
          <button key={c.id} onClick={() => dispatch(answerCheckpoint, c.id)} style={{ textAlign: 'left',
            background: theme.panel2, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '11px 13px',
            cursor: 'pointer', color: theme.text, fontSize: 13.5, fontWeight: 700 }}>{c.label}</button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
        What you choose matters. What you have been doing for five months matters more.
      </div>
    </div>
  </div>);
}
function LifeCard({ g }) {
  const c = monthlyCosts(g);
  const income = (g.job ? g.job.pay : 0);
  const net = income - c.total;
  const row = (k, v, tint) => (<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '5px 0', borderBottom: `1px solid ${theme.line}` }}>
    <span style={{ color: theme.muted }}>{k}</span><span style={{ fontWeight: 700, color: tint || theme.text }}>{v}</span></div>);
  return (<Card style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 6 }}>Your life right now</div>
    {row('Living', g.homeless ? 'Nowhere — on the street' : g.inheritedHome ? `${HOUSING[g.housing || 'room'].label} · yours outright` : g.hasApartment ? HOUSING[g.housing || 'room'].label : "At your parents'")}
    {g.hasApartment && row('Eating', `${DIET[g.diet || 'cook'].label}${g.gym ? ' · gym' : ''}`)}
    {row('Work', g.job ? `${g.job.title} · ${g.job.employer}` : (g.stage === 'career' ? 'No job' : '—'), g.job ? theme.text : theme.muted)}
    {g.production && row('Filming', `${g.production.title} · ${g.production.monthsLeft} mo left`, theme.gold)}
    {/* The number your agent says out loud. It only means anything if you can see it. */}
    {(g.quote || 0) > 0 && row('Your quote', money(g.quote), theme.gold)}
    {/* What the work is costing you. Only shown once it is worth knowing about. */}
    {g.burnout ? row('Signed off', `${g.burnout.left} month${g.burnout.left === 1 ? '' : 's'} left`, theme.bad)
      : (g.strain || 0) >= 34 && row('Energy', strainBand(g.strain).label, (g.strain || 0) >= 82 ? theme.bad : (g.strain || 0) >= 60 ? theme.gold : theme.muted)}
    {/* Once you have shut down three sets, that is a thing about you. */}
    {unreliable(g) && row('Insurers', `${g.burnouts} shoots stopped because of you`, theme.bad)}
    {depressed(g) && row('Carrying', `${monthsIn(g)} month${monthsIn(g) === 1 ? '' : 's'} of it`, theme.bad)}
    {!depressed(g) && (g.scarred || 0) > 0 && row('It kept', `${g.scarred} hour${g.scarred === 1 ? '' : 's'} a month`, theme.bad)}
    {g.hasApartment && row('Out each month', `€${c.total.toLocaleString()}`, theme.bad)}
    {g.job && row('In each month', `€${income.toLocaleString()}`, theme.good)}
    {g.hasApartment && row('Balance', `${net >= 0 ? '+' : ''}€${net.toLocaleString()}`, net >= 0 ? theme.good : theme.bad)}
  </Card>);
}
const CAREER_TABS = [['calendar', 'Calendar'], ['training', 'Training'], ['credits', 'Credits'], ['events', 'Events']];
function CareerScreen({ g, teenOnly }) {
  const [tab, setTab] = useState(teenOnly ? 'training' : 'calendar');
  const credits = [...(g.filmography || []), ...(g.discography || [])];
  const creditsLabel = g.dream === 'singer' ? 'Discography' : 'Filmography';
  if (teenOnly) return (<div>
    <div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', padding: '2px 8px 14px', lineHeight: 1.55 }}>
      The rest of this unlocks when you move out and start working for real. Until then — get better.
    </div>
    <TrainingScreen g={g} />
  </div>);
  return (<div>
    <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
      {CAREER_TABS.map(([id, label]) => (<button key={id} onClick={() => setTab(id)} style={{ flex: 1, border: 'none', borderRadius: 10, padding: '8px 4px', fontSize: 12, fontWeight: 800, cursor: 'pointer', background: tab === id ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : 'rgba(158,116,255,.16)', color: tab === id ? '#fff' : '#d9cffa' }}>{label}</button>))}
    </div>
    {tab === 'calendar' && <><Diary g={g} />{g.production ? <ProductionCard g={g} /> : <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: '18px 10px', lineHeight: 1.6 }}>🎬 Nothing shooting.<br />Accept a Lead or Tentpole offer in Messages to fill the calendar.</div>}</>}
    {tab === 'training' && <TrainingScreen g={g} />}
    {tab === 'credits' && <CreditsList g={g} credits={credits} label={creditsLabel} />}
    {tab === 'events' && <EventsScreen g={g} />}
  </div>);
}
function PartySection({ g }) {
  const [open, setOpen] = useState(false);
  const blocked = canThrowParty(g);
  if (blocked) return <Card><div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.6 }}>{blocked}</div></Card>;
  if (!open) return (<Card>
    <div style={{ fontSize: 11.5, color: theme.muted, marginBottom: 9, lineHeight: 1.5 }}>
      Fill the place with people. How loud you go decides whether it ends with a good morning or two officers at the door.
    </div>
    <Button kind="pri" onClick={() => setOpen(true)}>Have people over ›</Button>
  </Card>);
  return (<div style={{ display: 'grid', gap: 8 }}>
    {PARTY_ORDER.map((key) => { const p = PARTIES[key]; const risk = partyRisk(g, key);
      const broke = (g.cash || 0) < p.cost; const noEnergy = (g.ap || 0) <= 0;
      return (<Card key={key}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>{p.label}</div>
          <div style={{ fontSize: 12, fontWeight: 800, color: theme.gold }}>€{p.cost.toLocaleString()}</div>
        </div>
        <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 7px' }}>{p.blurb}</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 7px', borderRadius: 7, background: 'rgba(95,206,138,.14)', color: theme.good }}>mental +</span>
          <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 7px', borderRadius: 7, background: 'rgba(95,206,138,.14)', color: theme.good }}>closeness +</span>
          <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 7px', borderRadius: 7,
            background: risk > 45 ? 'rgba(255,106,138,.16)' : 'rgba(255,209,102,.14)', color: risk > 45 ? theme.bad : theme.gold }}>{risk}% police</span>
        </div>
        <Button kind="pri" disabled={broke || noEnergy} onClick={() => { dispatch(throwParty, key); setOpen(false); }}>
          {broke ? 'You cannot afford it' : noEnergy ? 'No energy left' : 'Open the door'}
        </Button>
      </Card>); })}
    <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', padding: '2px 8px 0', lineHeight: 1.55 }}>
      Thick walls swallow noise. A rented room does not, and the landlord lives downstairs.
    </div>
    <Button onClick={() => setOpen(false)}>Not tonight</Button>
  </div>);
}
// Where the player actually lives, with the figure standing in it and everything they
// own on the shelf. The wardrobe, the medicine, the rent, the parties — one place.
// One statuette per win, standing on a real shelf. Winning something and only ever
// seeing it as a number on a results screen is not the same as owning it.
function AskerShelf({ g }) {
  const wins = g.awards?.wins || [];
  const noms = (g.awards?.nominations || []).length;
  if (!wins.length && !noms) return null;
  return (<div style={{ marginTop: 16 }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.gold, marginBottom: 6 }}>
      The mantelpiece
    </div>
    <Card>
      {wins.length > 0 ? (<>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', padding: '4px 0 10px' }}>
          {wins.slice(0, 8).map((w, i) => (
            <svg key={i} viewBox="0 0 40 64" style={{ width: 34, height: 54 }}>
              <circle cx="20" cy="12" r="7" fill={theme.gold} />
              <path d="M14 19 L26 19 L24 46 L16 46 Z" fill={theme.gold} />
              <path d="M14 20 L7 34 M26 20 L33 34" stroke={theme.gold} strokeWidth="3" strokeLinecap="round" />
              <path d="M11 46 L29 46 L31 58 L9 58 Z" fill="#3a3068" stroke={theme.gold} strokeWidth="1.4" />
            </svg>
          ))}
        </div>
        {wins.slice(0, 8).map((w, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderTop: `1px solid ${theme.line}` }}>
            <span style={{ fontWeight: 700 }}>{w.title}</span>
            <span style={{ color: theme.muted }}>{w.year}</span>
          </div>
        ))}
      </>) : (
        <div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.6 }}>
          {noms === 1 ? 'One nomination, no statuette. The certificate is in a drawer somewhere.'
            : `${noms} nominations and nothing to put on it yet. People have started to notice.`}
        </div>
      )}
    </Card>
  </div>);
}
function RoomScreen({ g, onBack }) {
  const meds = g.meds || {};
  const owned = g.look?.owned || ['tee'];
  const h = HOUSING[g.housing || 'room'];
  const wall = g.homeless ? '#171232' : g.inheritedHome ? '#2b2450' : ['room', 'studio'].includes(g.housing || 'room') ? '#241d46' : '#2d2657';
  const line = { display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '7px 0', borderBottom: `1px solid ${theme.line}` };
  return (<div style={{ position: 'fixed', inset: 0, background: theme.bg, zIndex: 40, overflowY: 'auto' }}>
    <div style={{ maxWidth: 440, margin: '0 auto', padding: 16, paddingBottom: 110 }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', color: theme.accent, marginBottom: 10 }}>Your room</div>

      <div style={{ background: wall, border: `1px solid ${theme.line}`, borderRadius: 16, padding: '14px 12px 0', position: 'relative', overflow: 'hidden' }}>
        <svg viewBox="0 0 200 120" style={{ width: '100%', display: 'block' }}>
          {g.homeless ? (<>
            <path d="M10 108 L190 108" stroke="#3a3160" strokeWidth="3" strokeLinecap="round" />
            <g transform="translate(158 20)"><path d="M0 0 L0 88" stroke="#4a3f7a" strokeWidth="3" /><circle cx="0" cy="0" r="6" fill="#ffd166" opacity=".85" /></g>
            <rect x="24" y="92" width="30" height="16" rx="3" fill="#3a3160" />
          </>) : (<>
            <rect x="0" y="0" width="200" height="96" fill="none" />
            <path d="M0 96 L200 96" stroke="#4a3f7a" strokeWidth="2" />
            <rect x="14" y="30" width="34" height="30" rx="3" fill="#ffd166" opacity=".14" stroke="#5c4f92" strokeWidth="1.5" />
            <path d="M31 30 L31 60 M14 45 L48 45" stroke="#5c4f92" strokeWidth="1.2" />
            <rect x="150" y="62" width="38" height="34" rx="2" fill="#1f1a3e" stroke="#5c4f92" strokeWidth="1.5" />
            <path d="M169 62 L169 96" stroke="#5c4f92" strokeWidth="1.2" />
            <rect x="62" y="78" width="34" height="18" rx="3" fill="#332b5e" stroke="#5c4f92" strokeWidth="1.2" />
            {['flat', 'house', 'penthouse'].includes(g.housing) && <rect x="104" y="70" width="30" height="26" rx="2" fill="#241f47" stroke="#5c4f92" strokeWidth="1.2" />}
            {(g.fame || 0) >= 55 && <><rect x="120" y="26" width="26" height="34" rx="2" fill="#3a2f6e" stroke={theme.gold} strokeWidth="1.2" /><circle cx="133" cy="38" r="5" fill={theme.gold} opacity=".5" /></>}
          </>)}
          <g transform="translate(76 32)"><Avatar look={lookOf(g)} size={64} /></g>
        </svg>
      </div>

      <Card style={{ marginTop: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 900 }}>
          {g.homeless ? 'Nowhere' : !g.hasApartment ? "Your parents' place" : h.label}{g.inheritedHome ? ' · yours outright' : ''}
        </div>
        <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, lineHeight: 1.5 }}>
          {g.homeless ? `${g.monthsOnStreet || 0} month${(g.monthsOnStreet || 0) === 1 ? '' : 's'} out here. A room costs €750 and it is the only way back in.`
            : !g.hasApartment ? 'Your old room, more or less how you left it.'
            : g.inheritedHome ? 'No rent, ever again. It came the hard way.' : h.perk}
        </div>
        {g.hasApartment && !g.inheritedHome && (<div style={{ ...line, borderBottom: 'none', paddingBottom: 0, marginTop: 8 }}>
          <span style={{ color: theme.muted }}>Rent</span>
          <span style={{ fontWeight: 800, color: (g.rentMissed || 0) > 0 ? theme.bad : theme.gold }}>
            €{h.cost.toLocaleString()}/mo{(g.rentMissed || 0) > 0 ? ' · one month behind' : ''}
          </span>
        </div>)}
      </Card>

      {/* What you actually won, in the room, where you can look at it. */}
      <AskerShelf g={g} />

      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, margin: '16px 0 6px' }}>On the shelf</div>
      <Card>
        {Object.entries(PILLS).filter(([k]) => (meds[k] || 0) > 0).length === 0
          ? <div style={{ fontSize: 12, color: theme.muted }}>No medicine. The Shop app sells the basics.</div>
          : Object.entries(PILLS).map(([k, p]) => (meds[k] || 0) > 0 && (<div key={k} style={line}>
              <span>{p.label}</span><span style={{ fontWeight: 800, color: theme.good }}>{meds[k]}</span>
            </div>))}
      </Card>

      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, margin: '16px 0 6px' }}>Your wardrobe</div>
      <Card>
        <div style={{ fontSize: 11.5, color: theme.muted, marginBottom: 10 }}>Tap to change into it. New clothes are in the Shop app.</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {owned.map((k) => { const on = (g.look?.outfit || 'tee') === k;
            return (<div key={k} onClick={() => dispatch(wearOutfit, k)} style={{ textAlign: 'center', background: theme.panel2, borderRadius: 10, padding: '8px 6px 5px', cursor: 'pointer',
              border: on ? `1px solid ${theme.gold}` : `1px solid ${theme.line}`, width: 82 }}>
              <Garment id={k} skin={lookOf(g).skin} size={58} style={{ margin: '0 auto' }} />
              <div style={{ fontSize: 9.5, color: on ? theme.gold : theme.muted, marginTop: 4, lineHeight: 1.25 }}>{OUTFITS[k]?.label || k}{on ? ' · on' : ''}</div>
            </div>); })}
        </div>
      </Card>

      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, margin: '16px 0 6px' }}>Have people over</div>
      <PartySection g={g} />

      <Button onClick={onBack} style={{ marginTop: 18 }}>Close the door</Button>
    </div>
  </div>);
}
function OriginCard({ g }) {
  if (!g.originStory) return null;
  const c = classOf(g);
  return (<Card style={{ marginBottom: 14, borderColor: 'rgba(255,209,102,.3)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', color: theme.gold }}>Where you come from</div>
      <div style={{ fontSize: 11, fontWeight: 800, color: theme.muted }}>{c.label}</div>
    </div>
    <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{g.originStory}</div>
  </Card>);
}
function HeaderFigures({ g, onOpen }) {
  const mate = companionOf(g);
  return (<div onClick={onOpen} title="Your room" style={{ display: 'flex', alignItems: 'flex-end', gap: 1, cursor: 'pointer' }}>
    <Avatar look={lookOf(g)} size={48} title={g.name} />
    {mate && <Avatar look={lookOfPerson(mate.person)} size={mate.married ? 46 : 42}
      title={`${mate.person.name} · ${mate.married ? 'spouse' : 'partner'}`}
      style={{ opacity: mate.married ? 1 : .82 }} />}
  </div>);
}
// Rent is the biggest standing bill in the game — the player has to be able to see
// exactly what the extra money buys before spending it.
function HousingEffects({ h }) {
  const chip = (text, good) => ({ key: text, text, good });
  const chips = [];
  if (h.mental) chips.push(chip(`${h.mental > 0 ? '+' : ''}${h.mental} mental / mo`, h.mental > 0));
  if (h.health) chips.push(chip(`${h.health > 0 ? '+' : ''}${h.health} health / mo`, h.health > 0));
  if (h.ill) chips.push(chip(`${h.ill > 0 ? '+' : ''}${h.ill}% illness`, h.ill < 0));
  if (h.ap) chips.push(chip(`+${h.ap} energy`, true));
  if (h.bond !== 1) chips.push(chip(`${h.bond > 1 ? '+' : ''}${Math.round((h.bond - 1) * 100)}% closeness`, h.bond > 1));
  chips.push(chip(h.kids ? 'can raise a child' : 'no room for a child', !!h.kids));
  return (<div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
    {chips.map((c) => (<span key={c.key} style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 7px', borderRadius: 7,
      background: c.good ? 'rgba(95,206,138,.14)' : 'rgba(255,106,138,.14)', color: c.good ? theme.good : theme.bad }}>{c.text}</span>))}
  </div>);
}
function StyleScreen({ g }) {
  const tier = fameTier(g.fame);
  const allowedIdx = HOUSING_ORDER.indexOf(tier.housingMax);
  const current = g.housing || 'room';
  return (<div>
    <Card style={{ marginBottom: 14, background: `linear-gradient(135deg, rgba(124,92,255,.18), rgba(158,116,255,.06))` }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: theme.accent, marginBottom: 6 }}>Your status</div>
      <div style={{ fontSize: 18, fontWeight: 900 }}>{tier.label}</div>
      <div style={{ fontSize: 12.5, color: theme.muted, marginTop: 4 }}>Fame {Math.round(g.fame || 0)}/100. The bigger the name, the better the address you can hold.</div>
    </Card>
    {!g.hasApartment && <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: '10px 12px', marginBottom: 10, lineHeight: 1.6 }}>You still live with your parents. Move out first — then this is your problem.</div>}
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Where you live</div>
    <div style={{ display: 'grid', gap: 8 }}>
      {HOUSING_ORDER.map((key, i) => {
        const h = HOUSING[key]; const locked = i > allowedIdx; const active = key === current && g.hasApartment;
        const deposit = Math.round(h.cost * 1.5); const canAfford = (g.cash || 0) >= deposit;
        return (<div key={key} style={{ background: active ? 'rgba(158,116,255,.14)' : theme.panel, border: `1px solid ${active ? theme.accent : theme.line}`, borderRadius: 12, padding: '12px 14px', opacity: locked ? .5 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{h.label}{active ? ' · you live here' : ''}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.gold }}>€{h.cost.toLocaleString()}/mo</div>
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3 }}>{h.blurb}</div>
          <div style={{ fontSize: 11.5, color: theme.text, marginTop: 6, lineHeight: 1.5, opacity: .9 }}>{h.perk}</div>
          <HousingEffects h={h} />
          {locked ? <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 6 }}>🔒 Out of your league for now.</div>
            : !active && g.hasApartment && (<>
                <div style={{ fontSize: 11, color: canAfford ? theme.muted : theme.bad, marginTop: 6 }}>Deposit €{deposit.toLocaleString()}{canAfford ? '' : ' — you cannot cover it'}</div>
                <Button onClick={() => dispatch(setHousing, key)} style={{ marginTop: 8 }}>Move in</Button>
              </>)}
        </div>); })}
    </div>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, margin: '16px 0 8px' }}>Food</div>
    <div style={{ display: 'grid', gap: 8 }}>
      {Object.entries(DIET).map(([key, d]) => { const active = (g.diet || 'cook') === key;
        return (<div key={key} style={{ background: active ? 'rgba(158,116,255,.14)' : theme.panel, border: `1px solid ${active ? theme.accent : theme.line}`, borderRadius: 12, padding: '11px 13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>{d.label}{active ? ' · now' : ''}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.gold }}>€{d.cost.toLocaleString()}/mo</div>
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3 }}>{d.blurb}</div>
          {!active && g.hasApartment && <Button onClick={() => dispatch(setDiet, key)} style={{ marginTop: 8 }}>Eat like this</Button>}
        </div>); })}
    </div>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, margin: '16px 0 8px' }}>Body</div>
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 13.5, fontWeight: 800 }}>Gym membership{g.gym ? ' · active' : ''}</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: theme.gold }}>€{GYM_COST}/mo</div>
      </div>
      <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 8px' }}>Slowly raises your looks and keeps the body in shape. Casting rooms notice.</div>
      {g.hasApartment && <Button onClick={() => dispatch(toggleGym)}>{g.gym ? 'Cancel membership' : 'Join the gym'}</Button>}
    </Card>
    <div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', padding: '14px 10px', lineHeight: 1.6 }}>These are the bills that come every month whether you are working or not. Clothes and haircuts are in the Shop app; what you already own is in your room.</div>
  </div>);
}
function LegacyScreen({ g }) {
  const gone = (g.family || []).filter((p) => !p.alive);
  return (<div>
    <LegacyPanel g={g} />
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>🕯 Graveyard</div>
      {gone.length === 0
        ? <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: '16px 10px', lineHeight: 1.6 }}>Nobody yet. Everyone you love is still here.</div>
        : gone.map((p) => (<Card key={p.id} style={{ marginBottom: 8, borderColor: 'rgba(255,255,255,.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{p.name}</div>
              <div style={{ fontSize: 11.5, color: theme.muted }}>{p.relation}</div>
            </div>
            <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3 }}>
              Died at {p.deathAge ?? p.age}{p.job && p.job !== 'retired' ? ` · was a ${p.job}` : ''} · you were {p.relationship >= 70 ? 'close' : p.relationship >= 40 ? 'in touch' : 'distant'}
            </div>
          </Card>))}
    </div>
  </div>);
}
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
// Closeness runs -100..+100, so the bar grows out from the middle: right when they
// like you, left when they do not.
function BondBar({ value, height = 5 }) {
  const v = Math.max(-100, Math.min(100, value || 0));
  const band = relBand(v);
  const colour = band.tone === 'good' ? theme.good : band.tone === 'bad' ? theme.bad : theme.accent;
  return (<div style={{ position: 'relative', height, background: 'rgba(255,255,255,.08)', borderRadius: 3, margin: '7px 0 5px' }}>
    <div style={{ position: 'absolute', left: '50%', top: -1, bottom: -1, width: 1, background: 'rgba(255,255,255,.22)' }} />
    <div style={{ position: 'absolute', top: 0, bottom: 0, borderRadius: 3, background: colour,
      left: v >= 0 ? '50%' : `${50 + v / 2}%`, width: `${Math.abs(v) / 2}%` }} />
  </div>);
}
function PersonRow({ g, p, sub, onOpen }) {
  const band = relBand(p.relationship || 0);
  return (<Card style={{ marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }} onClick={onOpen}>
    <Avatar look={lookOfPerson(p)} size={56} title={p.name} />
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>{p.name} {p.ill && <span style={{ fontSize: 11, color: theme.bad }}>· ill</span>}</div>
        <div style={{ fontSize: 12, color: theme.muted }}>{sub}</div>
      </div>
      <BondBar value={p.relationship} />
      <div style={{ fontSize: 11, fontWeight: 700, color: band.tone === 'bad' ? theme.bad : theme.accent }}>
        {band.label} · {Math.round(p.relationship || 0)} · tap to talk ›
      </div>
    </div>
  </Card>);
}
function PersonSheet({ g, id, onClose }) {
  // Whatever was on the ticker before you walked in is not about this person.
  const [before] = useState(() => g.lastEvent);
  const found = findPerson(g, id);
  if (!found) return null;
  const { p, rel } = found;
  const list = interactionsFor(g, id);
  const tone = { good: theme.good, love: '#ff8ab5', plain: theme.text, bad: theme.bad };
  return (<div style={{ position: 'fixed', inset: 0, background: theme.bg, zIndex: 40, overflowY: 'auto' }}>
    <div style={{ maxWidth: 440, margin: '0 auto', padding: 16, paddingBottom: 110 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 4 }}>
        <Avatar look={lookOfPerson(p)} size={78} title={p.name} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 19, fontWeight: 900 }}>{p.name}</div>
          <div style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>{p.relation || (rel === 'partner' ? 'Partner' : p.role)}{p.age != null ? ` · ${p.age}` : ''}{p.job ? ` · ${p.job}` : ''}</div>
          <BondBar value={p.relationship} height={6} />
          <div style={{ fontSize: 11, color: relBand(p.relationship || 0).tone === 'bad' ? theme.bad : theme.muted }}>
            {relBand(p.relationship || 0).label} · {Math.round(p.relationship || 0)}
          </div>
        </div>
      </div>
      {g.lastEvent && g.lastEvent !== before && <Card style={{ margin: '12px 0', borderColor: 'rgba(255,209,102,.3)' }}><div style={{ fontSize: 13, lineHeight: 1.5 }}>{g.lastEvent}</div></Card>}
      {GROUPS.map((grp) => { const items = list.filter((a) => a.group === grp.id); if (!items.length) return null;
        return (<div key={grp.id} style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: tone[grp.tone], marginBottom: 7, opacity: .85 }}>{grp.label}</div>
          <div style={{ display: 'grid', gap: 7 }}>
            {items.map((a) => { const off = !a.open || !!a.why;
              return (<button key={a.id} disabled={off} onClick={() => dispatch(interact, id, a.id)}
                style={{ textAlign: 'left', background: theme.panel, border: `1px solid ${off ? 'rgba(255,255,255,.06)' : theme.line}`, borderRadius: 12,
                  padding: '10px 13px', cursor: off ? 'default' : 'pointer', color: theme.text, opacity: off ? .42 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800 }}>{a.label}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: theme.gold, whiteSpace: 'nowrap' }}>
                    {a.cost ? `€${a.cost.toLocaleString()}` : ''}{a.cost && a.ap ? ' · ' : ''}{a.ap ? '1 energy' : ''}
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>{off && a.why ? a.why : a.blurb}</div>
              </button>); })}
          </div>
        </div>); })}
      <Button onClick={onClose} style={{ marginTop: 20 }}>Back to people</Button>
    </div>
  </div>);
}
function PeopleScreen({ g, openId, setOpenId }) {
  const family = (g.family || []).filter((p) => p.alive);
  const deceased = (g.family || []).filter((p) => !p.alive);
  const people = g.people || [];
  if (openId) return <PersonSheet g={g} id={openId} onClose={() => setOpenId(null)} />;
  return (<div>
    {g.partner && (<><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Partner</div>
    <PersonRow g={g} p={g.partner} sub={`${g.partner.job} · ${g.partner.age}`} onOpen={() => setOpenId(g.partner.id)} /></>)}
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, margin: '14px 0 8px' }}>Family</div>
    {family.map((p) => (<PersonRow key={p.id} g={g} p={p} sub={`${p.relation}, ${p.age}`} onOpen={() => setOpenId(p.id)} />))}
    {deceased.length > 0 && <div style={{ fontSize: 11, color: theme.muted, marginTop: 4, marginBottom: 10, opacity: .7 }}>In memory: {deceased.map((p) => `${p.name} (${p.relation})`).join(', ')}</div>}
    {people.length > 0 && (<><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, margin: '14px 0 8px' }}>Industry contacts</div>{people.map((p) => { const opensDoor = p.unlocks === 'aaa' && p.industryWeight >= 80;
      return (<PersonRow key={p.id} g={g} p={p} onOpen={() => setOpenId(p.id)}
        sub={`${p.role}${opensDoor && p.relationship >= 60 ? ' · opens A-list ★' : opensDoor ? ' · could open doors' : ''}`} />); })}</>)}
    {g.stage !== 'career' && <div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', padding: '14px 10px', opacity: .8 }}>Industry contacts start once your career begins. Keep school friends close on Spotlight — some of them go far.</div>}
  </div>);
}
const CITIES = ['Amsterdam', 'London', 'Los Angeles', 'New York', 'Paris', 'Berlin', 'Seoul', 'São Paulo'];
// 'natural' has no colour of its own — it is mixed from the skin, so show it that way.
function Swatches({ title, list, value, onPick, skin }) {
  return (<div>
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: theme.muted, marginBottom: 5 }}>{title}</div>
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {list.map((c) => (<div key={c} onClick={() => onPick(c)} title={c === 'natural' ? 'Natural' : undefined}
        style={{ width: 22, height: 22, borderRadius: '50%', cursor: 'pointer',
          background: c === 'natural' ? `linear-gradient(135deg, ${skin || '#e5bb9a'}, ${theme.panel2})` : c,
          border: value === c ? `2px solid ${theme.gold}` : '2px solid rgba(255,255,255,.14)' }} />))}
    </div>
  </div>);
}
function CreatorScreen() {
  const [name, setName] = useState('');
  const [city, setCity] = useState('Amsterdam');
  const [gender, setGender] = useState('female');
  const [startYear, setStartYear] = useState(2026);
  const [skin, setSkin] = useState(SKINS[1]);
  const [hairColor, setHairColor] = useState(HAIR_COLORS[0]);
  const [hair, setHair] = useState('long');
  const [eyes, setEyes] = useState(EYE_COLOURS[0]);
  const [lips, setLips] = useState('natural');
  const [outfit, setOutfit] = useState('tee');
  const allowedHair = hairChoices(gender);
  // Switching to a girl while wearing a beard would leave an impossible character.
  const safeHair = allowedHair.includes(hair) ? hair : 'cropped';
  const preview = { hair: safeHair, hairColor, skin, eyes, lips, outfit, age: 24, gender, sick: false };
  const label = { fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 7 };
  const pill = (on) => ({ border: 'none', borderRadius: 10, padding: '8px 12px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
    background: on ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : 'rgba(158,116,255,.16)', color: on ? '#fff' : '#d9cffa' });
  const stepBtn = { border: 'none', borderRadius: 10, width: 38, height: 34, fontSize: 17, fontWeight: 900, cursor: 'pointer', background: 'rgba(158,116,255,.16)', color: '#d9cffa' };
  return (<div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: theme.bg, color: theme.text, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', color: theme.accent, textAlign: 'center' }}>Famous or Forgotten</div>
    <div style={{ fontSize: 24, fontWeight: 900, textAlign: 'center', margin: '6px 0 4px' }}>A life begins</div>
    <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', marginBottom: 22, lineHeight: 1.5 }}>You start at birth. What you become is up to you.</div>

    <div style={{ marginBottom: 18 }}>
      <div style={label}>Name</div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Moon" maxLength={28}
        style={{ width: '100%', boxSizing: 'border-box', background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 10, padding: '11px 13px', fontSize: 14, color: theme.text, fontFamily: 'inherit' }} />
    </div>

    <div style={{ marginBottom: 18 }}>
      <div style={label}>Born</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => setStartYear((y) => Math.max(1950, y - 1))} style={stepBtn}>−</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{startYear}</div>
        <button onClick={() => setStartYear((y) => Math.min(2050, y + 1))} style={stepBtn}>+</button>
      </div>
    </div>

    <div style={{ marginBottom: 18 }}>
      <div style={label}>City</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {CITIES.map((c) => <button key={c} onClick={() => setCity(c)} style={pill(city === c)}>{c}</button>)}
      </div>
    </div>

    <div style={{ marginBottom: 18 }}>
      <div style={label}>You are</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[['female', 'Girl'], ['male', 'Boy']].map(([id, l]) => <button key={id} onClick={() => setGender(id)} style={{ ...pill(gender === id), flex: 1 }}>{l}</button>)}
      </div>
    </div>

    <div style={{ marginBottom: 22 }}>
      <div style={label}>The person</div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '12px 14px' }}>
        <Avatar look={preview} size={128} title="you" />
        <div style={{ flex: 1, display: 'grid', gap: 9 }}>
          <Swatches title="Skin" list={SKINS} value={skin} onPick={setSkin} />
          <Swatches title="Hair" list={HAIR_COLORS} value={hairColor} onPick={setHairColor} />
          <Swatches title="Eyes" list={EYE_COLOURS} value={eyes} onPick={setEyes} />
          <Swatches title="Lips" list={LIPS} value={lips} onPick={setLips} skin={skin} />
        </div>
      </div>
      <div style={{ ...label, marginTop: 12 }}>Cut</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {allowedHair.map((k) => <button key={k} onClick={() => setHair(k)} style={{ ...pill(safeHair === k), fontSize: 11.5 }}>{HAIRSTYLES[k].label}</button>)}
      </div>
      <div style={{ ...label, marginTop: 12 }}>Clothes</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {OUTFIT_ORDER.map((k) => <button key={k} onClick={() => setOutfit(k)} style={{ ...pill(outfit === k), fontSize: 11.5 }}>{OUTFITS[k].label}</button>)}
      </div>
      <div style={{ fontSize: 11, color: theme.muted, marginTop: 10, lineHeight: 1.5 }}>This is who you grow into — you start as a baby, and none of it shows until you are thirteen.</div>
    </div>

    <Button kind="pri" onClick={() => newLife({ name: name.trim() || 'Alex Moon', city, gender, startYear, created: true,
      look: { hair: safeHair, hairColor, skin, eyes, lips, outfit, owned: ['tee', outfit] } })}>Be born</Button>
    <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>Actor or singer isn't decided here — that dream finds you around age ten. Nor is the family you land in: that is rolled at birth, and it decides how hard the start is.</div>
  </div>);
}
function EndOfLifeScreen({ g }) {
  const L = computeLegacy(g);
  const hall = getHall();
  const rank = hall.findIndex((h) => h.name === g.name && h.points === L.points) + 1;
  const credits = [...(g.filmography || []), ...(g.discography || [])].filter((c) => !isMinor(c));
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
// Reads like a real filmography page: poster, title, star rating out of 10, role, year.
const POSTER_TINTS = [['#7c5cff', '#3a2a7a'], ['#c2410c', '#5a2410'], ['#0f766e', '#0a3f3a'], ['#a21caf', '#4a0f52'], ['#b45309', '#4a2506'], ['#1d4ed8', '#122a5e']];
function Poster({ title, type }) {
  let h = 0; for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  const [a, b] = POSTER_TINTS[h % POSTER_TINTS.length];
  const initials = title.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return (<div style={{ width: 42, height: 60, flex: 'none', borderRadius: 5, background: `linear-gradient(160deg, ${a}, ${b})`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,.12)' }}>
    <span style={{ fontSize: 15, fontWeight: 900, color: 'rgba(255,255,255,.85)', letterSpacing: '.02em' }}>{initials}</span>
  </div>);
}
// Grouped the way IMDb does it, which is not the same rule for everything:
// a series is ONE entry with its year range and total episodes, while films — sequels
// included — each get their own line. "Golden Echo" and "Golden Echo II" are two films.
function seriesRoot(c) {
  // Strip EVERY accumulated season suffix — old saves carry titles like
  // "Lost Signal · season 2 · season 3" from before that bug was fixed.
  return String(c.title || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim();
}
// A commercial, a voice session, a day as an extra. Real work, real money, but not the
// filmography — and giving them a score out of ten made a career of eight films look
// like a career of thirteen mediocre ones. Saves written before the flag existed are
// recognised by what the job was called.
const MINOR_TYPES = /^(Brand Campaign|Commercial|Jingle|Brand Song|TV Extra|Voice Session|Open Mic|Festival Slot|Session Work|Music Video)$/;
export function isMinor(c) { return c.minor === true || (c.minor === undefined && MINOR_TYPES.test(c.type || '')); }
function groupCredits(list) {
  const out = [];
  const shows = new Map();
  for (const c of list) {
    if (c.season) {                                   // television
      const root = seriesRoot(c);
      if (!shows.has(root)) { const g = { root, parts: [], series: true }; shows.set(root, g); out.push(g); }
      shows.get(root).parts.push(c);
    } else {                                          // film, one line each
      out.push({ root: c.title, parts: [c], series: false });
    }
  }
  return out.map((g) => {
    const best = g.parts.reduce((a, b) => ((b.rating || 0) > (a.rating || 0) ? b : a));
    const years = g.parts.map((p) => p.year).filter(Boolean);
    return { ...g, best,
      seasons: g.series ? g.parts.length : 0,
      episodes: g.series ? g.parts.reduce((n, p) => n + (p.episodes || 0), 0) : 0,
      askers: g.parts.reduce((n, p) => n + (p.asker || 0), 0),
      from: Math.min(...years), to: Math.max(...years),
      earned: g.parts.reduce((n, p) => n + (p.salary || 0), 0),
      // A franchise's gross is the whole run; a show's audience is the best season it had.
      boxOffice: g.parts.reduce((n, p) => n + (p.boxOffice || 0), 0),
      viewers: g.parts.reduce((n, p) => Math.max(n, p.viewers || 0), 0),
      worldHit: g.parts.some((p) => p.status === 'World Hit') };
  }).sort((a, b) => b.to - a.to);
}
export function money(n) {
  if (n >= 1000000000) return `€${(n / 1000000000).toFixed(2)}bn`;
  if (n >= 100000000) return `€${Math.round(n / 1000000)}m`;
  if (n >= 1000000) return `€${(n / 1000000).toFixed(1)}m`;
  return `€${Math.round(n / 1000)}k`;
}
function CreditRow({ group }) {
  const c = group.best;
  const r = c.rating || 0;
  const stars = (r / 10).toFixed(1);
  const hit = r >= 85 || group.worldHit;
  const starCol = group.worldHit ? theme.gold : r >= 85 ? theme.good : r >= 60 ? theme.gold : theme.muted;
  // IMDb writes "34 episodes" under a series and nothing under a film.
  const runs = group.series
    ? `${group.episodes || group.seasons} ${group.episodes ? 'episodes' : 'seasons'}${group.seasons > 1 ? ` · ${group.seasons} seasons` : ''}`
    : null;
  return (<div style={{ display: 'flex', gap: 11, padding: '11px 10px', borderRadius: 12, marginBottom: 6,
    // A hit should be visible from across the page, not spelled out in small print.
    background: group.worldHit ? 'linear-gradient(100deg, rgba(255,209,102,.16), rgba(255,209,102,.04))'
      : hit ? 'rgba(95,206,138,.09)' : 'transparent',
    border: `1px solid ${group.worldHit ? 'rgba(255,209,102,.45)' : hit ? 'rgba(95,206,138,.28)' : theme.line}` }}>
    <Poster title={group.root} type={c.type} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.25 }}>{group.root}</div>
        <div style={{ fontSize: 12, color: theme.muted, flex: 'none', fontVariantNumeric: 'tabular-nums' }}>
          {group.from === group.to ? group.to : `${group.from}–${group.to}`}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '4px 0 3px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: starCol }}>★ {stars}</span>
        <span style={{ fontSize: 11.5, color: theme.muted }}>{c.type}</span>
        {runs && <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase',
          color: theme.accent, background: 'rgba(158,116,255,.16)', padding: '2px 7px', borderRadius: 20 }}>{runs}</span>}
        {group.worldHit ? <span style={{ fontSize: 10, fontWeight: 900, color: theme.gold }}>🌍 WORLD HIT</span>
          : r >= 85 ? <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.06em', color: theme.good }}>HIT</span> : null}
        {/* The one mark that never comes off a credit. */}
        {group.askers > 0 && <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.06em', color: theme.gold }}>
          🏆 ASKER{group.askers > 1 ? ` ×${group.askers}` : ''}</span>}
      </div>
      <div style={{ fontSize: 11.5, color: theme.muted }}>
        {c.role}{c.genre ? ` · ${c.genre}` : ''}{group.earned > 0 ? ` · €${group.earned.toLocaleString()}` : ''}
      </div>
      {/* What it made is a separate fact from what it scored, and the industry reads it first. */}
      {(group.boxOffice > 0 || group.viewers > 0) && (
        <div style={{ fontSize: 11, marginTop: 3, display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: theme.text, fontWeight: 700 }}>
            {group.boxOffice > 0 ? `${money(group.boxOffice)} box office` : `${group.viewers}m watched`}
          </span>
          {c.verdict && <span style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: '.07em', textTransform: 'uppercase',
            color: VERDICT_COL[c.verdict] || theme.muted }}>{c.verdict}</span>}
        </div>
      )}
    </div>
  </div>);
}
const VERDICT_COL = { smash: theme.gold, profitable: theme.good, 'broke even': theme.muted, bomb: theme.bad, watched: theme.good, seen: theme.muted, ignored: theme.bad };
const BACKING_COL = { locked: theme.good, solid: theme.accent, shaky: theme.gold, fragile: theme.bad };
// The same fact the OpenCall board shows, in the one line an offer card has room for.
function OfferBacking({ o }) {
  if (o.stability == null || (o.months || 1) < 2) return null;
  const band = stabilityBand(o.stability);
  return (<div style={{ fontSize: 10.5, fontWeight: 700, color: BACKING_COL[band.id] || theme.muted, margin: '0 0 6px' }}>
    {band.label} — {band.note}
  </div>);
}
function CreditsList({ g, credits, label }) {
  const p = g.production;
  return (<div>
    {p && (<div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.gold, marginBottom: 8 }}>In production · 1</div>
      <div style={{ display: 'flex', gap: 11, padding: '10px 2px', borderBottom: `1px solid ${theme.line}`, opacity: .85 }}>
        <Poster title={p.title} type={p.type} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>{p.title}</div>
          <div style={{ fontSize: 11.5, color: theme.gold, margin: '4px 0 3px' }}>Shooting · {p.monthsLeft} mo left</div>
          <div style={{ fontSize: 11.5, color: theme.muted }}>{p.role}{p.genre ? ` · ${p.genre}` : ''}</div>
        </div>
      </div>
    </div>)}
    {/* Shot, cut, not out. The wait is half the game now — it should be visible. */}
    {(g.releases || []).length > 0 && (() => {
      const now = (g.year || 0) * 12 + (g.month || 0);
      const queue = [...g.releases].sort((a, b) => a.due - b.due);
      return (<div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.accent, marginBottom: 8 }}>
          In post · {queue.length}
        </div>
        {queue.map((r) => {
          const left = Math.max(0, r.due - now);
          return (<div key={r.id} style={{ display: 'flex', gap: 11, padding: '10px 2px', borderBottom: `1px solid ${theme.line}`, opacity: .85 }}>
            <Poster title={r.title} type={r.type} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{r.title}</div>
              <div style={{ fontSize: 11.5, color: theme.accent, margin: '4px 0 3px' }}>
                Opens in {left <= 1 ? 'weeks' : `${left} months`}
              </div>
              <div style={{ fontSize: 11.5, color: theme.muted }}>{r.role}{r.genre ? ` · ${r.genre}` : ''}</div>
            </div>
          </div>);
        })}
      </div>);
    })()}
    {/* Started, stopped, waiting for money. Not dead, not happening. */}
    {(g.frozen || []).length > 0 && (() => {
      const now = (g.year || 0) * 12 + (g.month || 0);
      return (<div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.bad, marginBottom: 8 }}>
          Frozen · {g.frozen.length}
        </div>
        {g.frozen.map((f) => {
          const waited = Math.max(0, now - (f.since || now));
          return (<div key={f.id} style={{ display: 'flex', gap: 11, padding: '10px 2px', borderBottom: `1px solid ${theme.line}`, opacity: .8 }}>
            <Poster title={f.title} type={f.type} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{f.title}</div>
              <div style={{ fontSize: 11.5, color: theme.bad, margin: '4px 0 3px' }}>
                On hold {waited === 0 ? 'since this month' : `${waited} month${waited === 1 ? '' : 's'}`} · {f.monthsLeft} mo left to shoot
              </div>
              <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.45 }}>They say {f.why}.</div>
              {/* How much longer anyone is going to hold your part open. */}
              {f.patience != null && (() => { const left = f.patience - waited;
                return (<div style={{ fontSize: 10.5, marginTop: 3, color: left <= 6 ? theme.bad : theme.muted }}>
                  {left <= 0 ? 'They have stopped waiting for you.'
                    : left <= 6 ? `They will not hold it much past ${left} more month${left === 1 ? '' : 's'}.`
                    : `They will hold your part for about ${left} more months.`}
                </div>); })()}
            </div>
          </div>);
        })}
      </div>);
    })()}
    {(() => {
      const real = credits.filter((c) => !isMinor(c));
      const odd = credits.filter(isMinor);
      const groups = groupCredits(real);
      const hits = real.filter((c) => (c.rating || 0) >= 85).length;
      const world = real.filter((c) => c.status === 'World Hit').length;
      return (<>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted }}>
            {label}{real.length ? ` · ${real.length}` : ''}
          </div>
          {hits > 0 && <div style={{ fontSize: 10.5, fontWeight: 800 }}>
            <span style={{ color: theme.good }}>{hits} hit{hits === 1 ? '' : 's'}</span>
            {world > 0 && <span style={{ color: theme.gold }}> · {world} world</span>}
          </div>}
        </div>
        {/* Two films can share a title in an old save, so the row key needs the year too. */}
        {real.length === 0
          ? <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: 20, lineHeight: 1.6 }}>Nothing released yet.<br />Audition in OpenCall, or take an offer in Messages.</div>
          : groups.map((gr, i) => <CreditRow key={`${gr.root}-${gr.to}-${i}`} group={gr} />)}
        <OtherWork list={odd} />
      </>);
    })()}
  </div>);
}
// Ads, voice sessions, days as an extra. Kept — it is part of the story of a career, and
// "I did shampoo commercials for six years" is worth remembering — but with no score and
// out of the count, because it is not a filmography.
function OtherWork({ list }) {
  const [open, setOpen] = useState(false);
  if (!list.length) return null;
  const earned = list.reduce((n, c) => n + (c.salary || 0), 0);
  return (<div style={{ marginTop: 14 }}>
    <button onClick={() => setOpen(!open)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}>
      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted }}>
        Other work · {list.length}
      </span>
      <span style={{ fontSize: 10.5, color: theme.muted, marginLeft: 8 }}>
        €{earned.toLocaleString()} · ads, voice, extra work {open ? '▾' : '▸'}
      </span>
    </button>
    {open && list.map((c, i) => (
      <div key={c.title + c.year + i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 2px', borderBottom: `1px solid ${theme.line}`, fontSize: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{c.title}</div>
          <div style={{ fontSize: 10.5, color: theme.muted }}>{c.role} · {c.type}</div>
        </div>
        <div style={{ textAlign: 'right', flex: 'none' }}>
          <div style={{ fontSize: 11, color: theme.muted, fontVariantNumeric: 'tabular-nums' }}>{c.year}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.gold }}>€{(c.salary || 0).toLocaleString()}</div>
        </div>
      </div>
    ))}
  </div>);
}
// The old prototype had a planner and Maxi missed it: twelve months ahead, with what is
// booked, what expires when, and where the free space is.
function Diary({ g }) {
  const now = (g.year || 0) * 12 + (g.month || 0);
  const cells = [];
  for (let i = 0; i < 12; i++) {
    const abs = now + i;
    const yr = Math.floor(abs / 12), mo = abs % 12;
    const shooting = g.production && i < g.production.monthsLeft;
    const parties = (g.events || []).filter((e) => e.monthsLeft - 1 === i).length;
    const deadlines = (g.offers || []).filter((o) => (o.deadline || 0) - 1 === i).length;
    // A premiere is the single most important date in the year and it was not on here.
    const premieres = (g.releases || []).filter((r) => r.due === abs);
    // Post-production is not an event — nothing happens in those months and you are free
    // to work. It gets a quiet tint so you can see the wait, not an icon of its own.
    const inPost = (g.releases || []).some((r) => r.due > abs);
    // Signed off. These months are not yours to book anything in.
    const off = g.burnout && i < (g.burnout.left || 0);
    cells.push({ i, yr, mo, shooting, parties, deadlines, premieres, inPost, off });
  }
  return (<div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>The year ahead</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 8 }}>
      {cells.map((c) => (<div key={c.i} style={{
        background: c.off ? 'rgba(255,106,138,.10)' : c.i === 0 ? 'rgba(158,116,255,.18)' : c.inPost && !c.shooting ? 'rgba(158,116,255,.07)' : theme.panel,
        border: `1px solid ${c.off ? 'rgba(255,106,138,.45)' : c.premieres.length ? 'rgba(255,209,102,.75)' : c.shooting ? 'rgba(255,209,102,.5)' : c.i === 0 ? theme.accent : theme.line}`,
        borderRadius: 9, padding: '7px 6px', minHeight: 52, opacity: c.off ? 0.75 : 1 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: c.off ? theme.bad : c.i === 0 ? theme.accent : theme.muted }}>{MON[c.mo]}{c.mo === 0 ? ` ’${String(c.yr).slice(2)}` : ''}</div>
        <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
          {c.off && <span title="signed off" style={{ fontSize: 11 }}>🚫</span>}
          {c.shooting && !c.off && <span title="shooting" style={{ fontSize: 11 }}>🎬</span>}
          {c.premieres.map((r) => <span key={r.id} title={`${r.title} opens`} style={{ fontSize: 11 }}>🍿</span>)}
          {c.parties > 0 && <span title="event expires" style={{ fontSize: 11 }}>🎉</span>}
          {c.deadlines > 0 && <span title="offer expires" style={{ fontSize: 11 }}>⏳</span>}
        </div>
        {c.premieres.length > 0 && <div style={{ fontSize: 8.5, fontWeight: 800, color: theme.gold, marginTop: 2, lineHeight: 1.2, overflow: 'hidden' }}>{c.premieres[0].title}</div>}
      </div>))}
    </div>
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', fontSize: 10.5, color: theme.muted, flexWrap: 'wrap' }}>
      <span>🎬 shooting</span><span>🍿 premiere</span><span>🎉 party ends</span><span>⏳ offer expires</span>{g.burnout && <span style={{ color: theme.bad }}>🚫 signed off</span>}
    </div>
  </div>);
}
function TrainingScreen({ g }) {
  const key = trainingKey(g);
  const skill = Math.round(g[key] || 0), cap = skillCap(g);
  const noEnergy = (g.ap || 0) <= 0;
  return (<div>
    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted }}>{key === 'singing' ? 'Singing' : 'Acting'}</div>
        <div style={{ fontSize: 13, fontWeight: 900 }}>{skill} <span style={{ color: theme.muted, fontWeight: 700 }}>/ {cap}</span></div>
      </div>
      <div style={{ height: 7, background: 'rgba(255,255,255,.08)', borderRadius: 4, margin: '8px 0 6px', position: 'relative' }}>
        <div style={{ width: cap + '%', height: '100%', background: 'rgba(158,116,255,.25)', borderRadius: 4, position: 'absolute' }} />
        <div style={{ width: skill + '%', height: '100%', background: theme.accent, borderRadius: 4, position: 'absolute' }} />
      </div>
      <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5 }}>
        {skill >= cap ? 'You have taken lessons as far as they go. Only real credits raise the ceiling now.'
          : `Teachers can take you to ${cap}. Past that it's real work that makes you better.`}
      </div>
    </Card>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Where to study</div>
    <div style={{ display: 'grid', gap: 8 }}>
      {SCHOOLS.map((sc) => { const tooPoor = (g.cash || 0) < sc.cost; const off = noEnergy || tooPoor;
        return (<div key={sc.id} style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '11px 13px', opacity: tooPoor ? .55 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>{sc.label}</div>
            <div style={{ fontSize: 12.5, fontWeight: 900, color: sc.cost ? theme.gold : theme.muted }}>{sc.cost ? `€${sc.cost.toLocaleString()}` : 'Free'}</div>
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 8px' }}>{sc.blurb} · +{sc.gain[0]}–{sc.gain[1]}{sc.mental < 0 ? ` · mental ${sc.mental}` : ''}</div>
          <button onClick={() => dispatch(train, sc.id)} disabled={off} style={{ width: '100%', border: 'none', borderRadius: 10, padding: '9px', fontSize: 12.5, fontWeight: 800,
            cursor: off ? 'default' : 'pointer', background: off ? 'rgba(120,110,150,.15)' : `linear-gradient(135deg,${theme.accent2},${theme.accent})`, color: off ? '#6b6390' : '#fff' }}>
            {tooPoor ? "Can't afford it" : 'Study'}
          </button>
        </div>); })}
    </div>
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
  return (<div style={{ marginTop: 18 }}><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Legacy</div><Card><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><div style={{ fontSize: 15, fontWeight: 900, color: theme.gold }}>{L.tier}</div><div style={{ fontSize: 13, fontWeight: 800, color: theme.muted }}>{L.points} pts</div></div><div style={{ fontSize: 11.5, color: theme.muted, marginTop: 4 }}>Peak fame {Math.round(L.peakFame)} · {L.credits} credits · {L.hits} hit{L.hits !== 1 ? 's' : ''}{L.worldHits > 0 ? ` · 🌍 ${L.worldHits} world hit${L.worldHits !== 1 ? 's' : ''}` : ''}{L.askerWins > 0 ? ` · 🏆 ${L.askerWins} Asker${L.askerWins !== 1 ? 's' : ''}` : L.askerNoms > 0 ? ` · ${L.askerNoms} Asker nom${L.askerNoms !== 1 ? 's' : ''}` : ''}</div></Card>{hall.length > 0 && <div style={{ marginTop: 10 }}><div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.muted, marginBottom: 6 }}>Hall of Fame</div>{hall.slice(0, 5).map((h, i) => (<div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: theme.muted, padding: '5px 0', borderBottom: `1px solid ${theme.line}` }}><span>{i + 1}. {h.name} · {h.tier}</span><span style={{ color: theme.gold }}>{h.points}</span></div>))}</div>}</div>);
}
function StageBody({ g }) {
  if (g.stage === 'child') return <div style={{ fontSize: 14, lineHeight: 1.55 }}>You are a kid living with your parents. School, cartoons, and the first hints of a dream. Live through the years — the real choices come when you grow up.</div>;
  if (g.stage === 'teen') return <div style={{ fontSize: 14, lineHeight: 1.55 }}>A teenager now. You daydream about being {g.dream === 'singer' ? 'on stage' : 'on screen'}. You've got your first phone, you can pick up side work, and a few years left under your parents' roof.</div>;
  // Eviction drops you back into this stage, and it is reached two very different ways.
  // Telling someone sleeping rough that staying with their parents is comfortable was
  // the single worst line in the game.
  if (g.stage === 'moving_out') return <div><div style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 10 }}>
      {g.homeless
        ? `You are ${g.ageY} and you are sleeping rough. Every month out here costs you. A room — any room — is the way back.`
        : g.livingWith === 'parents' && (g.filmography || []).length > 0
        ? `You are ${g.ageY} and back in your old bedroom. It happens to more people than admit it. Get the money together and take a room again.`
        : `You are ${g.ageY}. Staying with your parents is comfortable — and going nowhere. Take a room of your own to actually begin your path.`}
    </div>
    {!g.job && <div style={{ fontSize: 12, color: theme.gold, lineHeight: 1.5, marginBottom: 10 }}>
      {g.homeless
        ? `Take any job in your Phone — a room is €${HOUSING.room.cost} a month and nothing else is going to pay for it.`
        : `Get a job in your Phone first — rent is €${HOUSING.room.cost} every month, and nothing else is paying it.`}
    </div>}<Button kind="pri" onClick={() => dispatch(rentApartment)}>Move into a rented room · €{HOUSING.room.cost}/mo</Button></div>;
  return <div style={{ fontSize: 14, lineHeight: 1.55 }}>You have your own place and your own path. Chase auditions and offers through your Phone, build your craft, and make a name. Your story is yours to write.</div>;
}
