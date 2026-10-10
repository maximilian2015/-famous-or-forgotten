import { dispatch } from '../../state/store.js';
import { canAfford, COST } from '../../engine/energy.js';
import { openStoryRoom, trendNote, pushTake, takeTags } from '../../systems/career/story.js';
import { SetVignette, ScriptPage, ChoiceCard } from './OnSet.jsx';

import { hotGenre } from '../../systems/meta/news.js';
import { theme } from '../theme.js';
import { FONT } from '../chrome.js';

const MARKS = { straight: 'page', bigger: 'burst', about: 'deeper', strange: 'strange' };

// Day one, and somebody says what they think the film is. You do not choose the plot —
// an actor never does — you argue for a version of it, and whether anybody listens is what
// your standing has been FOR all along. See systems/career/story.js.
export function StoryRoom({ g, p }) {
  if (!p || p.take) return null;
  const room = openStoryRoom(g, p);
  const hot = hotGenre(g);
  const TONES = { straight: theme.muted, bigger: theme.gold, about: theme.accent, strange: theme.good };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,5,20,.97)', zIndex: 60, overflowY: 'auto',
      padding: 16, color: theme.text, fontFamily: FONT }}>
      <div style={{ maxWidth: 400, margin: '0 auto' }}>
        {/* The first day, drawn the way a shooting day is (ui/components/OnSet.jsx): the board,
            the version of the film on a page, and the words under each argument read off its own
            numbers (career/story.js takeTags). */}
        <SetVignette title={p.title} genre={p.genre} scene="First day" director={room.director} />
        <ScriptPage kicker={`First day · ${p.genre}`} title={p.title} line={room.premise}>
          <div><b style={{ color: '#302d26' }}>{room.director}</b> is directing · trust on this set {Math.round(((p.crew || [])[0] || {}).bond || 40)}</div>
          <div style={{ color: p.genre === hot ? '#8b432f' : undefined }}>{trendNote(g, p)}</div>
        </ScriptPage>
        <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>What do you say it is?</div>
        {room.takes.map((t) => {
          const free = t.id === 'straight';
          // A button that would do nothing says why, on the button (CLAUDE.md). It used to fade.
          const off = !free && !canAfford(g, COST.argue);
          return (<ChoiceCard key={t.id} mark={MARKS[t.id]} tone={TONES[t.id]} label={t.label} blurb={t.blurb} tags={takeTags(t, p.genre)}
            right={free ? 'no argument' : `${t.odds}% they listen`}
            rightColor={free ? theme.muted : t.odds >= 60 ? theme.good : t.odds >= 32 ? theme.gold : theme.bad}
            locked={off} why={`Arguing for it takes ${COST.argue} energy, and you do not have it this month.`}
            onClick={() => dispatch(pushTake, t.id)} />);
        })}
        {/* What an argument costs and buys, off pushTake: energy either way; won, the director
            warms to you; lost, they cool a little. */}
        <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.5, margin: '2px 0 8px' }}>
          Arguing costs {COST.argue} energy, win or lose. Win and {String(room.director).split(' ')[0]} warms to you; lose and they cool a little.
        </div>
        <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', lineHeight: 1.5, marginTop: 4 }}>
          They listen to standing, not volume. Standing {Math.round(g.respect || 0)} · fame {Math.round(g.fame || 0)}
        </div>
      </div>
    </div>);
}
