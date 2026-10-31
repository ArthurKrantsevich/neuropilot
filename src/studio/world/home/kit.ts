// ПРОБНИК: «конструктор интерьера» для дома Юнита.
// Поверхности (стены, пол) — плоские с пиксельными текстурами; мебель и предметы — мелкие воксели (сетка F = 0.5).
// Все функции мебели принимают и возвращают координаты в клетках F (мир = клетка × 0.5).
import * as THREE from "three";
import { jitter, type Vox } from "../../mascot/voxel";

export const F = 0.5;
export const PAL = {
  wood: "#8A5636",
  woodLight: "#B07A4C",
  woodDark: "#5E3A24",
  brick: "#A35D45",
  mortar: "#5A3A2E",
  plaster: "#C9B79C",
  graphite: "#3B3F49",
  metal: "#2B3240",
  orange: "#D97757",
  teal: "#3E8C8A",
  green: "#4E8F4A",
  greenDark: "#35683A",
  pot: "#C46A3C",
  cream: "#EFE6D6",
  black: "#14171D",
  yellow: "#FFC53D",
};
const J = (c: string, s: string, a = 0.06) => jitter(c, s, a);
const hash = (a: number, b = 0, c = 0) => {
  const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---------- пиксельные текстуры ----------
const texCache = new Map<string, THREE.DataTexture>();
export function pixelTexture(
  key: string,
  w: number,
  h: number,
  paint: (x: number, y: number) => string,
  nearest = true,
) {
  const hit = texCache.get(key);
  if (hit) return hit;
  const data = new Uint8Array(w * h * 4);
  const c = new THREE.Color();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      c.set(paint(x, y));
      const i = ((h - 1 - y) * w + x) * 4; // строка 0 — верх картинки
      data[i] = Math.round(c.r * 255);
      data[i + 1] = Math.round(c.g * 255);
      data[i + 2] = Math.round(c.b * 255);
      data[i + 3] = 255;
    }
  const t = new THREE.DataTexture(data, w, h);
  t.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
  t.minFilter = nearest
    ? THREE.NearestMipmapLinearFilter
    : THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  texCache.set(key, t);
  return t;
}
const shade = (hex: string, k: number) => {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return `#${c.getHexString()}`;
};
/** Кирпич: плитка 64×32 px = 8×4 мира (кирпич 1×0.5, 8×4 px), шов 1 px, у каждого кирпича свой тон. */
export const brickTex = () =>
  pixelTexture("brick", 64, 32, (x, y) => {
    const row = Math.floor(y / 4);
    const off = row % 2 ? 4 : 0;
    const bx = Math.floor((x + off) / 8);
    if (y % 4 === 3 || (x + off) % 8 === 7) return PAL.mortar;
    const k = 0.82 + hash(bx, row) * 0.3;
    const spot = hash(x, y) > 0.93 ? 0.9 : 1;
    return shade(hash(bx * 3, row) > 0.92 ? "#7E4636" : PAL.brick, k * spot);
  });
/** Доски пола: плитка 64×64 px = 8×8 мира; доска шириной 1 мир (8 px) вдоль x, стыки вразбежку, волокна. */
export const plankTex = () =>
  pixelTexture("plank", 64, 64, (x, y) => {
    const row = Math.floor(y / 8);
    const seamX = (row * 23) % 64;
    if (y % 8 === 7 || x === seamX || x === (seamX + 37) % 64)
      return PAL.woodDark;
    const seg = x < seamX ? 0 : x < (seamX + 37) % 64 ? 1 : 2;
    const k = 0.85 + hash(row, seg) * 0.28;
    const grain = hash(Math.floor(x / 5), y) > 0.86 ? 0.9 : 1;
    return shade(PAL.wood, k * grain);
  });
/** Цифровые панели: 32×32 px = 4×4 мира, швы и редкие светодиоды. */
export const panelTex = () =>
  pixelTexture("panel", 32, 32, (x, y) => {
    if (x % 16 === 0 || y % 16 === 0) return "#1C2028";
    if ((x % 16 === 13 && y % 16 === 3) || (x % 16 === 3 && y % 16 === 12))
      return "#3A6EA0";
    return shade("#2A2F39", 0.95 + hash(x >> 2, y >> 2) * 0.1);
  });
