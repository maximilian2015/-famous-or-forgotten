// The pieces every career-story file shares (stories.js, storyBigYear.js, storyRecast.js): the list
// of running stories and the small sums they all write the same way. Split out of stories.js so the
// pieces can import them without a cycle; stories.js re-exports stories and storyOf.
export const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
export const stamp = (s) => (s.year || 0) * 12 + (s.month || 0);
export const money = (n) => (n >= 1e6 ? `€${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}m` : `€${Math.round(n).toLocaleString()}`);
export const first = (name) => String(name || '').split(' ')[0];

export function stories(s) { return s.stories || (s.stories = []); }
export function storyOf(s, id) { return stories(s).find((x) => x.id === id) || null; }
