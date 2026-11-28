"use client";
import type { CSSProperties } from "react";
import "./progress.css";

// Функции прогресса из опыта Harrison, Amento, Kuznetsov, Bell — «Rethinking the Progress Bar», UIST 2007.
// x — настоящая доля работы 0..1, ответ — что показать на полоске 0..1. Время окончания не меняется, только темп.

/** Fast Power: медленно в начале, разгон к концу — показалась быстрее линейной. */
export const fastPower = (x: number) => (x + (1 - x) / 2) ** 8;

/** Late Pause: почти линейная, большая пауза около 75 % — показалась медленнее линейной. */
export const latePause = (x: number) => (x < 0.56 ? (x / 0.56) * 0.75 : x < 0.82 ? 0.75 : 0.75 + ((x - 0.82) / 0.18) * 0.25);

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * «Честная полоска»: progress 0..1 — сколько сделано на самом деле, на экране — fastPower(progress).
 * ribbing — полосы, бегущие назад (Harrison, Yeo, Hudson, «Faster Progress Bars», CHI 2010: +11 % к ощущению скорости).
 * Двигается только transform заливки и background-position полос.
 */
export function HonestProgress({
  progress,
  ribbing = false,
  vertical = false,
  ease = fastPower,
  label,
  className = "",
}: {
  progress: number;
  ribbing?: boolean;
  vertical?: boolean;
  ease?: (x: number) => number;
  label?: string;
  className?: string;
}) {
  const shown = clamp01(ease(clamp01(progress)));
  const pct = Math.floor(shown * 100 + 1e-6);
  return (
    <div
      className={`hp ${vertical ? "hp-v" : "hp-h"} ${ribbing ? "hp-ribs" : ""} ${className}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      style={{ "--p": shown } as CSSProperties}
    >
      <div className="hp-well">
        <div className="hp-fill" />
      </div>
    </div>
  );
}
