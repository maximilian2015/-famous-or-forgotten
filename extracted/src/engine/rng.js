export function rint(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
export function chance(pct) { return Math.random() * 100 < pct; }
export function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
