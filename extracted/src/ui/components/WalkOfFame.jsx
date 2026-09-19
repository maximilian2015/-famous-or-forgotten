import { useState } from 'react';
import { theme } from '../theme.js';
import { Card } from './Card.jsx';
import { yearsOf, moneyOf } from '../../systems/world/yearbook.js';
import { legends as legendsOf, alist as alistOf, ageOf, SEATS } from '../../systems/world/world.js';

// The wall. Who is an icon right now, who was one, and every year the business has kept
// lists for — the ten films that took the money, the five actors whose year it was, the
// five the critics liked, and where the Askers went. Your name, when it is on any of it,
// is lit. Maxi: "an alley of fame, where you can see who was best each year, and the
// icons — people who already are icons; you want to meet them."
const head = { fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 };
const sub = { fontSize: 10, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', color: theme.muted, margin: '10px 0 5px' };

function Row({ n, a, b, c, you, gold }) {
  return (<div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12, padding: '4px 8px', borderRadius: 7,
    background: you ? 'rgba(255,209,102,.14)' : 'transparent', border: `1px solid ${you ? 'rgba(255,209,102,.45)' : 'transparent'}`, color: you ? theme.text : theme.muted }}>
    {n != null && <span style={{ width: 22, fontWeight: 900, color: you || gold ? theme.gold : theme.muted }}>#{n}</span>}
    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: you ? 800 : 600 }}>{a}{b ? <span style={{ fontWeight: 500, opacity: .8 }}> · {b}</span> : null}</span>
    {c != null && <span style={{ fontWeight: 800, color: you ? theme.gold : theme.muted, whiteSpace: 'nowrap' }}>{c}</span>}
  </div>);
}

function Year({ y, open, onToggle }) {
  const you = y.films.some((f) => f.you) || y.actors.some((a) => a.you) || (y.askers || []).some((a) => a.you);
  return (<div style={{ borderTop: `1px solid ${theme.line}` }}>
    <button onClick={onToggle} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 2px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', color: theme.text }}>
      <span style={{ fontSize: 13.5, fontWeight: 900, color: you ? theme.gold : theme.text }}>{y.year}{you ? ' ★' : ''}</span>
      <span style={{ fontSize: 11, color: theme.muted, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginLeft: 10 }}>
        {y.films[0] ? `${y.films[0].title} · ${y.actors[0] ? y.actors[0].name : ''}` : '—'} {open ? '▾' : '▸'}
      </span>
    </button>
    {open && <div style={{ paddingBottom: 8 }}>
      <div style={sub}>The most successful films of {y.year}</div>
      {y.films.map((f) => <Row key={f.rank} n={f.rank} a={f.title} b={f.with ? `${f.actor} & ${f.with}` : f.actor} c={moneyOf(f.gross)} you={f.you} />)}
      <div style={sub}>Actors of the year</div>
      {y.actors.map((a) => <Row key={a.rank} n={a.rank} a={a.name} b={`${a.films} film${a.films === 1 ? '' : 's'}`} c={moneyOf(a.gross)} you={a.you} />)}
      {y.best && y.best.length > 0 && <>
        <div style={sub}>The critics' five</div>
        {y.best.map((f) => <Row key={f.rank} n={f.rank} a={f.title} b={f.actor} c={`${(f.rating / 10).toFixed(1)}/10`} you={f.you} />)}
      </>}
      {(y.askers || []).length > 0 && <>
        <div style={sub}>The Askers</div>
        {y.askers.map((a, i) => <Row key={i} a={`${LABEL[a.category] || a.category} — ${a.name}`} b={a.work ? `"${a.work}"` : ''} you={a.you} gold />)}
      </>}
      {y.icons && y.icons.length > 0 && <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 8, lineHeight: 1.5 }}>Icons that year: {y.icons.join(', ')}</div>}
    </div>}
  </div>);
}
const LABEL = { lead: 'Leading Performance', supporting: 'Supporting Performance', picture: 'Best Picture' };

