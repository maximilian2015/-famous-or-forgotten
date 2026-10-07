import { dispatch } from '../../state/store.js';
import { liveBubbles, canBack as canBackShow, backTheCampaign, BACK_COST } from '../../systems/career/bubble.js';
import { theme } from '../theme.js';
import { Card } from './Card.jsx';


// A season nobody has decided about. Maxi: "they do not decide straight away, and the
// player should hear it from the news first — and with fifteen million watching, the fans
// should be insisting. Petitions?" The one move an actor has is to say something, and it
// is worth most when there is already something to say it about. See career/bubble.js.
export function BubbleCard({ g }) {
  const list = liveBubbles(g);
  if (!list.length) return null;
  return (<Card style={{ marginBottom: 14, borderColor: 'rgba(255,209,102,.3)' }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.gold, marginBottom: 4 }}>Nobody has decided</div>
    {list.map((b, i) => {
      const fit = canBackShow(g, b);
      return (<div key={b.id} style={{ padding: '6px 0', borderTop: i ? `1px solid ${theme.line}` : 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800 }}>"{b.root}" · season {(b.season || 1) + 1}</div>
          <div style={{ fontSize: 10.5, color: theme.muted, flex: 'none' }}>{b.monthsLeft <= 1 ? 'any week now' : `~${b.monthsLeft} mo`}</div>
        </div>
        <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.45, marginTop: 2 }}>{b.line}</div>
        <div style={{ fontSize: 11, color: b.odds >= 70 ? theme.good : b.odds >= 45 ? theme.gold : theme.bad, marginTop: 3, fontWeight: 700 }}>{b.mood}</div>
        {/* The honest line. A campaign barely touches the network above; what it moves is
            this one, and this one is what has ever saved a show. See career/bubble.js. */}
        <div style={{ fontSize: 11, color: (b.shopped || 0) >= 30 ? theme.gold : theme.muted, marginTop: 2, lineHeight: 1.45 }}>{b.elsewhere}</div>
        {b.backed
          ? <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 4 }}>You said your piece. Saying it twice is a different story.</div>
          : <button onClick={() => dispatch(backTheCampaign, b.id)} disabled={!fit.ok}
              style={{ marginTop: 5, border: 'none', borderRadius: 9, padding: '6px 11px', fontSize: 11.5, fontWeight: 800,
                cursor: fit.ok ? 'pointer' : 'default', background: fit.ok ? 'rgba(255,209,102,.18)' : 'rgba(120,110,150,.15)', color: fit.ok ? theme.gold : '#6b6390' }}>
              Say something about it · {BACK_COST} energy
            </button>}
      </div>);
    })}
    <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 5, lineHeight: 1.45 }}>
      A network has never once changed its mind because an actor posted. What the noise does is
      tell every other buyer that the audience is already assembled and currently free — which
      is how a cancelled show ends up somewhere else, with fewer episodes and less money.
    </div>
  </Card>);
}
