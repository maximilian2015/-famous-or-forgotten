// Генератор ассетов для «Узловой». node tools/build.mjs  →  1x/, 2x/, 3x/, preview_*.png
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Img, writePNG, hex, dark, light, mix, drawText } from './pixel.mjs';
import { sheet, character, seatedSide, standingSide, BLOCK_W, BLOCK_H } from './people.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = {};   // имя файла → картинка 1x

// ---------- палитры ----------
const P = {
  outline: hex('#241f2b'),
  cream: hex('#ece6d8'), creamDark: hex('#cfc7b5'), creamLight: hex('#f7f3e9'),
  roof: hex('#b9b2a3'), roofLight: hex('#cdc6b8'),
  glass: hex('#9cc3d9'), glassLight: hex('#cfe7f3'), glassNight: hex('#2b3550'),
  metal: hex('#4a4450'), metalLight: hex('#6f6878'), wheel: hex('#2b2630'), hub: hex('#8a8494'),
  plat: hex('#d8d3c6'), platDark: hex('#c3bdae'), platLight: hex('#e4dfd3'),
  yellow: hex('#e9c94a'), yellowDark: hex('#c9a832'),
  rail: hex('#9aa0aa'), railDark: hex('#6e747e'), sleeper: hex('#7d6246'), sleeperDark: hex('#5e4934'),
  ballast: hex('#a49d8f'), ballastDark: hex('#8d8779'),
  grass: hex('#9fb572'), grassDark: hex('#82985a'),
  brick: hex('#c98b66'), brickDark: hex('#a86f4f'), tile: hex('#7b4b3a'), tileDark: hex('#5f3a2c'),
  wood: hex('#8b5a3c'), woodDark: hex('#6b4328'),
  floor: hex('#d6cfc0'), floorDark: hex('#bdb5a4'),
  white: hex('#f4f1e8'), ink: hex('#3a3340'),
};
const TRAINS = { red: '#d9534f', blue: '#3b7dd8', green: '#2e9e5b', yellow: '#e2a53c' };

// ---------- мелкие помощники ----------
const disc = (img, cx, cy, r, c) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.4) img.set(cx + x, cy + y, c); };
// «крапинка»: детерминированный шум, чтобы плитки не были плоскими
const noise = (img, x, y, w, h, c, step, seed = 1) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const n = (i * 7 + j * 13 + seed * 29) % step; if (n === 0) img.set(x + i, y + j, c); }
};

// ---------- поезд сбоку ----------
function wheel(img, cx, cy) { disc(img, cx, cy, 5, P.wheel); disc(img, cx, cy, 3, P.metalLight); disc(img, cx, cy, 1, P.hub); }
// тележка: рама + две оси
function bogie(img, x, y) {
  img.rect(x, y, 26, 5, P.metal); img.hline(x, y, 26, P.metalLight); img.rect(x + 2, y + 5, 22, 2, dark(P.metal, 0.3));
  wheel(img, x + 6, y + 8); wheel(img, x + 19, y + 8);
}

