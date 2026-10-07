import { dispatch } from '../../state/store.js';
import { canAfford, COST } from '../../engine/energy.js';
import { openStoryRoom, trendNote, pushTake } from '../../systems/career/story.js';
import { hotGenre } from '../../systems/meta/news.js';
import { theme } from '../theme.js';
import { FONT } from '../chrome.js';

// Day one, and somebody says what they think the film is. You do not choose the plot —
// an actor never does — you argue for a version of it, and whether anybody listens is what
// your standing has been FOR all along. See systems/career/story.js.
export function StoryRoom({ g, p }) {
  if (!p || p.take) return null;
  const room = openStoryRoom(g, p);
  const hot = hotGenre(g);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,5,20,.97)', zIndex: 60, overflowY: 'auto',
      padding: 16, color: theme.text, fontFamily: FONT }}>
      <div style={{ maxWidth: 400, margin: '0 auto' }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.18em', textTransform: 'uppercase',
          color: theme.accent, marginBottom: 10, textAlign: 'center' }}>First day</div>
        <div style={{ fontSize: 18, fontWeight: 900 }}>{p.title}</div>
        <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>{p.genre} · {room.director} is directing</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, margin: '12px 0 4px', fontStyle: 'italic', color: '#e6dfff' }}>
          {room.premise}
        </div>
        <div style={{ fontSize: 11.5, color: p.genre === hot ? theme.gold : theme.muted, margin: '8px 0 14px', lineHeight: 1.5 }}>
          {trendNote(g, p)}
        </div>
        {room.takes.map((t) => {
          const free = t.id === 'straight';
          const off = !free && !canAfford(g, COST.argue);
          return (<button key={t.id} onClick={() => dispatch(pushTake, t.id)} disabled={off}
            style={{ width: '100%', textAlign: 'left', marginBottom: 9, background: theme.panel,
              border: `1px solid ${theme.line}`, borderRadius: 12, padding: '11px 13px',
              cursor: off ? 'default' : 'pointer', opacity: off ? 0.45 : 1, color: theme.text }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800 }}>{t.label}</span>
              <span style={{ fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap',
                color: free ? theme.muted : t.odds >= 60 ? theme.good : t.odds >= 32 ? theme.gold : theme.bad }}>
                {free ? 'no argument' : `${t.odds}% they listen`}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 4, lineHeight: 1.5 }}>{t.blurb}</div>
            {!free && <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 5 }}>{COST.argue} energy, win or lose</div>}
          </button>);
        })}
        <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', lineHeight: 1.5, marginTop: 4 }}>
          They listen to standing, not volume. Standing {Math.round(g.respect || 0)} · fame {Math.round(g.fame || 0)}
          {' · '}{room.director} at {Math.round(((p.crew || [])[0] || {}).bond || 40)}
        </div>
      </div>
    </div>);
}
