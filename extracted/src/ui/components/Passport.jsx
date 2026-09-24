import { theme } from '../theme.js';
import { FONT, FONT_DISPLAY } from '../chrome.js';
import { Avatar } from './Avatar.jsx';
import { lookOf, companionOf } from '../../systems/life/appearance.js';
import { fameTier, isForgotten } from '../../systems/meta/status.js';
import { yourRank } from '../../systems/world/world.js';
import { HOUSING, ledger } from '../../engine/economy.js';
import { THINGS, HOME_PRICE, owns } from '../../systems/life/money.js';
import { LABELS, labelInfo, activeLabels, scoreOf, STRONG_AT, ACTIVE_AT, tendency } from '../../systems/meta/typecast.js';
import { apparentAge, height, weightKg } from '../../systems/life/face.js';
import { band as drinkBand, dependent } from '../../systems/life/drink.js';
import { strainBand } from '../../systems/life/strain.js';
import { ambitionProgress } from '../../systems/meta/ambition.js';
import { factions } from '../../systems/meta/factions.js';

// Who you are, on one card. Maxi: "when you press your little person — when you were
// born, how old you are and how old you look, height, weight, where you live, status,
// what you have earned in your life, family, illnesses, children." A passport with the
// things a passport does not print.
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const money = (n) => (Math.abs(n) >= 1e6 ? '€' + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'm' : '€' + Math.round(n).toLocaleString());