// вагон 96×48, двери открыты или закрыты
function carriage(color, open) {
  const c = hex(color), img = new Img(96, 48);
  img.rect(3, 2, 90, 4, P.roof); img.hline(5, 1, 86, P.roofLight); img.hline(3, 5, 90, dark(P.roof, 0.2));
  img.rect(1, 6, 94, 30, P.cream);
  img.rect(1, 30, 94, 6, c); img.hline(1, 30, 94, light(c, 0.3)); img.hline(1, 35, 94, dark(c, 0.3));   // цветная полоса
  img.hline(1, 6, 94, P.creamLight);
  const win = (x) => {
    img.rect(x, 10, 14, 14, P.creamDark); img.rect(x + 1, 11, 12, 12, P.glass);
    img.hline(x + 1, 11, 12, P.glassLight); img.vline(x + 1, 11, 12, P.glassLight);
  };
  [6, 23, 62, 79].forEach(win);
  // двери в середине и по торцам
  const door = (x) => {
    if (open) { img.rect(x, 8, 14, 26, dark(P.metal, 0.25)); img.rect(x + 1, 9, 12, 24, hex('#1f1b26')); }
    else {
      img.rect(x, 8, 14, 26, P.creamDark); img.rect(x + 1, 9, 12, 24, P.cream);
      img.rect(x + 2, 11, 10, 11, P.glass); img.hline(x + 2, 11, 10, P.glassLight);
      img.vline(x + 7, 9, 24, P.creamDark);
    }
  };
  door(41);
  img.rect(1, 8, 3, 26, P.creamDark); img.rect(92, 8, 3, 26, P.creamDark);
  img.rect(6, 36, 84, 3, P.metal);                                       // рама
  bogie(img, 8, 37); bogie(img, 62, 37);
  img.rect(0, 38, 3, 3, P.metal); img.rect(93, 38, 3, 3, P.metal);       // сцепки
  return img.outline(P.outline);
}

// локомотив 64×48, носом вправо: скошенный лоб, кабина, буферный брус
function loco(color) {
  const c = hex(color), img = new Img(64, 48);
  const topAt = x => x < 44 ? 7 : Math.min(18, 7 + Math.round((x - 44) * 0.62));
  for (let x = 2; x <= 60; x++) { const t = topAt(x); img.vline(x, t, 36 - t, c); img.set(x, t, light(c, 0.35)); }
  img.rect(4, 2, 30, 6, dark(c, 0.4)); img.hline(5, 1, 28, dark(c, 0.2)); img.hline(4, 7, 30, dark(c, 0.55));   // крыша над кабиной
  img.rect(10, 4, 5, 3, P.metal); img.rect(22, 3, 4, 4, P.metalLight);   // выхлоп и гудок
  img.rect(6, 11, 13, 12, dark(c, 0.5)); img.rect(7, 12, 11, 10, P.glass); img.hline(7, 12, 11, P.glassLight);   // боковое окно
  for (let i = 0; i < 11; i++) { const y = 15 + i; const x0 = 40 + Math.round(i * 0.6); img.hline(x0, y, 17 - Math.round(i * 0.6), P.glass); }   // лобовое по скосу
  img.hline(40, 15, 17, P.glassLight); img.vline(40, 15, 11, dark(c, 0.5)); img.hline(40, 26, 18, dark(c, 0.5));
  img.rect(24, 12, 11, 9, light(c, 0.25)); img.rect(25, 13, 9, 7, dark(c, 0.3));   // щиток для номера
  img.rect(2, 27, 58, 4, P.white); img.hline(2, 27, 58, light(P.white, 0.4)); img.hline(2, 30, 58, P.creamDark);   // белая полоса
  img.rect(2, 36, 58, 3, P.metal);
  img.rect(50, 33, 12, 5, P.yellow); for (let x = 51; x < 62; x += 4) { img.vline(x, 33, 5, P.wheel); img.vline(x + 1, 33, 5, P.wheel); }   // буферный брус
  wheel(img, 13, 41); wheel(img, 28, 41); wheel(img, 43, 41);
  img.rect(10, 38, 36, 2, dark(P.metal, 0.2));
  disc(img, 56, 24, 2, hex('#ffe9a0')); img.set(56, 24, P.white);        // фара
  img.rect(0, 38, 3, 3, P.metal);
  return img.outline(P.outline);
}

// ---------- тайлсеты 16×16 ----------
const T = 16;
function tileSheet(tiles, cols) {
  const rows = Math.ceil(tiles.length / cols);
  const img = new Img(cols * T, rows * T);
  tiles.forEach((t, i) => img.blit(t, (i % cols) * T, Math.floor(i / cols) * T));
  return img;
}
const tile = fn => { const img = new Img(T, T); fn(img); return img; };

