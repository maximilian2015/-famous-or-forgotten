import { useState } from 'react';
import { dispatch } from '../../state/store.js';
import { canRename, whyNot, TITLE_MAX, rename as renameProject } from '../../systems/career/naming.js';
import { theme } from '../theme.js';

// The working title. Maxi: "let the player write their own names — much more interesting."
// Anything that has not opened yet can be renamed; the night it opens, the name is the name.
// See systems/career/naming.js.
export function TitleLine({ g, kind, id, title, size = 15 }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const fit = canRename(g, kind, id);
  const bad = editing ? whyNot(g, kind, id, draft) : null;
  if (!editing) return (<div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
    <div style={{ fontSize: size, fontWeight: 800, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
    {fit.ok && <button onClick={() => { setDraft(String(title).replace(/(\s*·\s*season\s+\d+)+\s*$/i, '')); setEditing(true); }}
      title="Name it yourself — a title is provisional until it opens"
      style={{ flex: 'none', background: 'none', border: 'none', color: theme.muted, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}>✎ name it</button>}
  </div>);
  return (<div>
    <div style={{ display: 'flex', gap: 6 }}>
      <input autoFocus value={draft} maxLength={TITLE_MAX} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !bad) { dispatch(renameProject, kind, id, draft); setEditing(false); } if (e.key === 'Escape') setEditing(false); }}
        style={{ flex: 1, minWidth: 0, background: theme.bg, border: `1px solid ${bad ? theme.bad : theme.gold}`, borderRadius: 8, padding: '7px 9px', color: theme.text, fontSize: 14, fontWeight: 800, fontFamily: 'inherit' }} />
      <button disabled={!!bad} onClick={() => { dispatch(renameProject, kind, id, draft); setEditing(false); }}
        style={{ flex: 'none', border: 'none', borderRadius: 8, padding: '7px 11px', background: bad ? 'rgba(120,110,150,.2)' : theme.gold, color: bad ? '#6b6390' : '#241a05', fontSize: 12, fontWeight: 900, cursor: bad ? 'default' : 'pointer' }}>Set</button>
      <button onClick={() => setEditing(false)} style={{ flex: 'none', background: 'none', border: 'none', color: theme.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✕</button>
    </div>
    <div style={{ fontSize: 11, color: bad ? theme.bad : theme.muted, marginTop: 4, lineHeight: 1.4 }}>
      {bad || 'A working title, until the night it opens. Nothing is called what it was called on the first day.'}
    </div>
  </div>);
}
