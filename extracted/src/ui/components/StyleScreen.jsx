import { useState } from 'react';
import { dispatch } from '../../state/store.js';
import { HOUSING_ORDER, HOUSING, DIET, setDiet, GYM_COST, toggleGym } from '../../engine/economy.js';
import { fameTier, setHousing } from '../../systems/meta/status.js';
import { staffBill, upkeepBill, canBuyHome, livingBelow, HOME_PRICE, sellHome, buyHome, STAFF_ORDER, STAFF,
  hasStaff, canHire, fire, hire, THING_ORDER, THINGS, owns, canBuyThing, resaleOf, sellThing,
  buyThing } from '../../systems/life/money.js';
import { faceBill, face as faceOf, needlesLately, frozenFace, healing, apparentAge, CARE, CARE_ORDER,
  careCost, setCare, trainerCost, toggleTrainer, needleCost, NEEDLE_MONTHS, needle, SURGEONS,
  surgeryOdds, surgeryCost, SURGERY_AGE, surgery } from '../../systems/life/face.js';
import { theme } from '../theme.js';
import { money } from '../helpers.js';
import { Card } from './Card.jsx';
import { Button } from './Button.jsx';

// Rent is the biggest standing bill in the game — the player has to be able to see
// exactly what the extra money buys before spending it.
function HousingEffects({ h }) {
  const chip = (text, good) => ({ key: text, text, good });
  const chips = [];
  if (h.mental) chips.push(chip(`${h.mental > 0 ? '+' : ''}${h.mental} mental / mo`, h.mental > 0));
  if (h.health) chips.push(chip(`${h.health > 0 ? '+' : ''}${h.health} health / mo`, h.health > 0));
  if (h.ill) chips.push(chip(`${h.ill > 0 ? '+' : ''}${h.ill}% illness`, h.ill < 0));
  if (h.ap) chips.push(chip(`+${h.ap} energy`, true));
  if (h.bond !== 1) chips.push(chip(`${h.bond > 1 ? '+' : ''}${Math.round((h.bond - 1) * 100)}% closeness`, h.bond > 1));
  chips.push(chip(h.kids ? 'can raise a child' : 'no room for a child', !!h.kids));
  return (<div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
    {chips.map((c) => (<span key={c.key} style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 7px', borderRadius: 7,
      background: c.good ? 'rgba(95,206,138,.14)' : 'rgba(255,106,138,.14)', color: c.good ? theme.good : theme.bad }}>{c.text}</span>))}
  </div>);
}
// Everything money is spent on, in one place, under four tabs — because the old screen was
// a single scroll of housing, food and a gym membership, and the whole point of the new
// spending is that a player can find it.
const STYLE_TABS = [['home', 'Home'], ['staff', 'People'], ['things', 'Things'], ['body', 'Body']];
export function StyleScreen({ g }) {
  const [tab, setTab] = useState('home');
  const tier = fameTier(g.fame);
  const bill = staffBill(g) + upkeepBill(g) + faceBill(g);
  return (<div>
    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
      {STYLE_TABS.map(([id, label]) => (
        <button key={id} data-sfx="nav" onClick={() => setTab(id)} style={{ flex: 1, padding: '9px 4px', borderRadius: 11, fontSize: 12.5, fontWeight: 800,
          cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${tab === id ? 'transparent' : theme.line}`,
          background: tab === id ? `linear-gradient(165deg, ${theme.accent}, ${theme.accent2})` : theme.panel,
          color: tab === id ? (theme.warm ? '#1a1206' : '#fff') : theme.muted }}>{label}</button>))}
    </div>
    {/* The header already says what you are, so this card no longer repeats it — Maxi: "the
        status a second time, it is not needed". What is left is the one number that is not
        anywhere else: what it costs to keep all of this running every month. */}
    {bill > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px 12px' }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: theme.muted }}>Keeping all this running</div>
      <div style={{ fontSize: 15, fontWeight: 900, color: theme.gold }}>{money(bill)}/mo</div>
    </div>}
    {tab === 'home' && <HomeTab g={g} tier={tier} />}
    {tab === 'staff' && <StaffTab g={g} />}
    {tab === 'things' && <ThingsTab g={g} />}
    {tab === 'body' && <BodyTab g={g} />}
  </div>);
}

function HomeTab({ g, tier }) {
  const allowedIdx = HOUSING_ORDER.indexOf(tier.housingMax);
  const current = g.housing || 'room';
  const buy = canBuyHome(g);
  const ownsThis = g.owns === current;
  return (<div>
    {!g.hasApartment && <div style={{ fontSize: 12.5, color: theme.muted, textAlign: 'center', padding: '10px 12px', marginBottom: 10, lineHeight: 1.6 }}>You still live with your parents. Move out first — then this is your problem.</div>}
    {/* Living below your name costs standing every month — money.js livingBelow. */}
    {(() => { const b = livingBelow(g); return b ? <div style={{ fontSize: 12, color: theme.gold, background: 'rgba(255,209,102,.08)', border: '1px solid rgba(255,209,102,.3)', borderRadius: 10, padding: '9px 11px', marginBottom: 10, lineHeight: 1.5 }}>A {fameTier(g.fame).label.toLowerCase()} in a {(HOUSING[g.housing || 'room'] || HOUSING.room).label.toLowerCase()}. The people who hire you notice where you live — it costs standing every month you stay. A {b.label.toLowerCase()} at least.</div> : null; })()}
    {/* Renting forever is what somebody who has not made it does. */}
    {g.hasApartment && !g.inheritedHome && (<Card style={{ marginBottom: 14, borderColor: ownsThis ? `${theme.good}55` : theme.line }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: ownsThis ? theme.good : theme.accent, marginBottom: 5 }}>
        {ownsThis ? '★ You own this outright' : 'You are renting'}</div>
      <div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.55, marginBottom: 10 }}>
        {ownsThis
          ? `No rent, for as long as you keep it — and it goes to whoever you leave things to. Worth about ${money(Math.round(HOME_PRICE[g.owns] * 0.92))} if it ever has to go.`
          : `€${(HOUSING[current] || HOUSING.room).cost.toLocaleString()} a month, forever, and none of it is yours. ${HOME_PRICE[current] ? `Buying it costs ${money(HOME_PRICE[current])}.` : 'Nobody sells a room in a shared flat.'}`}
      </div>
      {ownsThis
        ? <Button kind="danger" onClick={() => dispatch(sellHome)}>Sell it · {money(Math.round(HOME_PRICE[g.owns] * 0.76))} — a forced sale</Button>
        : <Button kind="pri" disabled={!buy.ok} onClick={() => dispatch(buyHome)}>
            {buy.ok ? `Buy it · ${money(buy.price)}` : buy.why}</Button>}
    </Card>)}
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Where you live</div>
    <div style={{ display: 'grid', gap: 8 }}>
      {HOUSING_ORDER.map((key, i) => {
        const h = HOUSING[key]; const locked = i > allowedIdx; const active = key === current && g.hasApartment;
        const deposit = Math.round(h.cost * 1.5); const canAfford = (g.cash || 0) >= deposit;
        return (<div key={key} style={{ background: active ? `${theme.accent}22` : theme.panel, border: `1px solid ${active ? theme.accent : theme.line}`, borderRadius: 12, padding: '12px 14px', opacity: locked ? .5 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{h.label}{active ? ' · you live here' : ''}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.gold }}>€{h.cost.toLocaleString()}/mo</div>
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3 }}>{h.blurb}</div>
          <div style={{ fontSize: 11.5, color: theme.text, marginTop: 6, lineHeight: 1.5, opacity: .9 }}>{h.perk}</div>
          <HousingEffects h={h} />
          {HOME_PRICE[key] && <div style={{ fontSize: 11, color: theme.muted, marginTop: 5 }}>To own it outright: {money(HOME_PRICE[key])}</div>}
          {locked ? <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 6 }}>🔒 Out of your league for now.</div>
            : !active && g.hasApartment && (<>
                <div style={{ fontSize: 11, color: canAfford ? theme.muted : theme.bad, marginTop: 6 }}>Deposit €{deposit.toLocaleString()}{canAfford ? '' : ' — you cannot cover it'}</div>
                <Button onClick={() => dispatch(setHousing, key)} disabled={!canAfford} style={{ marginTop: 8 }}>Move in</Button>
              </>)}
        </div>); })}
    </div>
  </div>);
}

// The best thing money can buy here is a month with more of it in.
function StaffTab({ g }) {
  return (<div>
    <div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.6, marginBottom: 12 }}>
      People whose whole job is that your month goes better. They are paid every month whether
      you work or not — which is exactly what makes a bad year expensive.
    </div>
    <div style={{ display: 'grid', gap: 8 }}>
      {STAFF_ORDER.map((id) => {
        const st = STAFF[id]; const on = hasStaff(g, id); const fit = canHire(g, id);
        return (<Card key={id} style={{ borderColor: on ? `${theme.good}55` : theme.line }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{st.label}{on ? ' · on the payroll' : ''}</div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: theme.gold }}>{money(st.cost)}/mo</div>
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, lineHeight: 1.5 }}>{st.blurb}</div>
          <div style={{ fontSize: 11.5, color: theme.accent, marginTop: 5, fontWeight: 700 }}>{st.perk}</div>
          {on ? <Button kind="danger" style={{ marginTop: 9 }} onClick={() => dispatch(fire, id)}>Let them go</Button>
            : <Button kind="pri" style={{ marginTop: 9 }} disabled={!fit.ok} onClick={() => dispatch(hire, id)}>
                {fit.ok ? 'Take them on' : fit.why}</Button>}
        </Card>); })}
    </div>
  </div>);
}

// The point of these is not owning them. It is that when it goes wrong, you sell them.
function ThingsTab({ g }) {
  return (<div>
    <div style={{ fontSize: 12.5, color: theme.muted, lineHeight: 1.6, marginBottom: 12 }}>
      Things you own. Some of them hold their value and most of them do not — and every one of
      them can be sold on a bad month, which is how this actually goes.
    </div>
    <div style={{ display: 'grid', gap: 8 }}>
      {THING_ORDER.map((id) => {
        const t = THINGS[id]; const has = owns(g, id); const fit = canBuyThing(g, id);
        const back = has ? resaleOf(g, id) : 0;
        return (<Card key={id} style={{ borderColor: has ? `${theme.gold}55` : theme.line }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{t.label}{has ? ' · yours' : ''}</div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: theme.gold }}>{money(t.price)}</div>
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, lineHeight: 1.5 }}>{t.blurb}</div>
          {t.perk && <div style={{ fontSize: 11.5, color: theme.accent, marginTop: 5, fontWeight: 700 }}>{t.perk}</div>}
          {t.upkeep && <div style={{ fontSize: 11, color: theme.muted, marginTop: 5 }}>Keeping it: {money(t.upkeep)}/mo</div>}
          {has
            ? (<><div style={{ fontSize: 11.5, color: back >= t.price ? theme.good : theme.muted, marginTop: 6 }}>
                Worth {money(back)} now{back >= t.price ? ` — ${money(back - t.price)} up on what you paid` : ''}</div>
              <Button kind="danger" style={{ marginTop: 8 }} onClick={() => dispatch(sellThing, id)}>Sell it · {money(back)}</Button></>)
            : <Button kind="pri" style={{ marginTop: 9 }} disabled={!fit.ok} onClick={() => dispatch(buyThing, id)}>
                {fit.ok ? 'Buy it' : fit.why}</Button>}
        </Card>); })}
    </div>
  </div>);
}

function BodyTab({ g }) {
  return (<div>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>Food</div>
    <div style={{ display: 'grid', gap: 8 }}>
      {Object.entries(DIET).map(([key, d]) => { const active = (g.diet || 'cook') === key;
        return (<div key={key} style={{ background: active ? `${theme.accent}22` : theme.panel, border: `1px solid ${active ? theme.accent : theme.line}`, borderRadius: 12, padding: '11px 13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>{d.label}{active ? ' · now' : ''}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.gold }}>€{d.cost.toLocaleString()}/mo</div>
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 3 }}>{d.blurb}</div>
          {!active && g.hasApartment && <Button onClick={() => dispatch(setDiet, key)} style={{ marginTop: 8 }}>Eat like this</Button>}
        </div>); })}
    </div>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, margin: '16px 0 8px' }}>Body</div>
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 13.5, fontWeight: 800 }}>Gym membership{g.gym ? ' · active' : ''}</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: theme.gold }}>€{GYM_COST}/mo</div>
      </div>
      <div style={{ fontSize: 11.5, color: theme.muted, margin: '3px 0 8px' }}>Slowly raises your looks and keeps the body in shape. Casting rooms notice.</div>
      {g.hasApartment && <Button onClick={() => dispatch(toggleGym)}>{g.gym ? 'Cancel membership' : 'Join the gym'}</Button>}
    </Card>
    <FaceTab g={g} />
    <div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', padding: '14px 10px', lineHeight: 1.6 }}>These are the bills that come every month whether you are working or not. Clothes and haircuts are in the Shop app; what you already own is in your room.</div>
  </div>);
}
// The face: what it is, what is keeping it, and what money can do to it. See life/face.js.
function FaceTab({ g }) {
  const f = faceOf(g); const age = g.ageY || 0; const young = age < 27;
  const lately = needlesLately(g); const frozen = frozenFace(g); const heal = healing(g);
  const line = { fontSize: 11.5, color: theme.muted, marginTop: 3, lineHeight: 1.5 };
  return (<div>
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase', color: theme.muted, margin: '16px 0 8px' }}>The face · looks {Math.round(g.looks || 0)} · {age >= 18 ? `reads as ${apparentAge(g)}` : `${age}`}</div>
    <div style={{ fontSize: 11.5, color: young ? theme.muted : theme.gold, lineHeight: 1.55, marginBottom: 10, padding: '0 2px' }}>
      {young ? `At ${age} the face is what it is. From twenty-seven it starts to go — slowly in the thirties, faster after forty-five — and this is where money slows it.`
        : `At ${age} the face is going: ${age < 35 ? 'slowly' : age < 45 ? 'a little every year' : age < 55 ? 'a few points a year' : 'fast'}. ${f.care === 'none' ? 'Nothing is slowing it.' : `${CARE[f.care].label} is slowing it.`}`}
      {frozen && <span style={{ color: theme.bad }}> The face does not move right now — casting rooms can see it.</span>}
      {heal && <span style={{ color: theme.bad }}> Healing: {f.recovery} more month{f.recovery === 1 ? '' : 's'} before anyone films it.</span>}
    </div>
    <div style={{ display: 'grid', gap: 8 }}>
      {CARE_ORDER.map((k) => { const c = CARE[k]; const active = f.care === k;
        return (<div key={k} style={{ background: active ? `${theme.accent}22` : theme.panel, border: `1px solid ${active ? theme.accent : theme.line}`, borderRadius: 12, padding: '11px 13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>{c.label}{active ? ' · now' : ''}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.gold }}>{c.cost ? `€${careCost(g, k).toLocaleString()}/mo` : 'free'}</div>
          </div>
          <div style={line}>{c.blurb}{young && c.cost ? ' Wasted before twenty-seven.' : ''}</div>
          {!active && <Button onClick={() => dispatch(setCare, k)} style={{ marginTop: 8 }}>{k === 'none' ? 'Stop it all' : 'Start'}</Button>}
        </div>); })}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>A trainer{f.trainer ? ' · every morning' : ''}</div>
          <div style={{ fontSize: 12, fontWeight: 800, color: theme.gold }}>€{trainerCost(g).toLocaleString()}/mo</div>
        </div>
        <div style={line}>Six a.m., every day. Faster than the gym and further — to 86 — and the body that comes with it.</div>
        <Button onClick={() => dispatch(toggleTrainer)} style={{ marginTop: 8 }}>{f.trainer ? 'Let them go' : 'Hire one'}</Button>
      </Card>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>The needle</div>
          <div style={{ fontSize: 12, fontWeight: 800, color: theme.gold }}>€{needleCost(g).toLocaleString()}</div>
        </div>
        <div style={line}>A lunch hour. Two to four points, for about {NEEDLE_MONTHS} months, then they go. {lately ? `${lately} in the last two years. ` : ''}Too often and the face stops moving, and a casting room sees that from the door.</div>
        <Button onClick={() => dispatch(needle)} disabled={(g.cash || 0) < needleCost(g) || age < 22} style={{ marginTop: 8 }}>{age < 22 ? 'Not at ' + age : 'Book it'}</Button>
      </Card>
      {Object.entries(SURGEONS).map(([k, sg]) => { const o = surgeryOdds(g, k); const cost = surgeryCost(g, k); const off = (g.cash || 0) < cost || age < SURGERY_AGE || heal || !!g.production;
        return (<Card key={k}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>{sg.label}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.gold }}>€{cost.toLocaleString()}</div>
          </div>
          <div style={line}>{sg.blurb} Two months healing, no set. <span style={{ color: theme.good }}>{o.great}% a new face</span> · {o.fine}% a little better · <span style={{ color: theme.bad }}>{o.botched}% it goes wrong, and everybody can tell</span>.{f.ops.length >= 2 ? ' A third face is a face people talk about.' : ''}</div>
          <Button onClick={() => dispatch(surgery, k)} disabled={off} style={{ marginTop: 8 }}>{age < SURGERY_AGE ? `Not before ${SURGERY_AGE}` : g.production ? 'Not on a set' : heal ? 'Healing' : 'Go under'}</Button>
        </Card>); })}
    </div>
  </div>);
}