function stationTiles() {
  const t = [];
  // 0 перрон
  t.push(tile(i => { i.rect(0, 0, T, T, P.plat); noise(i, 0, 0, T, T, P.platLight, 11, 2); i.vline(0, 0, T, P.platDark); i.hline(0, 0, T, P.platDark); }));
  // 1 перрон, край с жёлтой линией сверху
  t.push(tile(i => { i.rect(0, 0, T, T, P.plat); noise(i, 0, 0, T, T, P.platLight, 11, 3); i.rect(0, 0, T, 3, P.yellow); i.hline(0, 3, T, P.yellowDark); }));
  // 2 тактильная плитка
  t.push(tile(i => { i.rect(0, 0, T, T, P.yellow); for (let y = 2; y < T; y += 4) for (let x = 2; x < T; x += 4) i.rect(x, y, 2, 2, P.yellowDark); }));
  // 3 обрыв перрона вниз (бетон)
  t.push(tile(i => { i.rect(0, 0, T, T, P.platDark); i.hline(0, 0, T, P.plat); noise(i, 0, 2, T, 14, dark(P.platDark, 0.18), 7, 5); }));
  // 4 балласт
  t.push(tile(i => { i.rect(0, 0, T, T, P.ballast); noise(i, 0, 0, T, T, P.ballastDark, 5, 1); noise(i, 0, 0, T, T, light(P.ballast, 0.25), 9, 4); }));
  // 5 рельсы (горизонтально)
  t.push(tile(i => {
    i.rect(0, 0, T, T, P.ballast); noise(i, 0, 0, T, T, P.ballastDark, 5, 1);
    for (const x of [1, 9]) { i.rect(x, 2, 6, 12, P.sleeper); i.hline(x, 13, 6, P.sleeperDark); }
    i.hline(0, 4, T, P.railDark); i.hline(0, 5, T, P.rail); i.hline(0, 10, T, P.railDark); i.hline(0, 11, T, P.rail);
  }));
  // 6 трава
  t.push(tile(i => { i.rect(0, 0, T, T, P.grass); noise(i, 0, 0, T, T, P.grassDark, 6, 2); noise(i, 0, 0, T, T, light(P.grass, 0.2), 13, 7); }));
  // 7 кирпичная стена
  t.push(tile(i => {
    i.rect(0, 0, T, T, P.brick);
    for (let y = 0; y < T; y += 4) { i.hline(0, y, T, P.brickDark); for (let x = (y % 8 ? 0 : 4); x < T; x += 8) i.vline(x, y, 4, P.brickDark); }
  }));
  // 8 стена с окном
  t.push(tile(i => {
    i.rect(0, 0, T, T, P.brick);
    for (let y = 0; y < T; y += 4) i.hline(0, y, T, P.brickDark);
    i.rect(2, 2, 12, 12, P.white); i.rect(3, 3, 10, 10, P.glass); i.hline(3, 3, 10, P.glassLight); i.vline(8, 3, 10, P.white); i.hline(3, 8, 10, P.white);
  }));
  // 9 крыша
  t.push(tile(i => { i.rect(0, 0, T, T, P.tile); for (let y = 0; y < T; y += 4) { i.hline(0, y, T, P.tileDark); for (let x = (y % 8 ? 2 : 6); x < T; x += 8) i.vline(x, y, 4, P.tileDark); } }));
  // 10 край крыши (свес)
  t.push(tile(i => { i.rect(0, 4, T, 12, P.tile); i.hline(0, 4, T, light(P.tile, 0.25)); i.rect(0, 12, T, 4, P.tileDark); }));
  // 11 дверь вокзала (верх)
  t.push(tile(i => { i.rect(0, 0, T, T, P.brick); for (let y = 0; y < T; y += 4) i.hline(0, y, T, P.brickDark); i.rect(2, 4, 12, 12, P.wood); i.rect(3, 6, 10, 8, P.glass); i.hline(3, 6, 10, P.glassLight); }));
  // 12 дверь вокзала (низ)
  t.push(tile(i => { i.rect(0, 0, T, T, P.brick); for (let y = 0; y < T; y += 4) i.hline(0, y, T, P.brickDark); i.rect(2, 0, 12, 14, P.wood); i.rect(3, 1, 10, 12, P.woodDark); i.set(11, 7, P.yellow); i.rect(0, 14, T, 2, P.plat); }));
  // 13 асфальт/плитка привокзальная
  t.push(tile(i => { i.rect(0, 0, T, T, P.platDark); i.hline(0, 0, T, P.plat); i.vline(0, 0, T, P.plat); noise(i, 1, 1, 15, 15, dark(P.platDark, 0.12), 8, 6); }));
  return tileSheet(t, 7);
}

