"use client";
// Главная: слева Юнит сидит спиной к нам на бревне у края парящего острова, болтает ножками над пустотой
// и смотрит в небо — на планету и падающие звёзды. Наводишь на карточку — оглядывается через плечо,
// на экране тема карточки. Справа — бенто из всех компонентов: свёрнуты — описание, развёрнуты — живое демо;
// у каждой «Код», «.zip» и общие лайки.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { FPS, FrameContext } from "../shims/remotion";
import { Unit3, type Frame, type V3 } from "../studio/mascot/spike/RigSpike";
import { clipFrames } from "../studio/mascot/spike/CatalogSpike";
import { type Pose2 } from "../studio/mascot/robot2";
import { jitter, VoxelLookContext, Voxels, type Vox } from "../studio/mascot/voxel";
import { ITEMS } from "../gallery/demos";
import { Card, CodeModal } from "./Card";
import { Masonry } from "./Masonry";
import { loadCounts, myVotes, type Counts, type Vote } from "./likes";
import { releaseAt } from "./releases";
import { apply, type Sort, type Tag } from "./filters";
import { Empty, Toolbar } from "./Toolbar";
import "../gallery/gallery.css";

const smooth = (x: number) => x * x * (3 - 2 * x);
const frac = (x: number) => x - Math.floor(x);
const rnd = (i: number, k: number) => frac(Math.sin(i * 127.1 + k * 311.7) * 43758.5453);

function useClock() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      setFrame(Math.floor(((performance.now() - t0) / 1000) * FPS));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return frame;
}

// ---------- мир: бревно у края острова (верх бревна — y = 0); Юнит спиной к камере, смотрит вдаль (−z) ----------
const LIFT = -1.65;
const YAW = 0; // лицом к нам

const logCells = (): Vox[] => {
  const out: Vox[] = [];
  for (let x = -7; x <= 7; x++)
    for (let y = -2; y <= 2; y++)
      for (let z = -2; z <= 2; z++) {
        const d = Math.hypot(y, z);
        if (d > 1.9 || (d < 0.9 && Math.abs(x) !== 7)) continue;
        const end = Math.abs(x) === 7;
        out.push([x, y, z, jitter(end ? (d < 1 ? "#D9B07A" : "#B88A57") : (x + y) % 3 === 0 ? "#6B4A2E" : "#7A5535", `g${x}${y}${z}`, 0.08)]);
      }
  return out;
};
// остров уходит за спину Юнита; передний край — сразу перед бревном, ножки висят над пустотой к нам
const islandCells = (): Vox[] => {
  const out: Vox[] = [];
  for (let x = -10; x <= 10; x++)
    for (let z = -13; z <= 0; z++) {
      const r = Math.hypot(x / 10.5, (z + 6) / 7);
      if (r > 1) continue;
      const depth = 2 + Math.round((1 - r) * 8 + rnd(x * 31 + z, 1) * 2);
      for (let y = 0; y >= -depth; y--)
        out.push([x, y, z, jitter(y === 0 ? (rnd(x, z) > 0.2 ? "#4C7F52" : "#5A8F5C") : ["#3A3F4C", "#454B59", "#2F3440"][(((x + z + y) % 3) + 3) % 3] /* остаток от отрицательных координат — тоже 0..2 */, `i${x}${y}${z}`, 0.08)]);
    }
  return out;
};
const planetCells = (): Vox[] => {
  const out: Vox[] = [];
  for (let x = -8; x <= 8; x++)
    for (let y = -8; y <= 8; y++)
      for (let z = -8; z <= 8; z++) {
        const d = Math.hypot(x, y, z);
        if (d > 8 || d < 6.8) continue;
        out.push([x, y, z, jitter(Math.sin(y * 0.9 + x * 0.15) > 0.3 ? "#C97B5E" : "#E3A07A", `p${x}${y}${z}`, 0.07)]);
      }
  for (let i = 0; i < 140; i++) {
    const a = (i / 140) * Math.PI * 2;
    out.push([Math.cos(a) * 12.5, Math.sin(a) * 1.8, Math.sin(a) * 4.2, jitter("#9FB4E0", `r${i}`, 0.1)]);
  }
  return out;
};
const PLANET: V3 = [-14, 26, -80];

