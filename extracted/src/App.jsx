import { useState, useEffect } from 'react';
import { openStoryRoom, pushTake } from './systems/career/story.js';
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
import { computeLegacy, getHall, heirsOf, heirOpts, enshrine } from './systems/meta/legacy.js';
import { fameTier, setHousing, FAME_TIERS, fameCeiling, ladderBlurb, TIER_OPENS, alistKey, iconKey, scandalReport, respectReport, RESPECT_MOVES, RESPECT_TIERS, RESPECT_OPENS, respectTier, FORGOTTEN, FORGOTTEN_OPENS, isForgotten, forgottenDepth } from './systems/meta/status.js';
import { rehearse, riskyTake, bondWithCrew, meterTier } from './systems/career/production.js';
import { TimingBar } from './ui/components/TimingBar.jsx';
import { GridRisk } from './ui/components/GridRisk.jsx';
import { tierById, isInvited, attendEvent, askForInvite, sneakIntoEvent, inviteHelpers, helperOdds, hasAsked } from './systems/social/events.js';
import { HOUSING, HOUSING_ORDER, monthlyCosts, DIET, GYM_COST, setDiet, toggleGym } from './engine/economy.js';
import { GENRES, hotGenre } from './systems/meta/news.js';
import { genreXP, genreBonus, genreLabel } from './systems/career/genres.js';
import { Phone } from './phone/Phone.jsx';
import { an, count } from './engine/text.js';
import { inCareer } from './engine/stage.js';
import { combo, comboOf, COMBOS } from './systems/meta/standing.js';
import { theme, setSkin, skinId, onSkinChange } from './ui/theme.js';
import { THEMES, THEME_ORDER } from './ui/skins.js';
import { FONT, FONT_DISPLAY } from './ui/chrome.js';
import { play, soundOn, setSound } from './ui/sfx.js';
import { Button } from './ui/components/Button.jsx';
import { Card } from './ui/components/Card.jsx';
import { Stat } from './ui/components/Stat.jsx';
import { Poster } from './ui/components/Poster.jsx';
import { Avatar, Garment } from './ui/components/Avatar.jsx';
import { PARTIES, PARTY_ORDER, partyRisk, canThrowParty, throwParty } from './systems/life/party.js';
import { lookOf, lookOfPerson, companionOf, HAIRSTYLES, HAIR_ORDER, hairChoices, HAIR_COLORS, EYES, EYE_COLOURS, LIPS, OUTFITS, OUTFIT_ORDER, SKINS, buyHair, setHairColour, wearOutfit, ownsOutfit, DRESS_UP_AGE } from './systems/life/appearance.js';
import { classOf } from './systems/life/origin.js';
import { mentalReport, closestPerson, canCall, callSomebody, canGetAway, getAway } from './systems/life/mood.js';
import { HOME_PRICE, canBuyHome, buyHome, sellHome, STAFF, STAFF_ORDER, hasStaff, canHire, hire, fire, staffBill,
  THINGS, THING_ORDER, owns, canBuyThing, buyThing, sellThing, resaleOf, upkeepBill,
  supportCost, canSupport, support, backingCost, canBack, backChild } from './systems/life/money.js';
import { interactionsFor, interact, findPerson, GROUPS } from './systems/life/interactions.js';
import { relBand } from './systems/life/bonds.js';
import { BigMoment } from './ui/components/BigMoment.jsx';
import { stabilityBand } from './systems/career/stability.js';
import { strainBand, burnedOut, unreliable, depressed, seeSomebody } from './systems/life/strain.js';
import { monthsIn, slotsLost, owedSlots, standingOf, onMeds, TALK, WEEK_TASKS, CHECKPOINTS, EVERY_MONTHS, MIN_MONTHS,
  answerCheckpoint, inRehab, enterRehab, rehabCost, rehabMonths, needsRehab, therapyProgress, THERAPY_FOR_A_SLOT,
  takeTheUltimatum } from './systems/life/depression.js';
import { drinkThrough, drankThisMonth, level as drinkLevel, band as drinkBand, dependent, bottlesInHouse,
  answerUltimatum, GRACE_MONTHS } from './systems/life/drink.js';
// Big moments live on state so a system can raise one; the UI only clears it.
function clearBigMoment(s) { s.bigMoment = null; return s; }
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function App() {
  const g = useGame();
  const [screen, setScreen] = useState('life');
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [showGenres, setShowGenres] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [showMental, setShowMental] = useState(false);
  const [showFame, setShowFame] = useState(false);
  const [showRespect, setShowRespect] = useState(false);
  const [openPerson, setOpenPerson] = useState(null);
  const [showRoom, setShowRoom] = useState(false);
  // theme is a live object mutated in place, so a skin change has to be turned into a
  // render by hand — nothing about it lives in game state.
  const [, bumpSkin] = useState(0);
  useEffect(() => onSkinChange(() => bumpSkin((n) => n + 1)), []);
  if (!g.created) return <CreatorScreen />;
  if (!g.alive) return <EndOfLifeScreen g={g} />;
  if (g.pendingArc) return <ArcModal g={g} />;
  if (showGenres) return <GenreScreen g={g} onBack={() => setShowGenres(false)} />;
  if (showHealth) return <HealthScreen g={g} onBack={() => setShowHealth(false)} />;
  if (showMental) return <MentalScreen g={g} onBack={() => setShowMental(false)} />;
  if (showFame) return <FameScreen g={g} onBack={() => setShowFame(false)} />;
  if (showRespect) return <RespectScreen g={g} onBack={() => setShowRespect(false)} />;
  if (g.bigMoment) return <BigMoment moment={g.bigMoment} look={lookOf(g)} onClose={() => dispatch(clearBigMoment)} />;
  if (g.depression?.pending) return <CheckpointModal g={g} />;
  if (g.drink?.pending) return <UltimatumModal g={g} />;
  if (g.production && !g.production.take) return <StoryRoom g={g} />;
  if (showRoom) return <RoomScreen g={g} onBack={() => setShowRoom(false)} />;
  if (confirmEnd) return <EndLifeModal onCancel={() => setConfirmEnd(false)} onConfirm={() => { import('./systems/meta/legacy.js').then(m => { m.enshrine(g); newLife(); setConfirmEnd(false); }); }} />;
  return (
    <div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: 'transparent', color: theme.text, padding: 16, paddingBottom: 90, fontFamily: FONT }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9 }}>
          <HeaderFigures g={g} onOpen={() => setShowRoom(true)} />
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 25, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-.01em' }}>{g.name}</div>
            {/* Keyed on the date so a month passing actually moves on screen. */}
            <div key={`${g.year}-${g.month}`} className="fof-tick" style={{ fontSize: 12.5, color: theme.muted, marginTop: 3 }}>{g.ageY} yrs · {MON[g.month]} {g.year}</div>
            {/* "who is that standing next to me" should never be a question */}
            <div style={{ fontSize: 10, color: theme.accent, marginTop: 2, opacity: .75 }}>
              {companionOf(g) ? `with ${companionOf(g).person.name.split(' ')[0]} · ${companionOf(g).married ? 'married' : 'together'}` : g.city}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {/* "Building a career" for a forty-seven-year-old A-lister was the header telling
              the player they had not got anywhere. Once the career is running, this line is
              who you ARE — and it changes, which is the whole point of the ladder. */}
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.accent }}>
            {inCareer(g) ? (isForgotten(g) ? 'Forgotten' : fameTier(g.fame).label) : STAGE_LABEL[g.stage]}</div>
          <div style={{ fontSize: 12, color: g.homeless ? theme.bad : theme.muted }}>
            {/* It said "Own apartment" to somebody living in a canal house. */}
            {g.homeless ? 'On the street' : g.livingWith === 'parents' ? 'Living with parents' : g.inheritedHome ? 'The family house' : (HOUSING[g.housing || 'room'] || {}).label || 'Own apartment'}
          </div>
        </div>
      </div>

      {/* Fame × Respect, in one line. The two ladders finally saying something together — the
          face, the actor's actor, the real thing. See systems/meta/standing.js. */}
      {inCareer(g) && comboOf(g) !== 'beginning' && screen === 'life' && <ComboStrip g={g} />}
      {/* Keyed on the tab so switching one fades and rises instead of snapping. */}
      <div key={screen} className="fof-in">
      {screen === 'people' ? <PeopleScreen g={g} openId={openPerson} setOpenId={setOpenPerson} /> :
       screen === 'phone' ? (g.stage === 'career' || g.ageY >= 13 ? <Phone g={g} /> : <ChildPhoneLocked />) :
       screen === 'career' ? (inCareer(g) ? <CareerScreen g={g} />
         : g.stage === 'teen' ? <CareerScreen g={g} teenOnly />   /* teens can still take lessons */
         : <LockedScreen label="Career" />) :
       screen === 'style' ? <StyleScreen g={g} /> :
       screen === 'legacy' ? <LegacyScreen g={g} /> :
       <>
        {(g.ageY || 0) <= 1 && <OriginCard g={g} />}
        <Card style={{ marginBottom: 14, background: `linear-gradient(150deg, ${theme.accent}20, ${theme.accent}06)`, borderColor: `${theme.accent}30` }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: theme.accent, marginBottom: 6 }}>Right now</div>
          <StageBody g={g} />
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <Stat label="Cash" value={g.cash} money />
          <Stat vital label="Health" value={g.health} sub={g.illness ? `🤒 ${g.illness.name} ›` : 'tap ›'} onClick={() => setShowHealth(true)} />
          <Stat vital label="Mental" value={g.mental} sub="tap ›" onClick={() => setShowMental(true)} />
          <Stat label="Fame" value={g.fame} sub={fameSub(g)} onClick={() => setShowFame(true)} />
          <Stat label={g.dream === 'singer' ? 'Singing' : 'Acting'} value={g.dream === 'singer' ? g.singing : g.acting}
            sub={inCareer(g) ? 'tap for genres ›' : undefined} onClick={inCareer(g) ? () => setShowGenres(true) : undefined} />
          <Stat label="Charisma" value={g.charisma} />
          <Stat label="Looks" value={g.looks} />
          <Stat label="Respect" value={g.respect} sub="tap ›" onClick={() => setShowRespect(true)} />
        </div>
        {g.lastEvent && <Card style={{ marginBottom: 14, borderColor: 'rgba(255,209,102,.35)' }}><div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{g.lastEvent}</div></Card>}
        {g.illness && (<Card style={{ marginBottom: 14, borderColor: 'rgba(255,90,122,.5)' }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.bad, marginBottom: 5 }}>🤒 {g.illness.name}{g.illness.serious ? ' · serious' : ''}</div>
          <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.5, marginBottom: 9 }}>
            {g.illness.freezes ? 'Everything on your calendar is frozen until you are through this.' : 'It drains you every month, and small things left alone become big ones.'}
          </div>
          <Button kind="pri" onClick={() => setShowHealth(true)}>Deal with it ›</Button>
        </Card>)}
        {inCareer(g) && g.production && (<Card style={{ marginBottom: 14, borderColor: 'rgba(255,209,102,.35)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.gold }}>🎬 On set</div>
            <div style={{ fontSize: 11.5, color: theme.muted }}>{meterTier(g.production.meter).label}</div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3 }}>{g.production.title} · {g.production.monthsLeft} mo left</div>
          {/* The card used to say "Manage it from the Career tab" and nothing else, so a player
              who pressed Live one month from here skipped the month's rehearsal without
              ever knowing there was one to skip — and the director's opinion, the thing
              that actually cools, was not shown anywhere at all. Both are here now. */}
          <OnSetNow g={g} />
        </Card>)}
        {inCareer(g) && (g.offers || []).length > 0 && (<div style={{ marginBottom: 14 }}><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Offers</div>{g.offers.map((o) => (<Card key={o.id} style={{ marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><div style={{ fontSize: 14, fontWeight: 800 }}>{o.projectTitle}</div><div style={{ fontSize: 13, fontWeight: 900, color: theme.gold }}>€{o.salary.toLocaleString()}</div></div><div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 4px' }}>{o.role} · {o.type} · {o.months} mo · prestige {o.prestigeScore}</div>
          {/* An offer can collapse mid-shoot exactly like a casting, so it has to say how
              solid the money is before you sign, not after. */}
          <OfferBacking o={o} />
          {o.note && <div style={{ fontSize: 11, color: theme.accent, margin: '0 0 6px', lineHeight: 1.45 }}>{o.note}</div>}
          <div style={{ display: 'flex', gap: 7 }}><Button kind="pri" onClick={() => dispatch(acceptOffer, o.id)}>Accept</Button><Button kind="danger" onClick={() => dispatch(declineOffer, o.id)}>Pass</Button></div></Card>))}</div>)}
        {inCareer(g) && <AaaTracker g={g} />}
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
          {inCareer(g) && <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', padding: '6px 8px', lineHeight: 1.55, opacity: .85 }}>
            Auditions and shifts are in your Phone. Training and parties are under Career. Family is under People.
          </div>}
          {g.stage === 'teen' && <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', padding: '6px 8px', lineHeight: 1.55, opacity: .85 }}>
            Extra work and shifts are in your Phone. Acting lessons are under Career. These are the things you can only do once.
          </div>}
        </div>
        <Button kind="pri" sfx={stepIsYear(g) ? 'year' : 'month'} onClick={() => dispatch(advanceTime)}>{stepIsYear(g) ? '▶ Live one year' : '▶ Live one month'}</Button>
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Timeline</div>
          {(g.timeline || []).slice(0, 8).map((e, i) => (<div key={i} style={{ fontSize: 12.5, color: e.bad ? theme.bad : theme.text, padding: '6px 0', borderBottom: `1px solid ${theme.line}` }}><span style={{ color: theme.muted, marginRight: 8 }}>{e.when}</span>{e.text}</div>))}
          {(!g.timeline || !g.timeline.length) && <div style={{ fontSize: 12.5, color: theme.muted }}>Your story starts here. Live a year.</div>}
        </div>
        <LegacyPanel g={g} />
       </>}
      </div>

      <SettingsRow />
      <div style={{ marginTop: 14 }}>
        <Button kind="danger" onClick={() => setConfirmEnd(true)}>End this life & start anew</Button>
      </div>
      <BottomNav screen={screen} setScreen={setScreen} g={g} />
    </div>
  );
}