function interiorTiles(color) {
  const c = hex(color), t = [];
  // 0 пол
  t.push(tile(i => { i.rect(0, 0, T, T, P.floor); noise(i, 0, 0, T, T, P.floorDark, 9, 3); }));
  // 1 пол прохода (с линией)
  t.push(tile(i => { i.rect(0, 0, T, T, P.floorDark); i.hline(0, 7, T, dark(P.floorDark, 0.2)); noise(i, 0, 0, T, T, P.floor, 11, 5); }));
  // 2 стена с окном
  t.push(tile(i => { i.rect(0, 0, T, T, P.cream); i.rect(1, 2, 14, 11, P.creamDark); i.rect(2, 3, 12, 9, P.glass); i.hline(2, 3, 12, P.glassLight); i.hline(0, 14, T, P.creamDark); }));
  // 3 стена гладкая
  t.push(tile(i => { i.rect(0, 0, T, T, P.cream); i.hline(0, 14, T, P.creamDark); i.hline(0, 0, T, P.creamLight); }));
  // 4 багажная полка
  t.push(tile(i => { i.rect(0, 0, T, T, P.cream); i.rect(0, 9, T, 2, P.metal); for (let x = 1; x < T; x += 3) i.vline(x, 5, 4, P.metalLight); }));
  // 5 сиденье анфас
  t.push(tile(i => { i.rect(2, 2, 12, 9, c); i.rect(2, 10, 12, 5, dark(c, 0.3)); i.hline(2, 2, 12, light(c, 0.3)); i.vline(2, 2, 13, dark(c, 0.2)); i.vline(13, 2, 13, dark(c, 0.2)); }));
  // 6 сиденье спинкой
  t.push(tile(i => { i.rect(2, 1, 12, 12, dark(c, 0.15)); i.hline(2, 1, 12, dark(c, 0.4)); i.rect(3, 13, 10, 2, P.metal); }));
  // 7 сиденье в профиль (влево)
  t.push(tile(i => { i.rect(9, 1, 5, 12, dark(c, 0.2)); i.rect(2, 8, 12, 5, c); i.hline(2, 8, 12, light(c, 0.3)); i.rect(2, 13, 3, 2, P.metal); }));
  // 8 дверь закрыта
  t.push(tile(i => { i.rect(0, 0, T, T, P.creamDark); i.rect(1, 1, 14, 14, P.cream); i.vline(8, 0, T, P.creamDark); i.rect(2, 2, 5, 7, P.glass); i.rect(9, 2, 5, 7, P.glass); i.hline(2, 2, 5, P.glassLight); i.hline(9, 2, 5, P.glassLight); }));
  // 9 дверь открыта
  t.push(tile(i => { i.rect(0, 0, T, T, hex('#1c1822')); i.rect(0, 0, 2, T, P.creamDark); i.rect(14, 0, 2, T, P.creamDark); i.hline(0, 15, T, P.floorDark); }));
  // 10 поручень
  t.push(tile(i => { i.rect(0, 0, T, T, P.floor); noise(i, 0, 0, T, T, P.floorDark, 9, 3); i.rect(7, 0, 2, T, P.metalLight); i.vline(7, 0, T, P.metal); }));
  // 11 тамбур / гармошка между вагонами
  t.push(tile(i => { i.rect(0, 0, T, T, dark(P.metal, 0.1)); for (let x = 1; x < T; x += 3) { i.vline(x, 0, T, P.metalLight); i.vline(x + 1, 0, T, dark(P.metal, 0.3)); } }));
  return tileSheet(t, 6);
}

