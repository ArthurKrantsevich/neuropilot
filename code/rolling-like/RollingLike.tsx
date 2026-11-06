"use client";
import { useLayoutEffect, useRef, useState } from "react";
import "./rolling-like.css";

export type RollingText = { like: string; liked: string };

const DIGITS = "01234567890123456789"; // столбик: 0–9 дважды — чтобы 9 → 0 крутилось дальше, а не назад
const ROLL_MS = 600;
const STAGGER_MS = 60;

/** Одна цифра-барабан: столбик сдвигается на номер цифры (только transform). */
function Drum({ d, order }: { d: number; order: number }) {
  const prev = useRef(d);
  const [row, setRow] = useState(d);
  const [animate, setAnimate] = useState(false);
  useLayoutEffect(() => {
    if (d === prev.current) return;
    // рост — крутим вперёд: 9 → 0 едет на строку 10 (второй круг), потом незаметно возвращаемся в первый
    const up = d > prev.current;
    prev.current = d;
    setAnimate(true);
    setRow(up ? d : d + 10);
    const id = setTimeout(() => {
      setAnimate(false);
      setRow(d);
    }, ROLL_MS + order * STAGGER_MS + 30);
    return () => clearTimeout(id);
  }, [d, order]);
  return (
    <span className="rl-drum" aria-hidden="true">
      <span
        className="rl-col"
        style={{
          transform: `translateY(${-row * 1.2}em)`,
          transition: animate ? `transform ${ROLL_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1) ${order * STAGGER_MS}ms` : "none",
        }}
      >
        {[...DIGITS].map((c, i) => (
          <i key={i}>{c}</i>
        ))}
      </span>
    </span>
  );
}

/** Число из барабанов с пробелом между тысячами. Крутятся только изменившиеся цифры — справа налево. */
export function RollingNumber({ value }: { value: number }) {
  const digits = [...String(value)];
  return (
    <span className="rl-num" aria-label={String(value)}>
      {digits.map((c, i) => {
        const fromRight = digits.length - 1 - i; // ключ и задержка — от правого края: разряды не путаются
        return (
          <span key={fromRight} className={fromRight % 3 === 2 && i > 0 ? "rl-gap" : undefined}>
            <Drum d={+c} order={fromRight} />
          </span>
        );
      })}
    </span>
  );
}

/** Кнопка лайка со счётчиком-барабаном. Шортс «Почему просмотры на YouTube крутятся барабаном». */
export function RollingLike({ t, start = 1299 }: { t: RollingText; start?: number }) {
  const [n, setN] = useState(start);
  const [on, setOn] = useState(false);
  const [pop, setPop] = useState(0);
  return (
    <button
      type="button"
      className={`rl ${on ? "on" : ""}`}
      aria-pressed={on}
      aria-label={on ? t.liked : t.like}
      onClick={() => {
        setOn(!on);
        setN((x) => x + (on ? -1 : 1));
        setPop((p) => p + 1);
      }}
    >
      <svg key={pop} className={`rl-thumb ${pop ? "pop" : ""}`} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 10v11H3V10h4Zm2 11V10l4.6-7.4c.9-1 2.6-.4 2.6 1v4.4h4.5c1.4 0 2.4 1.3 2 2.6l-2.3 8.4c-.3 1.2-1.4 2-2.6 2H9Z" />
      </svg>
      <RollingNumber value={n} />
    </button>
  );
}
