import { useState } from 'react';
import { dispatch } from '../../state/store.js';
import { count } from '../../engine/text.js';
import { canTakeSet, monthsUntilFree } from '../../engine/sets.js';
import { isHit, isFlop } from '../../systems/meta/knownFor.js';
import { sequelDue } from '../../systems/career/franchise.js';
import { pushState, askToPush } from '../../systems/career/contract.js';
import { isMinor } from '../../systems/meta/legacy.js';
import { theme } from '../theme.js';
import { money, allSets } from '../helpers.js';
import { Poster } from './Poster.jsx';
import { Reviews } from './BigMoment.jsx';
import { TitleLine } from './TitleLine.jsx';
import { INK } from './Diary.jsx';

// What a real listing prints under the title, derived the way a listing would: a runtime
// from the size of the thing, and a certificate from the genre. Decoration, and it is what
// makes a row read as a film rather than a database record.
function runtimeOf(c) {
  let h = 0; for (let i = 0; i < String(c.title).length; i++) h = (h * 31 + c.title.charCodeAt(i)) >>> 0;
  const jitter = h % 16;
  if (c.season || c.episodes) return `${42 + (h % 4) * 6}m`;
  const mins = { small: 64, indie: 92, feature: 106, blockbuster: 136 }[c.scale] || 100;
  const m = mins + jitter;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}
