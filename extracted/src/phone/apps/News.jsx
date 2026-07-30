import { theme } from '../../ui/theme.js';
import { dispatch } from '../../state/store.js';
import { hotGenre, hasHit, respondToPress } from '../../systems/meta/news.js';
export function News({ g }) {
  const genre = hotGenre(g);
  const best = [...(g.filmography || []), ...(g.discography || [])].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
  const acted = g._newsActed === (g.year * 12 + g.month);
  const item = (title, body, chip, chipCol) => (<div style={{ background: theme.panel, borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><div style={{ fontSize: 13.5, fontWeight: 800 }}>{title}</div>{chip && <div style={{ fontSize: 10.5, fontWeight: 900, color: chipCol || theme.gold }}>{chip}</div>}</div><div style={{ fontSize: 11.5, color: theme.muted, marginTop: 4, lineHeight: 1.5 }}>{body}</div></div>);
  return (<div>
    {item(`📈 ${genre} is what everyone wants`, `Studios are chasing ${genre.toLowerCase()} this month. Projects in a hot genre land harder — and the window closes fast.`, 'TREND', theme.gold)}
    {best && item(`Review: ${best.title}`, (best.rating >= 75 ? 'Critics call it the performance that changes the conversation about you.' : best.rating >= 50 ? 'Mixed notices — respectable, forgettable, depending on the paper.' : 'The reviews are unkind. The industry reads them too.'), `${Math.round(best.rating)}/100`)}
    {hasHit(g) && <div style={{ background: theme.panel, borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}><div style={{ fontSize: 13.5, fontWeight: 800 }}>🗞 They wrote about you</div><div style={{ fontSize: 11.5, color: theme.muted, margin: '4px 0 8px', lineHeight: 1.5 }}>{(g.scandal || 0) >= 25 ? 'A feature runs on you today, and it is not kind. It uses the word "difficult" four times.' : `A critic wrote a piece off the back of ${best ? best.title : 'your last one'}. The take is getting passed around.`}</div>{acted ? <span style={{ fontSize: 10.5, color: theme.muted }}>handled this month</span> : <div style={{ display: 'flex', gap: 7 }}><button onClick={() => dispatch(respondToPress, 'reply')} style={btn('pri')}>Respond</button><button onClick={() => dispatch(respondToPress, 'quiet')} style={btn()}>Stay silent</button></div>}</div>}
    {!hasHit(g) && item('Nobody is writing about you yet', 'Not an insult — a starting position. Credits first, coverage after.')}
  </div>);
}
const btn = (k) => ({ flex: 1, border: 'none', borderRadius: 10, padding: '9px 8px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: k === 'pri' ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : 'rgba(158,116,255,.16)', color: k === 'pri' ? '#fff' : '#d9cffa' });
