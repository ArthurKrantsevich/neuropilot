"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { HonestProgress, fastPower, latePause } from "./HonestProgress";
import "./progress.css";

export type ProgressText = {
  ask: string; // пока идут
  done: string; // когда дошли
  timer: (s: string) => string; // «0,0 с из 5,5»
  dec: string; // десятичный знак
  left: { name: string; sub: string };
  right: { name: string; sub: string };
  run: string;
  ribs: string;
  note: string;
};

const RACE = 5.5; // как в опыте: каждая полоска шла ровно 5,5 с

/** Гонка из шортса «Полоска загрузки, что кажется быстрее»: Late Pause против Fast Power, обе — 5,5 с. */
export function ProgressRace({ t }: { t: ProgressText }) {
  const [time, setTime] = useState(0);
  const [ribs, setRibs] = useState(false);
  const raf = useRef(0);

  const run = useCallback(() => {
    cancelAnimationFrame(raf.current);
    setTime(0);
    let t0 = 0;
    const tick = (now: number) => {
      t0 ||= now;
      const s = Math.min(RACE, (now - t0) / 1000);
      setTime(s);
      if (s < RACE) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    // сам стартует, когда карточку открыли; при «уменьшить движение» — только по кнопке
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = still ? 0 : window.setTimeout(run, 400);
    return () => {
      clearTimeout(id);
      cancelAnimationFrame(raf.current);
    };
  }, [run]);

  const x = time / RACE;
  const done = time >= RACE;
  const sec = time.toFixed(1).replace(".", t.dec);
  return (
    <div className="pr">
      <div className="pr-clock" aria-hidden="true">
        <div className="pr-clock-fill" style={{ transform: `scaleX(${x})` }} />
        <span>{t.timer(sec)}</span>
      </div>
      <p className="pr-q" aria-live="polite">{done ? t.done : t.ask}</p>
      <div className="pr-race">
        {[
          { side: t.left, ease: latePause, r: false },
          { side: t.right, ease: fastPower, r: ribs },
        ].map(({ side, ease, r }, i) => (
          <div key={i} className={`pr-col ${done && i === 1 ? "pr-win" : ""}`}>
            <HonestProgress progress={x} ease={ease} ribbing={r} vertical label={side.name} className="pr-bar" />
            <b className="pr-pct">{Math.floor(ease(x) * 100 + 1e-6)} %</b>
            <span className="pr-name">{side.name}</span>
            <small className="pr-sub">{side.sub}</small>
          </div>
        ))}
      </div>
      <div className="pr-ctl">
        <button className="pr-btn" onClick={run}>{t.run}</button>
        <button className="pr-btn pr-tog" aria-pressed={ribs} onClick={() => setRibs((v) => !v)}>
          <i aria-hidden="true" />
          {t.ribs}
        </button>
      </div>
      <p className="pr-note">{t.note}</p>
    </div>
  );
}
