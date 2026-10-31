// Робот v2 — развитие выбранного варианта B (исходный Robot в heroes.tsx не трогаем).
// Пропорции и руки прежние. Новое: наушники пилота, экран 16×12 с режимами
// (выкл, лицо, код, лампочка) и переходом-шторкой, антенна меняет яркость.
import { useMemo } from "react";
import * as THREE from "three";
import { random } from "remotion";
import {
  EYE_GLOW,
  FACES,
  GRAPHITE,
  ORANGE,
  Pivot,
  Root,
  SCREEN,
  shift,
  type HeroSpec,
} from "./heroes";
import { REST, type Eye, type Pose } from "./rig";
import { box, jitter, useVoxelLook, Voxels, type Vox } from "./voxel";

export type Screen = "off" | "face" | "code" | "bulb" | "thumb" | "heart" | "sub" | "bell" | "check" | "down" | "ask" | "bolt" | "timer"
  | "sad" | "angry" | "love" | "laugh" | "think" | "sleepy" | "confused" | "wink" | "stars" | "error" | "loading" | "talk";

export type Pose2 = Pose & {
  antenna: number; // яркость огонька 0..1
  screen: Screen;
};

export const REST2: Pose2 = { ...REST, antenna: 1, screen: "face" };

export const ROBOT2: HeroSpec = {
  name: "Робот v2",
  scale: 0.95,
  shoulderR: [2.5, 4.2],
  armLen: 2,
  halfWidth: 3.5,
};

const orange = (seed: string) => jitter(ORANGE, seed, 0.05);

// ---------- экран 16×12, пиксель 0.25 ----------

const W = 16;
const H = 12;
const PX = 0.25;

// лица из исходного робота (8×6) — каждый пиксель 2×2
const double = (rows: string[]) =>
  rows.flatMap((r) => {
    const d = [...r].map((c) => c + c).join("");
    return [d, d];
  });

const BULB = [
  "................",
  "......####......",
  ".....######.....",
  "....########....",
  "....########....",
  "....########....",
  ".....######.....",
  "......####......",
  "......====......",
  "......====......",
  ".......==.......",
  "................",
];

// «лайк» — большой палец вверх
export const THUMB = [
  "................",
  "......##........",
  ".....###........",
  ".....###........",
  "....##########..",
  "###.##########..",
  "###.#########...",
  "###.##########..",
  "###.#########...",
  "###..#######....",
  "................",
  "................",
];

const HEART = [
  "................",
  "...###....###...",
  "..#####..#####..",
  ".##############.",
  ".############o#.",
  ".##############.",
  "..############..",
  "...##########...",
  "....########....",
  ".....######.....",
  "......####......",
  ".......##.......",
];

// красная кнопка «подписаться» с белым плюсом
const SUB = [
  "................",
  "................",
  ".##############.",
  ".######..######.",
  ".######..######.",
  ".###........###.",
  ".###........###.",
  ".######..######.",
  ".######..######.",
  ".##############.",
  "................",
  "................",
];

export const BELL_ICON = [
  ".......##.......",
  "......####......",
  ".....######.....",
  "....########....",
  "....########....",
  "....########....",
  "...##########...",
  "...##########...",
  "..############..",
  "................",
  ".......##.......",
  "................",
];

const DOWN = [
  "................",
  ".......##.......",
  ".......##.......",
  ".......##.......",
  ".......##.......",
  "...##..##..##...",
  "....##.##.##....",
  ".....######.....",
  "......####......",
  ".......##.......",
  "................",
  "................",
];

// скорость: пиксельная молния
export const BOLT = [
  "................",
  ".........####...",
  "........####....",
  ".......####.....",
  "......####......",
  ".....#######....",
  "........###.....",
  ".......###......",
  "......###.......",
  ".....##.........",
  "....#...........",
  "................",
];

// секундомер: стрелка почти на нуле — «быстро»
const TIMER = [
  "......####......",
  ".......##.......",
  "....########....",
  "...##......##...",
  "..##...#....##..",
  "..#....#.....#..",
  "..#....#.....#..",
  "..#..........#..",
  "..##........##..",
  "...##......##...",
  "....########....",
  "................",
];

