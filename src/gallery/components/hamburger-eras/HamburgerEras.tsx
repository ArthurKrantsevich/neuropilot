"use client";
import { useState } from "react";
import "./hamburger-eras.css";

export type HamburgerText = {
  width: string;
  phone: string;
  desktop: string;
  menu: string;
  close: string;
  nav: string[];
  facts: { year: string; text: string }[];
};

/** Одна страница: уже 600 px — меню прячется за три полоски, шире — показано целиком (container query, без JS). */
export function HamburgerEras({ t }: { t: HamburgerText }) {
  const [w, setW] = useState(360);
  const [open, setOpen] = useState(false);
  return (
    <div className="hb">
      <label className="hb-range">
        <span>
          {t.width}: <b>{w}px</b> · {w < 600 ? t.phone : t.desktop}
        </span>
        <input type="range" min={280} max={820} step={10} value={w} onChange={(e) => setW(+e.target.value)} />
      </label>
      <div className="hb-stage">
        <div className="hb-page" style={{ width: w }}>
          <header className="hb-head">
            <button className="hb-burger" aria-label={t.menu} aria-expanded={open} onClick={() => setOpen(!open)}>
              <i />
              <i />
              <i />
            </button>
            <nav className="hb-nav">
              {t.nav.map((s) => (
                <a key={s} href="#hamburger-eras">{s}</a>
              ))}
            </nav>
          </header>
          {open && (
            <nav className="hb-drawer">
              {t.nav.map((s) => (
                <a key={s} href="#hamburger-eras" onClick={() => setOpen(false)}>{s}</a>
              ))}
              <button onClick={() => setOpen(false)}>{t.close}</button>
            </nav>
          )}
          <div className="hb-lines">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
      <ul className="hb-facts">
        {t.facts.map((f) => (
          <li key={f.year}>
            <b>{f.year}</b> {f.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
