// Когда выходит ролик с компонентом. До этого карточка заперта: «Юнит ещё собирает виджет» и таймер.
// Правило: при каждой заливке Shorts с компонентом — добавить строку (время UTC, как в upload_short.sh) и выложить сайт.
// После выхода карточка открывается сама, пересборка не нужна.
export const RELEASES: Record<string, { at: string; video: string }> = {
  "peek-login": { at: "2026-11-01T09:00:00Z", video: "NPKJsUW097w" }, // r26 · 1.11 12:00 МСК
  "rolling-like": { at: "2026-11-03T15:00:00Z", video: "_lVmxqEXWZg" }, // r27 · 3.11 18:00 МСК (переделан по психологии 01.11)
  "link-eras": { at: "2026-11-02T09:00:00Z", video: "dumVfOpeEfw" }, // r28 · 2.11 12:00 МСК
  "hamburger-eras": { at: "2026-11-02T15:00:00Z", video: "Hv4BGCTQzVA" }, // r29 · 2.11 18:00 МСК
  "ua-mask": { at: "2026-11-03T15:00:00Z", video: "ze_LI9QuRjY" }, // r35 · 3.11 18:00 МСК
  progress: { at: "2026-11-05T09:00:00Z", video: "" }, // r34 · 5.11 12:00 МСК (id ролика вписать после загрузки)
};

export const releaseAt = (id: string) => (RELEASES[id] ? Date.parse(RELEASES[id].at) : 0);
