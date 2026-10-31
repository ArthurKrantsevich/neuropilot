// ПРОБНИК: дом Юнита, вариант А — лофт в два уровня. Тёплая мастерская + цифровая стена с порталом в пустоту,
// большое окно в задней стене (закат / ночной город). Кадр композиции = номер ракурса (still --frame=N).
// Юнита пока нет: сначала выбираем сцену. Точка Юнита в каждом ракурсе — UNIT_SPOTS.
import { ThreeCanvas } from "@remotion/three";
import { createContext, useContext, useLayoutEffect, useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, N8AO } from "@react-three/postprocessing";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { VoxelLookContext, Voxels, type Vox } from "../../mascot/voxel";
import { Unit3 } from "../../mascot/spike/RigSpike";
import { clipFrames } from "../../mascot/spike/CatalogSpike";
import {
  block,
  bookcase,
  brickTex,
  chargePod,
  crate,
  desk,
  F,
  PAL,
  panelTex,
  pegboard,
  pixelTexture,
  plankTex,
  plant,
  plasterTex,
  rugAlpha,
  rugTex,
  skyTex,
  workbench,
  chair,
  beanbag,
  floorLampBase,
  wallClock,
  hookHeadphones,
} from "./kit";

export type V3 = [number, number, number];
export type Mood = "evening" | "night";
export type Shot = { pos: V3; at: V3; fov: number };

/** Связь сцены с сюжетом ролика: pulse — вспышка гирлянды (0..1), neonY — высота неоновой вывески. */
export type LoftFxT = { pulse: number; neonY: number };
export const LoftFx = createContext<LoftFxT>({ pulse: 0, neonY: 23 });
/** Время сцены в секундах — для «живого» фона (всё движется детерминированно от кадра). */
const useT = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return f / fps;
};

// ---------- планировка (мир) ----------
const BACK = -12; // лицо задней стены
const H = 28; // высота стен
const WIN = { x0: 0, x1: 8, y0: 13, y1: 23 }; // окно в кирпичной стене
const PORT = { cx: 17, hw: 4.5, hy: 11 }; // верх арки 15.5 — Юнит (~12 с антенной) проходит свободно; // портал: центр, полуширина, высота прямой части (радиус арки = hw)
const MEZZ = { x0: -24, x1: -5, y: 14, z1: -5 }; // низ балки 13.1 — над головой Юнита // антресоль

// ---------- поверхности ----------
export const TexBox: React.FC<{
  c: V3;
  s: V3;
  tex: THREE.Texture;
  tile: [number, number];
  uv?: [number, number];
  color?: string;
  shadow?: boolean;
}> = ({ c, s, tex, tile, uv = [0, 0], color = "#FFFFFF", shadow = true }) => {
  // свой клон текстуры: повтор по размеру, сдвиг по мировым координатам — швы кирпича совпадают между кусками стены
  const t = useMemo(() => {
    const k = tex.clone();
    k.repeat.set(
      (s[0] > 1.5 ? s[0] : s[2]) / tile[0],
      (s[1] > 1.5 ? s[1] : s[2]) / tile[1],
    );
    k.offset.set(uv[0] / tile[0], uv[1] / tile[1]);
    k.needsUpdate = true;
    return k;
  }, [tex, s, tile, uv]);
  return (
    <mesh position={c} castShadow={shadow} receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial
        map={t}
        color={color}
        roughness={0.92}
        metalness={0}
      />
    </mesh>
  );
};
/** Кусок стены по углам (x0..x1, y0..y1), толщина 1, лицом в +z на BACK. */
const Wall: React.FC<{
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  tex: THREE.Texture;
  tile: [number, number];
}> = ({ x0, x1, y0, y1, tex, tile }) => (
  <TexBox
    c={[(x0 + x1) / 2, (y0 + y1) / 2, BACK - 0.5]}
    s={[x1 - x0, y1 - y0, 1]}
    tex={tex}
    tile={tile}
    uv={[x0, y0]}
  />
);
export const Bar: React.FC<{ c: V3; s: V3; color: string; rough?: number }> = ({
  c,
  s,
  color,
  rough = 0.6,
}) => (
  <mesh position={c} castShadow receiveShadow>
    <boxGeometry args={s} />
    <meshStandardMaterial color={color} roughness={rough} />
  </mesh>
);