function certOf(c) {
  const tv = !!(c.season || c.episodes);
  const g = c.genre || '';
  if (g === 'Horror') return tv ? 'TV-MA' : '18';
  if (g === 'Crime' || g === 'Thriller') return tv ? 'TV-14' : '15';
  if (g === 'Comedy' || g === 'Musical') return tv ? 'TV-PG' : 'PG';
  return tv ? 'TV-14' : '12A';
}
// Grouped the way IMDb does it, which is not the same rule for everything:
// a series is ONE entry with its year range and total episodes, while films — sequels
// included — each get their own line. "Golden Echo" and "Golden Echo II" are two films.
function seriesRoot(c) {
  // Strip EVERY accumulated season suffix — old saves carry titles like
  // "Lost Signal · season 2 · season 3" from before that bug was fixed.
  return String(c.title || '').replace(/(\s*·\s*season\s+\d+)+\s*$/i, '').trim();
}
function groupCredits(list) {
  const out = [];
  const shows = new Map();
  for (const c of list) {
    if (c.season) {                                   // television
      const root = seriesRoot(c);
      if (!shows.has(root)) { const g = { root, parts: [], series: true }; shows.set(root, g); out.push(g); }
      shows.get(root).parts.push(c);
    } else {                                          // film, one line each
      out.push({ root: c.title, parts: [c], series: false });
    }
  }
  return out.map((g) => {
    const best = g.parts.reduce((a, b) => ((b.rating || 0) > (a.rating || 0) ? b : a));
    const years = g.parts.map((p) => p.year).filter(Boolean);
    const seasonNos = g.series ? g.parts.map((p) => p.season).filter(Boolean) : [];
    return { ...g, best,
      seasons: g.series ? g.parts.length : 0,
      // Which seasons were yours: a show you joined in its eighth year reads "Seasons 8–10".
      seasonFrom: seasonNos.length ? Math.min(...seasonNos) : 0, seasonTo: seasonNos.length ? Math.max(...seasonNos) : 0,
      episodes: g.series ? g.parts.reduce((n, p) => n + (p.episodes || 0), 0) : 0,
      askers: g.parts.reduce((n, p) => n + (p.asker || 0), 0),
      askerNoms: g.parts.reduce((n, p) => n + (p.nominated || 0), 0),
      askerPicture: g.parts.reduce((n, p) => n + (p.askerPicture || 0), 0),
      from: Math.min(...years), to: Math.max(...years),
      earned: g.parts.reduce((n, p) => n + (p.salary || 0), 0),
      // A franchise's gross is the whole run; a show's audience is the best season it had.
      boxOffice: g.parts.reduce((n, p) => n + (p.boxOffice || 0), 0),
      viewers: g.parts.reduce((n, p) => Math.max(n, p.viewers || 0), 0),
      worldHit: g.parts.some((p) => p.status === 'World Hit'),
      billion: g.parts.some((p) => p.billion) };
  }).sort((a, b) => b.to - a.to);
}
// Reads like a real filmography page: poster, title, star rating out of 10, role, year.
function CreditRow({ group, g }) {
  const c = group.best;
  const r = c.rating || 0;
  // One switch for the whole row now. It used to open only the reviews; it opens the film.
  const [open, setOpen] = useState(false);
  const showReviews = open, setShowReviews = setOpen;
  // Where it sat in its year, if it made the list. See systems/world/yearbook.js.
  const yearEntry = g.world && g.world.years && g.world.years[c.year];
  const ranked = yearEntry && yearEntry.films.find((f) => f.you && f.title === c.title);
  const stars = (r / 10).toFixed(1).replace('.', ',');
  // Framed the way the business remembers them: a hit in gold, a flop in red, the rest plain.
  const hit = isHit(c, g) || group.worldHit;
  const flop = !hit && isFlop(c);
  const starCol = group.worldHit ? theme.gold : r >= 85 ? theme.good : r >= 60 ? theme.gold : theme.muted;
  const tv = !!(c.season || group.series);
  const kind = tv ? 'TV Series' : c.type || 'Feature Film';
  const years = group.from === group.to ? String(group.to) : `${group.from}–${group.to}`;
  const eps = tv ? (group.episodes || c.episodes || 0) : 0;
  return (<div onClick={() => setOpen(!open)} style={{ display: 'flex', gap: 10, padding: '6px 8px', borderRadius: 11, marginBottom: 4, cursor: 'pointer',
    background: group.worldHit ? 'linear-gradient(100deg, rgba(255,209,102,.16), rgba(255,209,102,.04))'
      : hit ? 'linear-gradient(100deg, rgba(255,209,102,.10), rgba(255,209,102,.02))' : flop ? 'rgba(255,106,138,.05)' : 'transparent',
    border: `${hit || group.worldHit ? '1.5px' : '1px'} solid ${group.worldHit ? 'rgba(255,209,102,.6)' : hit ? 'rgba(255,209,102,.45)' : flop ? 'rgba(255,106,138,.3)' : theme.line}` }}>
    <Poster title={group.root} type={c.type} genre={c.genre} director={c.director} tall size={46} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>{group.root}</div>
      {/* line two: what it is, when, and which season — the way a listing says it */}
      <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>
        {kind}{c.genre && c.genre !== kind ? ` · ${c.genre}` : ''} ({years}){tv && group.seasons ? ` · ${group.seasonFrom > 1 ? (group.seasons > 1 ? `Seasons ${group.seasonFrom}–${group.seasonTo}` : `Season ${group.seasonFrom}`) : group.seasons > 1 ? count(group.seasons, 'season') : 'Season 1'}` : ''}{c.part > 1 ? ` · Part ${c.part}` : ''}
      </div>
      {/* line three: the score and the small print */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3, flexWrap: 'wrap', fontSize: 11.5 }}>
        {c.running
          ? <span style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase', color: theme.gold }}>
              {(c.tv || !['small', 'indie', 'festival', 'feature', 'blockbuster'].includes(c.scale)) ? `On air · episode ${Math.max(1, Math.round(((c.weeks || 0) / Math.max(1, c.weeksTotal || 1)) * (c.episodes || 1)))} of ${c.episodes || '?'}` : `In cinemas · week ${c.weeks || 0} of ${c.weeksTotal}`}</span>
          : <span style={{ fontWeight: 900, color: starCol }}>★ {stars}</span>}
        <span style={{ color: theme.muted }}>{group.to}</span>
        {eps > 0 && <span style={{ color: theme.muted }}>{eps}eps</span>}
        <span style={{ color: theme.muted, fontSize: 10.5, border: '1px solid rgba(255,255,255,.18)', borderRadius: 3, padding: '0 4px', lineHeight: '15px' }}>{certOf(c)}</span>
        <span style={{ color: theme.muted }}>{runtimeOf(c)}</span>
      </div>
      {/* line four: who directed it, and the part */}
      <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3 }}>
        {c.director ? <span style={{ color: theme.text, opacity: .85 }}>{c.director}</span> : null}
        {c.director ? ' · ' : ''}{c.role}
        {/* makeCharacter returns an OBJECT - { name, what, tier } - and rendering it whole threw
            React #31 and took the whole filmography screen down with it. The autoplayer could
            not catch this: it never lands a part, so it never reaches a screen with a credit on
            it, which is the exact limitation written into tests/autoplay.mjs. */}
        {(() => { const ch = c.character; const name = typeof ch === 'string' ? ch : (ch && ch.name) || null;
          return name ? <span> · as <span style={{ color: theme.text, fontWeight: 700 }}>{name}</span></span> : null; })()}
        {c.with ? <span> · with <span style={{ color: c.withIcon ? theme.gold : theme.text, fontWeight: 700 }}>{c.with}</span></span> : null}
      </div>
      {/* What the network decided. Maxi, playing: "the season ended in 2075 and I am at the
          end of 2076 — is this a bug or what?" It was not a bug: the decision is made when
          the run closes (60 of 60 seasons in a probe, about seven months after the wrap)
          and the filmography never said a word about it. A show's fate lives on the credit
          now, where you go looking for it. See career/franchise.js maybeContinue. */}
      {c.renewal && (<div style={{ fontSize: 11, fontWeight: 700, margin: '4px 0 2px',
        color: c.renewal === 'renewed' || c.renewal === 'moved' ? theme.good : c.renewal === 'capped' || c.renewal === 'finale' ? theme.muted : theme.bad }}>
        {c.renewal === 'renewed' ? `📺 Renewed for season ${(c.season || 1) + 1}`
          : c.renewal === 'moved' ? `📺 Cancelled, and then saved. Somebody else bought it for season ${(c.season || 1) + 1} — a shorter order and less money, and it is still on.`
          : c.renewal === 'finale' ? `📺 Cancelled, and then given an ending: one special, two hours, and everybody came back for it.`
          : c.renewal === 'writtenOut' ? `📺 Renewed for season ${(c.season || 1) + 1} — without you. Your character was written out.`
          : c.renewal === 'capped' ? `📺 It ended here. ${c.season || 1} season${(c.season || 1) === 1 ? '' : 's'}, and the format ran its course.`
          : `📺 Not renewed.${c.endViewers ? ` It finished on ${c.endViewers}m.` : ''}`}
      </div>)}
      {/* The studio said no. A name in the room can push — favours.js. */}
      {c.sequelDead && <div style={{ fontSize: 11, color: theme.muted, margin: '4px 0 2px', fontWeight: 700 }}>📝 The sequel was announced and never made. Three writers, a director who left, and a studio that stopped answering.</div>}
      {(() => { const sq = sequelDue(g, c.title); if (!sq) return null; const MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return (<div style={{ fontSize: 11, color: theme.gold, margin: '4px 0 2px', fontWeight: 700 }}>📝 "{String(sq.title).replace('⭐ ', '')}" is greenlit — cameras around {MONS[sq.due % 12]} {Math.floor(sq.due / 12)}; the contract comes half a year before. They want you back.</div>); })()}
      {/* The "push for a sequel" favour lived here behind `false &&` for a year. It was not
          broken, it was REPLACED (c3aefbb): a sequel is offered to you when a picture earns
          one, or pitched yourself from your own sofa. Disabling a thing and leaving it is how
          a codebase fills with features nobody can reach and nobody dares delete. */}
      {/* One line of result on the collapsed row, because that is what a filmography is FOR.
          Compacting it put the verdict behind the press along with everything else, and a
          festival film that never found a distributor then said nothing at all about its own
          fate — Maxi, twice now: "но байер, он никогда не вышел что ли?" */}
      {!c.running && (c.verdict || c.critical) && (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 3, fontSize: 10.5, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase' }}>
          {c.verdict && <span style={{ color: VERDICT_COL[c.verdict] || theme.muted }}>
            {c.verdict === 'unsold' ? 'never released' : c.verdict}</span>}
          {c.critical && <span style={{ color: CRIT_COL[c.critical] || theme.muted, fontWeight: 700, letterSpacing: 0, textTransform: 'none', fontSize: 11 }}>{c.critical}</span>}
          {/* A billion euros is not a verdict and does not replace one — it stands beside it,
              and a picture is allowed to read PROFITABLE · WORLD HIT · BILLION CLUB all at
              once. On the collapsed row, because it is the loudest thing about a film and
              should not need a tap to find. career/billion.js */}
          {group.billion && <span style={{ color: theme.gold }}>💰 billion club</span>}
        </div>)}
      {open && <>
      {/* the marks that never come off, and what it made */}
      {(group.worldHit || hit || group.askers > 0 || group.askerNoms > 0 || c.comeback > 0 || group.boxOffice > 0 || group.viewers > 0 || c.festival) && (
        <div style={{ fontSize: 10.5, marginTop: 4, display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
          {group.worldHit ? <span style={{ fontWeight: 900, color: theme.gold }}>🌍 WORLD HIT</span>
            : hit ? <span style={{ fontWeight: 900, letterSpacing: '.06em', color: theme.gold }}>★ HIT</span>
            : c.cult ? <span style={{ fontWeight: 900, letterSpacing: '.06em', color: theme.accent }}>🌙 CULT CLASSIC · {c.cult}</span> : null}
          {/* Where it screened, and what happened there. See release.js, the festival. */}
          {c.festival && <span style={{ fontWeight: 900, letterSpacing: '.06em', color: c.festival.result === 'prize' ? theme.gold : c.festival.result === 'sold' ? theme.good : theme.muted }}>
            🎞️ {String(c.festival.name).replace(/^the /, '').toUpperCase()} · {c.festival.result === 'prize' ? 'PRIZE' : c.festival.result === 'sold' ? 'SOLD' : 'NEVER RELEASED'}</span>}
          {/* Maxi, looking at CROISETTE · NO BUYER · UNSOLD: "я так и не понял, этот фильм не
              вышел?" Two labels and a verdict, none of which says the thing. It is a real and
              ordinary outcome - most festival films never find a distributor - and it should be
              a sentence, not a stamp. */}
          {c.verdict === 'unsold' && <span style={{ color: theme.muted, fontSize: 11 }}>
            Screened, and nobody bought it. It never opened.</span>}
          {/* Two different prizes. One of them is yours and one of them is the film's, and a
              credit that won only Best Picture must not read as an award you carried home. */}
          {group.askers - group.askerPicture > 0 && <span style={{ fontWeight: 900, letterSpacing: '.06em', color: theme.gold }}>🏆 ASKER{group.askers - group.askerPicture > 1 ? ` ×${group.askers - group.askerPicture}` : ''}</span>}
          {group.askerPicture > 0 && <span style={{ fontWeight: 900, letterSpacing: '.06em', color: theme.gold }}>🏆 ASKER FOR BEST PICTURE</span>}
          {/* Being up for one follows a picture around for ever too, and nothing said so. */}
          {group.askers === 0 && group.askerNoms > 0 && <span style={{ fontWeight: 900, letterSpacing: '.06em', color: theme.gold, opacity: .75 }}>🏆 ASKER NOMINEE{group.askerNoms > 1 ? ` ×${group.askerNoms}` : ''}</span>}
          {c.comeback > 0 && <span style={{ fontWeight: 900, letterSpacing: '.06em', color: theme.accent }}>↩ COMEBACK · AFTER {c.comeback} YEARS</span>}
          {(group.boxOffice > 0 || group.viewers > 0) && <span style={{ color: theme.text, fontWeight: 700 }}>
            {group.boxOffice > 0 ? `${money(group.boxOffice)} box office` : `${group.viewers}m watched`}</span>}
          {/* What it had to clear. A verdict is now measured against the budget AND the campaign,
              which is the only sum the trades mean — so the gross on its own is unreadable. */}
          {group.boxOffice > 0 && c.needed > 0 && <span style={{ color: theme.muted, fontSize: 10.5 }}>
            needed {money(c.needed)}</span>}
          {c.verdict && !c.running && <span style={{ fontWeight: 900, letterSpacing: '.07em', textTransform: 'uppercase', fontSize: 9.5,
            color: VERDICT_COL[c.verdict] || theme.muted }}>{c.verdict}</span>}
          {/* Two more, kept deliberately apart from the money. A picture can lose everything,
              be the best-reviewed thing of its year and be the making of you, all at once. */}
          {c.critical && !c.running && <span style={{ color: CRIT_COL[c.critical] || theme.muted, fontSize: 10.5, fontWeight: 700 }}>
            {c.critical}</span>}
          {c.career && !c.running && c.careerTone !== 'flat' && <span style={{ fontSize: 10.5, fontWeight: 700,
            color: c.careerTone === 'gold' ? theme.gold : c.careerTone === 'good' ? theme.good : theme.bad }}>
            {c.career}{c.careerRespect ? ` · standing ${c.careerRespect > 0 ? '+' : ''}${c.careerRespect}` : ''}
            {c.careerFame ? ` · fame ${c.careerFame > 0 ? '+' : ''}${c.careerFame}` : ''}</span>}
          {ranked && <span style={{ fontWeight: 900, letterSpacing: '.06em', color: ranked.rank <= 3 ? theme.gold : theme.muted }}>#{ranked.rank} OF {c.year}</span>}
          {/* What was written, on the same row as the marks — it used to cost every credit
              a line of its own. world/critics.js keeps it from the night the run closed. */}
          {c.reviews && !c.running && <button onClick={() => setShowReviews(!showReviews)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 10.5, fontWeight: 800, color: theme.accent }}>
            Kinomark {c.reviews.grade} · {c.reviews.audience.toFixed(1)}/{c.reviews.critics.toFixed(1)} {showReviews ? '▾' : '▸'}
          </button>}
        </div>
      )}
      {/* Nothing to mark, and still something written: the button stands on its own. */}
      {/* What it was about, and the version of it you argued for on the first day. Both have
          been carried on every credit since the story room was built and never shown. */}
      {c.premise && <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, lineHeight: 1.45 }}>{c.premise}</div>}
      {c.acceptance && !c.running && (
        <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, fontStyle: 'italic' }}>{c.acceptance}</div>)}
      {/* What happened while they were shooting it. The test: after a picture wraps, can the
          player say what it WAS? Written at wrap, career/production.js onSetStory. */}
      {!!(c.onSet && c.onSet.length) && (<div style={{ marginTop: 5, paddingTop: 5, borderTop: `1px solid ${theme.line}` }}>
        <div style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.muted, marginBottom: 3 }}>On set</div>
        {c.onSet.map((l, i) => (<div key={i} style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.45 }}>· {l}</div>))}
      </div>)}
            {c.reviews && <Reviews page={c.reviews} accent={theme.gold} compact />}
      </>}
    </div>
  </div>);
}
const VERDICT_COL = { smash: theme.gold, profitable: theme.good, 'broke even': theme.muted, bomb: theme.bad, watched: theme.good, seen: theme.muted, ignored: theme.bad, unsold: theme.muted };
// The critics' verdict is its OWN column and gets its own colours, because the whole point of
// showing it next to the money is that the two of them disagree.
const CRIT_COL = { acclaimed: theme.gold, 'well received': theme.good, mixed: theme.muted,
  'poorly reviewed': theme.bad, panned: theme.bad };
