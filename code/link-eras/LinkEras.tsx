"use client";
import { useState } from "react";
import "./link-eras.css";

export type LinkErasText = {
  title: string;
  read: string;
  link: string;
  after: string;
  reset: string;
  notes: Record<EraId, string>;
};

export type EraId = "1990" | "1993" | "1994" | "1995" | "today";

/** Одна ссылка в пяти браузерах: фон, шрифт и цвета ссылки — как в каждой эпохе. Клик делает ссылку посещённой. */
const ERAS: { id: EraId; app: string }[] = [
  { id: "1990", app: "WorldWideWeb" },
  { id: "1993", app: "NCSA Mosaic 0.13" },
  { id: "1994", app: "Netscape Navigator" },
  { id: "1995", app: "Internet Explorer" },
  { id: "today", app: "Browser" },
];

export function LinkEras({ t, start = "1990" }: { t: LinkErasText; start?: EraId }) {
  const [era, setEra] = useState<EraId>(start);
  const [visited, setVisited] = useState(false);
  const app = ERAS.find((e) => e.id === era)!.app;
  return (
    <div className="le">
      <div className="le-years" role="tablist">
        {ERAS.map((e) => (
          <button
            key={e.id}
            role="tab"
            aria-selected={e.id === era}
            className={e.id === era ? "on" : ""}
            onClick={() => setEra(e.id)}
          >
            {e.id === "today" ? new Date().getFullYear() : e.id}
          </button>
        ))}
      </div>
      <div className={`le-win le-${era}`}>
        <div className="le-bar">{app}</div>
        <div className="le-page">
          <h3>{t.title}</h3>
          <p>
            {t.read}{" "}
            <a
              href="#"
              className={visited ? "le-visited" : ""}
              onClick={(ev) => {
                ev.preventDefault();
                setVisited(true);
              }}
            >
              {t.link}
            </a>
            {t.after}
          </p>
        </div>
      </div>
      <p className="le-note">{t.notes[era]}</p>
      {visited && (
        <button className="le-reset" onClick={() => setVisited(false)}>
          {t.reset}
        </button>
      )}
    </div>
  );
}
