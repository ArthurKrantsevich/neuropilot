/**
 * Один экран «Сегодня» 393×852 pt в трёх эпохах айфона — шортс r17 «Айфон 20 лет ходит по кругу».
 *  - leather (2007–2012): кожа со строчкой, блокнот, фетр в деревянной раме, гелевая кнопка, глянцевый таббар;
 *  - flat (2013): белый фон, волосяные линии, кнопка — просто синий текст (подсказка «нажми» пропала);
 *  - glass (2025): фото под стеклом, панели с размытием и бликом, плавающий таббар; tint 0 → 1 — режим Tinted;
 *  - rule: вывод — фон плоский, объём только у того, что нажимается.
 * depth 0..1 гасит объём и текстуры. Только inline-стили: один файл, без зависимостей. Шортс: https://youtube.com/shorts/S7m12REY37I
 */
import React from "react";

export type Era = "leather" | "flat" | "glass" | "rule";
export type Lang = "ru" | "en";

const T = {
  ru: { title: "Сегодня", done: "Готово", month: "октября · среда", meet: "09:30 · Стендап", notes: ["Купить молоко", "Позвонить маме", "Макет — в пятницу"], games: "Игры", gamesSub: "3 вызова", cta: "Новая заметка", tabs: ["Сегодня", "Заметки", "Игры"] },
  en: { title: "Today", done: "Done", month: "October · Wednesday", meet: "09:30 · Standup", notes: ["Buy milk", "Call mom", "Mockup by Friday"], games: "Games", gamesSub: "3 challenges", cta: "New note", tabs: ["Today", "Notes", "Games"] },
};

/** Где что лежит, в pt экрана — для меток и макро поверх. */
export const LAYOUT = {
  header: { x: 0, y: 0, w: 393, h: 118 },
  done: { x: 297, y: 70, w: 80, h: 34 },
  cal: { x: 16, y: 132, w: 361, h: 150 },
  note: { x: 16, y: 296, w: 361, h: 172 },
  game: { x: 16, y: 482, w: 361, h: 120 },
  cta: { x: 16, y: 620, w: 361, h: 58 },
  tab: { x: 0, y: 766, w: 393, h: 86 },
};
export type Rect = { x: number; y: number; w: number; h: number };

// шум для текстур кожи, фетра и льна: SVG feTurbulence → data URI
const noise = (freq: number, op: number, seed = 3) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='3' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${op} 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
  )}")`;
export const LEATHER = `${noise(0.9, 0.55, 4)}, radial-gradient(120% 90% at 30% 0%, #9A5B32 0%, #6E3B1D 55%, #4A2611 100%)`;
export const FELT = `${noise(1.4, 0.5, 9)}, radial-gradient(110% 100% at 50% 40%, #3C9A4A 0%, #2A7535 60%, #1C5426 100%)`;
const WOOD = `repeating-linear-gradient(92deg, rgba(0,0,0,.10) 0 2px, transparent 2px 7px), linear-gradient(180deg, #B07A45, #7A4A22)`;
const LINEN = `${noise(2.2, 0.18, 2)}, repeating-linear-gradient(0deg, rgba(0,0,0,.035) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(255,255,255,.08) 0 1px, transparent 1px 3px), #D9D3C7`;

/** Строчка: пунктир цвета нитки + тень прокола. sew 0..1 — сколько уже прошито. */
export const Stitch: React.FC<{ y: number; inset?: number; color?: string; op?: number; sew?: number }> = ({ y, inset = 8, color = "rgba(255,226,180,.8)", op = 1, sew = 1 }) => (
  <div style={{ position: "absolute", left: inset, right: inset, top: y, borderTop: `2px dashed ${color}`, filter: "drop-shadow(0 1px 0 rgba(0,0,0,.45))", opacity: op, clipPath: `inset(0 ${(1 - sew) * 100}% 0 0)` }} />
);

