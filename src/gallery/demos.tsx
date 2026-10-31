"use client";
import { useRef, useEffect, useState, type ReactNode } from "react";
import { day, norm, type D } from "./components/range-picker/dates";
import { RangePicker, type Range } from "./components/range-picker/RangePicker";
import { MagneticButton } from "./components/MagneticButton";
import { PasswordFace } from "./components/PasswordFace";
import { RunawayButton } from "./components/RunawayButton";
import { ThemeToggle } from "./components/ThemeToggle";
import { TiltCard } from "./components/TiltCard";
import { Battery, IslandPhone, Signal, type PhoneText } from "./components/dynamic-island/IslandPhone";
import { CardTransition, type Place } from "./components/card-transition/CardTransition";
import { contrast, cssVars, MaterialPlayer, rolesFromSeed, type PlayerText } from "./components/material-you/MaterialYou";
import { WALLS } from "./components/material-you/wallpapers";
import { Bento } from "./components/bento/Bento";
import { areasCss, LAYOUTS } from "./components/bento/bento";
import { NEU_LAYOUT, NeuScreen } from "./components/neu/Neu";
import { ctaContrast, EraScreen, type Era } from "./components/eras/Eras";
import sunset from "./components/eras/sunset.jpg";
import fruit from "./components/eras/fruit.jpg";
import { ALL, CLAY, ClayApp, ClayButton, contrast as clayContrast, mixHex, type Layers } from "./components/clay/Clay";
import { BRUTAL, BrutalShop, SOFT, TWO_COLORS, type BrutalState } from "./components/brutal/Brutal";
import { Reactions, type ReactionsText } from "./components/reactions/Reactions";
import { PeekLogin, type PeekText } from "./components/peek-login/PeekLogin";
import { RollingLike, type RollingText } from "./components/rolling-like/RollingLike";
import { LinkEras, type LinkErasText } from "./components/link-eras/LinkEras";
import { HamburgerEras, type HamburgerText } from "./components/hamburger-eras/HamburgerEras";
import { locale, useLang, type Lang } from "./i18n";
import "./gallery.css";

// ?today=2026-10-26 — фиксированная «сегодня» для записи
const q = new URLSearchParams(location.search);
const TODAY: D = (() => {
  const s = q.get("today");
  if (!s) return norm(new Date());
  const [y, m, d] = s.split("-").map(Number);
  return day(y, m - 1, d);
})();

type L = Record<Lang, string>;
const G = {
  title: { ru: "Компоненты из шортсов", en: "Components from the Shorts" },
  lead: { ru: "React-компоненты из коротких роликов @NeuroP1lot. Без библиотек, код в папке src/components.", en: "React components from @NeuroP1lot Shorts. No libraries; the code lives in src/components." },
  watch: { ru: "Смотреть шортс", en: "Watch the Short" },
  code: { ru: "Код", en: "Code" },
} satisfies Record<string, L>;

const ISLAND: Record<Lang, PhoneText> = {
  ru: { title: "Dynamic Island", lead: "Одна капсула: ширина, высота и скругление на пружине.", modes: { timer: "Таймер", music: "Музыка", call: "Звонок" }, hint: "Нажми на остров, чтобы свернуть", calling: "Входящий вызов", caller: "Аня", song: "Северное сияние", artist: "NeuroPilot" },
  en: { title: "Dynamic Island", lead: "One pill: width, height and radius on a spring.", modes: { timer: "Timer", music: "Music", call: "Call" }, hint: "Tap the island to collapse", calling: "Incoming call", caller: "Anna", song: "Northern Lights", artist: "NeuroPilot" },
};

const PLACES: Record<Lang, { title: string; places: Place[]; labels: { back: string; book: string; nights: string } }> = {
  ru: {
    title: "Куда поедем?",
    labels: { back: "Назад", book: "Забронировать", nights: "7 ночей" },
    places: [
      { id: "iceland", title: "Исландия", sub: "Ледники и гейзеры", hue: 200, text: "Чёрные пляжи, водопады и северное сияние прямо над домиком." },
      { id: "japan", title: "Япония", sub: "Киото осенью", hue: 350, text: "Красные клёны, храмы и тишина садов камней." },
      { id: "morocco", title: "Марокко", sub: "Сахара и Марракеш", hue: 25, text: "Ночь в пустыне под звёздами и рынки, где пахнет специями." },
      { id: "norway", title: "Норвегия", sub: "Фьорды", hue: 160, text: "Скалы над водой, паромы и домики рыбаков на сваях." },
    ],
  },
  en: {
    title: "Where to next?",
    labels: { back: "Back", book: "Book now", nights: "7 nights" },
    places: [
      { id: "iceland", title: "Iceland", sub: "Glaciers and geysers", hue: 200, text: "Black beaches, waterfalls and the northern lights right above your cabin." },
      { id: "japan", title: "Japan", sub: "Kyoto in autumn", hue: 350, text: "Red maples, temples and the quiet of rock gardens." },
      { id: "morocco", title: "Morocco", sub: "Sahara and Marrakesh", hue: 25, text: "A night in the desert under the stars and markets that smell of spices." },
      { id: "norway", title: "Norway", sub: "Fjords", hue: 160, text: "Cliffs over water, ferries and fishermen's huts on stilts." },
    ],
  },
};

