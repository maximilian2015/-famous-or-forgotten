import { useEffect, useMemo } from 'react';
import { theme } from '../theme.js';
import { FONT } from '../chrome.js';
import { dispatch } from '../../state/store.js';
import { startLoop, stopLoop } from '../sfx.js';
import { HOURS, ZONES, buzzBand, drinkDose, goOver, lookAt, moveTo, answerToast, reply, drinkTogether, nightDrink, nightAct, nightChoice, leaveNight, LOOKS_AN_HOUR } from '../../systems/social/night.js';

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
  door: { x: 232, y: 142, w: 120, h: 32 },
};
// A seat in a zone for the i-th figure there, so figures do not sit on each other.
function seat(zone, i) {
  const b = ZONE_BOX[zone] || ZONE_BOX.floor;
  const cols = Math.max(1, Math.floor((b.w - 20) / 46));
  const col = i % cols, row = Math.floor(i / cols);
  return { x: b.x + 26 + col * 46, y: Math.min(b.y + b.h - 22, b.y + 30 + row * 36) };
}

function Figure({ x, y, label, icon, you, came, done, lit, extra, onClick }) {
  const r = extra ? 10 : 13;
  return (<g onClick={onClick} style={{ transform: `translate(${x}px, ${y}px)`, cursor: onClick ? 'pointer' : 'default', transition: 'transform .9s cubic-bezier(.4,0,.2,1), opacity .4s', opacity: done ? .3 : extra ? .75 : 1 }}>
    {lit && <circle r="19" fill={theme.accent} opacity=".22" />}
    <circle r={r} fill={you ? theme.accent : came ? theme.good : extra ? '#2a2536' : '#3a3350'} stroke={you ? '#fff' : lit ? theme.gold : came ? theme.good : 'rgba(255,255,255,.22)'} strokeWidth={you || lit ? 2 : 1} />
    <text y="4.5" textAnchor="middle" fontSize={extra ? 10 : 13}>{icon}</text>
    {label && <text y={r + 12} textAnchor="middle" fontSize="8.5" fontWeight="800" fill={you ? theme.accent : came ? theme.good : '#e6dfff'}>{label}</text>}
  </g>);
}

