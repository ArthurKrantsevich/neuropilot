// Общие лайки «нравится / не нравится». Хранилище — маленький Worker (Cloudflare D1), адрес в NEXT_PUBLIC_LIKES_API.
// Пока адреса нет — работает локально: свой голос запоминается в браузере, счётчики не общие.
const API = process.env.NEXT_PUBLIC_LIKES_API ?? "";
export type Vote = 1 | -1 | 0;
export type Counts = { up: number; down: number };
const KEY = "np-votes";

export const myVotes = (): Record<string, Vote> => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
};
const saveVote = (id: string, v: Vote) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...myVotes(), [id]: v }));
  } catch {
    /* приватный режим — голос просто не запомнится */
  }
};

export async function loadCounts(): Promise<Record<string, Counts>> {
  if (!API) return {};
  try {
    const r = await fetch(`${API}/counts`);
    return r.ok ? await r.json() : {};
  } catch {
    return {};
  }
}

/** Голос: prev — прошлый голос этого браузера (сервер переносит его, а не добавляет второй). */
export async function sendVote(id: string, v: Vote, prev: Vote): Promise<Counts | null> {
  saveVote(id, v);
  if (!API) return null;
  try {
    const r = await fetch(`${API}/vote`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, v, prev }) });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
