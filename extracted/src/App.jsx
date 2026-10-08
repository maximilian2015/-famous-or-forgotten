import { useState, useEffect, useRef } from 'react';
import { useGame, dispatch, newLife, exportSave, importSave, getState } from './state/store.js';
import { advanceTime, stepIsYear, advanceUntilSomething, liveUntilSomething, canSkip } from './engine/time.js';
import { rentApartment, STAGE_LABEL } from './systems/life/stages.js';
import { runAction, availableActions } from './systems/career/actions.js';
import { computeAccess } from './systems/career/access.js';
import { seeDoctor, treatmentCost, pushThrough, PILLS, usePills, infectionOdds } from './systems/life/health.js';
import { resolveArc } from './systems/life/arcs.js';
import { computeLegacy, getHall } from './systems/meta/legacy.js';
import { fameTier, FAME_TIERS, fameCeiling, ladderBlurb, isForgotten } from './systems/meta/status.js';
import { meterTier } from './systems/career/production.js';
import { allSets } from './ui/helpers.js';
import { agentLine, fireAgent } from './systems/career/agent.js';
import { COST, canAfford } from './engine/energy.js';
import { EnergyBar } from './ui/components/EnergyBar.jsx';
import { FAVOURS, canUse, costOf, vouchFor } from './systems/career/favours.js';
import { knownFor, theHits, theFlops } from './systems/meta/knownFor.js';
import { heirLine } from './systems/life/origin.js';
import { liveStandoff, roomDue } from './systems/career/standoff.js';
import { openSeason, askerLine } from './systems/career/awards.js';
import { townOpen, townFor, goOut } from './systems/life/town.js';
import { labelInfo, activeLabels, isStrong } from './systems/meta/typecast.js';
import { activeStories } from './systems/meta/stories.js';
import { ambitionProgress } from './systems/meta/ambition.js';
import { resolveScene, approachesFor, chooseApproach, autoQuality, rulesFor } from './systems/career/scenes.js';
import { RhythmLine, HoldZone, KeySequence, QuickPick } from './ui/components/SceneGames.jsx';
import { Chronology, ScriptLines, Motive } from './ui/components/SceneLogic.jsx';
import { FrameCheck, FindTheLight, TheAssembly, WhoSaysIt, TakeSheet } from './ui/components/ScenePuzzles.jsx';
import { chronologyFor, linesFor, motiveFor, assemblyFor, readFor } from './systems/career/scenework.js';
import { hype, hypeSource, SOURCES } from './systems/meta/hype.js';
import { tendency } from './systems/meta/typecast.js';
import { TimingBar } from './ui/components/TimingBar.jsx';
import { GridRisk } from './ui/components/GridRisk.jsx';
import { StairsGame } from './ui/components/StairsGame.jsx';
import { WalkOfFame } from './ui/components/WalkOfFame.jsx';
import { Diary } from './ui/components/Diary.jsx';
import { FamilyTree } from './ui/components/FamilyTree.jsx';
import { ContractRoom } from './ui/components/ContractRoom.jsx';
import { NightRoom } from './ui/components/NightRoom.jsx';
import { Passport } from './ui/components/Passport.jsx';
import { TourRoom } from './ui/components/TourRoom.jsx';
import { OptionPaper } from './ui/components/OptionPaper.jsx';
import { tierById, isInvited, attendEvent, askForInvite, sneakIntoEvent, answerDoor, stairsResult, inviteHelpers, helperOdds, hasAsked, expectedAt, energyFor, canHost, hostNight, isTonight, atOf, monthName } from './systems/social/events.js';
import { invitees, inviteBand, hostFatigue } from './systems/social/night.js';
import { HOUSING } from './engine/economy.js';
import { Phone } from './phone/Phone.jsx';
import { an, count } from './engine/text.js';
import { inCareer } from './engine/stage.js';
import { hostName } from './systems/life/dating.js';
import { comboOf, COMBOS, agentDropped } from './systems/meta/standing.js';
import { theme, setSkin, skinId, onSkinChange } from './ui/theme.js';
import { THEMES, THEME_ORDER } from './ui/skins.js';
import { FONT, FONT_DISPLAY } from './ui/chrome.js';
import { play, soundOn, setSound } from './ui/sfx.js';
import { Button } from './ui/components/Button.jsx';
import { Card } from './ui/components/Card.jsx';
import { Stat } from './ui/components/Stat.jsx';
import { Avatar } from './ui/components/Avatar.jsx';
import { lookOf, lookOfPerson, companionOf, HAIRSTYLES, hairChoices, HAIR_COLORS, EYE_COLOURS, LIPS,
  OUTFITS, OUTFIT_ORDER, SKINS } from './systems/life/appearance.js';
