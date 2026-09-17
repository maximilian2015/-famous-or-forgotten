import { useEffect, useMemo, useState, useRef } from 'react';
import { theme } from '../theme.js';
import { FONT } from '../chrome.js';
import { dispatch } from '../../state/store.js';
import { startLoop, stopLoop } from '../sfx.js';
import { Avatar } from './Avatar.jsx';
import { lookOf, lookOfPerson } from '../../systems/life/appearance.js';
import { actorById } from '../../systems/world/world.js';
import { HOURS, ZONES, buzzBand, drinkDose, goOver, moveOn, startTalk, moveTo, answerToast, reply, drinkTogether, nightDrink, nightAct, nightChoice, leaveNight, LOOKS_AN_HOUR, heavyTest, sendPitch, skipPitch, pitchOdds, PITCH_SCALES } from '../../systems/social/night.js';
import { TimingBar } from './TimingBar.jsx';
import { GridRisk } from './GridRisk.jsx';
import { GENRES, hotGenre } from '../../systems/meta/news.js';

// The room. A floor plan — the bar along the top, the booths on the right, the floor in
// the middle, the terrace at the bottom, the door — with the people in it as figures that
// drift between the zones, and you as the lit one. Tap somebody and you go over; tap a
// zone and you spend the hour there. Underneath: the glass in your hand as a bar, what
// has happened, and the talk when you are in one.
const TONE = { good: '#6fc98d', bad: '#e5566f', note: null };
const KIND_ICON = { actor: '🎭', industry: '💼', contact: '🤝', press: '📰', prospect: '💫' };
const W = 360, H = 240;
const ZONE_BOX = {
  bar: { x: 8, y: 8, w: 214, h: 62 },
  booth: { x: 232, y: 8, w: 120, h: 128 },
  floor: { x: 8, y: 80, w: 214, h: 92 },
  terrace: { x: 8, y: 182, w: 344, h: 52 },
  door: { x: 232, y: 142, w: 120, h: 34 },
};
// A seat in a zone for the i-th figure there, so figures do not sit on each other.
function seat(zone, i) {
  const b = ZONE_BOX[zone] || ZONE_BOX.floor;
  const cols = Math.max(1, Math.floor((b.w - 16) / 40));
  const col = i % cols, row = Math.floor(i / cols);
  // At the bar people stand at the counter, not on the bottles.
  if (zone === 'bar') return { x: b.x + 24 + col * 40, y: b.y + b.h - 14 };
  return { x: b.x + 24 + col * 40, y: Math.min(b.y + b.h - 18, b.y + 38 + row * 40) };
}

