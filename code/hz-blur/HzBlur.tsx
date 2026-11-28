"use client";
import { useEffect, useRef, useState } from "react";
import "./hz-blur.css";

export type HzText = {
  freq: string; // подпись переключателя частоты для экранных дикторов
  hz: string; // «Гц»
  frame: string; // «время кадра»
  ms: string; // «мс»
  trail: string; // «шлейф при 1000 точек/с»
  pts: string; // «точки»
  zoom: string; // про окно и замедление
  pause: string;
  play: string;
  stageLabel: string; // aria-label сцены
  model: string; // оговорка «это модель»
  protos: string; // про TCL / Samsung
  checkTitle: string;
  steps: string; // путь в Windows
  cable: string;
  copy: string;
  copied: string;
  source: string;
  dec: string;
};

const FREQS = [60, 144, 240, 1250] as const;
const SPEED = 1000; // точек в секунду
const WINDOW = 120; // ширина окна в точках
const DUCK = 36; // ширина утки в точках
const SLOW = 10; // во сколько раз замедлено время

const num = (x: number, d: number, dec: string) => x.toFixed(d).replace(".", dec);

/** Из шортса r57: Blur Busters Law — размытие (точек) = скорость (точек/с) × время кадра (с).
 *  Нижняя граница при мгновенном отклике пикселя: у настоящей панели размытие немного больше. */
export function HzBlur({ t }: { t: HzText }) {
  const [hz, setHz] = useState<number>(60);
  const [paused, setPaused] = useState(false);
  const [time, setTime] = useState(0); // модельное время, с
  const [done, setDone] = useState(false);
  const last = useRef(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPaused(true);
  }, []);

  useEffect(() => {
    if (paused) return;
    let raf = 0;
    last.current = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last.current) / 1000);
      last.current = now;
      setTime((s) => s + dt / SLOW);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  const frameS = 1 / hz;
  const frameMs = frameS * 1000;
  const blur = SPEED * frameS; // точек
  const travel = WINDOW + DUCK;
  const heldX = Math.floor((time % (travel / SPEED)) / frameS) * frameS * SPEED - DUCK; // sample-and-hold
  const x = Math.min(WINDOW, heldX);
  const pct = (v: number) => `${(v / WINDOW) * 100}%`;
  const w = (v: number) => `${(v / WINDOW) * 100}%`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(t.steps);
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    } catch {
      /* буфер недоступен — путь виден на экране */
    }
  };

  return (
    <div className="hz">
      <div className="hz-seg" role="group" aria-label={t.freq}>
        {FREQS.map((f) => (
          <button key={f} className="hz-seg-btn" aria-pressed={hz === f} onClick={() => setHz(f)}>
            {f} {t.hz}
          </button>
        ))}
      </div>

      <div className="hz-stage" role="img" aria-label={`${t.stageLabel}: ${hz} ${t.hz}, ${t.frame} ${num(frameMs, 1, t.dec)} ${t.ms}, ${t.trail} ${blur < 1 ? num(blur, 1, t.dec) : "≈" + Math.round(blur)} ${t.pts}`}>
        <div className="hz-track" aria-hidden>
          <i className="hz-trail" style={{ left: pct(x - blur), width: w(blur + DUCK) }} />
          <i className="hz-duck" style={{ left: pct(x), width: w(DUCK) }}>
            <b className="hz-eye" />
            <b className="hz-beak" />
          </i>
        </div>
        <p className="hz-zoom">{t.zoom}</p>
      </div>

      <button className="hz-pp" onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
        {paused ? t.play : t.pause}
      </button>

      <dl className="hz-out" aria-live="polite">
        <div>
          <dt>{t.frame}</dt>
          <dd>
            {num(frameMs, 1, t.dec)} {t.ms}
          </dd>
        </div>
        <div>
          <dt>{t.trail}</dt>
          <dd>
            {blur < 1 ? num(blur, 1, t.dec) : `≈${Math.round(blur)}`} {t.pts}
          </dd>
        </div>
      </dl>

      <table className="hz-tab">
        <tbody>
          <tr>
            {FREQS.map((f) => (
              <th key={f} scope="col" className={f === hz ? "is-on" : ""}>
                {f}
              </th>
            ))}
          </tr>
          <tr>
            {FREQS.map((f) => (
              <td key={f} className={f === hz ? "is-on" : ""}>
                {num(1000 / f, 1, t.dec)}
              </td>
            ))}
          </tr>
          <tr>
            {FREQS.map((f) => (
              <td key={f} className={f === hz ? "is-on" : ""}>
                {1000 / f < 1 ? num(1000 / f, 1, t.dec) : `≈${Math.round(1000 / f)}`}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <p className="hz-note">{t.model}</p>
      <p className="hz-note">{t.protos}</p>

      <div className="hz-check">
        <b>{t.checkTitle}</b>
        <button className="hz-path" onClick={copy}>
          <code>{t.steps}</code>
          <span>{done ? t.copied : t.copy}</span>
        </button>
        <p>{t.cable}</p>
      </div>

      <p className="hz-src">{t.source}</p>
    </div>
  );
}