// ---------- воксели мебели (клетки F) ----------
const W2 = (x: number) => Math.round(x / F); // мир → клетка
function furniture(): Vox[] {
  return [
    ...workbench(W2(-22), W2(-11)),
    ...pegboard(W2(-22), W2(6), W2(BACK) + 1),
    ...bookcase(W2(-10.5), W2(-11.5), 24),
    ...desk(W2(1), W2(-11)),
    ...chargePod(W2(-12), W2(MEZZ.y), W2(-11)),
    ...plant(W2(-20), W2(3)),
    ...plant(W2(-0.8), W2(-10.2), 0, 3, 6),
    ...plant(W2(-21), W2(-8), W2(MEZZ.y), 3, 2),
    // уютный угол справа: кресло-мешок и торшер; ящик с запчастями у портала
    ...beanbag(W2(21), W2(4), 6),
    ...floorLampBase(W2(22.8), W2(-0.5), 22),
    ...crate(W2(21), 0, W2(-10.5), 4, "c3"),
    ...crate(W2(21.3), W2(2), W2(-10.2), 3, "c4"),
    // часы между антресолью и окном; запасные наушники на крючке у постера
    ...wallClock(W2(-2.5), W2(23.5), W2(BACK) + 1, 5),
    ...hookHeadphones(W2(-24), W2(9), W2(4.5)),
    ...archFill(),
    ...souvenirs(),
  ];
}
/** Углы над аркой портала — мелкими клетками, чтобы арка была круглой. */
function archFill(): Vox[] {
  const o: Vox[] = [];
  for (let x = W2(PORT.cx - PORT.hw); x < W2(PORT.cx + PORT.hw); x++)
    for (let y = W2(PORT.hy); y < W2(PORT.hy + PORT.hw); y++) {
      const wx = (x + 0.5) * F;
      const wy = (y + 0.5) * F;
      if ((wx - PORT.cx) ** 2 + (wy - PORT.hy) ** 2 <= PORT.hw ** 2) continue;
      o.push([x, y, W2(BACK) - 1, "#2A2F39"]);
    }
  return o;
}
/** Сувениры прошлых роликов на полках антресоли: мини-табло (A1), кубик-смайлик (D1), деревце индекса. */
function souvenirs(): Vox[] {
  const o: Vox[] = [];
  const z = W2(BACK) + 1;
  const sy = W2(19) + 1; // нижняя полка
  for (let x = 0; x < 6; x++)
    for (let y = 0; y < 3; y++)
      o.push([
        W2(-21.5) + x,
        sy + y,
        z,
        y === 1 && x % 2 === 0 ? PAL.cream : PAL.black,
      ]);
  o.push(
    ...block(W2(-17.5), W2(-17.5) + 2, sy, sy + 2, z, z + 2, PAL.yellow, "sm"),
  );
  o.push(
    [W2(-17.5), sy + 2, z + 3, PAL.black],
    [W2(-17.5) + 2, sy + 2, z + 3, PAL.black],
    [W2(-17.5) + 1, sy, z + 3, PAL.black],
  );
  const ty = W2(22.5) + 1; // верхняя полка
  o.push(
    [W2(-20), ty, z + 1, PAL.woodDark],
    [W2(-20), ty + 1, z + 1, PAL.woodDark],
    [W2(-21), ty + 2, z + 1, PAL.green],
    [W2(-19), ty + 2, z + 1, PAL.green],
    [W2(-20), ty + 3, z + 1, PAL.green],
  );
  o.push(
    ...block(
      W2(-16.5),
      W2(-16.5) + 3,
      ty,
      ty + 1,
      z,
      z + 2,
      PAL.orange,
      "mega",
    ),
  );
  return o;
}

