"use client";
import { useRef, useState } from "react";
import "./reactions.css";

/**
 * Реакции как в Telegram без библиотек — по разбору записи экрана Telegram (покадрово, 60 к/с)
 * и полям availableReaction в Telegram API (activate_animation + effect_animation).
 *  1. перенос — смайлик почти по прямой падает из панели в плашку, ≈0,12 с, меню гаснет;
 *  2. активация — смайлик в плашке вырастает ≈1,4× и пульсирует, вокруг расходится кольцо;
 *  3. эффект — вокруг плашки ≈0,9 с играет свой эффект смайлика: у 🔥 пламя и дым, у ❤️ сердца, у 🎉 конфетти.
 * Двигаем только transform и opacity: раскладка не пересчитывается, анимация идёт на видеокарте.
 * prefers-reduced-motion — без анимаций, только плашка.
 * Шортс «Реакции как в Telegram».
 */
export type ReactionsText = { author: string; message: string; time: string; hint: string; me: string };

const EMOJI = ["👍", "❤️", "🔥", "😂", "😮", "🎉"];
// цвет кольца активации под смайлик
const RING: Record<string, string> = { "🔥": "#ff5a36", "❤️": "#ff3b6b", "🎉": "#ffb020", "👍": "#ffc83d", "😂": "#ffc83d", "😮": "#ffc83d" };
const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

// элемент поверх страницы (position: fixed) — живёт до конца своей анимации
function layer(cls: string, x: number, y: number, text = "") {
  const el = document.createElement("span");
  el.className = cls;
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.append(el);
  return el;
}
const center = (r: DOMRect) => [r.left + r.width / 2, r.top + r.height / 2] as const;

// 1. перенос: быстро и почти по прямой, с уменьшением до размера смайлика в плашке
function transfer(from: DOMRect, to: DOMRect, emoji: string) {
  const [x0, y0] = center(from);
  const [x1, y1] = center(to);
  const el = layer("rx-fly", x0, y0, emoji);
  return el
    .animate(
      [
        { transform: "translate(-50%,-50%) scale(1.15)" },
        { transform: `translate(calc(-50% + ${x1 - x0}px), calc(-50% + ${y1 - y0}px)) scale(.62)` },
      ],
      { duration: 120, easing: "cubic-bezier(.4,0,1,1)" },
    )
    .finished.then(() => el.remove());
}

// 2. активация: смайлик в плашке вырастает и пульсирует, кольцо расходится и гаснет
function activate(icon: HTMLElement, emoji: string) {
  icon.animate([{ transform: "scale(1)" }, { transform: "scale(1.42)" }, { transform: "scale(.94)" }, { transform: "scale(1.06)" }, { transform: "scale(1)" }], {
    duration: 520,
    easing: "ease-out",
  });
  const [x, y] = center(icon.getBoundingClientRect());
  const ring = layer("rx-ring", x, y);
  ring.style.borderColor = RING[emoji] ?? "#ffc83d";
  ring.animate(
    [
      { transform: "translate(-50%,-50%) scale(.5)", opacity: 1 },
      { transform: "translate(-50%,-50%) scale(1.9)", opacity: 0 },
    ],
    { duration: 420, easing: "cubic-bezier(.2,.7,.3,1)" },
  ).finished.then(() => ring.remove());
}

