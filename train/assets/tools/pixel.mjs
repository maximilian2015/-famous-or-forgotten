// Пиксель-арт без зависимостей: холст, ASCII-картинки, обводка, масштаб и свой PNG-энкодер.
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

// ---------- PNG ----------
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c; }
function crc32(buf) { let c = ~0; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (~c) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
export function writePNG(file, img) {
  const { w, h } = img, d = Buffer.from(img.d.buffer, img.d.byteOffset, img.d.length);
  const stride = w * 4 + 1, raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) { raw[y * stride] = 0; d.copy(raw, y * stride + 1, y * w * 4, (y + 1) * w * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png);
  return png.length;
}

// ---------- цвет ----------
export function hex(h) {
  if (!h || h === 'none') return null;
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16), s.length > 6 ? parseInt(s.slice(6, 8), 16) : 255];
}
const cl = v => Math.max(0, Math.min(255, Math.round(v)));
export function shade(c, amt) { return c && [cl(c[0] + amt), cl(c[1] + amt), cl(c[2] + amt), c[3]]; }
export function mix(a, b, t) { return [cl(a[0] + (b[0] - a[0]) * t), cl(a[1] + (b[1] - a[1]) * t), cl(a[2] + (b[2] - a[2]) * t), 255]; }
// затемнение с уходом в синеву — так тени в пиксель-арте выглядят живее, чем просто «минус яркость»
export function dark(c, t = 0.35) { return mix(c, [28, 22, 40, 255], t); }
export function light(c, t = 0.3) { return mix(c, [255, 245, 220, 255], t); }

// ---------- холст ----------
export class Img {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8Array(w * h * 4); }
  set(x, y, c) {
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4; this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = c[3] ?? 255;
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4; return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]];
  }
  a(x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? 0 : this.d[(y * this.w + x) * 4 + 3]; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  frame(x, y, w, h, c) { for (let i = 0; i < w; i++) { this.set(x + i, y, c); this.set(x + i, y + h - 1, c); } for (let j = 0; j < h; j++) { this.set(x, y + j, c); this.set(x + w - 1, y + j, c); } }
  hline(x, y, w, c) { for (let i = 0; i < w; i++) this.set(x + i, y, c); }
  vline(x, y, h, c) { for (let j = 0; j < h; j++) this.set(x, y + j, c); }
  blit(src, dx, dy) { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) if (src.a(x, y)) this.set(dx + x, dy + y, src.get(x, y)); }
  clone() { const o = new Img(this.w, this.h); o.d.set(this.d); return o; }
  mirrorX() { const o = new Img(this.w, this.h); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) o.set(this.w - 1 - x, y, this.get(x, y)); return o; }
  crop(x, y, w, h) { const o = new Img(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) o.set(i, j, this.get(x + i, y + j)); return o; }
  scale(n) { const o = new Img(this.w * n, this.h * n); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const c = this.get(x, y); if (c[3]) o.rect(x * n, y * n, n, n, c); } return o; }
  // обводка силуэта: прозрачный пиксель, у которого есть непрозрачный сосед, становится контурным
  outline(c, diag = false) {
    const o = this.clone();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.a(x, y)) continue;
      let near = this.a(x - 1, y) || this.a(x + 1, y) || this.a(x, y - 1) || this.a(x, y + 1);
      if (!near && diag) near = this.a(x - 1, y - 1) || this.a(x + 1, y - 1) || this.a(x - 1, y + 1) || this.a(x + 1, y + 1);
      if (near) o.set(x, y, c);
    }
    return o;
  }
  // тень на пол: силуэт, сдвинутый вниз, полупрозрачным
  shadowBelow(y0, c) { const o = new Img(this.w, this.h); for (let x = 0; x < this.w; x++) { let lo = -1; for (let y = 0; y < this.h; y++) if (this.a(x, y)) lo = y; if (lo >= y0) o.set(x, lo, c); } o.blit(this, 0, 0); return o; }
}

// ASCII-картинка: массив строк одинаковой длины + палитра {буква: цвет}. Точка — прозрачно.
export function fromAscii(rows, pal) {
  const img = new Img(rows[0].length, rows.length);
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const c = pal[row[x]]; if (c) img.set(x, y, c); } });
  return img;
}

// Проверка, что все строки одной ширины — ошибка в ASCII иначе уезжает молча.
export function checkAscii(name, rows, w) {
  rows.forEach((r, i) => { if (r.length !== w) throw new Error(`${name}: строка ${i} длиной ${r.length}, ожидалось ${w}`); });
  return rows;
}

// крошечный шрифт 3×5 для подписей на превью
const FONT = {
  A: '###|# #|###|# #|# #', B: '## |###|# #|# #|###', C: '###|#  |#  |#  |###', D: '## |# #|# #|# #|## ',
  E: '###|#  |## |#  |###', F: '###|#  |## |#  |#  ', G: '###|#  |# #|# #|###', H: '# #|# #|###|# #|# #',
  I: '###| # | # | # |###', J: '  #|  #|  #|# #|###', K: '# #|# #|## |# #|# #', L: '#  |#  |#  |#  |###',
  M: '# #|###|###|# #|# #', N: '## |# #|# #|# #|# #', O: '###|# #|# #|# #|###', P: '###|# #|###|#  |#  ',
  Q: '###|# #|# #|###|  #', R: '###|# #|###|# #|# #', S: '###|#  |###|  #|###', T: '###| # | # | # | # ',
  U: '# #|# #|# #|# #|###', V: '# #|# #|# #|# #| # ', W: '# #|# #|###|###|# #', X: '# #|# #| # |# #|# #',
  Y: '# #|# #|###| # | # ', Z: '###|  #| # |#  |###',
  0: '###|# #|# #|# #|###', 1: ' # |## | # | # |###', 2: '###|  #|###|#  |###', 3: '###|  #|###|  #|###',
  4: '# #|# #|###|  #|  #', 5: '###|#  |###|  #|###', 6: '###|#  |###|# #|###', 7: '###|  #|  #|  #|  #',
  8: '###|# #|###|# #|###', 9: '###|# #|###|  #|###',
  '-': '   |   |###|   |   ', '.': '   |   |   |   | # ', ':': '   | # |   | # |   ', '/': '  #|  #| # |#  |#  ',
  '×': '   |# #| # |# #|   ', ' ': '   |   |   |   |   ', '(': ' # |#  |#  |#  | # ', ')': '# |  #|  #|  #|# ',
};
export function drawText(img, s, x, y, c) {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = FONT[ch] || FONT[' '];
    g.split('|').forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') img.set(cx + i, y + j, c); });
    cx += 4;
  }
  return cx;
}
export const textWidth = s => s.length * 4 - 1;
