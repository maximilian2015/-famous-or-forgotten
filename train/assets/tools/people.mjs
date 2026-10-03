// Пассажиры: 16×32, 4 направления × 3 кадра, лист как в RPG Maker (вниз, влево, вправо, вверх).
import { Img, fromAscii, checkAscii, hex, dark, light } from './pixel.mjs';

export const CELL_W = 16, CELL_H = 32;       // один кадр
export const BLOCK_W = CELL_W * 3, BLOCK_H = CELL_H * 4;   // один персонаж: 48×128
export const OUTLINE = hex('#241f2b');

// ---------- головы (16 × 14) ----------
const HEAD_DOWN = checkAscii('head.down', [
  '................',
  '....HHHHHHHH....',
  '...HHHHHHHHHH...',
  '..HHHHHHHHHHHH..',
  '..HHHHHHHHHHHH..',
  '..HHSSSSSSSSHH..',
  '..HSSSSSSSSSSH..',
  '..SSSSSSSSSSSS..',
  '..SSEESSSSEESS..',
  '..SSEESSSSEESS..',
  '..SSSSSSSSSSSS..',
  '...SSSSSSSSSS...',
  '....SSSSSSSS....',
  '.....ssssss.....',
], 16);

const HEAD_LEFT = checkAscii('head.left', [
  '................',
  '....HHHHHHHH....',
  '...HHHHHHHHHH...',
  '..HHHHHHHHHHHH..',
  '..HHHHHHHHHHHH..',
  '..SSSSHHHHHHHH..',
  '..SSSSSSHHHHHH..',
  '..SSSSSSSHHHHH..',
  '..EESSSSSHHHHH..',
  '..EESSSSSHHHHH..',
  '..SSSSSSSSHHHH..',
  '...SSSSSSSHHH...',
  '....SSSSSSS.....',
  '.....sssss......',
], 16);

const HEAD_UP = checkAscii('head.up', [
  '................',
  '....HHHHHHHH....',
  '...HHHHHHHHHH...',
  '..HHHHHHHHHHHH..',
  '..HHHHHHHHHHHH..',
  '..HHHHHHHHHHHH..',
  '..HHHHHHHHHHHH..',
  '..HHHHHHHHHHHH..',
  '..HHHHHHHHHHHH..',
  '..HHHHHHHHHHHH..',
  '..SHHHHHHHHHHS..',
  '...SHHHHHHHHS...',
  '....SSSSSSSS....',
  '.....ssssss.....',
], 16);

// ---------- корпус (16 × 11) ----------
const BODY_DOWN = checkAscii('body.down', [
  '...LLLLLLLLLL...',
  '..LCCCCCCCCCCL..',
  '..CcCCCCCCCCcC..',
  '..CcCCCCCCCCcC..',
  '..CcCCCCCCCCcC..',
  '..SScCCCCCCcSS..',
  '..SScCCCCCCcSS..',
  '..sSCCCCCCCCSs..',
  '...CCCCCCCCCC...',
  '...PPPPPPPPPP...',
  '...PPPPPPPPPP...',
], 16);

const BODY_LEFT = checkAscii('body.left', [
  '....LLLLLLLL....',
  '...LCCCCCCCCL...',
  '...CCCCCCCCcC...',
  '...CCCCCCCCcC...',
  '..SSCCCCCCCcC...',
  '..SSCCCCCCCcC...',
  '..sSCCCCCCCcC...',
  '...CCCCCCCCCC...',
  '...CCCCCCCCCC...',
  '...PPPPPPPPPP...',
  '...PPPPPPPPPP...',
], 16);

const BODY_UP = checkAscii('body.up', [
  '...LLLLLLLLLL...',
  '..LCCCCCCCCCCL..',
  '..CcCCCCCCCCcC..',
  '..CcCCCCCCCCcC..',
  '..CcCCCCCCCCcC..',
  '..SScCCCCCCcSS..',
  '..SScCCCCCCcSS..',
  '..sSCCCCCCCCSs..',
  '...CCCCCCCCCC...',
  '...PPPPPPPPPP...',
  '...PPPPPPPPPP...',
], 16);

// ---------- нога (4 × 7), тень по внутреннему краю ----------
const LEG_L = checkAscii('leg', ['PPPp', 'PPPp', 'PPPp', 'PPPp', 'pppp', 'BBBb', 'BBBb'], 4);

// Один кадр: голова 0..13, корпус 14..24, ноги 25..31.
// Шаг: [x, подъём, вид] — L/R левая и правая, B/F дальняя и ближняя нога в профиль.
// Причёска/шапка поверх готовой головы: из одной болванки получается много разных людей.
function applyStyle(img, style, dir, pal) {
  if (style === 'long') {
    const runs = dir === 'left' ? [[11, 3]] : [[2, 2], [12, 2]];
    for (const [x, w] of runs) {
      img.rect(x, 10, w, 9, pal.H);
      img.rect(x, 18, w, 1, pal.h);
    }
  } else if (style === 'cap') {
    const cap = pal.K, capDark = pal.k;
    for (let y = 1; y <= 4; y++) for (let x = 0; x < CELL_W; x++) {
      const c = img.get(x, y);
      if (c[3] && (c[0] === pal.H[0] && c[1] === pal.H[1] && c[2] === pal.H[2])) img.set(x, y, cap);
    }
    if (dir === 'down') img.rect(1, 5, 14, 1, capDark);
    else if (dir === 'left') img.rect(0, 5, 12, 1, capDark);
    else img.rect(2, 5, 12, 1, capDark);
  }
}

