import { useState } from 'react';
import { theme } from '../../ui/theme.js';
import { useAccent } from '../../ui/appTheme.js';
import { dispatch } from '../../state/store.js';
import { PILLS, buyPills, usePills, priceOf } from '../../systems/life/health.js';
import { BOTTLES, BOTTLE_ORDER, buyBottle, drinkThrough, band, level, dependent, drankThisMonth, DRINK_AGE } from '../../systems/life/drink.js';
import { OUTFITS, OUTFIT_ORDER, HAIRSTYLES, hairChoices, HAIR_COLORS, buyHair, setHairColour, wearOutfit, ownsOutfit, lookOf, DRESS_UP_AGE } from '../../systems/life/appearance.js';
import { Avatar, Garment } from '../../ui/components/Avatar.jsx';

// Everything you BUY lives here. What you already own lives in your room.
// (Clothes and the salon used to sit on the Style screen next to rent and groceries,
// which is how a wardrobe ended up filed under food.)
export function Shopping({ g }) {
  const [tab, setTab] = useState('pharmacy');
  const accent = useAccent();
  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setTab(id)} style={{ flex: 1, border: `1px solid ${tab === id ? accent : 'transparent'}`, borderRadius: 10, padding: '8px 4px',
      fontSize: 12, fontWeight: 800, cursor: 'pointer', background: tab === id ? `${accent}2e` : `${accent}12`, color: tab === id ? '#fff' : '#cfc6ee' }}>{label}</button>);
  return (<div>
    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
      {tabBtn('pharmacy', 'Pharmacy')}{(g.ageY || 0) >= DRINK_AGE && tabBtn('drink', 'Off-licence')}{tabBtn('clothes', 'Clothes')}{tabBtn('salon', 'Salon')}
    </div>
    {tab === 'pharmacy' && <Pharmacy g={g} accent={accent} />}
    {tab === 'drink' && <OffLicence g={g} accent={accent} />}
    {tab === 'clothes' && <Clothes g={g} accent={accent} />}
    {tab === 'salon' && <Salon g={g} accent={accent} />}
  </div>);
}

function btnStyle(accent, kind, off) {
  return { flex: 1, border: 'none', borderRadius: 10, padding: '8px', fontSize: 12, fontWeight: 800,
    cursor: off ? 'default' : 'pointer',
    background: off ? 'rgba(120,110,150,.15)' : kind === 'pri' ? `linear-gradient(135deg,${accent},${accent}bb)` : `${accent}26`,
    color: off ? '#6b6390' : kind === 'pri' ? '#fff' : '#eae3ff' };
}
const card = { background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '10px 12px', marginBottom: 8 };

function Pharmacy({ g, accent }) {
  const meds = g.meds || {};
  return (<div>
    <div style={{ fontSize: 11.5, color: theme.muted, marginBottom: 10, lineHeight: 1.5 }}>
      Buy them now, take them when you need them. Painkillers and antibiotics only do something while you are actually ill.
    </div>
    {Object.entries(PILLS).map(([key, p]) => { const have = meds[key] || 0;
      const cost = priceOf(g, key); const broke = (g.cash || 0) < cost;
      // Half these buttons looked broken because pressing them while healthy did nothing
      // and said nothing. Now the button tells you why it will not respond.
      const needsIllness = key === 'painkillers' || key === 'antibiotics';
      const useless = needsIllness && !g.illness;
      const label = have <= 0 ? 'None left' : useless ? 'Only when ill' : 'Take one';
      return (<div key={key} style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>{p.label}{have > 0 ? <span style={{ color: theme.good, fontWeight: 700 }}> · you own {have}</span> : ''}</div>
          <div style={{ fontSize: 12.5, fontWeight: 900, color: theme.gold }}>€{cost.toLocaleString()}</div>
        </div>
        <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 8px' }}>{p.blurb}
          {p.scales && cost > p.cost ? <span style={{ color: theme.bad }}> They quote you off what you have.</span> : ''}</div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button onClick={() => dispatch(buyPills, key, 1)} disabled={broke} style={btnStyle(accent, 'pri', broke)}>{broke ? 'Too expensive' : 'Buy'}</button>
          <button onClick={() => dispatch(usePills, key)} disabled={have <= 0 || useless} style={btnStyle(accent, '', have <= 0 || useless)}>{label}</button>
        </div>
      </div>); })}
  </div>);
}