export function NightRoom({ g }) {
  const n = g.night || { guests: [], log: [], gains: {}, hour: 0, buzz: 0, you: 'door', tier: 'local' };
  useEffect(() => { startLoop(n.tier === 'local' ? 'house' : n.tier === 'mixer' ? 'club' : 'lounge'); return () => stopLoop(); }, []);
  const hour = Math.min(n.hour, HOURS.length - 1);
  const band = buzzBand(n.buzz);
  const talk = n.talk; const who = talk && n.guests.find((x) => x.id === talk.guestId);
  const busy = n.done || !!n.pending || !!talk;
  // Where everybody stands this hour.
  const seats = useMemo(() => {
    const byZone = {}; const out = {};
    for (const x of n.guests) { const z = x.zone || 'floor'; (byZone[z] = byZone[z] || []).push(x); }
    for (const z of Object.keys(byZone)) byZone[z].forEach((x, i) => { out[x.id] = seat(z, i); });
    // Everybody in the room stands somewhere; a stranger is a little off the grid.
    for (const x of n.guests) if (x.kind === 'extra') { let h = 0; for (const ch of x.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0; out[x.id] = { x: out[x.id].x + ((h % 17) - 8), y: out[x.id].y + ((h >> 4) % 9) - 4 }; }
    const mine = byZone[n.you] ? byZone[n.you].length : 0;
    out.you = n.pos ? n.pos : n.you === 'door' ? { x: ZONE_BOX.door.x + 100, y: ZONE_BOX.door.y + 10 } : seat(n.you, mine);
    return out;
  }, [n.guests.map((x) => x.id + x.zone + x.done + (x.seen ? 1 : 0)).join(','), n.you, n.hour, n.pos && n.pos.x, n.pos && n.pos.y]);
  // Free walking: a tap on the floor of the room and you go there. The zone you land in
  // is the zone you are in — the bar for a drink, the booths for a toast.
  function walk(e) {
    if (busy) return;
    const svg = e.currentTarget; const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
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
      {!n.done && <svg viewBox={`0 0 ${W} ${H}`} onClick={walk} style={{ width: '100%', display: 'block', borderRadius: 14, background: 'linear-gradient(180deg,#17131f,#100d18)', border: `1px solid ${theme.line}`, marginBottom: 10, cursor: busy ? 'default' : 'crosshair' }}>
        {Object.entries(ZONE_BOX).map(([z, b]) => (<g key={z}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="9" fill={n.you === z ? `${theme.accent}14` : 'rgba(255,255,255,.035)'} stroke={n.you === z ? `${theme.accent}66` : 'rgba(255,255,255,.09)'} />
          <text x={b.x + 8} y={b.y + 13} fontSize="8.5" fontWeight="900" letterSpacing=".08em" fill={theme.muted}>{(z === 'door' ? 'DOOR · LEAVE' : z === 'bar' ? 'THE BAR' : z === 'floor' ? 'THE FLOOR' : z === 'terrace' ? 'THE TERRACE' : 'THE BOOTHS')}</text>
        </g>))}
        {n.guests.map((x) => { const p = seats[x.id] || { x: 40, y: 40 }; const extra = x.kind === 'extra';
          const icon = extra ? (x.mask === 'industry' ? '💼' : x.mask === 'actor' ? '🎭' : '👤') : x.icon ? '👑' : KIND_ICON[x.kind] || '🎭';
          return <Figure key={x.id} x={p.x} y={p.y} label={x.seen || x.came ? x.name.split(' ')[0] : ''} icon={icon} came={x.came} done={x.done} extra={extra} lit={talk && talk.guestId === x.id}
            onClick={!busy && !x.done ? (e) => { e.stopPropagation(); dispatch(extra ? lookAt : goOver, x.id); } : null} />; })}
        <Figure x={seats.you.x} y={seats.you.y} label="you" icon="⭐" you />
      </svg>}

      {/* what has happened */}
      <div style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '8px 12px', marginBottom: 10 }}>
        {n.log.slice(n.done ? 0 : -3).map((l, i) => (<div key={i} style={{ fontSize: 12.5, lineHeight: 1.5, color: TONE[l.tone] || theme.text, padding: '2px 0' }}>{l.text}</div>))}
      </div>

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
            {n.pending.id === 'dig' && (<>
              <button onClick={() => dispatch(nightChoice, 'bite')} style={btn('')}>Answer them</button>
              <button onClick={() => dispatch(nightChoice, 'laugh')} style={btn('pri')}>Laugh it off</button>
            </>)}
          </div>
        </div>
      ) : talk && who ? (
        <div style={{ background: theme.panel, border: `1px solid ${theme.accent}55`, borderRadius: 12, padding: '11px 13px', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{who.name}{who.role && who.kind !== 'actor' ? <span style={{ color: theme.muted, fontWeight: 600 }}> · {who.role}</span> : null}</div>
            <div style={{ fontSize: 10.5, color: theme.muted }}>turn {Math.min(talk.turn + 1, talk.turns)} of {talk.turns}{who.drunk >= 50 ? ' · they are drunk' : ''}</div>
          </div>
          <div style={{ fontSize: 11, color: theme.muted, marginBottom: 8, lineHeight: 1.4 }}>{who.line}</div>
          {talk.said.slice(-3).map((l, i) => (<div key={i} style={{ fontSize: 12.5, lineHeight: 1.5, padding: '3px 0', color: l.mine ? theme.accent : l.warm === 'warm' ? theme.good : l.warm === 'cold' ? theme.bad : theme.text, fontStyle: l.mine ? 'italic' : 'normal' }}>{l.mine ? `— ${l.text}` : l.text}</div>))}
          {talk.toast === 'ask' ? (<div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12.5, marginBottom: 8 }}>{who.name.split(' ')[0]} raises a glass at you.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              <button onClick={() => dispatch(answerToast, true)} style={btn('pri')}>🍸 A glass · +{drinkDose(g)}{n.price ? ` · €${n.price}` : ''}</button>
              <button onClick={() => dispatch(answerToast, false)} style={btn('')}>Not tonight · cold start</button>
            </div>
          </div>) : (<div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            {talk.options.map((o) => (<button key={o.id} onClick={() => dispatch(reply, o.id)} style={{ ...btn(''), textAlign: 'left', fontWeight: 600, lineHeight: 1.4, color: o.slurred ? theme.muted : theme.text, fontStyle: o.slurred ? 'italic' : 'normal' }}>{o.text}</button>))}
            {ZONES[who.zone] && ZONES[who.zone].toast && <button onClick={() => dispatch(drinkTogether)} style={{ ...btn(''), color: theme.gold }}>🍸 One more, together · +{drinkDose(g)}{n.price ? ` · €${n.price * 2}` : ''}</button>}
          </div>)}
        </div>
      ) : (<>
        <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.5, marginBottom: 8 }}>Tap anywhere to walk there; tap somebody to go over — the names are not on the figures, and a stranger costs a look ({LOOKS_AN_HOUR()} looks is an hour). At the bar or in a booth a talk starts with a glass.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 6 }}>
          {n.you === 'bar' || n.you === 'booth' ? <button onClick={() => dispatch(nightDrink)} style={btn('')}>🍸 A drink{n.price ? ` · €${n.price}` : ''}</button> : null}
          {n.you === 'floor' ? <button onClick={() => dispatch(nightAct, 'floor')} style={btn('')}>💃 Dance an hour</button> : null}
          {n.you === 'terrace' ? <button onClick={() => dispatch(nightAct, 'terrace')} style={btn('')}>🌙 An hour of air · −12</button> : null}
          {n.cameras && <button onClick={() => dispatch(nightAct, 'cameras')} style={btn('')}>📸 The cameras</button>}
          <button onClick={() => dispatch(nightAct, 'leave')} style={btn('bad')}>🚪 Leave</button>
        </div>
        {n.looks > 0 && <div style={{ fontSize: 10.5, color: theme.muted, marginBottom: 4 }}>{n.looks} of {LOOKS_AN_HOUR()} looks this hour.</div>}
        <div style={{ fontSize: 10.5, color: theme.muted }}>{n.guests.filter((x) => x.done).map((x) => `${x.name.split(' ')[0]} ${x.went === 'good' ? '✓' : x.went === 'flat' ? '·' : '✗'}`).join(' · ')}</div>
      </>)}
    </div>
  </div>);
}