// ---------- окно и улица ----------
export const City: React.FC<{ night: boolean }> = ({ night }) => {
  const tm = useT();
  const blocks = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const h = 6 + ((i * 37) % 9); // крыши ниже середины окна: в окне в основном небо
        return {
          x: -10 + i * 0.88 + ((i * 13) % 5) * 0.15, // только за окном: в зону пустоты за порталом не заходит
          z: -25 - ((i * 17) % 4),
          w: 2 + ((i * 7) % 3),
          h,
        };
      }),
    [],
  );
  return (
    <group>
      {blocks.map((b, i) => (
        <group key={i} position={[b.x, b.h / 2 + (night ? 5 : 2), b.z]}>
          <mesh>
            <boxGeometry args={[b.w * 0.55, b.h, 1]} />
            <meshBasicMaterial color={night ? "#0C1224" : "#5A3A55"} />
          </mesh>
          {Array.from({ length: Math.floor(b.h / 1.6) * 2 }, (_, k) => {
            const lit = (i * 31 + k * 17 + Math.floor(tm / 2.5 + ((i * 7 + k) % 5))) % 7 < (night ? 4 : 1);
            if (!lit) return null;
            return (
              <mesh
                key={k}
                position={[
                  (k % 2 ? 0.45 : -0.45) * (b.w / 2),
                  -b.h / 2 + 1 + Math.floor(k / 2) * 1.6,
                  0.51,
                ]}
              >
                <planeGeometry args={[0.45, 0.6]} />
                <meshBasicMaterial
                  color={night ? "#FFD27A" : "#FFB98A"}
                  toneMapped={false}
                />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
};
const Outside: React.FC<{ night: boolean }> = ({ night }) => {
  const sky = useMemo(() => skyTex(night), [night]);
  return (
    <group>
      {/* небо — коробка за окном (изнутри): видно под любым углом, снаружи дома её закрывают стены */}
      <mesh position={[-0.5, 12.2, -22]}>
        <boxGeometry args={[21, 32.4, 16]} />
        <meshBasicMaterial map={sky} toneMapped={false} side={THREE.BackSide} />
      </mesh>
      <mesh position={night ? [6, 24, -29.9] : [5, 12, -29.9]}>
        <circleGeometry args={[night ? 1.1 : 2.8, 32]} />
        <meshBasicMaterial
          color={night ? "#EAF2FF" : "#FFD08A"}
          toneMapped={false}
        />
      </mesh>
      <City night={night} />
      {night &&
        Array.from({ length: 60 }, (_, i) => (
          <mesh key={i} position={[-10 + ((i * 37) % 21), 14 + ((i * 53) % 17), -29.95]}>
            <planeGeometry args={[0.18 + (i % 3) * 0.08, 0.18 + (i % 3) * 0.08]} />
            <meshBasicMaterial color="#DCE6FF" toneMapped={false} />
          </mesh>
        ))}
    </group>
  );
};
const WindowFrame: React.FC = () => {
  const { x0, x1, y0, y1 } = WIN;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const z = BACK - 0.35;
  return (
    <group>
      <Bar
        c={[cx, y0 - 0.2, BACK + 0.25]}
        s={[x1 - x0 + 1, 0.5, 1.3]}
        color={PAL.woodLight}
      />
      <Bar
        c={[cx, y1 + 0.2, z]}
        s={[x1 - x0 + 0.6, 0.4, 0.6]}
        color={PAL.woodDark}
      />
      <Bar c={[x0 - 0.1, cy, z]} s={[0.4, y1 - y0, 0.6]} color={PAL.woodDark} />
      <Bar c={[x1 + 0.1, cy, z]} s={[0.4, y1 - y0, 0.6]} color={PAL.woodDark} />
      <Bar c={[cx, cy, z]} s={[0.25, y1 - y0, 0.4]} color={PAL.woodDark} />
      {[y0 + 3.3, y0 + 6.6].map((y) => (
        <Bar
          key={y}
          c={[cx, y, z]}
          s={[x1 - x0, 0.22, 0.4]}
          color={PAL.woodDark}
        />
      ))}
    </group>
  );
};

// ---------- светящееся ----------
const codeTex = (i: number) =>
  pixelTexture(`code${i}`, 40, 26, (x, y) => {
    if (y < 1 || y > 24 || x < 1 || x > 38) return "#0B1626";
    const row = Math.floor((y - 1) / 2);
    if ((y - 1) % 2 === 1) return "#0B1626";
    const indent = ((row * 7 + i) % 3) * 3;
    const len = 6 + ((row * 13 + i * 5) % 26);
    if (x < 2 + indent || x > 2 + indent + len) return "#0B1626";
    const cols = ["#6FB8FF", "#7EE0A1", "#FFC53D", "#E8E2D6", "#C792EA"];
    return cols[Math.floor((x - indent) / 5 + row) % cols.length];
  });
export const Monitor: React.FC<{ c: V3; w: number; h: number; i: number }> = ({ c, w, h, i }) => {
  const t = useT();
  const tex = useMemo(() => {
    const k = codeTex(i).clone();
    k.needsUpdate = true;
    return k;
  }, [i]);
  // код медленно ползёт вверх, как будто его пишут
  tex.offset.y = -Math.floor(t * 3 + i * 7) / 26;
  return (
    <group position={c}>
      <Bar c={[0, 0, -0.12]} s={[w + 0.3, h + 0.3, 0.2]} color={PAL.black} rough={0.4} />
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* мигающий курсор */}
      {Math.floor(t * 2) % 2 === 0 && (
        <mesh position={[-w / 2 + 0.6 + ((Math.floor(t * 3) * 0.37) % (w - 1.2)), -h / 2 + 0.3, 0.01]}>
          <planeGeometry args={[0.12, 0.22]} />
          <meshBasicMaterial color="#E8E2D6" toneMapped={false} />
        </mesh>
      )}
      <Bar c={[0, -h / 2 - 0.6, -0.25]} s={[0.3, 1.2, 0.3]} color={PAL.metal} />
      <Bar c={[0, -h / 2 - 1.15, -0.1]} s={[1.4, 0.12, 0.8]} color={PAL.metal} />
    </group>
  );
};
/** Неоновая вывеска «</>» над порталом. */
const Neon: React.FC<{ night: boolean }> = ({ night }) => {
  const rows = [
    "...#.......#..#.....",
    "..#.......#....#....",
    ".#.......#......#...",
    "#.......#........#..",
    ".#.....#........#...",
    "..#...#........#....",
    "...#.#........#.....",
  ];
  const cells = useMemo(() => {
    const o: Vox[] = [];
    rows.forEach((r, j) =>
      [...r].forEach(
        (ch, i) =>
          ch === "#" && o.push([i, -j, 0, night ? "#FF9A5C" : "#FF8A50"]),
      ),
    );
    return o;
  }, [night]);
  const fx = useContext(LoftFx);
  const t = useT();
  // неон изредка «моргает» на кадр-два — живой, но не раздражает
  const ph = (t * 0.23) % 1;
  const flick = (ph > 0.31 && ph < 0.318) || (ph > 0.326 && ph < 0.331);
  return (
    <group position={[PORT.cx - 9 * 0.45, fx.neonY, BACK + 0.3]} visible={!flick}>
      <Voxels cells={cells} size={0.45} glow seamless />
      <pointLight
        position={[3.5, -1, 1.5]}
        intensity={night ? 30 : 14}
        distance={12}
        decay={1.6}
        color="#FF8A50"
      />
    </group>
  );
};
/** Кромка портала изнутри и «пустота» за ним: тёмный пол с сеткой и пылинки. */
const Portal: React.FC<{ night: boolean }> = ({ night }) => {
  const t = useT();
  const ring = useMemo(() => {
    const o: Vox[] = [];
    const inside = (x: number, y: number) =>
      (Math.abs(x - PORT.cx) <= PORT.hw && y <= PORT.hy) ||
      (x - PORT.cx) ** 2 + (y - PORT.hy) ** 2 <= PORT.hw ** 2;
    for (let x = W2(PORT.cx - PORT.hw - 1); x <= W2(PORT.cx + PORT.hw + 1); x++)
      for (let y = 0; y <= W2(PORT.hy + PORT.hw + 1); y++) {
        const wx = (x + 0.5) * F,
          wy = (y + 0.5) * F;
        if (!inside(wx, wy)) continue;
        if (!inside(wx - F, wy) || !inside(wx + F, wy) || !inside(wx, wy + F))
          o.push([x, y, W2(BACK) - 1, "#8CD2FF"]);
      }
    return o;
  }, []);
  return (
    <group>
      <Voxels cells={ring} size={F} glow seamless />
      {/* оболочка пустоты: лучи сквозь портал под углом упираются в неё, а не в небо за окном */}
      <mesh position={[PORT.cx, 12, BACK - 15]}>
        <boxGeometry args={[12.5, 30, 29.6]} />
        <meshBasicMaterial color="#05070B" side={THREE.BackSide} />
      </mesh>
      <group position={[PORT.cx, 0, BACK - 14]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <planeGeometry args={[12, 28]} />
          <meshBasicMaterial color="#05070B" />
        </mesh>
        <gridHelper
          args={[12, 12, "#2B5FA8", "#1A2C4A"]}
          position={[0, 0.0, 0]}
          scale={[1, 1, 2.3]}
        />
        <mesh position={[0, 10, -13]}>
          <planeGeometry args={[30, 30]} />
          <meshBasicMaterial color="#05070B" />
        </mesh>
        {Array.from({ length: 30 }, (_, i) => (
          <mesh
            key={i}
            position={[
              ((i * 37) % 9) - 4.5 + 0.3 * Math.sin(t * 0.6 + i),
              0.8 + ((i * 53) % 11) + 0.4 * Math.sin(t * 0.45 + i * 2),
              -((((i * 29) % 22) - t * 1.2) % 22 + 22) % 22 + 8,
            ]}
            scale={0.1 + ((i * 7) % 3) * 0.05}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#8CD2FF" toneMapped={false} />
          </mesh>
        ))}
      </group>
      <pointLight
        position={[PORT.cx, 5, BACK + 2.5]}
        intensity={night ? 70 : 40}
        distance={18}
        decay={1.6}
        color="#5CC8FF"
      />
    </group>
  );
};
export const Lamp: React.FC<{ p: V3; cord: number; power: number }> = ({ p, cord, power }) => {
  const t = useT();
  const top = cord + 0.6;
  // еле заметное покачивание на шнуре (без тряски кадра)
  const sw = 0.018 * Math.sin(t * 0.9 + p[0]);
  return (
    <group position={[p[0], p[1] + top, p[2]]} rotation={[0.6 * sw, 0, sw]}>
      <group position={[0, -top, 0]}>
        <mesh position={[0, cord / 2 + 0.6, 0]}>
          <cylinderGeometry args={[0.05, 0.05, cord, 6]} />
          <meshStandardMaterial color={PAL.black} />
        </mesh>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.45, 1.25, 1.0, 20, 1, true]} />
          <meshStandardMaterial color={PAL.orange} roughness={0.55} side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.32, 16, 12]} />
          <meshBasicMaterial color="#FFE6B8" toneMapped={false} />
        </mesh>
        <pointLight position={[0, -0.5, 0]} intensity={power} distance={30} decay={1.7} color="#FFB870" />
      </group>
    </group>
  );
};

// ---------- уют: гирлянда, свечение портала на полу, пылинки, торшер ----------
export const radial = (key: string, col: string) =>
  pixelTexture(key, 32, 32, (x, y) => {
    const d = Math.min(1, Math.hypot(x - 15.5, y - 15.5) / 16);
    const c = new THREE.Color(col).multiplyScalar((1 - d) ** 2);
    return `#${c.getHexString()}`;
  }, false);
/** Гирлянда: провисающая нить с тёплыми огоньками между точками a и b. */
export const Garland: React.FC<{ a: V3; b: V3; sag: number; n: number; night: boolean }> = ({ a, b, sag, n, night }) => {
  const t = useT();
  const { pulse } = useContext(LoftFx);
  return (
    <group>
      {Array.from({ length: n + 1 }, (_, i) => {
        const q = i / n;
        const p: V3 = [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q - sag * 4 * q * (1 - q), a[2] + (b[2] - a[2]) * q];
        const tw = 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(t * 2.1 + i * 1.7));
        const k = Math.min(1.6, tw + pulse * 0.9);
        const c = new THREE.Color(i % 4 === 1 ? "#FFD08A" : "#FFC070").multiplyScalar(k);
        return (
          <mesh key={i} position={p} scale={1 + pulse * 0.35}>
            <sphereGeometry args={[0.13, 8, 6]} />
            <meshBasicMaterial color={c} toneMapped={false} transparent opacity={night ? 1 : 0.9} />
          </mesh>
        );
      })}
    </group>
  );
};
const PortalGlow: React.FC<{ night: boolean }> = ({ night }) => {
  const t = useMemo(() => radial("rad_cyan", "#5CC8FF"), []);
  return (
    <mesh position={[PORT.cx, 0.04, BACK + 3]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[11, 7]} />
      <meshBasicMaterial map={t} transparent opacity={night ? 0.55 : 0.35} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};
/** Пылинки в луче из окна: случайные точки внутри наклонного объёма луча. */
const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
export const Dust: React.FC<{ night: boolean }> = ({ night }) => {
  const tm = useT();
  return (
  <group>
    {Array.from({ length: 60 }, (_, i) => {
      const t = 0.08 + rnd(i, 1) * 0.84; // вдоль луча: от окна к полу
      const p: V3 = [
        WIN.x0 + 0.5 + rnd(i, 2) * (WIN.x1 - WIN.x0 - 1) + 0.35 * Math.sin(tm * 0.3 + i),
        (WIN.y0 + rnd(i, 3) * (WIN.y1 - WIN.y0)) * (1 - t) + 0.5 * Math.sin(tm * 0.22 + i * 2.3),
        BACK + 0.5 + t * 13 + (rnd(i, 4) - 0.5) * 2,
      ];
      return (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.03 + rnd(i, 5) * 0.035, 6, 4]} />
          <meshBasicMaterial color={night ? "#C8D6FF" : "#FFE2B8"} transparent opacity={0.35 + rnd(i, 6) * 0.4} toneMapped={false} />
        </mesh>
      );
    })}
  </group>
  );
};
const FloorLamp: React.FC<{ night: boolean }> = ({ night }) => (
  <group position={[22.8, 11.6, -0.5]}>
    <mesh>
      <cylinderGeometry args={[0.8, 1.4, 1.8, 20, 1, true]} />
      <meshStandardMaterial color={PAL.cream} roughness={0.8} side={THREE.DoubleSide} emissive="#FFC88A" emissiveIntensity={night ? 0.9 : 0.5} />
    </mesh>
    <pointLight position={[0, -0.6, 0]} intensity={night ? 90 : 45} distance={20} decay={1.7} color="#FFC07A" />
  </group>
);

/** Голостол (из варианта Б): на нём появляется тема ролика. Между столом и порталом. */
const HoloTable: React.FC<{ night: boolean }> = ({ night }) => {
  const t = useT();
  const r = (t * 0.6) % 1;
  return (
    <group position={[9, 0, 1.5]}>
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.6, 1.0, 3.2, 8]} />
        <meshStandardMaterial color={PAL.graphite} roughness={0.5} />
      </mesh>
      <mesh position={[0, 3.3, 0]} castShadow>
        <cylinderGeometry args={[2.1, 2.1, 0.3, 8]} />
        <meshStandardMaterial color={PAL.metal} roughness={0.4} />
      </mesh>
      <mesh position={[0, 3.47, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.85, 8]} />
        <meshBasicMaterial color="#5CC8FF" toneMapped={false} transparent opacity={0.75 + 0.15 * Math.sin(t * 3)} />
      </mesh>
      <mesh position={[0, 3.5, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.3 + r * 0.7}>
        <ringGeometry args={[1.7, 1.85, 8]} />
        <meshBasicMaterial color="#DDF4FF" toneMapped={false} transparent opacity={1 - r} />
      </mesh>
      <mesh position={[0, 5.2 + 0.15 * Math.sin(t * 1.4), 0]} rotation={[0.5, 0.7 + t * 0.7, 0]}>
        <boxGeometry args={[1.3, 1.3, 1.3]} />
        <meshBasicMaterial color="#8CD2FF" wireframe toneMapped={false} />
      </mesh>
      <pointLight position={[0, 5, 0]} intensity={night ? 50 : 28} distance={12} decay={1.6} color="#5CC8FF" />
    </group>
  );
};

