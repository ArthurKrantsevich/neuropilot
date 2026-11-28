"use client";
import { useEffect, useState } from "react";
import "./ua-mask.css";

export type UaMaskText = {
  label: string;
  names: (n: number) => string;
  own: string;
  ask: string;
  answer: string;
  note: string;
};

/** Чьё это имя в строке User-Agent (Zakas 2010, Leenheer 2024, MDN). */
const OWNERS: Record<string, string> = {
  Mozilla: "Netscape",
  AppleWebKit: "Apple",
  KHTML: "Konqueror",
  Gecko: "Firefox",
  Safari: "Apple",
  Chrome: "Google",
  CriOS: "Google",
  Edg: "Microsoft",
  EdgA: "Microsoft",
  OPR: "Opera",
  Firefox: "Mozilla",
  FxiOS: "Mozilla",
  YaBrowser: "Яндекс",
  SamsungBrowser: "Samsung",
};
/** Какое имя в строке — собственное: Edg, OPR, YaBrowser стоят после Chrome и Safari. */
const OWN_ORDER = ["YaBrowser", "SamsungBrowser", "OPR", "Edg", "EdgA", "Firefox", "FxiOS", "CriOS", "Chrome", "Safari"];
// пример для сервера и первого кадра — строка Chrome 156 на Windows (как в ролике)
const SAMPLE = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36";

type Tok = { txt: string; name?: string };
function split(ua: string): Tok[] {
  const out: Tok[] = [];
  for (const m of ua.matchAll(/\([^)]*\)|[^\s()]+/g)) {
    const txt = m[0];
    if (txt.startsWith("(")) {
      // «(KHTML, like Gecko)» — внутри скобок тоже имена
      const inner = txt.match(/KHTML|Gecko/g);
      out.push({ txt, name: inner ? inner.join("+") : undefined });
      continue;
    }
    const n = txt.split("/")[0];
    out.push({ txt, name: n in OWNERS ? n : undefined });
  }
  return out;
}

export function UaMask({ t }: { t: UaMaskText }) {
  const [ua, setUa] = useState(SAMPLE);
  const [asked, setAsked] = useState<string | null>(null);
  useEffect(() => setUa(navigator.userAgent), []);
  const toks = split(ua);
  const names = toks.flatMap((x) => (x.name ? x.name.split("+") : []));
  const own = OWN_ORDER.find((n) => names.includes(n));
  return (
    <div className="ua">
      <div className="ua-pass">
        <div className="ua-label">{t.label}</div>
        <p className="ua-line">
          {toks.map((x, i) => (
            <span key={i} className={x.name ? (x.name === own ? "ua-tok ua-own" : "ua-tok ua-name") : "ua-tok"}>
              {x.name && <em>{x.name === own ? t.own : x.name.split("+").map((n) => OWNERS[n]).join(" · ")}</em>}
              {x.txt}
            </span>
          ))}
        </p>
        <div className="ua-count">{t.names(names.length)}</div>
      </div>
      <div className="ua-console">
        <button onClick={() => setAsked(navigator.appName)}>{t.ask}</button>
        <code>
          &gt; navigator.appName
          {asked && <b> &apos;{asked}&apos;</b>}
        </code>
        {asked && <p>{t.answer}</p>}
      </div>
      <p className="ua-note">{t.note}</p>
    </div>
  );
}
