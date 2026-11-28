"use client";
import { useState } from "react";
import { flushSync } from "react-dom";
import "./card-transition.css";

/**
 * Карточка → страница без библиотек: View Transitions API браузера.
 * Картинка и заголовок на карточке и на странице носят одно и то же view-transition-name —
 * браузер сам снимает «до» и «после» и перелетает между ними.
 * Шортс «Переход как в нативном приложении».
 */
export type Place = { id: string; title: string; sub: string; hue: number; text: string };

// смена состояния внутри startViewTransition; flushSync — чтобы React отрисовал «после» синхронно
const go = (update: () => void, animate = true) => {
  if (!animate || !document.startViewTransition) return update();
  document.startViewTransition(() => flushSync(update));
};

export function CardTransition({ places, labels, heading, animate = true }: { places: Place[]; labels: { back: string; book: string; nights: string }; heading?: string; animate?: boolean }) {
  const [open, setOpen] = useState<Place | null>(null);
  if (open)
    return (
      <div className="ct">
      <article className="ct-page">
        <button className="ct-back" aria-label={labels.back} onClick={() => go(() => setOpen(null), animate)}>
          ←
        </button>
        <Art p={open} big />
        <div className="ct-body">
          <h2 style={{ viewTransitionName: `title-${open.id}` }}>{open.title}</h2>
          <p className="ct-sub">{open.sub}</p>
          <p>{open.text}</p>
          <div className="ct-row">
            <span className="ct-chip">{labels.nights}</span>
            <button className="ct-book">{labels.book}</button>
          </div>
        </div>
      </article>
      </div>
    );
  return (
    <div className="ct">
    {heading && <h1 className="ct-h1">{heading}</h1>}
    <div className="ct-grid">
      {places.map((p) => (
        <button key={p.id} className="ct-card" data-id={p.id} onClick={() => go(() => setOpen(p), animate)}>
          <Art p={p} />
          <b style={{ viewTransitionName: `title-${p.id}` }}>{p.title}</b>
          <span>{p.sub}</span>
        </button>
      ))}
    </div>
    </div>
  );
}

/** Картинка места — пейзаж из градиентов: небо, солнце, две гряды гор. */
function Art({ p, big }: { p: Place; big?: boolean }) {
  const h = p.hue;
  return (
    <div className={`ct-art ${big ? "big" : ""}`} style={{ viewTransitionName: `art-${p.id}` }}>
      <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={`sky-${p.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={`hsl(${h} 70% 62%)`} />
            <stop offset="1" stopColor={`hsl(${h + 40} 85% 82%)`} />
          </linearGradient>
        </defs>
        <rect width="200" height="140" fill={`url(#sky-${p.id})`} />
        <circle cx="140" cy="52" r="20" fill={`hsl(${h + 60} 100% 92%)`} />
        <path d="M0 96 L40 60 L70 84 L110 44 L150 82 L200 58 V140 H0Z" fill={`hsl(${h - 10} 35% 38%)`} />
        <path d="M0 116 L50 90 L90 108 L140 84 L200 106 V140 H0Z" fill={`hsl(${h - 20} 40% 22%)`} />
      </svg>
    </div>
  );
}