// ---------- предметы ----------
function props() {
  const img = new Img(176, 48);
  const put = (x, y, fn) => { const s = new Img(48, 48); fn(s); img.blit(s.outline(P.outline), x, y); };
  // скамейка
  put(2, 20, s => { s.rect(2, 4, 26, 4, P.wood); s.hline(2, 4, 26, light(P.wood, 0.25)); s.rect(2, 9, 26, 3, P.wood); s.rect(4, 12, 3, 8, P.metal); s.rect(23, 12, 3, 8, P.metal); s.rect(2, 0, 26, 4, P.woodDark); });
  // фонарь
  put(36, 2, s => { s.rect(5, 26, 3, 20, P.metal); s.rect(2, 22, 9, 4, P.metalLight); s.rect(3, 18, 7, 4, hex('#ffe9a0')); s.rect(4, 15, 5, 3, P.metal); s.rect(1, 44, 11, 2, P.metal); });
  // часы на столбе
  put(54, 2, s => { s.rect(7, 22, 3, 24, P.metal); disc(s, 8, 14, 7, P.white); disc(s, 8, 14, 6, P.creamLight); s.vline(8, 10, 5, P.ink); s.hline(8, 14, 4, P.ink); s.rect(3, 44, 11, 2, P.metal); });
  // урна
  put(74, 24, s => { s.rect(2, 4, 12, 18, P.metal); s.rect(3, 5, 10, 16, P.metalLight); s.rect(1, 2, 14, 3, P.metal); for (let x = 4; x < 13; x += 3) s.vline(x, 6, 15, P.metal); });
  // чемодан
  put(94, 30, s => { s.rect(1, 4, 16, 12, P.wood); s.rect(1, 8, 16, 2, P.woodDark); s.rect(6, 1, 6, 4, P.metalLight); s.rect(7, 2, 4, 2, null); s.rect(2, 5, 14, 2, light(P.wood, 0.2)); });
  // расписание на столбе
  put(114, 6, s => { s.rect(9, 26, 3, 20, P.metal); s.rect(1, 2, 20, 24, P.metal); s.rect(2, 3, 18, 22, P.ink); for (let y = 5; y < 24; y += 3) s.hline(4, y, 14, mix(P.white, P.ink, 0.35)); s.rect(4, 5, 14, 2, P.yellow); });
  // дерево
  put(140, 2, s => { s.rect(14, 30, 5, 16, P.woodDark); disc(s, 16, 20, 11, P.grassDark); disc(s, 12, 16, 8, P.grass); disc(s, 21, 17, 7, P.grass); noise(s, 6, 8, 24, 20, light(P.grass, 0.25), 7, 3); });
  return img;
}

