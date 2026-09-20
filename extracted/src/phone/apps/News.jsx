import { useEffect, useState } from 'react';
import { theme } from '../../ui/theme.js';
import { dispatch } from '../../state/store.js';
import { hotGenre } from '../../systems/meta/news.js';
import { answerPiece, markPressSeen, monthLabel } from '../../systems/meta/press.js';

// What they write about you, newest first. Maxi: "the News is stuck — it keeps writing the
// same thing about a film from two years ago." A piece is written when something happens
// (systems/meta/press.js): the outlet, the tone, the headline, and — on the ones that ask
// for it — a right of reply. Nothing here is permanent; a quiet year is a quiet page.
const TONE = {
  praise: { label: 'PRAISE', col: '#6fc98d', icon: '👍' },
  news: { label: 'THE TRADES', col: theme.accent, icon: '🗞' },
  gossip: { label: 'GOSSIP', col: theme.gold, icon: '💬' },
  pan: { label: 'PAN', col: theme.bad, icon: '👎' },
};
export function News({ g }) {
  const genre = hotGenre(g);
  const now = (g.year || 0) * 12 + (g.month || 0);
  useEffect(() => { dispatch(markPressSeen); }, [now]);
  const [tab, setTab] = useState('you');
  const all = g.press || [];
  const press = all.filter((p) => (tab === 'biz') === (p.kind === 'biz'));
  const bizNew = all.filter((p) => p.kind === 'biz' && p.at === now && !p.seen).length, youNew = all.filter((p) => p.kind !== 'biz' && p.at === now && !p.seen).length;
  const item = (title, body, chip, chipCol) => (<div style={{ background: theme.panel, borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><div style={{ fontSize: 13.5, fontWeight: 800 }}>{title}</div>{chip && <div style={{ fontSize: 10.5, fontWeight: 900, color: chipCol || theme.gold }}>{chip}</div>}</div><div style={{ fontSize: 11.5, color: theme.muted, marginTop: 4, lineHeight: 1.5 }}>{body}</div></div>);
  let lastMonth = null;
  return (<div>
    {item(`📈 ${genre} is what everyone wants`, `Studios are chasing ${genre.toLowerCase()} this month. Projects in a hot genre land harder — and the window closes fast.`, 'TREND', theme.gold)}
    {/* Two papers: the ones about you, and the ones about everybody else. Maxi: "and about your rivals — how are they doing?" */}
    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>{[['you', 'About you', youNew], ['biz', 'The business', bizNew]].map(([id, label, n]) => (<button key={id} onClick={() => setTab(id)} style={{ flex: 1, border: 'none', borderRadius: 10, padding: '8px 4px', fontSize: 12, fontWeight: 800, cursor: 'pointer', background: tab === id ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : 'rgba(158,116,255,.16)', color: tab === id ? '#fff' : '#d9cffa' }}>{label}{n ? ` · ${n}` : ''}</button>))}</div>
    {!press.length && tab === 'you' && item('Nobody is writing about you', (g.filmography || []).length ? 'Not this month. A picture opening, a season ending, a night out — that is what gets a piece written.' : 'Not an insult — a starting position. Credits first, coverage after.')}
    {!press.length && tab === 'biz' && item('A quiet month in the trades', 'Somebody near you on the list will do something soon. They always do.')}
    {press.map((p) => {
      const t = TONE[p.tone] || TONE.news;
      const head = p.at !== lastMonth ? (lastMonth = p.at, <div key={'m' + p.at} style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, margin: '10px 2px 6px' }}>{p.at === now ? 'This month' : p.at === now - 1 ? 'Last month' : monthLabel(p.at)}</div>) : null;
      const answered = (g.press || []).some((x) => x.acted && x.at === now && x.id !== p.id);
      return (<div key={p.id}>
        {head}
        <div style={{ background: theme.panel, border: `1px solid ${p.at === now && !p.seen ? t.col + '55' : theme.line}`, borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: theme.muted, letterSpacing: '.04em' }}>{p.outlet}</div>
            <div style={{ fontSize: 10, fontWeight: 900, color: t.col, letterSpacing: '.08em', whiteSpace: 'nowrap' }}>{t.icon} {t.label}</div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4, lineHeight: 1.3 }}>{p.head}</div>
          <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 5, lineHeight: 1.5 }}>{p.body}</div>
          {p.react && (p.acted
            ? <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 7 }}>{p.acted === 'reply' ? 'You answered it.' : 'You let it burn out.'}</div>
            : p.at === now && !answered
              ? <div style={{ display: 'flex', gap: 7, marginTop: 8 }}><button onClick={() => dispatch(answerPiece, p.id, 'reply')} style={btn('pri')}>Respond</button><button onClick={() => dispatch(answerPiece, p.id, 'quiet')} style={btn()}>Stay silent</button></div>
              : p.at === now ? <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 7 }}>Once a month is enough. Twice is a story.</div> : null)}
        </div>
      </div>);
    })}
  </div>);
}
const btn = (k) => ({ flex: 1, border: 'none', borderRadius: 10, padding: '9px 8px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: k === 'pri' ? `linear-gradient(135deg,${theme.accent2},${theme.accent})` : 'rgba(158,116,255,.16)', color: k === 'pri' ? '#fff' : '#d9cffa' });