/** Штукатурка. */
export const plasterTex = () =>
  pixelTexture("plaster", 32, 32, (x, y) =>
    shade(PAL.plaster, 0.92 + hash(x >> 1, y >> 1) * 0.1),
  );
/** Небо за окном: вертикальный градиент (сглаженный). */
export const skyTex = (night: boolean) =>
  pixelTexture(
    night ? "skyN" : "skyE",
    1,
    64,
    (_, y) => {
      const t = y / 63; // 0 — верх
      const top = new THREE.Color(night ? "#04081A" : "#4A3F8A");
      const mid = new THREE.Color(night ? "#0B1638" : "#E0708A");
      const low = new THREE.Color(night ? "#1C2D5A" : "#FFB36B");
      const c =
        t < 0.35 ? top.lerp(mid, t / 0.35) : mid.lerp(low, (t - 0.35) / 0.65);
      return `#${c.getHexString()}`;
    },
    false,
  );
/** Ковёр: овал с узором, прозрачный вокруг (альфа через чёрный — используем alphaMap). */
export const rugTex = () =>
  pixelTexture("rug", 40, 24, (x, y) => {
    const q = ((x - 19.5) / 20) ** 2 + ((y - 11.5) / 12) ** 2;
    if (q > 1) return "#000000";
    if (q > 0.78) return PAL.orange;
    if (q > 0.62) return PAL.cream;
    if (q > 0.5) return PAL.orange;
    return (Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? PAL.teal : "#2F6664";
  });
export const rugAlpha = () =>
  pixelTexture("rugA", 40, 24, (x, y) =>
    ((x - 19.5) / 20) ** 2 + ((y - 11.5) / 12) ** 2 > 1 ? "#000000" : "#FFFFFF",
  );

// ---------- мелкие воксели (клетки F) ----------
/** Блок из клеток (только оболочка). */
export const block = (
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  color: string | ((x: number, y: number, z: number) => string | null),
  seed = "b",
  amt = 0.05,
): Vox[] => {
  const o: Vox[] = [];
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++) {
        const edge =
          x === x0 || x === x1 || y === y0 || y === y1 || z === z0 || z === z1;
        if (!edge) continue;
        const c = typeof color === "string" ? color : color(x, y, z);
        if (c) o.push([x, y, z, J(c, `${seed}${x},${y},${z}`, amt)]);
      }
  return o;
};

/** Верстак (клетки F): столешница на высоте 9 (4.5 мира — грудь Юнита), ящики, тиски, ящик с инструментами,
 *  недособранный мини-робот — «над чем Юнит работает». */
export const workbench = (x0: number, z0: number): Vox[] => {
  const L = 19,
    D = 7,
    T = 8;
  return [
    ...block(
      x0,
      x0 + L,
      T,
      T,
      z0,
      z0 + D,
      (x) => ((x - x0) % 4 === 3 ? PAL.wood : PAL.woodLight),
      "wb",
    ),
    ...[x0, x0 + L].flatMap((x) =>
      [z0, z0 + D].flatMap((z) => block(x, x, 0, T - 1, z, z, PAL.metal, "wl")),
    ),
    ...block(
      x0 + 1,
      x0 + 7,
      2,
      T - 1,
      z0 + 1,
      z0 + D,
      (x, y) =>
        y === 5 || y === 2
          ? PAL.woodDark
          : x === x0 + 4 && (y === 4 || y === 7)
            ? PAL.cream
            : PAL.wood,
      "dr",
    ),
    ...block(x0 + 1, x0 + L - 1, 1, 1, z0 + 1, z0 + D - 1, PAL.woodDark, "low"),
    // тиски
    ...block(
      x0 + 15,
      x0 + 18,
      T + 1,
      T + 3,
      z0 + 5,
      z0 + 7,
      PAL.graphite,
      "vi",
    ),
    [x0 + 16, T + 4, z0 + 6, PAL.metal],
    // ящик с инструментами
    ...block(x0 + 2, x0 + 6, T + 1, T + 3, z0 + 3, z0 + 6, PAL.orange, "tb"),
    ...block(x0 + 3, x0 + 5, T + 5, T + 5, z0 + 4, z0 + 4, PAL.graphite, "tbh"),
    [x0 + 3, T + 4, z0 + 4, PAL.graphite],
    [x0 + 5, T + 4, z0 + 4, PAL.graphite],
    // мини-робот без корпуса: голова-экран и проводок
    ...block(x0 + 9, x0 + 12, T + 1, T + 1, z0 + 3, z0 + 5, PAL.metal, "rb0"),
    ...block(
      x0 + 9,
      x0 + 12,
      T + 2,
      T + 4,
      z0 + 3,
      z0 + 4,
      (x, y) =>
        y === T + 3 && (x === x0 + 10 || x === x0 + 11)
          ? "#8CD2FF"
          : PAL.orange,
      "rbh",
    ),
    [x0 + 13, T + 1, z0 + 4, PAL.yellow],
    [x0 + 14, T + 1, z0 + 4, PAL.yellow],
  ];
};

