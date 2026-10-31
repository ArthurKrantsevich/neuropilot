"use client";
import { useRef } from "react";

/**
 * 3D-карточка: наклоняется за курсором, слои висят на разной глубине (translateZ),
 * блик бежит по поверхности. Шортс «3D-карточка за 12 строк React».
 */
export function TiltCard({ title, sub, chip = "PRO", max = 18 }: { title: string; sub: string; chip?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateX(${-y * max}deg) rotateY(${x * max}deg)`;
    el.style.setProperty("--gx", `${(x + 0.5) * 100}%`);
    el.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
    el.style.setProperty("--sx", `${-x * 40}px`);
    el.style.setProperty("--sy", `${30 + y * 40}px`);
  };
  const leave = () => {
    const el = ref.current!;
    el.style.transform = "";
    el.style.removeProperty("--sx");
    el.style.removeProperty("--sy");
  };
  return (
    <div className="tilt-stage" onMouseMove={move} onMouseLeave={leave}>
      <div ref={ref} className="tilt">
        <span className="tilt-chip">{chip}</span>
        <span className="tilt-ring" />
        <b className="tilt-title">{title}</b>
        <span className="tilt-sub">{sub}</span>
        <span className="tilt-glare" />
      </div>
    </div>
  );
}
