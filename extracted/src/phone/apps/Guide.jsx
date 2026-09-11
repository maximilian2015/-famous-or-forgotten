import { useState } from 'react';
import { theme } from '../../ui/theme.js';
import { FONT_DISPLAY } from '../../ui/chrome.js';
import { FAME_TIERS, TIER_OPENS, FORGOTTEN, FORGOTTEN_OPENS, RESPECT_TIERS, RESPECT_OPENS, RESPECT_MOVES,
  ALIST_WALL, ICON_WALL } from '../../systems/meta/status.js';
import { STAFF, STAFF_ORDER, THINGS, THING_ORDER, HOME_PRICE } from '../../systems/life/money.js';
import { TAKES } from '../../systems/career/story.js';
import { HOUSING } from '../../engine/economy.js';

// The bible. Every rule the game runs on, in one place, off the screens where it was
// taking up room. Maxi: "the explanations are everywhere and they take a lot of space —
// put them in a guide, a Phone app, and everything goes there." So the Fame and Respect
// screens keep their ladders and lose their bullet points, and the bullet points live here,
// with the rest of what somebody would want to look up.
//
// Nothing here is invented copy. Every number is read from the table that runs it.

const SECTIONS = [
  ['fame', 'Fame', '★'], ['respect', 'Respect', '◆'], ['doors', 'The two doors', '🚪'],
  ['set', 'On set', '🎬'], ['money', 'Money', '€'], ['press', 'The press', '🗞'],
];

const money = (n) => (n >= 1e6 ? '€' + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'm' : '€' + Math.round(n / 1000) + 'k');

export function Guide({ g }) {
  const [sec, setSec] = useState('fame');
  return (<div>
    <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.55, marginBottom: 10 }}>
      How the game actually works. Every number here is the number the game uses.
    </div>
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
      {SECTIONS.map(([id, label, glyph]) => (
        <button key={id} onClick={() => setSec(id)} style={{ padding: '7px 10px', borderRadius: 10, fontSize: 11.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
          border: `1px solid ${sec === id ? 'transparent' : theme.line}`,
          background: sec === id ? `linear-gradient(165deg, ${theme.accent}, ${theme.accent2 || theme.accent})` : theme.panel,
          color: sec === id ? (theme.warm ? '#1a1206' : '#fff') : theme.muted }}>{glyph} {label}</button>))}
    </div>
    {sec === 'fame' && <FameGuide g={g} />}
    {sec === 'respect' && <RespectGuide g={g} />}
    {sec === 'doors' && <DoorsGuide />}
    {sec === 'set' && <SetGuide />}
    {sec === 'money' && <MoneyGuide />}
    {sec === 'press' && <PressGuide />}
  </div>);
}

function H({ children }) { return <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, margin: '4px 0 8px' }}>{children}</div>; }
function P({ children }) { return <div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.6, marginBottom: 10 }}>{children}</div>; }
function Rung({ label, min, lines, here, sunk }) {
  return (<div style={{ background: here ? `${theme.accent}18` : theme.panel, border: `1px solid ${here ? theme.accent : theme.line}`, borderRadius: 11, padding: '9px 12px', marginBottom: 6 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: here ? theme.accent : sunk ? '#ff8d9e' : theme.text }}>{label}{here ? ' · you' : ''}</div>
      <div style={{ fontSize: 11, color: theme.muted, fontWeight: 800 }}>{typeof min === 'number' ? (min < 0 ? `below ${min === -1 ? 0 : min + 1}` : min) : min}</div>
    </div>
    {(lines || []).map((l, i) => <div key={i} style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5, marginTop: 3, display: 'flex', gap: 6 }}><span style={{ opacity: .5 }}>·</span><span>{l}</span></div>)}
  </div>);
}

function FameGuide({ g }) {
  const f = g.fame || 0;
  let cur = FAME_TIERS[0]; for (const t of FAME_TIERS) if (f >= t.min) cur = t;
  const forgotten = (g.peakFame || 0) >= 35 && f < 15;
  return (<div>
    <H>How known you are</H>
    <P>Fame is how many people know the name. It rises when things of yours come out, and it falls when nothing does — about one point in fifty-five a month once you have been quiet for four. Being talked about slows the fall. Once you have been an Icon it never drops below 75 again.</P>
    {[...FAME_TIERS].reverse().map((t) => <Rung key={t.id} label={t.label} min={t.min} lines={TIER_OPENS[t.id]} here={!forgotten && cur.id === t.id} />)}
    <Rung label={FORGOTTEN.label} min="fell from 35+" lines={FORGOTTEN_OPENS} here={forgotten} sunk />
  </div>);
}

