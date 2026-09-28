import { theme } from '../../ui/theme.js';
import { dispatch } from '../../state/store.js';
import { onCooldown } from '../../engine/cooldown.js';
import { findClassmates, pokeFriend, spotlightFeed } from '../../systems/social/spotlight.js';
import { followers, fmtFollowers, followerLine, natural, overIndex, postsFor, canPost, post,
  postedThisMonth, canScroll, theScroll, social } from '../../systems/social/posting.js';
import { inCareer } from '../../engine/stage.js';

// The account you had at school, later. Maxi: "yes, let us do social media — what role will
// it play?" The role is in systems/social/posting.js: followers are the only reach in the
// game nobody has to give you, and you pay for them in privacy and in standing.
//
// It is deliberately the same app. The handle is the one you made at fourteen, the friends
// grew up and left, and strangers filled the space — which is what happened to everybody who
// got famous after about 2006.
export function Spotlight({ g }) {
  const feed = spotlightFeed(g);
  const friends = (g.spotlight || []).filter((f) => !f.grownUp);
  const career = inCareer(g);
  const handle = '@' + String(g.name || 'you').toLowerCase().replace(/[^a-z]/g, '');
  const btn = (off) => ({ width: '100%', border: 'none', borderRadius: 9, padding: '7px', fontSize: 12, fontWeight: 800,
    cursor: off ? 'default' : 'pointer', background: off ? 'rgba(120,110,150,.15)' : 'rgba(158,116,255,.18)', color: off ? '#6b6390' : '#d9cffa' });
  const usedFind = onCooldown(g, 'find');
  const so = career ? social(g) : null;
  const over = career ? overIndex(g) : 0;
  const scroll = canScroll(g);
  return (
    <div>
      {/* ── the profile ─────────────────────────────────────────────────────── */}
      <div style={{ background: theme.panel2, borderRadius: 12, padding: '10px 12px', marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>{handle}</div>
          {career && <div style={{ fontSize: 15, fontWeight: 900, color: over >= 1.25 ? '#ff6ec7' : theme.text, flex: 'none' }}>
            {fmtFollowers(followers(g))}
          </div>}
        </div>
        {career
          ? (<>
              <div style={{ fontSize: 11, color: theme.muted, marginTop: 1 }}>
                followers · somebody at your level usually has {fmtFollowers(natural(g))}
              </div>
              <div style={{ fontSize: 11.5, color: over >= 1.25 ? '#ff9ad8' : theme.muted, lineHeight: 1.45, marginTop: 5 }}>{followerLine(g)}</div>
            </>)
          : <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>{friends.length} connections · keep them close — some go far</div>}
      </div>

      {/* ── posting ─────────────────────────────────────────────────────────── */}
      {career && (<div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: '#ff6ec7', marginBottom: 6 }}>Post something</div>
        {so && so.lastLine && (<div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5, background: theme.panel, borderRadius: 10, padding: '8px 10px', marginBottom: 8 }}>
          {so.lastLine}
        </div>)}
        {postedThisMonth(g)
          ? (<div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', padding: '10px 8px', lineHeight: 1.5, background: theme.panel, borderRadius: 10 }}>
              You have posted this month. More than that and it stops being a decision and starts being a habit,
              and the habit is the thing that gets people.
            </div>)
          : postsFor(g).map((p) => {
              const fit = canPost(g, p.id);
              return (<div key={p.id} style={{ marginBottom: 7 }}>
                <button onClick={() => dispatch(post, p.id)} disabled={!fit.ok}
                  style={{ width: '100%', textAlign: 'left', border: 'none', borderRadius: 10, padding: '8px 11px',
                    cursor: fit.ok ? 'pointer' : 'default', background: fit.ok ? 'rgba(255,110,199,.13)' : 'rgba(120,110,150,.12)',
                    color: fit.ok ? '#ffc3e8' : '#6b6390' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 800 }}>{p.label}</span>
                    <span style={{ fontSize: 10.5, opacity: .75, flex: 'none' }}>{p.cost} energy</span>
                  </div>
                  <div style={{ fontSize: 11, opacity: .8, lineHeight: 1.4, marginTop: 2 }}>{p.hint}</div>
                </button>
              </div>);
            })}
      </div>)}

      {/* ── the replies ─────────────────────────────────────────────────────── */}
      {career && (<div style={{ marginBottom: 14 }}>
        <button onClick={() => dispatch(theScroll)} disabled={!scroll.ok}
          style={{ width: '100%', border: `1px solid ${theme.line}`, borderRadius: 10, padding: '8px 11px', fontSize: 12,
            fontWeight: 800, cursor: scroll.ok ? 'pointer' : 'default', background: 'transparent', color: scroll.ok ? theme.muted : '#6b6390' }}>
          {scroll.ok ? 'Read the replies · free' : 'You have read them this month'}
        </button>
        <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 4, lineHeight: 1.45 }}>
          Costs nothing and takes nothing from the day. It only takes something from you.
        </div>
      </div>)}

      {/* ── school ──────────────────────────────────────────────────────────── */}
      {!career && (<>
        <button onClick={() => dispatch(findClassmates, 1)} disabled={usedFind}
          style={{ width: '100%', border: 'none', borderRadius: 10, padding: '9px', fontSize: 12.5, fontWeight: 800, cursor: usedFind ? 'default' : 'pointer', background: usedFind ? 'rgba(120,110,150,.15)' : `linear-gradient(135deg,${theme.accent2},${theme.accent})`, color: usedFind ? '#6b6390' : '#fff', marginBottom: usedFind ? 6 : 12 }}>
          + Find people from school
        </button>
        {usedFind && <div style={{ fontSize: 11, color: theme.muted, textAlign: 'center', marginBottom: 12 }}>You've reached out to someone new this month.</div>}
      </>)}
      {/* The school-friends app is empty forever for anybody who did not use it as a teen,
          and it was still telling a fifty-year-old to go and find classmates. */}
      {!feed.length && !career && <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: 20, lineHeight: 1.6 }}>
        {(g.ageY || 0) >= 40
          ? 'Nobody from school is on here any more. That window closes, and yours has.'
          : 'No one in your feed yet. Find classmates to connect.'}</div>}
      {!!feed.length && career && <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 6 }}>Still on here from school</div>}
      {feed.map((p) => (
        <div key={p.id} style={{ background: theme.panel, borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{p.name}</div>
            <div style={{ fontSize: 10.5, color: theme.muted }}>{p.handle}</div>
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 8px' }}>{p.name.split(' ')[0]} {p.post} · closeness {p.closeness}</div>
          <button onClick={() => dispatch(pokeFriend, p.id)} disabled={onCooldown(g, 'poke:' + p.id)} style={btn(onCooldown(g, 'poke:' + p.id))}>
            {onCooldown(g, 'poke:' + p.id) ? 'Talked this month' : 'Message / hang out'}
          </button>
        </div>
      ))}
    </div>
  );
}
