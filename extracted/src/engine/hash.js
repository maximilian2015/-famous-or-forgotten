// A string to a number, and a number to a repeatable sequence. For anything that must come out
// the same every time from the same name: a poster (ui/components/poster-spec.js), a budget
// (systems/career/budget.js). Kept in the engine so a system can use it without reaching into the UI.
export function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
export function rng(seed) { let x = seed || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return (x % 10000) / 10000; }; }
