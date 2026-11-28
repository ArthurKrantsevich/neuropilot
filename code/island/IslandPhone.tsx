"use client";
import { useState } from "react";
import { DynamicIsland, type IslandMode, type IslandText } from "./DynamicIsland";

/**
 * Экран iPhone 393×852 pt: строка статуса, остров на месте камеры, контент в безопасной зоне
 * (сверху 59 pt, снизу 34 pt) и полоска «домой».
 */
export type PhoneText = IslandText & { title: string; lead: string; modes: Record<Exclude<IslandMode, "idle">, string>; hint: string };

export function IslandPhone({ text }: { text: PhoneText }) {
  const [mode, setMode] = useState<IslandMode>("idle");
  const pick = (m: IslandMode) => setMode((cur) => (cur === m ? "idle" : m));
  return (
    <div className="iphone" data-mode={mode}>
      <div className="ip-status" aria-hidden="true">
        <span className="ip-time">9:41</span>
        <span className="ip-icons">
          <Signal />
          <Battery />
        </span>
      </div>
      <div className="ip-island">
        <DynamicIsland mode={mode} text={text} onClose={() => setMode("idle")} />
      </div>
      <main className="ip-safe">
        <h3>{text.title}</h3>
        <p>{text.lead}</p>
        <div className="ip-btns">
          {(Object.keys(text.modes) as Exclude<IslandMode, "idle">[]).map((m) => (
            <button key={m} data-mode={m} aria-pressed={mode === m} onClick={() => pick(m)}>
              {text.modes[m]}
            </button>
          ))}
        </div>
        <small>{text.hint}</small>
      </main>
      <i className="ip-home" aria-hidden="true" />
    </div>
  );
}

export const Signal = () => (
  <svg width="18" height="12" viewBox="0 0 18 12">
    {[0, 1, 2, 3].map((i) => <rect key={i} x={i * 5} y={9 - i * 3} width="3" height={3 + i * 3} rx="1" fill="currentColor" />)}
  </svg>
);
export const Battery = () => (
  <svg width="27" height="13" viewBox="0 0 27 13">
    <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4" />
    <rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor" />
    <rect x="25" y="4" width="2" height="5" rx="1" fill="currentColor" opacity=".4" />
  </svg>
);
