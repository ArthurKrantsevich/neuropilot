"use client";
// Главная как меню в игре: слева Юнит сидит на парящем уступе в ночной пустоте и смотрит на звёзды,
// справа — колонка карточек с компонентами канала. Мышь или стрелки ↑↓, Enter — открыть.
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { FPS, FrameContext } from "../shims/remotion";
import { Unit3, armIK, shoulderMatrix, type Frame, type V3 } from "../studio/mascot/spike/RigSpike";
import { clipFrames } from "../studio/mascot/spike/CatalogSpike";
import { jitter, VoxelLookContext, Voxels, type Vox } from "../studio/mascot/voxel";
import { DEMO_BASE, ITEMS } from "./components";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => x * x * (3 - 2 * x);
const frac = (x: number) => x - Math.floor(x);
const rnd = (i: number, k: number) => frac(Math.sin(i * 127.1 + k * 311.7) * 43758.5453);

// ---------- живые часы: кадр = секунды × 60 ----------
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

// ---------- уступ: два яруса камня — сиденье сзади, ступенька для ног спереди ----------
const STONE = ["#3A3F4C", "#454B59", "#2F3440"];
const ledge = (): Vox[] => {
  const out: Vox[] = [];
  for (let x = -4; x <= 4; x++)
    for (let z = -5; z <= 3; z++) {
      const r = Math.hypot(x / 4.6, (z + 1) / 4.6);
      if (r > 1) continue;
      const top = z <= -1 ? 1 : -1; // задняя часть — сиденье (верх на 1.65), передняя — ступенька у ног
      const depth = 3 + Math.round(rnd(x * 13 + z, 3) * 3) + Math.round((1 - r) * 4);
      for (let y = top; y >= top - depth; y--) out.push([x, y, z, jitter(STONE[(x + z + y + 9) % 3], `l${x}${y}${z}`, 0.08)]);
    }
  return out;
};
// мох и пара кристаллов — чтобы камень жил
const moss = (): Vox[] => {
  const out: Vox[] = [];
  for (let i = 0; i < 26; i++) {
    const x = Math.round(rnd(i, 1) * 8 - 4);
    const z = Math.round(rnd(i, 2) * 8 - 5);
    if (Math.hypot(x / 4.6, (z + 1) / 4.6) > 0.95) continue;
    out.push([x, z <= -1 ? 1.55 : -0.45, z, jitter("#4F8A5B", `m${i}`, 0.1)]);
  }
  return out;
};

