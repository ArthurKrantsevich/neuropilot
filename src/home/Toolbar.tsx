"use client";
// Панель над карточками в стиле канала: поиск, теги-фильтры и сортировка. Висит сверху при прокрутке.
// Пусто — пиксельный Юнит в недоумении и подсказки, что поискать.
import { useEffect, useRef, useState } from "react";
import { HINTS, SORTS, TAGS, type Sort, type Tag } from "./filters";

const INK = "#14171D";
const CREAM = "#F4F0EA";
const RUST = "#9C4A31";
const ORANGE = "#D97757";

// пиксельная лупа
const Lens = () => (
  <svg width="22" height="22" viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden>
    <path d="M4 1h3v1h1v1h1v3H8v1H7v1H4V7H3V6H2V3h1V2h1z" fill={INK} />
    <path d="M4 3h3v3H4z" fill={CREAM} />
    <path d="M8 7h1v1h1v1h1v2h-1v-1H9V9H8V8H7V7z" fill={INK} />
  </svg>
);

const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode }> = ({ on, onClick, children }) => (
  <button
    className="np-chip"
    data-on={on || undefined}
    aria-pressed={on}
    onClick={onClick}
    style={{
      fontFamily: "var(--golos)",
      fontWeight: 800,
      fontSize: 14,
      whiteSpace: "nowrap",
      color: on ? CREAM : INK,
      background: on ? ORANGE : CREAM,
      border: `3px solid ${INK}`,
      padding: "6px 12px",
    }}
  >
    {children}
  </button>
);

export const Toolbar: React.FC<{
  q: string;
  setQ: (q: string) => void;
  tag: Tag | null;
  setTag: (t: Tag | null) => void;
  sort: Sort;
  setSort: (s: Sort) => void;
  found: number;
  total: number;
  compact: boolean;
  onFocus: (on: boolean) => void;
}> = ({ q, setQ, tag, setTag, sort, setSort, found, total, compact, onFocus }) => {
  const input = useRef<HTMLInputElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  // прилипла к верху — под ней появляется затемнение
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const box = bar.current?.closest(".np-scroll");
    if (!box) return;
    const on = () => setStuck(box.scrollTop > 0 && bar.current!.getBoundingClientRect().top - box.getBoundingClientRect().top < 1);
    on();
    box.addEventListener("scroll", on, { passive: true });
    return () => box.removeEventListener("scroll", on);
  }, []);
  // «/» — сразу в поиск, Esc — очистить
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea, [contenteditable]");
      if (e.key === "/" && !typing) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // телефон и панель прилипла — только строка поиска и кнопка фильтров, чтобы не закрывать карточки
  const mini = compact && stuck;
  const toTop = () => bar.current?.closest(".np-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
  return (
    <div ref={bar} className={"np-bar" + (stuck ? " np-stuck" : "")} style={{ position: "sticky", top: compact ? -16 : "-6vh", zIndex: 5, padding: "12px 0 18px", margin: "0 0 8px" }}>
      <div style={{ background: CREAM, border: `5px solid ${INK}`, boxShadow: `8px 8px 0 ${RUST}`, padding: compact ? 12 : 14, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12 }}>
        {/* строка поиска; на компьютере справа от неё — сортировка */}
        <div style={{ display: "flex", gap: compact ? 10 : 14, alignItems: "center", minWidth: 0 }}>
        <label className="np-search" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, background: "#FFFDFA", border: `3px solid ${INK}`, padding: "8px 10px" }}>
          <Lens />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && (setQ(""), input.current?.blur())}
            onFocus={() => onFocus(true)}
            onBlur={() => onFocus(false)}
            placeholder={mini ? "Найти…" : compact ? "Найти компонент…" : "Найти: тень, пароль, анимация…"}
            aria-label="Поиск по компонентам"
            spellCheck={false}
            style={{ all: "unset", flex: 1, minWidth: 0, fontFamily: "var(--golos)", fontWeight: 700, fontSize: compact ? 16 : 18, color: INK }}
          />
          <span style={{ fontFamily: "var(--pixel)", fontSize: 18, color: found ? INK : ORANGE, whiteSpace: "nowrap" }}>
            {found}
            <span style={{ color: "#9A9086" }}>/{total}</span>
          </span>
          {q ? (
            <button className="np-x" onClick={() => (setQ(""), input.current?.focus())} aria-label="Очистить" style={{ all: "unset", fontFamily: "var(--pixel)", fontSize: 18, color: CREAM, background: INK, width: 26, height: 26, display: "grid", placeItems: "center" }}>
              ×
            </button>
          ) : (
            !compact && <kbd style={{ fontFamily: "var(--pixel)", fontSize: 15, color: INK, border: `2px solid ${INK}`, boxShadow: `2px 2px 0 ${RUST}`, padding: "0 7px", background: CREAM }}>/</kbd>
          )}
        </label>
        {!compact && <SortSwitch sort={sort} setSort={setSort} />}
        {mini && (
          <Chip on={!!tag} onClick={toTop}>
            {tag ? TAGS.find((t) => t.id === tag)!.label : "Фильтры"} ▴
          </Chip>
        )}
        </div>

        {/* теги и сортировка */}
        <div style={{ display: mini ? "none" : "flex", flexWrap: compact ? "nowrap" : "wrap", gap: 10, alignItems: "center", overflowX: compact ? "auto" : "visible", margin: compact ? "0 -12px" : 0, padding: compact ? "2px 12px 6px" : "0 0 4px" }} className="np-chips">
          <Chip on={!tag} onClick={() => setTag(null)}>Все</Chip>
          {TAGS.map((t) => (
            <Chip key={t.id} on={tag === t.id} onClick={() => setTag(tag === t.id ? null : t.id)}>
              {t.label}
            </Chip>
          ))}
        </div>
        {compact && !mini && <SortSwitch sort={sort} setSort={setSort} />}
      </div>
    </div>
  );
};

