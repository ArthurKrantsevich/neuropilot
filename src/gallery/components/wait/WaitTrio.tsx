"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import "./wait.css";

export type WaitText = {
  kinds: [string, string, string]; // пустой, кружок, скелетон
  loading: string;
  ask: string; // где ждали дольше?
  pick: string; // подпись группы кнопок
  right: string; // угадал
  wrong: string; // не угадал
  run: string;
  sec: (s: string) => string;
  dec: string;
  note: string;
  card: [string, string]; // заголовок и строка карточки в ленте
};

const LOAD = 2.4; // все три экрана грузятся одинаково
const FELT = [2.29, 2.41, 2.82]; // Viget 2017: пустой, спиннер, скелетон — сколько казалось, с

/** Из шортса «Серый скелетон»: три экрана грузятся одинаково, зритель угадывает, где ждать дольше. */
export function WaitTrio({ t }: { t: WaitText }) {
  const [time, setTime] = useState(0);
  const [guess, setGuess] = useState<number | null>(null);
  const raf = useRef(0);

  const run = useCallback(() => {
    cancelAnimationFrame(raf.current);
    setTime(0);
    setGuess(null);
    let t0 = 0;
    const tick = (now: number) => {
      t0 ||= now;
      const s = Math.min(LOAD, (now - t0) / 1000);
      setTime(s);
      if (s < LOAD) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = still ? 0 : window.setTimeout(run, 400);
    return () => {
      clearTimeout(id);
      cancelAnimationFrame(raf.current);
    };
  }, [run]);

  const done = time >= LOAD;
  const fmt = (n: number) => n.toFixed(2).replace(".", t.dec);
  const feed = (bones: boolean) => (
    <div className="wt-feed">
      {[0, 1].map((r) => (
        <div key={r} className="wt-item">
          <i className={`wt-img ${bones ? "wt-bone" : ""}`} />
          {bones ? (
            <div>
              <i className="wt-bone" style={{ width: "80%" }} />
              <i className="wt-bone" style={{ width: "55%" }} />
            </div>
          ) : (
            <div>
              <b>{t.card[0]}</b>
              <span>{t.card[1]}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
  return (
    <div className="wt">
      <div className="wt-screens">
        {t.kinds.map((k, i) => (
          <div key={k} className={`wt-col ${guess !== null && i === 2 ? "wt-hot" : ""}`}>
            <div className="wt-phone" aria-label={done ? k : `${k}: ${t.loading}`}>
              {done ? feed(false) : i === 1 ? <span className="wt-spin" /> : i === 2 ? feed(true) : null}
            </div>
            <span className="wt-name">{k}</span>
            {guess !== null && (
              <span className="wt-felt">
                <i style={{ transform: `scaleX(${FELT[i] / FELT[2]})` }} />
                <b>{t.sec(fmt(FELT[i]))}</b>
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="wt-q" aria-live="polite">
        {guess === null ? t.ask : guess === 2 ? t.right : t.wrong}
      </p>
      {guess === null ? (
        <div className="wt-ctl" role="group" aria-label={t.pick}>
          {t.kinds.map((k, i) => (
            <button key={k} className="wt-btn" disabled={!done} onClick={() => setGuess(i)}>
              {k}
            </button>
          ))}
        </div>
      ) : (
        <div className="wt-ctl">
          <button className="wt-btn" onClick={run}>{t.run}</button>
        </div>
      )}
      <p className="wt-note">{t.note}</p>
    </div>
  );
}
