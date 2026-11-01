"use client";
// Карточка компонента в стиле канала: свёрнута — номер, название, короткое описание; развёрнута — живое демо.
// Снизу: «Код» (окно с файлами), «Скачать .zip», общие лайки «нравится / не нравится».
import { useEffect, useState, type ReactNode } from "react";
import { sendVote, type Counts, type Vote } from "./likes";
import { stems } from "./filters";

const INK = "#14171D";
const CREAM = "#F4F0EA";
const RUST = "#9C4A31";
const ORANGE = "#D97757";

export const Btn: React.FC<{ onClick?: () => void; href?: string; download?: string; on?: boolean; children: ReactNode; title?: string }> = ({ onClick, href, download, on, children, title }) => {
  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "var(--golos)",
    fontWeight: 800,
    fontSize: 13,
    whiteSpace: "nowrap",
    color: on ? CREAM : INK,
    background: on ? ORANGE : CREAM,
    border: `3px solid ${INK}`,
    boxShadow: `3px 3px 0 ${RUST}`,
    padding: "5px 10px",
    textDecoration: "none",
  };
  return href ? (
    <a className="np-btn" href={href} download={download} style={style} title={title}>
      {children}
    </a>
  ) : (
    <button className="np-btn" onClick={onClick} style={style} title={title}>
      {children}
    </button>
  );
};

// подсветка найденных слов (ё = е, регистр не важен — длина строки при этом не меняется)
const Marked: React.FC<{ text: string; q: string }> = ({ text, q }) => {
  const words = stems(q).filter((w) => w.length > 1);
  if (!words.length) return <>{text}</>;
  const low = text.toLowerCase().replace(/ё/g, "е");
  const marks: boolean[] = new Array(text.length).fill(false);
  for (const w of words) for (let i = low.indexOf(w); i >= 0; i = low.indexOf(w, i + 1)) marks.fill(true, i, i + w.length);
  const out: ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    let j = i;
    while (j < text.length && marks[j] === marks[i]) j++;
    out.push(marks[i] ? <mark key={i} className="np-mark">{text.slice(i, j)}</mark> : text.slice(i, j));
    i = j;
  }
  return <>{out}</>;
};

