// Five puzzles, and every one of them is a real job on a real set.
//
// Maxi asked for game-shaped minigames — "like minesweeper or battleship" — on top of the
// three thinking days. The rule I set myself is the same as everywhere else here: the
// mechanic has to BE the job, not a puzzle with a film-flavoured label stuck on it.
//
//   frame   a boom in the shot, found the way a minesweeper is found
//   light   where the light actually is, found the way a battleship is found
//   cut     the assembly is nearly right and two shots are the wrong way round
//   pairs   which of them says which line, and two of the lines are almost the same
//   nono    twenty takes, and the notes say how many good ones ran together
//
// Same contract as the rest: a difficulty, and one number 0..100 back.
import { useState, useMemo } from 'react';
import { theme } from '../theme.js';
import { play } from '../sfx.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const GO = (off) => ({
  width: '100%', border: 'none', borderRadius: 11, padding: 11, fontSize: 13, fontWeight: 800,
  cursor: off ? 'default' : 'pointer', marginTop: 10,
  background: off ? 'rgba(120,110,150,.15)' : `linear-gradient(135deg,${theme.accent2},${theme.accent})`,
  color: off ? '#6b6390' : '#fff',
});
const NOTE = { fontSize: 11.5, color: theme.muted, lineHeight: 1.5, marginBottom: 10 };
const cellBase = {
  aspectRatio: '1', borderRadius: 9, border: `1px solid ${theme.line}`, background: 'transparent',
  color: theme.text, fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', padding: 0, font: 'inherit',
};

