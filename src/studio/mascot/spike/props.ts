// Предметы в руках и рядом с Юнитом: позы в системе координат тела + коллайдеры тела.
// Один источник правды для отрисовки (CatalogSpike → Effects) и для автотеста столкновений (scripts/collide-test.cts).
import * as THREE from "three";
import { ROBOT2 } from "../robot2";
import { shoulderMatrix, type ArmPose, type V3 } from "./RigSpike";

const S = ROBOT2.scale;
const tmp = new THREE.Matrix4();

export type BodyPose = {
  pos: V3;
  yaw: number;
  pelvisY: number;
  lift: number;
  pitch: number;
  twist: number;
  roll?: number;
  headYaw: number;
  headPitch: number;
  headRoll: number;
  armL: ArmPose;
  armR: ArmPose;
};
type Base = Pick<
  BodyPose,
  "pos" | "yaw" | "pelvisY" | "lift" | "pitch" | "twist" | "roll"
>;

/** Корень: ступни на полу, единицы героя. */
export const rootMatrix = (f: Base) =>
  new THREE.Matrix4()
    .makeTranslation(f.pos[0], f.lift, f.pos[2])
    .multiply(tmp.makeRotationY(f.yaw))
    .multiply(tmp.makeScale(S, S, S));
/** Корпус: начало в тазу, наклоны корпуса учтены. */
export const torsoMatrix = (f: Base) =>
  rootMatrix(f)
    .multiply(tmp.makeTranslation(0, f.pelvisY, 0))
    .multiply(
      tmp.makeRotationFromEuler(
        new THREE.Euler(f.pitch, f.twist, f.roll ?? 0, "YXZ"),
      ),
    );
export const headMatrix = (f: BodyPose) =>
  torsoMatrix(f)
    .multiply(tmp.makeTranslation(0, 4.7, 0))
    .multiply(
      tmp.makeRotationFromEuler(
        new THREE.Euler(f.headPitch, f.headYaw, f.headRoll, "YXZ"),
      ),
    );
export const apply = (m: THREE.Matrix4, p: V3): V3 => {
  const v = new THREE.Vector3(...p).applyMatrix4(m);
  return [v.x, v.y, v.z];
};
export const torsoPt = (f: Base, p: V3) => apply(torsoMatrix(f), p);
export const rootPt = (f: Base, p: V3) => apply(rootMatrix(f), p);
export const fwdOf = (yaw: number): V3 => [Math.sin(yaw), 0, Math.cos(yaw)];

// ---------- коллайдеры тела (коробки в своих системах, единицы героя) ----------
type Box = { name: string; m: THREE.Matrix4; c: V3; h: V3 };
export function bodyBoxes(f: BodyPose): Box[] {
  const t = torsoMatrix(f);
  const h = headMatrix(f);
  const arm = (side: 1 | -1, a: ArmPose): Box[] => {
    const up = shoulderMatrix(f, side).multiply(
      tmp.makeRotationFromEuler(new THREE.Euler(...a.sh)),
    );
    const lo = up
      .clone()
      .multiply(tmp.makeTranslation(0, -1, 0))
      .multiply(tmp.makeRotationX(a.elbow));
    return [
      {
        name: side > 0 ? "плечо R" : "плечо L",
        m: up,
        c: [0, -0.5, 0],
        h: [0.5, 0.5, 0.5],
      },
      {
        name: side > 0 ? "кисть R" : "кисть L",
        m: lo,
        c: [0, -0.5, 0],
        h: [0.5, 0.5, 0.5],
      },
    ];
  };
  return [
    { name: "корпус", m: t, c: [0, 2.2, 0], h: [2, 1.5, 1.5] },
    { name: "шея", m: t, c: [0, 4.2, 0], h: [0.5, 0.5, 0.5] },
    { name: "голова", m: h, c: [0, 2.5, 0], h: [3, 2.5, 2] },
    { name: "наушник L", m: h, c: [-3.5, 2.5, 0], h: [0.5, 1, 1] },
    { name: "наушник R", m: h, c: [3.5, 2.5, 0], h: [0.5, 1, 1] },
    ...arm(-1, f.armL),
    ...arm(1, f.armR),
  ];
}