export const Card: React.FC<{
  n: number;
  id: string;
  title: string;
  about: string;
  open: boolean;
  onToggle: () => void;
  onHover: () => void;
  onCode: () => void;
  counts: Counts;
  vote: Vote;
  onVoted: (v: Vote, c: Counts | null) => void;
  wide: boolean;
  lockedUntil: number; // мс UTC; 0 — компонент уже вышел
  query?: string; // что ищут — подсветить в названии и описании
  children: ReactNode;
}> = ({ n, id, title, about, query = "", open: openProp, onToggle, onHover, onCode, counts, vote, onVoted, lockedUntil, children }) => {
  const locked = useLocked(lockedUntil);
  const open = openProp && !locked;
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);
  const cast = async (v: 1 | -1) => {
    if (busy) return;
    const next: Vote = vote === v ? 0 : v; // повторный клик снимает голос
    setBusy(true);
    const c = await sendVote(id, next, vote);
    onVoted(next, c);
    setBusy(false);
  };
  return (
    <section
      id={id}
      onMouseEnter={onHover}
      style={{ background: CREAM, border: `5px solid ${INK}`, boxShadow: `8px 8px 0 ${RUST}`, display: "flex", flexDirection: "column", minWidth: 0 }}
    >
      <button
        onClick={locked ? undefined : onToggle}
        aria-expanded={open}
        disabled={locked}
        style={{ all: "unset", padding: "14px 18px 12px", borderBottom: open ? `4px solid ${INK}` : "none", display: "grid", gridTemplateColumns: "40px 1fr 28px", gap: 8, alignItems: "start" }}
        className="np-head"
      >
        <span style={{ fontFamily: "var(--pixel)", fontSize: 22, color: ORANGE }}>{String(n).padStart(2, "0")}</span>
        <span>
          <span style={{ display: "block", fontFamily: "var(--golos)", fontWeight: 800, fontSize: 18, color: INK }}><Marked text={title} q={query} /></span>
          <span
            style={{
              fontFamily: "var(--golos)",
              fontWeight: 500,
              fontSize: 14,
              color: "#5A5249",
              marginTop: 3,
              // свёрнута — три строки описания, развёрнута — целиком
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: open ? "unset" : 3,
              overflow: "hidden",
            }}
          >
            <Marked text={about} q={query} />
          </span>
        </span>
        <span style={{ fontFamily: "var(--pixel)", fontSize: 22, color: locked ? ORANGE : INK, transform: open ? "rotate(180deg)" : "none", transition: "transform 160ms", textAlign: "center" }}>
          {locked ? (
            // пиксельный замок
            <svg width="20" height="24" viewBox="0 0 10 12" shape-rendering="crispEdges" style={{ display: "inline-block" }}>
              <path d="M3 1h4v1h1v3H7V2H3v3H2V2h1z" fill="#14171D" />
              <path d="M1 5h8v7H1z" fill="#14171D" />
              <path d="M2 6h6v5H2z" fill="#D97757" />
              <path d="M4 7h2v2H4z" fill="#14171D" />
            </svg>
          ) : (
            "▾"
          )}
        </span>
      </button>
      {locked && <LockedPanel until={lockedUntil} />}
      {/* плавное раскрытие: строка сетки 0fr → 1fr; демо монтируется при первом открытии и дальше живёт */}
      <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows 420ms cubic-bezier(.2,.8,.2,1)" }}>
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          {mounted && (
            <div
              className="np-demo"
              style={{ display: "grid", placeItems: "center", padding: 18, background: "#FBF9F6", minWidth: 0, opacity: open ? 1 : 0, transition: "opacity 300ms ease" }}
            >
              {children}
            </div>
          )}
        </div>
      </div>
      <footer style={{ display: "flex", flexWrap: "nowrap", gap: 8, padding: "10px 14px 14px", borderTop: open ? `4px solid ${INK}` : `3px dashed #CFC6BA`, alignItems: "center" }}>
        {locked ? (
          <span style={{ fontFamily: "var(--golos)", fontWeight: 800, fontSize: 13, color: "#8A7F73" }}>Код и оценки откроются вместе с роликом</span>
        ) : (
          <>
            {!open && <Btn onClick={onToggle}>▸ Открыть</Btn>}
            <Btn onClick={onCode} title="Посмотреть код">{"</>"}{open ? " Код" : ""}</Btn>
            <Btn href={`code/${id}.zip`} download={`${id}.zip`} title="Скачать исходники .zip">
              ⤓{open ? " .zip" : ""}
            </Btn>
            <span style={{ flex: 1 }} />
            <Btn onClick={() => cast(1)} on={vote === 1} title="Нравится">
              ▲ {counts.up}
            </Btn>
            <Btn onClick={() => cast(-1)} on={vote === -1} title="Не нравится">
              ▼ {counts.down}
            </Btn>
          </>
        )}
      </footer>
    </section>
  );
};

/** Заперто ли ещё: проверяем каждую секунду — ролик вышел, карточка открылась сама. */
function useLocked(until: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until || Date.now() >= until) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [until]);
  return until > 0 && now < until;
}

const plural = (n: number, one: string, few: string, many: string) =>
  n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many;

