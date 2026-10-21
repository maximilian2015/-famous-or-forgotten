// One fixed sequence of dice for a test that measures a rate over many lives ("most adoptions come
// good", "five years of drinking kills a real share", "thirty years makes an A-lister"). Unseeded,
// each of those fell outside its band now and then by luck — 23 of 40 against a floor of 24 — and
// every refactor had to stop and prove a red test was noise (21 Oct 2026). The claim is still
// measured over the same many lives; it is the same lives every run.
//
// Import it FIRST, before anything from src/, so nothing draws a number before the seed is in:
//   import './helpers/seeded.mjs';
let seed = 0x5eed2026;
Math.random = () => {   // mulberry32
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
