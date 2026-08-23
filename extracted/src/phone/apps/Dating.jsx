import { useEffect, useState } from 'react';
import { theme } from '../../ui/theme.js';
import { dispatch } from '../../state/store.js';
import { onCooldown } from '../../engine/cooldown.js';
import { relBand } from '../../systems/life/bonds.js';
import { refreshDatingPool, goOnDate, proposeMarriage, moveInTogether, canMoveIn,
  divorce, settlement, wantsOf, meansOf, whoPays, DATES, DATE_ORDER, dateCost, WEDDINGS, WEDDING_ORDER,
  weddingCost, PROPOSE_AT, MOVE_IN_AT } from '../../systems/life/dating.js';
import { spouseOf, tryForBaby, fertility, fertilityNote, applyToAdopt, adoptCost, adoptionOdds,
  livingChildren, ADOPT_MONTHS } from '../../systems/life/children.js';

function btn(disabled, kind) {
  return { width: '100%', border: 'none', borderRadius: 10, padding: '9px', fontSize: 12.5, fontWeight: 800,
    cursor: disabled ? 'default' : 'pointer',
    background: disabled ? 'rgba(120,110,150,.15)' : kind === 'bad' ? 'rgba(255,106,138,.16)'
      : `linear-gradient(135deg,${theme.accent2},${theme.accent})`,
    color: disabled ? '#6b6390' : kind === 'bad' ? theme.bad : '#fff' };
}
const card = { background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 12, padding: '11px 13px', marginBottom: 9 };

