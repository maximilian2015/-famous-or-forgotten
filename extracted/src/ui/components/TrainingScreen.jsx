import { dispatch } from '../../state/store.js';
import { canAfford, COST } from '../../engine/energy.js';
import { trainingKey, SCHOOLS, train } from '../../systems/career/training.js';
import { lessonCap, skillCap, talentHint } from '../../systems/career/actions.js';
import { theme } from '../theme.js';
import { Card } from './Card.jsx';

export function TrainingScreen({ g }) {
  const key = trainingKey(g);
  const skill = Math.round(g[key] || 0), cap = lessonCap(), ceiling = skillCap(g);
  const noEnergy = !canAfford(g, COST.rehearse);
  return (<div>
    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted }}>{key === 'singing' ? 'Singing' : 'Acting'}</div>
        <div style={{ fontSize: 13, fontWeight: 900 }}>{skill} <span style={{ color: theme.muted, fontWeight: 700 }}>/ {skill >= cap ? '—' : cap}</span></div>
      </div>
      <div style={{ height: 7, background: 'rgba(255,255,255,.08)', borderRadius: 4, margin: '8px 0 6px', position: 'relative' }}>
        <div style={{ width: cap + '%', height: '100%', background: 'rgba(158,116,255,.25)', borderRadius: 4, position: 'absolute' }} />
        {skill >= ceiling && <div style={{ position: 'absolute', left: ceiling + '%', top: -2, bottom: -2, width: 2, background: theme.gold }} />}
        <div style={{ width: skill + '%', height: '100%', background: theme.accent, borderRadius: 4, position: 'absolute' }} />
      </div>
      <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5 }}>
        {skill >= ceiling ? `As good as you will get. The teachers said it early: ${talentHint(g)}.`
          : skill >= cap ? `Lessons stop at ${cap}. It is sets from here — the teachers said you were ${talentHint(g)}.`
          : `Teachers can take you to ${cap}. Past that it is sets — and the teachers already have a view: ${talentHint(g)}.`}
      </div>
    </Card>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Where to study</div>
    <div style={{ display: 'grid', gap: 8 }}>
      {SCHOOLS.map((sc) => { const tooPoor = (g.cash || 0) < sc.cost; const off = noEnergy || tooPoor;
        return (<div key={sc.id} style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '11px 13px', opacity: tooPoor ? .55 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>{sc.label}</div>
            <div style={{ fontSize: 12.5, fontWeight: 900, color: sc.cost ? theme.gold : theme.muted }}>{sc.cost ? `€${sc.cost.toLocaleString()}` : 'Free'}</div>
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 8px' }}>{sc.blurb} · +{sc.gain[0]}–{sc.gain[1]}{sc.mental < 0 ? ` · mental ${sc.mental}` : ''}</div>
          <button onClick={() => dispatch(train, sc.id)} disabled={off} style={{ width: '100%', border: 'none', borderRadius: 10, padding: '9px', fontSize: 12.5, fontWeight: 800,
            cursor: off ? 'default' : 'pointer', background: off ? 'rgba(120,110,150,.15)' : `linear-gradient(135deg,${theme.accent2},${theme.accent})`, color: off ? '#6b6390' : '#fff' }}>
            {tooPoor ? "Can't afford it" : 'Study'}
          </button>
        </div>); })}
    </div>
  </div>);
}