// A person in the room is drawn the way you are — the same figure, dressed for the night.
// Maxi: "the people must be real, like our hero, not dots." The face is derived from
// who they are, so the same actor looks the same at every party.
const DRESS = { yours: [['leather', 'suit', 'coat'], ['dress', 'skirt', 'coat']], local: [['tee', 'hoodie', 'leather'], ['tee', 'skirt', 'leather']], mixer: [['leather', 'coat', 'suit'], ['dress', 'coat', 'skirt']], premiere: [['suit', 'tux'], ['dress', 'gown']], gala: [['tux'], ['gown']] };
function lookForGuest(g, x, tier) {
  let h = 0; for (const ch of String(x.worldId || x.id || x.name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const actor = x.worldId ? actorById(g, x.worldId) : null;
  const gender = actor ? actor.gender : x.person && x.person.gender ? (x.person.gender === 'f' || x.person.gender === 'female' ? 'female' : 'male') : (h % 2 ? 'female' : 'male');
  const look = lookOfPerson({ id: x.worldId || x.id, name: x.name, gender, age: x.person && x.person.age ? x.person.age : 24 + (h % 30) });
  const fits = (DRESS[tier] || DRESS.mixer)[gender === 'female' ? 1 : 0];
  look.outfit = fits[(h >> 3) % fits.length];
  return look;
}
// The room itself: a bar with bottles and stools, booths with tables, a lit floor, a
// terrace with string lights and plants, a rope at the door. Maxi: "colours, lights,
// tables, a bar counter — some scenery." Drawn once, under the people; the floor lights
// breathe and the string lights flicker, which is CSS and costs nothing.
const PALETTE = {
  local: { wall: '#1d1626', floor: '#241b2c', accent: '#ff9f6e', light: ['#ff9f6e', '#ffd166', '#c9b6ff'], carpet: null },
  mixer: { wall: '#120f1f', floor: '#171332', accent: '#ff4fa3', light: ['#ff4fa3', '#4fd6ff', '#b14fff'], carpet: null },
  premiere: { wall: '#1a0f14', floor: '#1e1418', accent: '#ffd166', light: ['#ffd166', '#ff8a5c', '#fff1a8'], carpet: '#8b1e2d' },
  gala: { wall: '#151222', floor: '#1b1730', accent: '#f2c265', light: ['#f2c265', '#fff1a8', '#c9b6ff'], carpet: '#2a1d4a' },
  yours: { wall: '#1f1726', floor: '#26202e', accent: '#ffb07a', light: ['#ffb07a', '#ffd166', '#ff8d9e'], carpet: null },
};
function Scenery({ tier }) {
  const P = PALETTE[tier] || PALETTE.mixer;
  const B = ZONE_BOX;
  return (<svg viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
    <style>{`@keyframes fofPulse{0%,100%{opacity:.1}50%{opacity:.3}} @keyframes fofFlicker{0%,100%{opacity:.9}45%{opacity:.5}55%{opacity:1}} @keyframes fofSweep{0%{transform:translateX(-30px)}100%{transform:translateX(30px)}}`}</style>
    <defs>
      <radialGradient id="fofSpot" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fff" stopOpacity=".9" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      <linearGradient id="fofWood" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#7a4a2a" /><stop offset="1" stopColor="#4a2b18" /></linearGradient>
      <linearGradient id="fofVelvet" x1="0" x2="1"><stop offset="0" stopColor="#3b1f5e" /><stop offset="1" stopColor="#2a1544" /></linearGradient>
    </defs>
    <rect width={W} height={H} fill={P.wall} />
    {/* the floor */}
    <rect x={B.floor.x} y={B.floor.y} width={B.floor.w} height={B.floor.h} rx="9" fill={P.floor} />
    {Array.from({ length: 6 }, (_, i) => Array.from({ length: 3 }, (_, j) => (
      <rect key={i + '-' + j} x={B.floor.x + 10 + i * 33} y={B.floor.y + 22 + j * 22} width="31" height="20" fill={(i + j) % 2 ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.12)'} />)))}
    {P.light.map((c, i) => (<circle key={i} cx={B.floor.x + 50 + i * 60} cy={B.floor.y + 52} r="27" fill={c} style={{ mixBlendMode: 'screen', animation: `fofPulse ${2.2 + i * 0.7}s ease-in-out infinite` }} />))}
    {/* the bar: a counter, bottles on the wall, stools */}
    <rect x={B.bar.x} y={B.bar.y} width={B.bar.w} height={B.bar.h} rx="9" fill="#1a1420" />
    <rect x={B.bar.x + 6} y={B.bar.y + 16} width={B.bar.w - 12} height="9" rx="2" fill="rgba(0,0,0,.35)" />
    {Array.from({ length: 14 }, (_, i) => (<rect key={i} x={B.bar.x + 12 + i * 14} y={B.bar.y + 6} width="4" height="12" rx="1" fill={['#5fce8a', '#ffd166', '#ff8a5c', '#c9b6ff', '#4fd6ff'][i % 5]} opacity=".85" />))}
    <rect x={B.bar.x + 4} y={B.bar.y + B.bar.h - 16} width={B.bar.w - 8} height="12" rx="4" fill="url(#fofWood)" />
    <rect x={B.bar.x + 4} y={B.bar.y + B.bar.h - 17} width={B.bar.w - 8} height="3" rx="1" fill="#c48a5a" opacity=".8" />
    {Array.from({ length: 5 }, (_, i) => (<g key={i}><circle cx={B.bar.x + 30 + i * 40} cy={B.bar.y + B.bar.h - 2} r="5" fill="#2b2238" stroke="#5a4a70" /><rect x={B.bar.x + 29 + i * 40} y={B.bar.y + B.bar.h - 1} width="2" height="4" fill="#5a4a70" /></g>))}
    {/* the booths: sofas and low tables, candles */}
    <rect x={B.booth.x} y={B.booth.y} width={B.booth.w} height={B.booth.h} rx="9" fill="#17131f" />
    {[0, 1, 2].map((i) => (<g key={i}>
      <rect x={B.booth.x + 8} y={B.booth.y + 20 + i * 38} width={B.booth.w - 16} height="14" rx="6" fill="url(#fofVelvet)" stroke="#5a3d8a" strokeWidth=".8" />
      <ellipse cx={B.booth.x + B.booth.w / 2} cy={B.booth.y + 43 + i * 38} rx="17" ry="6" fill="#2a2236" stroke="#4a3d5c" />
      <circle cx={B.booth.x + B.booth.w / 2} cy={B.booth.y + 42 + i * 38} r="2" fill="#ffd166" style={{ animation: `fofFlicker ${1.4 + i * 0.5}s ease-in-out infinite` }} />
    </g>))}
    {/* the terrace: railing, plants, string lights, the sky */}
    <rect x={B.terrace.x} y={B.terrace.y} width={B.terrace.w} height={B.terrace.h} rx="9" fill="#0d1220" />
    <circle cx={B.terrace.x + B.terrace.w - 26} cy={B.terrace.y + 14} r="6" fill="#fff5cc" opacity=".8" />
    {Array.from({ length: 16 }, (_, i) => (<circle key={i} cx={B.terrace.x + 12 + i * 21} cy={B.terrace.y + 8 + (i % 2) * 3} r="1.8" fill="#ffe08a" style={{ animation: `fofFlicker ${1.1 + (i % 4) * 0.4}s ease-in-out infinite` }} />))}
    <line x1={B.terrace.x + 6} y1={B.terrace.y + B.terrace.h - 6} x2={B.terrace.x + B.terrace.w - 6} y2={B.terrace.y + B.terrace.h - 6} stroke="#5a6a80" strokeWidth="1.5" />
    {Array.from({ length: 9 }, (_, i) => (<line key={i} x1={B.terrace.x + 10 + i * 40} y1={B.terrace.y + B.terrace.h - 14} x2={B.terrace.x + 10 + i * 40} y2={B.terrace.y + B.terrace.h - 4} stroke="#5a6a80" />))}
    {[0, 1].map((i) => (<g key={i}><circle cx={B.terrace.x + 14 + i * (B.terrace.w - 28)} cy={B.terrace.y + 24} r="8" fill="#2f6b45" /><circle cx={B.terrace.x + 10 + i * (B.terrace.w - 28)} cy={B.terrace.y + 30} r="6" fill="#3a8455" /></g>))}
    {/* the door: a rope, and the carpet where there is one */}
    <rect x={B.door.x} y={B.door.y} width={B.door.w} height={B.door.h} rx="9" fill="#14101c" />
    {P.carpet && <rect x={B.door.x + 8} y={B.door.y + 8} width={B.door.w - 16} height={B.door.h - 12} rx="3" fill={P.carpet} />}
    <line x1={B.door.x + 12} y1={B.door.y + 8} x2={B.door.x + 12} y2={B.door.y + B.door.h - 4} stroke="#c9a24a" strokeWidth="2" />
    <line x1={B.door.x + 60} y1={B.door.y + 8} x2={B.door.x + 60} y2={B.door.y + B.door.h - 4} stroke="#c9a24a" strokeWidth="2" />
    <path d={`M${B.door.x + 12} ${B.door.y + 10} Q${B.door.x + 36} ${B.door.y + 22} ${B.door.x + 60} ${B.door.y + 10}`} stroke="#b0223a" strokeWidth="2.2" fill="none" />
    <rect x={B.door.x + B.door.w - 30} y={B.door.y + 4} width="22" height={B.door.h - 8} rx="2" fill="#0a0810" stroke="#c9a24a" strokeWidth=".8" />
    {/* a wash of the room's colour over everything */}
    <rect width={W} height={H} fill={P.accent} opacity=".05" />
  </svg>);
}
function Figure({ x, y, label, look, size, you, came, done, lit, extra, talking, onClick }) {
  return (<div onClick={onClick} style={{ position: 'absolute', left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, transform: 'translate(-50%, -55%)', transition: you ? 'left .9s cubic-bezier(.4,0,.2,1), top .9s cubic-bezier(.4,0,.2,1), opacity .4s' : 'left 1.9s linear, top 1.9s linear, opacity .4s',
    opacity: done ? .3 : extra ? .8 : 1, cursor: onClick ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', filter: lit ? `drop-shadow(0 0 6px ${theme.gold})` : you ? `drop-shadow(0 0 7px ${theme.accent})` : came ? `drop-shadow(0 0 5px ${theme.good})` : 'none', zIndex: you ? 3 : extra ? 1 : 2 }}>
    {talking && <div style={{ position: 'absolute', top: -9, right: -12, fontSize: 9, background: 'rgba(255,255,255,.85)', color: '#241a2e', borderRadius: 8, padding: '0 4px', lineHeight: '12px', fontWeight: 900 }}>…</div>}
    <Avatar look={look} size={size} />
    {label && <div style={{ fontSize: 8.5, fontWeight: 800, color: you ? theme.accent : came ? theme.good : '#e6dfff', marginTop: -2, whiteSpace: 'nowrap', textShadow: '0 1px 2px #000' }}>{label}</div>}
  </div>);
}

export function NightRoom({ g }) {
  const n = g.night || { guests: [], log: [], gains: {}, hour: 0, buzz: 0, you: 'door', tier: 'local' };
  useEffect(() => { startLoop(n.tier === 'local' || n.tier === 'yours' ? 'house' : n.tier === 'mixer' ? 'club' : 'lounge'); return () => stopLoop(); }, []);
  // The pitch form, when somebody on your sofa asks what you want to make.
  const [pitch, setPitch] = useState(null);
  const hour = Math.min(n.hour, HOURS.length - 1);
  const band = buzzBand(n.buzz);
  const talk = n.talk; const who = talk && n.guests.find((x) => x.id === talk.guestId);
  const busy = n.done || !!n.pending || !!talk;
  // People do not stand still. Every couple of seconds everybody who is not talking to
  // you shifts a step inside their zone — Maxi: "why don't they move by themselves?"
  // Every couple of seconds everybody picks a new spot a step away and drifts to it, so
  // the room is never still; and pairs who stand near each other say something to each
  // other — a bubble, nothing you can hear. Maxi: "let them walk by themselves, like in a
  // game, and talk among themselves."
  const [wander, setWander] = useState({});
  const [chat, setChat] = useState([]);
  useEffect(() => {
    const id = setInterval(() => {
      setWander((w) => { const next = {}; for (const x of n.guests) { if (x.done) continue; const prev = w[x.id] || { dx: 0, dy: 0 }; next[x.id] = { dx: Math.max(-18, Math.min(18, prev.dx + (Math.random() * 18 - 9))), dy: Math.max(-7, Math.min(7, prev.dy + (Math.random() * 8 - 4))) }; } return next; });
      const alive = n.guests.filter((x) => !x.done);
      const pairs = []; const byZone = {};
      for (const x of alive) (byZone[x.zone] = byZone[x.zone] || []).push(x.id);
      for (const z of Object.keys(byZone)) if (byZone[z].length >= 2 && Math.random() < 0.5) { const a = byZone[z][Math.floor(Math.random() * byZone[z].length)]; pairs.push(a); }
      setChat(pairs.slice(0, 3));
    }, 1900);
    return () => clearInterval(id);
  }, [n.guests.length]);
  const talkRef = useRef(null);
  useEffect(() => { if ((talk || n.pending) && talkRef.current) talkRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [!!talk, !!n.pending, talk && talk.turn]);
  // Where everybody stands this hour.
  const seats = useMemo(() => {
    const byZone = {}; const out = {};
    for (const x of n.guests) { const z = x.zone || 'floor'; (byZone[z] = byZone[z] || []).push(x); }
    for (const z of Object.keys(byZone)) byZone[z].forEach((x, i) => { out[x.id] = seat(z, i); });
    // Everybody in the room stands somewhere; a stranger is a little off the grid.
    for (const x of n.guests) if (x.kind === 'extra') { let h = 0; for (const ch of x.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0; out[x.id] = { x: out[x.id].x + ((h % 17) - 8), y: out[x.id].y + ((h >> 4) % 9) - 4 }; }
    const mine = byZone[n.you] ? byZone[n.you].length : 0;
    out.you = n.pos ? n.pos : n.you === 'door' ? { x: ZONE_BOX.door.x + 98, y: ZONE_BOX.door.y + 18 } : seat(n.you, mine);
    return out;
  }, [n.guests.map((x) => x.id + x.zone + x.done + (x.seen ? 1 : 0)).join(','), n.you, n.hour, n.pos && n.pos.x, n.pos && n.pos.y]);
  // Free walking: a tap on the floor of the room and you go there. The zone you land in
  // is the zone you are in — the bar for a drink, the booths for a toast.
  function walk(e) {
    if (busy) return;
    const r = e.currentTarget.getBoundingClientRect();
    const p = { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
    const zone = Object.keys(ZONE_BOX).find((z) => { const b = ZONE_BOX[z]; return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; });
    if (!zone) return;
    if (zone === 'door') { dispatch(nightAct, 'leave'); return; }
    dispatch(moveTo, zone, Math.round(p.x), Math.round(Math.min(ZONE_BOX[zone].y + ZONE_BOX[zone].h - 14, Math.max(ZONE_BOX[zone].y + 22, p.y))));
  }
  if (!g.night) return null;
  const btn = (kind, off) => ({ border: 'none', borderRadius: 10, padding: '9px 10px', fontSize: 12, fontWeight: 800, cursor: off ? 'default' : 'pointer', opacity: off ? .45 : 1,
    background: kind === 'pri' ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : kind === 'bad' ? 'rgba(229,86,111,.16)' : 'rgba(255,255,255,.08)', color: kind === 'pri' ? '#fff' : kind === 'bad' ? theme.bad : theme.text });
  const buzzColor = n.buzz >= 80 ? theme.bad : n.buzz >= 60 ? '#f0b429' : n.buzz >= 20 ? theme.good : theme.muted;
  return (<div style={{ position: 'fixed', inset: 0, background: 'rgba(8,5,20,.97)', zIndex: 60, overflowY: 'auto', padding: 14, color: theme.text, fontFamily: FONT }}>
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.18em', textTransform: 'uppercase', color: theme.accent }}>{n.done ? (n.blackout ? 'The morning after · you do not remember it' : 'The morning after') : `The night · ${HOURS[hour]}`}</div>
        {!n.done && <div style={{ fontSize: 10.5, color: theme.muted }}>hour {hour + 1} of {HOURS.length}{n.spent ? ` · €${Math.round(n.spent)}` : ''}</div>}
      </div>
      <div style={{ fontSize: 17, fontWeight: 900 }}>{n.label} <span style={{ fontWeight: 600, color: theme.muted, fontSize: 12 }}>· {n.venue}{n.host ? ` · ${n.host}` : ''}</span></div>

      {/* the glass in your hand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 8px' }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: buzzColor, whiteSpace: 'nowrap' }}>🍸 {band.label}</span>
        <div style={{ flex: 1, height: 7, background: 'rgba(255,255,255,.08)', borderRadius: 4, position: 'relative' }}>
          <div style={{ width: `${n.buzz}%`, height: '100%', background: buzzColor, borderRadius: 4, transition: 'width .5s' }} />
          <div style={{ position: 'absolute', left: '20%', top: -2, bottom: -2, width: 1, background: 'rgba(255,255,255,.25)' }} />
          <div style={{ position: 'absolute', left: '60%', top: -2, bottom: -2, width: 1, background: 'rgba(255,255,255,.25)' }} />
          <div style={{ position: 'absolute', left: '90%', top: -2, bottom: -2, width: 1, background: theme.bad }} />
        </div>
        <span style={{ fontSize: 10, color: theme.muted, whiteSpace: 'nowrap' }}>+{drinkDose(g)} a glass{n.price ? ` · €${n.price}` : ''}</span>
      </div>

      {/* the room */}
      {!n.done && <div onClick={walk} style={{ position: 'relative', width: '100%', aspectRatio: `${W} / ${H}`, borderRadius: 14, background: 'linear-gradient(180deg,#17131f,#100d18)', border: `1px solid ${theme.line}`, marginBottom: 10, cursor: busy ? 'default' : 'crosshair', overflow: 'hidden' }}>
        <Scenery tier={n.tier} />
        {Object.entries(ZONE_BOX).map(([z, b]) => (<div key={z} style={{ position: 'absolute', left: `${(b.x / W) * 100}%`, top: `${(b.y / H) * 100}%`, width: `${(b.w / W) * 100}%`, height: `${(b.h / H) * 100}%`, borderRadius: 9, background: 'transparent', border: `1px solid ${n.you === z ? theme.accent + '88' : 'rgba(255,255,255,.07)'}` }}>
          <div style={{ position: 'absolute', left: 8, top: 4, fontSize: 8.5, fontWeight: 900, letterSpacing: '.08em', color: theme.muted }}>{(z === 'door' ? 'DOOR · LEAVE' : z === 'bar' ? 'THE BAR' : z === 'floor' ? 'THE FLOOR' : z === 'terrace' ? 'THE TERRACE' : 'THE BOOTHS')}</div>
        </div>))}
        {n.guests.map((x) => { const s0 = seats[x.id] || { x: 40, y: 40 }; const wd = (!x.done && !(talk && talk.guestId === x.id) && wander[x.id]) || { dx: 0, dy: 0 }; const p = { x: s0.x + wd.dx, y: s0.y + wd.dy }; const extra = x.kind === 'extra';
          return <Figure key={x.id} x={p.x} y={p.y} label={x.seen || x.came ? (x.heavy ? '★ ' : '') + x.name.split(' ')[0] : ''} look={lookForGuest(g, x, n.tier)} size={extra ? 26 : 30} came={x.came} done={x.done} extra={extra} lit={talk && talk.guestId === x.id} talking={chat.includes(x.id) && !(talk && talk.guestId === x.id)}
            onClick={!busy && !x.done ? (e) => { e.stopPropagation(); dispatch(goOver, x.id); } : null} />; })}
        <Figure x={seats.you.x} y={seats.you.y} label="you" look={lookOf(g)} size={34} you />
      </div>}

      <div ref={talkRef} />
      {n.done ? (<>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
          {[['Contacts', n.gains.contacts.length], ['Leads', n.gains.leads], ['Numbers', n.gains.numbers], ['Fame', n.gains.fame ? `+${n.gains.fame}` : '—'], ['Respect', n.gains.respect ? `+${n.gains.respect}` : '—'], ['Rumours', n.gains.scandal ? `+${n.gains.scandal}` : '—']].map(([k, v]) => (
            <div key={k} style={{ background: theme.panel2, border: `1px solid ${theme.line}`, borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: k === 'Rumours' && v !== '—' ? theme.bad : theme.text }}>{v}</div>
              <div style={{ fontSize: 9.5, color: theme.muted, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 800 }}>{k}</div>
            </div>))}
        </div>
        <button onClick={() => dispatch(leaveNight)} style={{ ...btn('pri'), width: '100%', padding: 12 }}>Go home</button>
      </>) : n.pending ? (
        <div style={{ background: theme.panel, border: `1px solid ${theme.gold}66`, borderRadius: 12, padding: '12px 13px', marginBottom: 12 }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 10 }}>{n.pending.text}</div>
          <div style={{ display: 'grid', gap: 7 }}>
            {n.pending.id === 'prospect' && (<>
              <button onClick={() => dispatch(nightChoice, 'number')} style={btn('pri')}>Get their number</button>
              <button onClick={() => dispatch(nightChoice, 'home')} style={btn('')}>Go home with them{g.partner ? ` — ${g.partner.name.split(' ')[0]} would not like it` : ''}</button>
              <button onClick={() => dispatch(nightChoice, 'night')} style={btn('')}>Say goodnight</button>
            </>)}
            {n.pending.id === 'leaveWith' && (<>
              <button onClick={() => dispatch(nightChoice, 'home')} style={btn('pri')}>Go{g.partner ? ` — ${g.partner.name.split(' ')[0]} would not like it` : ' — the photographers are outside'}</button>
              <button onClick={() => dispatch(nightChoice, 'night')} style={btn('')}>An early call tomorrow</button>
            </>)}
            {n.pending.id === 'couch' && (<>
              <button onClick={() => dispatch(nightChoice, 'yes')} style={btn('bad')}>Get in the car. The part is yours.</button>
              <button onClick={() => dispatch(nightChoice, 'no')} style={btn('pri')}>Say goodnight</button>
            </>)}
            {n.pending.id === 'test' && (<div>
              {/* The test: a name gives you a scene, or a story, right there. */}
              {n.pending.kind === 'scene'
                ? <TimingBar zoneStart={14 + Math.random() * 58} zoneWidth={9 + Math.random() * 4} speed={3 + Math.random() * 1.6} onResult={(q) => dispatch(heavyTest, q)} />
                : <GridRisk cols={4} rows={3} bad={5} labelSafe="·" labelBad="!" onResult={(q) => dispatch(heavyTest, q)} />}
              <div style={{ fontSize: 10.5, color: theme.muted, textAlign: 'center', marginTop: 6 }}>{n.pending.kind === 'scene' ? 'Hit the mark dead centre. This is the only take.' : 'Beat by beat. Some beats fall flat. Stop while it still lands.'}</div>
            </div>)}
            {n.pending.id === 'pitch' && !pitch && (<>
              <button onClick={() => setPitch({ genre: hotGenre(g), scale: 'indie', months: 4, title: '' })} style={btn('pri')}>Pitch them a picture</button>
              <button onClick={() => dispatch(skipPitch)} style={btn('')}>Talk about other things</button>
            </>)}
            {n.pending.id === 'pitch' && pitch && (<div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase', color: theme.muted }}>The picture</div>
              <input value={pitch.title} onChange={(e) => setPitch({ ...pitch, title: e.target.value })} placeholder="A title — or leave it and they will name it" maxLength={40}
                style={{ background: theme.panel2, border: `1px solid ${theme.line}`, borderRadius: 9, padding: '9px 11px', color: theme.text, fontSize: 13, fontFamily: 'inherit' }} />
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {GENRES.map((gn) => (<button key={gn} onClick={() => setPitch({ ...pitch, genre: gn })} style={{ ...btn(pitch.genre === gn ? 'pri' : ''), padding: '6px 9px', fontSize: 11 }}>{gn}{gn === hotGenre(g) ? ' 🔥' : ''}</button>))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                {Object.entries(PITCH_SCALES).map(([k, sc]) => (<button key={k} onClick={() => setPitch({ ...pitch, scale: k })} style={{ ...btn(pitch.scale === k ? 'pri' : ''), padding: '7px 6px', fontSize: 11, opacity: (g.fame || 0) < sc.fame ? .55 : 1 }}>{sc.label}{(g.fame || 0) < sc.fame ? ` · fame ${sc.fame}` : ''}</button>))}
              </div>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 11.5 }}>
                <span style={{ color: theme.muted }}>Shooting</span>
                {[3, 4, 6, 8, 10].map((m) => (<button key={m} onClick={() => setPitch({ ...pitch, months: m })} style={{ ...btn(pitch.months === m ? 'pri' : ''), padding: '5px 9px', fontSize: 11 }}>{m} mo</button>))}
              </div>
              <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.5 }}>{n.pending.who.split(' ')[0]} would say yes about <b style={{ color: theme.gold }}>{pitchOdds(g, n.pending.who, n.pending.weight, pitch.scale, pitch.genre)}%</b> of the time — their weight, your fame against the size of it, the genre people want this year, what the papers say about you.</div>
              <button onClick={() => { dispatch(sendPitch, pitch); setPitch(null); }} style={btn('pri')}>Pitch it</button>
            </div>)}
            {n.pending.id === 'dig' && (<>
              <button onClick={() => dispatch(nightChoice, 'bite')} style={btn('')}>Answer them</button>
              <button onClick={() => dispatch(nightChoice, 'laugh')} style={btn('pri')}>Laugh it off</button>
            </>)}
          </div>
        </div>
      ) : talk && who && talk.stage === 'meet' ? (
        <div style={{ background: theme.panel, border: `1px solid ${theme.accent}55`, borderRadius: 12, padding: '11px 13px', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Avatar look={lookForGuest(g, who, n.tier)} size={54} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{who.heavy ? '★ ' : ''}{who.name}</div>
              <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.45, marginTop: 2 }}>{who.kind === 'contact' ? `${who.role} · you know them` : who.heavy ? who.why : who.came ? 'They came over to you. Whoever they are.' : 'You do not know what they do. You could ask — it costs a turn.'}{who.drunk >= 50 ? ' · a few drinks in' : ''}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 10 }}>
            <button onClick={() => dispatch(startTalk)} style={btn('pri')}>Talk · {talk.turns} turns{who.came ? '' : ' · an hour'}</button>
            <button onClick={() => dispatch(moveOn)} style={btn('')}>Not this one · a look</button>
          </div>
        </div>
      ) : talk && who ? (
        <div style={{ background: theme.panel, border: `1px solid ${theme.accent}55`, borderRadius: 12, padding: '11px 13px', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{who.heavy ? '★ ' : ''}{who.name}{(who.revealed || who.kind === 'contact') && who.role && who.kind !== 'actor' ? <span style={{ color: theme.muted, fontWeight: 600 }}> · {who.role}</span> : null}</div>
            <div style={{ fontSize: 10.5, color: theme.muted }}>turn {Math.min(talk.turn + 1, talk.turns)} of {talk.turns}{who.drunk >= 50 ? ' · they are drunk' : ''}</div>
          </div>
          <div style={{ fontSize: 11, color: theme.muted, marginBottom: 8, lineHeight: 1.4 }}>{who.revealed || who.kind === 'contact' ? who.line : who.heavy ? who.why : 'Somebody. You have not asked.'}</div>
          {talk.said.slice(-3).map((l, i) => (<div key={i} style={{ fontSize: 12.5, lineHeight: 1.5, padding: '3px 0', color: l.mine ? theme.accent : l.warm === 'warm' ? theme.good : l.warm === 'cold' ? theme.bad : theme.text, fontStyle: l.mine ? 'italic' : 'normal' }}>{l.mine ? `— ${l.text}` : l.text}</div>))}
          {talk.toast === 'ask' ? (<div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12.5, marginBottom: 8 }}>{who.name.split(' ')[0]} raises a glass at you.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              <button onClick={() => dispatch(answerToast, true)} style={btn('pri')}>🍸 A glass · +{drinkDose(g)}{n.price ? ` · €${n.price}` : ''}</button>
              <button onClick={() => dispatch(answerToast, false)} style={btn('')}>Not tonight · cold start</button>
            </div>
          </div>) : (<div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            {talk.options.map((o) => (<button key={o.id} onClick={() => dispatch(reply, o.id)} style={{ ...btn(''), textAlign: 'left', fontWeight: 600, lineHeight: 1.4, color: o.slurred ? theme.muted : o.ask ? theme.gold : theme.text, fontStyle: o.slurred || o.ask ? 'italic' : 'normal', border: o.ask ? `1px dashed ${theme.gold}66` : 'none' }}>{o.ask ? '❓ ' : ''}{o.text}</button>))}
            {ZONES[who.zone] && ZONES[who.zone].toast && <button onClick={() => dispatch(drinkTogether)} style={{ ...btn(''), color: theme.gold }}>🍸 One more, together · +{drinkDose(g)}{n.price ? ` · €${n.price * 2}` : ''}</button>}
          </div>)}
        </div>
      ) : (<>
        <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.5, marginBottom: 8 }}>Tap anywhere to walk there; tap somebody to go over — you get a face and a name, and what they do you find out by asking. A talk is an hour; walking away is a look ({LOOKS_AN_HOUR()} looks is an hour). At the bar or in a booth a talk starts with a glass.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 6 }}>
          {n.you === 'bar' || n.you === 'booth' ? <button onClick={() => dispatch(nightDrink)} style={btn('')}>🍸 A drink{n.price ? ` · €${n.price}` : ''}</button> : null}
          {n.you === 'floor' ? <button onClick={() => dispatch(nightAct, 'floor')} style={btn('')}>💃 Dance an hour</button> : null}
          {n.you === 'terrace' ? <button onClick={() => dispatch(nightAct, 'terrace')} style={btn('')}>🌙 An hour of air · −12</button> : null}
          {n.cameras && <button onClick={() => dispatch(nightAct, 'cameras')} style={btn('')}>📸 The cameras</button>}
          <button onClick={() => dispatch(nightAct, 'leave')} style={btn('bad')}>🚪 Leave</button>
        </div>
        {n.looks > 0 && <div style={{ fontSize: 10.5, color: theme.muted, marginBottom: 4 }}>{n.looks} of {LOOKS_AN_HOUR()} looks this hour.</div>}
      </>)}
      {/* what has happened */}
      <div style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '8px 12px', marginTop: 10 }}>
        {n.log.slice(n.done ? 0 : -3).map((l, i) => (<div key={i} style={{ fontSize: 12.5, lineHeight: 1.5, color: TONE[l.tone] || theme.text, padding: '2px 0' }}>{l.text}</div>))}
      </div>

      {!n.done && n.guests.some((x) => x.done && x.went) && <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 6 }}>{n.guests.filter((x) => x.done && x.went).map((x) => `${x.name.split(' ')[0]} ${x.went === 'good' ? '✓' : x.went === 'flat' ? '·' : '✗'}`).join(' · ')}</div>}
    </div>
  </div>);
}
