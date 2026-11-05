// Поиск, теги и сортировка карточек. Данные о роликах — stats.json (pipeline/site_stats.py перед выкладкой).
import stats from "./stats.json";
import { releaseAt } from "./releases";

export type Tag = "styles" | "motion" | "forms" | "layout" | "history";
export type Sort = "new" | "popular" | "soon";

export const TAGS: { id: Tag; label: string }[] = [
  { id: "styles", label: "Стили" },
  { id: "motion", label: "Анимации" },
  { id: "forms", label: "Формы и кнопки" },
  { id: "layout", label: "Раскладка" },
  { id: "history", label: "История веба" },
];
export const SORTS: { id: Sort; label: string }[] = [
  { id: "new", label: "Новые" },
  { id: "popular", label: "Популярные" },
  { id: "soon", label: "Скоро" },
];

// новый компонент — одна строка здесь (1–2 тега)
export const CARD_TAGS: Record<string, Tag[]> = {
  progress: ["motion", "forms"],
  "hamburger-eras": ["history", "layout"],
  "link-eras": ["history"],
  "ua-mask": ["history"],
  "rolling-like": ["motion", "forms"],
  "peek-login": ["forms", "motion"],
  reactions: ["motion"],
  eras: ["styles", "history"],
  clay: ["styles"],
  brutal: ["styles"],
  neu: ["styles"],
  bento: ["layout"],
  material: ["styles"],
  card: ["motion", "layout"],
  island: ["motion"],
  "range-picker": ["forms"],
  magnetic: ["motion", "forms"],
  tilt: ["motion"],
  password: ["forms"],
  toggle: ["forms", "motion"],
  runaway: ["forms"],
};

const S = stats as Record<string, { views: number; at: string }>;
export const views = (id: string) => S[id]?.views ?? 0;
const dateOf = (id: string) => releaseAt(id) || (S[id] ? Date.parse(S[id].at) : 0);

// ё = е, регистр не важен
export const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е");
// слова запроса без окончания: «тень» найдёт «тени» и «тенью», «кнопка» — «кнопки»
export const stems = (q: string) =>
  norm(q)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length >= 4 ? w.replace(/[аяоеиыуюьй]$/, "") : w));

export type Searchable = { id: string; title: string; about: string };

export function apply<T extends Searchable>(items: T[], q: string, tag: Tag | null, sort: Sort, now: number): T[] {
  const words = stems(q);
  const label = (id: string) => (CARD_TAGS[id] ?? []).map((t) => TAGS.find((x) => x.id === t)!.label).join(" ");
  const hit = items.filter((it) => {
    if (tag && !(CARD_TAGS[it.id] ?? []).includes(tag)) return false;
    const text = norm(`${it.title} ${it.about} ${label(it.id)} ${it.id}`);
    return words.every((w) => text.includes(w));
  });
  const locked = (id: string) => releaseAt(id) > now;
  return [...hit].sort((a, b) => {
    if (sort === "popular") return views(b.id) - views(a.id) || dateOf(b.id) - dateOf(a.id);
    if (sort === "soon") {
      // сначала запертые — ближайший выход первым, дальше остальные от новых к старым
      const la = locked(a.id), lb = locked(b.id);
      if (la !== lb) return la ? -1 : 1;
      return la ? dateOf(a.id) - dateOf(b.id) : dateOf(b.id) - dateOf(a.id);
    }
    return dateOf(b.id) - dateOf(a.id);
  });
}

// подсказки, когда ничего не нашлось
export const HINTS = ["тень", "анимация", "пароль", "кнопка", "сетка"];
