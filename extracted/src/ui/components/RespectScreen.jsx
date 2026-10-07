import { dispatch } from '../../state/store.js';
import { count } from '../../engine/text.js';
import { canSmooth, canOpenShelf, asksLeft, ASKS_A_YEAR, FAVOUR_ORDER, FAVOURS, canUse, openShelf, costOf } from '../../systems/career/favours.js';
import { addPrestigeListing } from '../../systems/career/castings.js';
import { respectTier, respectReport, RESPECT_TIERS, RESPECT_OPENS, RESPECT_MOVES } from '../../systems/meta/status.js';
import { relBand } from '../../systems/life/bonds.js';
import { theme } from '../theme.js';
import { FONT, FONT_DISPLAY } from '../chrome.js';
import { Card } from './Card.jsx';
import { ComboCard, Ladder } from './Ladder.jsx';

function Move({ m, col }) {
  return (<div style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: `1px solid ${theme.line}` }}>
    <span style={{ color: col, fontWeight: 900, fontSize: 13, width: 30, flexShrink: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{m.by}</span>
    <span style={{ fontSize: 12.2, lineHeight: 1.45 }}>{m.what}<span style={{ color: theme.muted }}> — {m.note}</span></span>
  </div>);
}
// Standing spends. Maxi: "respect as a currency." One number, and it goes down when you
// use it — every ask costs the asking, whether it works or not. See favours.js.
function UseYourName({ g }) {
  const where = { lead: 'on a supporting film listing in OpenCall', sequel: 'on a film in your Filmography the studio passed on', smooth: 'on the set, when the director has cooled', vouch: 'on a contact in People', shelf: 'here' };
  const now = { lead: (g.castingPool || []).some((c) => (c.shelf === 'film' || c.shelf === 'indie') && c.role !== 'Lead'), sequel: (g.filmography || []).some((c) => c.pushable && !c.pushed), smooth: canSmooth(g), vouch: (g.people || []).length > 0, shelf: canOpenShelf(g) };
  return (<Card style={{ marginBottom: 14, borderColor: theme.gold + '44' }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.gold, marginBottom: 4 }}>◆ Use your name</div>
    <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.55, marginBottom: 8 }}>
      Standing is not only a ladder. It spends — and every ask costs the asking, whether it works or not, because the business notices you had to. Three asks a year, and each one in the last two years makes the next dearer.{g.nameSpent ? ` Spent so far: ${g.nameSpent}.` : ''} {asksLeft(g)} of {ASKS_A_YEAR} left this year.
    </div>
    {FAVOUR_ORDER.map((id) => { const f = FAVOURS[id]; const fit = canUse(g, id); const open = fit.ok && now[id];
      return (<div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, padding: '6px 0', borderTop: `1px solid ${theme.line}`, opacity: open ? 1 : .55 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: open ? theme.text : theme.muted }}>{f.label}<span style={{ color: theme.muted, fontWeight: 600 }}> · from {f.min}</span></div>
          <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.4 }}>{!fit.ok ? fit.why : now[id] ? (id === 'shelf' ? 'Available now.' : `Available now — ${where[id]}.`) : `Nothing to spend it on right now. It lives ${where[id]}.`}</div>
        </div>
        {id === 'shelf' && open
          ? <button onClick={() => dispatch(openShelf, addPrestigeListing)} style={{ border: 'none', borderRadius: 9, padding: '6px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer', background: 'rgba(255,209,102,.18)', color: theme.gold, whiteSpace: 'nowrap' }}>−{costOf(g, id)} · open it</button>
          : <div style={{ fontSize: 12, fontWeight: 900, color: theme.gold, whiteSpace: 'nowrap' }}>−{costOf(g, id)}</div>}
      </div>); })}
  </Card>);
}
// Respect is moved by twelve things and read by six, and tapping it did nothing. The one
// worth knowing is that it is the biggest single term in whether a director shoots your
// version of the film — fame gets you into the room, standing is what makes them listen.
export function RespectScreen({ g, onBack }) {
  const r = Math.round(g.respect || 0);
  const rt = respectTier(r);
  const band = [rt.label, r >= 60 ? '#4fc07f' : r >= 40 ? theme.accent : r >= 30 ? theme.gold : r >= 12 ? theme.muted : '#ff5a72'];
  const lines = respectReport(g);
  const wins = ((g.awards && g.awards.wins) || []).length;
  const noms = ((g.awards && g.awards.nominations) || []).length;
  // Who could actually open a door for you. computeAccess wants weight 80 and closeness 60.
  const industry = [...(g.people || [])]
    .filter((p) => (p.industryWeight || 0) > 0)
    .sort((a, b) => (b.industryWeight || 0) - (a.industryWeight || 0))
    .slice(0, 5);
  const best = [...(g.filmography || []), ...(g.discography || [])]
    .filter((c) => !c.minor && c.score != null)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
  return (<div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', background: 'transparent', color: theme.text, padding: 16, paddingBottom: 40, fontFamily: FONT }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <button onClick={onBack} data-sfx="back" style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: theme.text, borderRadius: 9, padding: '6px 11px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>‹ Back</button>
      <div style={{ fontSize: 16, fontWeight: 900 }}>How the business sees you</div>
    </div>

    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 700 }}>{r}</div>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: band[1], textAlign: 'right' }}>{band[0]}</div>
      </div>
      <div style={{ height: 9, background: 'rgba(255,255,255,.08)', borderRadius: 5, margin: '9px 0 8px', overflow: 'hidden' }}>
        <div style={{ width: r + '%', height: '100%', background: `linear-gradient(90deg, ${band[1]}aa, ${band[1]})`, borderRadius: 5, transition: 'width .5s' }} />
      </div>
      <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.55 }}>
        Fame is how many people know the name. This is what the people who hire you think of it,
        and the two move for completely different reasons.
      </div>
      {(wins > 0 || noms > 0) && <div style={{ fontSize: 12, color: theme.gold, marginTop: 7, fontWeight: 700 }}>
        {wins > 0 ? `🏆 ${count(wins, 'Asker')}` : ''}{wins > 0 && noms > 0 ? ' · ' : ''}{noms > 0 ? `${count(noms, 'nomination')}` : ''}
        {' — worth '}{wins * 22 + Math.min(18, noms * 5)}{' on top of your fame in every casting office.'}
      </div>}
      {best && <div style={{ fontSize: 12, color: theme.muted, marginTop: 6 }}>
        Your best is <b style={{ color: theme.text }}>{best.title}</b> at {best.score}/10. That is the one people mean.
      </div>}
    </Card>

    <ComboCard g={g} />
    <UseYourName g={g} />
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>The whole climb</div>
    <Ladder tiers={RESPECT_TIERS} opens={RESPECT_OPENS} value={g.respect} />
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 4 }}>What it is worth</div>
    <Card style={{ marginBottom: 14, padding: '4px 14px' }}>
      {lines.map((l) => (
        <div key={l.id} style={{ padding: '9px 0', borderBottom: `1px solid ${theme.line}` }}>
          <div style={{ fontSize: 12.5, fontWeight: 800 }}>{l.label}</div>
          <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5, marginTop: 2 }}>{l.why}</div>
        </div>))}
    </Card>

    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>People who could open a door</div>
    {industry.length ? (<div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
      {industry.map((p) => { const opens = (p.industryWeight || 0) >= 80 && (p.relationship || 0) >= 60;
        return (<div key={p.id} style={{ background: theme.panel, border: `1px solid ${opens ? 'rgba(79,192,127,.35)' : theme.line}`, borderRadius: 12, padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>{p.name}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: opens ? '#7fd6a2' : theme.muted, flexShrink: 0 }}>
              {opens ? '★ opens doors' : `weight ${Math.round(p.industryWeight || 0)}`}
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>
            {p.role} · {relBand(p.relationship).label}
            {!opens && (p.industryWeight || 0) >= 80 ? ' — powerful enough, not close enough' : ''}
          </div>
        </div>); })}
    </div>) : <div style={{ fontSize: 12, color: theme.muted, textAlign: 'center', padding: '8px 10px 16px', lineHeight: 1.6 }}>
      Nobody in the business is in your phone yet. They come from parties and events, under Career.
    </div>}

    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>What moves it</div>
    <div style={{ display: 'grid', gap: 8 }}>
      <Card style={{ padding: '4px 14px' }}>{RESPECT_MOVES.up.map((m, i) => <Move key={i} m={m} col="#4fc07f" />)}</Card>
      <Card style={{ padding: '4px 14px' }}>{RESPECT_MOVES.down.map((m, i) => <Move key={i} m={m} col="#ff5a72" />)}</Card>
    </div>
    <div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', padding: '16px 10px', lineHeight: 1.6 }}>
      None of this can be bought. It is the only number in the game that money does not touch.
    </div>
  </div>);
}