/** Перфопанель с инструментами (клетки F, плоскость z). */
export const pegboard = (x0: number, y0: number, z: number): Vox[] => {
  const W = 19,
    Hh = 11;
  const o: Vox[] = block(
    x0,
    x0 + W,
    y0,
    y0 + Hh,
    z,
    z,
    (x, y) =>
      (x - x0) % 2 === 1 && (y - y0) % 2 === 1 ? "#A87A4C" : "#C9965E",
    "pb",
    0.03,
  );
  const put = (cells: [number, number, string][]) =>
    cells.forEach(([x, y, c]) =>
      o.push([x0 + x, y0 + y, z + 1, J(c, `t${x},${y}`)]),
    );
  // гаечный ключ
  put([
    [2, 2, PAL.graphite],
    [2, 3, PAL.graphite],
    [2, 4, PAL.graphite],
    [2, 5, PAL.graphite],
    [2, 6, PAL.graphite],
    [1, 7, PAL.graphite],
    [3, 7, PAL.graphite],
    [1, 8, PAL.graphite],
    [3, 8, PAL.graphite],
  ]);
  // молоток
  put([
    [6, 2, PAL.woodDark],
    [6, 3, PAL.woodDark],
    [6, 4, PAL.woodDark],
    [6, 5, PAL.woodDark],
    [6, 6, PAL.woodDark],
    [5, 7, PAL.metal],
    [6, 7, PAL.metal],
    [7, 7, PAL.metal],
    [8, 7, PAL.metal],
    [5, 8, PAL.metal],
    [6, 8, PAL.metal],
  ]);
  // отвёртки
  for (const [x, c] of [
    [11, PAL.orange],
    [13, PAL.teal],
    [15, PAL.yellow],
  ] as [number, string][])
    put([
      [x, 3, PAL.metal],
      [x, 4, PAL.metal],
      [x, 5, PAL.metal],
      [x, 6, c],
      [x, 7, c],
      [x, 8, c],
    ]);
  // моток провода
  put([
    [17, 5, PAL.teal],
    [18, 5, PAL.teal],
    [17, 6, PAL.teal],
    [18, 6, "#2F6664"],
    [17, 7, PAL.teal],
    [18, 7, PAL.teal],
  ]);
  return o;
};

