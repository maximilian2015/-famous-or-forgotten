import { activeLabels, boxedInto, tendency, isUniversal, isStrong, labelInfo } from '../../systems/meta/typecast.js';
import { GENRES } from '../../systems/meta/news.js';
import { genreXP, genreBonus, genreLabel } from '../../systems/career/genres.js';
import { theme } from '../theme.js';
import { FONT } from '../chrome.js';

// Acting isn't one number — it's the lanes you've actually worked in. Genre experience
// comes only from finished credits and pays back as a rating bonus in that genre.
export function GenreScreen({ g, onBack }) {
  const key = g.dream === 'singer' ? 'Singing' : 'Acting';
  return (<div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: 'transparent', color: theme.text, padding: 16, fontFamily: FONT }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <button onClick={onBack} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: '#d8cff0', borderRadius: 9, padding: '6px 11px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>‹ Back</button>
      <div style={{ fontSize: 16, fontWeight: 900 }}>{key} · genres</div>
    </div>
    <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.6, marginBottom: 14 }}>
      Every finished credit teaches its genre. Experience in a lane adds up to <span style={{ color: theme.gold, fontWeight: 700 }}>+10</span> to ratings when you work in it again — mastery of a lane is half a hit.
    </div>
    {/* The box, where it belongs. Maxi: "I think the typecast should be in Acting, it all
        belongs there." It does — a label is a statement about genre, and it was a word on
        the front of the life with nothing behind it. See systems/meta/typecast.js. */}
    {(() => {
      const labels = activeLabels(g);
      const box = boxedInto(g);
      const t = tendency(g);
      const uni = isUniversal(g);
      if (!labels.length && !t && !uni) return null;
      return (<div style={{ background: 'rgba(255,209,102,.07)', border: `1px solid ${labels.length ? 'rgba(255,209,102,.34)' : theme.line}`, borderRadius: 12, padding: '11px 13px', marginBottom: 14 }}>
        <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: labels.length ? theme.gold : theme.muted, marginBottom: 5 }}>
          {labels.length ? 'What they call you' : uni ? 'No word for you' : 'What they are starting to think'}
        </div>
        {labels.map((id) => (<div key={id} style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: isStrong(g, id) ? theme.gold : theme.text }}>{labelInfo(id).label}</div>
          <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.45 }}>{labelInfo(id).blurb}</div>
        </div>))}
        {!labels.length && uni && <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5 }}>
          You have played enough different things that nobody has settled on a word for you. That is
          a standing of its own, and it is the one every character actor wants.
        </div>}
        {!labels.length && !uni && t && <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5 }}>
          {t.line}. {t.need - t.score <= 1 ? 'One more like the last one and it sticks.' : 'Keep taking them and it sticks.'}
        </div>}
        {box && (<div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${theme.line}` }}>
          <div style={{ fontSize: 11.5, color: theme.text, lineHeight: 1.5 }}>
            Most of what the board sends you now is <b>{box.toLowerCase()}</b>, and anything far from it
            is marked <i>against type</i> and comes half as often.
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5, marginTop: 5 }}>
            Two ways out, and they are the two the business actually uses. A first feature or one of
            the five names — nothing they send is filtered by this. Or turn down the {box.toLowerCase()}{' '}
            that keeps arriving: every refusal on type wears the word down, and four of them take it off.
          </div>
        </div>)}
      </div>);
    })()}
    {GENRES.map((gr) => {
      const xp = genreXP(g, gr); const bonus = genreBonus(g, gr);
      return (<div key={gr} style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '10px 13px', marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>{gr}</div>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: bonus > 0 ? theme.gold : theme.muted }}>{bonus > 0 ? `+${bonus} to ratings` : '—'}</div>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 3, margin: '7px 0 5px' }}>
          <div style={{ width: Math.min(100, xp * 5) + '%', height: '100%', background: theme.accent, borderRadius: 3 }} />
        </div>
        <div style={{ fontSize: 11, color: theme.muted }}>{genreLabel(xp)}</div>
      </div>);
    })}
  </div>);
}
