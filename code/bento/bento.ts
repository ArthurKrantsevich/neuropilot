/**
 * Бенто-сетка: карта раскладки буквами (grid-template-areas) и расчёт прямоугольников плиток из неё.
 * Одна и та же разметка: меняется только карта — коллаж, бенто или колонка на телефоне.
 */
export type Layout = { cols: number; areas: string[] };

export const LAYOUTS = {
  /** коллаж: все плитки равны — взгляду не за что зацепиться */
  collage: { cols: 3, areas: ["a b c", "d e f"] },
  /** бенто: одна главная плитка в 4 раза больше (2×2 ячейки) */
  bento: { cols: 3, areas: ["a a b", "a a c", "d e f"] },
  /** телефон: та же разметка, другая карта */
  phone: { cols: 2, areas: ["a a", "b c", "d d", "e f"] },
} satisfies Record<string, Layout>;

/** Строка для CSS: "a a b" "a a c" "d e f" */
export const areasCss = (l: Layout) => l.areas.map((r) => `"${r}"`).join(" ");

export type Rect = { x: number; y: number; w: number; h: number };

/** Прямоугольник каждой плитки по карте: та же математика, что у CSS Grid с равными fr-колонками и рядами. */
export function rects(l: Layout, W: number, H: number, gap: number): Record<string, Rect> {
  const rows = l.areas.map((r) => r.trim().split(/\s+/));
  const nr = rows.length, nc = l.cols;
  const cw = (W - gap * (nc - 1)) / nc, rh = (H - gap * (nr - 1)) / nr;
  const out: Record<string, Rect> = {};
  const seen = new Set<string>();
  rows.forEach((row, r) => row.forEach((name, c) => {
    if (name === "." || seen.has(name)) return;
    seen.add(name);
    let c2 = c; while (c2 + 1 < nc && row[c2 + 1] === name) c2++;
    let r2 = r; while (r2 + 1 < nr && rows[r2 + 1][c] === name) r2++;
    out[name] = { x: c * (cw + gap), y: r * (rh + gap), w: (c2 - c + 1) * cw + (c2 - c) * gap, h: (r2 - r + 1) * rh + (r2 - r) * gap };
  }));
  return out;
}
