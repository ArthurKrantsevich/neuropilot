"use client";
import { useState } from "react";
import "./tab-memory.css";

export type TmText = {
  chatLabel: string; // «Сообщений в чате»
  ramLabel: string; // «Твоя оперативка»
  ramGroup: string; // aria-label группы переключателей
  gb: string; mb: string;
  tabTitle: string; // «Память вкладки»
  estimate: string; // «оценка»
  basis: string; // «по двум опорам отчёта»
  shelf: string; // aria-label полки
  pct: (p: string) => string; // «это 16 % твоей памяти»
  howTitle: string; howText: string;
  note: string;
  dec: string; // десятичный знак
};

// Опоры из отчёта Chromium (13.12.2025): 1 сообщение ≈ 100 МБ, 130 сообщений ≈ 1,3 ГБ. Дальше — та же прямая.
const A = { n: 1, mb: 100 };
const B = { n: 130, mb: 1300 };
const SLOPE = (B.mb - A.mb) / (B.n - A.n);
const memMb = (n: number) => A.mb + (n - A.n) * SLOPE;
const RAMS = [8, 16, 32];

/** Из шортса r61: страница Gemini держала в памяти всю переписку — вкладка росла с длиной чата. */
export function TabMemory({ t }: { t: TmText }) {
  const [n, setN] = useState(130);
  const [ram, setRam] = useState(8);
  const mb = memMb(n);
  const fmt = (v: number, d: number) => v.toFixed(d).replace(".", t.dec);
  const size = mb < 1000 ? `${Math.round(mb)} ${t.mb}` : `${fmt(mb / 1000, 1)} ${t.gb}`;
  const p = (mb / (ram * 1000)) * 100;
  const pct = fmt(p, p < 10 ? 1 : 0);
  const labelEvery = ram <= 8 ? 1 : ram <= 16 ? 2 : 4;
  const approx = n > B.n;

  return (
    <div className="tm">
      <div className="tm-card">
        <label className="tm-label" htmlFor="tm-n">
          {t.chatLabel}: <b className="tm-val">{n}</b>
        </label>
        <input id="tm-n" className="tm-range" type="range" min={1} max={300} step={1} value={n} onChange={(e) => setN(Number(e.target.value))} />
        <fieldset className="tm-ram">
          <legend className="tm-label">{t.ramLabel}</legend>
          <div className="tm-seg" role="radiogroup" aria-label={t.ramGroup}>
            {RAMS.map((r) => (
              <label key={r} className={`tm-opt${ram === r ? " is-on" : ""}`}>
                <input type="radio" name="tm-ram" value={r} checked={ram === r} onChange={() => setRam(r)} />
                {r} {t.gb}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="tm-card">
        <p className="tm-label">{t.tabTitle}</p>
        <p className="tm-big" aria-live="polite">
          {size}
          {approx && <span className="tm-est">{t.estimate}</span>}
        </p>
        <div className="tm-shelf" role="img" aria-label={`${t.shelf}: ${size}, ${t.pct(pct)}`}>
          <div className="tm-board">
            <div className="tm-folder" style={{ width: `${Math.max(1.5, Math.min(100, p))}%` }} />
          </div>
          <div className="tm-ruler" aria-hidden="true">
            {Array.from({ length: ram }, (_, i) => (
              <span key={i} className="tm-tick">
                {(i + 1) % labelEvery === 0 || i === 0 ? <em>{i + 1}</em> : null}
              </span>
            ))}
          </div>
        </div>
        <p className="tm-pct">{t.pct(pct)}</p>
        <p className="tm-basis">{t.basis}</p>
      </div>

      <div className="tm-card">
        <p className="tm-label">{t.howTitle}</p>
        <p className="tm-how">{t.howText}</p>
      </div>
      <p className="tm-src">{t.note}</p>
    </div>
  );
}
