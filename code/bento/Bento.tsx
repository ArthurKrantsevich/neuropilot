/**
 * Бенто-сетка «Кошелька»: итоги месяца плитками. Разметка одна — раскладку задаёт только карта grid-template-areas.
 * Шортс «Сетка бенто: 2 строки CSS».
 */
import type { CSSProperties } from "react";
import { areasCss, LAYOUTS, type Layout } from "./bento";
import "./bento.css";

export type Lang = "ru" | "en";
const T = {
  ru: { month: "Октябрь · потрачено", sum: "48 250 ₽", of: "из 60 000 ₽", vs: "к сентябрю", goal: "Цель: отпуск", coffee: "кофе в день", cats: "6 категорий", days: "дней до зарплаты", weeks: ["1", "2", "3", "4"] },
  en: { month: "October · spent", sum: "$1,206", of: "of $1,500", vs: "vs September", goal: "Goal: vacation", coffee: "coffee a day", cats: "6 categories", days: "days to payday", weeks: ["1", "2", "3", "4"] },
};

/** Содержимое плитки по имени области (a…f). Размер текста — от ширины самой плитки (container queries). */
export function Tile({ id, lang = "ru", letter }: { id: string; lang?: Lang; letter?: boolean }) {
  const t = T[lang];
  const body = (() => {
    switch (id) {
      case "a": return (
        <>
          <span className="bt-label">{t.month}</span>
          <b className="bt-num">{t.sum}</b>
          <span className="bt-sub">{t.of}</span>
          <div className="bt-bars" aria-hidden="true">{[62, 88, 54, 76].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
        </>
      );
      case "b": return <><b className="bt-num">−9 %</b><span className="bt-label">{t.vs}</span></>;
      case "c": return (
        <>
          <svg className="bt-ring" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" fill="none" strokeWidth="5" className="bt-ring-bg" /><circle cx="20" cy="20" r="16" fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${0.64 * 100.5} 100.5`} transform="rotate(-90 20 20)" className="bt-ring-fg" /></svg>
          <b className="bt-mid">64 %</b><span className="bt-label">{t.goal}</span>
        </>
      );
      case "d": return <><b className="bt-num">290 ₽</b><span className="bt-label">{t.coffee}</span></>;
      case "e": return (
        <>
          <div className="bt-stack" aria-hidden="true">{[34, 22, 16, 12, 10, 6].map((w, i) => <i key={i} style={{ flexGrow: w }} />)}</div>
          <span className="bt-label">{t.cats}</span>
        </>
      );
      default: return <><b className="bt-num">12</b><span className="bt-label">{t.days}</span></>;
    }
  })();
  return (
    <div className={`bt bt-${id}`}>
      <div className="bt-in">{body}</div>
      {letter && <span className="bt-letter" aria-hidden="true">{id}</span>}
    </div>
  );
}

/** Сетка в браузере: CSS Grid + grid-template-areas. layout меняет только карту. */
export function Bento({ layout = LAYOUTS.bento, lang = "ru", letters = false, style }: { layout?: Layout; lang?: Lang; letters?: boolean; style?: CSSProperties }) {
  return (
    <div className="bento" style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`, gridTemplateAreas: areasCss(layout), ...style }}>
      {["a", "b", "c", "d", "e", "f"].map((id) => (
        <div key={id} style={{ gridArea: id }} className="bento-cell"><Tile id={id} lang={lang} letter={letters} /></div>
      ))}
    </div>
  );
}