// ---------- небо: звёзды мерцают, падающая звезда раз в ~9 с ----------
const Stars: React.FC<{ t: number }> = ({ t }) => {
  const layers = useMemo(
    () =>
      [0, 1].map((L) => {
        const n = 900;
        const pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const u = rnd(i + L * 1000, 1) * 2 - 1;
          const th = rnd(i + L * 1000, 2) * Math.PI * 2;
          const r = 160;
          const s = Math.sqrt(1 - u * u);
          pos[i * 3] = r * s * Math.cos(th);
          pos[i * 3 + 1] = Math.abs(r * u) * 0.9 + 6; // звёзды над горизонтом
          pos[i * 3 + 2] = r * s * Math.sin(th) - 40;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        return g;
      }),
    [],
  );
  return (
    <>
      {layers.map((g, L) => (
        <points key={L} geometry={g}>
          <pointsMaterial color={L ? "#BFD7FF" : "#FFFFFF"} size={L ? 0.7 : 1.05} sizeAttenuation transparent opacity={0.55 + 0.4 * Math.sin(t * (1.3 + L) + L * 2)} toneMapped={false} />
        </points>
      ))}
    </>
  );
};
const SHOOT_EVERY = 9;
export const shootAt = (t: number) => {
  const k = Math.floor(t / SHOOT_EVERY);
  const ph = (t - k * SHOOT_EVERY) / 1.1; // 1,1 с полёт
  const a: V3 = [20 + rnd(k, 4) * 30, 34 + rnd(k, 5) * 12, -60];
  const b: V3 = [a[0] - 34, a[1] - 14, -60];
  return { k, ph, a, b };
};
const ShootingStar: React.FC<{ t: number }> = ({ t }) => {
  const { ph, a, b } = shootAt(t);
  if (ph < 0 || ph > 1) return null;
  const e = smooth(ph);
  const head: V3 = [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2]];
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], 0).normalize();
  const len = 7 * Math.sin(ph * Math.PI);
  const mid = new THREE.Vector3(...head).addScaledVector(dir, -len / 2);
  return (
    <mesh position={mid} rotation={[0, 0, Math.atan2(dir.y, dir.x)]}>
      <boxGeometry args={[Math.max(0.01, len), 0.18, 0.18]} />
      <meshBasicMaterial color="#FFF4D6" toneMapped={false} transparent opacity={Math.sin(ph * Math.PI)} />
    </mesh>
  );
};
// пиксельная планета с кольцом — на неё смотрит Юнит
const PLANET: V3 = [-26, 32, -70];
const planetCells = (): Vox[] => {
  const out: Vox[] = [];
  const R = 7;
  for (let x = -R; x <= R; x++)
    for (let y = -R; y <= R; y++)
      for (let z = -R; z <= R; z++) {
        const d = Math.hypot(x, y, z);
        if (d > R || d < R - 1.2) continue;
        const band = Math.sin(y * 0.9 + x * 0.15) > 0.3;
        out.push([x, y, z, jitter(band ? "#C97B5E" : "#E3A07A", `p${x}${y}${z}`, 0.07)]);
      }
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    out.push([Math.cos(a) * 11, Math.sin(a) * 1.6, Math.sin(a) * 11 * 0.35 + 0.0, jitter("#9FB4E0", `r${i}`, 0.1)]);
  }
  return out;
};
// дрейфующие кубики в глубине — как за порталом
const Drift: React.FC<{ t: number }> = ({ t }) => (
  <>
    {Array.from({ length: 34 }, (_, i) => {
      const p: V3 = [rnd(i, 1) * 140 - 75, rnd(i, 2) * 50 - 10 + Math.sin(t * 0.3 + i) * 0.8, -45 - rnd(i, 3) * 70];
      const s = 0.4 + rnd(i, 4) * 1.4;
      return (
        <mesh key={i} position={p} rotation={[t * 0.1 + i, t * 0.13 + i * 2, 0]} scale={s}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={i % 5 === 0 ? "#2B5FA8" : "#1A2233"} emissive={i % 5 === 0 ? "#2B5FA8" : "#000000"} emissiveIntensity={0.6} roughness={0.6} />
        </mesh>
      );
    })}
  </>
);

// ---------- камера и окружение ----------
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
  // Юнит на левой трети кадра; на телефоне — по центру
  const at: V3 = portrait ? [-1, 9.5, 0] : [9, 10, 0];
  cam.position.set(at[0] + 3 + pointer.x * 1.6, at[1] - 4 + pointer.y * 1, portrait ? 52 : 46);
  cam.fov = portrait ? 56 : 40;
  cam.lookAt(...at);
  cam.updateProjectionMatrix();
  return null;
};

