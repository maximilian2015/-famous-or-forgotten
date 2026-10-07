import { count } from '../../engine/text.js';
import { fameTier, fameCeiling, alistKey, iconKey, scandalReport, isForgotten, FORGOTTEN, FAME_TIERS,
  TIER_OPENS, FORGOTTEN_OPENS, forgottenDepth } from '../../systems/meta/status.js';
import { hypeSource, SOURCES, hypeLine, hypeReach, hypeDemand, hypePrice, showsThisYear } from '../../systems/meta/hype.js';
import { theme } from '../theme.js';
import { FONT, FONT_DISPLAY } from '../chrome.js';
import { Card } from './Card.jsx';
import { ComboCard, Ladder } from './Ladder.jsx';

// The whole ladder, laid out, because "15 to Rising Star" told you the next rung and
// nothing about the shape of the climb — and the two doors above Star are not a number of
// points away at all, so counting down to them was a lie. Every line under a rung is a real
// gate somewhere in the game; see TIER_OPENS in systems/meta/status.js.
export function FameScreen({ g, onBack }) {
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
        <Meter label={hypeSource(g) ? `Hype · from ${SOURCES[hypeSource(g)].label}` : 'Hype'} value={media} col={hypeSource(g) === 'scandal' ? '#ff8d9e' : media >= 30 ? '#4fc07f' : theme.muted} />
      </div>
      {/* Hype is access, demand and price — the rooms, the phone, the fee — and it comes from
          somewhere. The tabloid kind buys none of those; it sells the brand shelf. meta/hype.js */}
      <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.55, marginTop: 9 }}>{hypeLine(g)}</div>
      {media >= 12 && (<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {[hypeReach(g) >= 1 ? `reads as +${Math.round(hypeReach(g))} fame in the room` : null,
          hypeDemand(g) > 1 ? `the phone rings ${Math.round((hypeDemand(g) - 1) * 100)}% more` : null,
          hypePrice(g) > 1 ? `asks ${Math.round((hypePrice(g) - 1) * 100)}% more` : null,
          hypeSource(g) === 'scandal' ? 'the brands are calling; the serious rooms are not' : null,
          showsThisYear(g) ? `${showsThisYear(g)} sofa${showsThisYear(g) > 1 ? 's' : ''} this year — each one worth less` : null,
        ].filter(Boolean).map((t) => <span key={t} style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(255,255,255,.07)', color: theme.text }}>{t}</span>)}
      </div>)}
      <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.5, marginTop: 8 }}>It fades by a tenth a month. A hit, the season or a night that went everywhere replaces it; a show tops it up a little, less each time. A month out of sight (under What now) puts it down on purpose.</div>
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

function Meter({ label, value, col }) {
  return (<div style={{ flex: 1 }}>
    <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: theme.muted }}>{label}</div>
    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: col }}>{value}</div>
    <div style={{ height: 5, background: 'rgba(255,255,255,.07)', borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
      <div style={{ width: Math.max(0, Math.min(100, value)) + '%', height: '100%', background: col, borderRadius: 3 }} />
    </div>
  </div>);
}