// вопрос зрителю: крупный пиксельный «?»
const ASK = [
  "................",
  ".....######.....",
  "....##....##....",
  "....##....##....",
  "..........##....",
  ".........##.....",
  "........##......",
  ".......##.......",
  ".......##.......",
  "................",
  ".......##.......",
  "................",
];

export const CHECK = [
  "................",
  "..............#.",
  ".............##.",
  "............##..",
  "...........##...",
  ".#........##....",
  ".##......##.....",
  "..##....##......",
  "...##..##.......",
  "....####........",
  ".....##.........",
  "................",
];

const CODE_COLORS = ["#FF9B73", "#7FA6FF", "#FFE3D2", "#9BE0B0"];

// строка кода: отступ и 2–3 «слова» разных цветов; строка n всегда выглядит одинаково
const codeLine = (n: number): (string | null)[] => {
  const row: (string | null)[] = Array(W).fill(null);
  let x = 1 + Math.floor(random(`ind${n}`) * 3) * 2;
  const words = 2 + Math.floor(random(`wc${n}`) * 2);
  for (let w = 0; w < words && x < W - 1; w++) {
    const len = 2 + Math.floor(random(`wl${n}-${w}`) * 4);
    const col =
      CODE_COLORS[Math.floor(random(`col${n}-${w}`) * CODE_COLORS.length)];
    for (let i = 0; i < len && x < W - 1; i++, x++) row[x] = col;
    x++;
  }
  return row;
};

type Grid = (string | null)[][];

const fromRows = (rows: string[], palette: Record<string, string>): Grid =>
  rows.map((r) => [...r].map((c) => palette[c] ?? null));


// ---------- эмоции (16×12): «#» — глаза/рот, остальные буквы — свои цвета ----------
const EMO: Record<string, string[]> = {
  sad: ["................", "................", "....##....##....", "..##........##..", "................", "...##......##...", "...##......##...", "...o............", "...o............", ".....######.....", "....#......#....", "................"],
  angry: ["................", "................", "..##........##..", "....##....##....", "................", "...###....###...", "...###....###...", "................", "................", "....########....", "................", "................"],
  love: ["................", "................", "..LL.LL..LL.LL..", "..LLLLL..LLLLL..", "...LLL....LLL...", "....L......L....", "................", "................", "....#......#....", ".....######.....", "................", "................"],
  laugh: ["................", "................", "...##......##...", "..#..#....#..#..", "................", "................", "....########....", "....#oooooo#....", ".....######.....", "................", "................", "................"],
  think: ["................", "................", ".....##.....##..", ".....##.....##..", "................", "................", "................", "................", ".........###....", "................", "................", "................"],
  sleepy: ["................", "................", "................", "................", "................", "..####....####..", "................", "................", ".......##.......", "................", "................", "................"],
  confused: ["................", "................", "..###......##...", "..###......##...", "..###...........", "................", "................", "................", ".....#...#......", "....#.#.#.#.....", "...#...#...#....", "................"],
  wink: ["................", "................", "...##...........", "...##...........", "...##.....####..", "................", "................", "................", "....#......#....", ".....######.....", "................", "................"],
  stars: ["................", "....S......S....", "...SSS....SSS...", "..SSSSS..SSSSS..", "...SSS....SSS...", "...S.S....S.S...", "................", "................", "................", ".....######.....", "................", "................"],
  error: ["................", "..E...E..E...E..", "...E.E....E.E...", "....E......E....", "...E.E....E.E...", "..E...E..E...E..", "................", "................", "................", "....EEEEEEEE....", "................", "................"],
};
const EMO_PAL = { "#": "#FFF6EE", o: "#7FC4FF", L: "#FF5F87", S: "#FFD66B", E: "#FF5A5A" };