// ── FRAME: the boom is in the shot ────────────────────────────────────────────
// The camera operator has flagged how many of the shots around each clean one have
// something in frame — a boom, a cable, a crew reflection. Mark the spoiled ones and only
// those. Reshoot a clean setup and you have burned the afternoon for nothing.
export function FrameCheck({ difficulty = 1, onResult }) {
  const N = 4;
  // The spoiled setups, and some clean ones hidden alongside them — otherwise every bad
  // shot is simply the blank square and there is nothing to work out. A hidden cell might
  // be either; the numbers on the shown ones are how you tell.
  const { bad, hidden } = useMemo(() => {
    const want = Math.max(3, Math.round(3 + (difficulty - 1) * 1.5));
    const b = new Set();
    while (b.size < want) b.add(Math.floor(Math.random() * (N * N)));
    const h = new Set(b);
    const decoys = Math.max(2, Math.round(3 + (difficulty - 1)));
    let guard = 0;
    while (h.size < b.size + decoys && guard++ < 200) {
      const i = Math.floor(Math.random() * (N * N));
      if (!b.has(i)) h.add(i);
    }
    return { bad: b, hidden: h };
  }, [difficulty]);
  const [marked, setMarked] = useState({});
  const [done, setDone] = useState(false);
  const around = (i) => {
    const r = Math.floor(i / N), c = i % N; let n = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= N || cc >= N) continue;
      if (bad.has(rr * N + cc)) n++;
    }
    return n;
  };
  const submit = () => {
    if (done) return;
    setDone(true);
    // Judged on the ones you could not see. The shown cells were never a question.
    let right = 0, total = 0;
    for (const i of hidden) { total++; if (!!marked[i] === bad.has(i)) right++; }
    const score = right === total ? 100 : clamp((right / Math.max(1, total)) * 100 - 22 - (difficulty - 1) * 6);
    play(score >= 70 ? 'good' : 'bad');
    setTimeout(() => onResult(Math.round(score)), 750);
  };
  return (<div>
    <div style={NOTE}>
      The operator has been through the setups. The ones they cleared say how many of the shots
      touching them have something in frame. The rest they have not looked at. Flag the spoiled ones.
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${N}, 1fr)`, gap: 6 }}>
      {Array.from({ length: N * N }, (_, i) => {
        const isBad = bad.has(i), unknown = hidden.has(i), on = !!marked[i];
        const wrong = done && unknown && on !== isBad;
        return (<button key={i} disabled={done || !unknown}
          onClick={() => setMarked((p) => ({ ...p, [i]: !p[i] }))}
          style={{ ...cellBase,
            borderColor: done && unknown ? (wrong ? theme.bad : theme.good) : on ? theme.gold : theme.line,
            background: on ? 'rgba(255,209,102,.16)' : unknown ? 'rgba(255,255,255,.04)' : 'transparent',
            color: on ? theme.gold : theme.muted,
            cursor: unknown && !done ? 'pointer' : 'default' }}>
          {on ? '⚑' : done && isBad ? '✕' : unknown ? '?' : around(i)}
        </button>);
      })}
    </div>
    <button onClick={submit} disabled={done} style={GO(done)}>{done ? 'Reshooting' : 'That is the list'}</button>
  </div>);
}

// ── LIGHT: find your key ──────────────────────────────────────────────────────
// The gaffer has lit the set and you cannot see where the hot spot is from inside it. You
// stand somewhere, they tell you how far off you are, and you get a few goes before the
// operator loses patience and they shoot you where you are.
export function FindTheLight({ difficulty = 1, onResult }) {
  const N = 5;
  const hot = useMemo(() => Math.floor(Math.random() * (N * N)), [difficulty]);
  const tries = Math.max(2, 4 - Math.round((difficulty - 1) * 1.2));
  const [probes, setProbes] = useState([]);
  const [done, setDone] = useState(false);
  const dist = (i) => {
    const r = Math.floor(i / N), c = i % N, hr = Math.floor(hot / N), hc = hot % N;
    return Math.max(Math.abs(r - hr), Math.abs(c - hc));
  };
  const stand = (i) => {
    if (done || probes.some((p) => p.i === i)) return;
    const d = dist(i);
    const next = [...probes, { i, d }];
    setProbes(next);
    if (d === 0) {
      setDone(true);
      const score = clamp(100 - (next.length - 1) * 14);
      play('good');
      setTimeout(() => onResult(Math.round(score)), 750);
      return;
    }
    if (next.length >= tries) {
      setDone(true);
      const best = Math.min(...next.map((p) => p.d));
      const score = clamp(52 - best * 14 - (difficulty - 1) * 6);
      play(score >= 50 ? 'tap' : 'bad');
      setTimeout(() => onResult(Math.round(score)), 750);
    }
  };
  const left = tries - probes.length;
  return (<div>
    <div style={NOTE}>
      The key is somewhere and you cannot see it from in here. Stand somewhere; they will tell you
      how far off you are. {left > 0 ? `${left} more before they shoot you where you stand.` : ''}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${N}, 1fr)`, gap: 5 }}>
      {Array.from({ length: N * N }, (_, i) => {
        const p = probes.find((x) => x.i === i);
        const isHot = done && i === hot;
        return (<button key={i} disabled={done || !!p} onClick={() => stand(i)}
          style={{ ...cellBase, fontSize: 11,
            borderColor: isHot ? theme.gold : p ? (p.d === 1 ? theme.gold : theme.line) : theme.line,
            background: isHot ? 'rgba(255,209,102,.25)' : p ? (p.d === 1 ? 'rgba(255,209,102,.12)' : 'rgba(255,255,255,.04)') : 'transparent',
            color: p ? (p.d === 1 ? theme.gold : theme.muted) : theme.muted }}>
          {isHot ? '☀' : p ? (p.d === 1 ? 'warm' : p.d === 2 ? 'cool' : 'dark') : ''}
        </button>);
      })}
    </div>
    {done && <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 9 }}>
      {probes.some((p) => p.d === 0) ? 'You found it. The operator says nothing, which is the compliment.' : 'They shot it where you were standing. It is lit like a corridor.'}
    </div>}
  </div>);
}

