import { rint, chance, pick } from '../../engine/rng.js';
import { computeAccess } from './access.js';
import { feeFor } from '../meta/status.js';
import { addTimeline } from '../../engine/timeline.js';
import { earn } from '../../engine/economy.js';
import { GENRES } from '../meta/news.js';
import { startProduction } from './production.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
function title(s, big) {
  const A = big ? ['Empire','Legacy','Titan','Eternal','Crown','Apex'] : ['Small','Quiet','Last','Neon','Paper','Golden'];
  const B = s.dream === 'singer' ? ['Anthem','Record','Tour','Sessions','Sound'] : ['Story','Hour','City','Room','Line'];
  return `${pick(A)} ${pick(B)}`;
}
export function generateOffer(s) {
  const acc = computeAccess(s); const fame = s.fame || 0;
  let tier;
  if (acc.aaa && fame >= 60 && chance(40)) tier = 'tentpole';
  else if (fame >= 35) tier = 'lead'; else tier = 'supporting';
  // Base rates are what an unknown would be paid; feeFor scales them to your name, the
  // same way castings do. An offer that reached you through an agent is worth the money.
  const base = { tentpole: [90000, 260000], lead: [26000, 70000], supporting: [6000, 16000] }[tier];
  const prestige = { tentpole: rint(70, 95), lead: rint(45, 70), supporting: rint(20, 45) }[tier];
  const salary = feeFor(s, rint(base[0], base[1]));
  return { id: 'off' + Date.now() + Math.floor(Math.random() * 1000),
    projectTitle: (tier === 'tentpole' ? '⭐ ' : '') + title(s, tier === 'tentpole'),
    role: tier === 'supporting' ? 'Supporting' : 'Lead',
    type: s.dream === 'singer' ? (tier === 'tentpole' ? 'World Tour' : 'Album') : (tier === 'tentpole' ? 'Blockbuster' : 'Feature Film'),
    genre: pick(GENRES),
    salary, months: rint(3, 8), fame: { tentpole: 9, lead: 5, supporting: 2 }[tier], prestigeScore: prestige, tier, deadline: rint(2, 4) };
}
export function campaignCost(o) { return Math.max(800, Math.round(o.salary * 0.15)); }
export function runCampaign(s, id) {
  const o = (s.offers || []).find((x) => x.id === id); if (!o || o.tier === 'supporting' || o.campaign) return s;
  const cost = campaignCost(o);
  if ((s.cash || 0) < cost) { s.lastEvent = `A campaign for "${o.projectTitle.replace('⭐ ', '')}" would cost €${cost.toLocaleString()} — you can't cover it right now.`; return s; }
  s.cash = (s.cash || 0) - cost;
  o.campaign = true;
  s.lastEvent = `You greenlit a marketing push for "${o.projectTitle.replace('⭐ ', '')}" — €${cost.toLocaleString()}. Should help if it lands.`;
  addTimeline(s, `Ran a campaign for ${o.projectTitle.replace('⭐ ', '')}.`);
  return s;
}
export function maybeGenerateOffer(s) {
  const acc = computeAccess(s);
  if (s.stage !== 'career') return;
  if ((s.offers || []).length >= 4) return;
  let p = acc.agentReach ? 0.5 : (s.fame >= 20 ? 0.18 : 0.05);
  // A name people are nervous about gets fewer calls.
  p *= Math.max(0.25, 1 - (s.scandal || 0) / 90);
  if (chance(p * 100)) (s.offers = s.offers || []).push(generateOffer(s));
}
export function acceptOffer(s, id) {
  const o = (s.offers || []).find((x) => x.id === id); if (!o) return s;
  if (o.tier !== 'supporting') {
    if (s.production) { s.lastEvent = `You're already committed to "${s.production.title}" — wrap that one first.`; return s; }
    s.offers = (s.offers || []).filter((x) => x.id !== id);
    startProduction(s, o);
    return s;
  }
  const skill = s.dream === 'singer' ? s.singing : s.acting;
  const rating = clamp(35 + skill * 0.4 + o.prestigeScore * 0.2 + (s.looks - 40) * 0.12 + rint(-8, 15));
  const status = rating >= 85 ? 'Hit' : rating >= 70 ? 'Well-received' : rating >= 50 ? 'Released' : 'Flop';
  const credit = { title: o.projectTitle.replace('⭐ ', ''), role: o.role, type: o.type, genre: o.genre, salary: o.salary, rating, status, year: s.year };
  const bucket = s.dream === 'singer' ? 'discography' : 'filmography';
  (s[bucket] = s[bucket] || []).unshift(credit);
  earn(s, o.salary, `"${credit.title}" paid`);
  s.fame = clamp(s.fame + o.fame + (rating >= 85 ? 4 : 0));
  s.confidence = clamp(s.confidence + 2);
  s.offers = (s.offers || []).filter((x) => x.id !== id);
  s.lastEvent = `You took "${credit.title}". It came out ${status.toLowerCase()} — rating ${Math.round(rating)}.`;
  addTimeline(s, `${credit.title}: ${status} (${Math.round(rating)}/100).`, rating < 50);
  return s;
}
export function declineOffer(s, id) {
  const o = (s.offers || []).find((x) => x.id === id);
  s.offers = (s.offers || []).filter((x) => x.id !== id);
  if (o) { s.lastEvent = `You passed on "${o.projectTitle.replace('⭐ ', '')}".`; addTimeline(s, `Passed on ${o.projectTitle.replace('⭐ ', '')}.`); }
  return s;
}