const Stars: React.FC<{ t: number; day: number }> = ({ t, day }) => {
  const g = useMemo(() => {
    const n = 1800;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = rnd(i, 1) * 2 - 1;
      const th = rnd(i, 2) * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = 220 * s * Math.cos(th);
      pos[i * 3 + 1] = 220 * u;
      pos[i * 3 + 2] = 220 * s * Math.sin(th);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);
  return (
    <points geometry={g}>
      <pointsMaterial color="#FFFFFF" size={1.1} sizeAttenuation transparent opacity={(0.65 + 0.3 * Math.sin(t * 1.4)) * (1 - day * 0.85)} toneMapped={false} />
    </points>
  );
};
// падающая звезда раз в ~8 с — Юнит провожает её головой
const SHOOT = 8;
const shootAt = (t: number) => {
  const k = Math.floor(t / SHOOT);
  const ph = (t - k * SHOOT - 2) / 1.2;
  const a: V3 = [-20 + rnd(k, 4) * 30, 30 + rnd(k, 5) * 10, -70];
  const b: V3 = [a[0] + 30, a[1] - 12, -70];
  return { ph, a, b };
};
const ShootingStar: React.FC<{ t: number }> = ({ t }) => {
  const { ph, a, b } = shootAt(t);
  if (ph < 0 || ph > 1) return null;
  const e = smooth(ph);
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], 0).normalize();
  const len = 7 * Math.sin(ph * Math.PI);
  const head = new THREE.Vector3(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2]);
  const mid = head.clone().addScaledVector(dir, -len / 2);
  return (
    <mesh position={mid} rotation={[0, 0, Math.atan2(dir.y, dir.x)]}>
      <boxGeometry args={[Math.max(0.01, len), 0.2, 0.2]} />
      <meshBasicMaterial color="#FFF4D6" toneMapped={false} transparent opacity={Math.sin(ph * Math.PI)} />
    </mesh>
  );
};

// экран Юнита под тему карточки
const THEME: Record<string, Pose2["screen"]> = {
  "rolling-like": "thumb",
  reactions: "heart",
  "peek-login": "wink",
  password: "error",
  runaway: "laugh",
  toggle: "bulb",
  island: "timer",
  "hamburger-eras": "think",
  "link-eras": "ask",
  material: "stars",
  magnetic: "love",
  tilt: "confused",
};
// тег выбран — на экране Юнита его тема; ищем — вопрос; пусто — недоумение
const TAG_SCREEN: Record<Tag, Pose2["screen"]> = { styles: "stars", motion: "bolt", forms: "check", layout: "code", history: "think" };
export type Mood = { screen: Pose2["screen"]; strong: boolean } | null;
const WIDE = new Set(["hamburger-eras", "eras", "bento", "range-picker", "material", "clay", "brutal", "neu", "link-eras", "card", "reactions"]);

const Rig: React.FC<{ pointer: { x: number; y: number }; portrait: boolean }> = ({ pointer, portrait }) => {
  const { camera, gl, scene } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.NeutralToneMapping;
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.35;
    return () => {
      env.dispose();
      pm.dispose();
    };
  }, [gl, scene]);
  const cam = camera as THREE.PerspectiveCamera;
  // строго сзади: камера смотрит туда же, куда Юнит; сдвинута вправо — он в левой трети
  const x = portrait ? 0 : 9;
  cam.position.set(x + pointer.x * 1.2, 7 + pointer.y * 0.8, portrait ? 30 : 28);
  cam.fov = portrait ? 58 : 44;
  cam.lookAt(x, 8.5, -30);
  cam.updateProjectionMatrix();
  return null;
};

