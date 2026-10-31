"use client";
// Подмена пакета remotion для сайта: код студии написан под Remotion (кадр видео), здесь кадр = живое время браузера.
// random — тот же алгоритм, что в Remotion (mulberry32 от хэша строки), чтобы фактура кубиков совпадала с роликами.
import { createContext, useContext, type CSSProperties, type ReactNode } from "react";

export const FPS = 60;
export const FrameContext = createContext(0);
export const SizeContext = createContext({ width: 1920, height: 1080 });

export const useCurrentFrame = () => useContext(FrameContext);
export const useVideoConfig = () => {
  const { width, height } = useContext(SizeContext);
  return { width, height, fps: FPS, durationInFrames: Number.MAX_SAFE_INTEGER, id: "site" };
};

function mulberry32(a: number) {
  let t = a + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function hashCode(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
export const random = (seed: string | number | null) => {
  if (seed === null) return Math.random();
  return typeof seed === "string" ? mulberry32(hashCode(seed)) : mulberry32(seed * 10000000000);
};

type Ease = (t: number) => number;
export const Easing = {
  linear: ((t) => t) as Ease,
  cubic: ((t) => t * t * t) as Ease,
  in: (f: Ease): Ease => f,
  out: (f: Ease): Ease => (t) => 1 - f(1 - t),
  inOut: (f: Ease): Ease => (t) => (t < 0.5 ? f(t * 2) / 2 : 1 - f((1 - t) * 2) / 2),
  back: (s = 1.70158): Ease => (t) => t * t * ((s + 1) * t - s),
};

type Extrapolate = "clamp" | "extend" | "identity";
export const interpolate = (
  x: number,
  input: readonly number[],
  output: readonly number[],
  opts: { easing?: Ease; extrapolateLeft?: Extrapolate; extrapolateRight?: Extrapolate } = {},
) => {
  const { easing = (t: number) => t, extrapolateLeft = "extend", extrapolateRight = "extend" } = opts;
  let i = 1;
  while (i < input.length - 1 && x > input[i]) i++;
  const a = input[i - 1];
  const b = input[i];
  let t = b === a ? 0 : (x - a) / (b - a);
  if (t < 0 && extrapolateLeft === "clamp") t = 0;
  if (t > 1 && extrapolateRight === "clamp") t = 1;
  if (t < 0 && extrapolateLeft === "identity") return x;
  if (t > 1 && extrapolateRight === "identity") return x;
  const e = t >= 0 && t <= 1 ? easing(t) : t;
  return output[i - 1] + (output[i] - output[i - 1]) * e;
};

export const AbsoluteFill: React.FC<{ style?: CSSProperties; children?: ReactNode }> = ({ style, children }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", ...style }}>{children}</div>
);