const CardsDemo = ({ lang, animate = true, full = false }: { lang: Lang; animate?: boolean; full?: boolean }) => (
  <div className={`ct-phone ${full ? "full" : ""}`}>
    <CardTransition heading={PLACES[lang].title} places={PLACES[lang].places} labels={PLACES[lang].labels} animate={animate} />
  </div>
);

const PLAYER: Record<Lang, PlayerText & { pick: string; own: string; ratio: string; palette: string }> = {
  ru: { app: "Музыка", title: "Северное сияние", artist: "NeuroPilot", chips: ["Для вас", "Новое", "Чарт"], nav: ["Главная", "Плеер", "Медиатека"], pick: "Обои", own: "Свой цвет", ratio: "Контраст текста на кнопке", palette: "29 ролей из одного цвета" },
  en: { app: "Music", title: "Northern Lights", artist: "NeuroPilot", chips: ["For you", "New", "Charts"], nav: ["Home", "Player", "Library"], pick: "Wallpaper", own: "Your color", ratio: "Text contrast on the button", palette: "29 roles from one color" },
};

/** Демо Material You: обои → цвет-семя → вся палитра; живой контраст и 29 ролей. */
function MaterialDemo({ lang }: { lang: Lang }) {
  const [wall, setWall] = useState(WALLS[0]);
  const [seed, setSeed] = useState(WALLS[0].seed);
  const roles = rolesFromSeed(seed);
  const t = PLAYER[lang];
  return (
    <div className="my-demo">
      <div className="my-phone"><MaterialPlayer seed={seed} text={t} wallpaper={wall.src} /></div>
      <div className="my-side">
        <b>{t.pick}</b>
        <div className="my-walls">
          {WALLS.map((w) => (
            <button key={w.id} aria-label={w.name[lang]} aria-pressed={wall.id === w.id} style={{ backgroundImage: `url("${w.src}")` }} onClick={() => { setWall(w); setSeed(w.seed); }} />
          ))}
        </div>
        <label className="my-own">
          <input type="color" value={seed} onChange={(e) => setSeed(e.target.value)} /> {t.own}
        </label>
        <div className="my-ratio">{t.ratio}: <b>{contrast(roles.primary, roles.onPrimary).toFixed(1)}:1</b></div>
        <div className="my-ratio">{t.palette}</div>
        <div className="my-swatches">{Object.values(roles).map((c, i) => <i key={i} style={{ background: c }} />)}</div>
      </div>
    </div>
  );
}

/** Запись для шортса: экран Android 412×915; ?seed=N — статично, ?cycle=мс — смена обоев по кругу. */
function MaterialRec({ lang }: { lang: Lang }) {
  const start = Number(q.get("seed") ?? 0);
  const cycle = Number(q.get("cycle") ?? 0);
  const [i, setI] = useState(start);
  useEffect(() => {
    if (!cycle) return;
    const id = setInterval(() => setI((v) => (v + 1) % WALLS.length), cycle);
    return () => clearInterval(id);
  }, [cycle]);
  const w = WALLS[i];
  return (
    <div className="my-rec" style={cssVars(rolesFromSeed(w.seed))}>
      <MaterialPlayer seed={w.seed} text={PLAYER[lang]} wallpaper={w.src} />
    </div>
  );
}


/** Необрутализм: мягкий SaaS → плоский цвет, рамка и жёсткая тень → два ярких цвета вместо пяти. Счётчики — по настоящему DOM. */
function BrutalDemo({ lang }: { lang: Lang }) {
  const MODES = [SOFT, BRUTAL, TWO_COLORS];
  const [mode, setMode] = useState(0);
  const [st, setSt] = useState<BrutalState>(SOFT);
  const [press, setPress] = useState(0);
  const [n, setN] = useState({ blur: 0, grad: 0 });
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const to = MODES[mode];
    const tick = () => setSt((f) => {
      const k = 0.16;
      const nx = { g: f.g + (to.g - f.g) * k, s: f.s + (to.s - f.s) * k, b: f.b + (to.b - f.b) * k, c: f.c + (to.c - f.c) * k };
      const done = Math.abs(nx.g - to.g) + Math.abs(nx.s - to.s) + Math.abs(nx.b - to.b) + Math.abs(nx.c - to.c) < 0.004;
      if (!done) raf = requestAnimationFrame(tick);
      return done ? { ...to } : nx;
    });
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
  // считаем по готовой странице: тени с размытием > 0 и фоны-градиенты
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let blur = 0, grad = 0;
    el.querySelectorAll<HTMLElement>("*").forEach((x) => {
      const cs = getComputedStyle(x);
      if (cs.boxShadow !== "none") for (const part of cs.boxShadow.split(/,(?![^(]*\))/)) { const px = part.match(/(-?[\d.]+)px/g) ?? []; if (parseFloat(px[2] ?? "0") > 0.05) blur++; }
      if (cs.backgroundImage.includes("gradient") && parseFloat(cs.opacity) > 0.01) grad++;
    });
    setN({ blur, grad });
  }, [st]);
  const L = lang === "ru"
    ? { modes: ["Мягко", "Необрутализм", "Два цвета"], blur: "размытий", grad: "градиентов" }
    : { modes: ["Soft", "Neubrutalism", "Two colors"], blur: "blurs", grad: "gradients" };
  return (
    <div className="brutal-demo">
      <div className="bento-tools">
        <div className="seg">
          {L.modes.map((m, i) => <button key={m} className={mode === i ? "on" : ""} onClick={() => setMode(i)}>{m}</button>)}
        </div>
        <p className="brutal-count"><b>{n.blur}</b> {L.blur} · <b>{n.grad}</b> {L.grad}</p>
      </div>
      <div className="brutal-stage" ref={ref} onPointerDown={() => setPress(1)} onPointerUp={() => setPress(0)} onPointerLeave={() => setPress(0)}>
        <BrutalShop lang={lang} st={{ ...st, press }} />
      </div>
    </div>
  );
}

