import { theme } from '../theme.js';
import { FONT, FONT_DISPLAY } from '../chrome.js';
import { dispatch } from '../../state/store.js';
import { emailAct } from '../../systems/meta/email.js';
import { P, Stamp, Signature, studioFor } from './ContractRoom.jsx';

// The option agreement, on the same paper as the contract. Maxi: "why does the contract
// look so poor — I thought it would be a document with ticks and crosses." It was a plain
// letter from business affairs. Now it is a page: the studio's head, the clause, a tick
// to grant it and a cross to refuse, your signature line and their stamp.
export function OptionPaper({ g, onClose }) {
  const m = (g.inbox || []).find((x) => x.id === g.openOption);
  if (!m) return null;
  const p = (g.productions && g.productions.length ? g.productions : (g.production ? [g.production] : [])).find((x) => x.title === m.title) || {};
  const studio = studioFor({ projectTitle: m.title });
  const bonus = (m.cta && m.cta[0] && m.cta[0].pay) || 0;
  const fee = p.salary || 0;
  const now = (g.year || 0) * 12 + (g.month || 0);
  const num = `№ ${String((now % 1000)).padStart(3, '0')}—OP`;
  const act = (i) => { dispatch(emailAct, m.id, i); onClose(); };
  const box = (kind) => ({ width: 22, height: 22, border: `1.5px solid ${kind === 'yes' ? P.green : P.accent}`, borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: kind === 'yes' ? P.green : P.accent, background: P.shade, flex: 'none' });
  return (<div style={{ position: 'fixed', inset: 0, background: P.bg, zIndex: 60, overflowY: 'auto', color: P.ink, fontFamily: FONT }}>
    <div style={{ maxWidth: 440, margin: '0 auto', padding: '14px 14px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={onClose} style={{ background: 'none', border: `1px solid ${P.line}`, borderRadius: 9, padding: '7px 12px', fontSize: 13, fontWeight: 800, cursor: 'pointer', color: P.ink }}>‹ Back</button>
        <div style={{ fontSize: 17, fontWeight: 800 }}>Option agreement</div>
        <div style={{ fontSize: 10, color: P.muted, letterSpacing: '.08em' }}>UNSIGNED</div>
      </div>
      <div style={{ background: P.paper, border: `1px solid ${P.ink}`, borderRadius: 3, padding: '18px 18px 22px', boxShadow: '3px 4px 0 rgba(120,97,60,.16)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
            <svg width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="12" fill="none" stroke={P.accent} strokeWidth="1.2" /><path d="M13 3v20M3 13h20M6 6l14 14M20 6L6 20" stroke={P.accent} strokeWidth=".8" /></svg>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '.22em' }}>{studio.split(' ')[0].toUpperCase()}</div>
              <div style={{ fontSize: 7, color: P.muted, letterSpacing: '.3em' }}>{(studio.split(' ').slice(1).join(' ') || 'PICTURES').toUpperCase()} · BUSINESS AFFAIRS</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: P.muted }}>{num}</div>
        </div>
        <div style={{ borderTop: `1px solid ${P.line}`, margin: '12px 0 10px' }} />
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, lineHeight: 1.15 }}>Option on further pictures</div>
        <div style={{ fontSize: 11, color: P.muted, marginTop: 3 }}>"{m.title}" · between {studio} and {g.name}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.65, margin: '14px 0 6px' }}>
          <p style={{ margin: '0 0 8px' }}><b>1.</b> The Studio shall hold an option on <b>two further pictures</b> in the "{m.title}" series, exercisable at its discretion following the release of the present picture.</p>
          <p style={{ margin: '0 0 8px' }}><b>2.</b> The Artist's fee for each further picture shall be the fee under the present agreement, <b>€{fee.toLocaleString()}</b>, irrespective of the Artist's standing at the time of exercise.</p>
          <p style={{ margin: '0 0 8px' }}><b>3.</b> In consideration, the Studio shall pay the Artist <b>€{bonus.toLocaleString()}</b> on signature, non-returnable, whether or not the option is exercised.</p>
          <p style={{ margin: 0 }}><b>4.</b> This offer lapses at wrap of the present picture.</p>
        </div>
        <div style={{ background: P.shade, border: `1px solid ${P.line}`, borderRadius: 4, padding: '8px 10px', fontSize: 11, color: P.muted, lineHeight: 1.5, marginTop: 8 }}>
          What it means: if the picture works, the sequels get made and everybody else's fee goes up while yours stays at €{fee.toLocaleString()}. If it does not, nothing happens and the €{bonus.toLocaleString()} is yours either way.
        </div>
        <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
          <button onClick={() => act(0)} style={{ display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', background: P.paper, border: `1px solid ${P.green}`, borderRadius: 4, padding: '10px 12px', cursor: 'pointer', color: P.ink, fontFamily: 'inherit' }}>
            <span style={box('yes')}>✓</span><span><b>I grant the option.</b> €{bonus.toLocaleString()} now, and the sequels at this fee.</span>
          </button>
          <button onClick={() => act(1)} style={{ display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', background: P.paper, border: `1px solid ${P.accent}`, borderRadius: 4, padding: '10px 12px', cursor: 'pointer', color: P.ink, fontFamily: 'inherit' }}>
            <span style={box('no')}>✗</span><span><b>I refuse.</b> Any sequel gets negotiated fresh — and if there is one, it pays like one.</span>
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 18 }}>
          <div>
            <Signature name={g.name} live={false} />
            <div style={{ borderTop: `1px solid ${P.ink}`, fontSize: 9, color: P.muted, paddingTop: 3, letterSpacing: '.1em' }}>THE ARTIST</div>
          </div>
          <Stamp studio={studio} live={false} />
        </div>
      </div>
    </div>
  </div>);
}