const NAV = [ { id: 'life', label: 'Home', icon: '🏠' }, { id: 'career', label: 'Career', icon: '🎬' }, { id: 'people', label: 'People', icon: '❤️' }, { id: 'style', label: 'Style', icon: '🛍️' }, { id: 'legacy', label: 'Legacy', icon: '🏆' }, { id: 'phone', label: 'Phone', icon: '📱' } ];
function BottomNav({ screen, setScreen, g }) {
  // The bar was painted with a literal rgba(21,15,44) — the old purple, hardcoded — so it
  // was the one piece of the game a skin could not reach.
  return (<div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 440, margin: '0 auto',
    background: `${theme.bgDeep || theme.bg}f2`, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
    borderTop: `1px solid ${theme.line}`, boxShadow: '0 -14px 30px -22px #000',
    display: 'flex', padding: '8px 6px 10px', zIndex: 40 }}>
    {NAV.map((n) => { const active = screen === n.id; const badge = n.id === 'career' && inCareer(g) ? (g.offers || []).length : n.id === 'phone' && inCareer(g) ? ((g.inbox||[]).filter(m=>!m.read).length) : 0;
      return (<button key={n.id} data-sfx="nav" onClick={() => setScreen(n.id)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 0', position: 'relative' }}>
        <span style={{ fontSize: 20, filter: active ? 'none' : 'grayscale(.55) opacity(.55)', transition: 'filter .2s' }}>{n.icon}</span>
        <span style={{ fontSize: 10, fontWeight: active ? 800 : 600, color: active ? theme.accent : theme.muted, transition: 'color .2s' }}>{n.label}</span>
        {/* The lit tab gets a mark under it, so the bar reads at a glance and not only by colour. */}
        {active && <span style={{ position: 'absolute', top: 0, width: 22, height: 3, borderRadius: 2, background: theme.accent, boxShadow: `0 0 10px ${theme.accent}` }} />}
        {badge > 0 && <span style={{ position: 'absolute', top: 0, right: '26%', minWidth: 15, height: 15, borderRadius: 8, background: '#ff3b30', color: '#fff', fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>}</button>); })}
  </div>);
}
// What this month on set needs from you, and how the director feels about you — on the
// home screen, where the month actually gets lived.
function OnSetNow({ g }) {
  const p = g.production;
  const lead = (p.crew || [])[0];
  const stamp = (g.year || 0) * 12 + (g.month || 0);
  const worked = p._workedMonth === stamp;
  const noEnergy = (g.ap || 0) <= 0;
  const b = lead ? lead.bond : 50;
  const mood = b >= 70 ? ['warm to you', '#4fc07f'] : b >= 45 ? ['fine with you', theme.muted] : b >= 26 ? ['cooling on you', '#f0b429'] : ['done with you', '#ff5a72'];
  return (<div style={{ marginTop: 8 }}>
    {lead && <div style={{ fontSize: 11.5, color: theme.muted, marginBottom: 8 }}>
      {lead.name}, directing, is <b style={{ color: mood[1] }}>{mood[0]}</b>.
      {b < 45 && ' A cold director is what costs you standing at wrap.'}
    </div>}
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Button kind={worked ? 'default' : 'pri'} sfx="slate" disabled={noEnergy || worked} onClick={() => dispatch(rehearse)} style={{ flex: 1 }}>
        {worked ? '✓ Rehearsed this month' : noEnergy ? 'Rehearse · no energy left' : 'Rehearse · 1 energy'}</Button>
    </div>
    {!worked && !noEnergy && <div style={{ fontSize: 11, color: theme.gold, marginTop: 6, lineHeight: 1.45 }}>
      Live the month without this and you turned up not knowing the pages. Once is nothing. A pattern, the director notices.
    </div>}
    <div style={{ fontSize: 11, color: theme.muted, marginTop: 6 }}>Takes, the crew and the rest of the set are under Career.</div>
  </div>);
}

function ComboStrip({ g }) {
  const id = comboOf(g), c = COMBOS[id];
  const col = c.tone === 'bad' ? '#ff8d9e' : c.tone === 'good' ? theme.gold : theme.accent;
  return (<div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '9px 12px', marginBottom: 12, borderRadius: 12,
    background: col + '12', border: '1px solid ' + col + '33' }}>
    <span style={{ color: col, fontWeight: 900, fontSize: 13, flexShrink: 0 }}>◆</span>
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: col }}>{c.label}</div>
      <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5, marginTop: 1 }}>{c.line}</div>
    </div>
  </div>);
}
// The full card, for the two ladder screens: what the combination is and what it does.
function ComboCard({ g }) {
  const id = comboOf(g), c = COMBOS[id];
  const col = c.tone === 'bad' ? '#ff8d9e' : c.tone === 'good' ? theme.gold : theme.accent;
  return (<Card style={{ marginBottom: 14, borderColor: col + '44' }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: col, marginBottom: 4 }}>Fame × Respect · {c.label}</div>
    <div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.55 }}>{c.long}</div>
    {c.fx.length > 0 && <div style={{ marginTop: 8 }}>
      {c.fx.map((l, i) => <div key={i} style={{ fontSize: 11.5, color: theme.text, lineHeight: 1.5, display: 'flex', gap: 6, opacity: .9 }}><span style={{ color: col }}>·</span><span>{l}</span></div>)}
    </div>}
  </Card>);
}

