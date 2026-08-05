import { theme } from '../../ui/theme.js';
import { dispatch } from '../../state/store.js';
import { onCooldown } from '../../engine/cooldown.js';
import { findClassmates, pokeFriend, spotlightFeed } from '../../systems/social/spotlight.js';

export function Spotlight({ g }) {
  const feed = spotlightFeed(g);
  const friends = (g.spotlight || []).filter((f) => !f.grownUp);
  // Scrolling a feed costs no energy — the limit is the other person's patience.
  const btn = (off) => ({ width: '100%', border: 'none', borderRadius: 9, padding: '7px', fontSize: 12, fontWeight: 800,
    cursor: off ? 'default' : 'pointer', background: off ? 'rgba(120,110,150,.15)' : 'rgba(158,116,255,.18)', color: off ? '#6b6390' : '#d9cffa' });
  const usedFind = onCooldown(g, 'find');
  return (
    <div>
      <div style={{ background: theme.panel2, borderRadius: 12, padding: '10px 12px', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>@you · your profile</div>
        <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>{friends.length} connections · keep them close — some go far</div>
      </div>
      <button onClick={() => dispatch(findClassmates, 1)} disabled={usedFind}
        style={{ width: '100%', border: 'none', borderRadius: 10, padding: '9px', fontSize: 12.5, fontWeight: 800, cursor: usedFind ? 'default' : 'pointer', background: usedFind ? 'rgba(120,110,150,.15)' : `linear-gradient(135deg,${theme.accent2},${theme.accent})`, color: usedFind ? '#6b6390' : '#fff', marginBottom: usedFind ? 6 : 12 }}>
        + Find people from school
      </button>
      {usedFind && <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', marginBottom: 12 }}>You've reached out to someone new this month.</div>}
      {!feed.length && <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: 20 }}>No one in your feed yet. Find classmates to connect.</div>}
      {feed.map((p) => (
        <div key={p.id} style={{ background: theme.panel, borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{p.name}</div>
            <div style={{ fontSize: 10.5, color: theme.muted }}>{p.handle}</div>
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 8px' }}>{p.name.split(' ')[0]} {p.post} · closeness {p.closeness}</div>
          <button onClick={() => dispatch(pokeFriend, p.id)} disabled={onCooldown(g, 'poke:' + p.id)} style={btn(onCooldown(g, 'poke:' + p.id))}>
            {onCooldown(g, 'poke:' + p.id) ? 'Talked this month' : 'Message / hang out'}
          </button>
        </div>
      ))}
    </div>
  );
}
