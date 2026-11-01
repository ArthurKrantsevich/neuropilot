// Когда выходит ролик с компонентом. До этого карточка заперта: «Юнит ещё собирает виджет» и таймер.
// Правило: при каждой заливке Shorts с компонентом — добавить строку (время UTC, как в upload_short.sh) и выложить сайт.
// После выхода карточка открывается сама, пересборка не нужна.
export const RELEASES: Record<string, { at: string; video: string }> = {
  "peek-login": { at: "2026-11-01T09:00:00Z", video: "NPKJsUW097w" }, // r26 · 1.11 12:00 МСК
  "rolling-like": { at: "2026-11-03T15:00:00Z", video: "pxRkWkUBKMs" }, // r27 · перенесён на 3.11 18:00 МСК (переделка по психологии; id обновить после новой загрузки)
  "link-eras": { at: "2026-11-02T09:00:00Z", video: "CVxceZ0Be0w" }, // r28 · 2.11 12:00 МСК
  "hamburger-eras": { at: "2026-11-02T15:00:00Z", video: "SmLj7brl5GY" }, // r29 · 2.11 18:00 МСК
};

export const releaseAt = (id: string) => (RELEASES[id] ? Date.parse(RELEASES[id].at) : 0);
