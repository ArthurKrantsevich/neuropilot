/** Обои-пейзажи для демо: у каждых свой основной цвет — его и берёт Material You. */
export type Wall = { id: string; seed: string; name: { ru: string; en: string }; src: string };

const svg = (sky1: string, sky2: string, sun: string, hill1: string, hill2: string) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient></defs>
  <rect width="400" height="400" fill="url(#s)"/><circle cx="270" cy="150" r="58" fill="${sun}"/>
  <path d="M0 260 L80 190 L150 240 L230 160 L310 230 L400 180 V400 H0Z" fill="${hill1}"/>
  <path d="M0 310 L100 260 L190 300 L290 250 L400 290 V400 H0Z" fill="${hill2}"/></svg>`);

export const WALLS: Wall[] = [
  { id: "dusk", seed: "#6750A4", name: { ru: "Сумерки", en: "Dusk" }, src: svg("#8E7CC3", "#D7C8F5", "#FFE9F3", "#5B4A8C", "#3A2E63") },
  { id: "field", seed: "#F4C430", name: { ru: "Поле", en: "Field" }, src: svg("#FFD966", "#FFF2C2", "#FFFFFF", "#E0A800", "#8A6A00") },
  { id: "ocean", seed: "#0B3D91", name: { ru: "Океан", en: "Ocean" }, src: svg("#2D5FB8", "#9CC3F0", "#E8F3FF", "#0B3D91", "#06265C") },
  { id: "forest", seed: "#2E7D32", name: { ru: "Лес", en: "Forest" }, src: svg("#7CB97F", "#D6EED7", "#FFFBE0", "#2E7D32", "#1A4D1D") },
  { id: "rose", seed: "#E91E63", name: { ru: "Роза", en: "Rose" }, src: svg("#F06292", "#FCD2E0", "#FFF4F8", "#C2185B", "#7A0E39") },
];
