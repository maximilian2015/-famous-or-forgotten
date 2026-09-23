// The sound of the game.
//
// Everything here is made in code — oscillators, noise buffers and filters — because the
// whole game ships as a single offline html file and cannot carry a single .mp3. That is a
// constraint, not an excuse: applause is filtered noise with the right envelope, a
// clapperboard is a 12ms noise transient, and a coin is three detuned sines. All of it is
// cheaper than one audio file would have been.
//
// Before this there were seven cues in the entire game, and they only ever played when a
// BigMoment modal opened. Pressing a button, a month passing, money arriving, an email —
// all of it silent.

let ctx = null;
let master = null;
let unlocked = false;

const KEY = 'fof_sound';
function savedOn() { try { return localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; } }
let on = savedOn();
export function soundOn() { return on; }
export function setSound(v) {
  on = !!v;
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {}
  if (master) master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.02);
  if (on) play('toggle');
}

function ac() {
  if (ctx) return ctx;
  const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!Ctx) return null;
  try {
    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = on ? 0.9 : 0;
    // A gentle limiter so a fanfare landing on top of a coin never clips.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 18; comp.ratio.value = 6;
    comp.attack.value = 0.004; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ctx.destination);
  } catch (e) { ctx = null; }
  return ctx;
}

// Browsers will not make a sound until the person has touched the page. One listener,
// removed the moment it fires.
export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  const c = ac();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}
if (typeof window !== 'undefined') {
  const kick = () => { unlockAudio(); window.removeEventListener('pointerdown', kick); window.removeEventListener('keydown', kick); };
  window.addEventListener('pointerdown', kick, { passive: true });
  window.addEventListener('keydown', kick);
}

// ── the building blocks ───────────────────────────────────────────────────────────────

function tone(c, at, { f, f2, type = 'sine', gain = 0.1, dur = 0.3, attack = 0.006, detune = 0 }) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, at);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), at + dur);
  if (detune) o.detune.setValueAtTime(detune, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g); g.connect(master);
  o.start(at); o.stop(at + dur + 0.05);
}