/** Стеллаж (клетки F): 9×Hh×5, полки через 6 клеток, книги разной высоты, коробка, фигурка. */
export const bookcase = (x0: number, z0: number, Hh = 24): Vox[] => {
  const W = 9,
    D = 4;
  const o: Vox[] = [
    ...block(x0, x0, 0, Hh, z0, z0 + D, PAL.woodDark, "bc"),
    ...block(x0 + W, x0 + W, 0, Hh, z0, z0 + D, PAL.woodDark, "bc2"),
    ...block(x0, x0 + W, 0, Hh, z0, z0, PAL.woodDark, "bcb"),
  ];
  const cols = [
    "#C0413B",
    "#3E8C8A",
    "#E1A84B",
    "#5C6BC0",
    "#EFE6D6",
    "#7E5AA6",
    "#D97757",
    "#4E8F4A",
  ];
  for (let s = 0; s * 6 <= Hh; s++) {
    o.push(
      ...block(
        x0 + 1,
        x0 + W - 1,
        s * 6,
        s * 6,
        z0 + 1,
        z0 + D,
        PAL.wood,
        `bs${s}`,
      ),
    );
    if (s * 6 + 5 > Hh) continue;
    let x = x0 + 1;
    while (x < x0 + W) {
      const r = hash(x, s);
      if (r < 0.12 && x < x0 + W - 3) {
        o.push(
          ...block(
            x,
            x + 2,
            s * 6 + 1,
            s * 6 + 2,
            z0 + 1,
            z0 + 3,
            PAL.cream,
            `box${x}${s}`,
          ),
        );
        x += 4;
        continue;
      }
      const hh = 3 + Math.floor(hash(x, s, 1) * 3);
      const c = cols[Math.floor(hash(x, s, 2) * cols.length)];
      for (let y = 1; y <= hh; y++)
        for (let z = z0 + 1; z <= z0 + 3; z++)
          o.push([x, s * 6 + y, z, J(c, `bk${x}${s}`, 0.04)]);
      x += 1;
    }
  }
  return o;
};

/** Стол с тумбой, клавиатурой и кружкой; кресло — оранжевое (клетки F). Мониторы — отдельно. */
export const desk = (x0: number, z0: number): Vox[] => {
  const L = 17,
    D = 7,
    T = 8;
  return [
    ...block(x0, x0 + L, T, T, z0, z0 + D, PAL.wood, "dk"),
    ...block(
      x0,
      x0 + 5,
      0,
      T - 1,
      z0,
      z0 + D,
      (x, y) => (y === 3 || y === 6 ? PAL.woodDark : PAL.wood),
      "dt",
    ),
    ...block(x0 + L, x0 + L, 0, T - 1, z0 + 1, z0 + D - 1, PAL.metal, "dl"),
    // клавиатура и кружка
    ...block(x0 + 6, x0 + 12, T + 1, T + 1, z0 + 5, z0 + 6, PAL.black, "kb"),
    ...block(x0 + 14, x0 + 15, T + 1, T + 3, z0 + 5, z0 + 6, PAL.cream, "mug"),
  ];
};

/** Офисное кресло вокруг (0,0,0) — рисуется отдельной группой, чтобы его можно было повернуть. */
export const chair = (): Vox[] => [
  ...block(-3, 3, 4, 5, -3, 2, PAL.orange, "ch"),
  ...block(-3, 3, 6, 12, 3, 4, PAL.orange, "cb"),
  ...block(-4, -4, 6, 7, -2, 2, PAL.graphite, "car"),
  ...block(4, 4, 6, 7, -2, 2, PAL.graphite, "car2"),
  ...block(0, 0, 1, 3, 0, 0, PAL.metal, "cl"),
  ...block(-2, 2, 0, 0, 0, 0, PAL.metal, "cf"),
  ...block(0, 0, 0, 0, -2, 2, PAL.metal, "cf2"),
];

/** Кресло-мешок (клетки F): приплюснутый шар с вмятиной сверху. */
export const beanbag = (cx: number, cz: number, r = 6, col = PAL.orange): Vox[] => {
  const o: Vox[] = [];
  for (let x = -r; x <= r; x++)
    for (let y = 0; y <= r; y++)
      for (let z = -r; z <= r; z++) {
        const d = Math.hypot(x, (y - 0.5) * 1.6, z);
        if (d > r || d < r - 1.6) continue;
        o.push([cx + x, y, cz + z, J(col, `bb${x},${y},${z}`, 0.07)]);
      }
  return o;
};

/** Торшер (клетки F): основание, стойка; абажур — светящийся отдельно. */
export const floorLampBase = (cx: number, cz: number, h = 22): Vox[] => [
  ...block(cx - 2, cx + 2, 0, 0, cz - 2, cz + 2, PAL.metal, "flb"),
  ...block(cx, cx, 1, h, cz, cz, PAL.metal, "fls"),
];

