"use client";
import { useRef, useState, type ReactNode } from "react";

/**
 * Магнитная кнопка: в радиусе притяжения тянется к курсору на треть расстояния,
 * текст — ещё дальше (объём), отпустил — пружинит обратно. Клик — волна.
 * Шортс «Дуэль кнопок: обычная vs магнитная».
 */
export function MagneticButton({ children, strength = 0.35, radius = 140, onClick, flat = false }: { children: ReactNode; strength?: number; radius?: number; onClick?: () => void; flat?: boolean }) {
  const field = useRef<HTMLDivElement>(null);
  const [p, setP] = useState({ x: 0, y: 0, near: 0 });
  const [waves, setWaves] = useState<number[]>([]);
  const move = (e: React.MouseEvent) => {
    if (flat) return;
    const r = field.current!.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    const d = Math.hypot(x, y);
    setP(d < radius ? { x: x * strength, y: y * strength, near: 1 - d / radius } : { x: 0, y: 0, near: 0 });
  };
  // магнитная ловит клик во всём радиусе, обычная — только по себе
  const click = (e: React.MouseEvent) => {
    if (flat && !(e.target as HTMLElement).closest(".magnetic")) return;
    setWaves((w) => [...w, Date.now()]);
    onClick?.();
  };
  return (
    <div ref={field} className={`magnet-field ${flat ? "flat" : ""}`} onMouseMove={move} onMouseLeave={() => setP({ x: 0, y: 0, near: 0 })} onClick={click}>
      {!flat && <span className="magnet-radius" style={{ width: radius * 2, height: radius * 2, opacity: 0.25 + p.near * 0.75 }} />}
      <button className="magnetic" style={{ transform: `translate(${p.x}px, ${p.y}px) scale(${1 + p.near * 0.06})` }}>
        {waves.map((w) => <i key={w} className="magnet-wave" onAnimationEnd={() => setWaves((v) => v.filter((x) => x !== w))} />)}
        <span style={{ transform: `translate(${p.x * 0.45}px, ${p.y * 0.45}px)` }}>{children}</span>
      </button>
    </div>
  );
}