// ── CUT: two shots the wrong way round ────────────────────────────────────────
// The assembly is nearly right. Somebody has dropped two of them in the wrong order and
// everybody can feel it and nobody can say which. Swapping costs time you do not have.
export function TheAssembly({ difficulty = 1, shots = [], onResult }) {
  const N = shots.length || 6;
  const start = useMemo(() => {
    const order = Array.from({ length: N }, (_, i) => i);
    const swaps = Math.max(2, Math.round(2 + (difficulty - 1) * 1.4));
    for (let k = 0; k < swaps; k++) {
      const a = Math.floor(Math.random() * N); let b = Math.floor(Math.random() * N);
      while (b === a) b = Math.floor(Math.random() * N);
      [order[a], order[b]] = [order[b], order[a]];
    }
    return order;
  }, [difficulty, N]);
  const budget = Math.max(2, Math.round(3 + (difficulty - 1) * 1.4));
  const [order, setOrder] = useState(start);
  const [pick, setPick] = useState(null);
  const [used, setUsed] = useState(0);
  const [done, setDone] = useState(false);
  const tap = (i) => {
    if (done) return;
    if (pick == null) { setPick(i); return; }
    if (pick === i) { setPick(null); return; }
    const next = [...order];
    [next[pick], next[i]] = [next[i], next[pick]];
    setOrder(next); setPick(null);
    const u = used + 1; setUsed(u);
    if (u >= budget) finish(next, u);
  };
  const finish = (arr = order, u = used) => {
    if (done) return;
    setDone(true);
    let right = 0;
    for (let i = 0; i < N; i++) if (arr[i] === i) right++;
    let score = (right / N) * 100;
    if (right === N) score = clamp(100 - Math.max(0, u - 2) * 6);
    else score = clamp(score - 20);
    play(score >= 70 ? 'good' : 'bad');
    setTimeout(() => onResult(Math.round(score)), 750);
  };
  return (<div>
    <div style={NOTE}>
      The cut is nearly there. Tap two shots to swap them. {budget - used} swap{budget - used === 1 ? '' : 's'} before
      the negative is gone.
    </div>
    {order.map((o, i) => (<button key={i} disabled={done} onClick={() => tap(i)}
      style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left', font: 'inherit',
        padding: '8px 10px', borderRadius: 10, marginBottom: 5, cursor: done ? 'default' : 'pointer',
        border: `1px solid ${done ? (o === i ? theme.good : theme.bad) : pick === i ? theme.accent : theme.line}`,
        background: pick === i ? 'rgba(158,116,255,.16)' : 'transparent', color: theme.text }}>
      <span style={{ fontSize: 10.5, color: theme.muted, flex: 'none', width: 16 }}>{i + 1}</span>
      <span style={{ fontSize: 12, lineHeight: 1.4 }}>{shots[o] || `Shot ${o + 1}`}</span>
    </button>))}
    <button onClick={() => finish()} disabled={done} style={GO(done)}>{done ? 'Locked' : 'Lock the cut'}</button>
  </div>);
}

// ── PAIRS: who says which line ────────────────────────────────────────────────
// Six lines, three characters, and two of the lines are almost the same sentence — which
// is the trap, because it is the one that actually happens.
export function WhoSaysIt({ difficulty = 1, pairs = [], onResult }) {
  const deck = useMemo(() => {
    const cards = [];
    pairs.forEach((p, i) => { cards.push({ k: i, t: p.line, side: 'line' }); cards.push({ k: i, t: p.who, side: 'who' }); });
    for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
    return cards;
  }, [pairs]);
  const [open, setOpen] = useState([]);
  const [found, setFound] = useState({});
  const [miss, setMiss] = useState(0);
  const [done, setDone] = useState(false);
  const flip = (i) => {
    if (done || open.includes(i) || found[deck[i].k]) return;
    const next = [...open, i];
    if (next.length < 2) { setOpen(next); return; }
    const [a, b] = next;
    if (deck[a].k === deck[b].k && deck[a].side !== deck[b].side) {
      const f = { ...found, [deck[a].k]: true };
      setFound(f); setOpen([]);
      if (Object.keys(f).length === pairs.length) {
        setDone(true);
        const score = clamp(100 - miss * 13 - (difficulty - 1) * 8);
        play(score >= 70 ? 'good' : 'bad');
        setTimeout(() => onResult(Math.round(score)), 750);
      }
      return;
    }
    setOpen(next); setMiss(miss + 1);
    setTimeout(() => setOpen([]), 700);
  };
  return (<div>
    <div style={NOTE}>
      Table read. Match every line to the person who says it — and two of them are nearly the same
      sentence, which is the one people get wrong on the day.
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
      {deck.map((c, i) => {
        const shown = open.includes(i) || found[c.k];
        return (<button key={i} disabled={done} onClick={() => flip(i)}
          style={{ minHeight: 56, borderRadius: 10, padding: '7px 9px', font: 'inherit', textAlign: 'left',
            cursor: done ? 'default' : 'pointer',
            border: `1px solid ${found[c.k] ? theme.good : shown ? theme.accent : theme.line}`,
            background: found[c.k] ? 'rgba(95,206,138,.10)' : shown ? 'rgba(158,116,255,.12)' : 'rgba(255,255,255,.03)',
            color: shown ? theme.text : theme.muted }}>
          <span style={{ fontSize: shown ? 11 : 16, lineHeight: 1.35, fontWeight: c.side === 'who' ? 800 : 500 }}>
            {shown ? c.t : '·'}
          </span>
        </button>);
      })}
    </div>
    <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 8 }}>{miss} wrong so far.</div>
  </div>);
}

