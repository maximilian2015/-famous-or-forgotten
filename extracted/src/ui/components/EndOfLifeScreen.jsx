import { newLife } from '../../state/store.js';
import { computeLegacy, getHall, heirsOf, heirOpts, enshrine } from '../../systems/meta/legacy.js';
import { isMinor } from '../../systems/meta/legacy.js';
import { theme } from '../theme.js';
import { FONT } from '../chrome.js';
import { Card } from './Card.jsx';
import { Button } from './Button.jsx';

export function EndOfLifeScreen({ g }) {
  const L = computeLegacy(g);
  const hall = getHall();
  const rank = hall.findIndex((h) => h.name === g.name && h.points === L.points) + 1;
  const credits = [...(g.filmography || []), ...(g.discography || [])].filter((c) => !isMinor(c));
  const best = [...credits].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
  const spouse = (g.family || []).find((p) => p.relation === 'Spouse');
  const kids = (g.family || []).filter((p) => p.relation === 'Child').length;
  const row = (k, v) => (<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '5px 0', borderBottom: `1px solid ${theme.line}` }}>
    <span style={{ color: theme.muted }}>{k}</span><span style={{ fontWeight: 700 }}>{v}</span></div>);
  return (<div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: 'transparent', color: theme.text, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: FONT }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', color: theme.muted, textAlign: 'center', marginBottom: 10 }}>A life, ended</div>
    <div style={{ fontSize: 26, fontWeight: 900, textAlign: 'center' }}>{g.name}</div>
    <div style={{ fontSize: 13, color: theme.muted, textAlign: 'center', marginTop: 4 }}>
      {g.year - (g.deathAge || g.ageY)} — {g.deathYear || g.year} · died at {g.deathAge || g.ageY}, {g.deathCause || 'quietly'}
    </div>
    <Card style={{ margin: '18px 0 14px', background: `linear-gradient(135deg, rgba(255,209,102,.16), rgba(158,116,255,.06))`, borderColor: 'rgba(255,209,102,.35)' }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: theme.gold, textAlign: 'center' }}>{L.tier}</div>
      <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', marginTop: 3 }}>{L.points} legacy points{rank > 0 ? ` · #${rank} in the Hall of Fame` : ''}</div>
    </Card>
    <div style={{ marginBottom: 16 }}>
      {row('Peak fame', Math.round(L.peakFame))}
      {row('Credits', L.credits)}
      {row('Hits', L.hits)}
      {L.worldHits > 0 && row('🌍 World hits', L.worldHits)}
      {best && row('Best work', `${best.title} (${Math.round(best.rating)})`)}
      {row('Left behind', `€${Math.round(g.cash || 0).toLocaleString()}`)}
      {row('Family', spouse ? `${spouse.name}${kids ? ` · ${kids} child${kids > 1 ? 'ren' : ''}` : ''}` : kids ? `${kids} child${kids > 1 ? 'ren' : ''}` : 'None of their own')}
    </div>
    {L.ambition && <div style={{ fontSize: 13, lineHeight: 1.6, color: L.ambition.met ? theme.gold : theme.text, textAlign: 'center', marginBottom: 14, fontWeight: 700 }}>{L.ambition.text}</div>}
    <div style={{ fontSize: 13, lineHeight: 1.6, color: theme.muted, textAlign: 'center', marginBottom: 20 }}>
      {L.tier === 'Forgotten' ? 'The obituaries were short. Somewhere, a few people still remember what you were trying to do.'
        : L.tier === 'Legend' ? 'They will be teaching your work long after everyone who knew you is gone.'
        : `The name still means something to the people who were paying attention.`}
    </div>
    <Heirs g={g} />
    <Button kind="pri" onClick={() => newLife()}>Begin a new life</Button>
  </div>);
}

// The only thing an ending is actually worth: somebody who was there for all of it, and who
// starts with exactly what you left them. See systems/meta/legacy.js.
function Heirs({ g }) {
  const kids = heirsOf(g);
  if (!kids.length) return null;
  return (<div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase',
      color: theme.muted, textAlign: 'center', marginBottom: 9 }}>They are still here</div>
    {kids.map((k) => {
      const o = heirOpts(g, k.id); if (!o) return null;
      const h = o.heir;
      return (<button key={k.id} onClick={() => { enshrine(g); newLife(o); }}
        style={{ width: '100%', textAlign: 'left', marginBottom: 8, background: theme.panel,
          border: `1px solid ${theme.line}`, borderRadius: 12, padding: '11px 13px', cursor: 'pointer', color: theme.text }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 14, fontWeight: 900 }}>Play as {k.name.split(' ')[0]}</span>
          <span style={{ fontSize: 11.5, color: theme.muted }}>{k.age}{k.adopted ? ' · adopted' : ''}</span>
        </div>
        <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 4, lineHeight: 1.5 }}>
          {h.knewThem ? 'They knew you properly — the school runs as well as the premieres.'
            : h.close >= 25 ? 'They knew you the way everybody did: mostly from screens.'
            : 'They barely knew you. You were working, and then you were gone.'}
        </div>
        <div style={{ fontSize: 11.5, marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ color: theme.good }}>starts famous {h.fame}</span>
          {h.craft > 0 && <span style={{ color: theme.good }}>craft +{h.craft}</span>}
          {h.estate > 0 && <span style={{ color: theme.gold }}>€{h.estate.toLocaleString()} behind them</span>}
          <span style={{ color: theme.bad }}>standing {h.respect}</span>
        </div>
      </button>);
    })}
    <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', lineHeight: 1.5, margin: '2px 0 12px' }}>
      Every door opens. Nobody on the other side thinks they earned it.
    </div>
  </div>);
}
