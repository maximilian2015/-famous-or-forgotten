// The poster contact sheet: every credit in a save, drawn by the real Poster, the way the
// filmography shows them (a strip of thumbnails) and large, grouped by what a poster has to say —
// genre, scale, format, and a franchise in order. Built by tools/poster-sheet.mjs; not part of
// the game. It exists so a poster change is judged on a real career, before and after.
import { createRoot } from 'react-dom/client';
import { Poster } from '../../src/ui/components/Poster.jsx';

const credits = window.CREDITS || [];
const ROMAN = / +(II|III|IV|V|VI)$/;
const isTv = (c) => !!(c.season || c.episodes) || /Series|Soap|Show|Drama$/.test(c.type || '');
const groups = [
  ['Comedy', (c) => c.genre === 'Comedy' && !isTv(c)],
  ['Horror', (c) => c.genre === 'Horror' && !isTv(c)],
  ['Blockbuster', (c) => c.scale === 'blockbuster'],
  ['Indie and small', (c) => ['indie', 'small'].includes(c.scale)],
  ['Festival', (c) => c.scale === 'festival'],
  ['Series', (c) => isTv(c) && c.type !== 'Soap Opera'],
  ['Soap', (c) => c.type === 'Soap Opera'],
  ['Commercial', (c) => c.minor || /Campaign|Commercial/.test(c.type || '')],
];
// A franchise in order. The save has parts two; a part three is added by name so the sheet can
// show what the third one looks like next to the first two.
const families = [];
for (const c of credits) {
  if ((c.part || 1) < 2) continue;
  const root = String(c.title).replace(ROMAN, '');
  if (families.some((f) => f.root === root)) continue;
  const first = credits.find((x) => x.title === root) || { ...c, title: root, part: 1 };
  families.push({ root, parts: [first, c, { ...c, title: root + ' III', part: 3 }] });
}
const P = (c, size) => <Poster title={c.title} type={c.type} genre={c.genre} director={c.director} scale={c.scale} tall size={size} />;
const label = (t) => <div style={{ font: '700 11px system-ui', letterSpacing: '.12em', textTransform: 'uppercase', color: '#c9b98f', margin: '18px 0 8px' }}>{t}</div>;
const cap = (c) => <div style={{ font: '10px system-ui', color: '#aaa', width: 126, marginTop: 4, lineHeight: 1.3 }}>{c.title}<br /><span style={{ color: '#777' }}>{c.genre} · {c.type}{c.scale ? ' · ' + c.scale : ''}</span></div>;

function Sheet() {
  return (<div style={{ padding: 16, maxWidth: 820 }}>
    <div style={{ font: '800 18px system-ui', color: '#fff' }}>{window.LABEL || 'Posters'}</div>
    {label(`The filmography strip · ${credits.length} credits, newest first`)}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{[...credits].reverse().map((c, i) => <div key={i}>{P(c, 46)}</div>)}</div>
    {groups.map(([name, f]) => { const list = credits.filter(f).slice(0, 5); if (!list.length) return null;
      return (<div key={name}>{label(name)}<div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>{list.map((c, i) => <div key={i}>{P(c, 126)}{cap(c)}</div>)}</div></div>); })}
    {families.map((f) => (<div key={f.root}>{label(`Franchise · ${f.root}`)}
      <div style={{ display: 'flex', gap: 12 }}>{f.parts.map((c, i) => <div key={i}>{P(c, 126)}{cap(c)}</div>)}</div></div>))}
  </div>);
}
createRoot(document.getElementById('root')).render(<Sheet />);
