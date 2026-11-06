"use client";
import { useRef, useState, type ReactNode } from "react";

/**
 * Кнопка, которая убегает от курсора и не может выйти за рамку.
 * Шортс «Кнопку «Подписаться» нельзя нажать».
 */
export function RunawayButton({ children, radius = 110, step = 90 }: { children: ReactNode; radius?: number; step?: number }) {
  const area = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const onMove = (e: React.MouseEvent) => {
    const a = area.current!.getBoundingClientRect();
    const b = btn.current!.getBoundingClientRect();
    const dx = b.x + b.width / 2 - e.clientX;
    const dy = b.y + b.height / 2 - e.clientY;
    const d = Math.hypot(dx, dy) || 1;
    if (d > radius) return;
    // прыжок прочь от курсора; упёрлась в край — отскок к центру
    const mx = (a.width - b.width) / 2 - 16;
    const my = (a.height - b.height) / 2 - 16;
    setPos((p) => {
      let x = p.x + (dx / d) * step;
      let y = p.y + (dy / d) * step;
      if (Math.abs(x) > mx) x = -Math.sign(x) * mx * 0.4;
      if (Math.abs(y) > my) y = -Math.sign(y) * my * 0.4;
      return { x, y };
    });
  };
  return (
    <div ref={area} className="runaway-area" onMouseMove={onMove} onMouseLeave={() => setPos({ x: 0, y: 0 })}>
      <button ref={btn} className="runaway" style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}>
        {children}
      </button>
    </div>
  );
}