/** Секундная стрелка на настенных часах и пульс огонька на зарядной капсуле. */
const LiveBits: React.FC = () => {
  const t = useT();
  return (
    <>
      <group position={[-2.5, 23.5, -10.85]} rotation={[0, 0, -t * ((Math.PI * 2) / 60)]}>
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[0.1, 1.8, 0.05]} />
          <meshBasicMaterial color="#D97757" toneMapped={false} />
        </mesh>
      </group>
      <mesh position={[-8.75, MEZZ.y + 1.6, -7.4]}>
        <boxGeometry args={[4, 0.14, 0.05]} />
        <meshBasicMaterial color="#5CC8FF" transparent opacity={0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.2))} toneMapped={false} />
      </mesh>
    </>
  );
};

// ---------- ракурсы ----------
// вертикальные — с той же дистанции, что в роликах (Юнит ~11 ед. займёт половину кадра)
export const LOFT_SHOTS: Shot[] = [
  { pos: [-14.5, 10.5, 30], at: [-14.5, 10.5, -6], fov: 42 }, // 0 мастерская: верстак, над ним антресоль с сувенирами
  { pos: [3.5, 11, 30], at: [3.5, 11, -6], fov: 42 }, // 1 рабочее место под окном
  { pos: [16, 11, 30], at: [16, 11, -6], fov: 42 }, // 2 портал
  { pos: [-1, 11, 31], at: [-1, 11, -6], fov: 42 }, // 3 центр: лестница, окно
  { pos: [-14, 24, 22], at: [-14.5, 19, -8], fov: 42 }, // 4 антресоль сверху
];
export const LOFT_WIDE: Shot[] = [
  { pos: [0, 14, 52], at: [0, 12, -6], fov: 40 }, // 0 весь лофт
  { pos: [30, 15, 36], at: [-4, 10, -8], fov: 40 }, // 1 три четверти
];

