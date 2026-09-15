import { theme } from '../theme.js';
import { Avatar } from './Avatar.jsx';
import { lookOfPerson } from '../../systems/life/appearance.js';

// The family as a tree, by generation: the grandparents, then the parents, then you and
// whoever is beside you, then the children — brothers and sisters on your own row. Maxi:
// "family in its own window, looking like a family tree: you see mother and, branching,
// how it goes — daughter, grandmother, son". Tap anybody to talk.
const GEN = [
  { id: 'grand', label: 'Grandparents', test: (p) => /^Grand/.test(p.relation || '') },
  { id: 'parents', label: 'Parents', test: (p) => p.relation === 'Mother' || p.relation === 'Father' },
  { id: 'you', label: 'You', test: (p) => p.relation === 'Spouse' || p.relation === 'Brother' || p.relation === 'Sister' },
  { id: 'kids', label: 'Children', test: (p) => p.relation === 'Child' },
];

function Leaf({ p, you, onOpen, look }) {
  const dead = p && p.alive === false;
  const rel = p ? Math.round(p.relationship || 0) : 0;
  const col = dead ? theme.muted : rel >= 60 ? theme.good : rel >= 30 ? theme.accent : theme.bad;
  return (<button onClick={p && !dead && onOpen ? () => onOpen(p.id) : undefined}
    style={{ width: 84, background: 'none', border: 'none', padding: 0, cursor: p && !dead ? 'pointer' : 'default', color: theme.text, opacity: dead ? .55 : 1 }}>
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ borderRadius: '50%', border: `2px solid ${you ? theme.gold : col}`, padding: 2, boxShadow: you ? `0 0 14px ${theme.gold}66` : 'none' }}>
        <Avatar look={look} size={44} title={p ? p.name : ''} />
      </div>
    </div>
    <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p ? p.name.split(' ')[0] : ''}</div>
    <div style={{ fontSize: 9.5, color: theme.muted, lineHeight: 1.2 }}>
      {you ? 'you' : dead ? `${p.relation.toLowerCase()} · †` : `${(p.relation || '').toLowerCase()} · ${p.age}`}
    </div>
    {p && !dead && !you && <div style={{ fontSize: 9.5, fontWeight: 800, color: col, marginTop: 1 }}>{rel}</div>}
  </button>);
}

export function FamilyTree({ g, onOpen, yourLook }) {
  const fam = g.family || [];
  const rows = GEN.map((gen) => ({ ...gen, people: fam.filter(gen.test) }));
  const partner = g.partner && !fam.some((p) => p.relation === 'Spouse') ? g.partner : null;
  return (<div style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 14, padding: '10px 6px 4px' }}>
    {rows.map((row, ri) => {
      const leaves = [];
      if (row.id === 'you') {
        // Spouse or partner first, then you, then brothers and sisters.
        const spouse = row.people.find((p) => p.relation === 'Spouse');
        if (spouse) leaves.push(<Leaf key={spouse.id} p={spouse} onOpen={onOpen} look={lookOfPerson(spouse)} />);
        else if (partner) leaves.push(<Leaf key={partner.id} p={{ ...partner, relation: 'partner' }} onOpen={onOpen} look={lookOfPerson(partner)} />);
        leaves.push(<Leaf key="you" p={{ name: g.name || 'You', relation: 'you', alive: true }} you look={yourLook} />);
        for (const p of row.people.filter((p) => p.relation !== 'Spouse')) leaves.push(<Leaf key={p.id} p={p} onOpen={onOpen} look={lookOfPerson(p)} />);
      } else {
        for (const p of row.people) leaves.push(<Leaf key={p.id} p={p} onOpen={onOpen} look={lookOfPerson(p)} />);
      }
      if (!leaves.length) return null;
      return (<div key={row.id}>
        {ri > 0 && <div style={{ display: 'flex', justifyContent: 'center' }}><div style={{ width: 1, height: 12, background: theme.line }} /></div>}
        <div style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', color: theme.muted, textAlign: 'center', marginBottom: 4 }}>{row.label}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap', paddingBottom: 6 }}>{leaves}</div>
      </div>);
    })}
  </div>);
}