// ---------- иконки 16×16 ----------
function icons() {
  const list = [];
  const ic = fn => { const i = new Img(T, T); fn(i); list.push(i); };
  ic(i => { i.rect(4, 3, 3, 11, P.yellow); i.rect(7, 3, 4, 2, P.yellow); i.rect(10, 5, 2, 3, P.yellow); i.rect(7, 8, 4, 2, P.yellow); i.rect(2, 9, 6, 2, P.yellow); });            // ₽
  ic(i => { const pts = [[7, 2], [6, 5], [3, 5], [5, 8], [4, 12], [7, 10], [10, 12], [9, 8], [11, 5], [8, 5]]; star(i, pts, P.yellow); });                                         // ★
  ic(i => { const pts = [[7, 2], [6, 5], [3, 5], [5, 8], [4, 12], [7, 10], [10, 12], [9, 8], [11, 5], [8, 5]]; star(i, pts, mix(P.yellow, P.ink, 0.65)); });                        // ☆
  ic(i => { i.rect(3, 6, 10, 5, hex('#d9534f')); i.rect(3, 11, 10, 3, dark(hex('#d9534f'), 0.3)); i.rect(2, 4, 3, 10, P.metal); });                                                 // место
  ic(i => { disc(i, 8, 4, 2, hex('#b9c6d2')); i.rect(6, 7, 5, 6, hex('#b9c6d2')); i.rect(6, 13, 2, 2, P.ink); i.rect(9, 13, 2, 2, P.ink); });                                       // стоячий
  ic(i => { disc(i, 8, 8, 6, P.white); disc(i, 8, 8, 5, P.creamLight); i.vline(8, 4, 5, P.ink); i.hline(8, 8, 4, P.ink); });                                                        // часы
  ic(i => { i.rect(7, 2, 3, 8, hex('#d9534f')); i.rect(7, 11, 3, 3, hex('#d9534f')); });                                                                                            // !
  ic(i => { i.rect(2, 4, 12, 7, P.cream); i.rect(2, 11, 12, 2, hex('#3b7dd8')); i.rect(4, 6, 3, 4, P.glass); i.rect(9, 6, 3, 4, P.glass); disc(i, 5, 14, 1, P.wheel); disc(i, 11, 14, 1, P.wheel); });  // поезд
  ic(i => { disc(i, 8, 8, 6, P.yellow); disc(i, 8, 8, 4, light(P.yellow, 0.35)); i.vline(8, 5, 7, P.yellowDark); });                                                                // монета
  ic(i => { for (let k = 0; k < 5; k++) { i.vline(5 + k, 8 - k, 1 + k * 2, P.white); } i.rect(4, 3, 1, 10, P.white); });                                                            // стрелка →
  ic(i => { disc(i, 8, 5, 3, hex('#f1d3b3')); i.rect(5, 9, 7, 6, hex('#2fb37a')); });                                                                                              // человек
  ic(i => { i.rect(3, 3, 3, 3, hex('#d9534f')); i.rect(10, 3, 3, 3, hex('#d9534f')); i.rect(6, 6, 4, 4, hex('#d9534f')); i.rect(3, 10, 3, 3, hex('#d9534f')); i.rect(10, 10, 3, 3, hex('#d9534f')); });   // ✕
  return tileSheet(list, 6);
}
function star(img, pts, c) {
  // заливка звезды по готовому контуру: чётно-нечётное правило
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    if (inside) img.set(x, y, c);
  }
}

// ---------- сборка ----------
const CITY = {
  berezovka: '#e8a33d', seversk: '#3f8ae0', ozersk: '#2fb37a', kamenka: '#8b5cf6',
  yasnoe: '#e3574f', prirechye: '#ec6fae', zavodskoy: '#64748b', domoy: '#b9c6d2',
};
const SKINS = ['#f1d3b3', '#e0b08a', '#c68e63', '#8d5a3b'];
const HAIRS = ['#2b2118', '#5a3a22', '#8a5a2b', '#c79a4b', '#d8d3c6', '#7a3b2b', '#3a3a44', '#a8552e'];
const PANTS = ['#5a6478', '#555a64', '#46566b', '#7a6248', '#7b7b86', '#4e5c72', '#6b6050', '#4a5466'];

const STYLES = ['short', 'long', 'cap', 'short', 'cap', 'long', 'short', 'long'];
const CAPS = ['#55606f', '#8d4a3a', '#3f6b52', '#2f3d4f', '#a8793a', '#6b4a7a', '#4a4a4a', '#b05a5a'];
// Восемь непохожих друг на друга людей в одежде одного города.
const person = (cloth, i) => ({
  cloth, skin: SKINS[i % 4], hair: HAIRS[(i * 3 + 1) % 8], pants: PANTS[(i * 5 + 2) % 8],
  shoe: '#30292f', style: STYLES[i % 8], cap: CAPS[(i * 3) % 8],
});
const peopleOf = cloth => Array.from({ length: 8 }, (_, i) => person(cloth, i));