// анимированные части эмоций: точки «думаю», улетающие «z», индикатор загрузки
const animated = (mode: Screen, t: number, g: Grid): Grid => {
  const put = (r: number, c: number, col: string) => {
    if (r >= 0 && r < H && c >= 0 && c < W) g[r][c] = col;
  };
  if (mode === "think") {
    const n = Math.floor(t / 14) % 4;
    for (let i = 0; i < n; i++) put(10, 9 + i * 2, "#9CCBFF");
  }
  if (mode === "sleepy") {
    // буква z поднимается вверх и уходит вправо, по кругу
    const k = (t % 70) / 70;
    const r0 = Math.round(4 - k * 4);
    const c0 = 11 + Math.round(k * 2);
    for (const [dr, dc] of [[0, 0], [0, 1], [0, 2], [1, 1], [2, 0], [2, 1], [2, 2]]) put(r0 + dr - 2, c0 + dc, "#9CCBFF");
  }
  if (mode === "loading") {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = Math.round(5.5 + Math.sin(a) * 3.6);
      const c = Math.round(7.5 + Math.cos(a) * 4.8);
      // текущая точка — белая, хвост из двух — голубой
      const age = (Math.floor(t / 5) - i + 16) % 8;
      const col = age === 0 ? "#FFFFFF" : age <= 2 ? "#8CD2FF" : "#2E5A85";
      put(r, c, col);
      put(r, c + 1, col);
    }
  }
  return g;
};

const screenGrid = (mode: Screen, t: number, eye: Eye, blink: number): Grid => {
  if (mode === "off")
    return Array.from({ length: H }, () => Array<string | null>(W).fill(null));
  if (mode === "bulb")
    return fromRows(BULB, { "#": "#FFD66B", "=": "#B7B0A8" });
  if (mode === "thumb") return fromRows(THUMB, { "#": "#FFE3D2" });
  if (mode === "sub") return fromRows(SUB, { "#": "#E5413A" });
  if (mode === "bell") return fromRows(BELL_ICON, { "#": "#FFC53D" });
  if (mode === "check") return fromRows(CHECK, { "#": "#7EE0A1" });
  if (mode === "down") return fromRows(DOWN, { "#": "#A8E4FF" });
  if (mode === "ask") return fromRows(ASK, { "#": "#A8E4FF" });
  if (mode === "bolt") return fromRows(BOLT, { "#": "#FFD66B" });
  if (mode === "timer") return fromRows(TIMER, { "#": "#7EE0A1" });
  if (mode in EMO) return animated(mode, t, fromRows(EMO[mode], EMO_PAL));
  if (mode === "think" || mode === "loading") return animated(mode, t, Array.from({ length: H }, () => Array<string | null>(W).fill(null)));
  if (mode === "heart") return fromRows(HEART, { "#": "#FF5F73", o: "#FFD3DA" });
  if (mode === "code") {
    const scroll = Math.floor(t / 7);
    return Array.from({ length: H }, (_, r) =>
      r % 2 === 1
        ? codeLine(Math.floor(r / 2) + scroll)
        : Array<string | null>(W).fill(null),
    );
  }
  const face: Eye | "blink" = blink > 0.5 && eye !== "happy" ? "blink" : eye;
  if (mode === "talk") {
    // говорит: глаза как обычно, рот открывается и закрывается в ритме речи (без повторяющегося рисунка)
    const g = fromRows(double(FACES[face]), { "#": EYE_GLOW });
    for (let r = 7; r < H; r++) g[r] = Array<string | null>(W).fill(null);
    const ph = Math.floor(t / 7);
    const open = [0, 2, 1, 2, 0, 1, 2, 2, 1, 0, 1, 2][ph % 12];
    const w = open === 0 ? 4 : open === 1 ? 5 : 6;
    const c0 = Math.floor((W - w) / 2);
    if (open === 0) for (let c = c0; c < c0 + w; c++) g[9][c] = EYE_GLOW;
    else {
      const rows = open === 1 ? [8, 10] : [8, 11];
      for (let c = c0 + 1; c < c0 + w - 1; c++) {
        g[rows[0]][c] = EYE_GLOW;
        g[rows[1]][c] = EYE_GLOW;
      }
      for (let r = rows[0] + 1; r < rows[1]; r++) {
        g[r][c0] = EYE_GLOW;
        g[r][c0 + w - 1] = EYE_GLOW;
        for (let c = c0 + 1; c < c0 + w - 1; c++) g[r][c] = "#3A2A30";
      }
    }
    return g;
  }
  return fromRows(double(FACES[face]), { "#": EYE_GLOW });
};