/** 3D-сцена со своими часами: 60 раз в секунду перерисовывается только она, колонка с демо — нет. */
const Scene: React.FC<{ hotId: string | null; portrait: boolean; mood: Mood }> = ({ hotId, portrait, mood }) => {
  const frame = useClock();
  const t = frame / FPS;
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  // когда навели на новую карточку — запоминаем момент для шторки экрана
  const hotRef = useRef<{ id: string; at: number } | null>(null);
  if ((hotRef.current?.id ?? null) !== hotId) hotRef.current = hotId ? { id: hotId, at: t } : null;
  const hot = hotRef.current;
  // настроение от поиска: запоминаем момент смены для шторки экрана
  const moodRef = useRef<{ s: Pose2["screen"]; at: number } | null>(null);
  if ((moodRef.current?.s ?? null) !== (mood?.screen ?? null)) moodRef.current = mood ? { s: mood.screen, at: t } : null;
  const md = moodRef.current;
  // ищем или ничего не нашлось — это главнее карточки под курсором
  const strong = !!mood?.strong;
  const look = useRef({ yaw: 0, pitch: 0 });
  const lastMove = useRef(-99);
  const [poke, setPoke] = useState<{ s: Pose2["screen"]; at: number } | null>(null);
  const dayK = useRef(0);
  const log = useMemo(logCells, []);
  const island = useMemo(islandCells, []);
  const planet = useMemo(planetCells, []);
  const sit = useMemo(() => {
    const c = clipFrames("sit");
    return c[c.length - 1];
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      setPointer({ x: (e.clientX / window.innerWidth) * 2 - 1, y: -((e.clientY / window.innerHeight) * 2 - 1) });
      lastMove.current = performance.now() / 1000;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  dayK.current += ((hot?.id === "toggle" ? 1 : 0) - dayK.current) * 0.04;
  const day = dayK.current;
  // взгляд: карточка — смотрит на неё; мышь — на курсор; иначе — на нас и иногда на звёзды
  const moving = performance.now() / 1000 - lastMove.current < 2.5;
  const target =
    md && strong && !portrait
      ? { yaw: 0.8, pitch: -0.22 } // смотрит на строку поиска справа вверху
      : hot && !portrait
      ? { yaw: 0.75, pitch: 0.05 } // смотрит на карточки справа
      : moving
        ? { yaw: pointer.x * 0.8, pitch: -pointer.y * 0.35 } // следит за курсором
        : Math.sin(t * 0.21) > 0.55
          ? { yaw: -0.2 + 0.1 * Math.sin(t * 0.5), pitch: -0.55 } // поглядывает на звёзды
          : { yaw: 0.1 * Math.sin(t * 0.17), pitch: 0.02 * Math.sin(t * 0.31) };
  look.current.yaw += (target.yaw - look.current.yaw) * 0.06;
  look.current.pitch += (target.pitch - look.current.pitch) * 0.06;

  function screenOf(): { screen: Pose2["screen"]; screenSince: number } {
    const since = (x: number) => Math.round(x * FPS);
    if (poke && t - poke.at < 2.2) return { screen: poke.s, screenSince: since(poke.at) };
    if (md && strong) return { screen: md.s, screenSince: since(md.at) };
    if (hot && THEME[hot.id]) return { screen: THEME[hot.id], screenSince: since(hot.at) };
    if (md) return { screen: md.s, screenSince: since(md.at) };
    return { screen: "face", screenSince: -999 };
  }
  const swing = (ph: number) => 0.3 * Math.sin(t * 2.0 + ph);
  const f: Frame = {
    ...sit,
    pos: [0, 0, 0],
    lift: LIFT,
    yaw: YAW,
    headYaw: look.current.yaw,
    headPitch: look.current.pitch,
    squash: 0.012 * Math.sin(t * 2.4),
    legL: { ...sit.legL, knee: sit.legL.knee + swing(0) },
    legR: { ...sit.legR, knee: sit.legR.knee + swing(2.4) },
    eye: "open",
    ...screenOf(),
    screenPrev: "face",
  };

  return (
    <FrameContext.Provider value={frame}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 25% 15%, ${day > 0.5 ? "#7FA8E8" : "#1B1F3A"} 0%, ${day > 0.5 ? "#3E5E9E" : "#090B16"} 55%, #04050A 100%)` }}>
        <div style={{ position: "absolute", inset: portrait ? "0 0 62% 0" : 0 }}>
          <Canvas dpr={[1, 1.5]} camera={{ fov: 44, near: 0.3, far: 700 }} gl={{ alpha: true }}>
            <Rig pointer={pointer} portrait={portrait} />
            <hemisphereLight args={["#9DB4FF", "#0A0D14", 0.55 + day * 0.6]} />
            <directionalLight position={[-6, 16, -12]} intensity={1.4 + day * 1.2} color={day > 0.5 ? "#FFF2DC" : "#CFE0FF"} />
            <pointLight position={[2.8, 1.2, 0.4]} intensity={20} color="#FFB36B" distance={14} />
            <Stars t={t} day={day} />
            <ShootingStar t={t} />
            <group position={PLANET} rotation={[0.25, t * 0.05, 0.35]}>
              <VoxelLookContext.Provider value={{ kind: "basic", bevel: 0.1 }}>
                <Voxels cells={planet} emissive="#3A1A10" emissiveIntensity={0.35} />
              </VoxelLookContext.Provider>
            </group>
            <VoxelLookContext.Provider value={{ kind: "basic", bevel: 0.12 }}>
              <group position={[0, -1.7, 0.6]}>
                <Voxels cells={island} roughness={0.95} />
              </group>
              <group position={[0, -0.85, -0.75]}>
                <Voxels cells={log} size={0.45} roughness={0.9} />
              </group>
            </VoxelLookContext.Provider>
            {/* фонарик у бревна — тёплый свет сбоку */}
            <mesh position={[2.8, -1.0, -1.6]}>
              <boxGeometry args={[0.5, 0.7, 0.5]} />
              <meshBasicMaterial color="#FFC98A" toneMapped={false} />
            </mesh>
            <VoxelLookContext.Provider value={{ kind: "toy", bevel: 0.14 }}>
              {/* клик по Юниту — эмоция */}
              <group onClick={(e) => { e.stopPropagation(); const s = (["love", "laugh", "stars", "wink"] as const)[Math.floor(Math.random() * 4)]; setPoke({ s, at: t }); }}>
                <Unit3 f={f} frame={frame} />
              </group>
            </VoxelLookContext.Provider>
            <EffectComposer multisampling={4}>
              <Bloom intensity={0.95} luminanceThreshold={0.6} mipmapBlur />
            </EffectComposer>
          </Canvas>
        </div>
      </div>
    </FrameContext.Provider>
  );
};

export default function BentoHome() {
  const [portrait, setPortrait] = useState(false);
  const [hotId, setHotId] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(() => new Set(["peek-login", "rolling-like"]));
  const [code, setCode] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, Counts>>({});
  const [votes, setVotes] = useState<Record<string, Vote>>({});
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<Tag | null>(null);
  const [sort, setSort] = useState<Sort>("new");
  const [focus, setFocus] = useState(false);
  // поиск живёт в адресе: ?q=тень&tag=styles&sort=popular — можно отправить ссылку
  useEffect(() => {
    const u = new URLSearchParams(location.search);
    setQ(u.get("q") ?? "");
    const tg = u.get("tag") as Tag | null;
    if (tg && ["styles", "motion", "forms", "layout", "history"].includes(tg)) setTag(tg);
    const so = u.get("sort") as Sort | null;
    if (so && ["new", "popular", "soon"].includes(so)) setSort(so);
  }, []);
  useEffect(() => {
    const u = new URLSearchParams();
    if (q.trim()) u.set("q", q.trim());
    if (tag) u.set("tag", tag);
    if (sort !== "new") u.set("sort", sort);
    const qs = u.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }, [q, tag, sort]);
  const list = useMemo(
    () => apply(ITEMS.map((it, i) => ({ ...it, n: i + 1, title: it.name.ru, about: it.about.ru })), q, tag, sort, Date.now()),
    [q, tag, sort],
  );
  const mood: Mood =
    (q.trim() || tag) && list.length === 0
      ? { screen: "confused", strong: true }
      : focus || q.trim()
        ? { screen: "ask", strong: true }
        : tag
          ? { screen: TAG_SCREEN[tag], strong: false }
          : null;
  useEffect(() => {
    setVotes(myVotes());
    loadCounts().then(setCounts);
    const onSize = () => setPortrait(window.innerWidth < window.innerHeight);
    onSize();
    window.addEventListener("resize", onSize);
    return () => window.removeEventListener("resize", onSize);
  }, []);
  const closeCode = useCallback(() => setCode(null), []);
  // прямая ссылка из ролика: …/neuropilot/#peek-login — раскрыть эту карточку и прокрутить к ней
  useEffect(() => {
    const go = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!ITEMS.some((x) => x.id === id)) return;
      setOpen((s) => new Set(s).add(id));
      setHotId(id);
      // кладка ставит карточки после замера высот — даём ей кадр-другой
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 700);
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#04050A" }}>
      <Scene hotId={hotId} portrait={portrait} mood={mood} />
        {/* бенто справа */}
        <div
          className="np-scroll"
          onMouseLeave={() => setHotId(null)}
          style={{
            position: "absolute",
            top: portrait ? "38%" : 0,
            bottom: 0,
            right: 0,
            left: portrait ? 0 : "auto",
            width: portrait ? "auto" : "min(1040px, 56vw)",
            overflowY: "auto",
            padding: portrait ? "16px" : "6vh 4vw 6vh 0",
            boxSizing: "border-box",
          }}
        >
          <div style={{ fontFamily: "var(--pixel)", fontSize: portrait ? 34 : 52, color: "#F4F0EA", letterSpacing: 2, textShadow: "4px 4px 0 #9C4A31" }}>NeuroPilot</div>
          <div style={{ fontFamily: "var(--golos)", fontSize: 18, color: "#AEB6C8", margin: "6px 0 24px" }}>
            Канал, который ведёт ИИ. Здесь живут компоненты из роликов — все {ITEMS.length}: потрогай, забери код, оцени.
          </div>
          <Toolbar q={q} setQ={setQ} tag={tag} setTag={setTag} sort={sort} setSort={setSort} found={list.length} total={ITEMS.length} compact={portrait} onFocus={setFocus} />
          {list.length === 0 && <Empty q={q.trim()} onHint={(h) => (setQ(h), setTag(null))} />}
          <Masonry
            columns={portrait ? 1 : 2}
            gap={24}
            items={list.map((it) => ({
              key: it.id,
              full: WIDE.has(it.id) && open.has(it.id) && releaseAt(it.id) <= Date.now(),
              node: (
              <Card
                n={it.n}
                id={it.id}
                title={it.title}
                about={it.about}
                query={q}
                open={open.has(it.id)}
                wide={!portrait && WIDE.has(it.id)}
                lockedUntil={releaseAt(it.id) > Date.now() ? releaseAt(it.id) : 0}
                onToggle={() =>
                  setOpen((s) => {
                    const n = new Set(s);
                    if (n.has(it.id)) n.delete(it.id);
                    else n.add(it.id);
                    return n;
                  })
                }
                onHover={() => setHotId(it.id)}
                onCode={() => setCode(it.id)}
                counts={counts[it.id] ?? { up: 0, down: 0 }}
                vote={votes[it.id] ?? 0}
                onVoted={(v, c) => {
                  const prev = votes[it.id] ?? 0;
                  setVotes((s) => ({ ...s, [it.id]: v }));
                  setCounts((s) => {
                    const cur = s[it.id] ?? { up: 0, down: 0 };
                    // сервер прислал свежие числа — берём их; нет сервера — считаем у себя
                    const local = { up: cur.up + (v === 1 ? 1 : 0) - (prev === 1 ? 1 : 0), down: cur.down + (v === -1 ? 1 : 0) - (prev === -1 ? 1 : 0) };
                    return { ...s, [it.id]: c ?? local };
                  });
                }}
              >
                {it.demo("ru")}
              </Card>
              ),
            }))}
          />
        </div>
        {code && <CodeModal id={code} title={ITEMS.find((x) => x.id === code)?.name.ru ?? code} onClose={closeCode} />}
    </div>
  );
}
