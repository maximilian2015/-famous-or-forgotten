import { theme } from '../theme.js';
import { FONT, FONT_DISPLAY } from '../chrome.js';
import { Avatar } from './Avatar.jsx';
import { lookOf, companionOf } from '../../systems/life/appearance.js';
import { fameTier, isForgotten } from '../../systems/meta/status.js';
import { yourRank } from '../../systems/world/world.js';
import { HOUSING } from '../../engine/economy.js';
import { THINGS, HOME_PRICE, owns } from '../../systems/life/money.js';
import { apparentAge, height, weightKg } from '../../systems/life/face.js';
import { band as drinkBand, dependent } from '../../systems/life/drink.js';
import { strainBand } from '../../systems/life/strain.js';

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
      {head('Money')}
      {row('In the bank', money(g.cash || 0), (g.cash || 0) < 0 ? theme.bad : theme.text)}
      {row('Worth, all in', money(worth))}
      {row('Earned in your life', money(earned))}
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