function RespectGuide({ g }) {
  const r = g.respect || 0;
  let cur = RESPECT_TIERS[0]; for (const t of RESPECT_TIERS) if (r >= t.min) cur = t;
  return (<div>
    <H>What the business thinks of you</H>
    <P>Standing is what the people who hire you think of the name, and it moves for completely different reasons from fame. It is the biggest single term in whether a director shoots your version of the film. Below forty it costs you money at the table. It goes below zero, and below zero people start acting like it.</P>
    {[...RESPECT_TIERS].reverse().map((t) => <Rung key={t.id} label={t.label} min={t.min} lines={RESPECT_OPENS[t.id]} here={cur.id === t.id} sunk={t.min < 0} />)}
    <H>What moves it</H>
    <div style={{ background: theme.panel, borderRadius: 11, padding: '4px 12px', marginBottom: 6 }}>
      {RESPECT_MOVES.up.map((m, i) => <Move key={i} m={m} col="#4fc07f" />)}
    </div>
    <div style={{ background: theme.panel, borderRadius: 11, padding: '4px 12px' }}>
      {RESPECT_MOVES.down.map((m, i) => <Move key={i} m={m} col="#ff5a72" />)}
    </div>
    <P>None of it can be bought. It is the only number in the game money does not touch.</P>
  </div>);
}
function Move({ m, col }) {
  return (<div style={{ display: 'flex', gap: 9, padding: '7px 0', borderBottom: `1px solid ${theme.line}` }}>
    <span style={{ color: col, fontWeight: 900, fontSize: 12.5, width: 28, flexShrink: 0, textAlign: 'right' }}>{m.by}</span>
    <span style={{ fontSize: 11.8, lineHeight: 1.45 }}>{m.what}<span style={{ color: theme.muted }}> — {m.note}</span></span>
  </div>);
}

function DoorsGuide() {
  return (<div>
    <H>The two doors</H>
    <P>Getting known is ordinary work — anybody who turns up for twenty years becomes a face people recognise. Above Star it stops being about how much you did and starts being about what you did. Two doors, and points alone will not open either.</P>
    <Rung label={`A-lister · ${ALIST_WALL + 1}`} min="the first door" lines={[
      'A hit you carried — a lead or tentpole credit rated 85 or over. A supporting part in a wonderful film does not count; carrying one does',
      'Or a nomination. The season noticing you is its own way in',
      `Without one, fame stops at ${ALIST_WALL} however much you work`]} />
    <Rung label={`Icon · ${ICON_WALL + 1}`} min="the last door" lines={[
      'A world hit — the whole world saw one of yours',
      'Or an Asker. They read your name out',
      `Without one, fame stops at ${ICON_WALL}. Nobody becomes an icon by working a lot; they become one by being in something enormous`]} />
  </div>);
}

function SetGuide() {
  return (<div>
    <H>Day one: the room</H>
    <P>Every shoot opens with an argument about what the film is. Four versions, and whether they listen is your standing, your fame and how the director feels about you.</P>
    {Object.values(TAKES).map((t) => <Rung key={t.id} label={t.label} min={t.push ? `${t.push} to push` : 'no argument'} lines={[t.blurb]} />)}
    <H>Every month after</H>
    <P>Rehearse, run a take, or spend an evening with the crew — each is one Energy and each counts as turning up prepared. A month you do none of them, the director notices, if the set is not going well: nothing the first time, then it cools them. A month you drink through, the whole set notices. A party during a shoot is a call you are late for.</P>
    <P>At wrap, a director who warmed to you tells people — +3 standing. One who went cold tells a different story — −3. The film is judged on the actor you were when you walked on; what the months taught you lands after.</P>
  </div>);
}

function MoneyGuide() {
  return (<div>
    <H>What money is for</H>
    <P>Rent is taken every month automatically. A home you own has no rent, and it goes to whoever you leave things to.</P>
    {Object.entries(HOME_PRICE).map(([k, price]) => <Rung key={k} label={HOUSING[k].label} min={money(price)} lines={[`€${HOUSING[k].cost.toLocaleString()} a month to rent`, HOUSING[k].perk]} />)}
    <H>People you pay</H>
    {STAFF_ORDER.map((id) => <Rung key={id} label={STAFF[id].label} min={`${money(STAFF[id].cost)}/mo`} lines={[STAFF[id].perk, `From fame ${STAFF[id].minFame}`]} />)}
    <H>Things</H>
    {THING_ORDER.map((id) => <Rung key={id} label={THINGS[id].label} min={money(THINGS[id].price)} lines={[THINGS[id].blurb, THINGS[id].perk || `Resells at about ${Math.round(THINGS[id].resale * 100)}% — ${id === 'art' ? 'and gains value every year' : 'and less every year'}`]} />)}
  </div>);
}

function PressGuide() {
  return (<div>
    <H>Scandal</H>
    <P>Every point of scandal makes every audition 0.3 points harder, cuts what your agent brings you, and speeds up being forgotten. Past 25 they hold firmer on the money; past 40 an adoption board reads the same papers. It fades 0.4 a month on its own — a publicist makes that nearly three times faster.</P>
    <H>Being talked about</H>
    <P>Attention comes from the nights out — the sofa, the carpet, answering a piece in the trades — and it slows how fast you are forgotten, by up to half. It fades on its own, or one good night would keep you relevant for a decade.</P>
    <H>A comeback</H>
    <P>Fall to under fifteen after having been a Known Face and you are Forgotten: fewer scripts than a newcomer. Land one film that reviews well and the trades call it a comeback — straight back to Known Face. Mediocre work after a fall does not get the word.</P>
  </div>);
}