export const Cam: React.FC<{ shot: Shot; exposure: number }> = ({
  shot,
  exposure,
}) => {
  const { camera, gl, scene } = useThree();
  useLayoutEffect(() => {
    gl.toneMapping = THREE.NeutralToneMapping;
    gl.toneMappingExposure = exposure;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.18;
    return () => {
      env.dispose();
      pm.dispose();
    };
  }, [gl, scene, exposure]);
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = shot.fov;
  cam.position.set(...shot.pos);
  cam.lookAt(...shot.at);
  cam.updateProjectionMatrix();
  return null;
};

const SunLight: React.FC<{ night: boolean }> = ({ night }) => {
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(3, 0, -2);
    return o;
  }, []);
  return (
    <>
      <primitive object={target} />
      <directionalLight
        position={[6, 100, -64]}
        target={target}
        intensity={night ? 1.4 : 4.5}
        color={night ? "#9DB4FF" : "#FFB476"}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-camera-near={1}
        shadow-camera-far={260}
        shadow-bias={-0.0003}
      />
    </>
  );
};

/** Свет из окна: прожектор с тенями — на полу пятно с тенью переплёта, плюс еле заметный «луч» в воздухе. */
const WindowBeam: React.FC<{ night: boolean }> = ({ night }) => {
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(3.5, 0, 2);
    return o;
  }, []);
  return (
    <>
      <primitive object={target} />
      <spotLight
        position={[4, 30, -26]}
        target={target}
        angle={0.36}
        penumbra={0.35}
        intensity={night ? 900 : 2600}
        distance={80}
        decay={1.5}
        color={night ? "#A9BEFF" : "#FFB06A"}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
      />
    </>
  );
};
/** Постер на левой стене: чертёж головы Юнита. */
const Poster: React.FC = () => {
  const t = useMemo(
    () =>
      pixelTexture("poster", 20, 26, (x, y) => {
        if (x === 0 || y === 0 || x === 19 || y === 25) return PAL.woodDark;
        const hx = x - 4,
          hy = y - 5;
        const head = hx >= 0 && hx < 12 && hy >= 0 && hy < 10;
        const scr = hx >= 2 && hx < 10 && hy >= 2 && hy < 8;
        if (scr)
          return (hy === 4 && (hx === 4 || hx === 7)) ||
            (hy === 6 && hx >= 4 && hx <= 7)
            ? "#8CD2FF"
            : "#1E3A5C";
        if (head) return PAL.orange;
        if (y >= 17 && y <= 22 && x >= 7 && x <= 12) return PAL.orange;
        if (y === 4 && x === 10) return "#FFAE73";
        if ((x + y) % 4 === 0) return "#2C5A8A";
        return "#24508A";
      }),
    [],
  );
  return (
    <mesh position={[-23.95, 12, -1]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[6, 7.8]} />
      <meshStandardMaterial map={t} roughness={0.8} />
    </mesh>
  );
};

