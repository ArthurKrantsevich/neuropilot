/**
 * Клейморфизм: пластилиновая кнопка из трёх теней — внешняя мягкая (поднимает), внутренняя тёмная снизу справа (объём),
 * внутренняя светлая сверху слева (блик); рецепт — M. Malewicz, «Claymorphism in User Interfaces», 2021. Каждая тень задаётся отдельно, поэтому её можно включать по одной.
 * ink 0 → 1: текст из белого (ловушка) в тёмный того же оттенка. Шортс «3 тени на кнопку»: https://youtube.com/shorts/ot7WmfSWik0
 */
import type { CSSProperties, ReactNode } from "react";
import "./clay.css";

export type Lang = "ru" | "en";
/** Пастель и тёмный цвет того же оттенка для текста. */
export const CLAY = {
  lilac: { bg: "#C9B8FF", ink: "#2E1F66" },
  sky: { bg: "#A8D8FF", ink: "#0F3D66" },
  pink: { bg: "#FFC6E0", ink: "#6B1240" },
  mint: { bg: "#B8F0C8", ink: "#0F4D2A" },
  sun: { bg: "#FFE29A", ink: "#5C4300" },
};
export type Hue = keyof typeof CLAY;

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mixHex = (a: string, b: string, k: number) => {
  const A = hex(a), B = hex(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join("");
};
const lum = (h: string) => {
  const c = hex(h).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
/** Контраст по WCAG 2.x. */
export const contrast = (a: string, b: string) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** Три тени отдельно: так их видно в коде и так их можно включать по одной. */
export const SHADOWS = {
  outer: "0 18px 36px rgba(60, 40, 120, .28)",
  // по Малевичу: блик внутри сверху слева, тёмная внутри снизу справа
  dark: "inset -8px -10px 18px rgba(40, 20, 90, .28)",
  light: "inset 8px 10px 16px rgba(255, 255, 255, .75)",
};
export type Layers = { outer: number; dark: number; light: number };
export const ALL: Layers = { outer: 1, dark: 1, light: 1 };

const fade = (s: string, k: number) => s.replace(/,\s*([\d.]+)\)$/, (_, a) => `, ${(parseFloat(a) * k).toFixed(3)})`);
/** box-shadow из тех теней, что включены (k — сила каждой). */
export const clayShadow = (l: Layers) =>
  (["outer", "dark", "light"] as const).filter((k) => l[k] > 0.001).map((k) => fade(SHADOWS[k], l[k])).join(", ") || "none";

/** Пластилиновая кнопка. layers — сила каждой тени (0..1), ink — белый → тёмный того же оттенка. */
export function ClayButton({ label, hue = "lilac", layers = ALL, ink = 0, r = 40, style, children }: { label?: ReactNode; hue?: Hue; layers?: Layers; ink?: number; r?: number; style?: CSSProperties; children?: ReactNode }) {
  const c = CLAY[hue];
  return (
    <button className="clay-btn" style={{ background: c.bg, color: mixHex("#FFFFFF", c.ink, ink), borderRadius: r, boxShadow: clayShadow(layers), ...style }}>
      {children ?? <span>{label}</span>}
    </button>
  );
}

const T = {
  ru: { hi: "Привет, Миша!", sub: "Во что поиграем?", tiles: ["Буквы", "Цифры", "Цвета", "Звуки"], play: "Играть" },
  en: { hi: "Hi, Misha!", sub: "What shall we play?", tiles: ["Letters", "Numbers", "Colors", "Sounds"], play: "Play" },
};
const TILE_HUES: Hue[] = ["sky", "pink", "mint", "sun"];
const ICON = { ru: ["Аа", "123", "●", "♪"], en: ["Aa", "123", "●", "♪"] };

/** Детский экран из пластилина 393×852: четыре плитки и большая кнопка. */
export function ClayApp({ lang = "ru", ink = 0, layers = ALL }: { lang?: Lang; ink?: number; layers?: Layers }) {
  const t = T[lang];
  return (
    <div className="clay-app">
      <div className="clay-hi">
        <b>{t.hi}</b>
        <span>{t.sub}</span>
      </div>
      <div className="clay-grid">
        {t.tiles.map((name, i) => (
          <ClayButton key={name} hue={TILE_HUES[i]} ink={ink} layers={layers} r={34} style={{ width: "100%", height: "100%" }}>
            <span className="clay-icon">{ICON[lang][i]}</span>
            <span className="clay-name">{name}</span>
          </ClayButton>
        ))}
      </div>
      <ClayButton hue="lilac" ink={ink} layers={layers} r={44} label={t.play} style={{ width: "100%", height: 96, fontSize: 32 }} />
    </div>
  );
}