/** «Юнит ещё собирает этот виджет»: пиксельное лицо с загрузкой, таймер до выхода ролика, полоска сборки. */
const LockedPanel: React.FC<{ until: number }> = ({ until }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, until - now);
  const s = Math.floor(left / 1000);
  const d = Math.floor(s / 86400);
  const hh = String(Math.floor((s % 86400) / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  const when = new Date(until).toLocaleString("ru-RU", { timeZone: "Europe/Moscow", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  // полоска: сколько «собрано» из последних трёх суток до выхода
  const span = 3 * 86400 * 1000;
  const done = Math.min(1, Math.max(0.04, 1 - left / span));
  return (
    <div className="np-locked" style={{ padding: "18px 18px 20px", background: "#FBF9F6", display: "grid", gridTemplateColumns: "96px 1fr", gap: 18, alignItems: "center", borderBottom: `4px solid ${INK}` }}>
      {/* пиксельный Юнит: экран с кольцом загрузки */}
      <div style={{ width: 96, height: 84, background: ORANGE, border: `4px solid ${INK}`, boxShadow: `4px 4px 0 ${RUST}`, position: "relative" }}>
        <div style={{ position: "absolute", left: 10, top: 10, right: 10, bottom: 14, background: "#0F1319", display: "grid", placeItems: "center" }}>
          <div className="np-spin" style={{ width: 30, height: 30, position: "relative" }}>
            {Array.from({ length: 8 }, (_, i) => (
              <span
                key={i}
                style={{
                  position: "absolute",
                  width: 6,
                  height: 6,
                  left: 12 + 12 * Math.cos((i / 8) * Math.PI * 2) - 0,
                  top: 12 + 12 * Math.sin((i / 8) * Math.PI * 2) - 0,
                  background: i === 0 ? "#FFF6EE" : i < 3 ? "#7FC4FF" : "#3A4150",
                }}
              />
            ))}
          </div>
        </div>
        <span style={{ position: "absolute", left: 42, top: -14, width: 8, height: 10, background: "#3B3F49" }} />
        <span style={{ position: "absolute", left: 40, top: -22, width: 12, height: 10, background: "#FFAE73" }} />
      </div>
      <div>
        <div style={{ fontFamily: "var(--golos)", fontWeight: 800, fontSize: 18, color: INK }}>Юнит ещё собирает этот виджет</div>
        <div style={{ fontFamily: "var(--golos)", fontWeight: 500, fontSize: 14, color: "#5A5249", margin: "2px 0 10px" }}>Откроется вместе с роликом — {when} МСК</div>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", fontFamily: "var(--golos)", color: INK }}>
          {d > 0 && (
            <>
              <b style={{ fontFamily: "var(--pixel)", fontSize: 30, color: ORANGE }}>{d}</b>
              <span style={{ fontWeight: 800, fontSize: 14 }}>{plural(d, "день", "дня", "дней")}</span>
            </>
          )}
          <b style={{ fontFamily: "var(--pixel)", fontSize: 30, color: ORANGE, letterSpacing: 1 }}>
            {hh}:{mm}:{ss}
          </b>
        </div>
        <div style={{ marginTop: 10, height: 14, border: `3px solid ${INK}`, background: CREAM, boxShadow: `3px 3px 0 ${RUST}`, position: "relative", overflow: "hidden" }}>
          <div className="np-build" style={{ position: "absolute", inset: 0, width: `${done * 100}%`, background: ORANGE }} />
        </div>
      </div>
    </div>
  );
};

/** Окно с исходниками: вкладки по файлам, код как есть. */
export const CodeModal: React.FC<{ id: string; title: string; onClose: () => void }> = ({ id, title, onClose }) => {
  const [files, setFiles] = useState<string[]>([]);
  const [cur, setCur] = useState(0);
  const [text, setText] = useState("Загрузка…");
  useEffect(() => {
    fetch("code/index.json")
      .then((r) => r.json())
      .then((idx: Record<string, string[]>) => setFiles(idx[id] ?? []))
      .catch(() => setText("Не удалось загрузить список файлов"));
  }, [id]);
  useEffect(() => {
    if (!files[cur]) return;
    fetch(`code/${id}/${files[cur]}`)
      .then((r) => r.text())
      .then(setText)
      .catch(() => setText("Не удалось загрузить файл"));
  }, [id, files, cur]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(4,5,10,0.72)", display: "grid", gridTemplateColumns: "minmax(0, 1100px)", justifyContent: "center", alignContent: "center", zIndex: 50, padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", minWidth: 0, maxHeight: "86vh", display: "flex", flexDirection: "column", background: CREAM, border: `5px solid ${INK}`, boxShadow: `10px 10px 0 ${RUST}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `4px solid ${INK}` }}>
          <span style={{ fontFamily: "var(--golos)", fontWeight: 800, fontSize: 18, color: INK, flex: 1 }}>{title}</span>
          <Btn href={`code/${id}.zip`} download={`${id}.zip`}>⤓ Скачать .zip</Btn>
          <Btn onClick={() => navigator.clipboard?.writeText(text)}>Копировать</Btn>
          <Btn onClick={onClose}>✕</Btn>
        </div>
        <div style={{ display: "flex", gap: 8, padding: "10px 16px 0", flexWrap: "wrap" }}>
          {files.map((f, i) => (
            <Btn key={f} on={i === cur} onClick={() => setCur(i)}>
              {f}
            </Btn>
          ))}
        </div>
        <pre className="np-code" style={{ margin: 16, padding: 16, overflow: "auto", background: "#14171D", color: "#E9E4DC", fontSize: 13, lineHeight: 1.5, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", flex: 1, border: `3px solid ${INK}` }}>{text}</pre>
      </div>
    </div>
  );
};