/** Насколько шар (мир, радиус в мировых единицах) входит в тело; 0 — не касается. */
export function penetration(
  f: BodyPose,
  p: V3,
  r: number,
  skip: string[] = [],
) {
  let worst = 0;
  let what = "";
  for (const b of bodyBoxes(f)) {
    if (skip.includes(b.name)) continue;
    const q = new THREE.Vector3(...p).applyMatrix4(b.m.clone().invert());
    const d = new THREE.Vector3(
      Math.max(Math.abs(q.x - b.c[0]) - b.h[0], 0),
      Math.max(Math.abs(q.y - b.c[1]) - b.h[1], 0),
      Math.max(Math.abs(q.z - b.c[2]) - b.h[2], 0),
    ).length();
    // внутри коробки — глубина до ближайшей грани
    const inside =
      d === 0
        ? Math.min(
            b.h[0] - Math.abs(q.x - b.c[0]),
            b.h[1] - Math.abs(q.y - b.c[1]),
            b.h[2] - Math.abs(q.z - b.c[2]),
          )
        : 0;
    const pen = (r / S - d + inside) * S;
    if (pen > worst) {
      worst = pen;
      what = b.name;
    }
  }
  return { pen: worst, what };
}

// ---------- позы предметов ----------
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const smooth = (x: number) => x * x * (3 - 2 * x);
const add = (a: V3, b: V3, k = 1): V3 => [
  a[0] + b[0] * k,
  a[1] + b[1] * k,
  a[2] + b[2] * k,
];
const lerp = (a: V3, b: V3, q: number): V3 => [
  a[0] + (b[0] - a[0]) * q,
  a[1] + (b[1] - a[1]) * q,
  a[2] + (b[2] - a[2]) * q,
];
const bez = (a: V3, m: V3, b: V3, q: number) =>
  lerp(lerp(a, m, q), lerp(m, b, q), q);