let noiseBuf = null;
function noise(c) {
  if (noiseBuf) return noiseBuf;
  const n = c.sampleRate * 2;
  noiseBuf = c.createBuffer(1, n, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

function hiss(c, at, { gain = 0.1, dur = 0.2, freq = 2000, q = 1, type = 'bandpass', attack = 0.004, sweepTo = 0 }) {
  const src = c.createBufferSource(); src.buffer = noise(c); src.loop = true;
  const flt = c.createBiquadFilter(); flt.type = type; flt.frequency.setValueAtTime(freq, at); flt.Q.value = q;
  if (sweepTo) flt.frequency.exponentialRampToValueAtTime(Math.max(60, sweepTo), at + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(flt); flt.connect(g); g.connect(master);
  src.start(at); src.stop(at + dur + 0.05);
}

// A crowd is a lot of small noise transients, not one long one. Grains give it a texture
// that a single envelope never has.
function crowd(c, at, { dur = 1.6, gain = 0.12, density = 90, bright = 2400 }) {
  hiss(c, at, { gain: gain * 0.5, dur, freq: bright, q: 0.7, attack: dur * 0.14 });
  const n = Math.round(density * dur);
  for (let i = 0; i < n; i++) {
    const t = at + Math.pow(Math.random(), 0.7) * dur;
    const swell = Math.sin(Math.PI * Math.min(1, (t - at) / dur));
    hiss(c, t, { gain: gain * (0.05 + Math.random() * 0.11) * (0.4 + swell), dur: 0.03 + Math.random() * 0.03,
      freq: bright * (0.6 + Math.random() * 0.9), q: 1.4, attack: 0.002 });
  }
}

// ── the cues ──────────────────────────────────────────────────────────────────────────
// Each is a function of (context, startTime) so they can be layered and offset.

const N = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77,
  C6: 1046.5, D6: 1174.7, E6: 1318.5, G6: 1568 };

function seq(c, at, notes, o = {}) {
  notes.forEach((f, i) => tone(c, at + i * (o.gap || 0.13), { f, type: o.type || 'sine',
    gain: o.gain || 0.11, dur: o.dur || 0.45, attack: o.attack }));
}

export const CUES = {
  // ── the hand on the glass ──
  tap:    (c, t) => tone(c, t, { f: 1180, f2: 900, type: 'triangle', gain: 0.028, dur: 0.045, attack: 0.002 }),
  nav:    (c, t) => { tone(c, t, { f: 620, type: 'sine', gain: 0.05, dur: 0.09 }); tone(c, t + 0.045, { f: 880, type: 'sine', gain: 0.045, dur: 0.11 }); },
  back:   (c, t) => { tone(c, t, { f: 780, type: 'sine', gain: 0.045, dur: 0.09 }); tone(c, t + 0.045, { f: 560, type: 'sine', gain: 0.04, dur: 0.11 }); },
  toggle: (c, t) => tone(c, t, { f: 900, f2: 1350, type: 'square', gain: 0.026, dur: 0.07 }),
  denied: (c, t) => { tone(c, t, { f: 190, type: 'square', gain: 0.05, dur: 0.09 }); tone(c, t + 0.09, { f: 150, type: 'square', gain: 0.05, dur: 0.13 }); },

  // ── time ──
  // A month is a woody tick and a low thump, like a slate being set down. Quiet: it plays
  // more often than anything else in the game.
  month:  (c, t) => { hiss(c, t, { gain: 0.05, dur: 0.05, freq: 2600, q: 2.2, type: 'bandpass', attack: 0.001 });
                      tone(c, t, { f: 128, f2: 74, type: 'sine', gain: 0.07, dur: 0.16, attack: 0.002 }); },
  year:   (c, t) => { CUES.month(c, t); tone(c, t + 0.06, { f: N.A5, type: 'sine', gain: 0.055, dur: 0.9, attack: 0.004 });
                      tone(c, t + 0.06, { f: N.E5, type: 'sine', gain: 0.035, dur: 1.1, attack: 0.004 }); },

  // ── money ──
  cash_in:  (c, t) => { seq(c, t, [N.E5, N.B5, N.E6], { gap: 0.055, gain: 0.075, dur: 0.28, type: 'triangle' });
                        tone(c, t + 0.02, { f: 2400, type: 'sine', gain: 0.02, dur: 0.5 }); },
  cash_out: (c, t) => seq(c, t, [N.G4, N.D4], { gap: 0.09, gain: 0.07, dur: 0.24, type: 'triangle' }),
  // A bill is paper, not a tone.
  bill:     (c, t) => hiss(c, t, { gain: 0.075, dur: 0.26, freq: 3600, q: 0.6, type: 'highpass', attack: 0.02, sweepTo: 1200 }),
  rich:     (c, t) => seq(c, t, [N.C5, N.E5, N.G5, N.C6, N.E6], { gap: 0.07, gain: 0.09, dur: 0.7, type: 'triangle' }),

  // ── the work ──
  // A clapperboard. The whole sound is fourteen milliseconds of transient and a tail.
  slate:  (c, t) => { hiss(c, t, { gain: 0.34, dur: 0.014, freq: 4200, q: 0.4, type: 'highpass', attack: 0.0008 });
                      hiss(c, t + 0.004, { gain: 0.14, dur: 0.1, freq: 1500, q: 1.1, attack: 0.002 });
                      tone(c, t, { f: 320, f2: 130, type: 'triangle', gain: 0.06, dur: 0.09, attack: 0.001 }); },
  // A stills camera on a carpet: two mechanical clicks, close together.
  camera: (c, t) => { hiss(c, t, { gain: 0.16, dur: 0.02, freq: 5200, q: 0.5, type: 'highpass', attack: 0.001 });
                      hiss(c, t + 0.055, { gain: 0.12, dur: 0.03, freq: 3400, q: 0.7, type: 'highpass', attack: 0.001 }); },
  offer:  (c, t) => { seq(c, t, [N.D5, N.A5], { gap: 0.1, gain: 0.085, dur: 0.4, type: 'sine' });
                      tone(c, t + 0.1, { f: N.F5, type: 'sine', gain: 0.045, dur: 0.55 }); },
  email:  (c, t) => { hiss(c, t, { gain: 0.055, dur: 0.11, freq: 1800, q: 0.8, sweepTo: 4200, attack: 0.01 });
                      tone(c, t + 0.09, { f: N.B5, type: 'sine', gain: 0.05, dur: 0.24 }); },
  good:   (c, t) => seq(c, t, [N.C5, N.E5, N.G5], { gap: 0.16, gain: 0.11, dur: 0.5 }),
  bad:    (c, t) => seq(c, t, [196, 146.83, 98], { gap: 0.16, gain: 0.15, dur: 0.8, type: 'triangle' }),
  levelup:(c, t) => seq(c, t, [N.G4, N.C5, N.E5, N.G5], { gap: 0.075, gain: 0.09, dur: 0.5, type: 'triangle' }),

  // ── the nights ──
  fanfare: (c, t) => { seq(c, t, [N.G4, N.C5, N.E5, N.G5, N.C6], { gap: 0.13, gain: 0.1, dur: 0.75 });
                       crowd(c, t + 0.5, { dur: 1.5, gain: 0.09 }); },
  flop:    (c, t) => seq(c, t, [N.C4, 220, 174.61, 116.54], { gap: 0.19, gain: 0.13, dur: 1.0, type: 'triangle' }),
  nominated: (c, t) => seq(c, t, [N.E5, N.A5, N.B5, N.E6], { gap: 0.1, gain: 0.09, dur: 0.45 }),
  // The envelope. Slow, wide, lands on the octave — this one is finished.
  asker:   (c, t) => { seq(c, t, [N.G4, N.D5, N.G5, N.B5, N.D6, N.G6], { gap: 0.155, gain: 0.11, dur: 1.1 });
                       crowd(c, t + 0.75, { dur: 2.4, gain: 0.13, density: 120 }); },
  applause: (c, t) => crowd(c, t, { dur: 1.9, gain: 0.11 }),
  ovation:  (c, t) => crowd(c, t, { dur: 3.2, gain: 0.15, density: 130 }),
  // A blockbuster landing. One very low hit and a long tail.
  boom:    (c, t) => { tone(c, t, { f: 92, f2: 38, type: 'sine', gain: 0.3, dur: 1.6, attack: 0.008 });
                       hiss(c, t, { gain: 0.09, dur: 0.9, freq: 900, q: 0.5, type: 'lowpass', attack: 0.01, sweepTo: 120 }); },

  // ── the life ──
  heart:  (c, t) => { tone(c, t, { f: N.F4, type: 'sine', gain: 0.075, dur: 1.1, attack: 0.03 });
                      tone(c, t, { f: N.A4, type: 'sine', gain: 0.06, dur: 1.2, attack: 0.05 });
                      tone(c, t + 0.18, { f: N.C5, type: 'sine', gain: 0.055, dur: 1.1, attack: 0.05 }); },
  baby:   (c, t) => seq(c, t, [N.C6, N.E6, N.G5, N.C6], { gap: 0.11, gain: 0.06, dur: 0.6 }),
  ill:    (c, t) => { tone(c, t, { f: 165, f2: 140, type: 'sine', gain: 0.09, dur: 0.7, attack: 0.05 });
                      tone(c, t + 0.05, { f: 156, type: 'sine', gain: 0.06, dur: 0.8, attack: 0.06 }); },
  // The last sound. Very low, very slow, and the two notes are a semitone apart so it
  // never resolves.
  death:  (c, t) => { tone(c, t, { f: 110, type: 'sine', gain: 0.13, dur: 3.4, attack: 0.35 });
                      tone(c, t + 0.3, { f: 103.8, type: 'sine', gain: 0.1, dur: 3.2, attack: 0.4 });
                      tone(c, t + 0.9, { f: 55, type: 'sine', gain: 0.12, dur: 3.0, attack: 0.5 }); },
  born:   (c, t) => seq(c, t, [N.C5, N.G5, N.C6], { gap: 0.16, gain: 0.075, dur: 1.0 }),
  // A television coming on: a breath of static, then the network's three-note sting.
  // A day on set, and how it went.
  action: (c, t) => { hiss(c, t, { gain: 0.3, dur: 0.013, freq: 4400, q: 0.4, type: 'highpass', attack: 0.0008 });
                      tone(c, t + 0.02, { f: 240, f2: 150, type: 'square', gain: 0.05, dur: 0.1 }); },
  printed: (c, t) => { seq(c, t, [N.D5, N.A5, N.D6], { gap: 0.09, gain: 0.09, dur: 0.5 });
                       crowd(c, t + 0.22, { dur: 1.1, gain: 0.05, density: 40 }); },
  blown:  (c, t) => { tone(c, t, { f: 180, f2: 90, type: 'sawtooth', gain: 0.07, dur: 0.5, attack: 0.004 });
                      hiss(c, t + 0.08, { gain: 0.05, dur: 0.3, freq: 700, q: 0.7, sweepTo: 200 }); },
  // The genres, for the night a picture opens. Maxi wanted a premiere to SOUND like the
  // film it is: strings for a drama, a stab for horror, a fanfare for the big loud one.
  gHorror: (c, t) => { hiss(c, t, { gain: 0.05, dur: 0.9, freq: 300, q: 0.7, attack: 0.25 });
                       tone(c, t + 0.5, { f: 1600, f2: 1520, type: 'sawtooth', gain: 0.075, dur: 0.5, attack: 0.001, detune: 22 });
                       tone(c, t + 0.52, { f: 73, type: 'sine', gain: 0.22, dur: 1.5, attack: 0.01 }); },
  gThriller: (c, t) => { seq(c, t, [N.A4, N.A4, N.C5, N.A4], { gap: 0.145, gain: 0.06, dur: 0.22, type: 'triangle' });
                         tone(c, t + 0.6, { f: 98, f2: 65, type: 'sine', gain: 0.18, dur: 1.2, attack: 0.01 }); },
  gCrime:  (c, t) => { seq(c, t, [116.54, 87.31, 116.54, 155.56], { gap: 0.19, gain: 0.09, dur: 0.5, type: 'triangle' });
                       hiss(c, t + 0.1, { gain: 0.022, dur: 1.1, freq: 900, q: 0.5, attack: 0.3 }); },
  gComedy: (c, t) => { seq(c, t, [N.C5, N.E5, N.G5, N.E5, N.C6], { gap: 0.085, gain: 0.075, dur: 0.3, type: 'triangle' });
                       tone(c, t + 0.44, { f: N.G5, f2: N.C6, type: 'square', gain: 0.03, dur: 0.18 }); },
  gRomance:(c, t) => { seq(c, t, [N.F4, N.A4, N.C5, N.F5], { gap: 0.2, gain: 0.07, dur: 1.1, type: 'sine' });
                       tone(c, t + 0.12, { f: N.C4, type: 'sine', gain: 0.05, dur: 1.8, attack: 0.25 }); },
  gDrama:  (c, t) => { tone(c, t, { f: N.D4, type: 'sine', gain: 0.07, dur: 2.2, attack: 0.5 });
                       tone(c, t + 0.05, { f: N.A4, type: 'sine', gain: 0.055, dur: 2.0, attack: 0.6 });
                       tone(c, t + 0.6, { f: N.F5, type: 'triangle', gain: 0.045, dur: 1.6, attack: 0.4 }); },
  gSciFi:  (c, t) => { tone(c, t, { f: 1200, f2: 240, type: 'sine', gain: 0.05, dur: 1.4, attack: 0.02 });
                       tone(c, t + 0.1, { f: 55, type: 'sine', gain: 0.2, dur: 1.8, attack: 0.05 });
                       hiss(c, t + 0.3, { gain: 0.03, dur: 1.0, freq: 2200, q: 1.6, sweepTo: 5200, attack: 0.2 }); },
  gMusical:(c, t) => { seq(c, t, [N.C5, N.D5, N.E5, N.G5, N.C6], { gap: 0.105, gain: 0.08, dur: 0.6 });
                       crowd(c, t + 0.5, { dur: 1.4, gain: 0.06, density: 50 }); },
  gBlockbuster: (c, t) => { tone(c, t, { f: 58, type: 'sine', gain: 0.26, dur: 1.9, attack: 0.01 });
                            seq(c, t + 0.22, [N.C4, N.G4, N.C5, N.E5], { gap: 0.16, gain: 0.1, dur: 0.9, type: 'sawtooth' });
                            crowd(c, t + 0.9, { dur: 1.6, gain: 0.07, density: 70 }); },
  tv:     (c, t) => { hiss(c, t, { gain: 0.05, dur: 0.3, freq: 2600, q: 0.5, attack: 0.01 });
                      seq(c, t + 0.18, [N.E5, N.A5, N.E6], { gap: 0.13, gain: 0.07, dur: 0.55 });
                      tone(c, t + 0.58, { f: N.A4, type: 'triangle', gain: 0.05, dur: 0.9, attack: 0.03 }); },
};

// Every button in the game makes a sound, without four hundred onClick handlers having to
// know about it. One delegated listener, and anything that wants a different sound says so
// with a data-sfx attribute.
export function installTapSounds() {
  if (typeof document === 'undefined') return;
  document.addEventListener('pointerdown', (e) => {
    const b = e.target && e.target.closest && e.target.closest('button,[role=button]');
    if (!b || b.disabled) return;
    play(b.dataset && b.dataset.sfx ? b.dataset.sfx : 'tap');
  }, { passive: true, capture: true });
}

let last = 0;
// What a premiere sounds like: the picture's genre, and the size of it. Read by the
// BigMoment when a film opens.
const GENRE_CUE = { Horror: 'gHorror', Thriller: 'gThriller', Crime: 'gCrime', Comedy: 'gComedy', Romance: 'gRomance', Drama: 'gDrama', 'Sci-Fi': 'gSciFi', Musical: 'gMusical' };
export function playGenre(genre, scale, delay = 0) {
  if (scale === 'blockbuster') { play('gBlockbuster', delay); return; }
  play(GENRE_CUE[genre] || 'gDrama', delay);
}
export function play(kind, delay = 0) {
  if (!on) return;
  const c = ac();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const cue = CUES[kind];
  if (!cue) return;
  // A rapid double-fire of the same click is a rattle, not a sound.
  const now = performance.now();
  if (kind === 'tap' && now - last < 45) return;
  last = now;
  try { cue(c, c.currentTime + 0.005 + delay); } catch (e) { /* sound is a nicety, never a requirement */ }
}

// ── the room ──────────────────────────────────────────────────────────────────────────
// A party has music. A loop of four bars — a kick, a hat made of noise, a bass note that
// moves — made here like everything else, and quiet enough to talk over. Maxi: "when the
// window opens, music should play." One loop at a time; the room stops it when it closes.
let loop = null;
const LOOPS = {
  club:   { bpm: 124, bass: [55, 55, 65.4, 49], hat: 5200, gain: 0.05 },
  house:  { bpm: 100, bass: [65.4, 73.4, 82.4, 61.7], hat: 3800, gain: 0.045 },
  lounge: { bpm: 84,  bass: [82.4, 98, 87.3, 73.4], hat: 2600, gain: 0.04 },
};
export function startLoop(kind = 'club') {
  stopLoop();
  if (!on) return;
  const c = ac(); if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const L = LOOPS[kind] || LOOPS.club;
  const beat = 60 / L.bpm;
  const g = c.createGain(); g.gain.value = L.gain; g.connect(master);
  let next = c.currentTime + 0.05, bar = 0, alive = true;
  const schedule = () => {
    if (!alive) return;
    while (next < c.currentTime + 0.6) {
      for (let i = 0; i < 4; i++) {
        const t = next + i * beat;
        // kick
        const o = c.createOscillator(), og = c.createGain(); o.type = 'sine';
        o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
        og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.9, t + 0.004); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.connect(og); og.connect(g); o.start(t); o.stop(t + 0.3);
        // hat on the off-beat
        const src = c.createBufferSource(); src.buffer = noise(c); src.loop = true;
        const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = L.hat;
        const hg = c.createGain(); const ht = t + beat / 2;
        hg.gain.setValueAtTime(0.0001, ht); hg.gain.exponentialRampToValueAtTime(0.25, ht + 0.003); hg.gain.exponentialRampToValueAtTime(0.0001, ht + 0.05);
        src.connect(f); f.connect(hg); hg.connect(g); src.start(ht); src.stop(ht + 0.08);
      }
      // bass: one note a bar, moving
      const b = c.createOscillator(), bg = c.createGain(); b.type = 'triangle';
      b.frequency.setValueAtTime(L.bass[bar % L.bass.length], next);
      bg.gain.setValueAtTime(0.0001, next); bg.gain.exponentialRampToValueAtTime(0.5, next + 0.02); bg.gain.exponentialRampToValueAtTime(0.0001, next + beat * 3.6);
      b.connect(bg); bg.connect(g); b.start(next); b.stop(next + beat * 4);
      next += beat * 4; bar += 1;
    }
  };
  const timer = setInterval(schedule, 250); schedule();
  loop = { stop: () => { alive = false; clearInterval(timer); g.gain.setTargetAtTime(0.0001, c.currentTime, 0.15); setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 800); } };
}
export function stopLoop() { if (loop) { loop.stop(); loop = null; } }