import { classOf } from './systems/life/origin.js';
import { interactionsFor, interact, findPerson, GROUPS } from './systems/life/interactions.js';
import { kindFor, canPropose, odds as collabOdds, why as collabWhy, liveCollabs } from './systems/career/collab.js';
import { relBand } from './systems/life/bonds.js';
import { regardOf, regardBand, regardNote } from './systems/life/regard.js';
import { BigMoment } from './ui/components/BigMoment.jsx';
import { TALK, WEEK_TASKS, answerCheckpoint } from './systems/life/depression.js';
import { RespectScreen } from './ui/components/RespectScreen.jsx';
import { FameScreen } from './ui/components/FameScreen.jsx';
import { DepressionCard } from './ui/components/DepressionCard.jsx';
import { MentalScreen } from './ui/components/MentalScreen.jsx';
import { UltimatumModal } from './ui/components/UltimatumModal.jsx';
import { GenreScreen } from './ui/components/GenreScreen.jsx';
import { RoomModal } from './ui/components/RoomModal.jsx';
import { RoomScreen } from './ui/components/RoomScreen.jsx';
import { StandingCard } from './ui/components/StandingCard.jsx';
import { OnSetNow, ProductionCard } from './ui/components/ProductionCard.jsx';
import { CampaignCard } from './ui/components/CampaignCard.jsx';
import { EndorsementCard } from './ui/components/EndorsementCard.jsx';
import { BubbleCard } from './ui/components/BubbleCard.jsx';
import { LifeCard } from './ui/components/LifeCard.jsx';
import { CreditsList } from './ui/components/Filmography.jsx';
import { TrainingScreen } from './ui/components/TrainingScreen.jsx';
import { StoryRoom } from './ui/components/StoryRoom.jsx';
import { StyleScreen } from './ui/components/StyleScreen.jsx';
import { EndOfLifeScreen } from './ui/components/EndOfLifeScreen.jsx';
// Big moments live on state so a system can raise one; the UI only clears it.
function clearBigMoment(s) {
  // The paper that came back opens itself once you have read the answer.
  const m = s.bigMoment;
  if (m && m.id === 'contract' && m.offerId && !m.walked) s.openContract = m.offerId;
  s.bigMoment = (s.moments && s.moments.length) ? s.moments.shift() : null; return s;
}
function closeContract(s) { s.openContract = null; return s; }
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function App() {
  const g = useGame();
  const [screen, setScreen] = useState('life');
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [showGenres, setShowGenres] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [showMental, setShowMental] = useState(false);
  const [showFame, setShowFame] = useState(false);
  const [showHits, setShowHits] = useState(false);
  const [showRespect, setShowRespect] = useState(false);
  const [openPerson, setOpenPerson] = useState(null);
  const [showRoom, setShowRoom] = useState(false);
  const [showPassport, setShowPassport] = useState(false);
  // theme is a live object mutated in place, so a skin change has to be turned into a
  // render by hand — nothing about it lives in game state.
  const [, bumpSkin] = useState(0);
  useEffect(() => onSkinChange(() => bumpSkin((n) => n + 1)), []);
  if (!g.created) return <CreatorScreen />;
  if (!g.alive) return <EndOfLifeScreen g={g} />;
  if (g.scene) return <SceneModal g={g} />;
  if (liveStandoff(g)) return <RoomModal g={g} />;
  if (g.pendingArc) return <ArcModal g={g} />;
  if (showGenres) return <GenreScreen g={g} onBack={() => setShowGenres(false)} />;
  if (showHealth) return <HealthScreen g={g} onBack={() => setShowHealth(false)} />;
  if (showMental) return <MentalScreen g={g} onBack={() => setShowMental(false)} />;
  if (showFame) return <FameScreen g={g} onBack={() => setShowFame(false)} />;
  if (showRespect) return <RespectScreen g={g} onBack={() => setShowRespect(false)} />;
  if (g.bigMoment) return <BigMoment moment={g.bigMoment} look={lookOf(g)} onClose={() => dispatch(clearBigMoment)} />;
  if (g.depression?.pending) return <CheckpointModal g={g} />;
  if (g.drink?.pending) return <UltimatumModal g={g} />;
  const firstDay = allSets(g).find((p) => !p.take);
  if (firstDay) return <StoryRoom g={g} p={firstDay} />;
  if (g.night) return <NightRoom g={g} />;
  if (g.tour) return <TourRoom g={g} />;
  if (g.openContract) return <ContractRoom g={g} onClose={() => dispatch(closeContract)} />;
  if (g.openOption && (g.inbox || []).some((m) => m.id === g.openOption)) return <OptionPaper g={g} onClose={() => dispatch((s) => { s.openOption = null; return s; })} />;
  if (showRoom) return <RoomScreen g={g} onBack={() => setShowRoom(false)} />;
  // onPerson: the Directors screen opens a director's own card in People — the one PersonSheet,
  // with the actions it already has, rather than a second copy of them inside the passport.
  if (showPassport) return <Passport g={g} onClose={() => setShowPassport(false)} onRoom={() => { setShowPassport(false); setShowRoom(true); }}
    onPerson={(id) => { setShowPassport(false); setScreen('people'); setOpenPerson(id); }} />;
  if (confirmEnd) return <EndLifeModal onCancel={() => setConfirmEnd(false)} onConfirm={() => { import('./systems/meta/legacy.js').then(m => { m.enshrine(g); newLife(); setConfirmEnd(false); setOpenPerson(null); setScreen('life'); }); }} />;
  return (
    <div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: 'transparent', color: theme.text, padding: 16, paddingBottom: 90, fontFamily: FONT }}>
      {/* Not a screen you navigate to — a window over the life. Maxi: "it should be a
          pop-up, not a page, and a smaller font so all the work fits without scrolling." */}
      {showHits && <HitsPopup g={g} onClose={() => setShowHits(false)} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9 }}>
          <HeaderFigures g={g} onOpen={() => setShowPassport(true)} />
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 25, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-.01em' }}>{g.name}</div>
            {/* Keyed on the date so a month passing actually moves on screen. */}
            <div key={`${g.year}-${g.month}`} className="fof-tick" style={{ fontSize: 12.5, color: theme.muted, marginTop: 3 }}>{g.ageY} yrs · {MON[g.month]} {g.year}</div>
            {/* "who is that standing next to me" should never be a question */}
            <div style={{ fontSize: 10, color: theme.accent, marginTop: 2, opacity: .75 }}>
              {companionOf(g) ? `with ${companionOf(g).person.name.split(' ')[0]} · ${companionOf(g).married ? 'married' : 'together'}` : g.city}
            </div>
            {/* The film next to your name — the latest hit, and it changes when there is a new one. */}
            {(() => { const k = inCareer(g) ? knownFor(g) : null; if (!k) return null;
              const more = theHits(g).length + theFlops(g).length > 1;
              return (<div onClick={more ? () => setShowHits(true) : undefined}
                style={{ fontSize: 10, color: k.hit ? theme.gold : theme.muted, marginTop: 2, fontWeight: 700, cursor: more ? 'pointer' : 'default' }}>
                {k.hit ? '★ ' : ''}Known for "{k.title}" · {k.why}{more ? ' ›' : ''}
              </div>); })()}
            {/* The label the business has for you — two at most, the strong ones in gold. Tap the figure for the rest. */}
            {activeLabels(g).length > 0
              ? <div style={{ fontSize: 10, marginTop: 2, fontWeight: 700, color: theme.muted }}>{activeLabels(g).slice(0, 2).map((id, i) => <span key={id} style={{ color: isStrong(g, id) ? theme.gold : theme.muted }}>{i ? ' · ' : ''}{labelInfo(id).label}</span>)}</div>
              : (() => { const t = tendency(g); return t ? <div style={{ fontSize: 10, marginTop: 2, fontWeight: 600, color: theme.muted, opacity: .75 }}>becoming {t.label.toLowerCase()}</div> : null; })()}
            {/* Being talked about, on the face of it rather than one tap inside the fame tile. */}
            {/* Nominated, or a winner, said next to the name — which is where it is said in
                life. career/awards.js askerLine */}
            {/* Whose child you are. It is the first thing anybody says about you and the
                last thing you get rid of. life/origin.js */}
            {(() => { const hl = heirLine(g); if (!hl) return null;
              return <div style={{ fontSize: 10, marginTop: 2, fontWeight: 700, color: hl.own ? theme.accent : theme.muted, opacity: hl.own ? 1 : .8 }}>{hl.text}</div>; })()}
            {(() => { const al = inCareer(g) ? askerLine(g) : null; if (!al) return null;
              return <div style={{ fontSize: 10, marginTop: 2, fontWeight: 800, color: theme.gold, opacity: al.hot ? 1 : .8 }}>🏆 {al.text}</div>; })()}
            {hype(g) >= 20 && <div style={{ fontSize: 10, marginTop: 2, fontWeight: 700, color: hypeSource(g) === 'scandal' ? '#ff8d9e' : theme.accent }}>
              hype {Math.round(hype(g))}{hypeSource(g) ? ' · ' + SOURCES[hypeSource(g)].label : ''}
            </div>}
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
            {g.homeless ? 'On the street' : hostName(g) ? `At ${hostName(g)}'s` : g.livingWith === 'parents' && !g.hasApartment ? 'Living with parents' : g.inheritedHome ? 'The family house' : (HOUSING[g.housing || 'room'] || {}).label || 'Own apartment'}
          </div>
        </div>
      </div>

      {/* Fame × Respect, in one line. The two ladders finally saying something together — the
          face, the actor's actor, the real thing. See systems/meta/standing.js. */}
      {inCareer(g) && comboOf(g) !== 'beginning' && screen === 'life' && <ComboStrip g={g} />}
      {/* What just happened, said on the screen you are on. Home has its own card and the
          Phone its own strip; everywhere else a result used to be written to a card two
          taps away — Maxi: "I press it and nothing happens." */}
      {screen !== 'life' && screen !== 'phone' && <ScreenToast g={g} screen={screen} />}
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
          <Stat label="Standing" value={g.respect} sub="tap ›" onClick={() => setShowRespect(true)} />
        </div>
        {g.lastEvent && <Card style={{ marginBottom: 14, borderColor: 'rgba(255,209,102,.35)' }}><div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{g.lastEvent}</div></Card>}
        {inCareer(g) && <StandingCard g={g} />}
        {inCareer(g) && <StandoffCard g={g} />}
        {inCareer(g) && <EndorsementCard g={g} />}
        {inCareer(g) && <CampaignCard g={g} />}
        {inCareer(g) && <SeasonCard g={g} />}
        {inCareer(g) && <BubbleCard g={g} />}
        {inCareer(g) && <CollabCard g={g} />}
        {inCareer(g) && <StoriesCard g={g} />}
        {g.illness && (<Card style={{ marginBottom: 14, borderColor: 'rgba(255,90,122,.5)' }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.bad, marginBottom: 5 }}>🤒 {g.illness.name}{g.illness.serious ? ' · serious' : ''}</div>
          <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.5, marginBottom: 9 }}>
            {g.illness.freezes ? 'Everything on your calendar is frozen until you are through this.' : 'It drains you every month, and small things left alone become big ones.'}
          </div>
          <Button kind="pri" onClick={() => setShowHealth(true)}>Deal with it ›</Button>
        </Card>)}
        {inCareer(g) && allSets(g).map((p, i) => (<Card key={p.id || i} style={{ marginBottom: 14, borderColor: 'rgba(255,209,102,.35)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.gold }}>🎬 On set{allSets(g).length > 1 ? ` · ${i + 1} of ${allSets(g).length}` : ''}</div>
            <div style={{ fontSize: 11.5, color: theme.muted }}>{meterTier(p.meter).label}</div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3 }}>{p.title} · {p.prepLeft > 0 ? `preparing, ${p.prepLeft} mo` : `${p.monthsLeft} mo left`}</div>
          {/* The card used to say "Manage it from the Career tab" and nothing else, so a player
              who pressed Live one month from here skipped the month's rehearsal without
              ever knowing there was one to skip — and the director's opinion, the thing
              that actually cools, was not shown anywhere at all. Both are here now. */}
          <OnSetNow g={g} p={p} />
        </Card>))}
        {/* One offer, one place. Home used to list every offer with its own Accept and Pass,
            beside the same offer in Messages and the same letter in Email — Maxi: "offers
            are duplicated everywhere?" Home points; Messages is where the paper is. */}
        {inCareer(g) && (g.offers || []).length > 0 && (<button onClick={() => setScreen('phone')} style={{ width: '100%', textAlign: 'left', background: theme.panel, border: `1px solid ${theme.gold}55`, borderRadius: 12, padding: '10px 13px', marginBottom: 14, cursor: 'pointer', color: theme.text }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>📨 {g.offers.length === 1 ? 'An offer' : `${g.offers.length} offers`} waiting in Messages</div>
            <div style={{ fontSize: 11, color: theme.gold, fontWeight: 800 }}>open ›</div>
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3 }}>{g.offers.slice(0, 3).map((o) => String(o.projectTitle || '').replace('⭐ ', '')).join(' · ')}{g.offers.length > 3 ? ' · …' : ''}</div>
        </button>)}
        {inCareer(g) && <AaaTracker g={g} />}
        <LifeCard g={g} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted }}>What now</div>
          <EnergyBar g={g} />
        </div>
        {(g.apWhy || []).some((w) => /−/.test(w)) && <div style={{ fontSize: 10.5, color: theme.muted, textAlign: 'right', margin: '-4px 0 8px' }}>This month: {(g.apWhy || []).join(' · ')}</div>}
        <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
          <DepressionCard g={g} />
          {availableActions(g).map((a) => { const noEnergy = !canAfford(g, COST.careerAction);
            return (<button key={a.id} onClick={() => dispatch(runAction, a.id)} disabled={noEnergy} style={{ textAlign: 'left', background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '10px 13px', cursor: noEnergy ? 'default' : 'pointer', color: theme.text, opacity: noEnergy ? .4 : 1 }}><div style={{ fontSize: 14, fontWeight: 800 }}>{a.label(g)}</div><div style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>{a.desc(g)}</div></button>); })}
          {!canAfford(g, COST.careerAction) && <div style={{ fontSize: 11.5, color: theme.gold, textAlign: 'center', padding: '4px 0' }}>Not enough energy left this {g.stage === 'child' || g.stage === 'teen' ? 'year' : 'month'} for these ({COST.careerAction} each).</div>}
          {/* Around town: the cheap things an evening is for. Measured, half the month's energy
              went unspent in the first years — a lesson, one read, and "live one month". */}
          {townOpen(g) && (() => { const list = townFor(g); if (!list.length) return null;
            return (<div>
              <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, margin: '4px 2px 6px' }}>Around town</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {list.map((t) => (<button key={t.id} onClick={() => dispatch(goOut, t.id)} disabled={!t.open} title={t.why || t.blurb}
                  style={{ textAlign: 'left', background: t.open ? theme.panel : 'rgba(120,110,150,.10)', border: `1px solid ${t.open ? theme.line : 'transparent'}`, borderRadius: 12, padding: '9px 12px', cursor: t.open ? 'pointer' : 'default', color: t.open ? theme.text : '#6b6390' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>{t.label}</div>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: t.open ? theme.gold : '#6b6390', whiteSpace: 'nowrap' }}>{t.ap} energy{t.cost ? ` · €${t.cost.toLocaleString()}` : ''}</div>
                  </div>
                  <div style={{ fontSize: 11, color: t.open ? theme.muted : '#6b6390', marginTop: 2, lineHeight: 1.45 }}>{t.open ? t.blurb : t.why}</div>
                </button>))}
              </div>
            </div>); })()}
          {inCareer(g) && <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', padding: '6px 8px', lineHeight: 1.55, opacity: .85 }}>
            Auditions and shifts are in your Phone. Training and parties are under Career. Family is under People.
          </div>}
          {g.stage === 'teen' && <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', padding: '6px 8px', lineHeight: 1.55, opacity: .85 }}>
            Extra work and shifts are in your Phone. Acting lessons are under Career. These are the things you can only do once.
          </div>}
        </div>
        <Button kind="pri" sfx={stepIsYear(g) ? 'year' : 'month'} onClick={() => dispatch(advanceTime)}>{stepIsYear(g) ? '▶ Live one year' : '▶ Live one month'}</Button>
        {g.stage === 'child' && (g.ageY || 0) < 12 && <button onClick={() => dispatch(advanceUntilSomething)} style={{ width: '100%', marginTop: 8, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '10px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: 'transparent', color: theme.muted }}>▶▶ Live until something happens</button>}
        {/* The same button for the rest of it. A seven-month shoot was seven identical
            presses; the months between two jobs were worse. Everything still runs — you are
            simply not asked to press for a month in which nothing wanted you. engine/time.js */}
        {g.stage !== 'child' && canSkip(g) && <button onClick={() => dispatch(liveUntilSomething)} style={{ width: '100%', marginTop: 8, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '10px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: 'transparent', color: theme.muted }}>▶▶ Live until something happens</button>}
        {g._skipped && g._skipped.months > 1 && <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', marginTop: 6, lineHeight: 1.5 }}>
          {g._skipped.months} months went by{g._skipped.why ? ` and then ${SKIP_WHY[g._skipped.why] || 'something wanted you'}.` : ' and nothing wanted you at all, which is its own kind of news.'}
        </div>}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Timeline</div>
          {(g.timeline || []).slice(0, 8).map((e, i) => (<div key={i} style={{ fontSize: 12.5, color: e.bad ? theme.bad : theme.text, padding: '6px 0', borderBottom: `1px solid ${theme.line}` }}><span style={{ color: theme.muted, marginRight: 8 }}>{e.when}</span>{e.text}</div>))}
          {(!g.timeline || !g.timeline.length) && <div style={{ fontSize: 12.5, color: theme.muted }}>Your story starts here. Live a year.</div>}
        </div>
        <LegacyPanel g={g} wall={false} />
       </>}
      </div>

      {/* Settings on Home, the end of a life on Legacy. Maxi: 'that button is everywhere — remove it.' */}
      {screen === 'life' && <SettingsRow />}
      {screen === 'legacy' && <div style={{ marginTop: 14 }}>
        <Button kind="danger" onClick={() => setConfirmEnd(true)}>End this life & start anew</Button>
      </div>}
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
    {NAV.map((n) => { const active = screen === n.id; const badge = n.id === 'career' && inCareer(g) ? (g.offers || []).length : n.id === 'phone' && inCareer(g) ? ((g.inbox||[]).filter(m=>!m.read).length + (g.sms||[]).filter(m=>!m.read).length) : 0;
      return (<button key={n.id} data-sfx="nav" onClick={() => setScreen(n.id)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 0', position: 'relative' }}>
        <span style={{ fontSize: 20, filter: active ? 'none' : 'grayscale(.55) opacity(.55)', transition: 'filter .2s' }}>{n.icon}</span>
        <span style={{ fontSize: 10, fontWeight: active ? 800 : 600, color: active ? theme.accent : theme.muted, transition: 'color .2s' }}>{n.label}</span>
        {/* The lit tab gets a mark under it, so the bar reads at a glance and not only by colour. */}
        {active && <span style={{ position: 'absolute', top: 0, width: 22, height: 3, borderRadius: 2, background: theme.accent, boxShadow: `0 0 10px ${theme.accent}` }} />}
        {badge > 0 && <span style={{ position: 'absolute', top: 0, right: '26%', minWidth: 15, height: 15, borderRadius: 8, background: '#ff3b30', color: '#fff', fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>}</button>); })}
  </div>);
}
function ScreenToast({ g, screen }) {
  const [toast, setToast] = useState(null);
  const seenRef = useRef(g.lastEvent);
  useEffect(() => {
    if (g.lastEvent && g.lastEvent !== seenRef.current) {
      seenRef.current = g.lastEvent;
      setToast(g.lastEvent);
      const id = setTimeout(() => setToast(null), 8000);
      return () => clearTimeout(id);
    }
  }, [g.lastEvent]);
  useEffect(() => { seenRef.current = g.lastEvent; setToast(null); }, [screen]);
  if (!toast) return null;
  return (<div onClick={() => setToast(null)} className="fof-in" style={{ fontSize: 12.5, color: theme.text, padding: '9px 13px', marginBottom: 12, background: `${theme.accent}1f`, border: `1px solid ${theme.accent}44`, borderRadius: 10, lineHeight: 1.5, cursor: 'pointer', whiteSpace: 'pre-line' }}>{toast}</div>);
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

// The two settings the game has: what it looks like, and whether it makes a sound. Kept
// out of the save on purpose — both should survive starting a new life.
function SettingsRow() {
  const [open, setOpen] = useState(false);
  const [saves, setSaves] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState('');
  const [note, setNote] = useState('');
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
      <button onClick={() => setSaves(!saves)} title="Carry this life to another place"
        style={{ width: 52, background: 'none', border: `1px solid ${theme.line}`, borderRadius: 11, padding: '9px 0',
          color: theme.muted, fontSize: 15, cursor: 'pointer' }}>💾</button>
    </div>
    {/* A life lives in the storage of wherever the game was opened from, and every address
        has its own. This is how it travels — and the only backup the game has. */}
    {saves && (<div className="fof-in" style={{ marginTop: 8, border: `1px solid ${theme.line}`, borderRadius: 12, padding: 11 }}>
      <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5, marginBottom: 9 }}>
        Your life is saved where you opened the game from. Open it somewhere else — a link, another
        computer — and that place starts empty. Save the file here and load it there.
      </div>
      <div style={{ display: 'flex', gap: 7 }}>
        <button onClick={() => { const f = exportSave(); setNote(`Saved ${f}`); }}
          style={{ flex: 1, border: 'none', borderRadius: 10, padding: '10px 8px', fontSize: 12, fontWeight: 800, cursor: 'pointer',
            background: `linear-gradient(135deg,${theme.accent2},${theme.accent})`, color: '#fff' }}>Save this life to a file</button>
        <label style={{ flex: 1, textAlign: 'center', border: `1px solid ${theme.line}`, borderRadius: 10, padding: '10px 8px',
          fontSize: 12, fontWeight: 800, cursor: 'pointer', color: theme.text, background: theme.panel }}>
          Load a life from a file
          <input type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(e) => {
            const file = e.target.files && e.target.files[0]; if (!file) return;
            const r = new FileReader();
            r.onload = () => { const why = importSave(String(r.result || '')); setNote(why || 'Loaded. Carry on.'); };
            r.onerror = () => setNote('That file could not be read.');
            r.readAsText(file); e.target.value = '';
          }} />
        </label>
      </div>
      {/* A download is blocked wherever the game is opened from something that is not a
          file — a hosted link, an app viewer. Text always travels, so the same life goes
          through the clipboard as well. */}
      <div style={{ display: 'flex', gap: 7, marginTop: 7 }}>
        <button onClick={() => {
            const t = JSON.stringify(getState());
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(t).then(() => setNote('Copied. Paste it wherever you want to carry on.'))
                .catch(() => setNote('Could not reach the clipboard here.'));
            } else setNote('Could not reach the clipboard here.');
          }}
          style={{ flex: 1, border: '1px solid ' + theme.line, borderRadius: 10, padding: '9px 8px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', background: theme.panel, color: theme.text }}>Copy this life</button>
        <button onClick={() => setPasting(!pasting)}
          style={{ flex: 1, border: '1px solid ' + theme.line, borderRadius: 10, padding: '9px 8px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', background: theme.panel, color: theme.text }}>Paste a life</button>
      </div>
      {pasting && (<div style={{ marginTop: 7 }}>
        <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Paste the copied life here"
          style={{ width: '100%', height: 72, background: theme.bg, border: '1px solid ' + theme.line, borderRadius: 10, padding: 8, color: theme.text, fontSize: 11, fontFamily: 'inherit', resize: 'vertical' }} />
        <button onClick={() => { const why = importSave(pasted.trim()); setNote(why || 'Loaded. Carry on.'); if (!why) { setPasting(false); setPasted(''); } }}
          style={{ width: '100%', marginTop: 6, border: 'none', borderRadius: 10, padding: '9px 8px', fontSize: 12, fontWeight: 800, cursor: 'pointer', background: 'linear-gradient(135deg,' + theme.accent2 + ',' + theme.accent + ')', color: '#fff' }}>Load it</button>
      </div>)}
      {note && <div style={{ fontSize: 11.5, color: /not|could not/.test(note) ? theme.bad : theme.good, marginTop: 8 }}>{note}</div>}
    </div>)}
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

// What you are known for, which is not the same as what you did last. The line on the
// front carries the newest big thing; this is the shelf behind it. Maxi: "so we understand
// who she is and not by the most recent." A career is both columns — the hits people name
// and the ones they still bring up. See systems/meta/knownFor.js.
function HitsPopup({ g, onClose }) {
  const hits = theHits(g), flops = theFlops(g);
  const money = (n) => (n >= 1e9 ? `€${(n / 1e9).toFixed(2)}bn` : n >= 1e6 ? `€${Math.round(n / 1e6)}m` : null);
  const row = (t, year, mid, right, tone, star) => (
    <div key={t + year} style={{ display: 'flex', alignItems: 'baseline', gap: 6, padding: '3.5px 0', borderBottom: `1px solid ${theme.line}` }}>
      <span style={{ fontSize: 11.5, fontWeight: 800, color: tone, flex: '0 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{star ? '★ ' : ''}{t}</span>
      <span style={{ fontSize: 9.5, color: theme.muted, flex: 'none' }}>{year}</span>
      <span style={{ fontSize: 10, color: theme.muted, flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mid}</span>
      <span style={{ fontSize: 10, color: tone, flex: 'none', fontWeight: 700 }}>{right}</span>
    </div>);
  return (<div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(6,4,14,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 360, maxHeight: '82vh', overflowY: 'auto', background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 16, padding: '14px 14px 12px', boxShadow: '0 18px 50px rgba(0,0,0,.55)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 900 }}>What you are known for</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.muted, fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
      </div>
      {!hits.length && <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.5 }}>Nothing anybody would call a hit yet.</div>}
      {hits.map((h) => row(h.title, h.year, h.band, money(h.boxOffice) || h.score.toFixed(1), h.weight >= 3 ? theme.gold : theme.text, h.weight >= 3))}
      {!!flops.length && <div style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.muted, margin: '9px 0 2px' }}>And the ones they bring up</div>}
      {flops.slice(0, 8).map((fl) => row(fl.title, fl.year, fl.verdict === 'bomb' ? 'bomb' : 'ignored', fl.score.toFixed(1), theme.bad, false))}
    </div>
  </div>);
}

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
          disabled={!canAfford(g, COST.doctor)} style={btn('', !canAfford(g, COST.doctor))}>Ride it out yourself</button>
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
  const h = Math.round(hype(g));
  const tail = h >= 20 ? ` · hype ${h}${hypeSource(g) === 'scandal' ? ' (tabloid)' : ''}` : '';
  return fameSubBase(g) + tail;
}
function fameSubBase(g) {
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
  // Your place in the business, once there is one. Fame is comparative now — world.js.
  const rank = g.world && g.world.rank && g.world.rank.you;
  const place = rank && rank <= 60 && (g.filmography || []).length ? ` · #${rank} in the business` : '';
  return next ? `${t.label} · ${Math.max(1, Math.ceil(next.min - (g.fame || 0)))} to ${next.label}${place}` : `${t.label}${place}`;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Three different trials in a random order, so nobody solves this once and coasts. The
// week is a small puzzle; the names are a small memory; the conversation changes shape
// depending on whether there is anybody left in your life.
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
const SKIP_WHY = {
  'a day on set': 'they need you on set',
  'an offer': 'something came in',
  'a network decided': 'a network finally said something',
  'the nominations': 'the nominations happened',
  'it came out': 'it came out',
  'the money': 'the money ran out',
  moment: 'something happened',
  stage: 'everything changed',
  health: 'your health went somewhere you should look at',
  mental: 'you stopped being all right',
  life: 'it ended',
};

// The room where it gets decided. Maxi, five seasons into his own show and beaten on the
// fee five times: "if you cannot agree there is a meeting, you are invited, and you decide
// finally what happens and on what terms." It is not another letter. career/standoff.js
function StandoffCard({ g }) {
  // The room itself is a modal now. This is the WAITING, which is most of the pressure and
  // the part I had left out: business affairs stop replying, an invitation arrives, and there
  // is a month in the diary with an entire season held against it. career/standoff.js
  const d = roomDue(g);
  if (!d) return null;
  const MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return (<Card style={{ marginBottom: 14, borderColor: 'rgba(255,209,102,.45)' }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.gold, marginBottom: 4 }}>
      A date about "{d.title}"
    </div>
    <div style={{ fontSize: 12.5, fontWeight: 800 }}>
      {MONS[d.due % 12]} {Math.floor(d.due / 12)}{d.months <= 0 ? ' — this month' : d.months === 1 ? ' — next month' : ` — in ${d.months} months`}
    </div>
    <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.45, marginTop: 3 }}>
      Business affairs have stopped replying. Instead there is an invitation: the studio head,
      business affairs, the showrunner, your agent and you, in one room for an afternoon.
      Nothing about season {d.season + 1} moves until then.
    </div>
  </Card>);
}

// The six months between the nominations and the night. They used to be silent.
function SeasonCard({ g }) {
  const season = openSeason(g);
  if (!season || !season.nominations.length) return null;
  return (<Card style={{ marginBottom: 14, borderColor: 'rgba(255,209,102,.38)' }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.gold, marginBottom: 4 }}>
      🏆 The Askers · {season.year}
    </div>
    {season.nominations.map((n, i) => (<div key={i} style={{ padding: '6px 0', borderTop: i ? `1px solid ${theme.line}` : 'none' }}>
      <div style={{ fontSize: 12.5, fontWeight: 800 }}>{n.label}</div>
      <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 1 }}>for "{String(n.title).replace('⭐ ', '')}"</div>
      <div style={{ fontSize: 11.5, color: theme.gold, marginTop: 3, fontWeight: 700 }}>{n.buzz}.</div>
    </div>))}
    <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 6, lineHeight: 1.45 }}>
      {season.monthsLeft <= 1
        ? 'The night is this month. Everybody you know has an opinion about what you should say.'
        : `${season.monthsLeft} months until the night. Between now and then it is lunches, panels, and the same four questions.`}
    </div>
  </Card>);
}
// The things you and somebody you know decided to make, waiting on money. Most of them
// will die there; that is what development is. See systems/career/collab.js.
function CollabCard({ g }) {
  const list = liveCollabs(g);
  if (!list.length) return null;
  return (<Card style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 4 }}>Making something together</div>
    {list.map((c, i) => (<div key={c.id} style={{ padding: '6px 0', borderTop: i ? `1px solid ${theme.line}` : 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800 }}>"{c.title}"</div>
        <div style={{ fontSize: 10.5, color: theme.muted, flex: 'none' }}>{c.monthsOut <= 1 ? 'any week now' : `~${c.monthsOut} mo`}</div>
      </div>
      <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.45, marginTop: 2 }}>with {c.name} · {c.what}</div>
    </div>))}
    <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 5, lineHeight: 1.45 }}>In development. Nobody has paid for it yet, and most of these never get paid for.</div>
  </Card>);
}
// Worth watching. Every story the world can run on you (trouble.js) has a warning here
// first, for a month or more, with what would fix it. Nothing lands out of a clear sky —
// Maxi: a crisis you could not see coming is a dice roll, not difficulty. Empty months
// show nothing; a careful life has a clean main screen.
// The career stories that are running (stories.js): a title and where it stands. The
// beats arrive as the same modal a life dilemma uses; this is the thread between them.
function StoriesCard({ g }) {
  const list = activeStories(g);
  if (!list.length) return null;
  return (<Card style={{ marginBottom: 14, borderColor: `${theme.accent}40` }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.accent, marginBottom: 6 }}>In your life now</div>
    <div style={{ display: 'grid', gap: 6 }}>
      {list.map((x) => (<div key={x.id}>
        <div style={{ fontSize: 12.5, fontWeight: 800 }}>{x.title}</div>
        {x.line && <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.45 }}>{x.line}</div>}
      </div>))}
    </div>
  </Card>);
}
const CAREER_TABS = [['calendar', 'Calendar'], ['training', 'Training'], ['credits', 'Filmography'], ['events', 'Events']];
// The year ahead lives in ui/components/Diary.jsx — a row a month, every line written out.
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
    {tab === 'calendar' && <><Diary g={g} />{allSets(g).length ? allSets(g).map((p) => <ProductionCard key={p.id || p.title} g={g} p={p} />) : <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: '18px 10px', lineHeight: 1.6 }}>🎬 Nothing shooting.<br />Land a part — read on OpenCall, or take an offer in Messages — and the shoot goes on the calendar.</div>}</>}
    {tab === 'training' && <TrainingScreen g={g} />}
    {tab === 'credits' && <CreditsList g={g} credits={credits} label={creditsLabel} />}
    {tab === 'events' && <EventsScreen g={g} />}
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
  return (<div onClick={onOpen} title="Who you are" style={{ display: 'flex', alignItems: 'flex-end', gap: 1, cursor: 'pointer' }}>
    <Avatar look={lookOf(g)} size={48} title={g.name} />
    {mate && <Avatar look={lookOfPerson(mate.person)} size={mate.married ? 46 : 42}
      title={`${mate.person.name} · ${mate.married ? 'spouse' : 'partner'}`}
      style={{ opacity: mate.married ? 1 : .82 }} />}
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
// A day on the set. One of six games, skinned by the scene and scaled by how hard the day
// is, and what comes out of it moves the picture. See systems/career/scenes.js.
function SceneModal({ g }) {
  const sc = g.scene;
  // A relayed note: a scene was a test of whether you could play it and never a question about
  // HOW. The sixteen minigames are good; skill on its own is a calculator. So the day asks
  // first — the director, the studio and you want different things out of it — and only then
  // finds out whether you can do the thing you just chose. career/scenes.js APPROACHES.
  const [state, setState] = useState(sc.approach ? 'ready' : 'brief');
  const [score, setScore] = useState(null);
  // The day ends on a card. It used to drop you straight back to the main screen with a
  // line in the feed, which read as nothing having happened at all.
  const done = (q) => { play(q >= 88 ? 'printed' : q < 25 ? 'blown' : 'tap'); setScore(Math.round(q)); setState('done'); };
  const finish = () => dispatch(resolveScene, score);
  const take = (id) => { dispatch(chooseApproach, id); setState('ready'); };
  // For anybody who does not want to play the day by hand. The CHARACTER acts, not the person
  // holding the phone: this reads craft, preparation and the director. See autoQuality.
  const auto = () => done(autoQuality(g));
  const d = sc.difficulty || 1;
  // The thinking days are written from the picture itself, so they need the set the scene
  // belongs to — the modal had only the scene. career/scenework.js
  const onSet = allSets(g).find((x) => x.id === sc.setId) || allSets(g)[0] || null;
  const lines = {
    Horror: ['It was in the house.', 'You said that already.', 'No — listen.', 'It is upstairs.', 'Do not turn round.', 'I said do not.', 'It knows my name.', 'It always did.'],
    Comedy: ['This is fine.', 'This is completely fine.', 'Nobody is panicking.', 'I am not panicking.', 'You are panicking.', 'That is the smoke alarm.', 'That is definitely the smoke alarm.', 'Right.'],
    Romance: ['I was going to write.', 'You were not.', 'I was.', 'For eleven years.', 'I kept the envelopes.', 'That is not the same.', 'No.', 'It is not.'],
  }[sc.genre];
  const opts = [
    { label: 'Stay in it and answer as the character', good: 82 },
    { label: 'Break, and make the break part of it', good: 58 },
    { label: 'Wait for the director to call cut', good: 24 },
  ];
  const game = sc.game === 'timing' ? <TimingBar zoneStart={14 + Math.random() * 58} zoneWidth={Math.max(6, 15 - d * 3.5)} speed={2.2 + d * 1.4} onResult={done} />
    : sc.game === 'grid' ? <GridRisk cols={4} rows={3} bad={Math.max(2, Math.round(2 + d))} labelSafe="✓" labelBad="✕" onResult={done} />
    : sc.game === 'rhythm' ? <RhythmLine difficulty={d} lines={lines} onResult={done} />
    : sc.game === 'hold' ? <HoldZone difficulty={d} seconds={6} onResult={done} />
    : sc.game === 'keys' ? <KeySequence difficulty={d} onResult={done} />
    : sc.game === 'chrono' ? <Chronology difficulty={d} {...chronologyFor(g, onSet, d)} onResult={done} />
    : sc.game === 'lines' ? <ScriptLines difficulty={d} {...linesFor(g, onSet, d)} onResult={done} />
    : sc.game === 'motive' ? <Motive difficulty={d} {...motiveFor(g, onSet, d)} onResult={done} />
    : sc.game === 'frame' ? <FrameCheck difficulty={d} onResult={done} />
    : sc.game === 'light' ? <FindTheLight difficulty={d} onResult={done} />
    : sc.game === 'cut' ? <TheAssembly difficulty={d} {...assemblyFor(g, onSet, d)} onResult={done} />
    : sc.game === 'pairs' ? <WhoSaysIt difficulty={d} {...readFor(g, onSet, d)} onResult={done} />
    : sc.game === 'nono' ? <TakeSheet difficulty={d} onResult={done} />
    : <QuickPick difficulty={d} prompt={`"${sc.director} has not called cut. Your co-star is looking at you."`} options={opts} onResult={done} />;
  return (<div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', color: theme.text, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: FONT }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', color: theme.gold, marginBottom: 8 }}>🎬 {sc.title} · {sc.label}</div>
    <div style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 14 }}>{sc.line}</div>
    {state === 'brief'
      ? (<>
          <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>How are you playing it?</div>
          <div style={{ display: 'grid', gap: 9, marginBottom: 6 }}>
            {approachesFor(g, onSet).map((ap) => (<button key={ap.id} disabled={!ap.open} onClick={() => ap.open && take(ap.id)}
              style={{ textAlign: 'left', background: ap.open ? theme.panel : 'rgba(120,110,150,.10)',
                border: `1px solid ${ap.id === 'change' && ap.open ? 'rgba(255,209,102,.45)' : theme.line}`,
                borderRadius: 12, padding: '12px 14px', cursor: ap.open ? 'pointer' : 'default',
                color: ap.open ? theme.text : '#6b6390', fontSize: 14, fontWeight: 700, fontFamily: FONT }}>
              {ap.label}
              <div style={{ fontSize: 11.5, fontWeight: 500, color: ap.open ? theme.muted : '#6b6390', marginTop: 3, lineHeight: 1.45 }}>
                {ap.open ? ap.blurb : ap.why}</div></button>))}
          </div></>)
      : state === 'ready'
      ? (<>
          <div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.5, marginBottom: 10 }}>{sc.hint}</div>
          {/* HOW IT IS PLAYED, before Action rather than discovered during it. Maxi, on a
              nonogram: 'вот как играть это?' The hint is mood — it says what you are looking
              at. A timing bar explains itself; a grid of numbers does not, and the rule that
              makes it solvable (that 1 1 means two runs with a gap between) is not guessable
              by anybody who has not met one before. career/scenes.js RULES. */}
          {(() => { const r = rulesFor(sc.game); return r ? (<div style={{ background: 'rgba(158,116,255,.10)', border: '1px solid ' + theme.line, borderRadius: 11, padding: '10px 12px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.accent, marginBottom: 5 }}>How it is played</div>
            {r.map((l, k) => (<div key={k} style={{ fontSize: 12, color: theme.text, opacity: .9, lineHeight: 1.5 }}>{l}</div>))}
          </div>) : null; })()}
          <Button kind="pri" sfx="action" onClick={() => setState('play')}>Action</Button>
          <div style={{ height: 8 }} />
          <button onClick={auto} style={{ width: '100%', background: 'transparent', border: `1px solid ${theme.line}`,
            borderRadius: 12, padding: '11px 14px', cursor: 'pointer', color: theme.muted, fontSize: 12.5,
            fontWeight: 700, fontFamily: FONT }}>Let the take happen
            <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>Played out on your training and the day. You can beat it by hand, and you can do worse.</div>
          </button></>)
      : state === 'play' ? game
      : (<>
          <div style={{ textAlign: 'center', padding: '10px 0 14px' }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 44, fontWeight: 700, color: score >= 70 ? theme.gold : score >= 45 ? theme.text : theme.bad }}>{score}</div>
            <div style={{ fontSize: 12, color: theme.muted, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 800 }}>out of a hundred</div>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, textAlign: 'center', marginBottom: 6 }}>
            {/* The same line exists in career/scenes.js and was guarded there; this is the
                card on the screen, which reads the name off the scene rather than the set and
                printed "undefined came over afterwards" when the scene did not carry one. */}
            {score >= 88 ? `They printed the first one. ${sc.director || ((onSet && onSet.crew && onSet.crew[0] && onSet.crew[0].name) || 'The director')} came over afterwards, which they do not do.`
              : score >= 70 ? 'Three takes and it was there. A good day, and everybody knew it.'
              : score >= 45 ? 'You got it in the end. Nobody will remember the day either way.'
              : score >= 25 ? 'It never quite landed. They have enough to cut around it.'
              : 'It did not work. They moved on, and the schedule moved with them.'}
          </div>
          {score >= 88 && <div style={{ fontSize: 12, color: theme.gold, textAlign: 'center', marginBottom: 14, lineHeight: 1.5 }}>★ That take is in the film now — the critics will have something to name.</div>}
          <Button kind="pri" onClick={finish}>{score >= 70 ? 'That is the day' : 'Move on'}</Button>
        </>)}
  </div>);
}
function ArcModal({ g }) {
  const a = g.pendingArc;
  return (<div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: 'transparent', color: theme.text, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: FONT }}><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', color: theme.accent, marginBottom: 10 }}>{a.speaker}</div><div style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>{a.text}</div><div style={{ display: 'grid', gap: 9 }}>{a.choices.map((c, i) => (<button key={i} onClick={() => dispatch(resolveArc, i)} style={{ textAlign: 'left', background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '13px 15px', cursor: 'pointer', color: theme.text, fontSize: 14, fontWeight: 700 }}>{c.label}{c.hint && <div style={{ fontSize: 11.5, fontWeight: 500, color: theme.muted, marginTop: 3 }}>{c.hint}</div>}</button>))}</div></div>);
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
      {/* The second ledger. What they think of your WORK, which dinner has never moved —
          and the sentence underneath only appears when the two disagree, because that is
          the only time it is worth a line. See systems/life/regard.js. */}
      {p.industryWeight > 0 && (() => { const rb = regardBand(regardOf(p)); const note = regardNote(p);
        return (<>
          <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2, color: rb.tone === 'bad' ? theme.bad : rb.tone === 'good' ? theme.gold : theme.muted }}>
            🎬 {rb.label}
          </div>
          {note && <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 1, lineHeight: 1.4 }}>{note}</div>}
        </>); })()}
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
      {/* Maxi: "how do I go back — there is no arrow." There was a button at the bottom, under
          every action; the way back belongs at the top, where every other screen has it. */}
      <button onClick={onClose} style={{ background: 'rgba(158,116,255,.16)', border: 'none', borderRadius: 10, padding: '7px 12px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', color: '#d9cffa', marginBottom: 12 }}>‹ People</button>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 4 }}>
        <Avatar look={lookOfPerson(p)} size={78} title={p.name} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 19, fontWeight: 900 }}>{p.name}</div>
          <div style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>{p.relation || (rel === 'partner' ? 'Partner' : p.role)}{(p.born ? (g.year || 0) - p.born : p.age) != null ? ` · ${p.born ? (g.year || 0) - p.born : p.age}` : ''}{p.job ? ` · ${p.job}` : ''}{rel === 'contact' && g.partner && g.partner.contactId === p.id ? <span style={{ color: '#ff8ab5', fontWeight: 800 }}> · seeing each other</span> : null}</div>
          <BondBar value={p.relationship} height={6} />
          <div style={{ fontSize: 11, color: relBand(p.relationship || 0).tone === 'bad' ? theme.bad : theme.muted }}>
            {relBand(p.relationship || 0).label} · {Math.round(p.relationship || 0)}
          </div>
        </div>
      </div>
      {/* Making something together. Maxi: "what about collaborations?" The card says what
          the two of you would be making, how likely they are to say yes and why — the
          button itself is down in the practical group with everything else. career/collab.js */}
      {(() => {
        const k = kindFor(p); if (!k) return null;
        const mine = liveCollabs(g).find((c) => c.who === p.id);
        if (mine) return (<Card style={{ margin: '12px 0', borderColor: 'rgba(95,206,138,.34)' }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.good }}>In development together</div>
          <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3 }}>"{mine.title}"</div>
          <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5, marginTop: 3 }}>{mine.genre} · {mine.what}. {mine.monthsOut <= 1 ? 'They are hearing from the money any week now.' : `Somebody is still trying to pay for it — ${mine.monthsOut} months of drafts and phone calls.`}</div>
          <div style={{ fontSize: 11, color: theme.muted, marginTop: 4, lineHeight: 1.45 }}>Most things in development never get made. If it does, the paper comes to Messages with both your names on it.</div>
        </Card>);
        const fit = canPropose(g, p);
        const o = collabOdds(g, p);
        return (<Card style={{ margin: '12px 0', borderColor: fit.ok ? 'rgba(158,116,255,.34)' : theme.line }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.muted }}>What you two could make</div>
          <div style={{ fontSize: 12.5, fontWeight: 800, marginTop: 3 }}>{k.what(p)}</div>
          <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5, marginTop: 3 }}>{k.blurb}</div>
          {fit.ok
            ? (<><div style={{ fontSize: 12, fontWeight: 800, marginTop: 6, color: o >= 45 ? theme.good : o >= 20 ? theme.gold : theme.muted }}>{o}% they say yes</div>
                {!!collabWhy(g, p).length && <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 2, lineHeight: 1.4 }}>{collabWhy(g, p).join(' · ')}</div>}
                <div style={{ fontSize: 11, color: theme.muted, marginTop: 4, lineHeight: 1.45 }}>Ask them under Practical below. Asking costs goodwill either way.</div></>)
            : <div style={{ fontSize: 11.5, color: theme.gold, marginTop: 6, lineHeight: 1.45 }}>{fit.why}</div>}
        </Card>);
      })()}
      {/* The desk: what they are doing for you, what they take, and the door. */}
      {p.agent && (() => { const al = agentLine(g); if (!al) return null;
        return (<Card style={{ margin: '12px 0', borderColor: 'rgba(255,209,102,.3)' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: theme.gold }}>{al.desk} · {al.cut}% of everything you earn</div>
          <div style={{ fontSize: 12, lineHeight: 1.5, marginTop: 4 }}>{al.blurb}</div>
          <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5, marginTop: 3 }}>Right now: {al.doing}. What they bring lands in Messages under their name.</div>
          {/* Maxi, on a red button in the middle of somebody's profile: "что значит эта кнопка?"
              It fired his agent. It said "Let them go" and nothing else — the warning was inside
              a confirm, which is to say after the decision. What it costs goes on the control.
              agent.js fireAgent: three months before anybody else asks. */}
          <button onClick={() => { if (window.confirm('Leave ' + al.name + '? Nobody else will ask for three months.')) { dispatch(fireAgent); onClose(); } }}
            style={{ marginTop: 8, border: `1px solid ${theme.bad}55`, borderRadius: 9, padding: '7px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer', background: 'rgba(255,90,122,.10)', color: '#ffa8bb', textAlign: 'left' }}>
            Leave {al.name} — stop being represented
            <div style={{ fontSize: 10.5, fontWeight: 500, opacity: .85, marginTop: 2 }}>No agent brings you anything for three months. Parts you have signed are yours.</div>
          </button>
        </Card>); })()}
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
      {found.kind === 'contact' && (() => { const fit = canUse(g, 'vouch'); const recent = p.vouchedAt && (g.year * 12 + g.month) - p.vouchedAt < 24;
        return (<div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.gold, marginBottom: 7, opacity: .85 }}>Your name</div>
          <button disabled={!fit.ok || recent} onClick={() => dispatch(vouchFor, id)}
            style={{ width: '100%', textAlign: 'left', background: theme.panel, border: `1px solid ${fit.ok && !recent ? theme.gold + '55' : 'rgba(255,255,255,.06)'}`, borderRadius: 12, padding: '10px 13px', cursor: fit.ok && !recent ? 'pointer' : 'default', color: theme.text, opacity: fit.ok && !recent ? 1 : .42 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800 }}>◆ {FAVOURS.vouch.label}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: theme.gold, whiteSpace: 'nowrap' }}>−{costOf(g, 'vouch')} standing</div>
            </div>
            <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>{recent ? 'You did that for them already. Twice in two years is a pattern.' : fit.ok ? FAVOURS.vouch.blurb : fit.why}</div>
          </button>
        </div>); })()}
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
                    {a.cost ? `€${a.cost.toLocaleString()}` : ''}{a.cost && a.ap ? ' · ' : ''}{a.ap ? `${a.ap} energy` : ''}
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
// Two tabs. The family as a tree in its own window, and everybody else — directors,
// co-stars, icons, the agent, the ex — in one list with filters, closest first. Three tabs
// would have split five friends from five directors; two is what a phone actually holds.
const CONTACT_FILTERS = [
  ['all', 'All', () => true],
  ['directors', 'Directors', (p) => /Director|Producer/.test(p.role || '')],
  ['actors', 'Actors', (p) => /Actor|Star|Icon|Musician/.test(p.role || '')],
  ['stars', 'Icons & stars', (p) => /Star|Icon/.test(p.role || '') || (p.industryWeight || 0) >= 80],
  ['business', 'Business', (p) => /Agent|Casting|Manager|Journalist|Studio/.test(p.role || '')],
  ['friends', 'Friends', (p) => /Friend|School|Classmate|Ex/.test(p.role || '')],
];
function PeopleScreen({ g, openId, setOpenId }) {
  const [ptab, setPtab] = useState('family');
  const [filter, setFilter] = useState('all');
  const family = (g.family || []).filter((p) => p.alive);
  const deceased = (g.family || []).filter((p) => !p.alive);
  const people = g.people || [];
  const [showDrifted, setShowDrifted] = useState(false);
  const pass = (CONTACT_FILTERS.find((f) => f[0] === filter) || CONTACT_FILTERS[0])[2];
  const warm = people.filter((p) => !p.cold && !p.agent && pass(p)).sort((a, b) => (b.relationship || 0) - (a.relationship || 0));
  const drifted = people.filter((p) => p.cold && pass(p));
  const agentPerson = people.find((p) => p.agent);
  const al = agentLine(g);
  // A person who is no longer there — a partner who left, or somebody from a previous life
  // (the open id lives in App and survived "start anew") — left the whole tab blank: the
  // sheet returned null and nothing else rendered. Maxi: "I go into People and nothing."
  const stale = openId && !findPerson(g, openId);
  useEffect(() => { if (stale) setOpenId(null); }, [stale]);
  if (openId && !stale) return <PersonSheet g={g} id={openId} onClose={() => setOpenId(null)} />;
  const tabBtn = (id, label) => (<button onClick={() => setPtab(id)} style={{ flex: 1, border: 'none', borderRadius: 10, padding: '8px 4px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
    background: ptab === id ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : 'rgba(158,116,255,.16)', color: ptab === id ? '#fff' : '#d9cffa' }}>{label}</button>);
  return (<div>
    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>{tabBtn('family', `Family · ${family.length + (g.partner ? 1 : 0)}`)}{tabBtn('contacts', `Contacts · ${people.filter((p) => !p.cold).length}`)}</div>
    {ptab === 'family' && <>
      <FamilyTree g={g} onOpen={(id) => setOpenId(id)} yourLook={lookOf(g)} />
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, margin: '14px 0 8px' }}>Everyone</div>
      {g.partner && <PersonRow g={g} p={g.partner} sub={`${g.partner.job} · ${g.partner.age}`} onOpen={() => setOpenId(g.partner.id)} />}
      {family.map((p) => (<PersonRow key={p.id} g={g} p={p} sub={`${p.relation}, ${p.age}`} onOpen={() => setOpenId(p.id)} />))}
      {deceased.length > 0 && <div style={{ fontSize: 11, color: theme.muted, marginTop: 4, marginBottom: 10, opacity: .7 }}>In memory: {deceased.map((p) => `${p.name} (${p.relation})`).join(', ')}</div>}
    </>}
    {ptab === 'contacts' && <>
      {/* Who represents you. A person like the others — tap to talk — with what the desk is doing for you. */}
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Your agent</div>
      {al && agentPerson
        ? <PersonRow g={g} p={agentPerson} sub={`${al.desk} · ${al.cut}%`} onOpen={() => setOpenId(agentPerson.id)} />
        : al
        ? <Card style={{ marginBottom: 8 }}><div style={{ fontSize: 13.5, fontWeight: 800 }}>{al.name}</div><div style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>{al.desk} · {al.cut}% of everything · {al.doing}</div></Card>
        : <Card style={{ marginBottom: 8 }}><div style={{ fontSize: 12.5, lineHeight: 1.55, color: theme.muted }}>
            {agentDropped(g) ? 'Nobody. Nobody represents the liability — get off the Avoided rung and somebody will ask.'
              : (g.fame || 0) >= 40 || (g.respect || 0) >= 50 ? 'Nobody yet — when an agency wants you, the letter lands in Email.'
              : 'Nobody yet. An agent asks at fame 40, or at standing 50 if directors know you before the public does. Their offers will come to Messages under their name.'}
          </div></Card>}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', margin: '12px 0 8px' }}>
        {CONTACT_FILTERS.map(([id, label]) => (<button key={id} onClick={() => setFilter(id)} style={{ border: `1px solid ${filter === id ? theme.accent : theme.line}`, borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer',
          background: filter === id ? 'rgba(158,116,255,.22)' : 'transparent', color: filter === id ? theme.text : theme.muted }}>{label}</button>))}
      </div>
      {/* Closest first, and the ones who drifted folded away at the bottom rather than mixed in —
          a phone with forty names in it is only usable if the ones that matter are on top. */}
      {warm.length === 0 && <div style={{ fontSize: 12, color: theme.muted, textAlign: 'center', padding: 14 }}>{people.length ? 'Nobody under that filter.' : 'Nobody yet. Sets, parties and premieres are where people come from.'}</div>}
      {warm.map((p) => { const opensDoor = p.unlocks === 'aaa' && p.industryWeight >= 80;
        return (<PersonRow key={p.id} g={g} p={p} onOpen={() => setOpenId(p.id)}
          sub={`${p.role}${p.fromSet ? ` · from ${p.fromSet}` : ''}${opensDoor && p.relationship >= 60 ? ' · opens A-list ★' : opensDoor ? ' · could open doors' : ''}`} />); })}
      {drifted.length > 0 && (<div style={{ marginTop: 10 }}>
        <button onClick={() => setShowDrifted(!showDrifted)} style={{ background: 'none', border: 'none', color: theme.muted, fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', cursor: 'pointer', padding: '4px 0' }}>
          {showDrifted ? '▾' : '▸'} Drifted away · {drifted.length}
        </button>
        {showDrifted && drifted.map((p) => <PersonRow key={p.id} g={g} p={p} onOpen={() => setOpenId(p.id)} sub={`${p.role} · you stopped calling`} />)}
      </div>)}
      {!inCareer(g) && <div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', padding: '14px 10px', opacity: .8 }}>Industry contacts start once your career begins. Keep school friends close on Spotlight — some of them go far.</div>}
    </>}
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
    <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>The dream finds you around age ten — screen or stage. The family you land in is rolled at birth, and it decides how hard the start is.</div>
  </div>);
}
function EventsScreen({ g }) {
  const [sneak, setSneak] = useState(null);
  const [asking, setAsking] = useState(null);
  const events = g.events || [];
  const noEnergy = !canAfford(g, COST.rehearse);
  const helpers = inviteHelpers(g);
  const btn = (kind) => ({ flex: 1, border: 'none', borderRadius: 10, padding: '9px', fontSize: 12.5, fontWeight: 800, cursor: noEnergy ? 'default' : 'pointer', background: noEnergy ? 'rgba(120,110,150,.15)' : kind === 'pri' ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : 'rgba(158,116,255,.16)', color: noEnergy ? '#6b6390' : kind === 'pri' ? '#fff' : '#d9cffa' });
  const host = canHost(g);
  const HostCard = () => ((g.fame || 0) >= 50 ? (<Card style={{ marginBottom: 10, borderColor: host.ok ? `${theme.gold}66` : theme.line }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <div style={{ fontSize: 14, fontWeight: 800 }}>Your own night</div>
      {host.ok && <div style={{ fontSize: 11, color: theme.gold, fontWeight: 800 }}>€{host.cost.toLocaleString()} · {energyFor('yours')} energy</div>}
    </div>
    <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 8px', lineHeight: 1.5 }}>{host.ok ? 'The people in your phone who decide things, the actors you know, maybe a name who comes because it is your house — and on your own sofa you can say what you want to make. Nobody has to come, and nobody has to say yes.' : host.why}</div>
    {host.ok && (() => { const inv = invitees(g); const f = hostFatigue(g);
      return (<div style={{ fontSize: 11, color: theme.muted, marginBottom: 8, lineHeight: 1.5 }}>
        {inv.length ? (<><span style={{ fontWeight: 800, color: theme.text }}>Who might come:</span> {inv.map(({ p, odds }, i) => (<span key={p.id}>{i ? ' · ' : ''}{p.name} <span style={{ color: inviteBand(odds) === 'likely' ? theme.good : inviteBand(odds) === 'maybe' ? theme.gold : theme.bad }}>{inviteBand(odds)}</span></span>))}</>) : 'Nobody in your phone decides anything yet. It would be a room of strangers and a crowd.'}
        {f < 1 && <div style={{ color: theme.bad, marginTop: 3 }}>You threw one not long ago. Fewer will come, and the trades count.</div>}
      </div>); })()}
    {host.ok && <button onClick={() => dispatch(hostNight)} disabled={(g.cash || 0) < host.cost || !canAfford(g, energyFor('yours'))} style={{ ...btn('pri'), width: '100%' }}>Throw it</button>}
  </Card>) : null);
  if (!events.length) return (<div><HostCard /><div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: 24, lineHeight: 1.6 }}>🎉 Nothing on the calendar right now.<br /><br />Parties and premieres come and go — live a month and check back.</div></div>);
  return (<div>
    <div style={{ fontSize: 11.5, color: theme.muted, padding: '2px 2px 10px', lineHeight: 1.5 }}>Rooms where careers actually move. Read who is expected before you go — a night costs energy, a face, and a call sheet if you are shooting; some rooms are worth it and some are not.</div>
    <HostCard />
    {events.map((ev) => {
      const t = tierById(ev.tier); const onList = isInvited(g, ev) || ev.invited;
      return (<Card key={ev.id} style={{ marginBottom: 10, borderColor: onList ? 'rgba(95,206,138,.35)' : theme.line }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          {/* An event may know what it is. A studio holding a party for a picture that passed a
              billion is not "Awards gala", which is the tier it happens to be built from. */}
          <div style={{ fontSize: 14, fontWeight: 800 }}>{ev.label || t.label}</div>
          <div style={{ fontSize: 11, color: isTonight(g, ev) ? theme.gold : theme.muted, fontWeight: isTonight(g, ev) ? 800 : 400 }}>{isTonight(g, ev) ? 'This month' : monthName(atOf(g, ev))}</div>
        </div>
        <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 6px' }}>{ev.venue} · hosted by {ev.host}{ev.why ? ` · ${ev.why}` : ''}</div>
        {/* Who is expected. The names, and a role only where you would know it — the room
            has a crowd in it and the figures do not wear name tags. */}
        <div style={{ fontSize: 11, color: theme.muted, marginBottom: 8, lineHeight: 1.5 }}><span style={{ fontWeight: 800, color: theme.text }}>Expected:</span> {expectedAt(g, ev, t).map((x, i) => (<span key={i}>{i ? ' · ' : ''}{x.heavy ? <b style={{ color: theme.gold }}>★ {x.name} — {x.why}</b> : x.name + (x.role ? ` (${x.role})` : '')}</span>))} — and a room full of people who are nobody in particular. <span style={{ color: theme.gold }}>{energyFor(ev.tier)} energy.</span></div>
        {ev.note && <div style={{ fontSize: 12, color: onList ? theme.good : theme.gold, background: 'rgba(255,255,255,.05)', border: `1px solid ${theme.line}`, borderRadius: 9, padding: '7px 10px', marginBottom: 8, lineHeight: 1.45 }}>{ev.note}</div>}
        {onList ? (<>
          <div style={{ fontSize: 11, color: theme.good, marginBottom: 8 }}>✓ You're on the list</div>
          <button onClick={() => dispatch(attendEvent, ev.id)} disabled={!canAfford(g, energyFor(ev.tier)) || !isTonight(g, ev)} style={{ ...btn('pri'), width: '100%', opacity: canAfford(g, energyFor(ev.tier)) && isTonight(g, ev) ? 1 : .45 }}>{isTonight(g, ev) ? `Go · ${energyFor(ev.tier)} energy${g.production ? ' · you are shooting' : ''}` : `Not until ${monthName(atOf(g, ev))} — you are on the list`}</button>
        </>) : ev.door && ev.door.stage === 1 ? (<div>
          {/* The second door: what somebody who belongs would know. The answers are on the wall in Legacy. */}
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase', color: theme.gold, marginBottom: 6 }}>The door · question {ev.door.asked + 1} of {ev.door.quiz.length}</div>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>{ev.door.quiz[ev.door.asked].q}</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {ev.door.quiz[ev.door.asked].options.map((o) => (<button key={o} onClick={() => dispatch(answerDoor, ev.id, o)} style={{ ...btn(''), textAlign: 'left' }}>{o}</button>))}
          </div>
          <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 6 }}>One wrong answer and you are outside. The year's lists are under Legacy; the host is on this card.</div>
        </div>) : ev.door && ev.door.stage === 2 ? (<div>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase', color: theme.gold, marginBottom: 6 }}>The back stairs</div>
          <StairsGame length={5} onResult={(ok) => dispatch(stairsResult, ev.id, ok)} />
        </div>) : sneak && sneak.id === ev.id ? (<div>
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
            <button onClick={() => setAsking(ev.id)} disabled={noEnergy || (ev.asked || []).length >= 2} style={{ ...btn(''), opacity: (ev.asked || []).length >= 2 ? .45 : 1 }}>{(ev.asked || []).length >= 2 ? 'Asked around enough' : `Ask a contact${(ev.asked || []).length ? ` · ${2 - ev.asked.length} left` : ''}`}</button>
            <button onClick={() => setSneak({ id: ev.id, game: Math.random() < 0.5 ? 'timing' : 'grid',
              cfg: { zoneStart: 12 + Math.random() * 62, zoneWidth: 9 + Math.random() * 5, speed: 2.8 + Math.random() * 1.8, bad: 4 + (Math.random() < 0.5 ? 1 : 0) } })}
              disabled={noEnergy || ev.doorTried} style={{ ...btn(''), opacity: ev.doorTried ? .45 : 1 }}>{ev.doorTried ? 'The door remembers you' : 'Talk your way in · one try'}</button>
          </div>
        </>)}
      </Card>);
    })}
  </div>);
}
function AaaTracker({ g }) {
  const acc = computeAccess(g);
  // Nobody at zero needs to be told the tentpoles are closed. It shows once the ladder is in sight.
  if (!acc.aaa && (g.fame || 0) < 25) return null;
  return (<Card style={{ marginBottom: 14, borderColor: acc.aaa ? 'rgba(95,206,138,.4)' : theme.line }}><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: acc.aaa ? theme.good : theme.muted, marginBottom: 6 }}>{acc.aaa ? '★ The tentpoles are open to you' : 'The tentpoles — closed to you'}</div><div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.5 }}>{acc.aaa ? (acc.aaaReason === 'hit' ? 'You made a hit. Studios take your calls now.' : 'You know the right person. Doors open through them.') : 'The biggest pictures do not audition strangers. Two ways in: land a hit (rating 85+), or get genuinely close to somebody powerful in the industry (weight 80+).'}</div></Card>);
}
function LegacyPanel({ g, wall = true }) {
  const young = g.stage === 'child' || g.stage === 'teen';
  // The wall is a screen's worth on its own; Home only carries the card.
  return (<>
    {wall && <WalkOfFame g={g} />}
    <LegacyCard g={g} young={young} />
  </>);
}
function LegacyCard({ g, young }) {
  const L = computeLegacy(g); const hall = getHall();
  // A child has no legacy yet — but the lives before this one are still on the wall. The
  // whole panel used to vanish until eighteen, Hall of Fame included.
  if (young && !hall.length) return null;
  const amb = ambitionProgress(g);
  return (<div style={{ marginTop: 18 }}><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Legacy</div>{!young && amb && <Card style={{ marginBottom: 8, borderColor: amb.met ? 'rgba(255,209,102,.45)' : theme.line }}>
      {/* What you wanted at ten (meta/ambition.js). A different question from how much you got. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.accent }}>What you wanted, at ten</div><div style={{ fontSize: 11, color: amb.met ? theme.gold : theme.muted, fontWeight: 800 }}>{amb.met ? 'you got it' : `${Math.round(amb.progress * 100)}% of the way`}</div></div>
      <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3 }}>{amb.label}</div>
      <div style={{ height: 5, background: 'rgba(255,255,255,.08)', borderRadius: 3, margin: '6px 0 5px' }}><div style={{ width: `${Math.round(amb.progress * 100)}%`, height: '100%', background: amb.met ? theme.gold : theme.accent, borderRadius: 3 }} /></div>
      <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.45 }}>{amb.line}</div>
    </Card>}{!young && <Card><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><div style={{ fontSize: 15, fontWeight: 900, color: theme.gold }}>{L.tier}</div><div style={{ fontSize: 13, fontWeight: 800, color: theme.muted }}>{L.points} pts</div></div><div style={{ fontSize: 11.5, color: theme.muted, marginTop: 4 }}>Peak fame {Math.round(L.peakFame)} · {L.credits} credit{L.credits !== 1 ? 's' : ''} · {L.hits} hit{L.hits !== 1 ? 's' : ''}{L.worldHits > 0 ? ` · 🌍 ${L.worldHits} world hit${L.worldHits !== 1 ? 's' : ''}` : ''}{L.askerWins > 0 ? ` · 🏆 ${L.askerWins} Asker${L.askerWins !== 1 ? 's' : ''}` : L.askerNoms > 0 ? ` · ${L.askerNoms} Asker nom${L.askerNoms !== 1 ? 's' : ''}` : ''}</div></Card>}{hall.length > 0 && <div style={{ marginTop: 10 }}><div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.muted, marginBottom: 6 }}>Hall of Fame</div>{hall.slice(0, 5).map((h, i) => (<div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: theme.muted, padding: '5px 0', borderBottom: `1px solid ${theme.line}` }}><span>{i + 1}. {h.name} · {h.tier}</span><span style={{ color: theme.gold }}>{h.points}</span></div>))}</div>}</div>);
}
function StageBody({ g }) {
  if (g.stage === 'child') return <div style={{ fontSize: 14, lineHeight: 1.55 }}>You are a kid living with your parents. School, cartoons, and the first hints of a dream. Live through the years — the real choices come when you grow up.</div>;
  if (g.stage === 'teen') return <div style={{ fontSize: 14, lineHeight: 1.55 }}>A teenager now. You daydream about being {g.dream === 'singer' ? 'on stage' : 'on screen'}. You've got your first phone, shifts open up at fifteen, and a few years left under your parents' roof.</div>;
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
    </div>}<Button kind="pri" disabled={(g.cash || 0) < HOUSING.room.cost} onClick={() => dispatch(rentApartment)}>Move into a rented room · €{HOUSING.room.cost}/mo</Button></div>;
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
