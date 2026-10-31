"use client";
// Кладка без пустот: карточки идут по порядку, каждая — в ту колонку, что сейчас короче.
// Широкая (развёрнутая) карточка встаёт на всю ширину и делит ленту на участки; в каждом участке колонки выравниваются заново.
// Высоты меряем вживую (ResizeObserver): раскрыл/свернул карточку — раскладка пересчиталась.
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type Brick = { key: string; full: boolean; node: ReactNode };

export const Masonry: React.FC<{ items: Brick[]; columns: number; gap: number }> = ({ items, columns, gap }) => {
  const heights = useRef(new Map<string, number>());
  const [, bump] = useState(0);
  const els = useRef(new Map<string, HTMLDivElement>());
  useLayoutEffect(() => {
    const ro = new ResizeObserver((entries) => {
      let changed = false;
      for (const e of entries) {
        const k = (e.target as HTMLElement).dataset.k!;
        const h = Math.round(e.contentRect.height);
        if (heights.current.get(k) !== h) {
          heights.current.set(k, h);
          changed = true;
        }
      }
      if (changed) bump((x) => x + 1);
    });
    els.current.forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [items, columns]);

  // участки: подряд идущие обычные карточки → колонки; широкая — отдельной строкой
  const segments: (Brick[] | Brick)[] = [];
  for (const it of items) {
    if (it.full && columns > 1) segments.push(it);
    else {
      const last = segments[segments.length - 1];
      if (Array.isArray(last)) last.push(it);
      else segments.push([it]);
    }
  }
  const ref = (k: string) => (el: HTMLDivElement | null) => {
    if (el) els.current.set(k, el);
    else els.current.delete(k);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {segments.map((seg, si) => {
        if (!Array.isArray(seg))
          return (
            <div key={seg.key} data-k={seg.key} ref={ref(seg.key)}>
              {seg.node}
            </div>
          );
        const cols: Brick[][] = Array.from({ length: columns }, () => []);
        const fill = new Array(columns).fill(0);
        for (const it of seg) {
          const c = fill.indexOf(Math.min(...fill)); // самая короткая колонка
          cols[c].push(it);
          fill[c] += (heights.current.get(it.key) ?? 300) + gap;
        }
        return (
          <div key={`seg${si}`} style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap, alignItems: "start" }}>
            {cols.map((col, ci) => (
              <div key={ci} style={{ display: "flex", flexDirection: "column", gap, minWidth: 0 }}>
                {col.map((it) => (
                  <div key={it.key} data-k={it.key} ref={ref(it.key)}>
                    {it.node}
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};
