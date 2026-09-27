// The days on set that are a thought rather than a reflex.
//
// Six mechanics existed and every one of them was reaction and precision — the mark, the
// rhythm, the hold, the sequence, the three-second pick, the push-your-luck grid. Maxi:
// "propose some minigames, interesting and hard, logical ones — maybe those are what is
// missing." They were. These three are about the work instead: what the character knows
// and when, whether a reading holds across a page, and why she does it at all.
//
// Same contract as the rest (ui/components/SceneGames.jsx): take a difficulty, return one
// number 0..100, and let systems/career/scenes.js decide what the day was worth.
import { useState } from 'react';
import { theme } from '../theme.js';
import { play } from '../sfx.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const ROW = {
  display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', borderRadius: 11,
  border: `1px solid ${theme.line}`, marginBottom: 7, cursor: 'pointer', textAlign: 'left',
  width: '100%', background: 'transparent', color: theme.text, font: 'inherit',
};
const GO = (off) => ({
  width: '100%', border: 'none', borderRadius: 11, padding: 11, fontSize: 13, fontWeight: 800,
  cursor: off ? 'default' : 'pointer', marginTop: 4,
  background: off ? 'rgba(120,110,150,.15)' : `linear-gradient(135deg,${theme.accent2},${theme.accent})`,
  color: off ? '#6b6390' : '#fff',
});

