import { emUnread } from '../../systems/meta/email.js';
import { pressUnread } from '../../systems/meta/news.js';
// minAge/stage controls when an app appears. Teen phone (13+) = limited set.
// Each app carries its own colour all the way inside, not just on the icon:
// `accent` tints headings and buttons, `wash` is the light behind the screen.
export const PHONE_APPS = [
  { id: 'spotlight', name: 'Spotlight', icon: '✨', bg: 'linear-gradient(135deg,#ff4db8,#c02a9a)', accent: '#ff6ec7', wash: '#2a1030', badge: () => 0, teen: true },
  { id: 'arcade', name: 'Bird', icon: '🎮', bg: 'linear-gradient(135deg,#3ddc84,#22b06a)', accent: '#4fe39a', wash: '#0e2a20', badge: () => 0, teen: true },
  { id: 'messenger', name: 'Messages', icon: '💬', bg: 'linear-gradient(135deg,#4cd964,#2fb350)', accent: '#5fe07a', wash: '#0f2a1c', badge: (s) => s.stage === 'career' ? (s.offers || []).length : 0, teen: true, careerRole: 'offers' },
  { id: 'opencall', name: 'OpenCall', icon: '🎬', bg: 'linear-gradient(135deg,#ffb020,#e07000)', accent: '#ffb64a', wash: '#2c1c06', badge: (s) => (s.castingPool || []).length, teen: true },
  { id: 'email', name: 'Email', icon: '✉️', bg: 'linear-gradient(135deg,#4a90ff,#2f6ee0)', accent: '#6ba3ff', wash: '#0f1c3a', badge: (s) => emUnread(s), teen: true },
  { id: 'news', name: 'News', icon: '📰', bg: 'linear-gradient(135deg,#ff4d4d,#d32b2b)', accent: '#ff6b6b', wash: '#2e1013', badge: (s) => pressUnread(s), teen: false },
  { id: 'aaa', name: 'AAA', icon: 'AAA', bg: 'linear-gradient(135deg,#2c2c34,#17171c)', accent: '#ffd166', wash: '#1c1a14', badge: () => 0, teen: false, lock: (s) => !((s.filmography || []).length + (s.discography || []).length) },
  { id: 'work', name: 'Work', icon: '💼', bg: 'linear-gradient(135deg,#4a90ff,#2a5fb0)', accent: '#57b8ff', wash: '#0d1f36', badge: () => 0, teen: true },
  { id: 'shopping', name: 'Shop', icon: '🛒', bg: 'linear-gradient(135deg,#ff9f43,#d9761f)', accent: '#ffab55', wash: '#2c1a09', badge: () => 0, teen: true },
  { id: 'dating', name: 'Dating', icon: '💘', bg: 'linear-gradient(135deg,#ff6b9d,#c23566)', accent: '#ff86b0', wash: '#2e1020', badge: (s) => (s.datingPool || []).length, teen: false },
];
export function appById(id) { return PHONE_APPS.find((a) => a.id === id) || null; }
export function visibleApps(s) {
  const career = s.stage === 'career';
  return PHONE_APPS.filter((a) => career || a.teen);
}