export function CreditsList({ g, credits, label }) {
  const shooting = allSets(g);
  return (<div>
    {shooting.length > 0 && (<div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.gold, marginBottom: 8 }}>In production · {shooting.length}</div>
      {shooting.map((p) => (<div key={p.id || p.title} style={{ display: 'flex', gap: 11, padding: '10px 2px', borderBottom: `1px solid ${theme.line}`, opacity: .85 }}>
        <Poster title={p.title} type={p.type} genre={p.genre} director={(p.crew || [])[0] && p.crew[0].name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <TitleLine g={g} kind="set" id={p.id} title={p.title} size={14} />
          <div style={{ fontSize: 11.5, color: theme.gold, margin: '4px 0 3px' }}>{p.prepLeft > 0 ? `Preparing · ${p.prepLeft} mo` : `Shooting · ${p.monthsLeft} mo left`}</div>
          <div style={{ fontSize: 11.5, color: theme.muted }}>{p.role}{p.genre ? ` · ${p.genre}` : ''}</div>
        </div>
      </div>))}
    </div>)}
    {/* Signed, not shooting. A paper you signed for a date months out — the studio's date,
        or the month you wrap what you are on — is as real a project as the one on the
        floor, and the list used to pretend it did not exist until cameras rolled. */}
    {(() => {
      const now = (g.year || 0) * 12 + (g.month || 0);
      const waiting = (g.offers || []).filter((o) => o.signed);
      if (!waiting.length) return null;
      return (<div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: INK.signed, marginBottom: 8 }}>Signed · {waiting.length}</div>
        {waiting.map((o) => {
          const title = String(o.projectTitle || '').replace('⭐ ', '');
          const start = Math.max(o.startAt || 0, now + (canTakeSet(g, o).ok ? 0 : monthsUntilFree(g, o)));
          const away = Math.max(0, start - now);
          return (<div key={o.id} style={{ display: 'flex', gap: 11, padding: '9px 2px', borderBottom: `1px solid ${theme.line}`, opacity: .85 }}>
            <Poster title={title} type={o.type} genre={o.genre} director={o.director} size={46} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <TitleLine g={g} kind="offer" id={o.id} title={title} size={13.5} />
              <div style={{ fontSize: 11.5, color: INK.signed, margin: '3px 0 2px' }}>
                {away === 0 ? 'Cameras any month now' : `Cameras in ${count(away, 'month')}`}{o.prep ? ` · ${o.prep} mo preparation first` : ''}
              </div>
              {/* They hold a part two months past the date on the paper and then they cast
                  somebody else. If you are not going to make it, the card says so. */}
              {(() => { const MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const dies = (o.startAt || 0) + 2;
                if (!o.startAt || canTakeSet(g, o).ok || dies < now) return null;
                const late = start > dies;
                // And the move you have, which until now there was not one of. The letter from
                // business affairs says they will recast; this card said the same thing in
                // fewer words; neither of them let you do anything about a set running long
                // that you did not choose either. pushState says whether there is an ask left
                // and what it is worth, and the odds go on the button before it is pressed.
                const ps = pushState(g, o);
                return (<>
                  <div style={{ fontSize: 11, color: late ? theme.bad : theme.gold, lineHeight: 1.4, marginBottom: 2 }}>
                    {late ? `⚠ They cast somebody else in ${MONS[dies % 12]} — you are not free until ${MONS[start % 12]}.`
                      : `They hold it until ${MONS[dies % 12]}.`}
                  </div>
                  {late && ps && (ps.asked
                    ? <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.4, marginBottom: 3 }}>
                        {ps.asked === 'yes' ? 'The agent asked and they moved it once. Not twice.' : 'The agent asked. They said the date stands.'}
                      </div>
                    : <button onClick={() => dispatch(askToPush, o.id)} style={{ width: '100%', textAlign: 'left', marginBottom: 4,
                        background: 'transparent', border: `1px solid ${theme.line}`, borderRadius: 9, padding: '6px 9px',
                        cursor: 'pointer', color: theme.text, font: 'inherit', fontSize: 11.5, fontWeight: 700 }}>
                        Have the agent ask them to move it to {MONS[ps.free % 12]}
                        <div style={{ fontSize: 10.5, fontWeight: 500, color: theme.muted, marginTop: 1 }}>{ps.odds}% · you only get to ask once</div>
                      </button>)}
                </>); })()}
              <div style={{ fontSize: 11.5, color: theme.muted }}>{o.role}{o.genre ? ` · ${o.genre}` : ''}</div>
            </div>
          </div>);
        })}
      </div>);
    })()}
    {/* Shot, cut, not out. The wait is half the game now — it should be visible. */}
    {(g.releases || []).length > 0 && (() => {
      const now = (g.year || 0) * 12 + (g.month || 0);
      const queue = [...g.releases].sort((a, b) => a.due - b.due);
      return (<div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.accent, marginBottom: 8 }}>
          In post · {queue.length}
        </div>
        {queue.map((r) => {
          const left = Math.max(0, r.due - now);
          return (<div key={r.id} style={{ display: 'flex', gap: 11, padding: '10px 2px', borderBottom: `1px solid ${theme.line}`, opacity: .85 }}>
            <Poster title={r.title} type={r.type} genre={r.genre} director={r.director} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <TitleLine g={g} kind="release" id={r.id} title={r.title} size={14} />
              <div style={{ fontSize: 11.5, color: theme.accent, margin: '4px 0 3px' }}>
                Opens in {left <= 1 ? 'weeks' : `${count(left, 'month')}`}
              </div>
              <div style={{ fontSize: 11.5, color: theme.muted }}>{r.role}{r.genre ? ` · ${r.genre}` : ''}</div>
            </div>
          </div>);
        })}
      </div>);
    })()}
    {/* Started, stopped, waiting for money. Not dead, not happening. */}
    {(g.frozen || []).length > 0 && (() => {
      const now = (g.year || 0) * 12 + (g.month || 0);
      return (<div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.bad, marginBottom: 8 }}>
          Frozen · {g.frozen.length}
        </div>
        {g.frozen.map((f) => {
          const waited = Math.max(0, now - (f.since || now));
          return (<div key={f.id} style={{ display: 'flex', gap: 11, padding: '10px 2px', borderBottom: `1px solid ${theme.line}`, opacity: .8 }}>
            <Poster title={f.title} type={f.type} genre={f.genre} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{f.title}</div>
              <div style={{ fontSize: 11.5, color: theme.bad, margin: '4px 0 3px' }}>
                On hold {waited === 0 ? 'since this month' : `${waited} month${waited === 1 ? '' : 's'}`} · {f.monthsLeft} mo left to shoot
              </div>
              <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.45 }}>They say {f.why}.</div>
              {/* How much longer anyone is going to hold your part open. */}
              {f.patience != null && (() => { const left = f.patience - waited;
                return (<div style={{ fontSize: 10.5, marginTop: 3, color: left <= 6 ? theme.bad : theme.muted }}>
                  {left <= 0 ? 'They have stopped waiting for you.'
                    : left <= 6 ? `They will not hold it much past ${left} more month${left === 1 ? '' : 's'}.`
                    : `They will hold your part for about ${left} more months.`}
                </div>); })()}
            </div>
          </div>);
        })}
      </div>);
    })()}
    {(() => {
      const real = credits.filter((c) => !isMinor(c));
      const odd = credits.filter(isMinor);
      const groups = groupCredits(real);
      const hits = real.filter((c) => (c.rating || 0) >= 85).length;
      const world = real.filter((c) => c.status === 'World Hit').length;
      return (<>
        {/* The header a real listing has: how many, of what, sorted how. Maxi's screenshot
            read "13 Film/TV, 0 Commercial Credits · Sorted by Most Recent". */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>{real.length} Film/TV, {credits.length - real.length} Commercial Credit{credits.length - real.length === 1 ? '' : 's'}</div>
            <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>Sorted by most recent</div>
          </div>
          {hits > 0 && <div style={{ fontSize: 10.5, fontWeight: 800 }}>
            <span style={{ color: theme.good }}>{hits} hit{hits === 1 ? '' : 's'}</span>
            {world > 0 && <span style={{ color: theme.gold }}> · {world} world</span>}
          </div>}
        </div>
        {/* Two films can share a title in an old save, so the row key needs the year too. */}
        {real.length === 0
          ? <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: 20, lineHeight: 1.6 }}>Nothing released yet.<br />Audition in OpenCall, or take an offer in Messages.</div>
          : groups.map((gr, i) => <CreditRow key={`${gr.root}-${gr.to}-${i}`} group={gr} g={g} />)}
        <OtherWork list={odd} />
      </>);
    })()}
  </div>);
}
// Ads, voice sessions, days as an extra. Kept — it is part of the story of a career, and
// "I did shampoo commercials for six years" is worth remembering — but with no score and
// out of the count, because it is not a filmography.
function OtherWork({ list }) {
  const [open, setOpen] = useState(false);
  if (!list.length) return null;
  const earned = list.reduce((n, c) => n + (c.salary || 0), 0);
  return (<div style={{ marginTop: 14 }}>
    <button onClick={() => setOpen(!open)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}>
      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted }}>
        Other work · {list.length}
      </span>
      <span style={{ fontSize: 10.5, color: theme.muted, marginLeft: 8 }}>
        €{earned.toLocaleString()} · ads, voice, extra work {open ? '▾' : '▸'}
      </span>
    </button>
    {open && list.map((c, i) => (
      <div key={c.title + c.year + i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 2px', borderBottom: `1px solid ${theme.line}`, fontSize: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{c.title}</div>
          <div style={{ fontSize: 10.5, color: theme.muted }}>{c.role} · {c.type}</div>
        </div>
        <div style={{ textAlign: 'right', flex: 'none' }}>
          <div style={{ fontSize: 11, color: theme.muted, fontVariantNumeric: 'tabular-nums' }}>{c.year}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.gold }}>€{(c.salary || 0).toLocaleString()}</div>
        </div>
      </div>
    ))}
  </div>);
}
