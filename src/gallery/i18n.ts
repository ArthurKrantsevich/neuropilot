import { useEffect, useState } from "react";

/** Два языка: по умолчанию — язык браузера, выбор запоминается, ?lang=en задаёт явно. */
export type Lang = "ru" | "en";
const KEY = "neuropilot-components-lang";

const initial = (): Lang => {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "ru" || q === "en") return q;
  try {
    const s = localStorage.getItem(KEY);
    if (s === "ru" || s === "en") return s;
  } catch {
    /* хранилище недоступно */
  }
  return navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
};

export function useLang() {
  const [lang, setLang] = useState<Lang>(initial);
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* не запомнили — не страшно */
    }
  }, [lang]);
  return [lang, setLang] as const;
}

export const locale = (l: Lang) => (l === "ru" ? "ru-RU" : "en-US");
export const weekStart = (l: Lang): 0 | 1 => (l === "ru" ? 1 : 0);

export const T = {
  ru: {
    title: "Выбор диапазона дат",
    lead: "Два месяца, подсветка при наведении, плавное перелистывание. React, без библиотек.",
    checkIn: "Заезд",
    checkOut: "Выезд",
    pick: "Выберите дату",
    prev: "Предыдущий месяц",
    next: "Следующий месяц",
    presets: ["Сегодня", "7 дней", "30 дней", "Этот месяц", "Прошлый месяц"],
    clear: "Сбросить",
    apply: "Применить",
    hintStart: "Выберите дату заезда",
    hintEnd: "Теперь — дату выезда",
    nights: (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? "ночь" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "ночи" : "ночей"}`,
    applied: "Даты сохранены",
    code: "Код на GitHub",
  },
  en: {
    title: "Date range picker",
    lead: "Two months, hover preview, smooth paging. React, no libraries.",
    checkIn: "Check-in",
    checkOut: "Check-out",
    pick: "Add date",
    prev: "Previous month",
    next: "Next month",
    presets: ["Today", "7 days", "30 days", "This month", "Last month"],
    clear: "Clear",
    apply: "Apply",
    hintStart: "Pick a check-in date",
    hintEnd: "Now pick check-out",
    nights: (n: number) => `${n} night${n === 1 ? "" : "s"}`,
    applied: "Dates saved",
    code: "Code on GitHub",
  },
};
