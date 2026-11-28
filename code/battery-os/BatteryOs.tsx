"use client";
import { useState } from "react";
import "./battery-os.css";

export type BoText = {
  hoursLabel: string; // «Сколько часов держит твой ноутбук»
  hUnit: string; // «ч»
  loadLabel: string; // «Нагрузка»
  game: string; editor: string;
  now: string; // «Как сейчас»
  ifTest: string; // «Если бы разница была как в тесте»
  gain: (x: string) => string; // «ещё +2:50»
  ratio: (x: string) => string; // «×1,77»
  testTitle: string; // «Исходный тест»
  win: string; lin: string;
  gameRow: string; editorRow: string;
  barsLabel: string;
  caveat: string;
  dec: string;
};

// PhoneBuff, 20.11.2026: время работы в минутах (Windows 11 / Linux Fedora)
const TEST = {
  game: { win: 221, lin: 391 }, // 3:41 и 6:31
  editor: { win: 224, lin: 350 }, // 3:44 и 5:50
};
type Mode = keyof typeof TEST;
const hm = (min: number) => `${Math.floor(Math.round(min) / 60)}:${String(Math.round(min) % 60).padStart(2, "0")}`;
const MAX_H = 20;

function Bar({ min, scale, tone }: { min: number; scale: number; tone: "now" | "then" | "win" | "lin" }) {
  return (
    <div className="bo-track">
      <div className={`bo-fill bo-${tone}`} style={{ width: `${Math.max(2, Math.min(100, (min / scale) * 100))}%` }} />
    </div>
  );
}

/** Из шортса r62: один тест PhoneBuff, два Dell XPS 13 — примерка разницы к своему ноутбуку. */
export function BatteryOs({ t }: { t: BoText }) {
  const [h, setH] = useState(6);
  const [mode, setMode] = useState<Mode>("game");
  const k = TEST[mode].lin / TEST[mode].win;
  const nowMin = h * 60;
  const thenMin = nowMin * k;
  const ratioTxt = `×${k.toFixed(2).replace(".", t.dec)}`;
  const hTxt = `${String(h).replace(".", t.dec)} ${t.hUnit}`;

  return (
    <div className="bo">
      <div className="bo-card">
        <label className="bo-label" htmlFor="bo-h">{t.hoursLabel}: <b>{hTxt}</b></label>
        <input id="bo-h" className="bo-range" type="range" min={1} max={MAX_H} step={0.5} value={h} onChange={(e) => setH(Number(e.target.value))} />
        <fieldset className="bo-load">
          <legend className="bo-label">{t.loadLabel}</legend>
          <div className="bo-seg" role="radiogroup" aria-label={t.loadLabel}>
            {(["game", "editor"] as Mode[]).map((m) => (
              <label key={m} className={`bo-opt${mode === m ? " is-on" : ""}`}>
                <input type="radio" name="bo-load" value={m} checked={mode === m} onChange={() => setMode(m)} />
                {m === "game" ? t.game : t.editor}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="bo-card" role="group" aria-label={t.barsLabel}>
        <div className="bo-line"><span className="bo-name">{t.now}</span><b className="bo-time">{hm(nowMin)}</b></div>
        <Bar min={nowMin} scale={MAX_H * 60 * 1.8} tone="now" />
        <div className="bo-line bo-gap"><span className="bo-name">{t.ifTest} <i>{t.ratio(ratioTxt)}</i></span><b className="bo-time">{hm(thenMin)}</b></div>
        <Bar min={thenMin} scale={MAX_H * 60 * 1.8} tone="then" />
        <p className="bo-gain">{t.gain(hm(thenMin - nowMin))}</p>
      </div>

      <div className="bo-card">
        <p className="bo-label">{t.testTitle}</p>
        {(["game", "editor"] as Mode[]).map((m) => (
          <div key={m} className={`bo-test${mode === m ? " is-on" : ""}`}>
            <p className="bo-sub">{m === "game" ? t.gameRow : t.editorRow}</p>
            <div className="bo-line"><span className="bo-name">{t.win}</span><b className="bo-time">{hm(TEST[m].win)}</b></div>
            <Bar min={TEST[m].win} scale={420} tone="win" />
            <div className="bo-line"><span className="bo-name">{t.lin}</span><b className="bo-time">{hm(TEST[m].lin)}</b></div>
            <Bar min={TEST[m].lin} scale={420} tone="lin" />
          </div>
        ))}
      </div>

      <p className="bo-caveat">{t.caveat}</p>
    </div>
  );
}
