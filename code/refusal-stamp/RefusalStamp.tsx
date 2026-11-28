"use client";
import { useMemo, useState, type CSSProperties } from "react";
import "./refusal-stamp.css";

export type RefusalText = {
  from: string; // «От: Юнит»
  to: string; // «Кому: Claude»
  ask: string; // «Как убить процесс?»
  stamp: string; // «НЕ МОГУ ПОМОЧЬ»
  gently: string; // «мягко: SIGTERM»
  frozen: string; // «если завис»
  version: string; // подпись переключателя для экранных дикторов
  grid: string; // «100 безобидных вопросов»
  stamped: (n: number) => string; // «100 со штампом»
  less: string; // «лишних блоков»
  cyber: string; // «в кибербезопасности — −60 %»
  note: string;
  source: string; // «по данным Anthropic, 9.11.2026»
};

type V = "5.1" | "5.2";
const VERSIONS: V[] = ["5.1", "5.2"];
const CELLS = 100;
const FREED = 55;

/** Детерминированный набор: 55 из 100 конвертов теряют штамп всегда одни и те же (mulberry32 + тасование). */
function freedSet(seed: number) {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const idx = Array.from({ length: CELLS }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  // порядок в тасовке = порядок снятия штампов (задержка волной)
  const order = new Map<number, number>();
  idx.slice(0, FREED).forEach((cell, k) => order.set(cell, k));
  return order;
}

/** Из шортса про Fable 5.2: штамп «не могу помочь» на безобидном вопросе трескается — и приходит ответ. */
export function RefusalStamp({ t }: { t: RefusalText }) {
  const [v, setV] = useState<V>("5.1");
  const freed = useMemo(() => freedSet(4127), []);
  const open = v === "5.2";
  return (
    <div className="rs">
      <div className="rs-seg" role="group" aria-label={t.version}>
        {VERSIONS.map((x) => (
          <button key={x} className="rs-seg-btn" aria-pressed={v === x} onClick={() => setV(x)}>
            Fable {x}
          </button>
        ))}
      </div>

      <div className="rs-env">
        <i className="rs-flap" aria-hidden />
        <div className="rs-head">
          <span>{t.from}</span>
          <span>{t.to}</span>
        </div>
        <p className="rs-ask">{t.ask}</p>
        <div className="rs-body" aria-live="polite">
          {open ? (
            <>
              <span className="rs-stamp rs-half rs-l" aria-hidden>{t.stamp}</span>
              <span className="rs-stamp rs-half rs-r" aria-hidden>{t.stamp}</span>
              <div className="rs-term">
                <p>
                  <b>$ kill 4127</b> <span># {t.gently}</span>
                </p>
                <p>
                  <b>$ kill -9 4127</b> <span># {t.frozen}</span>
                </p>
              </div>
            </>
          ) : (
            <span key="whole" className="rs-stamp rs-slam" role="img" aria-label={t.stamp}>
              {t.stamp}
            </span>
          )}
        </div>
      </div>

      <div className="rs-stats">
        <div className="rs-count" aria-live="polite">
          <b>{open ? "−55\u00a0%" : "100"}</b>
          <span>{open ? t.less : t.stamped(CELLS)}</span>
        </div>
        <p className="rs-grid-cap">{t.grid}</p>
        <div className={`rs-grid${open ? " is-open" : ""}`} aria-hidden>
          {Array.from({ length: CELLS }, (_, i) => {
            const k = freed.get(i);
            return (
              <i
                key={i}
                className={k === undefined ? "rs-cell" : "rs-cell rs-free"}
                style={k === undefined ? undefined : ({ "--d": `${k * 14}ms` } as CSSProperties)}
              />
            );
          })}
        </div>
        {open && <p className="rs-cyber">{t.cyber}</p>}
      </div>

      <p className="rs-note">{t.note}</p>
      <p className="rs-src">{t.source}</p>
    </div>
  );
}