// The four evenings, priced for who you have become, and labelled with what this particular
// person actually thinks of each one. See systems/life/dating.js.
function Evenings({ g, person, tag }) {
  const w = wantsOf(person);
  const used = onCooldown(g, tag);
  return (<div>
    {DATE_ORDER.map((key) => {
      const d = DATES[key], cost = dateCost(g, key);
      const broke = (g.cash || 0) < cost, noEnergy = d.energy && (g.ap || 0) < d.energy;
      const off = used || broke || noEnergy;
      const loves = w.likes.includes(key), hates = w.hates.includes(key);
      const theirs = whoPays(g, person, key) === 'them';
      return (<button key={key} onClick={() => dispatch(goOnDate, key, person.id)} disabled={used || noEnergy || (broke && !theirs)}
        style={{ ...card, width: '100%', textAlign: 'left', cursor: off ? 'default' : 'pointer',
          opacity: off ? 0.45 : 1, color: theme.text,
          border: `1px solid ${loves ? theme.good + '55' : hates ? theme.bad + '44' : theme.line}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 13.5, fontWeight: 800 }}>{d.label}</span>
          <span style={{ fontSize: 12, fontWeight: 900, color: theirs ? theme.good : theme.gold }}>
            {theirs ? 'they pay' : `€${cost.toLocaleString()}`}{d.energy ? ' · 1 energy' : ''}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, lineHeight: 1.45 }}>
          {d.blurb}
          {loves && <span style={{ color: theme.good }}> They would love this.</span>}
          {hates && <span style={{ color: theme.bad }}> Not their thing at all.</span>}
        </div>
      </button>);
    })}
    {used && <div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', padding: '2px 0 6px' }}>
      You have had your evening this month.
    </div>}
  </div>);
}

function Who({ p, sub }) {
  const b = relBand(p.relationship || 0);
  const w = wantsOf(p);
  // Somebody you have never taken out is not "Cold" — they are nobody yet, and labelling a
  // stranger with the same word the game uses for a friendship you ruined reads as a bug.
  const stranger = !(p.dates > 0) && !p.livingTogether && !p.marriedOn;
  return (<div style={{ marginBottom: 10 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <div style={{ fontSize: 16, fontWeight: 900 }}>{p.name}</div>
      <div style={{ fontSize: 11.5, fontWeight: 800, color: stranger ? theme.muted : b.tone === 'bad' ? theme.bad : b.tone === 'good' ? theme.good : theme.muted }}>
        {stranger ? 'You have not met properly' : b.label}
      </div>
    </div>
    <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>{sub}</div>
    <div style={{ fontSize: 11.5, color: theme.gold, marginTop: 4, fontWeight: 700 }}>{meansOf(p).label}</div>
    <div style={{ fontSize: 11.5, color: theme.accent, marginTop: 6, fontWeight: 700 }}>{w.label}</div>
    <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 2, lineHeight: 1.45 }}>{w.blurb}</div>
  </div>);
}

// Two ways to have one, and the second is not a consolation prize — it is slower, it costs
// money, and the child arrives already a person. See systems/life/children.js.
function Children({ g, spouse }) {
  const odds = spouse ? fertility(g, spouse) : 0;
  const note = spouse ? fertilityNote(g, spouse) : '';
  const cost = adoptCost(g);
  const app = g.adoption;
  const young = (g.ageY || 0) < 21;
  if (young) return null;
  return (<div>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, margin: '4px 0 7px' }}>
      Children {livingChildren(g).length ? `· ${livingChildren(g).length}` : ''}
    </div>
    {spouse && <button onClick={() => dispatch(tryForBaby)} disabled={onCooldown(g, 'baby') || odds <= 0} style={btn(onCooldown(g, 'baby') || odds <= 0)}>
      {odds <= 0 ? 'Not on your own' : onCooldown(g, 'baby') ? 'Give it a month' : `Try for a baby · ${odds}%`}
    </button>}
    {note && <div style={{ fontSize: 11.5, color: odds <= 0 ? theme.bad : theme.gold, marginTop: 6, lineHeight: 1.45 }}>{note}</div>}
    {/* Adopting on your own is harder and it is allowed — 52% against 78%. It was written
        that way and then only ever rendered inside the married branch, so nobody single
        could reach the button at all. */}
    {!spouse && <div style={{ fontSize: 11.5, color: theme.muted, marginBottom: 7, lineHeight: 1.5 }}>
      They would rather there were two of you. They do not require it.
    </div>}
    {app ? (
      <div style={{ ...card, marginTop: 9 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>The application is in</div>
        <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, lineHeight: 1.45 }}>
          {app.left} more month{app.left === 1 ? '' : 's'} of somebody in an office reading about your life. They put your chances at {app.odds}%.
        </div>
      </div>
    ) : (
      <button onClick={() => dispatch(applyToAdopt)} disabled={(g.cash || 0) < cost}
        style={{ ...btn((g.cash || 0) < cost), marginTop: 8, background: (g.cash || 0) < cost ? 'rgba(120,110,150,.15)' : 'rgba(158,116,255,.16)', color: (g.cash || 0) < cost ? '#6b6390' : '#d9cffa' }}>
        {(g.cash || 0) < cost ? `Adopt · €${cost.toLocaleString()}` : `Apply to adopt · €${cost.toLocaleString()} · ${adoptionOdds(g)}%`}
      </button>
    )}
    {!app && <div style={{ fontSize: 11, color: theme.muted, marginTop: 6, lineHeight: 1.45 }}>
      About {ADOPT_MONTHS} months of waiting, and they look at everything — the drinking, the headlines, all of it.
    </div>}
  </div>);
}

export function Dating({ g }) {
  const [asking, setAsking] = useState(false);
  const [prenup, setPrenup] = useState(false);
  const [ending, setEnding] = useState(false);
  useEffect(() => {
    if (!g.partner && !spouseOf(g) && (!g.datingPool || !g.datingPool.length)) dispatch((s) => refreshDatingPool(s));
  }, [g.partner, g.datingPool]);

  const spouse = spouseOf(g);

  // ── married ────────────────────────────────────────────────────────────────
  if (spouse) {
    const kids = (g.family || []).filter((p) => p.relation === 'Child' && p.alive);
    const take = settlement(g, spouse);
    if (ending) {
      return (<div>
        <div style={{ ...card, borderColor: theme.bad + '55' }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: theme.bad }}>End the marriage</div>
          <div style={{ fontSize: 11.5, color: theme.muted, margin: '6px 0 4px', lineHeight: 1.55 }}>
            {spouse.prenup
              ? `You both signed something before the wedding. It holds: ${spouse.name.split(' ')[0]} leaves with €${take.toLocaleString()}.`
              : `There was no paperwork. ${spouse.name.split(' ')[0]} leaves with half of everything — €${take.toLocaleString()}.`}
          </div>
          {kids.length > 0 && <div style={{ fontSize: 11.5, color: theme.bad, lineHeight: 1.5 }}>
            {kids.length === 1 ? 'Your child' : `Your ${kids.length} children`} will most likely live with them. You will see them when the schedule allows.
          </div>}
        </div>
        <button onClick={() => { dispatch(divorce, false); setEnding(false); }} style={btn(false, 'bad')}>File</button>
        <button onClick={() => setEnding(false)} style={{ ...btn(false), marginTop: 8, background: 'rgba(158,116,255,.16)', color: '#d9cffa' }}>Not today</button>
      </div>);
    }
    return (<div>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Married</div>
      <div style={card}>
        <Who p={spouse} sub={`${spouse.job}, ${spouse.age}${spouse.prenup ? ' · signed a prenup' : ''}`} />
        <Children g={g} spouse={spouse} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, margin: '14px 0 8px' }}>An evening</div>
      <Evenings g={g} person={spouse} tag={'fam:' + spouse.id} />
      <button onClick={() => setEnding(true)} style={{ ...btn(false, 'bad'), marginTop: 6 }}>End the marriage</button>
    </div>);
  }

  // ── seeing someone ─────────────────────────────────────────────────────────
  if (g.partner) {
    const p = g.partner;
    const move = canMoveIn(g);
    const ready = (p.relationship || 0) >= PROPOSE_AT;
    if (asking) {
      return (<div>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>How you do it</div>
        {WEDDING_ORDER.map((key) => {
          const w = WEDDINGS[key], cost = weddingCost(g, key);
          const broke = cost > 0 && (g.cash || 0) < cost;
          return (<button key={key} onClick={() => { dispatch(proposeMarriage, key, prenup); setAsking(false); }} disabled={broke}
            style={{ ...card, width: '100%', textAlign: 'left', cursor: broke ? 'default' : 'pointer', opacity: broke ? .45 : 1, color: theme.text }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 13.5, fontWeight: 800 }}>{w.label}</span>
              <span style={{ fontSize: 12, fontWeight: 900, color: cost < 0 ? theme.good : theme.gold }}>
                {cost < 0 ? `they pay €${Math.abs(cost).toLocaleString()}` : `€${cost.toLocaleString()}`}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, lineHeight: 1.45 }}>{w.blurb}</div>
          </button>);
        })}
        <button onClick={() => setPrenup(!prenup)} style={{ ...card, width: '100%', textAlign: 'left', cursor: 'pointer',
          color: theme.text, border: `1px solid ${prenup ? theme.gold : theme.line}` }}>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>{prenup ? '✓ ' : ''}Ask them to sign first</div>
          <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, lineHeight: 1.45 }}>
            The least romantic conversation two people can have. It makes them likelier to say no, and it is
            the difference between half of everything and a number you can live with.
          </div>
        </button>
        <button onClick={() => setAsking(false)} style={{ ...btn(false), background: 'rgba(158,116,255,.16)', color: '#d9cffa' }}>Not yet</button>
      </div>);
    }
    return (<div>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>
        Seeing {p.livingTogether ? '· living together' : ''}
      </div>
      <div style={card}><Who p={p} sub={`${p.job}, ${p.age}`} /></div>
      <Evenings g={g} person={p} tag="partner" />
      <Children g={g} spouse={null} />
      {!p.livingTogether && <button onClick={() => dispatch(moveInTogether)} disabled={!move.ok} style={{ ...btn(!move.ok), marginBottom: 8 }}>
        {move.ok ? 'Ask them to move in' : `Move in together · needs ${MOVE_IN_AT} closeness`}
      </button>}
      <button onClick={() => setAsking(true)} disabled={!ready || onCooldown(g, 'propose')} style={btn(!ready || onCooldown(g, 'propose'))}>
        {ready ? 'Propose' : `Propose · needs ${PROPOSE_AT} closeness`}
      </button>
    </div>);
  }

  // ── nobody yet ─────────────────────────────────────────────────────────────
  const pool = g.datingPool || [];
  return (<div>
    <div style={{ fontSize: 11.5, color: theme.muted, padding: '2px 2px 8px', lineHeight: 1.5 }}>
      People open to meeting somebody. Two evenings that go well and it becomes a thing —
      but they are all looking for something different, and one of them is looking for your name.
    </div>
    {!pool.length && <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: 22 }}>Nobody new right now. Check back later.</div>}
    <Children g={g} spouse={null} />
    {pool.map((p) => (<div key={p.id} style={card}>
      <Who p={p} sub={`${p.job}, ${p.age}${p.dates ? ` · ${p.dates} evening${p.dates > 1 ? 's' : ''} so far` : ''}`} />
      <Evenings g={g} person={p} tag={'date:' + p.id} />
    </div>))}
  </div>);
}
