import { monthlyCosts, HOUSING, DIET } from '../../engine/economy.js';
import { inCareer } from '../../engine/stage.js';
import { agentCut } from '../../systems/career/agent.js';
import { hostName } from '../../systems/life/dating.js';
import { strainBand, unreliable, depressed } from '../../systems/life/strain.js';
import { monthsIn } from '../../systems/life/depression.js';
import { theme } from '../theme.js';
import { allSets, money } from '../helpers.js';
import { Card } from './Card.jsx';

export function LifeCard({ g }) {
  const c = monthlyCosts(g);
  // A month's income is the wage AND the shoot you are on. The balance used to show −€1,170
  // to somebody being paid €2,000 a month by a picture. Net of the agent's cut, as paid.
  const shootPay = g.production ? Math.round(((g.production.salary || 0) / Math.max(1, g.production.months || 1)) * (1 - agentCut(g))) : 0;
  const income = (g.job ? g.job.pay : 0) + shootPay;
  const net = income - c.total;
  const row = (k, v, tint) => (<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '5px 0', borderBottom: `1px solid ${theme.line}` }}>
    <span style={{ color: theme.muted }}>{k}</span><span style={{ fontWeight: 700, color: tint || theme.text }}>{v}</span></div>);
  return (<Card style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 6 }}>Your life right now</div>
    {row('Living', g.homeless ? 'Nowhere — on the street' : hostName(g) ? `At ${hostName(g)}'s · no rent` : g.inheritedHome ? `${HOUSING[g.housing || 'room'].label} · yours outright` : g.hasApartment ? HOUSING[g.housing || 'room'].label : "At your parents'")}
    {g.hasApartment && row('Eating', `${DIET[g.diet || 'cook'].label}${g.gym ? ' · gym' : ''}`)}
    {row('Work', g.job ? `${g.job.title} · ${g.job.employer}` : (inCareer(g) ? 'No job' : '—'), g.job ? theme.text : theme.muted)}
    {allSets(g).map((p, i) => row(i ? '' : 'Filming', `${p.title} · ${p.prepLeft > 0 ? `preparing, ${p.prepLeft} mo` : `${p.monthsLeft} mo left`}`, theme.gold))}
    {/* The number your agent says out loud. It only means anything if you can see it. */}
    {(g.quote || 0) > 0 && row('Your quote', money(g.quote), theme.gold)}
    {/* What the work is costing you. Only shown once it is worth knowing about. */}
    {g.burnout ? row('Signed off', `${g.burnout.left} month${g.burnout.left === 1 ? '' : 's'} left`, theme.bad)
      : (g.strain || 0) >= 34 && row('Energy', strainBand(g.strain).label, (g.strain || 0) >= 82 ? theme.bad : (g.strain || 0) >= 60 ? theme.gold : theme.muted)}
    {/* Once you have shut down three sets, that is a thing about you. */}
    {unreliable(g) && row('Insurers', `${g.burnouts} shoots stopped because of you`, theme.bad)}
    {depressed(g) && row('Carrying', `${monthsIn(g)} month${monthsIn(g) === 1 ? '' : 's'} of it`, theme.bad)}
    {!depressed(g) && (g.scarred || 0) > 0 && row('It kept', `${g.scarred} hour${g.scarred === 1 ? '' : 's'} a month`, theme.bad)}
    {g.hasApartment && row('Out each month', `€${c.total.toLocaleString()}`, theme.bad)}
    {income > 0 && row('In each month', `€${income.toLocaleString()}${shootPay ? ' · incl. the shoot' : ''}`, theme.good)}
    {g.hasApartment && row('Balance', `${net >= 0 ? '+' : ''}€${net.toLocaleString()}`, net >= 0 ? theme.good : theme.bad)}
  </Card>);
}