// The two settings the game has: what it looks like, and whether it makes a sound. Kept
// out of the save on purpose — both should survive starting a new life.
function SettingsRow() {
  const [open, setOpen] = useState(false);
  const [, bump] = useState(0);
  const on = soundOn();
  return (<div style={{ marginTop: 20 }}>
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={() => setOpen(!open)} style={{ flex: 1, background: 'none', border: `1px solid ${theme.line}`, borderRadius: 11,
        padding: '9px 12px', color: theme.muted, fontSize: 11.5, fontWeight: 800, letterSpacing: '.06em',
        textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}>◐ {THEMES[skinId()].name}</button>
      <button data-sfx="toggle" onClick={() => { setSound(!on); bump((n) => n + 1); }}
        style={{ width: 52, background: 'none', border: `1px solid ${theme.line}`, borderRadius: 11, padding: '9px 0',
          color: on ? theme.accent : theme.muted, fontSize: 15, cursor: 'pointer' }}>{on ? '🔊' : '🔇'}</button>
    </div>
    {open && (<div className="fof-in" style={{ display: 'grid', gap: 7, marginTop: 8 }}>
      {THEME_ORDER.map((id) => { const sk = THEMES[id], active = skinId() === id;
        return (<button key={id} onClick={() => { setSkin(id); setOpen(false); }} style={{ textAlign: 'left', cursor: 'pointer',
          background: active ? `${sk.accent}22` : sk.panel, border: `1px solid ${active ? sk.accent : sk.accent + '30'}`,
          borderRadius: 12, padding: '11px 13px', color: sk.text, fontFamily: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 15, height: 15, borderRadius: 8, background: sk.accent, flexShrink: 0, boxShadow: `0 0 9px ${sk.accent}` }} />
            <span style={{ fontSize: 13.5, fontWeight: 800 }}>{sk.name}</span>
            {active && <span style={{ marginLeft: 'auto', fontSize: 10.5, color: sk.accent, fontWeight: 800 }}>ON</span>}
          </div>
          <div style={{ fontSize: 11.5, color: sk.muted, marginTop: 3 }}>{sk.blurb}</div>
        </button>); })}
    </div>)}
  </div>);
}
function LockedScreen({ label }) { return (<div style={{ fontSize: 13, color: theme.muted, textAlign: 'center', padding: '40px 20px', lineHeight: 1.7 }}>🔒 {label} unlocks once you move out and start your career.<br /><br />Grow up, rent your own place, and this opens up.</div>); }
function ChildPhoneLocked() { return (<div style={{ fontSize: 13, color: theme.muted, textAlign: 'center', padding: '40px 20px', lineHeight: 1.7 }}>📱 You're too young for a phone.<br /><br />You'll get your first one as a teenager (13).</div>); }
// Tapping Health opens the body: the bar, what you've got, and the three ways out —
// pay a doctor, push through it yourself, or reach into the medicine cabinet.
// Tapping Mental used to do nothing at all, while five systems read the number behind it.
// This screen answers the only two questions worth answering: why is it that, and what can
// I do about it this month. The arithmetic is the real arithmetic — see systems/life/mood.js.
// The whole ladder, laid out, because "15 to Rising Star" told you the next rung and
// nothing about the shape of the climb — and the two doors above Star are not a number of
// points away at all, so counting down to them was a lie. Every line under a rung is a real
// gate somewhere in the game; see TIER_OPENS in systems/meta/status.js.
// Respect is moved by twelve things and read by six, and tapping it did nothing. The one
// worth knowing is that it is the biggest single term in whether a director shoots your
// version of the film — fame gets you into the room, standing is what makes them listen.
function Move({ m, col }) {
  return (<div style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: `1px solid ${theme.line}` }}>
    <span style={{ color: col, fontWeight: 900, fontSize: 13, width: 30, flexShrink: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{m.by}</span>
    <span style={{ fontSize: 12.2, lineHeight: 1.45 }}>{m.what}<span style={{ color: theme.muted }}> — {m.note}</span></span>
  </div>);
}
function RespectScreen({ g, onBack }) {
  const r = Math.round(g.respect || 0);
  const rt = respectTier(r);
  const band = [rt.label, r >= 60 ? '#4fc07f' : r >= 40 ? theme.accent : r >= 30 ? theme.gold : r >= 12 ? theme.muted : '#ff5a72'];
  const lines = respectReport(g);
  const wins = ((g.awards && g.awards.wins) || []).length;
  const noms = ((g.awards && g.awards.nominations) || []).length;
  // Who could actually open a door for you. computeAccess wants weight 80 and closeness 60.
  const industry = [...(g.people || [])]
    .filter((p) => (p.industryWeight || 0) > 0)
    .sort((a, b) => (b.industryWeight || 0) - (a.industryWeight || 0))
    .slice(0, 5);
  const best = [...(g.filmography || []), ...(g.discography || [])]
    .filter((c) => !c.minor && c.score != null)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
  return (<div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: 'transparent', color: theme.text, padding: 16, paddingBottom: 40, fontFamily: FONT }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <button onClick={onBack} data-sfx="back" style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: theme.text, borderRadius: 9, padding: '6px 11px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>‹ Back</button>
      <div style={{ fontSize: 16, fontWeight: 900 }}>How the business sees you</div>
    </div>

    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 700 }}>{r}</div>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: band[1], textAlign: 'right' }}>{band[0]}</div>
      </div>
      <div style={{ height: 9, background: 'rgba(255,255,255,.08)', borderRadius: 5, margin: '9px 0 8px', overflow: 'hidden' }}>
        <div style={{ width: r + '%', height: '100%', background: `linear-gradient(90deg, ${band[1]}aa, ${band[1]})`, borderRadius: 5, transition: 'width .5s' }} />
      </div>
      <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.55 }}>
        Fame is how many people know the name. This is what the people who hire you think of it,
        and the two move for completely different reasons.
      </div>
      {(wins > 0 || noms > 0) && <div style={{ fontSize: 12, color: theme.gold, marginTop: 7, fontWeight: 700 }}>
        {wins > 0 ? `🏆 ${count(wins, 'Asker')}` : ''}{wins > 0 && noms > 0 ? ' · ' : ''}{noms > 0 ? `${count(noms, 'nomination')}` : ''}
        {' — worth '}{wins * 22 + Math.min(18, noms * 5)}{' on top of your fame in every casting office.'}
      </div>}
      {best && <div style={{ fontSize: 12, color: theme.muted, marginTop: 6 }}>
        Your best is <b style={{ color: theme.text }}>{best.title}</b> at {best.score}/10. That is the one people mean.
      </div>}
    </Card>

    <ComboCard g={g} />
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>The whole climb</div>
    <Ladder tiers={RESPECT_TIERS} opens={RESPECT_OPENS} value={g.respect} />
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 4 }}>What it is worth</div>
    <Card style={{ marginBottom: 14, padding: '4px 14px' }}>
      {lines.map((l) => (
        <div key={l.id} style={{ padding: '9px 0', borderBottom: `1px solid ${theme.line}` }}>
          <div style={{ fontSize: 12.5, fontWeight: 800 }}>{l.label}</div>
          <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5, marginTop: 2 }}>{l.why}</div>
        </div>))}
    </Card>

    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>People who could open a door</div>
    {industry.length ? (<div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
      {industry.map((p) => { const opens = (p.industryWeight || 0) >= 80 && (p.relationship || 0) >= 60;
        return (<div key={p.id} style={{ background: theme.panel, border: `1px solid ${opens ? 'rgba(79,192,127,.35)' : theme.line}`, borderRadius: 12, padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>{p.name}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: opens ? '#7fd6a2' : theme.muted, flexShrink: 0 }}>
              {opens ? '★ opens doors' : `weight ${Math.round(p.industryWeight || 0)}`}
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>
            {p.role} · {relBand(p.relationship).label}
            {!opens && (p.industryWeight || 0) >= 80 ? ' — powerful enough, not close enough' : ''}
          </div>
        </div>); })}
    </div>) : <div style={{ fontSize: 12, color: theme.muted, textAlign: 'center', padding: '8px 10px 16px', lineHeight: 1.6 }}>
      Nobody in the business is in your phone yet. They come from parties and events, under Career.
    </div>}

    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>What moves it</div>
    <div style={{ display: 'grid', gap: 8 }}>
      <Card style={{ padding: '4px 14px' }}>{RESPECT_MOVES.up.map((m, i) => <Move key={i} m={m} col="#4fc07f" />)}</Card>
      <Card style={{ padding: '4px 14px' }}>{RESPECT_MOVES.down.map((m, i) => <Move key={i} m={m} col="#ff5a72" />)}</Card>
    </div>
    <div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', padding: '16px 10px', lineHeight: 1.6 }}>
      None of this can be bought. It is the only number in the game that money does not touch.
    </div>
  </div>);
}

function FameScreen({ g, onBack }) {
  const f = Math.round(g.fame || 0);
  const tier = fameTier(g.fame);
  const ceil = fameCeiling(g);
  const aKey = alistKey(g), iKey = iconKey(g);
  const sc = Math.round(g.scandal || 0);
  const scLines = scandalReport(g);
  const media = Math.round(g.media || 0);
  const idle = g._idleMonths || 0;
  return (<div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: 'transparent', color: theme.text, padding: 16, paddingBottom: 40, fontFamily: FONT }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <button onClick={onBack} data-sfx="back" style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: theme.text, borderRadius: 9, padding: '6px 11px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>‹ Back</button>
      <div style={{ fontSize: 16, fontWeight: 900 }}>Your name</div>
    </div>

    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 700 }}>{f}</div>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: isForgotten(g) ? '#ff8d9e' : theme.accent }}>{isForgotten(g) ? 'Forgotten' : tier.label}</div>
      </div>
      <div style={{ height: 9, background: 'rgba(255,255,255,.08)', borderRadius: 5, margin: '9px 0 8px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ width: f + '%', height: '100%', background: `linear-gradient(90deg, ${theme.accent}aa, ${theme.accent})`, borderRadius: 5, transition: 'width .5s' }} />
        {/* Where the wall is, if there is one above you. */}
        {ceil < 100 && <div style={{ position: 'absolute', left: ceil + '%', top: -2, width: 2, height: 13, background: '#ff5a72' }} />}
      </div>
      <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.55 }}>
        {idle >= 4
          ? `Nothing of yours has come out in ${count(idle, 'month')}. You are being forgotten at about ${((f / 55 + (g.scandal || 0) / 45) * (1 - Math.min(0.55, media / 130))).toFixed(2)} a month.`
          : 'Working keeps you where you are. It is the quiet years that take it back.'}
      </div>
    </Card>

    <ComboCard g={g} />
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>The whole climb</div>
    <Ladder tiers={[FORGOTTEN, ...FAME_TIERS]} opens={{ ...TIER_OPENS, forgotten: FORGOTTEN_OPENS }} value={g.fame}
      sunkAt={isForgotten(g) ? { id: 'forgotten', fill: forgottenDepth(g) } : null}
      gateFor={(t) => t.id === 'alist' ? { open: !!aKey, need: 'A hit you carried, or a nomination',
          got: aKey === 'led' ? 'You carried one, and it was good.' : 'The season put your name on the list.' }
        : t.id === 'icon' ? { open: !!iKey, need: 'A world hit, or an Asker',
          got: iKey === 'hit' ? 'The whole world saw one of yours.' : 'They read your name out.' }
        : null} />
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>The press</div>
    <Card style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <Meter label="Scandal" value={sc} col={sc >= 45 ? '#ff5a72' : sc >= 20 ? '#f0b429' : theme.muted} />
        <Meter label="Being talked about" value={media} col={media >= 30 ? '#4fc07f' : theme.muted} />
      </div>
      <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.55, marginTop: 9 }}>
        {media > 0
          ? `Attention is slowing how fast you are forgotten, by ${Math.round(Math.min(0.55, media / 130) * 100)}%. It fades on its own — the only thing that tops it up is turning up where the cameras are.`
          : 'Nobody is writing about you. Attention is the only thing that slows being forgotten, and it comes from the nights out, the sofa and the carpet.'}
      </div>
    </Card>
    {scLines.length > 0
      ? <Card style={{ marginBottom: 14, padding: '4px 14px', borderColor: sc >= 45 ? '#ff5a7244' : theme.line }}>
          {scLines.map((l) => (
            <div key={l.id} style={{ padding: '8px 0', borderBottom: `1px solid ${theme.line}` }}>
              <div style={{ fontSize: 12.5, fontWeight: 800 }}>{l.label}</div>
              <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5, marginTop: 2 }}>{l.why}</div>
            </div>))}
        </Card>
      : <div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', padding: '4px 10px 14px', lineHeight: 1.6 }}>
          Nothing is being said about you that you would mind. That is worth more than it looks.
        </div>}

    <div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', padding: '6px 10px', lineHeight: 1.6 }}>
      The nights that raise your name are invitations in your Phone and events under Career.
      A publicist, under Style, makes bad press die nearly three times faster.
    </div>
  </div>);
}