// ── NONO: twenty takes and the script supervisor's notes ──────────────────────
// The notes say how many good takes ran together in each row and each column of the sheet.
// Work out which ones to pull for the cut. It is the only genuinely hard one here and it
// is the most honest: this is filing, and filing is the job.
export function TakeSheet({ difficulty = 1, onResult }) {
  const N = 5;
  const truth = useMemo(() => {
    const g = [];
    for (let i = 0; i < N * N; i++) g.push(Math.random() < 0.45 ? 1 : 0);
    return g;
  }, [difficulty]);
  const runs = (arr) => {
    const out = []; let n = 0;
    for (const v of arr) { if (v) n++; else if (n) { out.push(n); n = 0; } }
    if (n) out.push(n);
    return out.length ? out : [0];
  };
  const rowClue = (r) => runs(truth.slice(r * N, r * N + N)).join(' ');
  const colClue = (c) => runs(Array.from({ length: N }, (_, r) => truth[r * N + c])).join(' ');
  const [on, setOn] = useState({});
  const [done, setDone] = useState(false);
  const submit = () => {
    if (done) return;
    setDone(true);
    // Scored against the CLUES, not against the sheet it was generated from. A grid of runs
    // can have more than one answer, and marking a different valid one is not a mistake —
    // it was being called one, which would have been the unfairest thing on this screen.
    const mine = Array.from({ length: N * N }, (_, i) => (on[i] ? 1 : 0));
    let lines = 0, ok = 0;
    for (let r = 0; r < N; r++) {
      lines++;
      if (runs(mine.slice(r * N, r * N + N)).join(' ') === rowClue(r)) ok++;
    }
    for (let c = 0; c < N; c++) {
      lines++;
      if (runs(Array.from({ length: N }, (_, r) => mine[r * N + c])).join(' ') === colClue(c)) ok++;
    }
    const score = ok === lines ? 100 : clamp((ok / lines) * 100 - 26 - (difficulty - 1) * 6);
    play(score >= 70 ? 'good' : 'bad');
    setTimeout(() => onResult(Math.round(score)), 800);
  };
  return (<div>
    <div style={NOTE}>
      Twenty-five takes on the sheet. The numbers say how many GOOD ones ran together in each row
      and each column. Mark the good ones.
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: `28px repeat(${N}, 1fr)`, gap: 4 }}>
      <div />
      {Array.from({ length: N }, (_, c) => (
        <div key={'c' + c} style={{ fontSize: 9.5, color: theme.gold, textAlign: 'center', fontWeight: 800, paddingBottom: 2 }}>{colClue(c)}</div>
      ))}
      {Array.from({ length: N }, (_, r) => ([
        <div key={'r' + r} style={{ fontSize: 9.5, color: theme.gold, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 3 }}>{rowClue(r)}</div>,
        ...Array.from({ length: N }, (_, c) => {
          const i = r * N + c, lit = !!on[i], wrong = done && (lit ? 1 : 0) !== truth[i];
          return (<button key={i} disabled={done} onClick={() => setOn((p) => ({ ...p, [i]: !p[i] }))}
            style={{ ...cellBase, fontSize: 11,
              borderColor: done ? (wrong ? theme.bad : theme.line) : lit ? theme.accent : theme.line,
              background: lit ? 'rgba(158,116,255,.22)' : done && truth[i] ? 'rgba(95,206,138,.10)' : 'transparent',
              color: theme.muted }}>{done && truth[i] && !lit ? '·' : ''}</button>);
        }),
      ]))}
    </div>
    <button onClick={submit} disabled={done} style={GO(done)}>{done ? 'Filed' : 'That is the sheet'}</button>
  </div>);
}