// где стоит Юнит в каждом вертикальном ракурсе (мир; y — высота пола под ним)
export const UNIT_SPOTS: { pos: V3; yaw: number }[] = [
  // Юнит на трети кадра, рядом — предмет зоны (его не закрывает)
  { pos: [-11, 0, -2], yaw: -0.35 }, // 0 у верстака, вполоборота к нему
  { pos: [0.6, 0, -1.5], yaw: 0.35 }, // 1 у стола
  { pos: [12.6, 0, -4], yaw: -0.4 }, // 2 у портала
  { pos: [2, 0, 2.5], yaw: 0 }, // 3 на ковре, рядом лестница
  { pos: [-19, MEZZ.y, -8.2], yaw: 0.3 }, // 4 на антресоли у полок
];
/** Юнит машет рукой (кадр из каталога) — проверка масштаба комнаты. */
const UnitHere: React.FC<{ spot: { pos: V3; yaw: number }; frame: number }> = ({ spot, frame }) => {
  const base = useMemo(() => clipFrames("wave")[60], []);
  const f = { ...base, pos: [spot.pos[0], 0, spot.pos[2]] as V3, lift: spot.pos[1], yaw: spot.yaw };
  return (
    <VoxelLookContext.Provider value={{ kind: "toy", bevel: 0.14 }}>
      <Unit3 f={f} frame={frame} />
    </VoxelLookContext.Provider>
  );
};