export function WalkOfFame({ g }) {
  const [openYear, setOpenYear] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const years = yearsOf(g);
  if (!g.world || !years.length) return null;
  // The three chairs, whoever is in them. A name at #2 on 87 fame is in the chair without
  // the word yet — it used to vanish from the page entirely: "#1, #3" and nothing between.
  const now = ((g.world && g.world.actors) || []).filter((a) => a.alive && !a.retired && (a.rank || 999) <= SEATS.icon).sort((a, b) => (a.rank || 99) - (b.rank || 99));
  const alist = alistOf(g);
  const legends = legendsOf(g).filter((a) => a.retired || !a.alive).slice(-6).reverse();
  const you = g.world && g.world.rank;
  const shown = showAll ? years : years.slice(0, 6);
  return (<div style={{ marginTop: 18 }}>
    <div style={head}>Walk of Fame</div>
    <Card>
      <div style={sub}>Icons</div>
      {now.length === 0 && <div style={{ fontSize: 12, color: theme.muted, padding: '4px 8px' }}>Nobody, right now. The business is between them.</div>}
      {now.map((a) => (<div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, padding: '5px 8px', fontSize: 12.5 }}>
        <span style={{ fontWeight: 800, color: a.icon ? theme.gold : theme.text }}>#{a.rank} {a.name}</span>
        <span style={{ fontSize: 11, color: theme.muted, whiteSpace: 'nowrap' }}>{ageOf(g, a)} · {a.icon ? `icon since ${a.iconSince}` : 'in the chair, not yet the name'}{a.askers ? ` · 🏆 ${a.askers}` : ''}</span>
      </div>))}
      {/* The nine chairs under them — the room you are trying to get into, with your own place under it. */}
      <div style={sub}>The A-list</div>
      {alist.map((a) => (<div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, padding: '4px 8px', fontSize: 12 }}>
        <span style={{ fontWeight: 700, color: theme.text }}>#{a.rank} {a.name}{a.icon ? <span style={{ color: theme.gold }}> ★</span> : null}</span>
        <span style={{ fontSize: 11, color: theme.muted, whiteSpace: 'nowrap' }}>{ageOf(g, a)}{a.askers ? ` · 🏆 ${a.askers}` : ''}</span>
      </div>))}
      {you && you.you && (g.filmography || []).length > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, padding: '6px 8px', marginTop: 4, fontSize: 12, borderRadius: 8, background: 'rgba(255,209,102,.12)', border: '1px solid rgba(255,209,102,.4)' }}>
        <span style={{ fontWeight: 800, color: theme.gold }}>#{you.you} {g.name} — you</span>
        <span style={{ fontSize: 11, color: theme.muted, whiteSpace: 'nowrap' }}>{you.you <= SEATS.icon ? 'one of the three' : you.you <= SEATS.alist ? 'on the A-list' : `${you.you - SEATS.alist} place${you.you - SEATS.alist === 1 ? '' : 's'} off the A-list`}</span>
      </div>}
      {legends.length > 0 && <>
        <div style={sub}>Legends</div>
        {legends.map((a) => (<div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, padding: '4px 8px', fontSize: 12, color: theme.muted }}>
          <span style={{ fontWeight: 700 }}>{a.name}</span>
          <span style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{!a.alive ? `† ${a.died}` : a.retired ? `retired ${a.retiredIn}` : `icon ${a.iconSince}–`}{a.askers ? ` · 🏆 ${a.askers}` : ''}</span>
        </div>))}
      </>}
      <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 8, lineHeight: 1.5 }}>
        Share a poster with one of them and people notice. They turn up opposite you on the bigger pictures.
      </div>
    </Card>
    <div style={{ ...head, marginTop: 14 }}>Year by year</div>
    <Card>
      {shown.map((y) => <Year key={y.year} y={y} open={openYear === y.year} onToggle={() => setOpenYear(openYear === y.year ? null : y.year)} />)}
      {years.length > 6 && <button onClick={() => setShowAll(!showAll)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0 2px', fontSize: 11, fontWeight: 800, color: theme.accent }}>
        {showAll ? 'Fewer years' : `All ${years.length} years`}
      </button>}
    </Card>
  </div>);
}
