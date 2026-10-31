"use client";
// Кладка без пустот: карточки по порядку, каждая — в самую короткую колонку; развёрнутая широкая встаёт на всю ширину,
// под ней колонки выравниваются заново. Все карточки живут в одном контейнере и стоят абсолютно —
// при раскрытии ничего не пересоздаётся, а места меняются плавно (transform и width с переходом).
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type Brick = { key: string; full: boolean; node: ReactNode };
const EASE = "cubic-bezier(.2,.8,.2,1)";
const MS = 420;

export const Masonry: React.FC<{ items: Brick[]; columns: number; gap: number }> = ({ items, columns, gap }) => {
  const box = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<string, HTMLDivElement>());
  const heights = useRef(new Map<string, number>());
  const [width, setWidth] = useState(0);
  const [, bump] = useState(0);
  const [ready, setReady] = useState(false); // первый расчёт — без анимации

  useLayoutEffect(() => {
    const ro = new ResizeObserver((entries) => {
      let changed = false;
      for (const e of entries) {
        const el = e.target as HTMLElement;
        if (el === box.current) {
          setWidth(Math.round(e.contentRect.width));
          continue;
        }
        const k = el.dataset.k!;
        const h = Math.round(el.getBoundingClientRect().height);
        if (heights.current.get(k) !== h) {
          heights.current.set(k, h);
          changed = true;
        }
      }
      if (changed) bump((x) => x + 1);
    });
    if (box.current) ro.observe(box.current);
    els.current.forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [items.length]);
  useLayoutEffect(() => {
    if (!ready && width > 0 && heights.current.size === items.length) requestAnimationFrame(() => setReady(true));
  });

  const colW = columns > 1 ? (width - gap * (columns - 1)) / columns : width;
  const fill = new Array(columns).fill(0);
  const pos = new Map<string, { x: number; y: number; w: number }>();
  for (const it of items) {
    const h = heights.current.get(it.key) ?? 300;
    if (it.full && columns > 1) {
      const y = Math.max(...fill);
      pos.set(it.key, { x: 0, y, w: width });
      fill.fill(y + h + gap);
    } else {
      const c = fill.indexOf(Math.min(...fill)); // самая короткая колонка
      pos.set(it.key, { x: c * (colW + gap), y: fill[c], w: colW });
      fill[c] += h + gap;
    }
  }
  const total = Math.max(0, Math.max(...fill) - gap);

  return (
    <div ref={box} style={{ position: "relative", height: total, transition: ready ? `height ${MS}ms ${EASE}` : undefined }}>
      {items.map((it) => {
        const p = pos.get(it.key)!;
        return (
          <div
            key={it.key}
            data-k={it.key}
            ref={(el) => {
              if (el) els.current.set(it.key, el);
              else els.current.delete(it.key);
            }}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: p.w || "100%",
              transform: `translate(${p.x}px, ${p.y}px)`,
              transition: ready ? `transform ${MS}ms ${EASE}, width ${MS}ms ${EASE}` : undefined,
              opacity: width ? 1 : 0,
            }}
          >
            {it.node}
          </div>
        );
      })}
    </div>
  );
};