const Icon: React.FC<{ i: number; color: string; size?: number; stroke?: boolean }> = ({ i, color, size = 26, stroke }) => {
  const d = [
    "M5 7h14v12H5zM5 11h14M9 4v5M15 4v5", // календарь
    "M7 4h10v16H7zM10 9h4M10 13h4", // заметка
    "M12 4l2.5 5 5.5.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.5-.8z", // игры
  ][i];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d={d} fill={stroke ? "none" : color} fillOpacity={stroke ? 0 : 0.9} stroke={color} strokeWidth={stroke ? 1.4 : 1.2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

// ── цвет и контраст (WCAG 2.x) — демо считает контраст само ─────────────────
type RGB = [number, number, number];
const lin = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]: RGB) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export const contrast = (a: RGB, b: RGB) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const over = (top: RGB, a: number, under: RGB): RGB => [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a)) as RGB;
/** Средний цвет фото под кнопкой «Новая заметка» (ffmpeg: crop области кнопки → scale=1:1). */
export const PHOTO_UNDER_CTA: RGB = [184, 160, 148];
/** Стекло: Clear — белая дымка 14 %; Tinted — тёмная заливка 62 %. tint 0..1 между ними. */
export const glassFill = (tint: number) => ({ white: 0.14 * (1 - tint), dark: 0.62 * tint });
/** Контраст белой подписи кнопки на стекле над фото (Clear → Tinted). */
export const ctaContrast = (tint: number) => {
  const g = glassFill(tint);
  const c = over([28, 28, 36], g.dark, over([255, 255, 255], g.white, PHOTO_UNDER_CTA));
  return contrast([255, 255, 255], c);
};