function frame(head, body, legs, pal, style, dir) {
  const img = new Img(CELL_W, CELL_H);
  img.blit(fromAscii(head, pal), 0, 0);
  if (style === 'cap') applyStyle(img, 'cap', dir, pal);
  img.blit(fromAscii(body, pal), 0, 14);
  if (style === 'long') applyStyle(img, 'long', dir, pal);   // волосы ложатся поверх плеч
  const legL = fromAscii(LEG_L, pal), legR = legL.mirrorX();
  const back = fromAscii(LEG_L, { ...pal, P: pal.p, p: dark(pal.p, 0.25), B: dark(pal.B, 0.3), b: dark(pal.B, 0.45) });
  for (const [lx, ly, kind] of legs) img.blit(kind === 'R' || kind === 'F' ? legR : kind === 'B' ? back : legL, lx, 25 + ly);
  return img;
}

// Спереди/сзади ноги по бокам и поднимаются; сбоку — шаг вперёд-назад, дальняя нога темнее.
const STEPS_FRONT = [
  [[3, -2, 'L'], [9, 0, 'R']],
  [[3, 0, 'L'], [9, 0, 'R']],
  [[3, 0, 'L'], [9, -2, 'R']],
];
const STEPS_SIDE = [
  [[3, 0, 'B'], [8, 0, 'F']],
  [[5, 0, 'B'], [6, 0, 'F']],
  [[8, 0, 'B'], [3, 0, 'F']],
];

export function palette({ skin, hair, cloth, pants, shoe, cap }) {
  const S = hex(skin), H = hex(hair), C = hex(cloth), P = hex(pants), K = hex(cap || '#55606f');
  return {
    S, s: dark(S, 0.22), H, h: light(H, 0.25), E: hex('#2b2430'), K, k: dark(K, 0.35),
    C, c: dark(C, 0.3), L: light(C, 0.22), P, p: dark(P, 0.32), B: hex(shoe || '#30292f'), b: dark(hex(shoe || '#30292f'), 0.3),
  };
}

// Персонаж 48×128: строки — вниз, влево, вправо, вверх; столбцы — три кадра ходьбы.
export function character(opts) {
  const pal = palette(opts);
  const block = new Img(BLOCK_W, BLOCK_H);
  const style = opts.style || 'short';
  const rows = [
    { head: HEAD_DOWN, body: BODY_DOWN, steps: STEPS_FRONT, dir: 'down', mirror: false },
    { head: HEAD_LEFT, body: BODY_LEFT, steps: STEPS_SIDE, dir: 'left', mirror: false },
    { head: HEAD_LEFT, body: BODY_LEFT, steps: STEPS_SIDE, dir: 'left', mirror: true },
    { head: HEAD_UP, body: BODY_UP, steps: STEPS_FRONT, dir: 'up', mirror: false },
  ];
  rows.forEach((r, ri) => r.steps.forEach((legs, ci) => {
    let f = frame(r.head, r.body, legs, pal, style, r.dir).outline(OUTLINE);
    if (r.mirror) f = f.mirrorX();
    block.blit(f, ci * CELL_W, ri * CELL_H);
  }));
  return block;
}

// Лист на 8 персонажей, 4×2 — как в RPG Maker.
export function sheet(list) {
  const img = new Img(BLOCK_W * 4, BLOCK_H * 2);
  list.forEach((opts, i) => img.blit(character(opts), (i % 4) * BLOCK_W, Math.floor(i / 4) * BLOCK_H));
  return img;
}

// Отдельно: пассажир сидит и стоит в профиль — для вида салона сбоку.
export function seatedSide(opts) {
  const pal = palette(opts);
  const img = new Img(16, 24);
  img.blit(fromAscii(HEAD_LEFT, pal), 0, 0);
  img.blit(fromAscii(checkAscii('seated', [
    '....CCCCCCCC....',
    '...CCCCCCCCCC...',
    '...CCCCCCCCcC...',
    '..SCCCCCCCCcC...',
    '..SCCCCCCCCcC...',
    'PPPPPPPCCCCcC...',
    'PPPPPPPPPPPPC...',
    'pppppppPPPPPP...',
    'BBB....ppppp....',
    'BBB.............',
  ], 16), pal), 0, 14);
  return img.outline(OUTLINE);
}

export function standingSide(opts) {
  const pal = palette(opts);
  const img = new Img(16, 32);
  img.blit(fromAscii(HEAD_LEFT, pal), 0, 0);
  img.blit(fromAscii(checkAscii('strap', [
    '....CCCCCCCC....',
    '...CCCCCCCCCC...',
    '...CCCCCCCCcC...',
    '...CCCCCCCCcC...',
    '...CCCCCCCCcC...',
    '...CCCCCCCCcC...',
    '...CCCCCCCCcC...',
    '...CCCCCCCCCC...',
    '...CCCCCCCCCC...',
    '...PPPPPPPPPP...',
    '...PPPPPPPPPP...',
  ], 16), pal), 0, 14);
  const leg = fromAscii(LEG_L, pal);
  img.blit(leg, 4, 25); img.blit(leg.mirrorX(), 8, 25);
  return img.outline(OUTLINE);
}