// 3. эффект вокруг плашки — свой у каждого смайлика
type Part = { text: string; cls: string; dx: number; dy: number; mid?: [number, number]; s0: number; s1: number; dur: number; delay: number };
function effect(chip: DOMRect, emoji: string) {
  const [cx, cy] = center(chip);
  const parts: Part[] = [];
  if (emoji === "🔥") {
    // языки пламени вырываются вокруг плашки и поднимаются; сверху — клубы дыма
    // как в Telegram: пламя крупнее плашки и выходит во все стороны, в том числе вниз за край пузыря
    for (let i = 0; i < 14; i++) {
      const a = rnd(0, Math.PI * 2);
      const r = rnd(0.7, 1.25);
      parts.push({ text: "🔥", cls: "rx-p", dx: Math.cos(a) * chip.width * 0.75 * r, dy: Math.sin(a) * 34 * r - 18, s0: 0.4, s1: rnd(0.9, 1.4), dur: rnd(560, 820), delay: rnd(0, 280) });
    }
    for (let i = 0; i < 5; i++)
      parts.push({ text: "", cls: "rx-smoke", dx: rnd(-chip.width, chip.width), dy: rnd(-90, -60), s0: 0.4, s1: 1.6, dur: rnd(700, 900), delay: rnd(150, 350) });
  } else if (emoji === "❤️") {
    // сердца всплывают вверх, покачиваясь
    for (let i = 0; i < 10; i++)
      parts.push({ text: "❤️", cls: "rx-p", dx: rnd(-60, 60), dy: rnd(-110, -60), mid: [rnd(-20, 20), -30], s0: 0.3, s1: rnd(0.5, 0.9), dur: rnd(700, 900), delay: rnd(0, 250) });
  } else if (emoji === "🎉") {
    // конфетти: вылетает вверх и падает
    for (let i = 0; i < 16; i++) {
      const dx = rnd(-90, 90);
      parts.push({ text: "", cls: `rx-conf c${i % 5}`, dx, dy: rnd(10, 40), mid: [dx * 0.6, rnd(-90, -50)], s0: 1, s1: 0.8, dur: rnd(750, 950), delay: rnd(0, 120) });
    }
  } else {
    // остальные: копии смайлика разлетаются кругом
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      parts.push({ text: emoji, cls: "rx-p", dx: Math.cos(a) * 52, dy: Math.sin(a) * 40, s0: 0.5, s1: 0.25, dur: 560, delay: i * 12 });
    }
  }
  for (const p of parts) {
    const el = layer(p.cls, cx, cy, p.text);
    const k: Keyframe[] = [{ transform: `translate(-50%,-50%) scale(${p.s0})`, opacity: 0 }];
    if (p.mid) k.push({ transform: `translate(calc(-50% + ${p.mid[0]}px), calc(-50% + ${p.mid[1]}px)) scale(${p.s1})`, opacity: 1, offset: 0.45 });
    else k.push({ transform: `translate(calc(-50% + ${p.dx * 0.4}px), calc(-50% + ${p.dy * 0.3}px)) scale(${p.s1})`, opacity: 1, offset: 0.25 });
    k.push({ transform: `translate(calc(-50% + ${p.dx}px), calc(-50% + ${p.dy}px)) scale(${p.s1 * 0.7})`, opacity: 0 });
    el.animate(k, { duration: p.dur, delay: p.delay, easing: "cubic-bezier(.25,.6,.35,1)", fill: "backwards" }).finished.then(() => el.remove());
  }
}

export function Reactions({ text, animate = true }: { text: ReactionsText; animate?: boolean }) {
  const [others] = useState<Record<string, number>>({ "👍": 3 });
  const [mine, setMine] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const icons = useRef<Record<string, HTMLSpanElement | null>>({});

  const pick = (emoji: string, src: HTMLElement) => {
    const on = mine !== emoji;
    setMine(on ? emoji : null);
    if (!on || !animate || calm()) return;
    const from = src.getBoundingClientRect();
    setOpen(false); // меню гаснет, как в Telegram
    // плашка появляется в следующем кадре — дальше перенос → активация + эффект
    requestAnimationFrame(() => {
      const icon = icons.current[emoji];
      if (!icon) return;
      icon.style.opacity = "0";
      transfer(from, icon.getBoundingClientRect(), emoji).then(() => {
        icon.style.opacity = "";
        activate(icon, emoji);
        effect(icon.parentElement!.getBoundingClientRect(), emoji);
      });
    });
  };

  // плашки: реакции других (со счётчиком) + моя (с подписью «я», как аватар в Telegram)
  const chips = Object.entries(others).filter(([e, n]) => n > 0 || e === mine);
  if (mine && !(mine in others)) chips.push([mine, 0]);
  return (
    <div className="rx">
      <div className="rx-msg" onClick={() => setOpen(true)}>
        <b className="rx-author">{text.author}</b>
        <p>{text.message}</p>
        {chips.length > 0 && (
          <div className="rx-chips">
            {chips.map(([e, n]) => (
              <button key={e} className={`rx-chip ${mine === e ? "on" : ""}`} onClick={(ev) => (ev.stopPropagation(), pick(e, ev.currentTarget))}>
                <span className="rx-icon" ref={(el) => void (icons.current[e] = el)}>
                  {e}
                </span>
                {n > 0 && <span className="rx-n">{n + (mine === e ? 1 : 0)}</span>}
                {mine === e && n === 0 && <span className="rx-me">{text.me}</span>}
              </button>
            ))}
          </div>
        )}
        <span className="rx-time">{text.time}</span>
      </div>
      {/* панель гаснет на месте, без скачка раскладки (только opacity) */}
      {(
        <div className={`rx-bar ${open ? "" : "off"}`} role="toolbar" aria-hidden={!open}>
          {EMOJI.map((e) => (
            <button key={e} className="rx-pick" aria-label={e} onClick={(ev) => pick(e, ev.currentTarget)}>
              {e}
            </button>
          ))}
        </div>
      )}
      <p className="rx-hint">{text.hint}</p>
    </div>
  );
}
