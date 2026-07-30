import { emUnread } from '../../systems/meta/email.js';
import { pressUnread } from '../../systems/meta/news.js';
// minAge/stage controls when an app appears. Teen phone (13+) = limited set.
export const PHONE_APPS = [
  { id: 'spotlight', name: 'Spotlight', icon: '✨', bg: 'linear-gradient(135deg,#ff4db8,#c02a9a)', badge: () => 0, teen: true },
  { id: 'arcade', name: 'Bird', icon: '🎮', bg: 'linear-gradient(135deg,#3ddc84,#22b06a)', badge: () => 0, teen: true },
  { id: 'messenger', name: 'Messages', icon: '💬', bg: 'linear-gradient(135deg,#4cd964,#2fb350)', badge: (s) => s.stage === 'career' ? (s.offers || []).length : 0, teen: true, careerRole: 'offers' },
  { id: 'opencall', name: 'OpenCall', icon: '🎬', bg: 'linear-gradient(135deg,#ffb020,#e07000)', badge: (s) => (s.castingPool || []).length, teen: true },
  { id: 'email', name: 'Email', icon: '✉️', bg: 'linear-gradient(135deg,#4a90ff,#2f6ee0)', badge: (s) => emUnread(s), teen: true },
  { id: 'news', name: 'News', icon: '📰', bg: 'linear-gradient(135deg,#ff4d4d,#d32b2b)', badge: (s) => pressUnread(s), teen: false },
  { id: 'aaa', name: 'AAA', icon: 'AAA', bg: 'linear-gradient(135deg,#2c2c34,#17171c)', badge: () => 0, teen: false, lock: (s) => !((s.filmography || []).length + (s.discography || []).length) },
  { id: 'dating', name: 'Dating', icon: '💘', bg: 'linear-gradient(135deg,#ff6b9d,#c23566)', badge: (s) => (s.datingPool || []).length, teen: false },
];
export function visibleApps(s) {
  const career = s.stage === 'career';
  return PHONE_APPS.filter((a) => career || a.teen);
}
