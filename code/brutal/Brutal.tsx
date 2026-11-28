"use client";
/**
 * Необрутализм «Лавка шрифтов»: одна страница 840×520, которая плавно переходит
 * из «мягкого SaaS» (градиенты, размытые тени) в необрутализм (плоский цвет, рамка, жёсткая тень без размытия).
 * Параметры 0 → 1: g — градиенты (1 = есть), s — тени жёсткие, b — рамки, c — из пяти ярких цветов два (NN/g: 2–3), press — нажатие.
 * Шортс «0 размытий, 0 градиентов».
 */
import type { CSSProperties } from "react";
import "./brutal.css";

export type Lang = "ru" | "en";
export type BrutalState = { g: number; s: number; b: number; c: number; press?: number };
export const SOFT: BrutalState = { g: 1, s: 0, b: 0, c: 0 };
export const BRUTAL: BrutalState = { g: 0, s: 1, b: 1, c: 0 };
export const TWO_COLORS: BrutalState = { g: 0, s: 1, b: 1, c: 1 };

const T = {
  ru: { logo: "Лавка шрифтов", login: "Войти", name: "Гротеск Про", meta: "8 начертаний · кириллица", price: "1 490 ₽", buy: "Купить", fresh: "Новинка", freshT: "Мягкая антиква", sale: "−30 %", saleT: "только сегодня" },
  en: { logo: "Type Shop", login: "Log in", name: "Grotesk Pro", meta: "8 weights · Cyrillic", price: "$19", buy: "Buy", fresh: "New", freshT: "Soft serif", sale: "−30%", saleT: "today only" },
};

type Part = "spec" | "buy" | "fresh" | "sale" | "login";
/** Пять ярких цветов: у каждой поверхности свой. С c → 1 остаются два: жёлтый у главной кнопки (самый яркий) и голубой у блока шрифта. */
export const BRIGHT: Record<Part, string> = { spec: "#FFD43B", buy: "#FF6B9D", fresh: "#4DABF7", sale: "#69DB7C", login: "#B197FC" };
const CALM: Record<Part, string> = { spec: "#4DABF7", buy: "#FFD43B", fresh: "#FFFFFF", sale: "#4DABF7", login: "#FFFFFF" };
// мягкий SaaS: пастельные градиенты на тех же поверхностях
const GRAD: Record<Part, string> = {
  spec: "linear-gradient(135deg, #E0E7FF, #FCE7F3)",
  buy: "linear-gradient(135deg, #7C5CFF, #C04CFD)",
  fresh: "linear-gradient(135deg, #DBEAFE, #EDE9FE)",
  sale: "linear-gradient(135deg, #DCFCE7, #E0F2FE)",
  login: "linear-gradient(135deg, #F5F3FF, #EEF2FF)",
};

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mixHex = (a: string, b: string, k: number) => {
  const A = hex(a), B = hex(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join("");
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Тень: мягкая (0 18px 40px, полупрозрачная) → жёсткая (6px 6px 0 #111). lift — доля сдвига (нажатие → 0). */
export const shadow = (s: number, lift = 1) => {
  const x = lerp(0, 6, s) * lift, y = lerp(18, 6, s) * lift, blur = lerp(40, 0, s), a = lerp(0.18, 1, s);
  const c = [lerp(76, 17, s), lerp(61, 17, s), lerp(140, 17, s)].map(Math.round).join(", ");
  return `${x.toFixed(1)}px ${y.toFixed(1)}px ${blur.toFixed(1)}px rgba(${c}, ${a.toFixed(2)})`;
};

/** Сколько на странице размытых теней и градиентов — счётчики из ролика. */
export const counts = (st: BrutalState) => ({ blur: st.s < 1 ? 5 : 0, grad: st.g > 0 ? 6 : 0 });

export function BrutalShop({ lang = "ru", st, onBuy }: { lang?: Lang; st: BrutalState; onBuy?: () => void }) {
  const t = T[lang];
  const press = st.press ?? 0;
  const ink = mixHex("#4B4A63", "#111111", st.b);
  const surf = (k: Part): CSSProperties => ({
    // через белый, а не напрямую: жёлтый → голубой по прямой проходит через грязно-серый
    backgroundColor: st.c < 0.5 ? mixHex(BRIGHT[k], "#FFFFFF", st.c * 2) : mixHex("#FFFFFF", CALM[k], st.c * 2 - 1),
    border: `${(3 * st.b).toFixed(2)}px solid #111`,
    borderRadius: lerp(22, 8, st.b),
  });
  // градиент в CSS не «перетекает» в плоский цвет, поэтому он лежит отдельным слоем и гаснет прозрачностью
  const Grad = ({ k }: { k: Part }) => (st.g > 0.01 ? <i className="br-grad" style={{ backgroundImage: GRAD[k], opacity: st.g }} aria-hidden="true" /> : null);
  const lift = 0.7 * (1 - press);
  return (
    <div className="br" style={{ color: ink, background: mixHex("#F7F7FB", "#FFF8EC", 1 - st.g) }}>
      {st.g > 0.01 && <i className="br-grad br-page" style={{ opacity: st.g }} aria-hidden="true" />}
      <header className="br-head">
        <b className="br-logo">{t.logo}</b>
        <button className="br-login" style={{ ...surf("login"), boxShadow: shadow(st.s, 0.5) }}>
          <Grad k="login" />
          <span>{t.login}</span>
        </button>
      </header>
      <article className="br-card" style={{ ...surf("fresh"), backgroundColor: "#FFFFFF", boxShadow: shadow(st.s) }}>
        <div className="br-spec" style={surf("spec")}>
          <Grad k="spec" />
          <span>Аа</span>
        </div>
        <div className="br-info">
          <h3>{t.name}</h3>
          <p style={{ color: mixHex("#7A7891", "#3A3A3A", st.b) }}>{t.meta}</p>
          <div className="br-row">
            <b className="br-price">{t.price}</b>
            <button
              className="br-buy"
              onClick={onBuy}
              style={{
                ...surf("buy"),
                color: mixHex("#FFFFFF", "#111111", 1 - st.g),
                boxShadow: shadow(st.s, lift) + (st.g > 0.01 ? `, 0 0 ${(24 * st.g).toFixed(1)}px rgba(124, 92, 255, ${(0.45 * st.g).toFixed(2)})` : ""),
                // нажатие: кнопка садится в свою тень — сдвиг ровно на её смещение
                transform: `translate(${(4.2 * press * st.s).toFixed(1)}px, ${(4.2 * press * st.s).toFixed(1)}px)`,
              }}
            >
              <Grad k="buy" />
              <span>{t.buy}</span>
            </button>
          </div>
        </div>
      </article>
      <aside className="br-side">
        <div className="br-mini" style={{ ...surf("fresh"), boxShadow: shadow(st.s, 0.8) }}>
          <Grad k="fresh" />
          <small>{t.fresh}</small>
          <b>{t.freshT}</b>
        </div>
        <div className="br-mini" style={{ ...surf("sale"), boxShadow: shadow(st.s, 0.8) }}>
          <Grad k="sale" />
          <small>{t.saleT}</small>
          <b className="br-sale">{t.sale}</b>
        </div>
      </aside>
    </div>
  );
}