const norm = (v: V3): V3 => {
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** Точка «над ладонью»: предмет висит перед кистью на силе, не касаясь её. */
export const palmHover = (f: Base, hand: V3, dist = 1.15): V3 =>
  add(add(hand, fwdOf(f.yaw), dist), [0, 0.12, 0]);
const CUBE_R = 0.62; // куб 1×1 (мир): радиус шара для проверки

// притянуть: кирпич с пола по дуге к ладони
export const PULL_FROM: V3 = [3.4, 0.5, 4.0];
export function pullPose(f: Base & { tau: number; hand: V3 }) {
  const H = palmHover(f, f.hand);
  const k = smooth(ramp(f.tau, 0.8, 1.8));
  const mid: V3 = [
    (PULL_FROM[0] + H[0]) / 2,
    Math.max(H[1], 0.5) + 2.2,
    (PULL_FROM[2] + H[2]) / 2,
  ];
  const settle =
    f.tau > 1.8
      ? 0.22 * Math.exp(-5 * (f.tau - 1.8)) * Math.cos(13 * (f.tau - 1.8))
      : 0;
  const p: V3 =
    f.tau < 0.8
      ? [
          PULL_FROM[0] + (f.tau > 0.4 ? 0.03 * Math.sin(f.tau * 70) : 0),
          PULL_FROM[1],
          PULL_FROM[2],
        ]
      : k < 1
        ? bez(PULL_FROM, mid, H, k)
        : add(H, [0, settle, 0]);
  return { p, k, r: CUBE_R };
}

// поставить на место: кирпич висит у ладони, по дуге уходит на постамент
export const PEDESTAL: V3 = [4.1, 0, 1.8];
export function placePose(f: Base & { tau: number; hand: V3 }) {
  const H = palmHover(f, f.hand);
  const top: V3 = [PEDESTAL[0], 1.2 + 0.5, PEDESTAL[2]];
  const k = smooth(ramp(f.tau, 0.5, 1.6));
  // дуга сначала уходит вперёд-вверх от ладони, потом опускается на постамент: кисть не задевает
  const mid: V3 = [
    top[0] - 0.2,
    Math.max(H[1], top[1]) + 1.8,
    Math.max(H[2], top[2]) + 0.6,
  ];
  return { p: bez(H, mid, top, k), k, top, r: CUBE_R };
}

// рупор: узкий конец у подбородка справа, раструб наружу-вперёд; рукоять в правой кисти
export const MEGA = {
  N: [1.6, 5.5, 3.1] as V3,
  dir: norm([1, 0.12, 0.35]),
  len: 2.0,
  r0: 0.25,
  r1: 0.85,
};
export const MEGA_HAND: V3 = [2.6, 4.05, 1.85]; // цель кисти (корпус)
export function megaPose(f: Base) {
  const m = torsoMatrix(f);
  const N = apply(m, MEGA.N);
  const W = apply(m, add(MEGA.N, MEGA.dir, MEGA.len));
  const grip = apply(m, add(add(MEGA.N, MEGA.dir, 0.7), [0, -0.42, 0]));
  const hand = apply(m, add(MEGA_HAND, [0, 0.5, 0.1]));
  // шары вдоль конуса для проверки
  const probe = Array.from({ length: 6 }, (_, i) => {
    const q = i / 5;
    return {
      p: apply(m, add(MEGA.N, MEGA.dir, MEGA.len * q)),
      r: (MEGA.r0 + (MEGA.r1 - MEGA.r0) * q) * S,
    };
  });
  return { N, W, grip, hand, probe };
}

// книга: почти горизонтально перед грудью, верхний край к телу, страницы видны сверху
export const BOOK = { c: [0, 3.55, 1.98] as V3, tilt: -1.05, w: 1.05, d: 1.3 };
export const BOOK_HANDS: [V3, V3] = [
  [-1.3, 3.45, 1.8],
  [1.3, 3.45, 1.8],
];
export function bookMatrix(f: Base) {
  return torsoMatrix(f)
    .multiply(tmp.makeTranslation(...BOOK.c))
    .multiply(tmp.makeRotationX(BOOK.tilt));
}
export function bookProbe(f: Base) {
  const m = bookMatrix(f);
  const o: { p: V3; r: number }[] = [];
  for (const x of [-1.0, -0.5, 0, 0.5, 1.0])
    for (const y of [-0.65, 0, 0.65])
      o.push({ p: apply(m, [x, y, 0]), r: 0.1 * S });
  return o;
}

// рассматривает: кубик парит над правой ладонью сбоку — силуэт чистый, не лезет на шею и лицо
export const INSPECT_HAND: V3 = [3.0, 2.7, 1.95];
export function inspectPose(f: Base & { tau: number }) {
  const c = torsoPt(f, [3.2, 4.0 + 0.08 * Math.sin(f.tau * 3), 2.4]);
  return { c, r: 0.82 * S };
}

// график: справа от Юнита, в его плоскости, целиком в кадре
export const CHART = { c: [5.2, 2.9, 1.7] as V3, w: 3.0, h: 3.8 };
export const CHART_HAND: V3 = [3.0, 3.7, 1.95]; // мир
export function chartProbe() {
  const o: { p: V3; r: number }[] = [];
  for (const x of [-1.5, 0, 1.5])
    for (const y of [-1.9, 0, 1.9])
      o.push({ p: [CHART.c[0] + x, CHART.c[1] + y, CHART.c[2]], r: 0.05 });
  return o;
}

// звезда, на которую указывает: над головой слева, не задевая её
export const STAR: V3 = [-4.9, 12.0, 1.6];

// ящик для «садится»: за бёдрами, верх — ровно под низом корпуса
export const SEAT = { c: [0, 0.825, -0.95] as V3, h: [2.3, 0.825, 0.8] as V3 };
