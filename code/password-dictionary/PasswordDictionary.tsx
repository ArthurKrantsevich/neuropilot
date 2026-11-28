"use client";
import { useEffect, useRef, useState } from "react";
import "./password-dictionary.css";

export type PdText = {
  label: string; // «Придумай пароль»
  placeholder: string;
  show: string;
  hide: string;
  check: string;
  local: string; // «всё локально, ничего не отправляется и не хранится»
  keys: string; // aria-label связки ключей
  attempt: (n: number) => string; // «попытка N»
  foundRank: (n: number) => string; // «Найден в словаре на попытке N»
  foundPop: (k: number, cat: string) => string;
  pop: string; // название категории поп-культуры
  dictSize: (n: number) => string; // «в моём мини-словаре n паролей»
  notFound: string;
  space: string; // «вариантов»
  alphabet: string; // «алфавит»
  length: string;
  estimate: string; // «оценка полного перебора»
  ref: string; // «опорная точка: 8 цифр ≈ 3 часа ...»
  scale: string; // «остальное — масштабирование по числу вариантов, оценка»
  moral: string;
  sources: string;
  unitS: string; unitMin: string; unitH: string; unitD: string; unitY: string;
  tooLong: string;
  dec: string;
};

type Entry = { pw: string; rank?: number; pop?: number };
/** Только то, что есть в NordPass Top 200 2026 (проверено 25.11.2026):
 *  общий список — №1 123456, №2 admin, №3 12345678, №5 1234, №7 password, №174 minecraft;
 *  топ-10 поп-культуры — №1 Lebron0319, №3 roblox.com1, №4 skibiditoilet. */
const DICT: Entry[] = [
  { pw: "123456", rank: 1 },
  { pw: "admin", rank: 2 },
  { pw: "12345678", rank: 3 },
  { pw: "1234", rank: 5 },
  { pw: "password", rank: 7 },
  { pw: "minecraft", rank: 174 },
  { pw: "Lebron0319", pop: 1 },
  { pw: "roblox.com1", pop: 3 },
  { pw: "skibiditoilet", pop: 4 },
];

// опорная точка: 8 цифр = 10^8 вариантов ≈ 3 часа на одной RTX 5090 (bcrypt, Hive Systems, 2025)
const REF_VARIANTS = 1e8;
const REF_SECONDS = 3 * 3600;

function alphabetOf(pw: string) {
  let a = 0;
  if (/[0-9]/.test(pw)) a += 10;
  if (/[a-z]/.test(pw)) a += 26;
  if (/[A-Z]/.test(pw)) a += 26;
  if (/[ -/:-@[-`{-~]/.test(pw)) a += 33;
  if (/[^\x20-\x7e]/.test(pw)) a += 100;
  return a;
}

function human(sec: number, t: PdText) {
  const n = (x: number) => (x < 10 ? x.toFixed(1) : String(Math.round(x))).replace(".", t.dec);
  if (sec < 1) return `< 1 ${t.unitS}`;
  if (sec < 60) return `≈${n(sec)} ${t.unitS}`;
  if (sec < 3600) return `≈${n(sec / 60)} ${t.unitMin}`;
  if (sec < 86400) return `≈${n(sec / 3600)} ${t.unitH}`;
  if (sec < 86400 * 365) return `≈${n(sec / 86400)} ${t.unitD}`;
  const y = sec / (86400 * 365);
  if (y < 1e6) return `≈${Math.round(y).toLocaleString("en-US").replace(/,/g, " ")} ${t.unitY}`;
  return `≈10^${Math.round(Math.log10(y))} ${t.unitY}`;
}

type Res =
  | { kind: "dict"; entry: Entry; n: number }
  | { kind: "brute"; len: number; alpha: number; log10: number; sec: number };

/** Из шортса r58: пароль из словаря падает с первых попыток, длина защищает только пароль вне словаря. */
export function PasswordDictionary({ t }: { t: PdText }) {
  const [pw, setPw] = useState("");
  const [hidden, setHidden] = useState(true);
  const [res, setRes] = useState<Res | null>(null);
  const [count, setCount] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const run = (e: React.FormEvent) => {
    e.preventDefault();
    if (timer.current) clearInterval(timer.current);
    if (!pw) { setRes(null); return; }
    const entry = DICT.find((d) => d.pw === pw);
    if (entry) {
      const n = entry.rank ?? 1;
      const r: Res = { kind: "dict", entry, n };
      setRes(r);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce || n <= 1) { setCount(n); return; }
      setCount(0);
      const step = Math.max(1, Math.ceil(n / 24));
      let c = 0;
      timer.current = setInterval(() => {
        c = Math.min(n, c + step);
        setCount(c);
        if (c >= n && timer.current) clearInterval(timer.current);
      }, 60);
    } else {
      const alpha = alphabetOf(pw);
      const len = pw.length;
      const log10 = len * Math.log10(alpha);
      const sec = (Math.pow(alpha, len) / REF_VARIANTS) * REF_SECONDS;
      setRes({ kind: "brute", len, alpha, log10, sec });
    }
  };

  const exp = (l: number) => (l < 6 ? Math.round(Math.pow(10, l)).toLocaleString("en-US").replace(/,/g, " ") : `10^${l.toFixed(1).replace(".", t.dec)}`);

  return (
    <div className="pd">
      <form className="pd-form" onSubmit={run} autoComplete="off">
        <label className="pd-label" htmlFor="pd-input">{t.label}</label>
        <div className="pd-row">
          <input
            id="pd-input"
            className="pd-input"
            type={hidden ? "password" : "text"}
            value={pw}
            maxLength={64}
            placeholder={t.placeholder}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            onChange={(e) => { setPw(e.target.value); setRes(null); }}
          />
          <button type="button" className="pd-eye" onClick={() => setHidden((h) => !h)} aria-pressed={!hidden}>
            {hidden ? t.show : t.hide}
          </button>
        </div>
        <button type="submit" className="pd-go" disabled={!pw}>{t.check}</button>
        <p className="pd-local">{t.local}</p>
      </form>

      <div className="pd-ring" role="img" aria-label={t.keys}>
        {DICT.map((d, i) => (
          <i
            key={d.pw}
            className={`pd-key${res?.kind === "dict" && res.entry === d ? " is-hit" : ""}`}
            style={{ transform: `rotate(${(i / DICT.length) * 360}deg) translateY(-44px)${res?.kind === "dict" && res.entry === d ? " scale(1.5)" : ""}` }}
          />
        ))}
        <b className="pd-hub">{res?.kind === "dict" ? count : "?"}</b>
      </div>

      <div className="pd-out" aria-live="polite">
        {!res && <p className="pd-hint">{t.dictSize(DICT.length)}</p>}
        {res?.kind === "dict" && (
          <>
            <p className="pd-big pd-bad">{res.entry.rank ? t.foundRank(res.n) : t.foundPop(res.entry.pop!, t.pop)}</p>
            <p>{t.attempt(count)}</p>
          </>
        )}
        {res?.kind === "brute" && (
          <>
            <p className="pd-big">{t.notFound}</p>
            <p>
              {t.alphabet}: {res.alpha}, {t.length}: {res.len} → {t.space}: {exp(res.log10)}
            </p>
            <p className="pd-time">{res.log10 > 300 ? t.tooLong : human(res.sec, t)} <em>({t.estimate})</em></p>
          </>
        )}
      </div>

      <p className="pd-note">{t.ref}</p>
      <p className="pd-note">{t.scale}</p>
      <p className="pd-moral">{t.moral}</p>
      <p className="pd-src">{t.sources}</p>
    </div>
  );
}