// ── CHRONOLOGY ────────────────────────────────────────────────────────────────
// Nothing is shot in order. The call sheet follows the location and the weather, and the
// only person who has to hold the story in their head is the one in front of the camera:
// in this scene she knows about the letter, in that one she does not. Playing the wrong one
// is the most visible mistake an actor can make, and nobody catches it until the edit.
export function Chronology({ difficulty = 1, beats = [], reveal = 0, onResult }) {
  const [picked, setPicked] = useState({});
  const [done, setDone] = useState(false);
  const knows = (i) => (beats[i] ? beats[i].pos > reveal : false);
  const submit = () => {
    if (done) return;
    setDone(true);
    let right = 0;
    for (let i = 0; i < beats.length; i++) if (!!picked[i] === knows(i)) right++;
    // All of them or it shows: one scene played wrong is the one the edit cannot hide.
    const score = right === beats.length ? 100 : clamp((right / Math.max(1, beats.length)) * 100 - 18 - (difficulty - 1) * 6);
    play(score >= 70 ? 'good' : 'bad');
    setTimeout(() => onResult(Math.round(score)), 750);
  };
  return (<div>
    <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5, marginBottom: 9 }}>
      They are shooting out of order today. Tick every scene where she already knows.
    </div>
    {beats.map((b, i) => {
      const on = !!picked[i];
      const wrong = done && on !== knows(i);
      return (<button key={i} disabled={done} onClick={() => setPicked((p) => ({ ...p, [i]: !p[i] }))}
        style={{ ...ROW, borderColor: done ? (wrong ? theme.bad : theme.good) : on ? theme.accent : theme.line,
          background: on ? 'rgba(158,116,255,.14)' : 'transparent' }}>
        <span style={{ width: 17, height: 17, borderRadius: 5, flex: 'none', color: theme.accent, fontSize: 11,
          border: `1.5px solid ${on ? theme.accent : theme.line}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{on ? '✓' : ''}</span>
        <span style={{ fontSize: 12, lineHeight: 1.4 }}>{b.text}</span>
      </button>);
    })}
    <button onClick={submit} disabled={done} style={GO(done)}>{done ? 'Rolling' : 'That is the order'}</button>
  </div>);
}

// ── THE READING ───────────────────────────────────────────────────────────────
// Three lines are missing off the page and you choose them on the day. There is no right
// answer — there is a reading that holds and a reading that does not. Play cold at the top
// and warm at the bottom and the scene is two performances stapled together, which is
// exactly what it looks like on screen.
export function ScriptLines({ difficulty = 1, gaps = [], onResult }) {
  const [picked, setPicked] = useState({});
  const [done, setDone] = useState(false);
  const ready = gaps.length > 0 && gaps.every((g, i) => picked[i] != null);
  const submit = () => {
    if (done || !ready) return;
    setDone(true);
    const tones = gaps.map((g, i) => g.options[picked[i]].tone);
    const same = tones.filter((t) => t === tones[0]).length;
    let score = (same / tones.length) * 100;
    if (same === tones.length) score = 100;
    // The middle line is the turn. Breaking it there is worse than drifting at the end.
    else if (tones[1] !== tones[0] && tones[1] !== tones[2]) score = clamp(score - 14);
    play(score >= 70 ? 'good' : 'bad');
    setTimeout(() => onResult(Math.round(clamp(score - (difficulty - 1) * 8))), 750);
  };
  return (<div>
    <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5, marginBottom: 9 }}>
      Three lines are yours. Nobody will tell you which is right — only whether it was the same
      person saying all three.
    </div>
    {gaps.map((g, i) => (<div key={i} style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: theme.muted, marginBottom: 4, fontStyle: 'italic' }}>{g.cue}</div>
      {g.options.map((o, j) => (<button key={j} disabled={done} onClick={() => setPicked((p) => ({ ...p, [i]: j }))}
        style={{ ...ROW, padding: '7px 10px', marginBottom: 5,
          borderColor: picked[i] === j ? theme.accent : theme.line,
          background: picked[i] === j ? 'rgba(158,116,255,.14)' : 'transparent' }}>
        <span style={{ fontSize: 12, lineHeight: 1.4 }}>{o.text}</span>
      </button>))}
    </div>))}
    <button onClick={submit} disabled={done || !ready} style={GO(done || !ready)}>
      {done ? 'Rolling' : ready ? 'Play it that way' : 'Three lines'}
    </button>
  </div>);
}

// ── THE MOTIVE ────────────────────────────────────────────────────────────────
// "Why does she do it?" You answer once, and then the day asks you twice more whether you
// meant it. The score is not which motive you picked — every one of them is defensible.
// It is whether the two beats after it were played by the person who answered.
export function Motive({ difficulty = 1, question, motives = [], beats = [], onResult }) {
  const [motive, setMotive] = useState(null);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);
  const ready = motive != null && beats.every((b, i) => answers[i] != null);
  const submit = () => {
    if (done || !ready) return;
    setDone(true);
    let held = 0;
    beats.forEach((b, i) => { if (b.options[answers[i]].fits === motive) held++; });
    const score = clamp((held / Math.max(1, beats.length)) * 100 - (difficulty - 1) * 10);
    play(score >= 70 ? 'good' : 'bad');
    setTimeout(() => onResult(Math.round(score)), 750);
  };
  return (<div>
    <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 7 }}>{question}</div>
    {motives.map((m) => (<button key={m.id} disabled={done || motive != null} onClick={() => setMotive(m.id)}
      style={{ ...ROW, borderColor: motive === m.id ? theme.gold : theme.line,
        background: motive === m.id ? 'rgba(255,209,102,.13)' : 'transparent',
        opacity: motive != null && motive !== m.id ? 0.45 : 1 }}>
      <span style={{ fontSize: 12, lineHeight: 1.4 }}>{m.text}</span>
    </button>))}
    {motive != null && beats.map((b, i) => (<div key={i} style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, color: theme.muted, marginBottom: 4 }}>{b.cue}</div>
      {b.options.map((o, j) => (<button key={j} disabled={done} onClick={() => setAnswers((p) => ({ ...p, [i]: j }))}
        style={{ ...ROW, padding: '7px 10px', marginBottom: 5,
          borderColor: answers[i] === j ? theme.accent : theme.line,
          background: answers[i] === j ? 'rgba(158,116,255,.14)' : 'transparent' }}>
        <span style={{ fontSize: 12, lineHeight: 1.4 }}>{o.text}</span>
      </button>))}
    </div>))}
    {motive != null && <button onClick={submit} disabled={done || !ready} style={GO(done || !ready)}>
      {done ? 'Rolling' : ready ? 'That is who she is' : 'Answer the day'}
    </button>}
  </div>);
}