const SCANLINE = "#5E6B80";
export const WIPE = 8; // кадров на смену картинки

export const ScreenPixels: React.FC<{ pose: Pose2; prev: Screen; t: number }> = ({
  pose,
  prev,
  t,
}) => {
  const cells = useMemo(() => {
    const now = screenGrid(pose.screen, t, pose.eye, pose.blink);
    const old = screenGrid(prev, t, pose.eye, pose.blink);
    // шторка сверху вниз: выше линии — новая картинка, на линии — тусклая полоска
    const edge = t >= WIPE || prev === pose.screen ? H + 1 : (t / WIPE) * H;
    const out: Vox[] = [];
    for (let r = 0; r < H; r++)
      for (let c = 0; c < W; c++) {
        const col =
          r === Math.floor(edge) ? SCANLINE : r < edge ? now[r][c] : old[r][c];
        if (col) out.push([c - (W - 1) / 2, (H - 1) / 2 - r, 0, col]);
      }
    return out;
  }, [pose.screen, pose.eye, pose.blink, prev, t]);
  return <Voxels cells={cells} size={PX} glow seamless />;
};

// блик на стекле экрана: две мягкие диагональные полосы
let sheen: THREE.CanvasTexture | null = null;
export const glassSheen = () => {
  if (sheen) return sheen;
  const c = document.createElement("canvas");
  c.width = 800;
  c.height = 300;
  const g = c.getContext("2d")!;
  const band = (x: number, w: number, a: number) => {
    const grd = g.createLinearGradient(x, 0, x + w, 0);
    grd.addColorStop(0, "rgba(255,255,255,0)");
    grd.addColorStop(0.5, `rgba(255,255,255,${a})`);
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.save();
    g.transform(1, 0, -0.55, 1, 0, 0);
    g.fillStyle = grd;
    g.fillRect(x, 0, w, 300);
    g.restore();
  };
  band(350, 70, 0.1);
  band(450, 26, 0.07);
  sheen = new THREE.CanvasTexture(c);
  sheen.colorSpace = THREE.SRGBColorSpace;
  return sheen;
};

// ---------- сам робот ----------

