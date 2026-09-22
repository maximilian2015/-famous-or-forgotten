// What you wanted, at ten. Every life used to be the same climb toward the same top; the
// review that gave us the story chains asked for an ambition chosen early — blockbuster
// star, respected actor, television face, the famous one, or simply a working life — so
// the same numbers can be a triumph in one life and a consolation in another. It is
// chosen in the age-ten daydream (life/youth.js), it leans the stories a little, and at
// the end the Legacy page says whether you got what you wanted, which is a different
// question from whether you got a lot.
export const AMBITIONS = {
  star: { label: 'A movie star', want: 'The biggest pictures, the biggest posters, your name above the title.', fx: { charisma: 3, confidence: 3, acting: 2 } },
  serious: { label: 'A serious actor', want: 'The parts people talk about for years. An Asker on a shelf.', fx: { acting: 5, discipline: 3 } },
  tv: { label: 'A face on television', want: 'A show people come home to. Years of it.', fx: { charisma: 4, discipline: 2 } },
  face: { label: 'Famous', want: 'Known everywhere, for whatever it takes. The covers, the crowds, the name.', fx: { charisma: 5, looks: 2 } },
  working: { label: 'A working actor', want: 'Work every year, a roof, and never to have to do anything else.', fx: { discipline: 4, mental: 3 } },
};
export const AMBITION_ORDER = ['star', 'serious', 'tv', 'face', 'working'];
export function ambitionOf(s) { return AMBITIONS[s.ambition] ? s.ambition : null; }

// How far the life has come toward the thing it wanted, 0..1, and the line for it.
export function ambitionProgress(s) {
  const id = ambitionOf(s); if (!id) return null;
  const films = (s.filmography || []).filter((c) => !c.minor);
  const peak = s.peakFame || s.fame || 0;
  let v = 0, line = '';
  if (id === 'star') {
    const tent = films.filter((c) => c.scale === 'blockbuster' || c.tier === 'tentpole');
    const gross = films.reduce((n, c) => Math.max(n, c.boxOffice || c.gross || 0), 0);
    v = Math.min(1, tent.length / 4 * 0.5 + Math.min(1, peak / 85) * 0.3 + Math.min(1, gross / 3e8) * 0.2);
    line = `${tent.length} tentpole${tent.length === 1 ? '' : 's'}, a peak of ${Math.round(peak)}${gross ? `, a biggest opening of €${Math.round(gross / 1e6)}m` : ''}.`;
  } else if (id === 'serious') {
    const wins = ((s.awards && s.awards.wins) || []).length, noms = ((s.awards && s.awards.nominations) || []).length;
    const good = films.filter((c) => (c.rating || 0) >= 80).length;
    v = Math.min(1, wins * 0.5 + noms * 0.15 + Math.min(1, good / 6) * 0.3 + Math.min(1, (s.respect || 0) / 60) * 0.2);
    line = `${wins} Asker${wins === 1 ? '' : 's'}, ${noms} nomination${noms === 1 ? '' : 's'}, ${good} film${good === 1 ? '' : 's'} rated eighty or better, standing ${Math.round(s.respect || 0)}.`;
  } else if (id === 'tv') {
    const seasons = films.filter((c) => c.episodes && c.scale !== 'episode').length;
    const shows = new Set(films.filter((c) => c.episodes && c.scale !== 'episode').map((c) => String(c.title).replace(/\s*·\s*season.*$/i, ''))).size;
    v = Math.min(1, seasons / 8 * 0.7 + Math.min(1, peak / 60) * 0.3);
    line = `${seasons} season${seasons === 1 ? '' : 's'} of ${shows} show${shows === 1 ? '' : 's'}, a peak of ${Math.round(peak)}.`;
  } else if (id === 'face') {
    const minor = (s.filmography || []).filter((c) => c.minor && /Brand|Cover|Fashion|Commercial/.test(c.type || '')).length;
    v = Math.min(1, Math.min(1, peak / 90) * 0.6 + Math.min(1, minor / 30) * 0.2 + Math.min(1, (s.peakHype || 0) / 70) * 0.2);
    line = `A peak of ${Math.round(peak)}, ${minor} cover${minor === 1 ? '' : 's'} and campaign${minor === 1 ? '' : 's'}.`;
  } else if (id === 'working') {
    const years = new Set(films.map((c) => c.year)).size;
    const debt = s._debtMonths || 0;
    v = Math.min(1, Math.min(1, years / 20) * 0.6 + Math.min(1, films.length / 25) * 0.3 + (debt === 0 ? 0.1 : 0));
    line = `${films.length} credit${films.length === 1 ? '' : 's'} across ${years} year${years === 1 ? '' : 's'}${debt ? `, ${debt} month${debt === 1 ? '' : 's'} in debt` : ', never in debt'}.`;
  }
  return { id, label: AMBITIONS[id].label, want: AMBITIONS[id].want, progress: v, met: v >= 0.75, line };
}
// The verdict at the end (Legacy). Getting what you wanted is worth something on the
// stone; getting a great deal of something else is a different sentence.
export function ambitionVerdict(s) {
  const p = ambitionProgress(s); if (!p) return null;
  const v = p.progress;
  const text = v >= 0.75 ? `You wanted to be ${p.label.toLowerCase()}, and you were.`
    : v >= 0.4 ? `You wanted to be ${p.label.toLowerCase()}. You got some of the way there, which is further than most.`
    : `You wanted to be ${p.label.toLowerCase()}. It did not go that way. It went another way, and some of that was good.`;
  return { ...p, text, points: v >= 0.75 ? 150 : v >= 0.4 ? 50 : 0 };
}
// The stories lean a little toward the thing you wanted (stories.js).
export function ambitionLean(s, kind) {
  const id = ambitionOf(s); if (!id) return 1;
  if (kind === 'reality' && id === 'face') return 1.5;
  if (kind === 'brand' && id === 'serious') return 0.6;
  if (kind === 'tvpath' && id === 'tv') return 1.4;
  if (kind === 'tent' && id === 'star') return 1.2;
  return 1;
}
