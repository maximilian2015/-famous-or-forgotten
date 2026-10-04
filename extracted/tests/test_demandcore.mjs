// One calculation for every film in the world.
//
// There were two. demandFor priced your films out of eleven terms; grossFor priced the twenty
// pictures a year the rest of the industry makes out of five, with its own copy of the
// arithmetic AND its own copy of the opening, down to a second literal 0.46. That is not a
// theory about duplication: this week somebody cut the opening constant from 0.46 to 0.29 and
// patched one of the two, and the thing that caught it was a probe asking about something else.
//
// Measured before the refactor, the two models had drifted into different industries: a world
// blockbuster had a median gross of €254m and NEVER passed a billion across 60,000 of them,
// while the player's star passed it in roughly half her tentpoles. Not a balance gap — a
// physics gap.
//
// The constraint on this refactor is the whole of it: the PLAYER'S numbers may not move.
import { demandCore, demandFor, grossFor, openingFor, legsFor, campaignSpend, castDraw } from '../src/systems/career/release.js';
import fs from 'fs';

let fails = 0;
const ok = (n, c, e = '') => { if (!c) { fails++; console.log('FAIL  ' + n + (e ? ' :: ' + e : '')); } else console.log('ok    ' + n); };

// ── 1. the player's films are priced exactly as they were ────────────────────
// demandFor is deterministic given a state and a release — no dice in it at all — so the old
// arithmetic can simply be written out here and the two compared to the unit, across the whole
// space that matters. If this ever disagrees, the refactor moved somebody's career.
const APPEAL = { Horror: 1.35, 'Sci-Fi': 1.25, Comedy: 1.1, Thriller: 1.05, Crime: 0.95, Musical: 0.85, Romance: 0.8, Drama: 0.7 };
const MUSCLE = { blockbuster: 86, feature: 52, prestige: 30, indie: 20, festival: 12, small: 10 };
// The eleven-term version as it stood before the split, kept here as the reference. It reads
// its inputs rather than a state, because the point is the ARITHMETIC, not the plumbing.
function demandBefore({ fame, withFame, buzz, scale, genre, appetite, campaignTier, part, lastRating, appealMod, anticipation, tour, remind }) {
  let d = 6;
  d += castDraw([fame || 0, withFame || 0]) * 0.52;
  d += (buzz || 0) * 0.28;
  d += Math.min(26, Math.sqrt(Math.max(0, campaignSpend({ scale, campaignTier }))) * 2.1);
  d += (MUSCLE[scale] ?? 40) * 0.22;
  d *= 0.52 + appetite * 0.48;
  d *= 0.45 + ((APPEAL[genre] || 1) * 0.55);
  const p = part || 1;
  if (p > 1) {
    const fam = [0, 0, 16, 19, 19, 16, 13][Math.min(6, p)] ?? 11;
    const tired = [0, 0, 0, 4, 10, 18, 26][Math.min(6, p)] ?? 30;
    const last = lastRating ?? 65;
    d += fam - tired * (last >= 75 ? 0.25 : last >= 60 ? 0.6 : 1.2);
  }
  d += (anticipation || 0) * 2.5;
  d *= (tour ?? 1) * (remind ?? 1);
  d *= 0.55 + (appealMod ?? 1) * 0.45;
  return Math.max(2, Math.round(d));
}

{
  const SCALES = ['small', 'festival', 'indie', 'prestige', 'feature', 'blockbuster'];
  const GENRES = Object.keys(APPEAL);
  const TIERS = ['minimal', 'standard', 'major', 'event'];
  let n = 0, bad = 0, worst = null;
  for (const scale of SCALES) for (const genre of GENRES) for (const campaignTier of TIERS) {
    for (const fame of [0, 17, 45, 78, 100]) for (const withFame of [0, 62]) {
      for (const buzz of [0, 31]) for (const part of [1, 2, 4, 7]) for (const lastRating of [40, 65, 88]) {
        for (const appetite of [0.6, 1, 1.4]) for (const appealMod of [0.4, 1, 1.6]) {
          for (const anticipation of [-0.8, 0, 1.1]) for (const tour of [1, 1.22]) {
            const args = { scale, genre, appetite, campaignTier, part, lastRating, appealMod, buzz, anticipation, tour, remind: 1 };
            const now = demandCore({ ...args, cast: [fame, withFame] });
            const was = demandBefore({ ...args, fame, withFame });
            n++;
            if (now !== was) { bad++; if (!worst) worst = `${scale}/${genre}/${campaignTier} fame ${fame}: ${was} → ${now}`; }
          }
        }
      }
    }
  }
  ok(`the shared core prices a film exactly as the old one did, across ${n.toLocaleString()} combinations`, bad === 0, worst || '');
}

