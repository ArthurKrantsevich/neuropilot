/** Даты без часовых поясов: всё считаем в полдень локального времени, чтобы переход на летнее время не сдвигал дни. */
export type D = Date;

export const day = (y: number, m: number, d: number): D => new Date(y, m, d, 12);
export const norm = (d: D): D => day(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: D, n: number): D => day(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const addMonths = (d: D, n: number): D => day(d.getFullYear(), d.getMonth() + n, 1);
export const same = (a?: D | null, b?: D | null) => !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const before = (a: D, b: D) => norm(a).getTime() < norm(b).getTime();
export const daysBetween = (a: D, b: D) => Math.round((norm(b).getTime() - norm(a).getTime()) / 86400000);
export const monthStart = (d: D): D => day(d.getFullYear(), d.getMonth(), 1);
export const monthEnd = (d: D): D => day(d.getFullYear(), d.getMonth() + 1, 0);

/** Сетка месяца по неделям, null — пустая клетка вне месяца. weekStart: 1 — понедельник, 0 — воскресенье. */
export function monthGrid(month: D, weekStart: 0 | 1): (D | null)[][] {
  const first = monthStart(month);
  const lead = (first.getDay() - weekStart + 7) % 7;
  const total = monthEnd(month).getDate();
  const cells: (D | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(day(month.getFullYear(), month.getMonth(), d));
  while (cells.length % 7) cells.push(null);
  const weeks: (D | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
