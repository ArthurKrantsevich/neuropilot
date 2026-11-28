"use client";
import { useState } from "react";
import "./ssd-overnight.css";

export type SsdText = {
  version: string; // подпись переключателя для экранных дикторов
  hours: string; // «Часов простоя ночью»
  clock: (h: number) => string; // «23:00 → 08:00»
  written: string; // «Записал процесс»
  disk: string; // «по самому диску (S.M.A.R.T.)»
  unknown: string; // «долгих замеров пока нет»
  verdict: Record<V, string>;
  path: string; // «Монитор ресурсов → Диск → NVDisplay.Container.exe»
  copy: string;
  copied: string;
  note: string;
  source: string;
  gb: string; // «ГБ»
  kb: string; // «КБ»
  mb: string; // «МБ»
  dec: string; // десятичный знак
};

type V = "621.01" | "621.35" | "621.40";
const VERSIONS: V[] = ["621.01", "621.35", "621.40"];
const MAX_H = 9;
const SCALE = 50; // ГБ на шкале цилиндра

/** Замер одного тестера (3DNews / VideoCardz, 23.11.2026): RTX 4090, ночь простоя на хотфиксе 621.35.
 *  1-й час — 90,8 КБ, дальше запись возвращается: 40,85 ГБ за 9 ч (≈5,1 ГБ/ч в часы 2–9). По S.M.A.R.T. — около 36 ГБ.
 *  621.01 — «несколько мегабайт». 621.40 (24.11) — исправление в примечаниях Nvidia [7116722], долгих замеров нет. */
function writtenGB(v: V, h: number): number | null {
  if (v === "621.40") return null;
  if (v === "621.01") return (h * 3) / 1024 / MAX_H; // несколько МБ за ночь
  if (h <= 1) return (90.8 / 1024 / 1024) * h;
  return 90.8 / 1024 / 1024 + ((40.85 - 90.8 / 1024 / 1024) * (h - 1)) / (MAX_H - 1);
}

function fmt(gb: number, t: SsdText) {
  const n = (x: number, d: number) => x.toFixed(d).replace(".", t.dec);
  if (gb >= 1) return `${n(gb, gb >= 10 ? 1 : 2)} ${t.gb}`;
  if (gb * 1024 >= 1) return `${n(gb * 1024, 1)} ${t.mb}`;
  return `${n(gb * 1024 * 1024, 1)} ${t.kb}`;
}

/** Из шортса r56: заплатка Nvidia 621.35 держит первый час — потом драйвер снова пишет на SSD; за ночь — 40 ГБ. */
export function SsdOvernight({ t }: { t: SsdText }) {
  const [v, setV] = useState<V>("621.35");
  const [h, setH] = useState(MAX_H);
  const [done, setDone] = useState(false);
  const gb = writtenGB(v, h);
  const fill = gb === null ? 0 : Math.min(1, gb / SCALE);
  const smart = v === "621.35" && h === MAX_H;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(t.path);
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    } catch {
      /* буфер недоступен — путь виден на экране */
    }
  };

  return (
    <div className="so">
      <div className="so-seg" role="group" aria-label={t.version}>
        {VERSIONS.map((x) => (
          <button key={x} className="so-seg-btn" aria-pressed={v === x} onClick={() => setV(x)}>
            {x}
          </button>
        ))}
      </div>

      <div className="so-stage">
        <div className="so-tap" aria-hidden>
          <i className="so-tap-body" />
          <i className="so-tap-spout" />
          {v === "621.35" && <i className={`so-plaster${h > 1 ? " is-off" : ""}`}>621.35</i>}
          {v === "621.40" && <i className="so-clamp">621.40</i>}
          {gb !== null && gb > 0.5 && <i className="so-stream" />}
        </div>
        <div className="so-cyl" role="img" aria-label={gb === null ? t.unknown : `${t.written}: ${fmt(gb, t)}`}>
          {[50, 40, 30, 20, 10].map((m) => (
            <span key={m} className="so-mark" style={{ bottom: `${(m / SCALE) * 100}%` }}>
              {m}
            </span>
          ))}
          <i className="so-water" style={{ height: `${fill * 100}%` }} />
          <b className="so-cyl-label">SSD</b>
        </div>
      </div>

      <label className="so-range">
        <span>
          {t.hours}: <b>{h}</b> <em>{t.clock(h)}</em>
        </span>
        <input type="range" min={0} max={MAX_H} step={1} value={h} onChange={(e) => setH(+e.target.value)} />
      </label>

      <div className="so-out" aria-live="polite">
        <div className="so-num">
          <b>{gb === null ? "?" : fmt(gb, t)}</b>
          <span>{gb === null ? t.unknown : t.written}</span>
        </div>
        {smart && <p className="so-smart">≈36 {t.gb} — {t.disk}</p>}
        <p className="so-verdict">{t.verdict[v]}</p>
      </div>

      <button className="so-path" onClick={copy}>
        <code>{t.path}</code>
        <span>{done ? t.copied : t.copy}</span>
      </button>

      <p className="so-note">{t.note}</p>
      <p className="so-src">{t.source}</p>
    </div>
  );
}
