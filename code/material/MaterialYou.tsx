import { useMemo, type CSSProperties } from "react";
import { argbFromHex, Contrast, hexFromArgb, Hct, themeFromSourceColor } from "@material/material-color-utilities";
import "./material-you.css";

/**
 * Material You: один цвет (с обоев) → вся палитра интерфейса.
 * themeFromSourceColor от Google строит 6 тональных палитр в цветовом пространстве HCT
 * и раздаёт из них 29 цветовых ролей: primary, onPrimary, surface, primaryContainer…
 * Каждую роль кладём в CSS-переменную --md-<роль>, а интерфейс красится только переменными.
 * Шортс «Почему все приложения Google похожи».
 */
export type Roles = Record<string, string>;

/** 29 ролей светлой схемы из одного цвета. */
export function rolesFromSeed(seed: string, dark = false): Roles {
  const scheme = themeFromSourceColor(argbFromHex(seed)).schemes[dark ? "dark" : "light"].toJSON() as Record<string, number>;
  return Object.fromEntries(Object.entries(scheme).map(([k, v]) => [k, hexFromArgb(v)]));
}

/** Контраст двух цветов по WCAG (через тон HCT = L* — так же считает сама Material). */
export const contrast = (a: string, b: string) =>
  Contrast.ratioOfTones(Hct.fromInt(argbFromHex(a)).tone, Hct.fromInt(argbFromHex(b)).tone);

/** Роли → CSS-переменные: --md-primary, --md-on-primary… */
export function cssVars(roles: Roles): CSSProperties {
  return Object.fromEntries(Object.entries(roles).map(([k, v]) => ["--md-" + k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()), v])) as CSSProperties;
}

// иконки нижней навигации: дом, нота, стопка
const NAV_ICONS = [
  <svg key="h" viewBox="0 0 24 24" width="22" height="22"><path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z" fill="currentColor" /></svg>,
  <svg key="p" viewBox="0 0 24 24" width="22" height="22"><path d="M9 18a3 3 0 1 1-2-2.8V5l11-2v12a3 3 0 1 1-2-2.8V7.4l-7 1.3z" fill="currentColor" /></svg>,
  <svg key="l" viewBox="0 0 24 24" width="22" height="22"><path d="M4 6h12v2H4zm0 5h12v2H4zm0 5h8v2H4zm14-4v8l5-4z" fill="currentColor" /></svg>,
];

export type PlayerText = { app: string; title: string; artist: string; chips: string[]; nav: string[] };

/** Экран-пример: плеер, раскрашенный только ролями Material. */
export function MaterialPlayer({ seed, text, wallpaper }: { seed: string; text: PlayerText; wallpaper?: string }) {
  const roles = useMemo(() => rolesFromSeed(seed), [seed]);
  return (
    <div className="my-screen" style={cssVars(roles)}>
      <header className="my-bar">
        <span className="my-icon">≡</span>
        <b>{text.app}</b>
        <span className="my-avatar" />
      </header>
      {/* обложка альбома = обои: с них и взят цвет-семя */}
      <div className="my-art" style={wallpaper ? { backgroundImage: `url("${wallpaper}")` } : undefined}>
        {!wallpaper && <span className="my-disc" />}
      </div>
      <div className="my-track">
        <b>{text.title}</b>
        <span>{text.artist}</span>
      </div>
      <div className="my-progress"><i /></div>
      <div className="my-controls">
        <span className="my-ghost">⏮</span>
        <span className="my-fab">⏸</span>
        <span className="my-ghost">⏭</span>
      </div>
      <div className="my-chips">
        {text.chips.map((c, i) => <span key={c} className={i === 0 ? "on" : ""}>{c}</span>)}
      </div>
      <nav className="my-nav">
        {text.nav.map((n, i) => <span key={n} className={i === 1 ? "on" : ""}><i>{NAV_ICONS[i]}</i>{n}</span>)}
      </nav>
    </div>
  );
}