/** Часы на стене (клетки F, плоскость z): круглый циферблат, стрелки на «10:10». */
export const wallClock = (cx: number, cy: number, z: number, r = 4): Vox[] => {
  const o: Vox[] = [];
  for (let x = -r; x <= r; x++)
    for (let y = -r; y <= r; y++) {
      const d = Math.hypot(x, y);
      if (d > r + 0.3) continue;
      o.push([cx + x, cy + y, z, d > r - 0.8 ? PAL.orange : PAL.cream]);
    }
  // стрелки «12:15»: минутная вверх, часовая вправо; деления — графитовые
  for (let k = 0; k <= r - 1.5; k++) o.push([cx, cy + k, z + 1, PAL.black]);
  for (let k = 1; k <= r - 2.5; k++) o.push([cx + k, cy, z + 1, PAL.black]);
  for (const [x, y] of [[0, -(r - 1)], [-(r - 1), 0], [r - 1, 0]]) o.push([cx + x, cy + y, z + 1, PAL.graphite]);
  return o;
};

/** Запасные наушники Юнита на крючке (плоскость x — левая стена; клетки F). */
export const hookHeadphones = (x: number, cy: number, cz: number): Vox[] => {
  const o: Vox[] = [[x, cy + 4, cz, PAL.metal]];
  for (let z = -3; z <= 3; z++) o.push([x + 1, cy + 3 + (Math.abs(z) < 3 ? 0 : -1), cz + z, PAL.graphite]);
  for (const z of [-3, 3]) for (let y = 0; y <= 2; y++) o.push([x + 1, cy + y, cz + z, PAL.graphite], [x + 1, cy + y, cz + z + (z > 0 ? -1 : 1), PAL.graphite]);
  return o;
};

/** Растение: горшок и круглая крона (клетки F). */
export const plant = (
  cx: number,
  cz: number,
  y0 = 0,
  r = 4,
  trunk = 4,
): Vox[] => {
  const o: Vox[] = block(
    cx - 2,
    cx + 2,
    y0,
    y0 + 4,
    cz - 2,
    cz + 2,
    (x, y) => (y === y0 + 4 ? "#A8552F" : PAL.pot),
    `pt${cx}${cz}`,
  );
  for (let y = 5; y < 5 + trunk; y++) o.push([cx, y0 + y, cz, PAL.woodDark]);
  const c0 = y0 + 5 + trunk + r - 1;
  for (let x = -r; x <= r; x++)
    for (let y = -r; y <= r; y++)
      for (let z = -r; z <= r; z++) {
        const d = Math.hypot(x, y * 1.1, z);
        if (d > r || d < r - 1.8) continue;
        if (hash(x + cx, y, z + cz) > 0.82) continue;
        o.push([
          cx + x,
          c0 + y,
          cz + z,
          J(
            hash(x, y, z) > 0.5 ? PAL.green : PAL.greenDark,
            `lf${x}${y}${z}${cx}`,
            0.12,
          ),
        ]);
      }
  return o;
};

/** Зарядная капсула-лежанка Юнита (клетки F). */
export const chargePod = (x0: number, y0: number, z0: number): Vox[] => [
  ...block(x0, x0 + 13, y0, y0 + 2, z0, z0 + 6, PAL.graphite, "cp"),
  ...block(x0, x0 + 1, y0 + 3, y0 + 8, z0, z0 + 6, PAL.graphite, "cph"),
  ...block(x0 + 2, x0 + 12, y0 + 3, y0 + 3, z0 + 1, z0 + 5, "#4A5466", "cpm"),
  ...block(x0 + 2, x0 + 4, y0 + 4, y0 + 4, z0 + 2, z0 + 4, PAL.cream, "pil"),
];

/** Ящики (клетки F). */
export const crate = (
  x0: number,
  y0: number,
  z0: number,
  s = 5,
  seed = "cr",
): Vox[] =>
  block(
    x0,
    x0 + s,
    y0,
    y0 + s,
    z0,
    z0 + s,
    (x, y, z) =>
      (x - x0 + y - y0 + z - z0) % 3 === 0 ? PAL.wood : PAL.woodLight,
    seed,
    0.04,
  );
