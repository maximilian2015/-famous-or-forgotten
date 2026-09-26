import { useState } from 'react';
import { theme } from '../theme.js';
import { FONT, FONT_DISPLAY } from '../chrome.js';
import { dispatch } from '../../state/store.js';
import { contractFor, markClause, sendContract, signContract, passContract, openTalks, proposeStart, earliestStart } from '../../systems/career/contract.js';
import { STUDIOS } from '../../systems/world/names.js';
import { Diary } from './Diary.jsx';

// The deal, as a document. Cream paper, a letterhead, numbered clauses, a signature line
// and the studio's stamp — the warm paper the ChatGPT mock-ups used, on a screen that
// otherwise stays dark. Every clause has a tick, or a "discuss" that opens the asks with
// their odds; you sign, or you send it back and wait a month for the answer. Maxi: "it
// should look like a contract."
export const P = { paper: '#fff7e7', ink: '#302d26', accent: '#8b432f', muted: '#786d5d', line: '#cabc9e', bg: '#e8dbc3', green: '#435848', shade: '#f3ead6' };

export function studioFor(o) { let h = 0; for (const ch of String(o.id || o.projectTitle || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return STUDIOS[h % STUDIOS.length]; }

export function Stamp({ studio, live }) {
  const [a, b] = studio.split(' ');
  return (<svg viewBox="0 0 90 90" width="82" height="82" style={{ opacity: live ? 1 : .28, transform: 'rotate(-12deg)' }}>
    <circle cx="45" cy="45" r="40" fill="none" stroke={P.accent} strokeWidth="2" />
    <circle cx="45" cy="45" r="34" fill="none" stroke={P.accent} strokeWidth=".8" />
    <text x="45" y="42" textAnchor="middle" fontSize="11" fontWeight="800" fill={P.accent} letterSpacing="1.5">{(a || '').toUpperCase().slice(0, 10)}</text>
    <text x="45" y="55" textAnchor="middle" fontSize="7" fontWeight="600" fill={P.accent} letterSpacing="1.6">{(b || 'PICTURES').toUpperCase().slice(0, 12)}</text>
    <path d="M35 27h20M39 63h12" stroke={P.accent} strokeWidth=".9" />
  </svg>);
}
export function Signature({ name, live }) {
  // A scrawl that reads as a signature without being anybody's — the same stroke every time,
  // so it is recognisably yours after the first contract.
  return (<svg viewBox="0 0 170 40" width="150" height="36" style={{ opacity: live ? 1 : .18 }}>
    <path d="M4 26C14 6 22 -2 19 12L12 34M6 22l28-6M30 24C46 2 44 -5 39 4s-13 31 1 22l12-12q-13 19 3 8l5-4m4 5c5-6 13-3 7 1-6 6-11 3-5-3m12 2l25-24-4 23 21-24-10 27m8-8c13-10 17 1 3 5-4-1 0-7 3-7m9 3c13-10 17 1 3 5-4-1 0-7 3-7m8 4l4-7-1 11 11-9-3 10 13-8"
      fill="none" stroke="#3f5260" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 36Q60 26 160 30" fill="none" stroke="#3f5260" strokeWidth="1" opacity=".7" />
  </svg>);
}

export function ContractRoom({ g, onClose }) {
  const [cal, setCal] = useState(false);
  const [open, setOpen] = useState(null);
  const [pickMonth, setPickMonth] = useState(false);
  const o = (g.offers || []).find((x) => x.id === g.openContract);
  const k = o ? contractFor(g, o.id) : null;
  if (!o || !k) { return (<div style={{ position: 'fixed', inset: 0, background: P.bg, zIndex: 60, color: P.ink, fontFamily: FONT, padding: 20 }}>
    <button onClick={onClose} style={{ background: 'none', border: `1px solid ${P.line}`, borderRadius: 9, padding: '7px 12px', fontSize: 13, fontWeight: 800, cursor: 'pointer', color: P.ink }}>‹ Back</button>
    <div style={{ marginTop: 40, textAlign: 'center', color: P.muted }}>That offer is gone.</div></div>); }
  const title = String(o.projectTitle || '').replace('⭐ ', '');
  const studio = o.studio || studioFor(o);
  const talks = openTalks(o);
  // A schedule they have not answered: no set for it, and no signature until they say how.
  const must = k.clauses.some((c) => c.must && c.result !== 'agreed' && c.stance !== 'talk');
  const withThem = !!k.sent;
  const signed = !!o.signed;
  const now = (g.year || 0) * 12 + (g.month || 0);
  const num = `№ ${String((now % 1000)).padStart(3, '0')}—${String(o.id || '').slice(-2).toUpperCase()}`;
  const stanceLabel = (c) => c.result === 'agreed' ? 'agreed' : c.result === 'counter' ? 'they came halfway' : c.result === 'refused' ? 'they held' : null;
  return (<div style={{ position: 'fixed', inset: 0, background: P.bg, zIndex: 60, overflowY: 'auto', color: P.ink, fontFamily: FONT }}>
    <div style={{ maxWidth: 440, margin: '0 auto', padding: '14px 14px 110px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={onClose} style={{ background: 'none', border: `1px solid ${P.line}`, borderRadius: 9, padding: '7px 12px', fontSize: 13, fontWeight: 800, cursor: 'pointer', color: P.ink }}>‹ Back</button>
        <div style={{ fontSize: 17, fontWeight: 800 }}>Contract</div>
        <div style={{ fontSize: 10, color: P.muted, letterSpacing: '.08em' }}>{signed ? 'SIGNED' : withThem ? 'WITH THEM' : `ROUND ${k.round + 1}`}</div>
      </div>

      {/* the paper */}
      <div style={{ background: P.paper, border: `1px solid ${P.ink}`, borderRadius: 3, padding: '18px 18px 22px', boxShadow: '3px 4px 0 rgba(120,97,60,.16)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
            <svg width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="12" fill="none" stroke={P.accent} strokeWidth="1.2" /><path d="M13 3v20M3 13h20M6 6l14 14M20 6L6 20" stroke={P.accent} strokeWidth=".8" /></svg>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '.22em' }}>{studio.split(' ')[0].toUpperCase()}</div>
              <div style={{ fontSize: 7, color: P.muted, letterSpacing: '.3em' }}>{(studio.split(' ').slice(1).join(' ') || 'PICTURES').toUpperCase()}</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: P.muted }}>{num}</div>
        </div>
        <div style={{ height: 1, background: P.ink, margin: '12px 0 16px' }} />
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 21, lineHeight: 1.15 }}>Actor’s contract</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: P.accent, marginTop: 4 }}>“{title}” · {o.role}</div>
        {/* The part, on the paper, where a part belongs. career/script.js */}
        {o.character && <div style={{ fontSize: 11.5, marginTop: 3 }}>as <b>{o.character.name}</b> — {o.character.what}</div>}
        {o.premise && <div style={{ fontSize: 11, color: P.muted, marginTop: 4, lineHeight: 1.5, fontStyle: 'italic' }}>{o.premise}</div>}
        <div style={{ fontSize: 12, marginTop: 6 }}>{g.name} × {studio}</div>
        <div style={{ height: 1, background: P.line, margin: '12px 0 4px' }} />

        {k.clauses.map((c, i) => {
          const chosen = c.options.find((x) => x.id === c.ask);
          const res = stanceLabel(c);
          // A clause they will not sign without an answer (the dates, on a set): no tick to give,
          // the choices open on the paper itself. Maxi: "the button does not work — it will not let me sign."
          const forced = !!c.must && c.result !== 'agreed' && c.stance !== 'talk';
          const isOpen = open === c.id || forced;
          return (<div key={c.id} style={{ padding: '11px 0', borderBottom: `1px solid ${P.line}` }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 22, flex: 'none', fontSize: 10, fontWeight: 800, color: P.accent, paddingTop: 2 }}>{String(i + 1).padStart(2, '0')}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800 }}>{c.label}</div>
                  {res && <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: c.result === 'refused' ? P.accent : P.green }}>{res}</span>}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5, marginTop: 3 }}>{c.text}</div>
                {c.stance === 'talk' && chosen && <div style={{ fontSize: 11, color: P.accent, marginTop: 4, fontWeight: 700 }}>→ {chosen.label} · {chosen.sure ? 'they will agree' : `about ${chosen.odds}% they agree`}</div>}
                {/* the marks: a tick, or discuss */}
                {forced && !signed && !withThem && <div style={{ marginTop: 7, fontSize: 11.5, lineHeight: 1.5, color: P.accent, fontWeight: 700, background: 'rgba(139,67,47,.08)', border: `1px solid ${P.accent}55`, borderRadius: 6, padding: '7px 9px' }}>⚠ They need an answer on this before anything else. Pick one below, then send the paper back — they reply next month.</div>}
                {!signed && !withThem && !forced && <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
                  <button onClick={() => { dispatch(markClause, o.id, c.id, null); setOpen(null); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: `1px solid ${c.stance === 'ok' ? P.green : P.line}`, background: c.stance === 'ok' ? P.green : 'transparent', color: c.stance === 'ok' ? P.paper : P.ink, borderRadius: 4, padding: '4px 9px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                    <span style={{ width: 12, height: 12, border: `1.5px solid ${c.stance === 'ok' ? P.paper : P.ink}`, borderRadius: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>{c.stance === 'ok' ? '✓' : ''}</span>Agreed
                  </button>
                  {c.options.length > 0 && <button onClick={() => setOpen(isOpen ? null : c.id)}
                    style={{ border: `1px solid ${c.stance === 'talk' ? P.accent : P.line}`, background: c.stance === 'talk' ? 'rgba(139,67,47,.10)' : 'transparent', color: c.stance === 'talk' ? P.accent : P.ink, borderRadius: 4, padding: '4px 9px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                    Discuss {isOpen ? '▴' : '▾'}
                  </button>}
                  {c.options.length === 0 && <span style={{ fontSize: 10.5, color: P.muted, alignSelf: 'center' }}>not up for discussion</span>}
                </div>}
                {isOpen && !signed && !withThem && <div style={{ marginTop: 7, background: P.shade, borderRadius: 6, padding: '6px 8px' }}>
                  {c.id === 'schedule' && <button onClick={() => setPickMonth(!pickMonth)} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: `1px solid ${P.line}`, padding: '6px 2px', cursor: 'pointer', color: P.accent, fontSize: 11.5, fontWeight: 800 }}>
                    <span>📅 Propose your own month — pick it in the calendar</span><span style={{ whiteSpace: 'nowrap' }}>{pickMonth ? '▴' : '▾'}</span>
                  </button>}
                  {c.id === 'schedule' && pickMonth && <div style={{ background: theme.bg, borderRadius: 10, padding: 8, margin: '6px 0' }}>
                    <div style={{ fontSize: 10.5, color: theme.muted, marginBottom: 6, lineHeight: 1.45 }}>Tap the month you want to start. Nothing before {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][earliestStart(g, o) % 12]} {Math.floor(earliestStart(g, o) / 12)} — you are not free before then. The further past their date, the longer the odds.</div>
                    <Diary g={g} pick={(abs) => { dispatch(proposeStart, o.id, abs); setPickMonth(false); }} pickFrom={earliestStart(g, o)} picked={(c.options.find((x) => x.id === 'propose') || {}).value?.start} />
                  </div>}
                  {c.options.filter((op) => op.id !== 'propose' || c.ask === 'propose').map((op) => (<button key={op.id} onClick={() => { dispatch(markClause, o.id, c.id, op.id); setOpen(null); }}
                    style={{ display: 'flex', justifyContent: 'space-between', gap: 8, width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: `1px solid ${P.line}`, padding: '6px 2px', cursor: 'pointer', color: P.ink, fontSize: 11.5 }}>
                    <span>{op.label}</span><span style={{ color: op.odds >= 50 ? P.green : op.odds >= 25 ? P.muted : P.accent, fontWeight: 800, whiteSpace: 'nowrap' }}>{op.sure ? 'they will' : `~${op.odds}%`}</span>
                  </button>))}
                </div>}
              </div>
            </div>
          </div>); })}

        {/* signature and stamp */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 18 }}>
          <div>
            <Signature name={g.name} live={signed} />
            <div style={{ height: 1, background: '#ae9c80', width: 170, marginTop: 2 }} />
            <div style={{ fontSize: 10, color: P.muted, marginTop: 5 }}>{g.name}{signed ? ` · ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][g.month]} ${g.year}` : ' · unsigned'}</div>
          </div>
          <Stamp studio={studio} live={signed} />
        </div>
        <div style={{ fontSize: 9, color: P.muted, marginTop: 8 }}>{signed ? 'Signed by both parties' : withThem ? 'Sent back for revision — awaiting the studio' : 'Actor’s copy'}</div>
      </div>

      {/* what you can do with it */}
      <div style={{ marginTop: 12, display: 'grid', gap: 7 }}>
        {withThem && <div style={{ fontSize: 12, color: P.muted, textAlign: 'center', lineHeight: 1.5, padding: '4px 6px' }}>It is with them. They answer next month; the offer does not expire while they read it.</div>}
        {signed && <div style={{ fontSize: 12, color: P.green, textAlign: 'center', lineHeight: 1.5, padding: '4px 6px', fontWeight: 700 }}>{o.waitsForWrap ? 'Signed. It starts the month a set frees up.' : 'Signed.'}</div>}
        {!withThem && !signed && <>
          {must && <div style={{ fontSize: 12.5, lineHeight: 1.5, color: P.ink, background: 'rgba(139,67,47,.08)', border: `1px solid ${P.accent}55`, borderRadius: 6, padding: '10px 12px', fontWeight: 700 }}>No signature yet — you are on another set. On clause 02, choose: they hold the part until you wrap, you propose your own month in the calendar, or you walk off what you are on — then send it back.</div>}
          {!must && <button onClick={() => { dispatch(signContract, o.id); if (!talks.length) onClose(); }} disabled={talks.length > 0}
            style={{ border: 'none', borderRadius: 4, padding: '13px', fontSize: 14, fontWeight: 800, cursor: talks.length ? 'default' : 'pointer', background: talks.length ? '#c9b89a' : P.accent, color: P.paper }}>
            {talks.length ? `Sign — first settle ${talks.length} open point${talks.length === 1 ? '' : 's'}` : 'Sign it'}
          </button>}
          {talks.length > 0 && <button onClick={() => { dispatch(sendContract, o.id); }} style={{ border: 'none', borderRadius: 4, padding: '13px', fontSize: 14, fontWeight: 800, cursor: 'pointer', background: P.accent, color: P.paper }}>
            Send it back with {talks.length} point{talks.length === 1 ? '' : 's'}{k.round >= 2 ? ' — they may walk' : ''}
          </button>}
        </>}
        <button onClick={() => setCal(!cal)} style={{ border: `1px solid ${P.line}`, borderRadius: 4, padding: '10px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: 'transparent', color: P.ink }}>{cal ? 'Hide the calendar' : 'See the calendar first'}</button>
        {cal && <div style={{ background: theme.bg, borderRadius: 12, padding: 10 }}><Diary g={g} /></div>}
        {!signed && <button onClick={() => { if (window.confirm('Pass on "' + title + '"? They will cast somebody else.')) { dispatch(passContract, o.id); onClose(); } }}
          style={{ border: `1px solid ${P.line}`, borderRadius: 4, padding: '9px', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'transparent', color: P.muted }}>Pass on it</button>}
      </div>
    </div>
  </div>);
}