// Sold two tabs from the antidepressants, and it never says a word about what it is for.
// The whole design of the depression is in the price gap: €2400 a month and six weeks
// before it does anything, or €35 and it works tonight.
function OffLicence({ g, accent }) {
  const stock = g.bottles || {};
  const lv = level(g), b = band(g), had = drankThisMonth(g);
  const none = BOTTLE_ORDER.every((k) => !(stock[k] > 0));
  return (<div>
    <div style={{ fontSize: 11.5, color: theme.muted, marginBottom: 10, lineHeight: 1.5 }}>
      Delivered to the door. What you buy sits in the cupboard until you open it — and you open the good one first.
    </div>
    {lv > 0 && (
      <div style={{ ...card, borderColor: lv >= 45 ? theme.bad : theme.line }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: lv >= 45 ? theme.bad : theme.text }}>{b.label}</div>
          <div style={{ fontSize: 11.5, color: theme.muted }}>{g.drink?.months || 0} months</div>
        </div>
        <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, lineHeight: 1.5 }}>{b.note}</div>
      </div>)}
    {BOTTLE_ORDER.map((key) => { const o = BOTTLES[key]; const have = stock[key] || 0; const broke = (g.cash || 0) < o.cost;
      return (<div key={key} style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>{o.label}{have > 0 ? <span style={{ color: theme.good, fontWeight: 700 }}> · {have} in the house</span> : ''}</div>
          <div style={{ fontSize: 12.5, fontWeight: 900, color: theme.gold }}>€{o.cost.toLocaleString()}</div>
        </div>
        <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 8px' }}>{o.blurb}</div>
        <button onClick={() => dispatch(buyBottle, key, 1)} disabled={broke} style={{ ...btnStyle(accent, 'pri', broke), width: '100%' }}>
          {broke ? 'Too expensive' : 'Buy one'}
        </button>
      </div>); })}
    <button onClick={() => dispatch(drinkThrough)} disabled={none || had}
      style={{ ...btnStyle(accent, '', none || had), width: '100%', padding: '11px', marginTop: 4 }}>
      {had ? 'You have already had tonight' : none ? 'Nothing in the house' : dependent(g) ? 'Open one — you have to now' : 'Open one'}
    </button>
    {g.depression && !had && !none && (
      <div style={{ fontSize: 11, color: theme.muted, marginTop: 7, lineHeight: 1.5, textAlign: 'center' }}>
        It will give you the month back. It will also cost you the checkpoint.
      </div>)}
  </div>);
}

function Clothes({ g, accent }) {
  const young = (g.ageY || 0) < DRESS_UP_AGE;
  if (young) return <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.6, padding: '8px 2px' }}>You are {g.ageY}. Your parents buy your clothes, and they do not consult you.</div>;
  const worn = lookOf(g);
  return (<div>
    <div style={{ fontSize: 11.5, color: theme.muted, marginBottom: 10, lineHeight: 1.5 }}>What you buy is yours for good. Changing into something you already own is free, and you do that in your room.</div>
    {OUTFIT_ORDER.map((key) => { const o = OUTFITS[key]; const owned = ownsOutfit(g, key); const broke = (g.cash || 0) < o.cost;
      return (<div key={key} style={{ ...card, display: 'flex', gap: 12, alignItems: 'center' }}>
        <Garment id={key} skin={worn.skin} size={56} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>{o.label}</div>
            <div style={{ fontSize: 12.5, fontWeight: 900, color: owned ? theme.good : theme.gold }}>{owned ? 'owned' : `€${o.cost.toLocaleString()}`}</div>
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 8px' }}>{o.blurb}</div>
          {!owned && <button onClick={() => dispatch(wearOutfit, key)} disabled={broke} style={{ ...btnStyle(accent, 'pri', broke), width: '100%' }}>{broke ? 'Too expensive' : 'Buy it'}</button>}
        </div>
      </div>); })}
  </div>);
}

function Salon({ g, accent }) {
  const young = (g.ageY || 0) < DRESS_UP_AGE;
  if (young) return <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.6, padding: '8px 2px' }}>Your mother cuts your hair over a newspaper. This opens at {DRESS_UP_AGE}.</div>;
  const worn = lookOf(g);
  return (<div>
    <div style={{ fontSize: 11.5, color: theme.muted, marginBottom: 10, lineHeight: 1.5 }}>Book a chair. Grey arrives on its own after fifty and no colour on this list will stop it.</div>
    {hairChoices(g.gender).map((key) => { const h = HAIRSTYLES[key]; const active = (g.look?.hair || 'cropped') === key; const broke = (g.cash || 0) < h.cost;
      return (<div key={key} style={{ ...card, display: 'flex', gap: 12, alignItems: 'center', border: `1px solid ${active ? accent : theme.line}` }}>
        <Avatar look={{ ...worn, hair: key }} size={54} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>{h.label}{active ? ' · now' : ''}</div>
            <div style={{ fontSize: 12.5, fontWeight: 900, color: theme.gold }}>€{h.cost}</div>
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 8px' }}>{h.blurb}</div>
          {!active && <button onClick={() => dispatch(buyHair, key)} disabled={broke} style={{ ...btnStyle(accent, 'pri', broke), width: '100%' }}>{broke ? 'Too expensive' : 'Sit in the chair'}</button>}
        </div>
      </div>); })}
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, margin: '14px 0 8px' }}>Colour · €60</div>
    <div style={{ ...card, display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
      {HAIR_COLORS.map((c) => (<div key={c} onClick={() => dispatch(setHairColour, c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
        border: g.look?.hairColor === c ? `2px solid ${theme.gold}` : '2px solid rgba(255,255,255,.14)' }} />))}
    </div>
  </div>);
}