// переключатель на три положения: активный сегмент — тёмный, «вдавлен»
const SortSwitch: React.FC<{ sort: Sort; setSort: (s: Sort) => void }> = ({ sort, setSort }) => (
  <div role="radiogroup" aria-label="Сортировка" style={{ display: "flex", border: `3px solid ${INK}`, boxShadow: `3px 3px 0 ${RUST}`, background: CREAM }}>
    {SORTS.map((s, i) => (
      <button
        key={s.id}
        role="radio"
        aria-checked={sort === s.id}
        onClick={() => setSort(s.id)}
        className="np-seg"
        style={{
          all: "unset",
          flex: 1,
          textAlign: "center",
          fontFamily: "var(--golos)",
          fontWeight: 800,
          fontSize: 14,
          padding: "6px 12px",
          whiteSpace: "nowrap",
          color: sort === s.id ? CREAM : INK,
          background: sort === s.id ? INK : "transparent",
          borderLeft: i ? `3px solid ${INK}` : "none",
          transition: "background 160ms, color 160ms",
        }}
      >
        {s.label}
      </button>
    ))}
  </div>
);

// ничего не нашлось: пиксельный Юнит пожимает плечами и подсказывает
export const Empty: React.FC<{ q: string; onHint: (h: string) => void }> = ({ q, onHint }) => (
  <div style={{ background: CREAM, border: `5px solid ${INK}`, boxShadow: `8px 8px 0 ${RUST}`, padding: "22px 20px", display: "grid", gridTemplateColumns: "96px 1fr", gap: 18, alignItems: "center" }}>
    <div className="np-shrug" style={{ width: 96, height: 84, background: ORANGE, border: `4px solid ${INK}`, boxShadow: `4px 4px 0 ${RUST}`, position: "relative" }}>
      <div style={{ position: "absolute", left: 10, top: 10, right: 10, bottom: 14, background: "#0F1319" }}>
        {/* глаза в недоумении: один выше другого */}
        <span style={{ position: "absolute", left: 16, top: 16, width: 10, height: 14, background: "#FFF6EE" }} />
        <span style={{ position: "absolute", right: 16, top: 22, width: 10, height: 8, background: "#FFF6EE" }} />
        <span style={{ position: "absolute", left: 26, top: 38, width: 18, height: 4, background: "#7FC4FF" }} />
      </div>
      <span style={{ position: "absolute", left: 42, top: -14, width: 8, height: 10, background: "#3B3F49" }} />
      <span style={{ position: "absolute", left: 40, top: -22, width: 12, height: 10, background: "#FFAE73" }} />
    </div>
    <div>
      <div style={{ fontFamily: "var(--golos)", fontWeight: 800, fontSize: 19, color: INK }}>
        Юнит такого ещё не собирал{q ? <>: «{q}»</> : null}
      </div>
      <div style={{ fontFamily: "var(--golos)", fontWeight: 500, fontSize: 14, color: "#5A5249", margin: "4px 0 12px" }}>Попробуй другое слово или сбрось фильтр:</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {HINTS.map((h) => (
          <Chip key={h} on={false} onClick={() => onHint(h)}>
            {h}
          </Chip>
        ))}
      </div>
    </div>
  </div>
);