// ---------- сцена ----------
export default function SpaceHome() {
  const frame = useClock();
  const t = frame / FPS;
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [sel, setSel] = useState(-1);
  const [portrait, setPortrait] = useState(false);
  const [face, setFace] = useState<{ s: Frame["screen"]; at: number }>({ s: "face", at: -99 });
  const lastMove = useRef(-99);
  const look = useRef({ yaw: 0, pitch: -0.45 });
  const arm = useRef(0);
  const ledgeCells = useMemo(ledge, []);
  const planet = useMemo(planetCells, []);
  const mossCells = useMemo(moss, []);
  const sit = useMemo(() => {
    const c = clipFrames("sit");
    return c[c.length - 1];
  }, []);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onSize = () => setPortrait(window.innerWidth < window.innerHeight);
    const onMove = (e: PointerEvent) => {
      setPointer({ x: (e.clientX / window.innerWidth) * 2 - 1, y: -((e.clientY / window.innerHeight) * 2 - 1) });
      lastMove.current = performance.now() / 1000;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") setSel((s) => Math.min(ITEMS.length - 1, s + 1));
      else if (e.key === "ArrowUp") setSel((s) => Math.max(0, s - 1));
      else if (e.key === "Enter") setSel((s) => (s >= 0 && window.open(DEMO_BASE + "#" + ITEMS[s].id, "_blank"), s));
      else return;
      e.preventDefault();
    };
    onSize();
    window.addEventListener("resize", onSize);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onSize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  useEffect(() => {
    if (sel >= 0) listRef.current?.children[sel]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [sel]);

  // куда смотрит Юнит: выбрал карточку — на меню; водишь мышью — на курсор; иначе — на звёзды
  const moving = performance.now() / 1000 - lastMove.current < 2.5;
  const shoot = shootAt(t);
  const pointing = shoot.ph > -0.2 && shoot.ph < 1.6 && shoot.k % 2 === 1; // на каждую вторую звезду показывает рукой
  const target = sel >= 0 && !portrait ? { yaw: 1.15, pitch: -0.1 } : moving ? { yaw: 0.55 + pointer.x * 0.7, pitch: -pointer.y * 0.35 - 0.15 } : shoot.ph > 0 && shoot.ph < 1.3 ? { yaw: 0.9, pitch: -0.65 } : { yaw: 0.05 + 0.12 * Math.sin(t * 0.21), pitch: -0.55 + 0.06 * Math.sin(t * 0.37) };
  look.current.yaw += (target.yaw - look.current.yaw) * 0.06;
  look.current.pitch += (target.pitch - look.current.pitch) * 0.06;
  arm.current += ((pointing ? 1 : 0) - arm.current) * 0.08;

  let f: Frame = {
    ...sit,
    pos: [0, 0, 0],
    yaw: -0.55,
    headYaw: look.current.yaw,
    headPitch: look.current.pitch,
    squash: 0.012 * Math.sin(t * 2.4), // дыхание
    eye: "open",
    screen: t - face.at < 2.2 ? face.s : "face",
    screenPrev: "face",
    screenSince: Math.round(face.at * FPS),
  };
  if (arm.current > 0.01) {
    // правая рука тянется к падающей звезде (обратная кинематика, как в риге)
    const star = new THREE.Vector3(...shoot.a).lerp(new THREE.Vector3(...shoot.b), 0.4);
    const ik = armIK(shoulderMatrix(f, 1), [star.x, star.y, star.z]);
    const k = smooth(clamp01(arm.current));
    f = {
      ...f,
      armR: { sh: [f.armR.sh[0] + (ik.sh[0] - f.armR.sh[0]) * k, f.armR.sh[1] + (ik.sh[1] - f.armR.sh[1]) * k, f.armR.sh[2] + (ik.sh[2] - f.armR.sh[2]) * k], elbow: f.armR.elbow + (ik.elbow - f.armR.elbow) * k },
    };
  }
  const faces: Frame["screen"][] = ["love", "laugh", "stars", "wink"];
  const poke = () => setFace({ s: faces[Math.floor(Math.random() * faces.length)], at: t });

  return (
    <FrameContext.Provider value={frame}>
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse at 30% 20%, #1B1F3A 0%, #090B16 55%, #04050A 100%)" }}>
        <div style={{ position: "absolute", inset: portrait ? "0 0 45% 0" : 0 }}>
          <Canvas dpr={[1, 1.5]} camera={{ fov: 40, near: 0.3, far: 600 }} gl={{ alpha: true }}>
            <Rig pointer={pointer} portrait={portrait} />
            <hemisphereLight args={["#9DB4FF", "#0A0D14", 0.5]} />
            <directionalLight position={[-8, 18, 10]} intensity={1.6} color="#CFE0FF" />
            <pointLight position={[3, 12, 6]} intensity={40} color="#FFB08F" distance={30} />
            <Stars t={t} />
            <ShootingStar t={t} />
            <Drift t={t} />
            <group position={PLANET} rotation={[0.25, t * 0.05, 0.35]}>
              <VoxelLookContext.Provider value={{ kind: "basic", bevel: 0.1 }}>
                <Voxels cells={planet} size={1} emissive="#3A1A10" emissiveIntensity={0.35} />
              </VoxelLookContext.Provider>
            </group>
            <group position={[0, -0.825, 0]}>
              <VoxelLookContext.Provider value={{ kind: "basic", bevel: 0.12 }}>
                <group position={[0, 0.825, 0]} scale={[1, 0.825, 1]}>
                  <Voxels cells={ledgeCells} />
                </group>
                <Voxels cells={mossCells} size={1} />
              </VoxelLookContext.Provider>
            </group>
            <VoxelLookContext.Provider value={{ kind: "toy", bevel: 0.14 }}>
              <group
                onClick={(e) => {
                  e.stopPropagation();
                  poke();
                }}
              >
                <Unit3 f={f} frame={frame} />
              </group>
            </VoxelLookContext.Provider>
            <EffectComposer multisampling={4}>
              <Bloom intensity={0.9} luminanceThreshold={0.6} mipmapBlur />
            </EffectComposer>
          </Canvas>
        </div>

        {/* меню справа */}
        <div
          style={{
            position: "absolute",
            right: portrait ? 0 : "4vw",
            left: portrait ? 0 : "auto",
            top: portrait ? "55%" : "8vh",
            bottom: portrait ? 0 : "8vh",
            width: portrait ? "auto" : "min(460px, 36vw)",
            display: "flex",
            flexDirection: "column",
            padding: portrait ? "0 16px 16px" : 0,
          }}
        >
          <div style={{ fontFamily: "var(--pixel)", fontSize: portrait ? 34 : 46, color: "#F4F0EA", letterSpacing: 2, textShadow: "4px 4px 0 #9C4A31" }}>NeuroPilot</div>
          <div style={{ fontFamily: "var(--golos)", fontSize: 17, color: "#AEB6C8", margin: "6px 0 18px" }}>Канал, который ведёт ИИ. Здесь живут компоненты из роликов.</div>
          <div ref={listRef} className="np-list" style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 10, paddingBottom: 12 }}>
            {ITEMS.map((it, i) => {
              const on = i === sel;
              return (
                <a
                  key={it.id}
                  href={DEMO_BASE + "#" + it.id}
                  target="_blank"
                  rel="noreferrer"
                  onMouseEnter={() => setSel(i)}
                  onFocus={() => setSel(i)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 1fr 20px",
                    alignItems: "center",
                    gap: 10,
                    textDecoration: "none",
                    background: on ? "#F4F0EA" : "rgba(244,240,234,0.92)",
                    color: "#14171D",
                    border: "5px solid #14171D",
                    boxShadow: on ? "10px 10px 0 #D97757" : "6px 6px 0 #9C4A31",
                    padding: "10px 14px",
                    transform: on ? "translateX(-14px)" : "none",
                    transition: "transform 160ms cubic-bezier(.2,.9,.3,1.2), box-shadow 160ms",
                  }}
                >
                  <span style={{ fontFamily: "var(--pixel)", fontSize: 22, color: on ? "#D97757" : "#8A7F73" }}>{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span style={{ display: "block", fontFamily: "var(--golos)", fontWeight: 800, fontSize: 18 }}>{it.title}</span>
                    <span style={{ display: "block", fontFamily: "var(--golos)", fontWeight: 500, fontSize: 14, color: "#5A5249", marginTop: 2 }}>{it.about}</span>
                  </span>
                  <span style={{ fontFamily: "var(--pixel)", fontSize: 22, opacity: on ? 1 : 0, color: "#D97757" }}>▶</span>
                </a>
              );
            })}
          </div>
          {!portrait && <div style={{ fontFamily: "var(--golos)", fontSize: 14, color: "#6F7890", marginTop: 10 }}>↑ ↓ — выбрать · Enter — открыть · кликни по Юниту</div>}
        </div>
      </div>
    </FrameContext.Provider>
  );
}
