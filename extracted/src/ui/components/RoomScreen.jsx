import { useState } from 'react';
import { dispatch } from '../../state/store.js';
import { canAfford, COST } from '../../engine/energy.js';
import { onCooldown } from '../../engine/cooldown.js';
import { HOUSING } from '../../engine/economy.js';
import { canThrowParty, PARTY_ORDER, PARTIES, partyRisk, throwParty } from '../../systems/life/party.js';
import { lookOf, wearOutfit, OUTFITS } from '../../systems/life/appearance.js';
import { PILLS } from '../../systems/life/health.js';
import { theme } from '../theme.js';
import { Card } from './Card.jsx';
import { Button } from './Button.jsx';
import { Avatar, Garment } from './Avatar.jsx';

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
    {g.production && <div style={{ fontSize: 11.5, color: theme.bad, background: 'rgba(255,106,138,.10)', border: '1px solid rgba(255,106,138,.35)', borderRadius: 10, padding: '8px 11px', marginBottom: 10, lineHeight: 1.5 }}>
      You are shooting {g.production.title}. A party tonight is a call you are late for tomorrow — the set loses a few points and {g.production.crew[0].name} notices. More if you drink.
    </div>}
    {PARTY_ORDER.map((key) => { const p = PARTIES[key]; const risk = partyRisk(g, key);
      const broke = (g.cash || 0) < p.cost; const noEnergy = !canAfford(g, key === 'drinks' ? COST.party : key === 'proper' ? COST.partyBig : COST.partyHuge);
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
        <Button kind="pri" disabled={broke || noEnergy || onCooldown(g, 'party')} onClick={() => { dispatch(throwParty, key); setOpen(false); }}>
          {broke ? 'You cannot afford it' : noEnergy ? 'No energy left' : 'Open the door'}
        </Button>
      </Card>); })}
    <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', padding: '2px 8px 0', lineHeight: 1.55 }}>
      Thick walls swallow noise. A rented room does not, and the landlord lives downstairs.
    </div>
    <Button onClick={() => setOpen(false)}>Not tonight</Button>
  </div>);
}
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
// Where the player actually lives, with the figure standing in it and everything they
// own on the shelf. The wardrobe, the medicine, the rent, the parties — one place.
export function RoomScreen({ g, onBack }) {
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
