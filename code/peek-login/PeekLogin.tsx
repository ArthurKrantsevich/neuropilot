"use client";
import { useEffect, useRef, useState } from "react";
import "./peek-login.css";

export type PeekText = { title: string; email: string; password: string; show: string; hide: string; submit: string; done: string };

/** Ширина текста до каретки: тот же шрифт, что у поля, — через canvas, без лишнего DOM. */
const ctx = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
function caretRatio(el: HTMLInputElement) {
  if (!ctx) return 0.5;
  const cs = getComputedStyle(el);
  ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const shown = el.type === "password" ? "•".repeat(el.value.length) : el.value;
  const upto = shown.slice(0, el.selectionStart ?? shown.length);
  const inner = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  return Math.min(1, ctx.measureText(upto).width / inner);
}

type Focus = "none" | "email" | "password";

/** Голова Юнита: экран-лицо с двумя глазами, наушники, антенна. Глаза — один <g>, двигаем только transform. */
function Head({ look, focus, peek, happy }: { look: number; focus: Focus; peek: boolean; happy: boolean }) {
  // одна формула: доля текста до каретки → сдвиг глаз −11…+11 px и наклон головы −4°…+4°
  const cover = focus === "password";
  // подглядывает: глаз смещается в щель у сползшей правой ладони
  const dx = focus === "none" ? 0 : cover && peek ? 8 : -11 + 22 * look;
  const dy = focus === "none" ? 0 : 7;
  const tilt = focus === "email" ? (look - 0.5) * 8 : 0;
  return (
    <div className="pk-head" style={{ transform: `rotate(${tilt}deg)` }}>
      <svg viewBox="0 0 200 170" aria-hidden="true">
        <rect x="96" y="2" width="12" height="14" fill="#E08A5F" />
        <rect x="100" y="16" width="4" height="12" fill="#3A3A42" />
        <rect x="8" y="58" width="22" height="52" fill="#3A3A42" />
        <rect x="170" y="58" width="22" height="52" fill="#3A3A42" />
        <path d="M30 40h8v-8h124v8h8v96h-8v8H38v-8h-8z" fill="#D2693F" />
        <path d="M46 50h108v74H46z" fill="#121418" />
        <g className={`pk-eyes ${happy ? "happy" : ""}`} style={{ transform: `translate(${dx}px, ${dy}px)` }}>
          <rect className="pk-eye" x="72" y="74" width="16" height="18" fill="#F4F0EA" />
          <rect className="pk-eye" x="112" y="74" width="16" height="18" fill="#F4F0EA" />
        </g>
      </svg>
      {/* ладони: снизу поднимаются на экран; «показать пароль» — правая сползает, один глаз подглядывает */}
      <i className={`pk-hand left ${cover ? "up" : ""}`} />
      <i className={`pk-hand right ${cover ? (peek ? "peek" : "up") : ""}`} />
    </div>
  );
}

/** Форма входа, где робот не подглядывает в пароль. Шортс «Этот робот не подглядывает в твой пароль». */
export function PeekLogin({ t }: { t: PeekText }) {
  const [focus, setFocus] = useState<Focus>("none");
  const [look, setLook] = useState(0.5);
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);
  const pass = useRef<HTMLInputElement>(null);
  const track = (el: HTMLInputElement | null) => el && setLook(caretRatio(el));

  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => setDone(false), 1600);
    return () => clearTimeout(id);
  }, [done]);

  return (
    <form
      className="pk"
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
        setFocus("none");
        (document.activeElement as HTMLElement | null)?.blur();
      }}
    >
      <Head look={look} focus={focus} peek={show} happy={done} />
      <h3 className="pk-title">{t.title}</h3>
      <label className="pk-field">
        <span>{t.email}</span>
        <input
          type="email"
          autoComplete="off"
          spellCheck={false}
          onFocus={(e) => (setFocus("email"), track(e.currentTarget))}
          onBlur={() => setFocus("none")}
          onInput={(e) => track(e.currentTarget)}
          onKeyUp={(e) => track(e.currentTarget)}
          onClick={(e) => track(e.currentTarget)}
        />
      </label>
      <label className="pk-field">
        <span>{t.password}</span>
        <div className="pk-pass">
          <input
            ref={pass}
            type={show ? "text" : "password"}
            autoComplete="off"
            onFocus={(e) => (setFocus("password"), track(e.currentTarget))}
            onBlur={() => setFocus("none")}
            onInput={(e) => track(e.currentTarget)}
          />
          <button
            type="button"
            className="pk-show"
            aria-pressed={show}
            onMouseDown={(e) => e.preventDefault()} // фокус остаётся в поле — руки не опускаются
            onClick={() => (setShow((s) => !s), pass.current?.focus())}
          >
            {show ? t.hide : t.show}
          </button>
        </div>
      </label>
      <button className="pk-submit" type="submit">{done ? t.done : t.submit}</button>
    </form>
  );
}
