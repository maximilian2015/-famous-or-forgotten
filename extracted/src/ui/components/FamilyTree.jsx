import { theme } from '../theme.js';
import { Avatar } from './Avatar.jsx';
import { lookOfPerson } from '../../systems/life/appearance.js';
import { lifeLine, workOf, isEx, ageNow } from '../../systems/life/kin.js';

// The family as a tree, by generation: the grandparents, then the parents, then you and
// whoever is beside you, then the children — brothers and sisters on your own row. Maxi:
// "family in its own window, looking like a family tree: you see mother and, branching,
// how it goes — daughter, grandmother, son". Tap anybody living to talk.
//
// Family V1: it is its own screen now, and it is the only place the dead are — with the years
// and the work when they are known (life/kin.js), "died at 79" when only the age was kept, and
// nothing invented when neither was. The rows are generations, not branches: which side of the
// family a grandparent is on was never stored (only "Grandma (dad's side)" says), so the tree
// does not draw lines it cannot back.
const GEN = [
  { id: 'grand', label: 'Grandparents', test: (p) => /^Grand/.test(p.relation || '') },
  { id: 'parents', label: 'Parents', test: (p) => p.relation === 'Mother' || p.relation === 'Father' },
  { id: 'you', label: 'You', test: (p) => p.relation === 'Spouse' || p.relation === 'Brother' || p.relation === 'Sister' || isEx(p) },
  { id: 'kids', label: 'Children', test: (p) => p.relation === 'Child' },
];

function Leaf({ g, p, you, onOpen, look }) {
  const dead = p && p.alive === false;
  const ex = p && isEx(p);
  const rel = p ? Math.round(p.relationship || 0) : 0;
  const col = dead ? theme.muted : rel >= 60 ? theme.good : rel >= 30 ? theme.accent : theme.bad;
  const work = p && !you ? workOf(p) : '';
  const life = dead ? lifeLine(g, p) : '';
  const relWord = String(p.relation || '').replace(/ \(dad's side\)/, '').toLowerCase();
  return (<button onClick={p && !dead && onOpen ? () => onOpen(p.id) : undefined}
    style={{ width: 88, background: 'none', border: 'none', padding: 0, cursor: p && !dead ? 'pointer' : 'default', color: theme.text, opacity: dead ? .6 : ex ? .7 : 1, verticalAlign: 'top' }}>
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ borderRadius: '50%', border: `2px ${ex ? 'dashed' : 'solid'} ${you ? theme.gold : col}`, padding: 2, boxShadow: you ? `0 0 14px ${theme.gold}66` : 'none', filter: dead ? 'grayscale(1)' : 'none' }}>
        <Avatar look={look} size={44} title={p ? p.name : ''} />
      </div>
    </div>
    <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dead ? p.name : p ? p.name.split(' ')[0] : ''}{dead ? ' †' : ''}</div>
    <div style={{ fontSize: 9.5, color: theme.muted, lineHeight: 1.25 }}>
      {you ? 'you' : dead || ageNow(g, p) == null ? relWord : `${relWord} · ${ageNow(g, p)}`}
    </div>
    {life && <div style={{ fontSize: 9.5, color: theme.text, opacity: .8, lineHeight: 1.25 }}>{life}</div>}
    {work && <div style={{ fontSize: 9.5, color: theme.muted, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{work}</div>}
    {p && !dead && !you && !ex && <div style={{ fontSize: 9.5, fontWeight: 800, color: col, marginTop: 1 }}>{rel}</div>}
  </button>);
}

export function FamilyTree({ g, onOpen, yourLook }) {
  const fam = g.family || [];
  const rows = GEN.map((gen) => ({ ...gen, people: fam.filter(gen.test) }));
  const partner = g.partner && !fam.some((p) => p.relation === 'Spouse' && p.alive !== false) ? g.partner : null;
  return (<div style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 14, padding: '10px 6px 4px' }}>
    {rows.map((row, ri) => {
      const leaves = [];
      if (row.id === 'you') {
        // Spouse or partner first, then you, then brothers and sisters, then whoever you were married to before.
        const spouse = row.people.find((p) => p.relation === 'Spouse' && p.alive !== false);
        if (spouse) leaves.push(<Leaf key={spouse.id} g={g} p={spouse} onOpen={onOpen} look={lookOfPerson(spouse)} />);
        else if (partner) leaves.push(<Leaf key={partner.id} g={g} p={{ ...partner, relation: 'partner' }} onOpen={onOpen} look={lookOfPerson(partner)} />);
        // A husband or wife who died is beside you here, and only here.
        for (const p of row.people.filter((x) => x.relation === 'Spouse' && x.alive === false)) leaves.push(<Leaf key={p.id} g={g} p={p} onOpen={onOpen} look={lookOfPerson(p)} />);
        leaves.push(<Leaf key="you" g={g} p={{ name: g.name || 'You', relation: 'you', alive: true }} you look={yourLook} />);
        for (const p of row.people.filter((p) => p.relation === 'Brother' || p.relation === 'Sister')) leaves.push(<Leaf key={p.id} g={g} p={p} onOpen={onOpen} look={lookOfPerson(p)} />);
        for (const p of row.people.filter(isEx)) leaves.push(<Leaf key={p.id} g={g} p={{ ...p, relation: 'ex-spouse' }} onOpen={onOpen} look={lookOfPerson(p)} />);
      } else {
        for (const p of row.people) leaves.push(<Leaf key={p.id} g={g} p={p} onOpen={onOpen} look={lookOfPerson(p)} />);
      }
      if (!leaves.length) return null;
      return (<div key={row.id}>
        {ri > 0 && <div style={{ display: 'flex', justifyContent: 'center' }}><div style={{ width: 1, height: 12, background: theme.line }} /></div>}
        <div style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', color: theme.muted, textAlign: 'center', marginBottom: 4 }}>{row.label}</div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 4, flexWrap: 'wrap', paddingBottom: 6 }}>{leaves}</div>
      </div>);
    })}
  </div>);
}