// ── and demandFor itself still hands it the same things ──────────────────────
{
  const s = { fame: 72, media: 28, hypeSource: null, year: 2066, month: 4, typecast: { scores: {}, active: [] }, acting: 70 };
  const rel = { scale: 'blockbuster', genre: 'Sci-Fi', campaignTier: 'event', part: 1, appealMod: 1, withFame: 55, rating: 80, reception: 82 };
  const a = demandFor(s, rel), b = demandFor(s, rel);
  ok('demandFor has no dice in it, so a refactor of it is checkable at all', a === b, `${a} vs ${b}`);
  ok('and it still returns a sane index for a star tentpole', a > 60 && a < 130, String(a));
}

// ── 2. world films go through the same model ─────────────────────────────────
{
  const src = fs.readFileSync(new URL('../src/systems/career/release.js', import.meta.url), 'utf8');
  const g = src.slice(src.indexOf('export function grossFor({'), src.indexOf('export function grossFor({') + 1200);
  ok('grossFor no longer carries its own copy of the demand', !/let d = 6;/.test(g));
  ok('and calls the shared core instead', /demandCore\(/.test(g));
  ok('and no longer carries its own copy of the opening', !/Math\.pow\(demand, 1\.45\)/.test(g));
  ok('and goes through openingFor like everything else', /openingFor\(/.test(g));
  // 3. ONE source of truth for the opening constant.
  const literals = (src.match(/\* 0\.46 \*/g) || []).length;
  ok('the opening constant exists once, as a name', literals === 0 && /const OPEN_K = /.test(src) && /\* OPEN_K \* wide/.test(src), `${literals} bare literals left`);
}

// ── 4. world films may use world data, and nothing invented ──────────────────
{
  const src = fs.readFileSync(new URL('../src/systems/career/release.js', import.meta.url), 'utf8');
  const g = src.slice(src.indexOf('export function grossFor({'), src.indexOf('export function grossFor({') + 900);
  ok('a world film can carry a second name on the poster', /withFame/.test(g));
  ok('and which part of a series it is', /part/.test(g) && /lastRating/.test(g));
  // The four things only a person does must not be faked for a film nobody is promoting.
  ok('but no world film is given hype, a press tour or reminders', !/buzz|tourMultiplier|remindLift|anticipation/.test(g),
    (g.match(/buzz|tourMultiplier|remindLift|anticipation/) || [''])[0]);
  // And the defaults are nothing, so omitting them costs exactly nothing rather than something.
  const bare = demandCore({ scale: 'feature', genre: 'Drama', cast: [50], appetite: 1, campaignTier: 'standard' });
  const spelled = demandCore({ scale: 'feature', genre: 'Drama', cast: [50], appetite: 1, campaignTier: 'standard', buzz: 0, anticipation: 0, tour: 1, remind: 1 });
  ok('and leaving them out is the same as passing nothing', bare === spelled, `${bare} vs ${spelled}`);
}

// ── 3. a world blockbuster can now be enormous, rarely ───────────────────────
// Before the refactor it could not: 60,000 of them and not one passed a billion, because the
// four missing terms were most of what gets a film there. This does not assert a rate — tuning
// comes later and is not this commit — only that the ceiling exists at all.
{
  const out = [];
  for (let i = 0; i < 30000; i++) {
    out.push(grossFor({ scale: 'blockbuster', rating: 60 + Math.random() * 36, genre: 'Sci-Fi',
      fame: 70 + Math.random() * 30, withFame: Math.random() < 0.4 ? 40 + Math.random() * 50 : 0,
      trend: 0.9 + Math.random() * 0.3, part: Math.random() < 0.3 ? 2 : 1, lastRating: 78 }));
  }
  out.sort((a, b) => a - b);
  const m = (p) => Math.round(out[Math.floor(out.length * p)] / 1e6);
  const bn = out.filter((x) => x >= 1e9).length;
  console.log(`      world blockbuster: median €${m(0.5)}m · P90 €${m(0.9)}m · P99 €${m(0.99)}m · past €1bn ${(bn / out.length * 100).toFixed(2)}%`);
  ok('a film the rest of the industry made can reach a billion', bn > 0, '0 of 30,000');
  ok('and it is not the ordinary result', bn / out.length < 0.5, `${(bn / out.length * 100).toFixed(1)}%`);
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