// The climb, drawn once. Fame and standing are the same shape — rungs, a tube filling from
// the bottom, and what each one opens — so they are the same component rather than two that
// look alike until somebody edits one of them.
//
// `gateFor` is optional: fame has two doors that points alone will not open, standing has
// none, and a ladder with no gates simply does not draw any.
// `sunkAt` is for a rung you do not reach by the number at all — you are pushed into it from
// above. Forgotten is the one: fame never goes below zero, but a name that fell is sitting
// under Unknown, and the ladder has to show that. { id, fill } — which rung, and how deep.
function Ladder({ tiers, opens, value, gateFor, sunkAt }) {
  // The bullet points under every rung took the whole screen — Maxi: "they take a lot of
  // space, put them in a guide". They are in the Guide app now; here they are one tap away.
  const [showOpens, setShowOpens] = useState(false);
  const v = Math.round(value || 0);
  let cur = tiers[0];
  for (const t of tiers) if (v >= t.min) cur = t;
  if (sunkAt) cur = tiers.find((t) => t.id === sunkAt.id) || cur;
  return (<div style={{ marginBottom: 16 }}>
    <button onClick={() => setShowOpens(!showOpens)} data-sfx="toggle" style={{ background: 'none', border: 'none', color: theme.accent, fontSize: 11.5, fontWeight: 800, cursor: 'pointer', padding: '0 0 8px', fontFamily: 'inherit' }}>
      {showOpens ? '▾ Hide what each rung opens' : '▸ Show what each rung opens · full rules in Phone › Guide'}</button>
    <div style={{ display: 'grid', gap: 8 }}>
    {[...tiers].reverse().map((t, ri, arr) => {
      const here = t.id === cur.id;
      const above = arr[ri - 1];
      const top = above ? above.min : 100;
      // A rung below zero is not something you climb, it is something you sink into. Its
      // tube fills from the top, in red, by how far down you have gone — and it never gets a
      // tick, because being above it is not an achievement, it is the default.
      const sunk = t.min < 0;
      // Pushed into a rung from above: nothing above it is an achievement any more.
      const done = !sunk && !sunkAt && v >= t.min;
      const fill = sunkAt && sunkAt.id === t.id ? sunkAt.fill * 100
        : sunk
        ? (v >= top ? 0 : v <= t.min ? 100 : ((top - v) / Math.max(1, top - t.min)) * 100)
        : (v >= top ? 100 : v <= t.min ? 0 : ((v - t.min) / Math.max(1, top - t.min)) * 100);
      const gate = gateFor ? gateFor(t) : null;
      return (<div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
        <Tube fill={fill} lit={done || (sunk && fill > 0)} here={here} sink={sunk} first={ri === 0} last={ri === arr.length - 1} />
        <div style={{ flex: 1,
          background: here ? (sunk ? 'rgba(255,90,114,.12)' : `${theme.accent}1e`) : theme.panel,
          border: `1px solid ${here ? (sunk ? '#ff5a72' : theme.accent) : done ? theme.line : 'rgba(255,255,255,.05)'}`,
          borderRadius: 12, padding: showOpens ? '11px 13px' : '9px 13px', opacity: done || here ? 1 : .62 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: here ? (sunk ? '#ff8d9e' : theme.accent) : theme.text }}>
              {done && !here ? '✓ ' : ''}{t.label}{here ? ' · you are here' : ''}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: theme.muted, flexShrink: 0 }}>
              {t.note ? t.note : sunk ? (v < top ? `below ${top}` : `from ${top - 1} down`) : (done || v >= t.min) ? t.min : `${Math.ceil(t.min - v)} to go`}
            </div>
          </div>
          {gate && (<div style={{ fontSize: 11.5, marginTop: 6, padding: '6px 9px', borderRadius: 8,
            background: gate.open ? 'rgba(79,192,127,.12)' : 'rgba(255,90,114,.1)',
            border: `1px solid ${gate.open ? 'rgba(79,192,127,.3)' : 'rgba(255,90,114,.25)'}`,
            color: gate.open ? '#7fd6a2' : '#ff8d9e', fontWeight: 700 }}>
            {gate.open ? `✓ ${gate.got}` : `🔒 ${gate.need} — points alone will not get you in`}
          </div>)}
          {showOpens && <div style={{ marginTop: 6 }}>
            {(opens[t.id] || []).map((line, i) => (
              <div key={i} style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5, display: 'flex', gap: 6 }}>
                <span style={{ opacity: .5 }}>·</span><span>{line}</span>
              </div>))}
          </div>}
        </div>
      </div>);
    })}
    </div>
  </div>);
}

// One segment of the climb, drawn as a glass tube with a level in it. Fills from the bottom,
// because that is the direction you are going.
// One segment of the climb, drawn as a glass tube with a level in it. Fills from the
// bottom, because that is the direction you are going. Segments rather than one long bar:
// the cards are different heights, so a single fill would put the marks in the wrong
// places, and a picture that does not line up with its own numbers is worse than none.
function Tube({ fill, lit, here, sink, first, last }) {
  // Below zero the level comes DOWN from the top in red. Above it, up from the bottom in
  // the accent. Same glass, opposite direction — which is exactly the point.
  const col = sink ? '#ff5a72' : theme.accent;
  const col2 = sink ? '#b03246' : (theme.accent2 || theme.accent);
  return (<div style={{ width: 16, flexShrink: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
    <div style={{ position: 'absolute', inset: 0,
      background: 'rgba(255,255,255,.05)',
      border: '1px solid rgba(255,255,255,.07)',
      borderTopLeftRadius: first ? 9 : 0, borderTopRightRadius: first ? 9 : 0,
      borderBottomLeftRadius: last ? 9 : 0, borderBottomRightRadius: last ? 9 : 0,
      overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, [sink ? 'top' : 'bottom']: 0, height: fill + '%',
        background: sink ? 'linear-gradient(180deg, ' + col2 + ', ' + col + ')' : 'linear-gradient(180deg, ' + col + ', ' + col2 + ')',
        boxShadow: fill > 0 ? '0 0 12px -2px ' + col : 'none',
        transition: 'height .6s cubic-bezier(.2,.8,.3,1)' }} />
      {/* the glass: a highlight down one side */}
      <div style={{ position: 'absolute', left: 2, top: 0, bottom: 0, width: 3, borderRadius: 3,
        background: 'linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,.02))' }} />
    </div>
    {/* the mark at the rung itself, at the bottom of its own segment */}
    <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)',
      width: here ? 14 : 10, height: here ? 14 : 10, borderRadius: 9,
      background: lit ? col : theme.panel2,
      border: '2px solid ' + (lit ? col : 'rgba(255,255,255,.14)'),
      boxShadow: here ? '0 0 12px ' + col : 'none',
      zIndex: 2, transition: 'all .3s' }} />
  </div>);
}

function Meter({ label, value, col }) {
  return (<div style={{ flex: 1 }}>
    <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: theme.muted }}>{label}</div>
    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: col }}>{value}</div>
    <div style={{ height: 5, background: 'rgba(255,255,255,.07)', borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
      <div style={{ width: Math.max(0, Math.min(100, value)) + '%', height: '100%', background: col, borderRadius: 3 }} />
    </div>
  </div>);
}

function MentalScreen({ g, onBack }) {
  const m = Math.round(g.mental || 0);
  const rep = mentalReport(g);
  const low = g._lowMonths || 0;
  const band = m >= 70 ? ['Steady', '#4fc07f'] : m >= 45 ? ['Flat', '#f0b429'] : m >= 25 ? ['Running on empty', '#ff9d5a'] : ['Not getting up', '#ff5a72'];
  const call = canCall(g), away = canGetAway(g);
  const scarred = (g.scarred || 0) > 0;
  const row = (l, sign) => (
    <div key={l.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 0', borderBottom: `1px solid ${theme.line}` }}>
      <div style={{ width: 46, flexShrink: 0, textAlign: 'right', fontSize: 13, fontWeight: 900, fontVariantNumeric: 'tabular-nums',
        color: l.per > 0 ? '#4fc07f' : l.per < 0 ? '#ff5a72' : theme.muted }}>
        {l.per === 0 ? '·' : (l.per > 0 ? '+' : '') + l.per}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>{l.label}</div>
        <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5, marginTop: 2 }}>{l.why}</div>
      </div>
    </div>);
  return (<div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: 'transparent', color: theme.text, padding: 16, paddingBottom: 40, fontFamily: FONT }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <button onClick={onBack} data-sfx="back" style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: theme.text, borderRadius: 9, padding: '6px 11px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>‹ Back</button>
      <div style={{ fontSize: 16, fontWeight: 900 }}>Your head</div>
    </div>

    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 700 }}>{m}</div>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: band[1] }}>{band[0]}</div>
      </div>
      <div style={{ height: 9, background: 'rgba(255,255,255,.08)', borderRadius: 5, margin: '9px 0 8px', overflow: 'hidden' }}>
        <div style={{ width: m + '%', height: '100%', background: band[1], borderRadius: 5, transition: 'width .5s' }} />
      </div>
      {/* The month-on-month sum, which is the number that actually decides where this ends up. */}
      <div style={{ fontSize: 12, color: theme.muted }}>
        As things stand you are <b style={{ color: rep.net > 0 ? '#4fc07f' : rep.net < 0 ? '#ff5a72' : theme.muted }}>
        {rep.net > 0 ? 'gaining' : rep.net < 0 ? 'losing' : 'holding at'} {rep.net === 0 ? '' : Math.abs(rep.net)}</b>
        {rep.net === 0 ? ' — nothing is pulling either way.' : ' a month, before anything that happens to you.'}
      </div>
      {low >= 2 && <div style={{ fontSize: 12, color: '#ff9d5a', marginTop: 7, fontWeight: 700 }}>
        {count(low, 'month')} at the bottom now.{low >= 6 ? ' This has stopped being a bad patch.' : ''}
      </div>}
    </Card>

    {g.depression && <Card style={{ marginBottom: 14, borderColor: '#ff5a7255' }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: '#ff5a72', marginBottom: 5 }}>This is not a bad month</div>
      <div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.55 }}>
        It followed you home and it stayed. Nothing below fixes it — what moves it is the medication,
        an hour a month with somebody, resting, and having one person left who is close to you.
      </div>
    </Card>}

    {rep.down.length > 0 && (<>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 4 }}>What is pulling you down</div>
      <Card style={{ marginBottom: 14, padding: '4px 14px' }}>{rep.down.map((l) => row(l))}</Card>
    </>)}
    {rep.notes.length > 0 && (<>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 4 }}>Worth knowing</div>
      <Card style={{ marginBottom: 14, padding: '4px 14px' }}>{rep.notes.map((l) => row(l))}</Card>
    </>)}
    {rep.up.length > 0 && (<>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 4 }}>What is holding you up</div>
      <Card style={{ marginBottom: 14, padding: '4px 14px' }}>{rep.up.map((l) => row(l))}</Card>
    </>)}

    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>What you can do this month</div>
    <div style={{ display: 'grid', gap: 8 }}>
      <ActRow label={call.ok ? `Ring ${(closestPerson(g) || {}).name?.split(' ')[0] || 'somebody'}` : 'Ring somebody'}
        blurb="An hour on the phone. How much it helps is how close they actually are."
        cost="1 energy · free" disabled={!call.ok} why={call.why} onClick={() => dispatch(callSomebody)} />
      <ActRow label="See somebody about it"
        blurb={scarred || g.depression ? 'The hour a month that is the only thing that actually moves this.' : 'An hour with a professional. Awkward, and it works.'}
        cost="1 energy · €260" disabled={(g.ap || 0) <= 0 || (g.cash || 0) < 260 || (!g.depression && !scarred)}
        why={!g.depression && !scarred ? 'There is nothing to talk about right now.' : (g.ap || 0) <= 0 ? 'No energy left this period.' : 'You cannot cover it.'}
        onClick={() => dispatch(seeSomebody)} />
      {(g.meds || {}).sleeping > 0 && <ActRow label={`Take a sleeping pill · ${(g.meds || {}).sleeping} left`}
        blurb="For the head, not the body. It buys you a week."
        cost="free" onClick={() => dispatch(usePills, 'sleeping')} />}
      <ActRow label="Get away on the boat" blurb="Two weeks where the phone does not work and nobody knows where you are."
        cost="1 energy" disabled={!away.ok} why={away.why} onClick={() => dispatch(getAway)} />
    </div>
    <div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', padding: '16px 10px', lineHeight: 1.6 }}>
      Resting properly is under Home, and the pills are in the Shop. A month off is the only
      thing that pulls the strain down faster than time does.
    </div>
  </div>);
}