/** Сцена лофта. cam — своя камера (для роликов), children — Юнит и предметы ролика внутри мира. */
export const LoftScene: React.FC<{ mood: Mood; shots: Shot[]; withUnit?: boolean; cam?: Shot; fx?: LoftFxT; children?: React.ReactNode }> = ({
  mood,
  shots,
  withUnit,
  cam,
  fx,
  children,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const night = mood === "night";
  const shot = cam ?? shots[Math.min(frame, shots.length - 1)];
  const cells = useMemo(() => furniture(), []);
  const chairCells = useMemo(() => chair(), []);
  const tex = useMemo(
    () => ({
      brick: brickTex(),
      plank: plankTex(),
      panel: panelTex(),
      plaster: plasterTex(),
      rug: rugTex(),
      rugA: rugAlpha(),
    }),
    [],
  );
  const BASIC = { kind: "basic" as const, bevel: 0.12 };
  return (
    <AbsoluteFill style={{ backgroundColor: "#05070B" }}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ fov: 42, near: 0.3, far: 400 }}
      >
        <LoftFx.Provider value={fx ?? { pulse: 0, neonY: 23 }}>
        <Cam shot={shot} exposure={night ? 1.15 : 1.35} />
        <color attach="background" args={["#05070B"]} />
        <hemisphereLight
          args={[
            night ? "#5A6FA0" : "#FFD9B0",
            night ? "#0A0A10" : "#3A2618",
            night ? 0.25 : 0.75,
          ]}
        />
        {/* мягкий заполняющий спереди, чтобы фасад мебели не проваливался в черноту */}
        <directionalLight
          position={[-6, 18, 40]}
          intensity={night ? 0.25 : 0.55}
          color={night ? "#8FA6FF" : "#FFE2C4"}
        />
        <SunLight night={night} />
        <WindowBeam night={night} />
        {/* пол */}
        <TexBox
          c={[0, -0.5, -1]}
          s={[48, 1, 22]}
          tex={tex.plank}
          tile={[8, 8]}
        />
        <mesh
          position={[1, 0.02, 1.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[15, 9]} />
          <meshStandardMaterial
            map={tex.rug}
            alphaMap={tex.rugA}
            alphaTest={0.5}
            roughness={1}
          />
        </mesh>
        {/* кирпичная стена с окном */}
        <Wall
          x0={-24}
          x1={WIN.x0}
          y0={0}
          y1={H}
          tex={tex.brick}
          tile={[8, 4]}
        />
        <Wall x0={WIN.x1} x1={10} y0={0} y1={H} tex={tex.brick} tile={[8, 4]} />
        <Wall
          x0={WIN.x0}
          x1={WIN.x1}
          y0={0}
          y1={WIN.y0}
          tex={tex.brick}
          tile={[8, 4]}
        />
        <Wall
          x0={WIN.x0}
          x1={WIN.x1}
          y0={WIN.y1}
          y1={H}
          tex={tex.brick}
          tile={[8, 4]}
        />
        {/* цифровая стена с порталом */}
        <Wall
          x0={10}
          x1={PORT.cx - PORT.hw}
          y0={0}
          y1={H}
          tex={tex.panel}
          tile={[4, 4]}
        />
        <Wall
          x0={PORT.cx + PORT.hw}
          x1={24}
          y0={0}
          y1={H}
          tex={tex.panel}
          tile={[4, 4]}
        />
        <Wall
          x0={PORT.cx - PORT.hw}
          x1={PORT.cx + PORT.hw}
          y0={PORT.hy + PORT.hw}
          y1={H}
          tex={tex.panel}
          tile={[4, 4]}
        />
        {/* левая стена */}
        <TexBox
          c={[-24.5, H / 2, -3.5]}
          s={[1, H, 17]}
          tex={tex.plaster}
          tile={[4, 4]}
        />
        <TexBox
          c={[24.5, H / 2, -3.5]}
          s={[1, H, 17]}
          tex={tex.panel}
          tile={[4, 4]}
        />
        {/* невидимый потолок: только отбрасывает тень — солнце входит лишь через окно */}
        <mesh position={[0, H + 1, -1]} castShadow>
          <boxGeometry args={[52, 0.5, 26]} />
          <meshBasicMaterial colorWrite={false} depthWrite={false} />
        </mesh>
        {/* потолочные балки */}
        {[-16, -4, 8, 19].map((x) => (
          <Bar
            key={x}
            c={[x, H + 0.4, -3]}
            s={[1, 0.8, 19]}
            color={PAL.woodDark}
          />
        ))}
        {/* антресоль: настил, балка, столбы, перила */}
        <TexBox
          c={[(MEZZ.x0 + MEZZ.x1) / 2, MEZZ.y - 0.3, (BACK + MEZZ.z1) / 2]}
          s={[MEZZ.x1 - MEZZ.x0, 0.6, MEZZ.z1 - BACK]}
          tex={tex.plank}
          tile={[8, 8]}
        />
        <Bar
          c={[(MEZZ.x0 + MEZZ.x1) / 2, MEZZ.y - 0.9, MEZZ.z1 - 0.3]}
          s={[MEZZ.x1 - MEZZ.x0, 0.8, 0.6]}
          color={PAL.woodDark}
        />
        {[MEZZ.x0 + 1, -14.5, MEZZ.x1 - 0.5].map((x) => (
          <Bar
            key={x}
            c={[x, (MEZZ.y - 1) / 2, MEZZ.z1 - 0.3]}
            s={[0.6, MEZZ.y - 1, 0.6]}
            color={PAL.woodDark}
          />
        ))}
        <Bar
          c={[(MEZZ.x0 + MEZZ.x1) / 2, MEZZ.y + 3, MEZZ.z1 - 0.3]}
          s={[MEZZ.x1 - MEZZ.x0, 0.25, 0.25]}
          color={PAL.metal}
          rough={0.35}
        />
        {Array.from({ length: 13 }, (_, i) => (
          <Bar
            key={i}
            c={[MEZZ.x0 + 1 + i * 1.5, MEZZ.y + 1.5, MEZZ.z1 - 0.3]}
            s={[0.14, 3, 0.14]}
            color={PAL.metal}
            rough={0.35}
          />
        ))}
        {/* лестница от пола к антресоли */}
        <group position={[-3, 0, -1.5]} rotation={[-0.32, 0, 0]}>
          {[-1, 1].map((sx) => (
            <Bar
              key={sx}
              c={[sx, 7.2, 0]}
              s={[0.3, 14.4, 0.3]}
              color={PAL.woodLight}
            />
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <Bar
              key={i}
              c={[0, 1.2 + i * 1.5, 0]}
              s={[2, 0.22, 0.3]}
              color={PAL.wood}
            />
          ))}
        </group>
        {/* полки на антресоли */}
        {[19, 22.5].map((y) => (
          <Bar
            key={y}
            c={[-19, y, BACK + 0.6]}
            s={[7, 0.3, 1.2]}
            color={PAL.woodLight}
          />
        ))}
        <WindowFrame />
        <Poster />
        {/* плинтусы и деревянная панель на левой стене */}
        <Bar c={[-7, 0.3, BACK + 0.15]} s={[34, 0.6, 0.3]} color={PAL.woodDark} />
        <Bar c={[-23.9, 2.6, -3.5]} s={[0.25, 5.2, 17]} color={PAL.wood} rough={0.8} />
        <Bar c={[-23.75, 5.3, -3.5]} s={[0.4, 0.3, 17]} color={PAL.woodDark} />
        {/* кабель-каналы на цифровой стене */}
        {[11.4, 22.6].map((x) => (
          <Bar key={x} c={[x, H / 2, BACK + 0.2]} s={[0.35, H, 0.35]} color="#20242C" rough={0.4} />
        ))}
        <Bar c={[17, 25.5, BACK + 0.2]} s={[11.6, 0.35, 0.35]} color="#20242C" rough={0.4} />
        {/* кресло отодвинуто и повёрнуто к камере — мониторы видны */}
        <group position={[6.2, 0, -5.2]} rotation={[0, -0.75, 0]}>
          <VoxelLookContext.Provider value={BASIC}>
            <Voxels cells={chairCells} size={F} />
          </VoxelLookContext.Provider>
        </group>
        <Garland a={[MEZZ.x0 + 0.6, MEZZ.y + 3.2, MEZZ.z1 - 0.1]} b={[-14.5, MEZZ.y + 3.2, MEZZ.z1 - 0.1]} sag={0.7} n={14} night={night} />
        <Garland a={[-14.5, MEZZ.y + 3.2, MEZZ.z1 - 0.1]} b={[MEZZ.x1 - 0.3, MEZZ.y + 3.2, MEZZ.z1 - 0.1]} sag={0.7} n={14} night={night} />
        <Garland a={[WIN.x0 - 0.5, WIN.y1 + 0.6, BACK + 0.3]} b={[WIN.x1 + 0.5, WIN.y1 + 0.6, BACK + 0.3]} sag={0.9} n={12} night={night} />
        <pointLight position={[-14, MEZZ.y + 2.5, MEZZ.z1 + 1]} intensity={night ? 30 : 12} distance={14} decay={1.7} color="#FFC070" />
        <PortalGlow night={night} />
        <Dust night={night} />
        <FloorLamp night={night} />
        <LiveBits />
        <HoloTable night={night} />
        <Outside night={night} />
        <Monitor c={[3.9, 6.8, -10.4]} w={4.2} h={2.7} i={0} />
        <Monitor c={[7.4, 6.8, -10.2]} w={1.9} h={2.7} i={1} />
        <pointLight
          position={[5, 7, -7]}
          intensity={night ? 26 : 10}
          distance={12}
          decay={1.6}
          color="#7FB8FF"
        />
        <VoxelLookContext.Provider value={BASIC}>
          <Voxels cells={cells} size={F} />
        </VoxelLookContext.Provider>
        {withUnit && <UnitHere spot={UNIT_SPOTS[Math.min(frame, UNIT_SPOTS.length - 1)]} frame={frame} />}
        {children}
        <Neon night={night} />
        <Portal night={night} />
        <Lamp p={[2.5, 17.5, -3]} cord={H - 18} power={night ? 120 : 70} />
        <Lamp p={[-17, MEZZ.y - 1.9, -8]} cord={0.9} power={night ? 70 : 50} />
        <Lamp p={[-14, 24.5, -8]} cord={H - 25} power={night ? 60 : 22} />
        <EffectComposer multisampling={4}>
          <N8AO aoRadius={1.4} intensity={2.0} quality="high" />
          <Bloom
            intensity={night ? 0.9 : 0.6}
            luminanceThreshold={0.75}
            mipmapBlur
          />
        </EffectComposer>
      </LoftFx.Provider>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

export const HomeLoftUnit: React.FC = () => <LoftScene mood="evening" shots={LOFT_SHOTS} withUnit />;
export const HomeLoftUnitNight: React.FC = () => <LoftScene mood="night" shots={LOFT_SHOTS} withUnit />;
export const HomeLoft: React.FC = () => (
  <LoftScene mood="evening" shots={LOFT_SHOTS} />
);
export const HomeLoftNight: React.FC = () => (
  <LoftScene mood="night" shots={LOFT_SHOTS} />
);
export const HomeLoftWide: React.FC = () => (
  <LoftScene mood="evening" shots={LOFT_WIDE} />
);
export const HomeLoftWideNight: React.FC = () => (
  <LoftScene mood="night" shots={LOFT_WIDE} />
);
