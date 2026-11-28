"use client";
import { useEffect, useRef, useState } from "react";
import "./gif-video.css";

export type GifText = {
  colors: (n: number) => string; // «256 цветов»
  slider: string; // подпись ползунка
  smooth: string; // «без палитры — как в видео»
  gif: string; // «палитра GIF»
  weight: string; // «Вес одного ролика (пример web.dev)»
  code: string; // «Вместо гифки на сайте»
  copy: string;
  copied: string;
  note: string;
};

const SNIPPET = '<video autoplay loop muted playsinline src="cat.mp4"></video>';
const W = 360;
const H = 70;

/** Градиент из шортса: та же картинка в палитре из N цветов (GIF — максимум 256) и без палитры. */
function paint(cv: HTMLCanvasElement, colors: number | null) {
  const g = cv.getContext("2d");
  if (!g) return;
  const grad = g.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "#2b2a6b");
  grad.addColorStop(0.5, "#d9468f");
  grad.addColorStop(1, "#ffb54a");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  if (!colors) return;
  // равномерная палитра: на канал — кубический корень из N уровней (упрощённая таблица цветов GIF)
  const lv = Math.max(2, Math.round(Math.cbrt(colors)));
  const step = 255 / (lv - 1);
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round(d[i] / step) * step;
    d[i + 1] = Math.round(d[i + 1] / step) * step;
    d[i + 2] = Math.round(d[i + 2] / step) * step;
  }
  g.putImageData(img, 0, 0);
}

const SIZES = [
  ["GIF", 3700, "3,7 MB", "gv-gif"],
  ["MP4", 551, "551 KB", "gv-mp4"],
  ["WebM", 341, "341 KB", "gv-webm"],
] as const;

/** Из шортса «ChatGPT делает GIF»: палитра GIF рябит на градиенте, а на сайте видео в разы легче. */
export function GifVsVideo({ t }: { t: GifText }) {
  const [n, setN] = useState(64);
  const [ok, setOk] = useState(false);
  const a = useRef<HTMLCanvasElement>(null);
  const b = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (a.current) paint(a.current, null); }, []);
  useEffect(() => { if (b.current) paint(b.current, n); }, [n]);
  const lv = Math.max(2, Math.round(Math.cbrt(n)));
  const shown = Math.min(lv ** 3, 256);
  const copy = () =>
    navigator.clipboard?.writeText(SNIPPET).then(() => {
      setOk(true);
      setTimeout(() => setOk(false), 1600);
    });
  return (
    <div className="gv">
      <figure className="gv-strip">
        <canvas ref={a} width={W} height={H} />
        <figcaption>{t.smooth}</figcaption>
      </figure>
      <figure className="gv-strip">
        <canvas ref={b} width={W} height={H} />
        <figcaption>
          {t.gif} · {t.colors(shown)}
        </figcaption>
      </figure>
      <label className="gv-range">
        <span>{t.slider}</span>
        <input type="range" min={8} max={256} step={1} value={n} onChange={(e) => setN(+e.target.value)} />
      </label>
      <div className="gv-weight">
        <b>{t.weight}</b>
        {SIZES.map(([k, v, s, c]) => (
          <div key={k} className="gv-row">
            <span>{k}</span>
            <i className={c} style={{ transform: `scaleX(${v / 3700})` }} />
            <em>{s}</em>
          </div>
        ))}
      </div>
      <div className="gv-code">
        <b>{t.code}</b>
        <code>{SNIPPET}</code>
        <button className="gv-btn" onClick={copy}>
          {ok ? t.copied : t.copy}
        </button>
      </div>
      <p className="gv-note">{t.note}</p>
    </div>
  );
}
