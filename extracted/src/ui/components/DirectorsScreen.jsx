import { useState } from 'react';
import { theme } from '../theme.js';
import { FONT, FONT_DISPLAY } from '../chrome.js';
import { FACTIONS } from '../../systems/meta/factions.js';
import { directorCounts, monthName, STATE_LABEL } from '../../systems/meta/yourDirectors.js';

// Behind the Directors bar on the Passport. The bar is one number and one sentence; this is the
// list of names it is made of — who is warm, who is cold, who holds a grudge and until when, and
// what each of them will and will not do for you. Nothing here is kept: meta/yourDirectors.js
// reads it off the phone, the grudges and the work, and each door is the rule that opens it.
const STATE_COLOR = () => ({ warm: theme.good, neutral: theme.muted, cold: theme.bad });

function Row({ r }) {
  const col = r.state ? STATE_COLOR()[r.state] : theme.muted;
  return (<div style={{ padding: '10px 0', borderBottom: `1px solid ${theme.line}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
      <span style={{ fontSize: 14, fontWeight: 800, minWidth: 0 }}>{r.name}</span>
      {r.inPhone
        ? <span style={{ fontSize: 11.5, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase', color: col, whiteSpace: 'nowrap' }}>{STATE_LABEL[r.state]}</span>
        : <span style={{ fontSize: 11, color: theme.muted, whiteSpace: 'nowrap' }}>not in your phone</span>}
    </div>
    {r.inPhone && <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 2, lineHeight: 1.45 }}>
      {r.role}{r.fromSet ? ` · met on "${r.fromSet}"` : ''}
    </div>}
    <div style={{ fontSize: 12, marginTop: 3, lineHeight: 1.45 }}>
      {r.inPhone && <span>Relationship <b style={{ color: col }}>{r.relationship}</b> · </span>}
      {r.films ? `${r.films} film${r.films === 1 ? '' : 's'} together` : 'No films together'}
      {r.last ? <span style={{ color: theme.muted }}>{r.last.when === 'On set now' ? ` · on set now: "${r.last.title}"` : r.last.when === 'In post' ? ` · "${r.last.title}" is in post` : ` · last: "${r.last.title}"${r.last.when ? ` (${r.last.when})` : ''}`}</span> : null}
    </div>
    {r.grudge && (<div style={{ marginTop: 6, padding: '6px 9px', borderRadius: 9, background: 'rgba(229,86,111,.1)', border: `1px solid ${theme.bad}44` }}>
      <div style={{ fontSize: 11.5, fontWeight: 900, color: theme.bad }}>Grudge · {r.grudge.expires}</div>
      <div style={{ fontSize: 11.5, color: theme.text, opacity: .85, marginTop: 2, lineHeight: 1.4 }}>{r.grudge.reason}</div>
      {r.grudge.ifHit && <div style={{ fontSize: 11, color: theme.muted, marginTop: 2, lineHeight: 1.4 }}>{r.grudge.ifHit}</div>}
    </div>)}
    {r.inPhone && <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 6, lineHeight: 1.45 }}>{r.line}</div>}
  </div>);
}
// Past this many, the people you made one film with and nothing since wait behind a tap. A long
// career has a director on every credit, and forty strangers would bury the eleven who matter.
const SHOW = 4;

export function DirectorsScreen({ g, onBack }) {
  const [all, setAll] = useState(false);
  const bar = FACTIONS.directors.read(g);
  const c = directorCounts(g);
  const phone = c.rows.filter((r) => r.inPhone), others = c.rows.filter((r) => !r.inPhone);
  // A grudge is always shown; the rest of the work is shown up to SHOW, then on a tap.
  const crossed = others.filter((r) => r.grudge), worked = others.filter((r) => !r.grudge);
  const shown = all ? worked : worked.slice(0, SHOW);
  const head = (t) => (<div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', color: theme.accent, margin: '16px 0 2px' }}>{t}</div>);
  const tally = [c.warm && `${c.warm} warm`, c.neutral && `${c.neutral} neutral`, c.cold && `${c.cold} cold`, c.grudges && `${c.grudges} grudge${c.grudges === 1 ? '' : 's'}`].filter(Boolean).join(' · ');
  return (<div style={{ position: 'fixed', inset: 0, background: 'rgba(8,5,20,.98)', zIndex: 61, overflowY: 'auto', padding: 16, color: theme.text, fontFamily: FONT }}>
    <div style={{ maxWidth: 400, margin: '0 auto', paddingBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button onClick={onBack} data-sfx="back" style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: theme.text, borderRadius: 9, padding: '6px 11px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>‹ Back</button>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700 }}>The directors</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 12.5, fontWeight: 800 }}>{tally || 'Nobody yet'}</span>
        <span style={{ fontSize: 13, fontWeight: 900, color: bar.score >= 70 ? theme.gold : bar.score < 35 ? theme.bad : theme.text }}>{bar.score}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 2, margin: '5px 0 5px' }}><div style={{ width: `${bar.score}%`, height: '100%', background: bar.score >= 70 ? theme.gold : bar.score < 35 ? theme.bad : theme.accent, borderRadius: 2 }} /></div>
      <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.45 }}>{bar.line}</div>
      {c.rumour && <div style={{ fontSize: 11.5, color: theme.bad, lineHeight: 1.45, marginTop: 6 }}>{c.rumour.who} is telling people you were difficult, until {monthName(c.rumour.until)}. Reads are harder while it lasts.</div>}

      {head('In your phone')}
      {phone.length ? phone.map((r) => <Row key={r.name} r={r} />)
        : <div style={{ fontSize: 12, color: theme.muted, padding: '6px 0', lineHeight: 1.5 }}>No director in your phone. One who warms to you on a set — sixty and up by the wrap — stays in it.</div>}
      {others.length > 0 && head('Worked with, or crossed')}
      {others.length > 0 && <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.45, padding: '2px 0 4px' }}>Not in your phone. Offers, tentpoles and sets only bring back people who are — a director gets into it by ending a shoot at sixty or more.</div>}
      {crossed.map((r) => <Row key={r.name} r={r} />)}
      {shown.map((r) => <Row key={r.name} r={r} />)}
      {worked.length > SHOW && <button onClick={() => setAll(!all)} style={{ marginTop: 8, width: '100%', background: 'none', border: `1px solid ${theme.line}`, borderRadius: 10, padding: '8px 10px', color: theme.muted, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
        {all ? 'Show fewer' : `Show all ${worked.length}`}
      </button>}

      {/* Each line is the rule in the file named after it — read off the code, not the comment. */}
      {head('How it works')}
      {[
        ['Offers', 'One agent offer in four comes from a director in your phone who is above 15 and not cold.'],
        ['Tentpoles', 'One picture in four on the tentpole board is directed by somebody you know: above 35, not cold, no grudge.'],
        ['Sets', 'One shoot in three is directed by somebody you met on a set: above 15, not cold, no grudge. The set starts where you left them.'],
        ['A pitch', 'Fifty and up, not cold, no grudge, and they will hear one. A cold partner makes a project thirty points less likely to get made.'],
        ['Grudges', 'Passing on a lead in a studio picture: two years, five if the film is a hit. Walking off their set: five years, and they go cold.'],
      ].map(([k, v]) => (<div key={k} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: `1px solid ${theme.line}`, fontSize: 11.5, lineHeight: 1.45 }}>
        <span style={{ width: 70, flex: 'none', fontWeight: 800, color: theme.text }}>{k}</span><span style={{ color: theme.muted }}>{v}</span>
      </div>))}
    </div>
  </div>);
}
