"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import "./range-picker.css";
import { addDays, addMonths, before, daysBetween, monthEnd, monthGrid, monthStart, same, type D } from "./dates";
import { T, locale, weekStart, type Lang } from "../../i18n";

export type Range = { start: D | null; end: D | null };

/** Выбор диапазона: два месяца рядом, лента месяцев листается целиком, диапазон подсвечивается при наведении. */
export function RangePicker({ lang, today, value, onChange, onApply }: { lang: Lang; today: D; value: Range; onChange: (r: Range) => void; onApply?: (r: Range) => void }) {
  const t = T[lang];
  const ws = weekStart(lang);
  const [view, setView] = useState<D>(() => monthStart(value.start ?? today));
  const [shift, setShift] = useState(0); // −1 / +1 во время перелистывания
  const [instant, setInstant] = useState(false);
  const [hover, setHover] = useState<D | null>(null);
  const [pop, setPop] = useState(0); // для «пружинки» у выбранной даты
  const track = useRef<HTMLDivElement>(null);
  const [one, setOne] = useState(() => matchMedia("(max-width: 760px)").matches);
  useEffect(() => {
    const m = matchMedia("(max-width: 760px)");
    const on = () => setOne(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);

  const go = (dir: -1 | 1) => {
    if (shift) return;
    setInstant(false);
    setShift(dir);
  };
  // в конце анимации переставляем ленту без перехода: месяц сменился, лента снова в покое
  const settle = () => {
    if (!shift) return;
    setInstant(true);
    setView((v) => addMonths(v, shift));
    setShift(0);
  };

  const pick = (d: D) => {
    setPop((p) => p + 1);
    const { start, end } = value;
    if (!start || end) onChange({ start: d, end: null });
    else if (before(d, start)) onChange({ start: d, end: null });
    else onChange({ start, end: d });
  };

  // пресеты: диапазон и сразу показываем нужный месяц
  const presets: (() => Range)[] = [
    () => ({ start: today, end: today }),
    () => ({ start: addDays(today, -6), end: today }),
    () => ({ start: addDays(today, -29), end: today }),
    () => ({ start: monthStart(today), end: monthEnd(today) }),
    () => ({ start: monthStart(addMonths(today, -1)), end: monthEnd(addMonths(today, -1)) }),
  ];
  const applyPreset = (i: number) => {
    const r = presets[i]();
    onChange(r);
    setPop((p) => p + 1);
    const target = monthStart(one ? r.end! : r.start!);
    const diff = (target.getFullYear() - view.getFullYear()) * 12 + target.getMonth() - view.getMonth();
    // соседний месяц — листаем анимацией, дальний — переходим сразу
    if (diff === 1 || diff === -1) go(diff as -1 | 1);
    else if (diff !== 0) {
      setInstant(true);
      setView(target);
    }
  };
  const activePreset = presets.findIndex((p) => {
    const r = p();
    return same(r.start, value.start) && same(r.end, value.end);
  });

  const months = useMemo(() => [-1, 0, 1, 2].map((i) => addMonths(view, i)), [view]);
  const fmtMonth = new Intl.DateTimeFormat(locale(lang), { month: "long", year: "numeric" });
  const fmtDay = new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "short" });
  const fmtFull = new Intl.DateTimeFormat(locale(lang), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale(lang), { weekday: "short" }).format(new Date(2024, 0, 7 + ((i + ws) % 7))));

  const lo = value.start;
  const hi = value.end ?? (value.start && hover && !before(hover, value.start) ? hover : null);
  const preview = !value.end && !!hi;
  const inside = (d: D) => !!lo && !!hi && !before(d, lo) && !before(hi, d);

  const summary = value.start && value.end
    ? `${fmtDay.format(value.start)} — ${fmtDay.format(value.end)} · ${t.nights(daysBetween(value.start, value.end))}`
    : value.start ? t.hintEnd : t.hintStart;

  return (
    <div className="picker" data-one={one ? "" : undefined}>
      <aside className="presets" role="group" aria-label="Presets">
        {t.presets.map((p, i) => (
          <button key={p} id={`preset-${i}`} className={i === activePreset ? "on" : ""} onClick={() => applyPreset(i)}>
            {p}
          </button>
        ))}
      </aside>
      <div className="cal">
        <div className="cal-head">
          <button id="prev" className="nav" aria-label={t.prev} onClick={() => go(-1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <div className="titles">
            {[0, 1].slice(0, one ? 1 : 2).map((i) => (
              <div key={i} className="title-win">
                <div className="title-track" style={{ transform: `translateY(${-(1 + shift) * 26}px)`, transition: instant ? "none" : undefined }}>
                  {[-1, 0, 1].map((k) => (
                    <span key={k}>{fmtMonth.format(addMonths(view, i + k))}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button id="next" className="nav" aria-label={t.next} onClick={() => go(1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <div className="months-win">
          <div ref={track} className="months" onTransitionEnd={(e) => e.target === track.current && settle()} style={{ transform: `translateX(calc(${-(1 + shift)} * (var(--mw) + var(--gap))))`, transition: instant ? "none" : undefined }}>
            {months.map((m) => (
              <div key={m.toISOString()} className="month" aria-label={fmtMonth.format(m)}>
                <div className="wd">{weekdays.map((w, i) => <span key={i}>{w}</span>)}</div>
                {monthGrid(m, ws).map((week, wi) => (
                  <div key={wi} className="week">
                    {week.map((d, di) => {
                      if (!d) return <span key={di} className="cell empty" />;
                      const isS = same(d, lo), isE = same(d, hi);
                      const on = inside(d);
                      const rowL = di === 0 || d.getDate() === 1;
                      const rowR = di === 6 || d.getDate() === monthEnd(d).getDate();
                      const cls = ["cell", on && "in", isS && "start", isE && "end", preview && on && "preview", rowL && "row-l", rowR && "row-r", same(d, today) && "today", (d.getDay() === 0 || d.getDay() === 6) && "wkend"].filter(Boolean).join(" ");
                      return (
                        <span key={di} className={cls}>
                          <button
                            data-day={`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`}
                            aria-label={fmtFull.format(d)}
                            aria-pressed={isS || isE}
                            onClick={() => pick(d)}
                            onMouseEnter={() => setHover(d)}
                            onMouseLeave={() => setHover(null)}
                          >
                            <i key={isS || isE ? pop : undefined}>{d.getDate()}</i>
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="cal-foot">
          <span className="summary" aria-live="polite">{summary}</span>
          <div className="foot-btns">
            <button id="clear" className="ghost" onClick={() => onChange({ start: null, end: null })}>{t.clear}</button>
            <button id="apply" className="primary" disabled={!value.start || !value.end} onClick={() => onApply?.(value)}>{t.apply}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