// prevScreen и screenT — для шторки: что было на экране и сколько кадров прошло со смены
export const Robot2: React.FC<{
  pose: Pose2;
  prevScreen?: Screen;
  screenT?: number;
}> = ({ pose, prevScreen = pose.screen, screenT = 1000 }) => {
  const toy = useVoxelLook().kind === "toy";
  // блик — отражение, а не наклейка: скользит по стеклу вместе с поворотами головы и дыханием
  const sheenTex = useMemo(() => {
    const t = glassSheen().clone();
    t.repeat.set(0.5, 1);
    t.needsUpdate = true;
    return t;
  }, []);
  sheenTex.offset.x = 0.25 - (pose.turn + pose.headTurn) * 0.22 + pose.headTilt * 0.35 + pose.squash * 1.6 + pose.y * 0.03;
  const body = useMemo(
    () =>
      shift(
        box([-2, 1], [2, 4], [-1, 1], (x, y, z) => orange(`rb${x}${y}${z}`), {
          xz: true,
        }),
        0.5,
        0,
        0,
      ),
    [],
  );
  const head = useMemo(() => {
    const inScreen = (x: number, y: number) =>
      x >= -2 && x <= 1 && y >= 1 && y <= 3;
    return shift(
      box(
        [-3, 2],
        [0, 4],
        [-2, 1],
        (x, y, z) =>
          z === 1 && inScreen(x, y) ? null : orange(`rh${x}${y}${z}`),
        {
          xy: true,
          xz: true,
        },
      ),
      0.5,
      0.5,
      0.5,
    );
  }, []);
  // наушники пилота: чашки по бокам головы и тонкая дужка (кубики 0.5), прижатая к голове
  const cups = useMemo<Vox[]>(
    () =>
      [-3.5, 3.5].flatMap((x) =>
        [2, 3].flatMap((y) =>
          [-0.5, 0.5].map((z) => [x, y, z, GRAPHITE] as Vox),
        ),
      ),
    [],
  );
  const band = useMemo<Vox[]>(() => {
    const out: Vox[] = [];
    for (const x of [-6.5, 6.5])
      for (const y of [8, 9, 10]) out.push([x, y, 0, GRAPHITE]);
    for (let x = -6; x <= 6; x++)
      if (Math.abs(x) > 1) out.push([x, 10.5, 0, GRAPHITE]);
    return out;
  }, []);
  const arm = (side: string): Vox[] => [
    [0, -0.5, 0, GRAPHITE],
    [0, -1.5, 0, orange(`rh${side}`)],
  ];
  const leg: Vox[] = [
    [0, -0.5, 0, GRAPHITE],
    [0, -1.5, 0, GRAPHITE],
  ];
  const a = Math.max(0, Math.min(1, pose.antenna));
  const tip = `rgb(${Math.round(110 + a * 145)}, ${Math.round(60 + a * 95)}, ${Math.round(50 + a * 65)})`;
  return (
    <Root pose={pose} scale={ROBOT2.scale}>
      <Voxels cells={body} />
      <Voxels
        cells={[[1.2 / 0.4, 4.0 / 0.4, 1.55 / 0.4, "#FFB08F"]]} // огонёк сбоку на груди — как на аватарке и баннере
        size={0.4}
        glow
      />
      <Voxels cells={[[0, 5, 0, GRAPHITE]]} />
      <Pivot at={[-2.5, 4.2, 0]} rot={[-pose.armLf, 0, -pose.armL]}>
        <Voxels cells={arm("l")} />
      </Pivot>
      <Pivot at={[2.5, 4.2, 0]} rot={[-pose.armRf, 0, pose.armR]}>
        <Voxels cells={arm("r")} />
      </Pivot>
      <Pivot at={[0, 5.5, 0]} rot={[0, pose.headTurn, pose.headTilt]}>
        <Voxels cells={head} />
        <Voxels cells={cups} />
        <Voxels cells={band} size={0.5} />
        <mesh position={[0, 2.5, 0.5]}>
          <boxGeometry args={[4, 3, 1]} />
          <meshStandardMaterial color={SCREEN} roughness={0.22} />
        </mesh>
        <group position={[0, 2.5, 1.04]}>
          <ScreenPixels pose={pose} prev={prevScreen} t={screenT} />
        </group>
        {toy && (
          <>
            {/* стекло экрана: ловит блики окружения */}
            <mesh position={[0, 2.5, 1.21]}>
              <planeGeometry args={[4, 3]} />
              <meshBasicMaterial map={sheenTex} transparent depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh position={[0, 2.5, 1.2]}>
              <planeGeometry args={[4, 3]} />
              <meshPhysicalMaterial
                color="#ffffff"
                transparent
                opacity={0.1}
                roughness={0.06}
                metalness={0}
                clearcoat={1}
                clearcoatRoughness={0.05}
                depthWrite={false}
              />
            </mesh>
          </>
        )}
        <Voxels cells={[[0, 5.5, 0, GRAPHITE]]} />
        <Voxels cells={[[0, 6.3 / 0.7, 0, tip]]} size={0.7} glow />
      </Pivot>
      <Pivot at={[-1, 1.5, 0]}>
        <Voxels cells={leg} />
      </Pivot>
      <Pivot at={[1, 1.5, 0]}>
        <Voxels cells={leg} />
      </Pivot>
    </Root>
  );
};
