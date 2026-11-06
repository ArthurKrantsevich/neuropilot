"use client";
import { useEffect, useState, type ReactNode } from "react";
import "./island.css";

/**
 * Dynamic Island: одна чёрная капсула меняет ширину, высоту и скругление на пружине,
 * а содержимое проявляется из размытия. Шортс «Dynamic Island на React».
 */
export type IslandMode = "idle" | "timer" | "music" | "call";

// размеры как у iPhone 15 Pro, в pt
const SIZE: Record<IslandMode, [w: number, h: number, r: number]> = {
  idle: [126, 37, 19],
  timer: [224, 37, 19],
  music: [371, 168, 46],
  call: [371, 80, 40],
};

export type IslandText = { calling: string; caller: string; song: string; artist: string };

export function DynamicIsland({ mode, text, onClose }: { mode: IslandMode; text: IslandText; onClose?: () => void }) {
  const [w, h, r] = SIZE[mode];
  return (
    <div
      className="island"
      data-mode={mode}
      style={{ "--w": `${w}px`, "--h": `${h}px`, "--r": `${r}px` } as React.CSSProperties}
      onClick={onClose}
    >
      {/* key = режим: при смене содержимое монтируется заново и снова проявляется из размытия */}
      <div className="island-in" key={mode}>
        {mode === "timer" && <Timer />}
        {mode === "music" && <Music text={text} />}
        {mode === "call" && <Call text={text} />}
      </div>
    </div>
  );
}

function Timer() {
  const [s, setS] = useState(299);
  useEffect(() => {
    const id = setInterval(() => setS((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="isl-row isl-compact">
      <span className="isl-dot timer-ic">⏱</span>
      <b className="isl-num">{`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`}</b>
    </div>
  );
}

function Music({ text }: { text: IslandText }) {
  return (
    <div className="isl-music">
      <div className="isl-row">
        <span className="isl-art" />
        <div className="isl-meta">
          <b>{text.song}</b>
          <span>{text.artist}</span>
        </div>
        <Bars />
      </div>
      <div className="isl-bar"><i /></div>
      <div className="isl-ctrl">
        <span>⏮</span><span className="big">⏸</span><span>⏭</span>
      </div>
    </div>
  );
}

const Bars = () => (
  <span className="isl-eq" aria-hidden="true">
    {[0, 1, 2, 3].map((i) => <i key={i} style={{ animationDelay: `${i * -0.23}s` }} />)}
  </span>
);

function Call({ text }: { text: IslandText }) {
  return (
    <div className="isl-row isl-call">
      <span className="isl-ava">{text.caller[0]}</span>
      <div className="isl-meta">
        <span>{text.calling}</span>
        <b>{text.caller}</b>
      </div>
      <Btn kind="no">✕</Btn>
      <Btn kind="yes">✆</Btn>
    </div>
  );
}

const Btn = ({ kind, children }: { kind: "yes" | "no"; children: ReactNode }) => <span className={`isl-btn ${kind}`}>{children}</span>;
