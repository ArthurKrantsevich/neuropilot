"use client";
/**
 * Неоморфизм «Гостиная»: экран умного дома 393×852 pt (iPhone 15 Pro), где кнопки и плитки слеплены из фона.
 * fix 0 → 1 плавно чинит экран: кнопкам — рамка 3,45 : 1, главной — цвет, плиткам — без тени, тексту — контраст.
 * Шортс «Найди кнопки на этом экране».
 */
import type { CSSProperties, ReactNode } from "react";
import "./neu.css";

export type Lang = "ru" | "en";
export type Kind = "button" | "card";
/** Где что лежит, в pt экрана: одна раскладка для галереи и для ролика (по ней ставятся метки поверх). */
export const NEU_LAYOUT: { id: string; kind: Kind; x: number; y: number; w: number; h: number; r: number }[] = [
  { id: "back", kind: "button", x: 24, y: 76, w: 52, h: 52, r: 26 },
  { id: "gear", kind: "button", x: 317, y: 76, w: 52, h: 52, r: 26 },
  { id: "dial", kind: "card", x: 66, y: 160, w: 260, h: 260, r: 130 },
  { id: "minus", kind: "button", x: 32, y: 452, w: 76, h: 76, r: 38 },
  { id: "plus", kind: "button", x: 285, y: 452, w: 76, h: 76, r: 38 },
  { id: "hum", kind: "card", x: 24, y: 560, w: 163, h: 118, r: 28 },
  { id: "air", kind: "card", x: 206, y: 560, w: 163, h: 118, r: 28 },
  { id: "go", kind: "button", x: 24, y: 708, w: 345, h: 64, r: 32 },
];
export const NEU_COLORS = { bg: "#E0E5EC", light: "#FFFFFF", dark: "#A3B1C6", edge: "#6B7A90", accent: "#2F6BDE" };

const T = {
  ru: { room: "Гостиная", target: "Цель", now: "Сейчас 20°", hum: "Влажность", air: "Воздух", good: "хороший", go: "Включить обогрев", back: "Назад", gear: "Настройки", minus: "Холоднее", plus: "Теплее" },
  en: { room: "Living room", target: "Target", now: "Now 20°", hum: "Humidity", air: "Air", good: "good", go: "Turn on heating", back: "Back", gear: "Settings", minus: "Cooler", plus: "Warmer" },
};

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** Смешать два цвета #RRGGBB: k = 0 → a, k = 1 → b. */
export const mixHex = (a: string, b: string, k: number) => {
  const A = hex(a), B = hex(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join("");
};
const raised = (d: number, a = 1) =>
  `${d}px ${d}px ${d * 2}px rgb(163 177 198 / ${a}), -${d}px -${d}px ${d * 2}px rgb(255 255 255 / ${a})`;
const ring = (fix: number, color: string) => `inset 0 0 0 ${1.5 * fix}px ${mixHex(NEU_COLORS.bg, color, fix)}`;
const at = (id: string) => NEU_LAYOUT.find((e) => e.id === id)!;

const Icon = ({ d, c }: { d: string; c: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Экран целиком. fix — от «мягко и невидимо» (0) до «мягко и видно» (1). */
export function NeuScreen({ lang = "ru", fix = 0, onPress }: { lang?: Lang; fix?: number; onPress?: (id: string) => void }) {
  const t = T[lang];
  const ink = mixHex("#8A96A8", "#2B3546", fix); // цифры и иконки: 2,3 → 9,6 : 1
  const label = mixHex("#9BA6B5", "#4E5B70", fix); // подписи: 1,95 → 5,0 : 1
  const box = (id: string): CSSProperties => {
    const L = at(id);
    return { left: L.x, top: L.y, width: L.w, height: L.h, borderRadius: L.r };
  };
  // плитки теряют выпуклость: что не нажимается, то не торчит
  const card = (id: string): CSSProperties => ({ ...box(id), boxShadow: raised(9, 1 - fix), background: mixHex(NEU_COLORS.bg, "#D6DCE4", fix) });
  const B = ({ id, label: aria, children, style }: { id: string; label: string; children: ReactNode; style?: CSSProperties }) => (
    <button
      className="neu-el neu-btn"
      aria-label={aria}
      style={{ ...box(id), boxShadow: `${raised(7)}, ${ring(fix, NEU_COLORS.edge)}`, ...style }}
      onClick={() => onPress?.(id)}
    >
      {children}
    </button>
  );
  return (
    <div className="neu" style={{ background: NEU_COLORS.bg }}>
      <B id="back" label={t.back}><Icon d="M14.5 5.5 8 12l6.5 6.5" c={ink} /></B>
      <div className="neu-title" style={{ color: ink }}>{t.room}</div>
      <B id="gear" label={t.gear}><Icon d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8ZM12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" c={ink} /></B>
      <div className="neu-el neu-dial" style={card("dial")}>
        <div className="neu-dial-in" style={{ boxShadow: `inset 6px 6px 12px rgb(163 177 198 / ${1 - fix * 0.6}), inset -6px -6px 12px rgb(255 255 255 / ${1 - fix * 0.6})` }}>
          <span style={{ color: label }}>{t.target}</span>
          <b style={{ color: ink }}>22°</b>
        </div>
      </div>
      <B id="minus" label={t.minus}><Icon d="M6 12h12" c={ink} /></B>
      <div className="neu-now" style={{ color: label }}>{t.now}</div>
      <B id="plus" label={t.plus}><Icon d="M6 12h12M12 6v12" c={ink} /></B>
      <div className="neu-el neu-card" style={card("hum")}>
        <span style={{ color: label }}>{t.hum}</span>
        <b style={{ color: ink }}>41 %</b>
      </div>
      <div className="neu-el neu-card" style={card("air")}>
        <span style={{ color: label }}>{t.air}</span>
        <b style={{ color: ink }}>{t.good}</b>
      </div>
      <B
        id="go"
        label={t.go}
        style={{
          background: mixHex(NEU_COLORS.bg, NEU_COLORS.accent, fix),
          color: mixHex("#8A96A8", "#FFFFFF", fix),
          boxShadow: `${raised(7)}, ${ring(fix, NEU_COLORS.accent)}`,
        }}
      >
        <span className="neu-go">{t.go}</span>
      </B>
    </div>
  );
}
