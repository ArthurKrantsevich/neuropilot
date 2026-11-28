"use client";
import { useState } from "react";
import "./big-cores.css";

export type BcText = {
  pick: string; // «Выбери свой процессор»
  manual: string; // «Другой — ввести вручную»
  big: string; small: string; cache: string; mb: string;
  unitBig: string; unitSmall: string;
  coresLabel: string; // aria-label ряда ядер
  you: string; leak: string; regular: string;
  legendBig: string; legendSmall: string;
  summary: (b: number, s: number, mb: number | null) => string;
  noCache: string;
  leakNote: string;
  steam: string;
  moral: string;
};

type Cpu = { name: string; big: number; small: number; mb: number };
// Только проверяемые характеристики: большие ядра/потоки производительности, суммарный L3.
const CPUS: Cpu[] = [
  { name: "Ryzen 5 5600", big: 6, small: 0, mb: 32 },
  { name: "Ryzen 7 5800X3D", big: 8, small: 0, mb: 96 },
  { name: "Ryzen 7 7800X3D", big: 8, small: 0, mb: 96 },
  { name: "Ryzen 7 9800X3D", big: 8, small: 0, mb: 96 },
  { name: "Core i5-12400F", big: 6, small: 0, mb: 18 },
  { name: "Core i5-13400F", big: 6, small: 4, mb: 20 },
  { name: "Core i7-14700K", big: 8, small: 12, mb: 33 },
  { name: "Core Ultra 9 285K", big: 8, small: 16, mb: 36 },
];
// утечка Intel (VideoCardz через 3DNews, 25.11.2026): 8 больших + 20 малых = 28 ядер, кэш 144 МБ
const LEAK: Cpu = { name: "28", big: 8, small: 20, mb: 144 };
const REGULAR_MB = 36;
const MAX_MB = 144;
const clamp = (v: string, max: number) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));

function Cores({ big, small, label }: { big: number; small: number; label: string }) {
  return (
    <div className="bc-cores" role="img" aria-label={label}>
      {Array.from({ length: big }, (_, i) => <i key={`b${i}`} className="bc-big" />)}
      {Array.from({ length: small }, (_, i) => <i key={`s${i}`} className="bc-small" />)}
    </div>
  );
}

function Bar({ mb, tone }: { mb: number; tone: "you" | "leak" | "reg" }) {
  return (
    <div className="bc-track">
      <div className={`bc-fill bc-${tone}`} style={{ width: `${Math.max(2, (mb / MAX_MB) * 100)}%` }} />
    </div>
  );
}

/** Из шортса r59: для игр важны большие ядра и кэш, а не общее число ядер. */
export function BigCores({ t }: { t: BcText }) {
  const [sel, setSel] = useState("0");
  const [mb, setMb] = useState("");
  const [bg, setBg] = useState("6");
  const [sm, setSm] = useState("0");
  const manual = sel === "m";
  const cpu = CPUS[Number(sel)] ?? CPUS[0];
  const big = manual ? clamp(bg, 32) : cpu.big;
  const small = manual ? clamp(sm, 32) : cpu.small;
  const yourMb = manual ? (mb === "" ? null : clamp(mb, 1024)) : cpu.mb;
  const sumLabel = t.summary(big, small, yourMb);

  return (
    <div className="bc">
      <div className="bc-card">
        <label className="bc-label" htmlFor="bc-sel">{t.pick}</label>
        <select id="bc-sel" className="bc-sel" value={sel} onChange={(e) => setSel(e.target.value)}>
          {CPUS.map((c, i) => <option key={c.name} value={i}>{c.name}</option>)}
          <option value="m">{t.manual}</option>
        </select>
        {manual && (
          <div className="bc-manual">
            <label>{t.big}<input type="number" inputMode="numeric" min={0} max={32} value={bg} onChange={(e) => setBg(e.target.value)} /></label>
            <label>{t.small}<input type="number" inputMode="numeric" min={0} max={32} value={sm} onChange={(e) => setSm(e.target.value)} /></label>
            <label>{t.cache}<input type="number" inputMode="numeric" min={0} max={1024} value={mb} placeholder={t.mb} onChange={(e) => setMb(e.target.value)} /></label>
          </div>
        )}
      </div>

      <div className="bc-card">
        <p className="bc-row-title">{t.you}</p>
        <Cores big={big} small={small} label={`${t.coresLabel}: ${sumLabel}`} />
        <p className="bc-sum">{sumLabel}</p>
        {yourMb !== null ? <Bar mb={yourMb} tone="you" /> : <p className="bc-hint">{t.noCache}</p>}
      </div>

      <div className="bc-card">
        <p className="bc-row-title">{t.leak}</p>
        <Cores big={LEAK.big} small={LEAK.small} label={`${t.coresLabel}: ${t.summary(LEAK.big, LEAK.small, LEAK.mb)}`} />
        <p className="bc-sum">{t.summary(LEAK.big, LEAK.small, LEAK.mb)}</p>
        <Bar mb={LEAK.mb} tone="leak" />
        <p className="bc-row-title bc-gap">{t.regular}</p>
        <Bar mb={REGULAR_MB} tone="reg" />
        <p className="bc-hint">{REGULAR_MB} {t.mb}</p>
      </div>

      <ul className="bc-legend">
        <li><i className="bc-big" /> {t.legendBig}</li>
        <li><i className="bc-small" /> {t.legendSmall}</li>
      </ul>
      <p className="bc-moral">{t.moral}</p>
      <p className="bc-src">{t.leakNote}</p>
      <p className="bc-src">{t.steam}</p>
    </div>
  );
}
