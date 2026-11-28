"use client";
import { useState } from "react";

// самые частые пароли: опасен сам пароль целиком (или с цифрами в конце), а не любой пароль, который с них начинается
const COMMON = /^(1234\d*|12345\d*|123456\d*|111111|000000|qwerty\d*|йцукен\d*|password\d*|пароль\d*|admin\d*|letmein\d*)$/i;
const LOWER = /\p{Ll}/u, UPPER = /\p{Lu}/u, DIGIT = /\p{N}/u, SYMBOL = /[^\p{L}\p{N}]/u; // кириллица считается как латиница

/** Пять проверок — из них складывается надёжность. */
export const checks = (pw: string) => [pw.length >= 8, pw.length >= 12, LOWER.test(pw) && UPPER.test(pw), DIGIT.test(pw), SYMBOL.test(pw)];

/** Надёжность пароля 0–3. Частые пароли (1234, qwerty, пароль…) и всё короче 6 символов — 0. */
export const strength = (pw: string) => {
  if (pw.length < 6 || COMMON.test(pw) || /^(.)\1+$/.test(pw)) return 0;
  const s = checks(pw).filter(Boolean).length;
  return s <= 2 ? 1 : s === 3 ? 2 : 3;
};

const COLOR = ["#E5484D", "#F08A24", "#E2B93B", "#2FA36B"];

/** Лицо: от страха (глаза шире, рот открыт, капля пота) до улыбки. */
export function Face({ mood, empty }: { mood: number; empty: boolean }) {
  const eye = [26, 20, 16, 14][mood];
  const mouth = ["M -42 60 Q 0 20 42 60 Q 0 110 -42 60 Z", "M -40 70 Q 0 50 40 70", "M -40 62 L 40 62", "M -46 50 Q 0 100 46 50"][mood];
  return (
    <svg className={`pw-face ${!empty && mood === 0 ? "scared" : ""}`} viewBox="-150 -140 300 300" aria-hidden="true">
      <circle r="130" fill={empty ? "#D9D2C8" : COLOR[mood]} />
      <circle cx="-48" cy="-30" r={empty ? 16 : eye} fill="#1E1A16" />
      <circle cx="48" cy="-30" r={empty ? 16 : eye} fill="#1E1A16" />
      {!empty && mood === 0 && <path d="M 92 -70 q 10 30 0 40 q -10 -10 0 -40 Z" fill="#9FD3FF" />}
      <path d={empty ? "M -40 62 L 40 62" : mouth} fill={!empty && mood === 0 ? "#1E1A16" : "none"} stroke="#1E1A16" strokeWidth="10" strokeLinecap="round" />
    </svg>
  );
}

/** Поле пароля с лицом. Шортс «Это поле пароля боится 1234». */
export function PasswordFace({ t }: { t: { placeholder: string; empty: string; moods: string[]; checks: string[] } }) {
  const [value, setValue] = useState("");
  const mood = strength(value);
  const ok = checks(value);
  const empty = !value;
  return (
    <div className="pw" style={{ "--mood": empty ? "#E6DDD2" : COLOR[mood] } as React.CSSProperties}>
      <input className="pw-input" type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder={t.placeholder} spellCheck={false} autoComplete="off" />
      <Face mood={mood} empty={empty} />
      <div className="pw-meter">
        {[0, 1, 2, 3].map((i) => <i key={i} className={!empty && i <= mood ? "on" : ""} />)}
      </div>
      <b className="pw-label">{empty ? t.empty : t.moods[mood]}</b>
      <ul className="pw-checks">
        {t.checks.map((c, i) => <li key={c} className={ok[i] ? "ok" : ""}>{c}</li>)}
      </ul>
    </div>
  );
}