for (const [name, color] of Object.entries(CITY)) OUT[`passengers_${name}.png`] = sheet(peopleOf(color));
for (const [name, color] of Object.entries(TRAINS)) {
  const strip = new Img(96 * 2 + 64 + 8, 48);
  strip.blit(carriage(color, false), 0, 0);
  strip.blit(carriage(color, true), 100, 0);
  strip.blit(loco(color), 200, 0);
  OUT[`train_${name}.png`] = strip;
  OUT[`interior_${name}.png`] = interiorTiles(color);
}
OUT['station_tiles.png'] = stationTiles();
OUT['props.png'] = props();
OUT['icons.png'] = icons();
{ // пассажиры в салоне сбоку: сидят и стоят, по цвету города
  const names = Object.values(CITY);
  const img = new Img(16 * names.length, 32 * 2);
  names.forEach((cloth, i) => {
    const o = { cloth, skin: SKINS[i % 4], hair: HAIRS[(i * 3) % 8], pants: PANTS[i % 8], shoe: '#30292f' };
    img.blit(seatedSide(o), i * 16, 8); img.blit(standingSide(o), i * 16, 32);
  });
  OUT['salon_people.png'] = img;
}

// ---------- запись ----------
for (const [file, img] of Object.entries(OUT)) {
  writePNG(path.join(ROOT, '1x', file), img);
  writePNG(path.join(ROOT, '2x', file), img.scale(2));
  writePNG(path.join(ROOT, '3x', file), img.scale(3));
}

// ---------- превью ----------
function label(img, s, x, y) { drawText(img, s, x, y, hex('#cfd6e2')); }
{ // люди: все 8 цветов, по одному персонажу каждого, 4 направления ×3 кадра, 3x
  const names = Object.keys(CITY);
  const pv = new Img(8 + names.length * (BLOCK_W * 2 + 10), 40 + BLOCK_H * 2);
  pv.rect(0, 0, pv.w, pv.h, hex('#1c2028'));
  names.forEach((n, i) => {
    const x = 8 + i * (BLOCK_W * 2 + 10);
    label(pv, n.slice(0, 9), x, 8);
    pv.blit(character(person(CITY[n], i)).scale(2), x, 20);
  });
  label(pv, 'ROWS: DOWN LEFT RIGHT UP   COLS: 3 WALK FRAMES', 8, pv.h - 12);
  writePNG(path.join(ROOT, 'preview_people.png'), pv);
}
{ // мир: поезд, тайлы, предметы, иконки — 2x
  const pv = new Img(680, 420);
  pv.rect(0, 0, pv.w, pv.h, hex('#1c2028'));
  let y = 10;
  label(pv, 'TRAIN 96X48 + 64X48', 10, y); y += 10;
  pv.blit(OUT['train_red.png'].scale(2), 10, y); y += 100;
  label(pv, 'STATION TILES 16X16', 10, y); y += 10;
  pv.blit(OUT['station_tiles.png'].scale(2), 10, y);
  label(pv, 'INTERIOR 16X16', 250, y - 10);
  pv.blit(OUT['interior_red.png'].scale(2), 250, y); y += 80;
  label(pv, 'PROPS', 10, y); y += 10;
  pv.blit(props().scale(2), 10, y); y += 100;
  label(pv, 'ICONS 16X16', 10, y);
  pv.blit(OUT['icons.png'].scale(2), 10, y + 10);
  label(pv, 'SALON SIDE', 250, y);
  pv.blit(OUT['salon_people.png'].scale(2), 250, y + 10);
  writePNG(path.join(ROOT, 'preview_world.png'), pv);
}

const n = Object.keys(OUT).length;
console.log(`готово: ${n} файлов × 1x/2x/3x + 2 превью → ${path.relative(process.cwd(), ROOT)}`);
for (const f of Object.keys(OUT)) console.log('  ' + f + '  ' + OUT[f].w + '×' + OUT[f].h);