function ActRow({ label, blurb, cost, disabled, why, onClick }) {
  return (<button onClick={disabled ? undefined : onClick} disabled={disabled}
    data-sfx={disabled ? 'denied' : 'nav'}
    style={{ textAlign: 'left', background: theme.panel, border: `1px solid ${disabled ? 'transparent' : theme.line}`,
      borderRadius: 12, padding: '12px 14px', cursor: disabled ? 'default' : 'pointer', color: theme.text,
      opacity: disabled ? .5 : 1, fontFamily: 'inherit', width: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
      <div style={{ fontSize: 13.5, fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 800, color: theme.gold, flexShrink: 0 }}>{cost}</div>
    </div>
    <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, lineHeight: 1.5 }}>{disabled && why ? why : blurb}</div>
  </button>);
}

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
  return (<div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: 'transparent', color: theme.text, padding: 16, fontFamily: FONT }}>
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
  // The other half of the title, on the tile that is named after it.
  if (isForgotten(g)) { const was = fameTier(g.peakFame); return `Forgotten · you were ${/^[AI]/.test(was.label) ? 'an' : 'a'} ${was.label}`; }
  const t = fameTier(g.fame);
  const next = FAME_TIERS[FAME_TIERS.indexOf(t) + 1];
  // The last rung is not a number of points away, so it must not be described as one. Once
  // you are up against the wall the tile says what the wall is instead of counting down to
  // something that counting cannot reach.
  // Within sight of a door, say what the door needs instead of counting down to something
  // counting cannot reach.
  // Only once the wall that is actually holding you is in sight — five points out. Before
  // that the ordinary countdown is the more useful thing to read.
  const ceiling = fameCeiling(g);
  if (ceiling < 100 && (g.fame || 0) >= ceiling - 5) { const say = ladderBlurb(g); if (say) return say; }
  return next ? `${t.label} · ${Math.max(1, Math.ceil(next.min - (g.fame || 0)))} to ${next.label}` : t.label;
}
// Acting isn't one number — it's the lanes you've actually worked in. Genre experience
// comes only from finished credits and pays back as a rating bonus in that genre.
function GenreScreen({ g, onBack }) {
  const key = g.dream === 'singer' ? 'Singing' : 'Acting';
  return (<div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: 'transparent', color: theme.text, padding: 16, fontFamily: FONT }}>
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
        out you will have your Energy back.
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
        {g.scarred} Energy a month you no longer have. Two ways back, and both are expensive:
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
        {canRehab ? `${count(rehabMonths(g), 'month')} in a clinic · €${rehabCost(g).toLocaleString()}` : `A clinic costs €${rehabCost(g).toLocaleString()}`}
      </button>
      <DrinkButton g={g} />
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
      {months} month{months === 1 ? '' : 's'}. It is taking {slotsLost(g)} Energy of every month — you have {g.apMaxEff ?? g.apMax ?? 3} instead of {g.apMax || 3}.
      {months >= MIN_MONTHS ? ` Something will come to a head in about ${due || 1} month${due === 1 ? '' : 's'}.` : ' Nothing is asked of you yet.'}
    </div>
    {st.parts.map((p) => <div key={p.id}>{line(p.on, p.label)}</div>)}
    {!onMeds(g) && <div style={{ fontSize: 11, color: theme.bad, marginTop: 6, lineHeight: 1.45 }}>
      Nothing else counts for much until you are on the medication. The Shop has it.
    </div>}
    <button onClick={() => dispatch(seeSomebody)} disabled={noEnergy || poor || went} style={softBtn(noEnergy || poor || went)}>
      {went ? 'You went this month' : poor ? 'An hour costs €260' : 'Go and talk to somebody · €260 · 1 energy'}
    </button>
    <DrinkButton g={g} />
  </div>);
}

// The other way out. It is offered plainly, it works every single month, and the card
// says exactly what it is taking while it does.
function DrinkButton({ g }) {
  const owed = owedSlots(g);
  if (owed <= 0 && !drinkLevel(g)) return null;
  const had = drankThisMonth(g);
  const lv = drinkLevel(g), b = drinkBand(g);
  const stocked = bottlesInHouse(g) > 0;
  return (<div style={{ marginTop: 10, borderTop: `1px solid ${theme.line}`, paddingTop: 9 }}>
    {lv > 0 && (<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: lv >= 45 ? theme.bad : theme.gold }}>{b.label}</span>
      <span style={{ fontSize: 10.5, color: theme.muted }}>craft −{(lv >= 78 ? 1.1 : lv >= 45 ? 0.7 : 0.35).toFixed(2)}/mo</span>
    </div>)}
    {lv > 0 && <div style={{ fontSize: 10.5, color: theme.muted, marginBottom: 6, lineHeight: 1.45 }}>{b.note}</div>}
    <button onClick={() => dispatch(drinkThrough)} disabled={had || !stocked}
      style={{ ...softBtn(had || !stocked), marginTop: 0, background: had || !stocked ? 'rgba(120,110,150,.15)' : 'rgba(255,209,102,.16)', color: had || !stocked ? '#6b6390' : theme.gold }}>
      {had ? `You drank. The month is open — ${owed} Energy back.`
        : !stocked ? 'Nothing in the house · the Shop delivers'
        : dependent(g) ? 'Drink — you have to now' : `Drink through it · opens ${owed} Energy`}
    </button>
  </div>);
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Three different trials in a random order, so nobody solves this once and coasts. The
// week is a small puzzle; the names are a small memory; the conversation changes shape
// depending on whether there is anybody left in your life.
// Day one, and somebody says what they think the film is. You do not choose the plot —
// an actor never does — you argue for a version of it, and whether anybody listens is what
// your standing has been FOR all along. See systems/career/story.js.
function StoryRoom({ g }) {
  const p = g.production;
  if (!p || p.take) return null;
  const room = openStoryRoom(g, p);
  const hot = hotGenre(g);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,5,20,.97)', zIndex: 60, overflowY: 'auto',
      padding: 16, color: theme.text, fontFamily: FONT }}>
      <div style={{ maxWidth: 400, margin: '0 auto' }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.18em', textTransform: 'uppercase',
          color: theme.accent, marginBottom: 10, textAlign: 'center' }}>First day</div>
        <div style={{ fontSize: 18, fontWeight: 900 }}>{p.title}</div>
        <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>{p.genre} · {room.director} is directing</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, margin: '12px 0 4px', fontStyle: 'italic', color: '#e6dfff' }}>
          {room.premise}
        </div>
        <div style={{ fontSize: 11.5, color: p.genre === hot ? theme.gold : theme.muted, margin: '8px 0 14px', lineHeight: 1.5 }}>
          {p.genre === hot
            ? `${p.genre} is what everyone is watching right now — and you open in about two years.`
            : `${hot} is what everyone is watching right now. This is ${p.genre}.`}
        </div>
        {room.takes.map((t) => {
          const free = t.id === 'straight';
          const off = !free && (g.ap || 0) <= 0;
          return (<button key={t.id} onClick={() => dispatch(pushTake, t.id)} disabled={off}
            style={{ width: '100%', textAlign: 'left', marginBottom: 9, background: theme.panel,
              border: `1px solid ${theme.line}`, borderRadius: 12, padding: '11px 13px',
              cursor: off ? 'default' : 'pointer', opacity: off ? 0.45 : 1, color: theme.text }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800 }}>{t.label}</span>
              <span style={{ fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap',
                color: free ? theme.muted : t.odds >= 60 ? theme.good : t.odds >= 32 ? theme.gold : theme.bad }}>
                {free ? 'no argument' : `${t.odds}% they listen`}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 4, lineHeight: 1.5 }}>{t.blurb}</div>
            {!free && <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 5 }}>1 energy, win or lose</div>}
          </button>);
        })}
        <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', lineHeight: 1.5, marginTop: 4 }}>
          They listen to standing, not volume. Respect {Math.round(g.respect || 0)} · fame {Math.round(g.fame || 0)}
          {' · '}{room.director} at {Math.round(((p.crew || [])[0] || {}).bond || 40)}
        </div>
      </div>
    </div>);
}

// The one time anybody in your life says it out loud. Three answers, and the game holds you
// to all three — see systems/life/drink.js.
function UltimatumModal({ g }) {
  const p = g.drink?.pending;
  if (!p) return null;
  const cost = rehabCost(g), months = rehabMonths(g);
  const canPay = (g.cash || 0) >= cost;
  const shooting = !!g.production;
  const opt = (label, sub, onClick, off) => (
    <button onClick={onClick} disabled={off} style={{ width: '100%', textAlign: 'left', marginTop: 9,
      background: off ? 'rgba(120,110,150,.12)' : 'rgba(158,116,255,.14)', border: `1px solid ${off ? 'transparent' : theme.line}`,
      borderRadius: 12, padding: '11px 13px', cursor: off ? 'default' : 'pointer', color: off ? '#6b6390' : theme.text }}>
      <div style={{ fontSize: 13.5, fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, lineHeight: 1.45 }}>{sub}</div>
    </button>);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,5,20,.96)', zIndex: 60, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16, color: theme.text, fontFamily: FONT }}>
      <div style={{ maxWidth: 380, width: '100%', background: theme.panel, border: `1px solid ${theme.bad}55`, borderRadius: 20, padding: '22px 20px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.18em', textTransform: 'uppercase', color: theme.bad, marginBottom: 12, textAlign: 'center' }}>
          The light is still on
        </div>
        <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 8 }}>{p.title}</div>
        <div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.6 }}>{p.body}</div>
        {opt(canPay ? `Go with them · €${cost.toLocaleString()}` : `You cannot cover the clinic · €${cost.toLocaleString()}`,
          canPay ? `${count(months, 'month')}, starting tonight.${shooting ? ` "${g.production.title}" carries on without you.` : ''}`
            : 'They looked it up too. Neither of you can find the money.',
          () => dispatch(takeTheUltimatum), !canPay)}
        {opt('Promise them you will stop',
          `No drinking for ${GRACE_MONTHS} months. If they find a bottle before then, they go — and they will not ask again.`,
          () => dispatch(answerUltimatum, 'promise'))}
        {opt('Tell them to leave it alone',
          'They will. Tonight.',
          () => dispatch(answerUltimatum, 'refuse'))}
      </div>
    </div>);
}

