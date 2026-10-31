// Риг маскота: поза = набор чисел, анимация = ключи поз + процедурные слои (дыхание, моргание).
// Движения задаём параметрами под сюжет ролика, а не берём из библиотеки клипов.
import { Easing, interpolate, random } from "remotion";

export type Eye = "open" | "happy" | "wow";

export type Pose = {
  x: number; // положение на полу
  y: number; // прыжок
  turn: number; // поворот всего тела, рад
  lean: number; // наклон вбок, рад
  squash: number; // >0 вытянут, <0 сплющен; объём сохраняется
  headTilt: number;
  headTurn: number;
  armL: number; // подъём руки вбок, рад (0 — вдоль тела)
  armR: number;
  armLf: number; // вынос руки вперёд, рад
  armRf: number;
  eye: Eye;
  blink: number; // 0 — открыт, 1 — закрыт
};

export const REST: Pose = {
  x: 0,
  y: 0,
  turn: 0,
  lean: 0,
  squash: 0,
  headTilt: 0,
  headTurn: 0,
  armL: 0.12,
  armR: 0.12,
  armLf: 0,
  armRf: 0,
  eye: "open",
  blink: 0,
};

export type Key<P extends Pose = Pose> = { f: number; p: Partial<P>; ease?: (t: number) => number };

const smooth = Easing.inOut(Easing.cubic);

// ключи сортированы по кадру; числовые поля интерполируются между ближайшими ключами, где они заданы,
// остальные (глаза, режим экрана) переключаются ступенькой. base задаёт набор полей — риг можно расширять.
export const poseAt = <P extends Pose>(keys: Key<P>[], frame: number, base: P = REST as P): P => {
  const out = { ...base } as Record<string, unknown>;
  for (const field of Object.keys(base) as (keyof P & string)[]) {
    const ks = keys.filter((k) => k.p[field] !== undefined);
    if (ks.length === 0) continue;
    if (typeof base[field] !== "number") {
      const past = ks.filter((k) => k.f <= frame);
      if (past.length) out[field] = past[past.length - 1].p[field];
      continue;
    }
    const v = (k: Key<P>) => k.p[field] as number;
    const next = ks.findIndex((k) => k.f > frame);
    if (next === -1) out[field] = v(ks[ks.length - 1]);
    else if (next === 0) out[field] = v(ks[0]);
    else {
      const a = ks[next - 1];
      const b = ks[next];
      out[field] = interpolate(frame, [a.f, b.f], [v(a), v(b)], { easing: b.ease ?? smooth });
    }
  }
  return out as P;
};

// ступенчатое поле: текущее значение, прошлое и кадр переключения — для переходов (шторка экрана)
export const stepAt = <P extends Pose, F extends keyof P>(keys: Key<P>[], field: F, frame: number, base: P) => {
  const past = keys.filter((k) => k.p[field] !== undefined && k.f <= frame);
  const cur = past.length ? (past[past.length - 1].p[field] as P[F]) : base[field];
  // первый ключ — без перехода: показываем его сразу
  const prev = past.length > 1 ? (past[past.length - 2].p[field] as P[F]) : cur;
  const since = past.length ? past[past.length - 1].f : -Infinity;
  return { cur, prev, since };
};

// дыхание и моргание поверх ключей; seed — свой у каждого ролика, чтобы ритм не совпадал
export const alive = <P extends Pose>(pose: P, frame: number, fps: number, seed: string): P => {
  const breath = Math.sin((frame / fps) * Math.PI * 0.9) * 0.018;
  let blink = 0;
  let t = Math.round(fps * (0.6 + random(`${seed}-0`) * 1.2));
  for (let i = 1; t < frame + 8; i++) {
    const d = frame - t;
    if (d >= 0 && d < 7) blink = Math.max(blink, 1 - Math.abs(d - 3) / 3.5);
    t += Math.round(fps * (2.2 + random(`${seed}-${i}`) * 2.4));
  }
  return {
    ...pose,
    squash: pose.squash + breath,
    blink: Math.max(pose.blink, blink),
  };
};

// упругий выход 0→1 с перелётом — для появления предметов
export const pop = (frame: number, start: number, dur = 14) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(2.2)),
  });