export const EraScreen: React.FC<{
  era: Era;
  lang?: Lang;
  /** 0..1 — объём и текстуры (пресс сплющивает до 0) */
  depth?: number;
  /** 0..1 — Clear → Tinted (только glass) */
  tint?: number;
  /** фото под стеклом (glass) и картинка в карточке «Игры» */
  photo?: string;
  photo2?: string;
  /** сколько рукописных строк дописано в блокноте (0..3, дробное — пишется) */
  write?: number;
  /** 0..1 — прошита ли строчка на коже */
  sew?: number;
  /** включить преломление через SVG-фильтр (Chromium); иначе только размытие */
  refract?: boolean;
  hand?: string;
  ui?: string;
}> = ({ era, lang = "ru", depth = 1, tint = 0, photo, photo2, write = 3, sew = 1, refract = false, hand = "Caveat, cursive", ui = "Inter, system-ui, sans-serif" }) => {
  const t = T[lang];
  const L = LAYOUT;
  const box = (r: Rect): React.CSSProperties => ({ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, boxSizing: "border-box" });
  const D = depth;

  if (era === "leather") {
    return (
      <div style={{ position: "absolute", inset: 0, width: 393, height: 852, overflow: "hidden", fontFamily: ui, background: LINEN }}>
        {/* шапка из кожи до самого верха (строка статуса лежит на коже) */}
        <div style={{ ...box(L.header), background: LEATHER, boxShadow: `0 ${3 * D}px ${6 * D}px rgba(0,0,0,${0.45 * D})` }}>
          <Stitch y={6} op={D} sew={sew} />
          <Stitch y={108} op={D} sew={sew} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 74, textAlign: "center", fontWeight: 800, fontSize: 22, color: "#F3E3C8", textShadow: `0 -1px 0 rgba(0,0,0,${0.7 * D}), 0 1px 0 rgba(255,255,255,${0.12 * D})` }}>{t.title}</div>
          <div style={{ ...box(L.done), borderRadius: 7, background: "linear-gradient(#A06E48, #5E361D)", border: "1px solid #3A1D0B", boxShadow: `inset 0 1px 0 rgba(255,255,255,${0.28 * D}), 0 1px 0 rgba(255,255,255,${0.15 * D})`, display: "grid", placeItems: "center", color: "#fff", fontWeight: 700, fontSize: 14, textShadow: "0 -1px 0 rgba(0,0,0,.55)" }}>{t.done}</div>
        </div>
        {/* календарь: кожаный корешок со строчкой и белая бумага */}
        <div style={{ ...box(L.cal), borderRadius: 8, overflow: "hidden", background: "linear-gradient(#FFFFFF, #ECEAE4)", boxShadow: `0 ${3 * D}px ${6 * D}px rgba(0,0,0,${0.4 * D}), inset 0 -1px 0 rgba(0,0,0,.08)` }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 36, background: `${noise(0.9, 0.55, 6)}, linear-gradient(#B3402E, #7E2417)` }}>
            <Stitch y={5} inset={6} color="rgba(255,215,190,.85)" op={D} sew={sew} />
            <Stitch y={29} inset={6} color="rgba(255,215,190,.85)" op={D} sew={sew} />
            {[60, 120, 180, 240, 300].map((x) => (
              <div key={x} style={{ position: "absolute", left: x, top: 12, width: 10, height: 12, borderRadius: 3, background: "linear-gradient(#EEE, #888)", boxShadow: "0 1px 1px rgba(0,0,0,.5)" }} />
            ))}
          </div>
          <div style={{ position: "absolute", left: 22, top: 46, fontWeight: 800, fontSize: 70, lineHeight: 1, color: "#3A3A3A", textShadow: `0 1px 0 rgba(255,255,255,${D})` }}>28</div>
          <div style={{ position: "absolute", left: 132, top: 66, fontWeight: 700, fontSize: 17, color: "#B3402E", textShadow: `0 1px 0 rgba(255,255,255,${D})` }}>{t.month}</div>
          <div style={{ position: "absolute", left: 132, top: 92, fontWeight: 500, fontSize: 14, color: "#7A7670" }}>{t.meet}</div>
        </div>
        {/* жёлтый блокнот: синие линейки, красные поля, перфорация сверху */}
        <div style={{ ...box(L.note), overflow: "hidden", background: "repeating-linear-gradient(180deg, transparent 0 33px, #9CC3E6 33px 34.5px), linear-gradient(#FFF7B3, #FBEA86)", boxShadow: `0 ${3 * D}px ${7 * D}px rgba(0,0,0,${0.38 * D})`, borderRadius: 3 }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 16, background: "radial-gradient(circle at 9px 8px, #D9D3C7 3.2px, transparent 3.6px) 0 0/18px 16px, linear-gradient(#E9D86E, #F4E37E)" }} />
          <div style={{ position: "absolute", left: 40, top: 0, bottom: 0, width: 4, borderLeft: "1.5px solid #E58A8A", borderRight: "1.5px solid #E58A8A" }} />
          {t.notes.map((n, i) => {
            const k = Math.max(0, Math.min(1, write - i));
            return (
              <div key={i} style={{ position: "absolute", left: 56, top: 28 + i * 34, fontFamily: hand, fontWeight: 600, fontSize: 30, lineHeight: "34px", color: "#22306A", whiteSpace: "nowrap", clipPath: `inset(0 ${(1 - k) * 100}% 0 0)` }}>{n}</div>
            );
          })}
        </div>
        {/* фетр в деревянной раме */}
        <div style={{ ...box(L.game), borderRadius: 12, background: WOOD, padding: 9, boxShadow: `0 ${3 * D}px ${7 * D}px rgba(0,0,0,${0.45 * D}), inset 0 1px 0 rgba(255,255,255,${0.35 * D})` }}>
          <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 6, background: FELT, boxShadow: `inset 0 ${3 * D}px ${10 * D}px rgba(0,0,0,${0.6 * D})` }}>
            <div style={{ position: "absolute", left: 18, top: 22, fontWeight: 800, fontSize: 26, color: "#EAF7E6", textShadow: `0 -1px 0 rgba(0,0,0,${0.55 * D})` }}>{t.games}</div>
            <div style={{ position: "absolute", left: 18, top: 56, fontWeight: 600, fontSize: 15, color: "rgba(234,247,230,.8)", textShadow: `0 -1px 0 rgba(0,0,0,${0.5 * D})` }}>{t.gamesSub}</div>
            {([["#E23B3B", 236], ["#2D6BE0", 270], ["#F2C230", 304]] as [string, number][]).map(([c, x], i) => (
              <div key={i} style={{ position: "absolute", left: x, top: 30 - i * 3, width: 38, height: 38, borderRadius: 19, background: `radial-gradient(circle, ${c} 0 42%, #fff 43% 50%, ${c} 51%)`, border: "2px dashed rgba(255,255,255,.85)", boxSizing: "border-box", boxShadow: `0 ${3 * D}px ${4 * D}px rgba(0,0,0,${0.5 * D})` }} />
            ))}
          </div>
        </div>
        {/* гелевая кнопка: стеклянный пузырь с бликом-полосой */}
        <div style={{ ...box(L.cta), borderRadius: 14, background: "linear-gradient(180deg, #92D2FF 0%, #4DAAF6 48%, #1F80E2 52%, #42A0F4 100%)", border: "1px solid #1458A8", boxShadow: `inset 0 1px 0 rgba(255,255,255,${0.8 * D}), 0 ${2 * D}px ${4 * D}px rgba(0,0,0,${0.4 * D})`, display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: 19, textShadow: "0 -1px 0 rgba(0,0,0,.4)" }}>{t.cta}</div>
        {/* глянцевый чёрный таббар */}
        <div style={{ ...box(L.tab), background: "linear-gradient(180deg, #4C4C4C 0%, #2A2A2A 50%, #141414 51%, #0A0A0A 100%)", borderTop: "1px solid #000", boxShadow: "inset 0 1px 0 rgba(255,255,255,.2)", display: "flex", justifyContent: "space-around", paddingTop: 7 }}>
          {t.tabs.map((n, i) => (
            <div key={n} style={{ width: 110, height: 48, borderRadius: 5, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, background: i === 0 ? "rgba(255,255,255,.13)" : "transparent", boxShadow: i === 0 ? "inset 0 1px 2px rgba(0,0,0,.6)" : "none" }}>
              <div style={{ filter: i === 0 ? "drop-shadow(0 0 5px #4DB1FF)" : "none" }}><Icon i={i} color={i === 0 ? "#7CC4FF" : "#9A9A9A"} size={24} /></div>
              <div style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? "#fff" : "#9A9A9A" }}>{n}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (era === "flat" || era === "rule") {
    const rule = era === "rule";
    const hair = "0.5px solid #C8C7CC";
    return (
      <div style={{ position: "absolute", inset: 0, width: 393, height: 852, overflow: "hidden", fontFamily: ui, background: "#FFFFFF", color: "#000" }}>
        <div style={{ ...box(L.header), borderBottom: hair, background: "#F9F9F9" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 78, textAlign: "center", fontWeight: 600, fontSize: 17 }}>{t.title}</div>
          <div style={{ position: "absolute", right: 18, top: 78, fontWeight: 400, fontSize: 17, color: "#007AFF" }}>{t.done}</div>
        </div>
        <div style={{ ...box(L.cal), borderBottom: hair }}>
          <div style={{ position: "absolute", left: 6, top: 22, fontWeight: 200, fontSize: 76, lineHeight: 1, color: "#FF3B30" }}>28</div>
          <div style={{ position: "absolute", left: 120, top: 44, fontWeight: 400, fontSize: 17 }}>{t.month}</div>
          <div style={{ position: "absolute", left: 120, top: 70, fontWeight: 300, fontSize: 15, color: "#8E8E93" }}>{t.meet}</div>
        </div>
        <div style={{ ...box(L.note), borderBottom: hair }}>
          {t.notes.map((n, i) => (
            <div key={i} style={{ position: "absolute", left: 6, top: 28 + i * 44, fontWeight: 300, fontSize: 19 }}>{n}</div>
          ))}
        </div>
        <div style={{ ...box(L.game), borderBottom: hair }}>
          <div style={{ position: "absolute", left: 6, top: 34, fontWeight: 300, fontSize: 19 }}>{t.games}</div>
          <div style={{ position: "absolute", left: 6, top: 62, fontWeight: 300, fontSize: 15, color: "#8E8E93" }}>{t.gamesSub}</div>
          <div style={{ position: "absolute", right: 10, top: 36, fontWeight: 300, fontSize: 30, color: "#C7C7CC" }}>›</div>
        </div>
        {rule ? (
          // вывод: объём только у того, что нажимается — градиент, блик 1 px, тень
          <div style={{ ...box(L.cta), borderRadius: 16, background: "linear-gradient(rgba(255,255,255,.2), rgba(0,0,0,.07)), #2F6BFF", boxShadow: "inset 0 1px 0 rgba(255,255,255,.6), 0 2px 6px rgba(0,0,0,.25), 0 1px 1px rgba(0,0,0,.15)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 700, fontSize: 19 }}>{t.cta}</div>
        ) : (
          // 2013: кнопка — просто синий текст, как подпись
          <div style={{ ...box(L.cta), display: "flex", alignItems: "center", paddingLeft: 6, color: "#007AFF", fontWeight: 400, fontSize: 19 }}>{t.cta}</div>
        )}
        <div style={{ ...box(L.tab), background: "rgba(247,247,247,.96)", borderTop: hair, display: "flex", justifyContent: "space-around", paddingTop: 8 }}>
          {t.tabs.map((n, i) => (
            <div key={n} style={{ width: 110, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <Icon i={i} color={i === 0 ? "#007AFF" : "#8E8E93"} size={26} stroke />
              <div style={{ fontSize: 10, fontWeight: 400, color: i === 0 ? "#007AFF" : "#8E8E93" }}>{n}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // glass — 2025
  const g = glassFill(tint);
  const fill = `linear-gradient(rgba(28,28,36,${g.dark}), rgba(28,28,36,${g.dark})), linear-gradient(rgba(255,255,255,${g.white}), rgba(255,255,255,${g.white}))`;
  const bf = `${refract ? "url(#lg-refract) " : ""}blur(14px) saturate(${180 - 60 * tint}%)`;
  const glass = (r: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
    borderRadius: r,
    background: fill,
    backdropFilter: bf,
    WebkitBackdropFilter: bf,
    border: "1px solid rgba(255,255,255,.42)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.7), inset 0 -1px 0 rgba(255,255,255,.18), inset 0 0 18px rgba(255,255,255,.12), 0 10px 26px rgba(0,0,0,.18)",
    ...extra,
  });
  return (
    <div style={{ position: "absolute", inset: 0, width: 393, height: 852, overflow: "hidden", fontFamily: ui, color: "#fff" }}>
      {refract && (
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <filter id="lg-refract" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="38" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      )}
      {photo && <img src={photo} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.28) 0%, rgba(0,0,0,0) 22%)" }} />
      <div style={{ position: "absolute", left: 20, top: 64, fontWeight: 800, fontSize: 36, letterSpacing: "-0.02em", textShadow: "0 1px 12px rgba(0,0,0,.25)" }}>{t.title}</div>
      <div style={{ ...box({ x: 287, y: 66, w: 90, h: 40 }), ...glass(20), display: "grid", placeItems: "center", fontWeight: 700, fontSize: 15 }}>{t.done}</div>
      <div style={{ ...box(L.cal), ...glass(28) }}>
        <div style={{ position: "absolute", left: 22, top: 32, fontWeight: 800, fontSize: 72, lineHeight: 1, letterSpacing: "-0.03em" }}>28</div>
        <div style={{ position: "absolute", left: 132, top: 48, fontWeight: 700, fontSize: 17 }}>{t.month}</div>
        <div style={{ position: "absolute", left: 132, top: 74, fontWeight: 500, fontSize: 15, opacity: 0.85 }}>{t.meet}</div>
      </div>
      <div style={{ ...box(L.note), ...glass(28) }}>
        {t.notes.map((n, i) => (
          <div key={i} style={{ position: "absolute", left: 22, top: 30 + i * 42, fontWeight: 600, fontSize: 19 }}>{n}</div>
        ))}
      </div>
      <div style={{ ...box(L.game), ...glass(28), overflow: "hidden" }}>
        {photo2 && <img src={photo2} style={{ position: "absolute", left: 186, top: -36, width: 190, height: 190, objectFit: "cover", borderRadius: 24, transform: "rotate(-6deg)" }} />}
        <div style={{ position: "absolute", left: 22, top: 30, fontWeight: 800, fontSize: 26 }}>{t.games}</div>
        <div style={{ position: "absolute", left: 22, top: 64, fontWeight: 600, fontSize: 15, opacity: 0.85 }}>{t.gamesSub}</div>
      </div>
      <div style={{ ...box(L.cta), ...glass(29, { background: `linear-gradient(180deg, rgba(255,255,255,${0.32 * (1 - tint)}) 0%, rgba(255,255,255,0) 55%), ${fill}` }), display: "grid", placeItems: "center", fontWeight: 800, fontSize: 19 }}>{t.cta}</div>
      <div style={{ ...box({ x: 22, y: 770, w: 349, h: 64 }), ...glass(32), display: "flex", justifyContent: "space-around", alignItems: "center", padding: "0 6px" }}>
        {t.tabs.map((n, i) => (
          <div key={n} style={{ width: 108, height: 52, borderRadius: 26, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, background: i === 0 ? "rgba(255,255,255,.28)" : "transparent" }}>
            <Icon i={i} color="#fff" size={22} />
            <div style={{ fontSize: 10, fontWeight: 700 }}>{n}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