/** Три эпохи айфона: один экран «Сегодня» — кожа 2007, плоско 2013, стекло 2025 и правило; Clear / Tinted с живым контрастом. */
function ErasDemo({ lang }: { lang: Lang }) {
  const ERAS: Era[] = ["leather", "flat", "glass", "rule"];
  const [era, setEra] = useState<Era>("leather");
  const [tinted, setTinted] = useState(false);
  const [tint, setTint] = useState(0);
  useEffect(() => {
    let raf = 0;
    const to = tinted ? 1 : 0;
    const tick = () => setTint((f) => {
      const n = f + (to - f) * 0.18;
      const done = Math.abs(n - to) < 0.004;
      if (!done) raf = requestAnimationFrame(tick);
      return done ? to : n;
    });
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [tinted]);
  const L = lang === "ru"
    ? { eras: ["2007 · кожа", "2013 · плоско", "2025 · стекло", "Правило"], cr: "Контраст подписи кнопки", norm: "норма 4,5 : 1, WCAG 1.4.3", note: { leather: "Кожа, бумага, фетр, гелевая кнопка — объём у всего подряд.", flat: "Всё плоское: кнопка «Новая заметка» — просто синий текст, как подпись.", glass: "Стекло над фото: объём вернулся, но белый текст тонет. Tinted — плотнее.", rule: "Фон плоский, объём — только у того, что нажимается." } }
    : { eras: ["2007 · leather", "2013 · flat", "2025 · glass", "Rule"], cr: "Button label contrast", norm: "minimum 4.5:1, WCAG 1.4.3", note: { leather: "Leather, paper, felt, a gel button: depth on everything.", flat: "Everything flat: \"New note\" is just blue text, like a label.", glass: "Glass over a photo: depth is back, but white text sinks. Tinted is denser.", rule: "Flat background, depth only for what you press." } };
  const cr = ctaContrast(tint);
  const crTxt = cr.toFixed(1).replace(".", lang === "ru" ? "," : ".");
  return (
    <div className="eras-demo">
      <div className="bento-tools">
        <div className="seg eras-seg">
          {ERAS.map((e, i) => <button key={e} className={era === e ? "on" : ""} onClick={() => setEra(e)}>{L.eras[i]}</button>)}
        </div>
        {era === "glass" && (
          <div className="seg">
            <button className={!tinted ? "on" : ""} onClick={() => setTinted(false)}>Clear</button>
            <button className={tinted ? "on" : ""} onClick={() => setTinted(true)}>Tinted</button>
          </div>
        )}
      </div>
      <p className="neu-meter">{L.note[era]}{era === "glass" && <> · {L.cr}: <b className={cr >= 4.5 ? "ok" : "bad"}>{crTxt} : 1</b> ({L.norm})</>}</p>
      <div className="neu-phone">
        <div className="neu-frame eras-frame">
          {ERAS.map((e) => (
            <div key={e} className="eras-layer" style={{ opacity: era === e ? 1 : 0 }}>
              <EraScreen era={e} lang={lang} tint={tint} photo={sunset.src} photo2={fruit.src} hand="Caveat, cursive" ui="Inter, system-ui, sans-serif" />
            </div>
          ))}
          <div className="neu-bars" aria-hidden="true" style={{ color: era === "flat" || era === "rule" ? "#000" : "#fff" }}><span>9:41</span><i /><em style={{ background: era === "flat" || era === "rule" ? "#000" : "#fff" }} /></div>
        </div>
      </div>
    </div>
  );
}

/** Клейморфизм: три тени включаются по одной (каждая плавно), текст — белый (ловушка) или тёмный того же оттенка; контраст считается вживую. */
function ClayDemo({ lang }: { lang: Lang }) {
  const [on, setOn] = useState<Layers>(ALL);
  const [dark, setDark] = useState(true);
  const [st, setSt] = useState({ ...ALL, ink: 1 });
  useEffect(() => {
    let raf = 0;
    const to = { ...on, ink: dark ? 1 : 0 };
    const tick = () => setSt((f) => {
      const k = 0.18;
      const nx = { outer: f.outer + (to.outer - f.outer) * k, dark: f.dark + (to.dark - f.dark) * k, light: f.light + (to.light - f.light) * k, ink: f.ink + (to.ink - f.ink) * k };
      const done = Math.abs(nx.outer - to.outer) + Math.abs(nx.dark - to.dark) + Math.abs(nx.light - to.light) + Math.abs(nx.ink - to.ink) < 0.004;
      if (!done) raf = requestAnimationFrame(tick);
      return done ? to : nx;
    });
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on, dark]);
  const L = lang === "ru"
    ? { sh: ["1 · тень снаружи", "2 · тёмная внутри", "3 · блик внутри"], white: "Белый текст", ink: "Тёмный текст", play: "Играть", cr: "Контраст текста", big: "норма для крупного — 3 : 1" }
    : { sh: ["1 · outer shadow", "2 · dark inset", "3 · inset highlight"], white: "White text", ink: "Dark text", play: "Play", cr: "Text contrast", big: "large-text minimum is 3:1" };
  const keys = ["outer", "dark", "light"] as const;
  const c = CLAY.lilac;
  const cr = clayContrast(mixHex("#FFFFFF", c.ink, dark ? 1 : 0), c.bg);
  return (
    <div className="clay-demo">
      <div className="bento-tools">
        <div className="clay-toggles">
          {keys.map((k, i) => (
            <label key={k} className={on[k] ? "on" : ""}>
              <input type="checkbox" checked={on[k] > 0} onChange={(e) => setOn({ ...on, [k]: e.target.checked ? 1 : 0 })} /> {L.sh[i]}
            </label>
          ))}
        </div>
        <div className="seg">
          <button className={!dark ? "on" : ""} onClick={() => setDark(false)}>{L.white}</button>
          <button className={dark ? "on" : ""} onClick={() => setDark(true)}>{L.ink}</button>
        </div>
      </div>
      <p className="neu-meter">{L.cr}: <b className={cr >= 4.5 ? "ok" : "bad"}>{cr.toFixed(1).replace(".", lang === "ru" ? "," : ".")} : 1</b> · {L.big}, WCAG 1.4.3</p>
      <div className="clay-stage">
        <ClayButton hue="lilac" ink={st.ink} layers={st} r={60} label={L.play} style={{ width: "min(100%, 420px)", height: "clamp(96px, 26vw, 128px)", fontSize: "clamp(34px, 9vw, 46px)" }} />
      </div>
      <div className="neu-phone">
        <div className="neu-frame">
          <ClayApp lang={lang} ink={st.ink} layers={st} />
          <div className="neu-bars" aria-hidden="true"><span>9:41</span><i /><em /></div>
        </div>
      </div>
    </div>
  );
}

/** Неоморфизм: «найди кнопки». Мягкий экран ↔ исправленный (fix плавно 0 → 1), подсветка кнопок и плиток-обманок. */
function NeuDemo({ lang }: { lang: Lang }) {
  const [on, setOn] = useState(false);
  const [fix, setFix] = useState(0);
  const [show, setShow] = useState(false);
  useEffect(() => {
    let raf = 0;
    const tick = () => setFix((f) => {
      const n = f + ((on ? 1 : 0) - f) * 0.18;
      if (Math.abs(n - (on ? 1 : 0)) > 0.005) raf = requestAnimationFrame(tick);
      return Math.abs(n - (on ? 1 : 0)) > 0.005 ? n : on ? 1 : 0;
    });
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  const L = lang === "ru"
    ? { soft: "Как на Dribbble", fixed: "Исправлено", show: "Показать кнопки", edge: "Край кнопки", not: "не кнопка" }
    : { soft: "Dribbble style", fixed: "Fixed", show: "Show the buttons", edge: "Button edge", not: "not a button" };
  let n = 0;
  return (
    <div className="neu-demo">
      <div className="bento-tools">
        <div className="seg">
          <button className={!on ? "on" : ""} onClick={() => setOn(false)}>{L.soft}</button>
          <button className={on ? "on" : ""} onClick={() => setOn(true)}>{L.fixed}</button>
        </div>
        <label className="bento-check"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> {L.show}</label>
      </div>
      <div className="neu-phone">
        <div className="neu-frame">
          <NeuScreen lang={lang} fix={fix} />
          <div className="neu-bars" aria-hidden="true"><span>9:41</span><i /><em /></div>
          {show && NEU_LAYOUT.map((e) => (
            <div key={e.id} className={`neu-mark ${e.kind}`} style={{ left: e.x - 6, top: e.y - 6, width: e.w + 12, height: e.h + 12, borderRadius: e.r + 6 }}>
              {e.kind === "button" ? <b>{++n}</b> : <span>{L.not}</span>}
            </div>
          ))}
        </div>
      </div>
      <p className="neu-meter">{L.edge}: <b className={on ? "ok" : "bad"}>{on ? "3,45 : 1" : "1,7 : 1"}</b> · WCAG 1.4.11 — 3 : 1</p>
    </div>
  );
}

/** Бенто: одна разметка, карта grid-template-areas меняет раскладку. На узком экране — карта для телефона. */
function BentoDemo({ lang }: { lang: Lang }) {
  const [mode, setMode] = useState<"collage" | "bento">("bento");
  const [letters, setLetters] = useState(true);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const f = () => setNarrow(innerWidth < 640);
    f(); addEventListener("resize", f); return () => removeEventListener("resize", f);
  }, []);
  const layout = mode === "collage" ? LAYOUTS.collage : narrow ? LAYOUTS.phone : LAYOUTS.bento;
  const L = lang === "ru" ? { collage: "Коллаж", bento: "Бенто", letters: "Карта буквами" } : { collage: "Collage", bento: "Bento", letters: "Show the map" };
  return (
    <div className="bento-demo">
      <div className="bento-tools">
        <div className="seg">
          <button className={mode === "collage" ? "on" : ""} onClick={() => setMode("collage")}>{L.collage}</button>
          <button className={mode === "bento" ? "on" : ""} onClick={() => setMode("bento")}>{L.bento}</button>
        </div>
        <label className="bento-check"><input type="checkbox" checked={letters} onChange={(e) => setLetters(e.target.checked)} /> {L.letters}</label>
      </div>
      <div className="bento-stage" style={{ aspectRatio: narrow ? "3 / 5" : "4 / 3" }}>
        <Bento layout={layout} lang={lang} letters={letters} />
      </div>
      <pre className="bento-code">{`.grid { grid-template-areas: ${areasCss(layout)}; }\n.hero { grid-area: a; }`}</pre>
    </div>
  );
}

const RX: Record<Lang, ReactionsText> = {
  ru: { author: "Юнит", message: "Собрал реакции как в Телеграме — без единой библиотеки.", time: "18:00", hint: "Нажми на смайлик. Нажми на сообщение — панель вернётся.", me: "Ю" },
  en: { author: "Unit", message: "Built Telegram-style reactions — without a single library.", time: "18:00", hint: "Tap an emoji. Tap the message to bring the bar back.", me: "U" },
};

const PEEK: Record<Lang, PeekText> = {
  ru: { title: "Вход", email: "Почта", password: "Пароль", show: "Показать", hide: "Скрыть", submit: "Войти", done: "Готово ✓" },
  en: { title: "Sign in", email: "Email", password: "Password", show: "Show", hide: "Hide", submit: "Sign in", done: "Done ✓" },
};
const ROLL: Record<Lang, RollingText> = {
  ru: { like: "Нравится", liked: "Вам нравится" },
  en: { like: "Like", liked: "Liked" },
};

const LE: Record<Lang, LinkErasText> = {
  ru: { title: "World Wide Web", read: "Читай", link: "дальше", after: " — нажми на ссылку.", reset: "Сбросить «посещённую»", notes: {
    "1990": "WorldWideWeb на NeXT: чёрно-белый экран, ссылка — просто подчёркнутый текст.",
    "1993": "12 апреля 1993, Mosaic 0.13: синяя со сплошным подчёркиванием, посещённая — тёмно-фиолетовая с пунктиром.",
    "1994": "Netscape Navigator повторил Mosaic: синие ссылки на сером фоне.",
    "1995": "Internet Explorer 1.0 — тоже синие на сером.",
    today: "Стандарт HTML: :link #0000EE, :visited #551A8B. Почему синий — никто не записал." } },
  en: { title: "World Wide Web", read: "Read", link: "more", after: " — click the link.", reset: "Reset “visited”", notes: {
    "1990": "WorldWideWeb on NeXT: black and white, a link is just underlined text.",
    "1993": "April 12, 1993, Mosaic 0.13: blue with a solid underline, visited dark purple with a dashed one.",
    "1994": "Netscape Navigator followed Mosaic: blue links on grey.",
    "1995": "Internet Explorer 1.0 — blue on grey too.",
    today: "The HTML standard: :link #0000EE, :visited #551A8B. Why blue — nobody wrote it down." } },
};
const HB: Record<Lang, HamburgerText> = {
  ru: { width: "Ширина страницы", phone: "телефон: три полоски", desktop: "компьютер: меню целиком", menu: "Меню", close: "Закрыть", nav: ["Главная", "Блог", "Цены", "Контакты"], facts: [
    { year: "1981", text: "Норм Кокс рисует значок для Xerox Star: три строки — как список меню, который он открывает." },
    { year: "2009", text: "Телефоны: экран маленький, меню прячут за три полоски." },
    { year: "2016", text: "Nielsen Norman Group: на компьютере спрятанное меню открывают в 27% случаев, видимое — в 48%." } ] },
  en: { width: "Page width", phone: "phone: three lines", desktop: "desktop: the whole menu", menu: "Menu", close: "Close", nav: ["Home", "Blog", "Pricing", "Contact"], facts: [
    { year: "1981", text: "Norm Cox draws the icon for the Xerox Star: three lines, like the menu list it opens." },
    { year: "2009", text: "Phones: small screens, so the menu hides behind three lines." },
    { year: "2016", text: "Nielsen Norman Group: on desktop a hidden menu is used in 27% of cases, a visible one in 48%." } ] },
};
export const ITEMS: { id: string; name: L; about: L; short: string; file: string; demo: (lang: Lang) => ReactNode }[] = [
  { id: "hamburger-eras", name: { ru: "Гамбургер-меню старше веба: 1981", en: "The hamburger menu is older than the web: 1981" }, about: { ru: "Тяни ширину: уже 600 px меню прячется за три полоски, шире — показано целиком. Одно правило @container, без JS для раскладки. Под демо — три остановки истории значка.", en: "Drag the width: below 600px the menu hides behind three lines, wider it's shown in full. One @container rule, no JS for layout. Below the demo: three stops in the icon's history." }, short: "", file: "hamburger-eras", demo: (lang) => <HamburgerEras t={HB[lang]} /> },
  { id: "link-eras", name: { ru: "Почему ссылки синие: одна ссылка в 5 браузерах", en: "Why links are blue: one link in 5 browsers" }, about: { ru: "WorldWideWeb 1990 — чёрная подчёркнутая; Mosaic 0.13 (12.04.1993) — синяя, посещённая фиолетовая с пунктиром; Netscape и IE — копии; сегодня стандарт HTML: #0000EE и #551A8B. Нажми на ссылку — станет посещённой.", en: "WorldWideWeb 1990: black and underlined; Mosaic 0.13 (Apr 12, 1993): blue, visited purple and dashed; Netscape and IE copied it; today the HTML standard says #0000EE and #551A8B. Click the link to make it visited." }, short: "", file: "link-eras", demo: (lang) => <LinkEras t={LE[lang]} /> },
  { id: "rolling-like", name: { ru: "Лайк со счётчиком-барабаном", en: "Like button with a rolling counter" }, about: { ru: "Как просмотры на YouTube: каждая цифра — столбик 0–9 в окошке одной строки. Меняется число — столбики сдвигаются (transform), крутятся только изменившиеся цифры, справа налево с задержкой 60 мс.", en: "Like YouTube view counts: each digit is a 0–9 column behind a one-line window. When the number changes the columns slide (transform); only changed digits roll, right to left, 60 ms apart." }, short: "", file: "rolling-like", demo: (lang) => <RollingLike t={ROLL[lang]} /> },
  { id: "peek-login", name: { ru: "Робот не подглядывает в пароль", en: "A robot that won't peek at your password" }, about: { ru: "Форма входа с Юнитом: глаза следят за кареткой в поле почты, на поле пароля он закрывает экран ладонями, на «Показать» — подглядывает одним глазом. Только transform.", en: "A sign-in form with Unit: his eyes follow the caret in the email field, he covers his screen on the password field and peeks with one eye on “Show”. Transform only." }, short: "", file: "peek-login", demo: (lang) => <PeekLogin t={PEEK[lang]} /> },
  { id: "reactions", name: { ru: "Реакции как в Telegram: 3 анимации", en: "Telegram-style reactions: 3 animations" }, about: { ru: "Перенос: смайлик почти по прямой падает в плашку (0,12 с). Активация: вырастает в 1,42 раза, расходится кольцо. Эффект: свой у каждого — сердца, пламя, конфетти. Web Animations API, только transform и opacity.", en: "Transfer: the emoji drops into the chip almost in a straight line (0.12 s). Activation: it grows 1.42× and a ring spreads. Effect: each emoji has its own — hearts, flames, confetti. Web Animations API, only transform and opacity." }, short: "LLsAS_6bSJE", file: "reactions", demo: (lang) => <Reactions text={RX[lang]} /> },
  { id: "eras", name: { ru: "Айфон почти 20 лет по кругу: кожа → плоско → стекло", en: "The iPhone's circle: leather → flat → glass" }, about: { ru: "Один экран в трёх эпохах: скевоморфизм 2007, плоский iOS 7 и Liquid Glass 2025. Плоскую кнопку не узнать, стекло съедает контраст — Tinted его возвращает.", en: "One screen in three eras: 2007 skeuomorphism, flat iOS 7 and 2025 Liquid Glass. A flat button is hard to spot; glass eats contrast, and Tinted brings it back." }, short: "S7m12REY37I", file: "eras", demo: (lang) => <ErasDemo lang={lang} /> },
  { id: "clay", name: { ru: "Клейморфизм: 3 тени на кнопку", en: "Claymorphism: 3 shadows on a button" }, about: { ru: "Пластилиновая кнопка — это три тени: снаружи мягкая, внутри тёмная снизу справа и блик сверху слева. Белый текст на пастели — 1,8 : 1; тёмный того же оттенка — 7,8 : 1.", en: "A clay button is three shadows: a soft outer one, a dark inset at the bottom right and a highlight at the top left. White text on pastel is 1.8:1; a dark shade of the same hue is 7.8:1." }, short: "ThpBgr5dkaU", file: "clay", demo: (lang) => <ClayDemo lang={lang} /> },
  { id: "brutal", name: { ru: "Необрутализм: 0 размытий, 0 градиентов", en: "Neubrutalism: 0 blurs, 0 gradients" }, about: { ru: "Плоский цвет, рамка 3 px и жёсткая тень 6px 6px 0. Нажатие — кнопка садится в свою тень. Ярких цветов — два, а не пять.", en: "Flat color, a 3px border and a hard 6px 6px 0 shadow. On press the button sits into its shadow. Two bright colors, not five." }, short: "1uBXlyDk0-I", file: "brutal", demo: (lang) => <BrutalDemo lang={lang} /> },
  { id: "neu", name: { ru: "Неоморфизм: найди кнопки", en: "Neumorphism: find the buttons" }, about: { ru: "Кнопки того же цвета, что фон, и две тени: край 1,7 : 1. Рамка в 1 px, цвет главной кнопки и плитки без тени — и мягкость остаётся.", en: "Buttons in the background color with two shadows: the edge is 1.7:1. A 1px border, a colored main button and flat cards keep the softness." }, short: "q1_Kw0J78jM", file: "neu", demo: (lang) => <NeuDemo lang={lang} /> },
  { id: "bento", name: { ru: "Бенто-сетка: 2 строки CSS", en: "Bento grid: 2 lines of CSS" }, about: { ru: "Карта раскладки буквами в grid-template-areas: коллаж, бенто и телефон — одна разметка.", en: "The layout map in grid-template-areas: collage, bento and phone from one markup." }, short: "6o7kNb_TJIA", file: "bento", demo: (lang) => <BentoDemo lang={lang} /> },
  { id: "material", name: { ru: "Material You: палитра из обоев", en: "Material You: palette from wallpaper" }, about: { ru: "Один цвет → 29 ролей интерфейса. Функция Google themeFromSourceColor, контраст считается сам.", en: "One color → 29 UI roles. Google's themeFromSourceColor, contrast handled for you." }, short: "D_9AeA0thmY", file: "material-you", demo: (lang) => <MaterialDemo lang={lang} /> },
  { id: "card", name: { ru: "Карточка → страница", en: "Card → page" }, about: { ru: "Картинка и заголовок перелетают на новую страницу. View Transitions API, без библиотек.", en: "The image and title fly into the new page. View Transitions API, no libraries." }, short: "-ChwLWTUI4E", file: "card-transition", demo: (lang) => <Phone><CardsDemo lang={lang} /></Phone> },
  { id: "island", name: { ru: "Dynamic Island", en: "Dynamic Island" }, about: { ru: "Капсула превращается в таймер, плеер и звонок. Пружина — CSS linear().", en: "The pill morphs into a timer, a player and a call. The spring is CSS linear()." }, short: "BJfNxnVbyAA", file: "dynamic-island", demo: (lang) => <div className="iphone-frame island-scale"><IslandPhone text={ISLAND[lang]} /></div> },
  { id: "range-picker", name: { ru: "Выбор диапазона дат", en: "Date range picker" }, about: { ru: "Два месяца, подсветка при наведении, лента месяцев, пресеты.", en: "Two months, hover preview, sliding months, presets." }, short: "qNPflv57UsI", file: "range-picker", demo: (lang) => <RangeDemo lang={lang} /> },
  { id: "magnetic", name: { ru: "Магнитная кнопка", en: "Magnetic button" }, about: { ru: "Тянется за курсором и пружинит обратно.", en: "Follows the cursor and springs back." }, short: "38HDRVJWjA8", file: "MagneticButton.tsx", demo: (lang) => <Duel lang={lang} /> },
  { id: "tilt", name: { ru: "3D-карточка", en: "3D tilt card" }, about: { ru: "Наклоняется за курсором, perspective + rotate.", en: "Tilts after the cursor with perspective and rotate." }, short: "_QfrxuaAH7I", file: "TiltCard.tsx", demo: (lang) => <TiltCard title="3D Card" sub={lang === "ru" ? "Наведи и поводи" : "Hover and move"} /> },
  { id: "password", name: { ru: "Поле пароля с лицом", en: "Password field with a face" }, about: { ru: "Лицо пугается слабого пароля и улыбается надёжному.", en: "The face panics at weak passwords and smiles at strong ones." }, short: "XY2tdBYOjA0", file: "PasswordFace.tsx", demo: (lang) => <PasswordFace t={PW[lang]} /> },
  { id: "toggle", name: { ru: "Переключатель день/ночь", en: "Day/night toggle" }, about: { ru: "Солнце становится луной одной внутренней тенью.", en: "The sun becomes a moon with one inset shadow." }, short: "HoWS3tF59pc", file: "ThemeToggle.tsx", demo: (lang) => <ToggleDemo lang={lang} /> },
  { id: "runaway", name: { ru: "Убегающая кнопка", en: "Runaway button" }, about: { ru: "Кнопка «Подписаться», которую нельзя нажать.", en: "A Subscribe button you can't click." }, short: "L5WUOrv_Ojs", file: "RunawayButton.tsx", demo: (lang) => <RunawayButton>{lang === "ru" ? "Подписаться" : "Subscribe"}</RunawayButton> },
];

function RangeDemo({ lang }: { lang: Lang }) {
  const [range, setRange] = useState<Range>({ start: null, end: null });
  const fmt = new Intl.DateTimeFormat(locale(lang), { weekday: "short", day: "numeric", month: "short" });
  const L = lang === "ru" ? ["Заезд", "Выезд", "Выберите дату"] : ["Check-in", "Check-out", "Add date"];
  return (
    <div className="rp-card">
      <div className="fields">
        {[range.start, range.end].map((v, i) => (
          <div key={i} className={`field ${(i === 0 && !range.start) || (i === 1 && range.start && !range.end) ? "active" : ""}`}>
            <small>{L[i]}</small>
            <b className={v ? "" : "muted"}>{v ? fmt.format(v) : L[2]}</b>
          </div>
        ))}
      </div>
      <RangePicker lang={lang} today={TODAY} value={range} onChange={setRange} />
    </div>
  );
}

function ToggleDemo({ lang }: { lang: Lang }) {
  const [night, setNight] = useState(false);
  return <ThemeToggle checked={night} onChange={setNight} labels={lang === "ru" ? ["День", "Ночь"] : ["Day", "Night"]} />;
}

const PW: Record<Lang, { placeholder: string; empty: string; moods: string[]; checks: string[] }> = {
  ru: { placeholder: "Попробуй 1234", empty: "Введи пароль", moods: ["Ужас", "Слабо", "Сойдёт", "Надёжно"], checks: ["Длина от 8", "Длина от 12", "Aa — разный регистр", "Цифры", "Символы !@#"] },
  en: { placeholder: "Try 1234", empty: "Type a password", moods: ["Awful", "Weak", "Okay", "Strong"], checks: ["8+ characters", "12+ characters", "Aa — mixed case", "Digits", "Symbols !@#"] },
};

/** Дуэль из шортса: обычная кнопка против магнитной, считаем попадания. */
function Duel({ lang }: { lang: Lang }) {
  const [n, setN] = useState([0, 0]);
  const hit = (i: number) => setN((v) => v.map((x, j) => (j === i ? x + 1 : x)));
  const L = lang === "ru" ? { label: "Подписаться", tags: ["обычная", "магнитная"], hint: "Жми быстро в обе" } : { label: "Subscribe", tags: ["regular", "magnetic"], hint: "Click both fast" };
  return (
    <div className="duel">
      {[0, 1].map((i) => (
        <div key={i} className="duel-side" style={{ order: i * 2 }}>
          <div className="duel-head">
            <span className={`duel-tag ${i ? "hot" : ""}`}>{L.tags[i]}</span>
            <b className="duel-count">{n[i]}</b>
          </div>
          <MagneticButton flat={i === 0} onClick={() => hit(i)}>{L.label}</MagneticButton>
        </div>
      ))}
      <span className="duel-vs" style={{ order: 1 }}>VS</span>
    </div>
  );
}

/** Корпус iPhone 15 Pro: остров, строка статуса и полоска «домой»; контент — только в безопасной зоне. */
const Phone = ({ children }: { children: ReactNode }) => (
  <div className="phone-scale">
    <div className="phone">
      <div className="phone-status" aria-hidden="true"><span>9:41</span><span className="phone-icons"><Signal /><Battery /></span></div>
      <div className="phone-island" aria-hidden="true" />
      <div className="phone-safe">{children}</div>
      <i className="phone-home" aria-hidden="true" />
    </div>
  </div>
);

export function App() {
  const [lang, setLang] = useLang();
  // ?rec=island — экран телефона во всё окно для записи шортса
  // &z=2 — увеличение для чёткой записи (скринкаст пишет в CSS-пикселях)
  // &slowvt — переход в 3 раза медленнее (для slow-mo в ролике)
  if (q.get("rec") === "my") return <div style={{ zoom: Number(q.get("z") ?? 1) }}><MaterialRec lang={lang} /></div>;
  if (q.get("rec") === "card") return <div style={{ zoom: Number(q.get("z") ?? 1) }}>{q.has("slowvt") && <style>{"::view-transition-group(*){animation-duration:1.65s}"}</style>}<CardsDemo lang={lang} animate={!q.has("jump")} full={q.has("full")} /></div>;
  // ?view=card — компонент во всё окно (проверка адаптива и скриншоты для README)
  if (q.get("view") === "card") return <div style={{ minHeight: "100vh", background: "#f4f2f8" }}><CardTransition heading={PLACES[lang].title} places={PLACES[lang].places} labels={PLACES[lang].labels} /></div>;
  if (q.get("rec") === "island") return <div style={{ zoom: Number(q.get("z") ?? 1) }}><IslandPhone text={ISLAND[lang]} /></div>;
  const repo = "https://arthurkrantsevich.github.io/neuropilot/#";
  return (
    <div className="page">
      <header className="top">
        <div>
          <h1>{G.title[lang]}</h1>
          <p>{G.lead[lang]}</p>
        </div>
        <div className="seg" role="radiogroup" aria-label="Language">
          {(["ru", "en"] as const).map((l) => (
            <button key={l} role="radio" aria-checked={lang === l} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>
      <nav className="chips" aria-label="Components">
        {ITEMS.map((it) => <a key={it.id} href={`#${it.id}`}>{it.name[lang]}</a>)}
      </nav>
      {ITEMS.map((it) => (
        <section key={it.id} id={it.id} className={`item ${it.id === "range-picker" ? "wide" : ""}`}>
          <div className="item-head">
            <div>
              <h2>{it.name[lang]}</h2>
              <p>{it.about[lang]}</p>
            </div>
            <div className="links">
              {it.short && <a href={`https://youtube.com/shorts/${it.short}`}>▶ {G.watch[lang]}</a>}
              <a href={repo + it.file}>{G.code[lang]} →</a>
            </div>
          </div>
          <div className="demo">{it.demo(lang)}</div>
        </section>
      ))}
    </div>
  );
}
