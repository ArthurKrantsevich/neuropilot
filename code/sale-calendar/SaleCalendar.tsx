"use client";
import { useEffect, useState } from "react";
import "./sale-calendar.css";

export type ScText = {
  title: string; // «Дней до зимней распродажи Steam»
  running: string; // «идёт»
  over: string; // «закончилась»
  days: (n: number) => string; // «20 дней»
  when: string; // «17 декабря 2026, 10:00 PT (18:00 UTC) — 4 января 2027»
  timeline: string;
  today: string;
  events: { id: string; name: string; dates: string; note?: string }[];
  ruleTitle: string;
  ruleOff: string; ruleOn: string;
  seasonal: string; // подпись переключателя
  verdictOff: string; verdictOn: string;
  gap: (n: number) => string; // «27 ноября → 17 декабря: 20 дней»
  quote: string; quoteSrc: string;
  local: string;
};

const WINTER_START = Date.parse("2026-12-17T18:00:00Z"); // 10:00 PT
const WINTER_END = Date.parse("2027-01-04T18:00:00Z"); // 10:00 PT
const DAY = 86400000;
// даты ленты 2026 (UTC, начало дня), для вставки маркера «сегодня»
const STARTS: Record<string, number> = {
  autumn: Date.parse("2026-10-01T00:00:00Z"),
  bf: Date.parse("2026-11-26T00:00:00Z"),
  winter: WINTER_START,
};
const SALE_DATE = Date.parse("2026-11-27T00:00:00Z");
const GAP_DAYS = Math.round((WINTER_START - SALE_DATE) / DAY); // 20

/** Из шортса r60: скидки ставят издатели; между скидками на игру 30 дней, сезонные распродажи — исключение. */
export function SaleCalendar({ t }: { t: ScText }) {
  const [now, setNow] = useState<number | null>(null);
  const [seasonal, setSeasonal] = useState(false);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  let big = "…";
  if (now !== null) {
    if (now >= WINTER_END) big = t.over;
    else if (now >= WINTER_START) big = t.running;
    else big = t.days(Math.ceil((WINTER_START - now) / DAY));
  }
  const rows: { key: string; node: React.ReactNode }[] = t.events.map((e) => ({
    key: e.id,
    node: (
      <li key={e.id} className="sc-ev">
        <b>{e.name}</b>
        <span>{e.dates}</span>
        {e.note && <em>{e.note}</em>}
      </li>
    ),
  }));
  let list = rows.map((r) => r.node);
  if (now !== null) {
    const idx = t.events.findIndex((e) => STARTS[e.id] > now);
    const mark = <li key="today" className="sc-today">{t.today}</li>;
    const pos = idx === -1 ? list.length : idx;
    list = [...list.slice(0, pos), mark, ...list.slice(pos)];
  }

  return (
    <div className="sc">
      <div className="sc-card">
        <p className="sc-title">{t.title}</p>
        <p className="sc-big" aria-live="polite">{big}</p>
        <p className="sc-when">{t.when}</p>
      </div>

      <div className="sc-card">
        <p className="sc-title">{t.timeline}</p>
        <ul className="sc-list">{list}</ul>
      </div>

      <div className="sc-card">
        <p className="sc-title">{t.ruleTitle}</p>
        <p className="sc-rule">{seasonal ? t.ruleOn : t.ruleOff}</p>
        <button type="button" className="sc-switch" role="switch" aria-checked={seasonal} onClick={() => setSeasonal((s) => !s)}>
          <span className="sc-knob" aria-hidden="true" />
          {t.seasonal}
        </button>
        <p className="sc-gap">{t.gap(GAP_DAYS)}</p>
        <p className={`sc-verdict ${seasonal ? "is-ok" : "is-no"}`}>{seasonal ? t.verdictOn : t.verdictOff}</p>
      </div>

      <blockquote className="sc-quote">
        <p>«{t.quote}»</p>
        <cite>{t.quoteSrc}</cite>
      </blockquote>
      <p className="sc-src">{t.local}</p>
    </div>
  );
}
