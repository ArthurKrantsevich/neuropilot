"use client";
// Главная: лофт Юнита на весь экран. Юнит живёт сам: машет при заходе, следит экраном за курсором,
// отвечает эмоцией на клик, засыпает, если долго ничего не происходит.
import { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { FPS, FrameContext, SizeContext } from "../shims/remotion";
import { LoftScene, UNIT_SPOTS, type Shot, type V3 } from "../studio/world/home/Loft";
import { Unit3, type Frame } from "../studio/mascot/spike/RigSpike";
import { clipFrames } from "../studio/mascot/spike/CatalogSpike";
import { VoxelLookContext } from "../studio/mascot/voxel";

const SPOT = UNIT_SPOTS[1]; // у стола под окном
const REACTIONS = ["laugh", "surprise", "love", "joy", "wink", "shrug", "think", "clap"];
const IDLE_SLEEP = 30; // секунд без движения мыши — засыпает

type Act = { id: string; start: number };

// живые часы: кадр = секунды × 60; весь мир перерисовывается от этого кадра, как в роликах
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

// точка над головой Юнита на экране — для облачка
const HeadAnchor: React.FC<{ at: V3; out: React.MutableRefObject<{ x: number; y: number }> }> = ({ at, out }) => {
  const { camera, size } = useThree();
  const v = new THREE.Vector3(...at).project(camera);
  out.current = { x: (v.x * 0.5 + 0.5) * size.width, y: (-v.y * 0.5 + 0.5) * size.height };
  return null;
};

export default function Home() {
  const frame = useClock();
  const t = frame / FPS;
  const [size, setSize] = useState({ width: 1920, height: 1080 });
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const lastMove = useRef(0);
  const [act, setAct] = useState<Act>({ id: "wave", start: 0.8 });
  const [hover, setHover] = useState(false);
  const head = useRef({ x: 0, y: 0 });
  const look = useRef({ yaw: 0, pitch: 0 });
  const night = useMemo(() => {
    const h = new Date().getHours();
    return h >= 20 || h < 6;
  }, []);
  const rest = useMemo(() => clipFrames("nod")[0], []);

  useEffect(() => {
    const onSize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    const onMove = (e: PointerEvent) => {
      setPointer({ x: (e.clientX / window.innerWidth) * 2 - 1, y: -((e.clientY / window.innerHeight) * 2 - 1) });
      lastMove.current = performance.now() / 1000;
    };
    onSize();
    window.addEventListener("resize", onSize);
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("resize", onSize);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);
  useEffect(() => {
    document.body.style.cursor = hover ? "pointer" : "";
  }, [hover]);

  // текущее движение: клип из библиотеки или покой
  const clip = useMemo(() => (act.id ? clipFrames(act.id) : null), [act.id]);
  const n = clip ? Math.floor((t - act.start) * FPS) : -1;
  const playing = !!clip && n >= 0 && n < clip.length;
  const idleFor = performance.now() / 1000 - lastMove.current;
  const sleeping = !playing && idleFor > IDLE_SLEEP && t > IDLE_SLEEP;
  useEffect(() => {
    if (clip && n >= clip.length && act.id !== "sleepy") setAct({ id: "", start: t });
  }, [clip, n, act.id, t]);
  useEffect(() => {
    if (sleeping && act.id !== "sleepy") setAct({ id: "sleepy", start: t });
    if (act.id === "sleepy" && idleFor < 1) setAct({ id: "surprise", start: t }); // разбудили
  }, [sleeping, act.id, t, idleFor]);

  let f: Frame;
  if (playing && clip) {
    const c = clip[n];
    f = { ...c, pos: [SPOT.pos[0] + c.pos[0], 0, SPOT.pos[2] + c.pos[2]], yaw: SPOT.yaw + c.yaw };
  } else if (act.id === "sleepy" && clip) {
    const c = clip[clip.length - 1]; // уснул — держим последнюю позу
    f = { ...c, pos: [SPOT.pos[0], 0, SPOT.pos[2]], yaw: SPOT.yaw };
  } else {
    // покой: экран-лицо мягко следит за курсором
    const k = 0.08;
    look.current.yaw += (pointer.x * 0.7 - SPOT.yaw * 0.6 - look.current.yaw) * k;
    look.current.pitch += (-pointer.y * 0.28 - look.current.pitch) * k;
    f = {
      ...rest,
      pos: [SPOT.pos[0], 0, SPOT.pos[2]],
      yaw: SPOT.yaw,
      headYaw: look.current.yaw,
      headPitch: look.current.pitch,
      squash: 0,
      eye: "open",
      screen: "face",
    };
  }

  const react = () => {
    const pool = REACTIONS.filter((r) => r !== act.id);
    setAct({ id: pool[Math.floor(Math.random() * pool.length)], start: t });
  };

  // камера: общий план стола и центра комнаты, лёгкий параллакс за курсором
  const cam: Shot = {
    pos: [2 + pointer.x * 2.2, 12.5 + pointer.y * 1.2, 40],
    at: [1.5, 8.5, -4],
    fov: size.width < size.height ? 62 : 40,
  };
  const helloK = Math.max(0, Math.min(1, (t - 1.0) / 0.3, (4.2 - t) / 0.4));

  return (
    <SizeContext.Provider value={size}>
      <FrameContext.Provider value={frame}>
        <div style={{ position: "fixed", inset: 0, background: "#05070B" }}>
          <LoftScene mood={night ? "night" : "evening"} shots={[]} cam={cam}>
            <VoxelLookContext.Provider value={{ kind: "toy", bevel: 0.14 }}>
              <group
                onClick={(e) => {
                  e.stopPropagation();
                  react();
                }}
                onPointerOver={() => setHover(true)}
                onPointerOut={() => setHover(false)}
              >
                <Unit3 f={f} frame={frame} />
              </group>
            </VoxelLookContext.Provider>
            <HeadAnchor at={[SPOT.pos[0], 12.6, SPOT.pos[2]]} out={head} />
          </LoftScene>
          {helloK > 0 && (
            <div
              style={{
                position: "absolute",
                left: head.current.x,
                top: head.current.y,
                transform: `translate(-30%, -100%) scale(${0.9 + 0.1 * helloK})`,
                transformOrigin: "30% 100%",
                opacity: helloK,
                background: "#F4F0EA",
                color: "#14171D",
                border: "6px solid #14171D",
                boxShadow: "8px 8px 0 #9C4A31",
                padding: "10px 22px",
                font: "900 34px system-ui, sans-serif",
                pointerEvents: "none",
              }}
            >
              Привет!
            </div>
          )}
        </div>
      </FrameContext.Provider>
    </SizeContext.Provider>
  );
}