function CheckpointModal({ g }) {
  const p = g.depression?.pending;
  const [plan, setPlan] = useState(Array(7).fill(null));
  const [pen, setPen] = useState(WEEK_TASKS[0].id);
  const [shown, setShown] = useState(true);
  useEffect(() => { if (p?.kind === 'hold') { setShown(true); const t = setTimeout(() => setShown(false), 4200); return () => clearTimeout(t); } }, [p?.kind]);
  if (!p) return null;
  const wrap = (title, body, inner, foot) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,5,20,.96)', zIndex: 60, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16, color: theme.text, fontFamily: FONT }}>
      <div style={{ maxWidth: 380, width: '100%', background: theme.panel, border: `1px solid ${theme.bad}55`, borderRadius: 20, padding: '22px 20px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.18em', textTransform: 'uppercase', color: theme.bad, marginBottom: 12, textAlign: 'center' }}>
          Five months later
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: theme.muted, lineHeight: 1.6, marginBottom: 16 }}>{body}</div>
        {inner}
        <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>{foot}</div>
      </div>
    </div>);

  if (p.kind === 'talk') {
    const scene = TALK[p.variant || 'alone'];
    return wrap(scene.title, scene.body, (
      <div style={{ display: 'grid', gap: 8 }}>
        {scene.choices.map((c) => (
          <button key={c.id} onClick={() => dispatch(answerCheckpoint, c.id)} style={{ textAlign: 'left',
            background: theme.panel2, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '11px 13px',
            cursor: 'pointer', color: theme.text, fontSize: 13.5, fontWeight: 700 }}>{c.label}</button>
        ))}
      </div>
    ), 'What you choose matters. What you have been doing for five months matters more.');
  }

  if (p.kind === 'week') {
    const place = (i) => setPlan(plan.map((v, j) => (j === i ? (v === pen ? null : pen) : v)));
    return wrap('Lay out one week', 'Put the three things somewhere in it. Not two of the same back to back — '
      + 'that is how a week like this falls apart.', (<>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {WEEK_TASKS.map((t) => (
          <button key={t.id} onClick={() => setPen(t.id)} style={{ flex: 1, border: 'none', borderRadius: 9, padding: '8px 4px',
            fontSize: 11, fontWeight: 800, cursor: 'pointer', background: pen === t.id ? theme.accent : 'rgba(158,116,255,.16)',
            color: pen === t.id ? '#fff' : '#d9cffa' }}>{t.label}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {plan.map((v, i) => (
          <button key={i} onClick={() => place(i)} style={{ border: `1px solid ${v ? theme.accent : theme.line}`, borderRadius: 8,
            padding: '10px 2px', fontSize: 9.5, fontWeight: 800, cursor: 'pointer', minHeight: 54,
            background: v ? 'rgba(158,116,255,.2)' : theme.panel2, color: v ? theme.text : theme.muted }}>
            <div style={{ opacity: .6 }}>{DAYS[i]}</div>
            <div style={{ marginTop: 4 }}>{v ? (WEEK_TASKS.find((t) => t.id === v) || {}).label.split(' ')[0] : ''}</div>
          </button>
        ))}
      </div>
      <button onClick={() => dispatch(answerCheckpoint, plan)} style={{ width: '100%', marginTop: 12, border: 'none',
        borderRadius: 12, padding: '12px', fontSize: 13.5, fontWeight: 800, cursor: 'pointer',
        background: `linear-gradient(135deg,${theme.accent2},${theme.accent})`, color: '#fff' }}>Live it</button>
    </>), 'All three have to be in there, and none of them twice in a row.');
  }

  // hold — four names for a few seconds, then three of them, and you name the one missing
  const h = p.hold || { order: [], missing: '' };
  const left = h.order.filter((n) => n !== h.missing);
  return wrap('Who has been trying to reach you?', shown
    ? 'These four have called or written this month. Read them — you get a few seconds.'
    : 'Three of them are here. Who is the fourth?', (
    shown
      ? (<div style={{ display: 'grid', gap: 6 }}>
          {h.order.map((n) => (<div key={n} style={{ background: theme.panel2, border: `1px solid ${theme.line}`,
            borderRadius: 10, padding: '10px 12px', fontSize: 14, fontWeight: 700 }}>{n}</div>))}
        </div>)
      : (<>
          <div style={{ display: 'grid', gap: 4, marginBottom: 12 }}>
            {left.map((n) => (<div key={n} style={{ background: 'rgba(255,255,255,.03)', border: `1px solid ${theme.line}`,
              borderRadius: 8, padding: '7px 11px', fontSize: 12.5, color: theme.muted }}>{n}</div>))}
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {[...h.order].sort().map((n) => (
              <button key={n} onClick={() => dispatch(answerCheckpoint, n)} style={{ textAlign: 'left',
                background: theme.panel2, border: `1px solid ${theme.line}`, borderRadius: 10, padding: '11px 13px',
                cursor: 'pointer', color: theme.text, fontSize: 13.5, fontWeight: 700 }}>{n}</button>
            ))}
          </div>
        </>)
  ), shown ? 'A few seconds.' : 'Concentration is the first thing this takes. This is the one that asks for it back.');
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
    {row('Work', g.job ? `${g.job.title} · ${g.job.employer}` : (inCareer(g) ? 'No job' : '—'), g.job ? theme.text : theme.muted)}
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
const CAREER_TABS = [['calendar', 'Calendar'], ['training', 'Training'], ['credits', 'Filmography'], ['events', 'Events']];
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
  return (<div style={{ position: 'fixed', inset: 0, background: `linear-gradient(180deg, ${theme.bg}, ${theme.bgDeep})`, zIndex: 40, overflowY: 'auto' }}>
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
// Everything money is spent on, in one place, under four tabs — because the old screen was
// a single scroll of housing, food and a gym membership, and the whole point of the new
// spending is that a player can find it.
const STYLE_TABS = [['home', 'Home'], ['staff', 'People'], ['things', 'Things'], ['body', 'Body']];
function StyleScreen({ g }) {
  const [tab, setTab] = useState('home');
  const tier = fameTier(g.fame);
  const bill = staffBill(g) + upkeepBill(g);
  return (<div>
    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
      {STYLE_TABS.map(([id, label]) => (
        <button key={id} data-sfx="nav" onClick={() => setTab(id)} style={{ flex: 1, padding: '9px 4px', borderRadius: 11, fontSize: 12.5, fontWeight: 800,
          cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${tab === id ? 'transparent' : theme.line}`,
          background: tab === id ? `linear-gradient(165deg, ${theme.accent}, ${theme.accent2})` : theme.panel,
          color: tab === id ? (theme.warm ? '#1a1206' : '#fff') : theme.muted }}>{label}</button>))}
    </div>
    {/* The header already says what you are, so this card no longer repeats it — Maxi: "the
        status a second time, it is not needed". What is left is the one number that is not
        anywhere else: what it costs to keep all of this running every month. */}
    {bill > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px 12px' }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.muted }}>Keeping all this running</div>
      <div style={{ fontSize: 15, fontWeight: 900, color: theme.gold }}>{money(bill)}/mo</div>
    </div>}
    {tab === 'home' && <HomeTab g={g} tier={tier} />}
    {tab === 'staff' && <StaffTab g={g} />}
    {tab === 'things' && <ThingsTab g={g} />}
    {tab === 'body' && <BodyTab g={g} />}
  </div>);
}

function HomeTab({ g, tier }) {
  const allowedIdx = HOUSING_ORDER.indexOf(tier.housingMax);
  const current = g.housing || 'room';
  const buy = canBuyHome(g);
  const ownsThis = g.owns === current;
  return (<div>
    {!g.hasApartment && <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: '10px 12px', marginBottom: 10, lineHeight: 1.6 }}>You still live with your parents. Move out first — then this is your problem.</div>}
    {/* Renting forever is what somebody who has not made it does. */}
    {g.hasApartment && !g.inheritedHome && (<Card style={{ marginBottom: 14, borderColor: ownsThis ? `${theme.good}55` : theme.line }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: ownsThis ? theme.good : theme.accent, marginBottom: 5 }}>
        {ownsThis ? '★ You own this outright' : 'You are renting'}</div>
      <div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.55, marginBottom: 10 }}>
        {ownsThis
          ? `No rent, for as long as you keep it — and it goes to whoever you leave things to. Worth about ${money(Math.round(HOME_PRICE[g.owns] * 0.92))} if it ever has to go.`
          : `€${(HOUSING[current] || HOUSING.room).cost.toLocaleString()} a month, forever, and none of it is yours. ${HOME_PRICE[current] ? `Buying it costs ${money(HOME_PRICE[current])}.` : 'Nobody sells a room in a shared flat.'}`}
      </div>
      {ownsThis
        ? <Button kind="danger" onClick={() => dispatch(sellHome)}>Sell it · {money(Math.round(HOME_PRICE[g.owns] * 0.76))} — a forced sale</Button>
        : <Button kind="pri" disabled={!buy.ok} onClick={() => dispatch(buyHome)}>
            {buy.ok ? `Buy it · ${money(buy.price)}` : buy.why}</Button>}
    </Card>)}
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Where you live</div>
    <div style={{ display: 'grid', gap: 8 }}>
      {HOUSING_ORDER.map((key, i) => {
        const h = HOUSING[key]; const locked = i > allowedIdx; const active = key === current && g.hasApartment;
        const deposit = Math.round(h.cost * 1.5); const canAfford = (g.cash || 0) >= deposit;
        return (<div key={key} style={{ background: active ? `${theme.accent}22` : theme.panel, border: `1px solid ${active ? theme.accent : theme.line}`, borderRadius: 12, padding: '12px 14px', opacity: locked ? .5 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{h.label}{active ? ' · you live here' : ''}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.gold }}>€{h.cost.toLocaleString()}/mo</div>
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3 }}>{h.blurb}</div>
          <div style={{ fontSize: 11.5, color: theme.text, marginTop: 6, lineHeight: 1.5, opacity: .9 }}>{h.perk}</div>
          <HousingEffects h={h} />
          {HOME_PRICE[key] && <div style={{ fontSize: 11, color: theme.muted, marginTop: 5 }}>To own it outright: {money(HOME_PRICE[key])}</div>}
          {locked ? <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 6 }}>🔒 Out of your league for now.</div>
            : !active && g.hasApartment && (<>
                <div style={{ fontSize: 11, color: canAfford ? theme.muted : theme.bad, marginTop: 6 }}>Deposit €{deposit.toLocaleString()}{canAfford ? '' : ' — you cannot cover it'}</div>
                <Button onClick={() => dispatch(setHousing, key)} style={{ marginTop: 8 }}>Move in</Button>
              </>)}
        </div>); })}
    </div>
  </div>);
}

// The best thing money can buy here is a month with more of it in.
function StaffTab({ g }) {
  return (<div>
    <div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.6, marginBottom: 12 }}>
      People whose whole job is that your month goes better. They are paid every month whether
      you work or not — which is exactly what makes a bad year expensive.
    </div>
    <div style={{ display: 'grid', gap: 8 }}>
      {STAFF_ORDER.map((id) => {
        const st = STAFF[id]; const on = hasStaff(g, id); const fit = canHire(g, id);
        return (<Card key={id} style={{ borderColor: on ? `${theme.good}55` : theme.line }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{st.label}{on ? ' · on the payroll' : ''}</div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: theme.gold }}>{money(st.cost)}/mo</div>
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, lineHeight: 1.5 }}>{st.blurb}</div>
          <div style={{ fontSize: 11.5, color: theme.accent, marginTop: 5, fontWeight: 700 }}>{st.perk}</div>
          {on ? <Button kind="danger" style={{ marginTop: 9 }} onClick={() => dispatch(fire, id)}>Let them go</Button>
            : <Button kind="pri" style={{ marginTop: 9 }} disabled={!fit.ok} onClick={() => dispatch(hire, id)}>
                {fit.ok ? 'Take them on' : fit.why}</Button>}
        </Card>); })}
    </div>
  </div>);
}

// The point of these is not owning them. It is that when it goes wrong, you sell them.
function ThingsTab({ g }) {
  return (<div>
    <div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.6, marginBottom: 12 }}>
      Things you own. Some of them hold their value and most of them do not — and every one of
      them can be sold on a bad month, which is how this actually goes.
    </div>
    <div style={{ display: 'grid', gap: 8 }}>
      {THING_ORDER.map((id) => {
        const t = THINGS[id]; const has = owns(g, id); const fit = canBuyThing(g, id);
        const back = has ? resaleOf(g, id) : 0;
        return (<Card key={id} style={{ borderColor: has ? `${theme.gold}55` : theme.line }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{t.label}{has ? ' · yours' : ''}</div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: theme.gold }}>{money(t.price)}</div>
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, lineHeight: 1.5 }}>{t.blurb}</div>
          {t.perk && <div style={{ fontSize: 11.5, color: theme.accent, marginTop: 5, fontWeight: 700 }}>{t.perk}</div>}
          {t.upkeep && <div style={{ fontSize: 11, color: theme.muted, marginTop: 5 }}>Keeping it: {money(t.upkeep)}/mo</div>}
          {has
            ? (<><div style={{ fontSize: 11.5, color: back >= t.price ? theme.good : theme.muted, marginTop: 6 }}>
                Worth {money(back)} now{back >= t.price ? ` — ${money(back - t.price)} up on what you paid` : ''}</div>
              <Button kind="danger" style={{ marginTop: 8 }} onClick={() => dispatch(sellThing, id)}>Sell it · {money(back)}</Button></>)
            : <Button kind="pri" style={{ marginTop: 9 }} disabled={!fit.ok} onClick={() => dispatch(buyThing, id)}>
                {fit.ok ? 'Buy it' : fit.why}</Button>}
        </Card>); })}
    </div>
  </div>);
}

function BodyTab({ g }) {
  return (<div>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Food</div>
    <div style={{ display: 'grid', gap: 8 }}>
      {Object.entries(DIET).map(([key, d]) => { const active = (g.diet || 'cook') === key;
        return (<div key={key} style={{ background: active ? `${theme.accent}22` : theme.panel, border: `1px solid ${active ? theme.accent : theme.line}`, borderRadius: 12, padding: '11px 13px' }}>
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
              Died at {p.deathAge ?? p.age}{p.job && p.job !== 'retired' ? ` · was ${an(p.job)}` : ''} · you were {p.relationship >= 70 ? 'close' : p.relationship >= 40 ? 'in touch' : 'distant'}
            </div>
          </Card>))}
    </div>
  </div>);
}
function ArcModal({ g }) {
  const a = g.pendingArc;
  return (<div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: 'transparent', color: theme.text, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: FONT }}><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', color: theme.accent, marginBottom: 10 }}>{a.speaker}</div><div style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>{a.text}</div><div style={{ display: 'grid', gap: 9 }}>{a.choices.map((c, i) => (<button key={i} onClick={() => dispatch(resolveArc, i)} style={{ textAlign: 'left', background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '13px 15px', cursor: 'pointer', color: theme.text, fontSize: 14, fontWeight: 700 }}>{c.label}</button>))}</div></div>);
}
function EndLifeModal({ onConfirm, onCancel }) {
  return (<div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: 'transparent', color: theme.text, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: FONT }}>
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
  return (<div style={{ position: 'fixed', inset: 0, background: `linear-gradient(180deg, ${theme.bg}, ${theme.bgDeep})`, zIndex: 40, overflowY: 'auto' }}>
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
      {/* A child who went into the business has a career of their own, and watching it is
          most of the point of having raised one. See systems/life/children.js. */}
      {p.path === 'industry' && (
        <Card style={{ margin: '12px 0', borderColor: 'rgba(255,209,102,.3)' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: theme.gold }}>
            {(p.ownFame || 0) >= 70 ? 'A star in their own right'
              : (p.ownFame || 0) >= 40 ? 'Working, and people know the name'
              : 'Going up for parts'}
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 4, lineHeight: 1.5 }}>
            {(p.ownFame || 0) >= 70
              ? 'They get asked about you in interviews and they change the subject.'
              : (p.ownFame || 0) >= 40
              ? 'Far enough along that it is their work being discussed, not whose child they are.'
              : 'Every casting director in the city knows whose child they are, which is the problem and the reason.'}
          </div>
          <div style={{ fontSize: 11, color: theme.muted, marginTop: 6 }}>Their fame · {Math.round(p.ownFame || 0)}</div>
        </Card>)}
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
    {!inCareer(g) && <div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', padding: '14px 10px', opacity: .8 }}>Industry contacts start once your career begins. Keep school friends close on Spotlight — some of them go far.</div>}
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
  return (<div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: 'transparent', color: theme.text, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: FONT }}>
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
  return (<div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: 'transparent', color: theme.text, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: FONT }}>
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
    <Heirs g={g} />
    <Button kind="pri" onClick={() => newLife()}>Begin a new life</Button>
  </div>);
}

// The only thing an ending is actually worth: somebody who was there for all of it, and who
// starts with exactly what you left them. See systems/meta/legacy.js.
function Heirs({ g }) {
  const kids = heirsOf(g);
  if (!kids.length) return null;
  return (<div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase',
      color: theme.muted, textAlign: 'center', marginBottom: 9 }}>They are still here</div>
    {kids.map((k) => {
      const o = heirOpts(g, k.id); if (!o) return null;
      const h = o.heir;
      return (<button key={k.id} onClick={() => { enshrine(g); newLife(o); }}
        style={{ width: '100%', textAlign: 'left', marginBottom: 8, background: theme.panel,
          border: `1px solid ${theme.line}`, borderRadius: 12, padding: '11px 13px', cursor: 'pointer', color: theme.text }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 14, fontWeight: 900 }}>Play as {k.name.split(' ')[0]}</span>
          <span style={{ fontSize: 11.5, color: theme.muted }}>{k.age}{k.adopted ? ' · adopted' : ''}</span>
        </div>
        <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 4, lineHeight: 1.5 }}>
          {h.knewThem ? 'They knew you properly — the school runs as well as the premieres.'
            : h.close >= 25 ? 'They knew you the way everybody did: mostly from screens.'
            : 'They barely knew you. You were working, and then you were gone.'}
        </div>
        <div style={{ fontSize: 11.5, marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ color: theme.good }}>starts famous {h.fame}</span>
          {h.craft > 0 && <span style={{ color: theme.good }}>craft +{h.craft}</span>}
          {h.estate > 0 && <span style={{ color: theme.gold }}>€{h.estate.toLocaleString()} behind them</span>}
          <span style={{ color: theme.bad }}>respect {h.respect}</span>
        </div>
      </button>);
    })}
    <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', lineHeight: 1.5, margin: '2px 0 12px' }}>
      Every door opens. Nobody on the other side thinks they earned it.
    </div>
  </div>);
}
// Reads like a real filmography page: poster, title, star rating out of 10, role, year.
// What a real listing prints under the title, derived the way a listing would: a runtime
// from the size of the thing, and a certificate from the genre. Decoration, and it is what
// makes a row read as a film rather than a database record.
function runtimeOf(c) {
  let h = 0; for (let i = 0; i < String(c.title).length; i++) h = (h * 31 + c.title.charCodeAt(i)) >>> 0;
  const jitter = h % 16;
  if (c.season || c.episodes) return `${42 + (h % 4) * 6}m`;
  const mins = { small: 64, indie: 92, feature: 106, blockbuster: 136 }[c.scale] || 100;
  const m = mins + jitter;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}
function certOf(c) {
  const tv = !!(c.season || c.episodes);
  const g = c.genre || '';
  if (g === 'Horror') return tv ? 'TV-MA' : '18';
  if (g === 'Crime' || g === 'Thriller') return tv ? 'TV-14' : '15';
  if (g === 'Comedy' || g === 'Musical') return tv ? 'TV-PG' : 'PG';
  return tv ? 'TV-14' : '12A';
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
  const stars = (r / 10).toFixed(1).replace('.', ',');
  const hit = r >= 85 || group.worldHit;
  const starCol = group.worldHit ? theme.gold : r >= 85 ? theme.good : r >= 60 ? theme.gold : theme.muted;
  const tv = !!(c.season || group.series);
  const kind = tv ? 'TV Series' : c.type || 'Feature Film';
  const years = group.from === group.to ? String(group.to) : `${group.from}–${group.to}`;
  const eps = tv ? (group.episodes || c.episodes || 0) : 0;
  return (<div style={{ display: 'flex', gap: 12, padding: '11px 10px', borderRadius: 12, marginBottom: 6,
    background: group.worldHit ? 'linear-gradient(100deg, rgba(255,209,102,.16), rgba(255,209,102,.04))'
      : hit ? 'rgba(95,206,138,.09)' : 'transparent',
    border: `1px solid ${group.worldHit ? 'rgba(255,209,102,.45)' : hit ? 'rgba(95,206,138,.28)' : theme.line}` }}>
    <Poster title={group.root} type={c.type} genre={c.genre} director={c.director} tall size={56} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.2 }}>{group.root}</div>
      {/* line two: what it is, when, and which season — the way a listing says it */}
      <div style={{ fontSize: 12, color: theme.muted, marginTop: 3 }}>
        {kind} ({years}){tv && group.seasons ? ` · ${group.seasons > 1 ? count(group.seasons, 'season') : 'Season 1'}` : ''}{c.part > 1 ? ` · Part ${c.part}` : ''}
      </div>
      {/* line three: the score and the small print */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap', fontSize: 12 }}>
        {c.running
          ? <span style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase', color: theme.gold }}>
              In cinemas · week {c.weeks || 0} of {c.weeksTotal}</span>
          : <span style={{ fontWeight: 900, color: starCol }}>★ {stars}</span>}
        <span style={{ color: theme.muted }}>{group.to}</span>
        {eps > 0 && <span style={{ color: theme.muted }}>{eps}eps</span>}
        <span style={{ color: theme.muted, fontSize: 10.5, border: '1px solid rgba(255,255,255,.18)', borderRadius: 3, padding: '0 4px', lineHeight: '15px' }}>{certOf(c)}</span>
        <span style={{ color: theme.muted }}>{runtimeOf(c)}</span>
      </div>
      {/* line four: who directed it, and the part */}
      <div style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>
        {c.director ? <span style={{ color: theme.text, opacity: .85 }}>{c.director}</span> : null}
        {c.director ? ' · ' : ''}{c.role}
      </div>
      {/* the marks that never come off, and what it made */}
      {(group.worldHit || r >= 85 || group.askers > 0 || c.comeback > 0 || group.boxOffice > 0 || group.viewers > 0) && (
        <div style={{ fontSize: 10.5, marginTop: 5, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {group.worldHit ? <span style={{ fontWeight: 900, color: theme.gold }}>🌍 WORLD HIT</span>
            : r >= 85 ? <span style={{ fontWeight: 900, letterSpacing: '.06em', color: theme.good }}>HIT</span> : null}
          {group.askers > 0 && <span style={{ fontWeight: 900, letterSpacing: '.06em', color: theme.gold }}>🏆 ASKER{group.askers > 1 ? ` ×${group.askers}` : ''}</span>}
          {c.comeback > 0 && <span style={{ fontWeight: 900, letterSpacing: '.06em', color: theme.accent }}>↩ COMEBACK · AFTER {c.comeback} YEARS</span>}
          {(group.boxOffice > 0 || group.viewers > 0) && <span style={{ color: theme.text, fontWeight: 700 }}>
            {group.boxOffice > 0 ? `${money(group.boxOffice)} box office` : `${group.viewers}m watched`}</span>}
          {c.verdict && !c.running && <span style={{ fontWeight: 900, letterSpacing: '.07em', textTransform: 'uppercase', fontSize: 9.5,
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
        <Poster title={p.title} type={p.type} genre={p.genre} director={(p.crew || [])[0] && p.crew[0].name} />
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
            <Poster title={r.title} type={r.type} genre={r.genre} director={r.director} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{r.title}</div>
              <div style={{ fontSize: 11.5, color: theme.accent, margin: '4px 0 3px' }}>
                Opens in {left <= 1 ? 'weeks' : `${count(left, 'month')}`}
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
            <Poster title={f.title} type={f.type} genre={f.genre} />
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
        {/* The header a real listing has: how many, of what, sorted how. Maxi's screenshot
            read "13 Film/TV, 0 Commercial Credits · Sorted by Most Recent". */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>{real.length} Film/TV, {credits.length - real.length} Commercial Credit{credits.length - real.length === 1 ? '' : 's'}</div>
            <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>Sorted by most recent</div>
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
    // A carpet or a talk show sitting unanswered in the inbox is a thing you are supposed
    // to be doing THIS month, and it was nowhere on the calendar at all.
    const invites = i === 0 ? (g.inbox || []).filter((m) => m.kind === 'invite') : [];
    // And the answer to a read you did comes back on a month you can see coming.
    const hearing = (g.submissions || []).filter((x) => x.due === abs);
    cells.push({ i, yr, mo, shooting, parties, deadlines, premieres, inPost, off, invites, hearing });
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
          {c.invites.length > 0 && <span title="an invitation waiting in your inbox" style={{ fontSize: 11 }}>✉️</span>}
          {c.hearing.length > 0 && <span title="you hear back about a part" style={{ fontSize: 11 }}>📞</span>}
        </div>
        {c.invites.length > 0 && <div style={{ fontSize: 8.5, fontWeight: 800, color: theme.accent, marginTop: 2, lineHeight: 1.2 }}>
          {c.invites[0].subj}
        </div>}
        {c.hearing.length > 0 && <div style={{ fontSize: 8.5, fontWeight: 800, color: theme.accent, marginTop: 2, lineHeight: 1.2 }}>
          {c.hearing[0].title} — they answer
        </div>}
        {/* A premiere was named and a shoot was not, so eight months of the year said
            nothing but "🎬". What you are actually on is the thing you want to read. */}
        {c.shooting && !c.off && <div style={{ fontSize: 8.5, fontWeight: 800, color: theme.gold, marginTop: 2, lineHeight: 1.2, overflow: 'hidden' }}>
          {g.production.title}{c.i === (g.production.monthsLeft - 1) ? ' · wraps' : ''}
        </div>}
        {c.premieres.length > 0 && <div style={{ fontSize: 8.5, fontWeight: 800, color: theme.gold, marginTop: 2, lineHeight: 1.2, overflow: 'hidden' }}>{c.premieres[0].title}</div>}
        {/* And the quiet months are not empty either — something of yours is in post. */}
        {!c.shooting && !c.off && !c.premieres.length && c.inPost && <div style={{ fontSize: 8.5, color: theme.muted, marginTop: 2, lineHeight: 1.2 }}>in post</div>}
      </div>))}
    </div>
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', fontSize: 10.5, color: theme.muted, flexWrap: 'wrap' }}>
      <span>🎬 shooting</span><span>🍿 premiere</span><span>✉️ invitation</span><span>📞 they answer</span><span>🎉 party ends</span><span>⏳ offer expires</span>{g.burnout && <span style={{ color: theme.bad }}>🚫 signed off</span>}
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
  return (<Card style={{ marginBottom: 14, borderColor: acc.aaa ? 'rgba(95,206,138,.4)' : theme.line }}><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: acc.aaa ? theme.good : theme.muted, marginBottom: 6 }}>{acc.aaa ? '★ The tentpoles are open to you' : 'The tentpoles — closed to you'}</div><div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.5 }}>{acc.aaa ? (acc.aaaReason === 'hit' ? 'You made a hit. Studios take your calls now.' : 'You know the right person. Doors open through them.') : 'The biggest pictures do not audition strangers. Two ways in: land a hit (rating 85+), or get genuinely close to somebody powerful in the industry (weight 80+).'}</div></Card>);
}
function LegacyPanel({ g }) {
  if (g.stage === 'child' || g.stage === 'teen') return null;
  const L = computeLegacy(g); const hall = getHall();
  return (<div style={{ marginTop: 18 }}><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Legacy</div><Card><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><div style={{ fontSize: 15, fontWeight: 900, color: theme.gold }}>{L.tier}</div><div style={{ fontSize: 13, fontWeight: 800, color: theme.muted }}>{L.points} pts</div></div><div style={{ fontSize: 11.5, color: theme.muted, marginTop: 4 }}>Peak fame {Math.round(L.peakFame)} · {L.credits} credit{L.credits !== 1 ? 's' : ''} · {L.hits} hit{L.hits !== 1 ? 's' : ''}{L.worldHits > 0 ? ` · 🌍 ${L.worldHits} world hit${L.worldHits !== 1 ? 's' : ''}` : ''}{L.askerWins > 0 ? ` · 🏆 ${L.askerWins} Asker${L.askerWins !== 1 ? 's' : ''}` : L.askerNoms > 0 ? ` · ${L.askerNoms} Asker nom${L.askerNoms !== 1 ? 's' : ''}` : ''}</div></Card>{hall.length > 0 && <div style={{ marginTop: 10 }}><div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.muted, marginBottom: 6 }}>Hall of Fame</div>{hall.slice(0, 5).map((h, i) => (<div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: theme.muted, padding: '5px 0', borderBottom: `1px solid ${theme.line}` }}><span>{i + 1}. {h.name} · {h.tier}</span><span style={{ color: theme.gold }}>{h.points}</span></div>))}</div>}</div>);
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
  return <div style={{ fontSize: 14, lineHeight: 1.55 }}>{careerNow(g)}</div>;
}

// "Right now" is the biggest card on the main screen and it said the same thirty words for
// fifty years. A forty-seven-year-old A-lister with four films and fourteen million euros
// was being told to chase auditions through their Phone and make a name. The most
// prominent thing in the game has to know who it is talking to.
//
// Ordered by what is most pressingly true, not by what is nicest to say.
function careerNow(g) {
  const p = g.production;
  if (p) {
    const left = Math.max(0, p.monthsLeft || 0);
    return `You are on ${p.title}. ${left <= 1 ? 'Last month of the shoot.' : `${count(left, 'month')} of shooting left.`} `
      + `Rehearse when you have the energy — the set is where the film is decided.`;
  }
  const post = (g.releases || [])[0];
  if (post) {
    const wait = Math.max(0, post.due - ((g.year || 0) * 12 + (g.month || 0)));
    return `"${post.title}" is in post. It opens in about ${count(wait, 'month')}, and until it does nobody knows what you made.`;
  }
  const waiting = (g.submissions || []).length;
  if (waiting) return `You have read for ${count(waiting, 'part')} and heard nothing back yet. That is the job. Keep the board moving while you wait.`;
  if ((g.offers || []).length) return `There is work on the table waiting for an answer. Take one, or pass and hold out for something better — but the offer will not sit there forever.`;

  const tier = fameTier(g.fame).id;
  const old = (g.ageY || 0) >= 58;
  if (tier === 'icon') return old
    ? `They write about your career in the past tense now, and they write about it a lot. Anything you do next is an event.`
    : `Your name opens anything. The only question left is what you want it opening.`;
  if (tier === 'alist') return `You are the reason people buy the ticket. The parts come to you now — the hard part is picking the right one.`;
  if (tier === 'star') return old
    ? `People know exactly who you are, and the offers have started arriving for who you were. Pick carefully.`
    : `Your name is on the poster. Keep choosing well and the top of this is genuinely in reach.`;
  if (tier === 'known') return `People half-recognise you in the street and cannot place where from. One film they remember would change that.`;
  if (tier === 'rising') return `Something is starting. Keep reading for everything, and take the training seriously — craft is what turns a face into a career.`;
  return `You have your own place and your own path. Chase auditions through your Phone, build your craft, and make a name. Nobody is coming to find you.`;
}