export function Passport({ g, onClose, onRoom }) {
  const age = g.ageY || 0;
  const bornYear = (g.year || 0) - age, bornMonth = g.bornMonth != null ? g.bornMonth : (g.month || 0);
  const mate = companionOf(g);
  const kids = (g.family || []).filter((p) => p.relation === 'Child' && p.alive);
  const parents = (g.family || []).filter((p) => (p.relation === 'Mother' || p.relation === 'Father'));
  const tier = fameTier(g.fame || 0); const rank = yourRank(g);
  const home = g.homeless ? 'Nowhere — the street' : g.hostedBy ? `At ${(mate && mate.person.name.split(' ')[0]) || 'somebody'}'s` : !g.hasApartment ? 'With your parents' : (HOUSING[g.housing] || {}).label || 'A place';
  const homeWorth = g.owns ? (HOME_PRICE[g.owns] || 0) : 0;
  const thingsWorth = Object.keys(THINGS).reduce((n, id) => n + (owns(g, id) ? THINGS[id].price * THINGS[id].resale : 0), 0);
  const worth = (g.cash || 0) + homeWorth + thingsWorth;
  const earnedFilms = (g.filmography || []).reduce((n, c) => n + (c.salary || 0), 0);
  const earned = Math.max(g.earnedLife || 0, earnedFilms);
  const wins = ((g.awards || {}).wins || []).length, noms = ((g.awards || {}).nominations || []).length;
  const hits = (g.filmography || []).filter((c) => (c.rating || 0) >= 85).length;
  const ill = g.illness ? `${g.illness.name}${g.illness.serious ? ' (serious)' : ''}` : null;
  const drink = drinkBand(g);
  const row = (k, v, color) => (<div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: `1px solid ${theme.line}`, fontSize: 12.5 }}>
    <span style={{ color: theme.muted, flex: 'none' }}>{k}</span><span style={{ textAlign: 'right', fontWeight: 700, color: color || theme.text }}>{v}</span>
  </div>);
  const head = (t) => (<div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', color: theme.accent, margin: '14px 0 2px' }}>{t}</div>);
  return (<div style={{ position: 'fixed', inset: 0, background: 'rgba(8,5,20,.97)', zIndex: 60, overflowY: 'auto', padding: 16, color: theme.text, fontFamily: FONT }}>
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 6 }}>
        <Avatar look={lookOf(g)} size={72} title={g.name} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 700, lineHeight: 1.05 }}>{g.name}</div>
          <div style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>Born {MON[bornMonth]} {bornYear} · {age}{age >= 18 && apparentAge(g) !== age ? <span style={{ color: apparentAge(g) > age ? theme.bad : theme.good }}> · looks {apparentAge(g)}</span> : ''}</div>
          <div style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>{age >= 18 ? `${height(g)} cm · ${weightKg(g)} kg · ` : ''}{g.city || 'Amsterdam'}</div>
        </div>
      </div>
      {head('Standing')}
      {row('Status', `${tier.label}${isForgotten(g) ? ' · Forgotten' : ''}`, theme.gold)}
      {rank < 999 && row('In the business', `#${rank}`)}
      {row('Fame · respect', `${Math.round(g.fame || 0)} · ${Math.round(g.respect || 0)}`)}
      {g.quote > 0 && row('Your quote', money(g.quote))}
      {g.agent && g.agent.level > 0 && row('Agent', g.agent.name)}
      {ambitionProgress(g) && row('Wanted, at ten', `${ambitionProgress(g).label} · ${ambitionProgress(g).met ? 'got it' : `${Math.round(ambitionProgress(g).progress * 100)}%`}`, ambitionProgress(g).met ? theme.gold : undefined)}
      {/* Who thinks what: six standings read off the life, none of them kept. See meta/factions.js. */}
      {head('Who thinks what')}
      {factions(g).map((f) => (<div key={f.id} style={{ padding: '5px 0', borderBottom: `1px solid ${theme.line}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 12.5, fontWeight: 800, color: f.score >= 70 ? theme.gold : f.score < 35 ? theme.bad : theme.text }}>{f.label}</span><span style={{ fontSize: 11, color: theme.muted }}>{f.score}</span></div>
        <div style={{ height: 3, background: 'rgba(255,255,255,.08)', borderRadius: 2, margin: '4px 0 3px' }}><div style={{ width: `${f.score}%`, height: '100%', background: f.score >= 70 ? theme.gold : f.score < 35 ? theme.bad : theme.accent, borderRadius: 2 }} /></div>
        <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.4 }}>{f.line}</div>
      </div>))}
      {/* Public image: the label the business has for you, and how firmly. See meta/typecast.js. */}
      {head('Public image')}
      {activeLabels(g).length === 0 && <div style={{ fontSize: 12, color: theme.muted, padding: '4px 0 8px', lineHeight: 1.5 }}>No label yet. Three parts of a kind and the business finds a word for you — and the parts that fit it come easier.</div>}
      {/* What they are starting to think, before there is a word for it. meta/typecast.js */}
      {(() => { const t = tendency(g); if (!t) return null; return (<div style={{ padding: '5px 0', borderBottom: `1px solid ${theme.line}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 13, fontWeight: 800, color: theme.muted }}>{t.label}</span><span style={{ fontSize: 10.5, color: theme.muted }}>not yet a word</span></div>
        <div style={{ height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 2, margin: '5px 0 4px' }}><div style={{ width: `${Math.min(100, (t.score / t.need) * 100)}%`, height: '100%', background: theme.muted, borderRadius: 2 }} /></div>
        <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.45 }}>{t.line}. {t.need - t.score <= 1 ? 'One more like the last one and it sticks.' : 'Keep taking them and it sticks.'}</div>
      </div>); })()}
      {activeLabels(g).map((id) => (<div key={id} style={{ padding: '5px 0', borderBottom: `1px solid ${theme.line}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 13, fontWeight: 800, color: scoreOf(g, id) >= STRONG_AT ? theme.gold : theme.text }}>{labelInfo(id).label}</span><span style={{ fontSize: 10.5, color: theme.muted }}>{scoreOf(g, id) >= STRONG_AT ? 'what you are to them' : 'a word they use'}</span></div>
        <div style={{ height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 2, margin: '5px 0 4px' }}><div style={{ width: `${Math.min(100, scoreOf(g, id) * 10)}%`, height: '100%', background: scoreOf(g, id) >= STRONG_AT ? theme.gold : theme.accent, borderRadius: 2 }} /></div>
        <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.45 }}>{labelInfo(id).blurb}</div>
      </div>))}
      {head('Money')}
      {row('In the bank', money(g.cash || 0), (g.cash || 0) < 0 ? theme.bad : theme.text)}
      {row('Worth, all in', money(worth))}
      {row('Earned in your life', money(earned))}
      {/* Maxi: "I am paid twenty or thirty million a picture and I still have fifty-five —
          check where it goes." The statement. See engine/economy.js. */}
      {(() => { const L = ledger(g); if (!L.rows.length) return null; return (<>
        {row('Paid before the cut', money(L.gross), theme.muted)}
        <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.muted, margin: '8px 0 2px' }}>Where it went</div>
        {L.rows.map((r) => (<div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '4px 0', fontSize: 12 }}>
          <span style={{ color: theme.muted }}>{r.label}</span>
          <span style={{ fontWeight: 700, color: theme.bad }}>−{money(r.amount)}</span>
        </div>))}
        {L.unaccounted > 1000 && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '4px 0', fontSize: 12 }}><span style={{ color: theme.muted }}>Lived on, day to day</span><span style={{ fontWeight: 700, color: theme.bad }}>−{money(L.unaccounted)}</span></div>}
      </>); })()}
      {row('Lives', home)}
      {head('The work')}
      {row('Credits', `${(g.filmography || []).length}${hits ? ` · ${hits} hit${hits === 1 ? '' : 's'}` : ''}`)}
      {(wins || noms) ? row('The Askers', `${wins} won · ${noms} nominated`) : null}
      {head('Family')}
      {row('Status', mate ? (mate.married ? `Married to ${mate.person.name}` : `With ${mate.person.name}${mate.person.livingTogether ? ' · living together' : ''}`) : 'Single')}
      {row('Children', kids.length ? kids.map((k) => `${k.name.split(' ')[0]} (${Math.floor(k.age || 0)})`).join(', ') : 'None')}
      {parents.length > 0 && row('Parents', parents.map((p) => `${p.relation.toLowerCase()} ${p.alive ? 'alive' : 'gone'}`).join(', '))}
      {head('Health')}
      {row('Body', `${Math.round(g.health || 0)} · ${strainBand(g.strain || 0).label.toLowerCase()}`, (g.health || 0) < 40 ? theme.bad : theme.text)}
      {row('Head', `${Math.round(g.mental || 0)}${g.depression ? ' · depressed' : ''}`, (g.mental || 0) < 30 ? theme.bad : theme.text)}
      {row('Illness', ill || 'None', ill ? theme.bad : theme.text)}
      {row('Drink', dependent(g) ? `${drink.label} · dependent` : drink.label, dependent(g) ? theme.bad : theme.text)}
      {(g.scandal || 0) > 0 && row('Rumours', `${Math.round(g.scandal || 0)}`, (g.scandal || 0) > 30 ? theme.bad : theme.text)}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button onClick={onRoom} style={{ flex: 1, border: `1px solid ${theme.line}`, background: theme.panel, color: theme.text, borderRadius: 10, padding: 11, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Your room ›</button>
        <button onClick={onClose} style={{ flex: 1, border: 'none', background: `linear-gradient(135deg,${theme.accent2},${theme.accent})`, color: '#fff', borderRadius: 10, padding: 11, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Close</button>
      </div>
    </div>
  </div>);
}
