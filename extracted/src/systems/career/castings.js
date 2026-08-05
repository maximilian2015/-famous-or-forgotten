import { rint, chance, pick } from '../../engine/rng.js';
import { addTimeline } from '../../engine/timeline.js';
import { earn, markReleased } from '../../engine/economy.js';
const clamp = (v) => Math.max(0, Math.min(100, v));
const POOLS = {
  actor: {
    series: [['Soap Opera','Recurring',4,3000],['Drama Series','Guest role',3,5000],['Crime Series','Episode',2,4000]],
    film: [['Indie Film','Supporting',3,4000],['Feature Film','Lead',5,12000],['Horror Movie','Victim',2,3500]],
    ads: [['Brand Campaign','Face',1,6000],['Commercial','Actor',1,3500]],
    gigs: [['Theatre Slot','Stage',2,1500],['Voice Session','Voice',1,1200],['TV Extra','Background',1,500]],
  },
  singer: {
    series: [['Music Show','Guest',2,3000],['Talent Series','Judge',3,8000]],
    film: [['Music Video','Star',1,4000],['Concert Film','Headliner',2,9000]],
    ads: [['Jingle','Voice',1,5000],['Brand Song','Artist',1,6000]],
    gigs: [['Open Mic','Performer',1,800],['Festival Slot','Act',1,2000],['Session Work','Session',1,1500]],
  },
};
function titleFor() { const A=['Late','Golden','Silent','Broken','Bright','Lost']; const B=['River','Avenue','Season','Signal','Harbor','Echo']; return `${pick(A)} ${pick(B)}`; }
export function refreshCastingPool(s, force) {
  s.castingPool = s.castingPool || [];
  if (!force && s.castingPool.length >= 6) return;
  const career = s.dream === 'singer' ? 'singer' : 'actor';
  const shelves = POOLS[career];
  s.castingPool = force ? [] : s.castingPool.filter((c) => (c._expires || 0) > ((s.year || 0) * 12 + (s.month || 0)));
  while (s.castingPool.length < 6) {
    const shelf = pick(Object.keys(shelves));
    const [type, role, months, pay] = pick(shelves[shelf]);
    s.castingPool.push({ id: 'cast' + Date.now() + Math.floor(Math.random() * 10000), title: titleFor(), type, role, months, salary: pay, shelf,
      minFame: shelf === 'film' && role === 'Lead' ? 30 : 0, _expires: (s.year || 0) * 12 + (s.month || 0) + rint(2, 4) });
  }
}
export function castingChance(s, c) {
  const skill = s.dream === 'singer' ? s.singing : s.acting;
  // Scandal was purely cosmetic before — it accumulated and did nothing.
  return Math.round(clamp(15 + skill * 0.5 + s.charisma * 0.2 + s.looks * 0.15 + s.luck * 0.1 - (s.scandal || 0) * 0.3));
}
// quality (0-100) comes from the audition minigame: nail the read and your odds jump,
// fumble it and the room cools on you.
export function auditionFor(s, id, quality = 50) {
  const c = (s.castingPool || []).find((x) => x.id === id); if (!c) return s;
  if ((s.fame || 0) < (c.minFame || 0)) { s.lastEvent = 'You need more fame before they will see you for this.'; return s; }
  if ((s.ap || 0) <= 0) { s.lastEvent = 'No energy left this period. Live a bit first.'; return s; }
  s.ap = (s.ap || 0) - 1;
  const odds = clamp(castingChance(s, c) + (quality - 50) * 0.55);
  if (chance(odds)) {
    const skill = s.dream === 'singer' ? s.singing : s.acting;
    // Same rule as a full production: skill keeps you off the floor, the read decides the ceiling.
    const rating = clamp(25 + skill * 0.30 + (quality - 50) * 0.25 + (s.looks - 40) * 0.1 + rint(-8, 14));
    const status = rating >= 85 ? 'Hit' : rating >= 70 ? 'Well-received' : rating >= 50 ? 'Released' : 'Flop';
    const bucket = s.dream === 'singer' ? 'discography' : 'filmography';
    (s[bucket] = s[bucket] || []).unshift({ title: c.title, role: c.role, type: c.type, salary: c.salary, rating, status, year: s.year });
    earn(s, c.salary, `"${c.title}" paid`); markReleased(s); s.fame = clamp(s.fame + rint(1, 3)); s.confidence = clamp(s.confidence + 2);
    s.lastEvent = `${quality >= 80 ? 'The room goes quiet — you nailed it. ' : ''}You booked "${c.title}"! It came out ${status.toLowerCase()} (${Math.round(rating)}/100).`;
    addTimeline(s, `Booked ${c.title}: ${status}.`, rating < 50);
  } else {
    s.mental = clamp(s.mental - 2);
    s.lastEvent = quality < 35
      ? `You fumbled the read for "${c.title}". They thank you before you've finished. No callback.`
      : `You auditioned for "${c.title}" and didn't get it. Next time.`;
    addTimeline(s, `Auditioned for ${c.title} — no callback.`);
  }
  s.castingPool = (s.castingPool || []).filter((x) => x.id !== id);
  return s;
}
export const SHELVES = [['series','Series'],['film','Film'],['ads','Ads'],['gigs','Gigs']];
export const SHELF_BLURB = { series: 'Recurring work — slower money, but your face every week.', film: 'One shot, one release. The credits that define you.', ads: 'Brand money. Pays fast, spends a little credibility.', gigs: 'Small paid work. Keeps the lights on and the reps up.' };
