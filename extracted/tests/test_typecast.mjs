import { typecastAfterCredit, typecastYear, typeFit, typeFactor, activeLabels, isStrong, typecastScandal, LABELS, labelInfo, GENRE_LABEL } from '../src/systems/meta/typecast.js';
import { refreshCastingPool, castingChance } from '../src/systems/career/castings.js';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };
const st = (over) => ({ version: 'x', name: 'Mira Vale', ageY: 30, stage: 'career', dream: 'actor', fame: 40, respect: 20, acting: 60, charisma: 50, looks: 50, luck: 50, scandal: 0, year: 2050, month: 2, timeline: [], filmography: [], peakFame: 40, hasApartment: true, housing: 'room', ap: 100, cash: 5000, genreXP: {}, ...over });

// ── the label comes from the work ───────────────────────────────────────────────
{
  const s = st();
  for (let i = 0; i < 2; i++) typecastAfterCredit(s, { title: 'H' + i, genre: 'Horror', rating: 60, tier: 'lead', scale: 'indie' });
  ok('two dark parts are not a label yet', activeLabels(s).length === 0);
  typecastAfterCredit(s, { title: 'H2', genre: 'Thriller', rating: 62, tier: 'lead', scale: 'feature' });
  ok('three are: the villain face', activeLabels(s).includes('villain') && !isStrong(s, 'villain'), activeLabels(s).join(','));
  ok('and the timeline says so', s.timeline.some((x) => /villain face/.test(x.text)));
  for (let i = 0; i < 2; i++) typecastAfterCredit(s, { title: 'C' + i, genre: 'Crime', rating: 70, tier: 'lead', scale: 'feature' });
  ok('five is a strong label', isStrong(s, 'villain'));
  // the board and the room read it
  ok('a horror part is on type', typeFit(s, { genre: 'Horror', scale: 'indie', type: 'Horror Movie' }) > 0.5 && typeFactor(s, { genre: 'Horror', scale: 'indie', type: 'Horror Movie' }) > 1);
  ok('a romance is against type', typeFit(s, { genre: 'Romance', scale: 'feature', type: 'Feature Film' }) < -0.5 && typeFactor(s, { genre: 'Romance', scale: 'feature', type: 'Feature Film' }) < 1);
  ok('the odds move with it', castingChance(s, { genre: 'Horror', scale: 'indie', type: 'Horror Movie', role: 'Lead', room: { want: 'craft', readers: 2, field: 50 } }) > castingChance(s, { genre: 'Romance', scale: 'indie', type: 'Indie Film', role: 'Lead', room: { want: 'craft', readers: 2, field: 50 } }));
}
// ── television ─────────────────────────────────────────────────────────────────
{
  const s = st();
  for (let i = 0; i < 3; i++) typecastAfterCredit(s, { title: 'S', genre: 'Drama', rating: 60, tier: 'lead', scale: 'recurring', tv: true, episodes: 20, season: i + 1 });
  ok('three seasons make a television actor', activeLabels(s).includes('tv'));
  // Three seasons of a drama also make you a dramatic actor, so the studio's DRAMA is a
  // wash — it is the picture that is not your genre where television is the whole story.
  ok('and the studios think of you as television', typeFit(s, { genre: 'Comedy', scale: 'feature', type: 'Feature Film' }) < 0, String(typeFit(s, { genre: 'Comedy', scale: 'feature', type: 'Feature Film' })));
}
// ── it fades ───────────────────────────────────────────────────────────────────
{
  const s = st();
  for (let i = 0; i < 3; i++) typecastAfterCredit(s, { title: 'R' + i, genre: 'Romance', rating: 60, tier: 'lead', scale: 'feature' });
  ok('a romantic lead', activeLabels(s).includes('romantic'));
  for (let y = 0; y < 2; y++) typecastYear(s);
  ok('two quiet years and the word is gone', !activeLabels(s).includes('romantic'), activeLabels(s).join(','));
}
// ── the stories make a scandal celebrity; a strong label thins the board against it ───
{
  const s = st({ respect: 45 });
  for (let i = 0; i < 5; i++) typecastScandal(s, 1);
  ok('five stories and you are the scandal', isStrong(s, 'scandal'));
  // the scandal label marks the studio feature as against type; the board sends fewer of them
  const share = (x) => { let f = 0, n = 0; for (let i = 0; i < 60; i++) { refreshCastingPool(x, true); n += x.castingPool.length; f += x.castingPool.filter((c) => c.scale === 'feature' || c.scale === 'prestige').length; } return f / n; };
  const a = share(s), b = share(st({ respect: 45 }));
  ok('the serious rooms send less', a < b, `${(100 * a).toFixed(1)}% vs ${(100 * b).toFixed(1)}%`);
  ok('a feature reads against type for the scandal celebrity', typeFit(s, { genre: 'Drama', scale: 'feature', type: 'Feature Film' }) <= -0.5);
}
// ── the genre you are (Maxi: only comedies, or only thrillers) ──────────────────
{
  const s = st();
  for (let i = 0; i < 2; i++) typecastAfterCredit(s, { title: 'C' + i, genre: 'Comedy', rating: 65, tier: 'lead', scale: 'feature' });
  ok('two comedies are not a type yet', !activeLabels(s).some((x) => /^g:/.test(x)));
  typecastAfterCredit(s, { title: 'C3', genre: 'Comedy', rating: 65, tier: 'lead', scale: 'feature' });
  ok('three and you are a comic actor', activeLabels(s).includes('g:Comedy') && labelInfo('g:Comedy').label === 'A comic actor');
  ok('and the timeline says it in words', s.timeline.some((x) => /a comic actor/.test(x.text)));
  ok('a comedy reads easy', typeFit(s, { genre: 'Comedy', scale: 'feature', type: 'Feature Film' }) > 0);
  ok('and a thriller reads as a stretch', typeFit(s, { genre: 'Thriller', scale: 'feature', type: 'Feature Film' }) < 0);
  ok('the odds move with it', castingChance(s, { genre: 'Comedy', scale: 'feature', type: 'Feature Film', role: 'Lead', room: { want: 'craft', readers: 2, field: 50 } }) > castingChance(s, { genre: 'Thriller', scale: 'feature', type: 'Feature Film', role: 'Lead', room: { want: 'craft', readers: 2, field: 50 } }));
  for (let y = 0; y < 5; y++) typecastYear(s);
  ok('and five quiet years take it off you', !activeLabels(s).includes('g:Comedy'));
  // a career spread across genres never earns one
  const w = st(); const gs = ['Drama','Comedy','Horror','Thriller','Sci-Fi','Romance','Crime','Musical'];
  for (let i = 0; i < 24; i++) { typecastAfterCredit(w, { title: 'X' + i, genre: gs[i % 8], rating: 65, tier: 'lead', scale: 'feature' }); if (i % 2 === 1) typecastYear(w); }
  ok('a career across eight genres is not typecast by genre', !activeLabels(w).some((x) => /^g:/.test(x)), activeLabels(w).join(','));
}
// ── the child star ───────────────────────────────────────────────────────────────
{
  const s = st({ ageY: 18, peakFame: 30, fame: 30 });
  typecastYear(s);
  ok('famous before eighteen: the former child star', activeLabels(s).includes('child'));
  ok('every label has a name and a line', Object.values(LABELS).every((l) => l.label && l.blurb));
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
