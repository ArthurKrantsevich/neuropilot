// Два кандидата в герои канала: A — блоб (как на референсе), B — робот с головой-экраном.
// Цвет — акцент Claude #D97757. Размеры в кубиках; поза — из rig.ts.
import { useMemo } from "react";
import { box, bitmap, jitter, Voxels, type Vox } from "./voxel";
import type { Eye, Pose } from "./rig";

export const ORANGE = "#D97757";
export const GRAPHITE = "#3B3F49";
export const SCREEN = "#0F1319";
const EYE_DARK = "#1B1411";
export const EYE_GLOW = "#FFE3D2";

export type HeroSpec = {
  name: string;
  scale: number;
  shoulderR: [number, number]; // правое плечо в координатах героя (x, y) до масштаба
  armLen: number;
  halfWidth: number;
};

const orange = (seed: string) => jitter(ORANGE, seed, 0.05);
export const shift = (v: Vox[], dx: number, dy: number, dz: number) =>
  v.map(([x, y, z, c]) => [x + dx, y + dy, z + dz, c] as Vox);

// поворот группы вокруг точки pivot
export const Pivot: React.FC<{
  at: [number, number, number];
  rot?: [number, number, number];
  children: React.ReactNode;
}> = ({ at, rot = [0, 0, 0], children }) => (
  <group position={at} rotation={rot}>
    {children}
  </group>
);

// корень героя: ступни на полу, сплющивание от ступней с сохранением объёма
export const Root: React.FC<{
  pose: Pose;
  scale: number;
  children: React.ReactNode;
}> = ({ pose, scale, children }) => {
  const s = pose.squash;
  return (
    <group position={[pose.x, pose.y, 0]} rotation={[0, pose.turn, pose.lean]}>
      <group
        scale={[scale * (1 - s * 0.5), scale * (1 + s), scale * (1 - s * 0.5)]}
      >
        <group position={[0, 0.5, 0]}>{children}</group>
      </group>
    </group>
  );
};

// ---------- A: блоб ----------

export const BLOB: HeroSpec = {
  name: "Блоб",
  scale: 1.2,
  shoulderR: [3.5, 4.4],
  armLen: 2,
  halfWidth: 3,
};

const blobEyeScale = (eye: Eye, blink: number): [number, number, number] => {
  const base: Record<Eye, [number, number]> = {
    open: [1, 1],
    happy: [1.1, 0.3],
    wow: [1.15, 1.25],
  };
  const [sx, sy] = base[eye];
  return [sx, Math.max(0.08, sy * (1 - blink * 0.92)), 1];
};

export const Blob: React.FC<{ pose: Pose }> = ({ pose }) => {
  const body = useMemo(
    () =>
      shift(
        box([-3, 2], [1, 6], [-2, 2], (x, y, z) => orange(`b${x}${y}${z}`), {
          xy: true,
          xz: true,
        }),
        0.5,
        0,
        0,
      ),
    [],
  );
  const arm = (side: string): Vox[] => [
    [0, -0.5, 0, orange(`ba${side}0`)],
    [0, -1.5, 0, orange(`ba${side}1`)],
  ];
  const leg = (side: string): Vox[] => [
    [0, -0.5, -0.5, orange(`bl${side}0`)],
    [0, -0.5, 0.5, orange(`bl${side}1`)],
  ];
  const eyeScale = blobEyeScale(pose.eye, pose.blink);
  // у блоба нет шеи: поворот головы — это взгляд, глаза съезжают по лицу
  const look = pose.headTurn * 1.2;
  return (
    <Root pose={pose} scale={BLOB.scale}>
      <Pivot at={[0, 0.5, 0]} rot={[0, 0, pose.headTilt]}>
        <group position={[0, -0.5, 0]}>
          <Voxels cells={body} />
          {[-1.1, 1.1].map((ex) =>
            pose.eye === "happy" ? (
              // радость — глаза-«домики» ^ ^
              <group key={ex} position={[ex + look, 4.3, 2.56]}>
                {[-1, 1].map((side) => (
                  <mesh
                    key={side}
                    position={[side * 0.2, 0, 0]}
                    rotation={[0, 0, side * 0.75]}
                  >
                    <boxGeometry args={[0.22, 0.75, 0.22]} />
                    <meshStandardMaterial color={EYE_DARK} roughness={0.3} />
                  </mesh>
                ))}
              </group>
            ) : (
              <mesh key={ex} position={[ex + look, 4.1, 2.56]} scale={eyeScale}>
                <boxGeometry args={[0.72, 1.4, 0.22]} />
                <meshStandardMaterial color={EYE_DARK} roughness={0.3} />
              </mesh>
            ),
          )}
          <Pivot at={[-3.5, 4.4, 0]} rot={[-pose.armLf, 0, -pose.armL]}>
            <Voxels cells={arm("l")} />
          </Pivot>
          <Pivot at={[3.5, 4.4, 0]} rot={[-pose.armRf, 0, pose.armR]}>
            <Voxels cells={arm("r")} />
          </Pivot>
        </group>
      </Pivot>
      <Pivot at={[-1.5, 0.5, 0]}>
        <Voxels cells={leg("l")} />
      </Pivot>
      <Pivot at={[1.5, 0.5, 0]}>
        <Voxels cells={leg("r")} />
      </Pivot>
    </Root>
  );
};

// ---------- B: робот с головой-экраном ----------

export const ROBOT: HeroSpec = {
  name: "Робот",
  scale: 0.95,
  shoulderR: [2.5, 4.2],
  armLen: 2,
  halfWidth: 3,
};

// лицо на экране 8×6 пикселей по 0.5
export const FACES: Record<Eye | "blink", string[]> = {
  open: [
    "........",
    "........",
    ".##..##.",
    ".##..##.",
    "........",
    "........",
  ],
  blink: [
    "........",
    "........",
    "........",
    ".##..##.",
    "........",
    "........",
  ],
  happy: [
    "........",
    "........",
    ".#....#.",
    "#.#..#.#",
    "........",
    "........",
  ],
  wow: ["........", ".##..##.", ".##..##.", ".##..##.", "........", "...##..."],
};

export const Robot: React.FC<{ pose: Pose }> = ({ pose }) => {
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
  // голова 6×5×4; передний слой в зоне экрана убран — экран утоплен
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
  const faces = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(FACES).map(([k, rows]) => [k, bitmap(rows, EYE_GLOW)]),
      ),
    [],
  ) as Record<Eye | "blink", Vox[]>;
  const face: Eye | "blink" =
    pose.blink > 0.5 && pose.eye !== "happy" ? "blink" : pose.eye;
  const arm = (side: string): Vox[] => [
    [0, -0.5, 0, GRAPHITE],
    [0, -1.5, 0, orange(`rh${side}`)],
  ];
  const leg: Vox[] = [
    [0, -0.5, 0, GRAPHITE],
    [0, -1.5, 0, GRAPHITE],
  ];
  return (
    <Root pose={pose} scale={ROBOT.scale}>
      <Voxels cells={body} />
      <Voxels
        cells={[[1.2 / 0.4, 4.0 / 0.4, 1.55 / 0.4, "#FFB08F"]]}
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
        <mesh position={[0, 2.5, 0.5]}>
          <boxGeometry args={[4, 3, 1]} />
          <meshStandardMaterial color={SCREEN} roughness={0.22} />
        </mesh>
        <group position={[0, 2.5, 1.06]}>
          {(Object.keys(FACES) as (Eye | "blink")[]).map((k) => (
            <Voxels
              key={k}
              cells={faces[k]}
              size={0.5}
              glow
              visible={k === face}
            />
          ))}
        </group>
        <Voxels cells={[[0, 5.5, 0, GRAPHITE]]} />
        <Voxels cells={[[0, 6.3 / 0.7, 0, "#FF9B73"]]} size={0.7} glow />
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

// угол подъёма правой руки, чтобы она смотрела на цель (мировые координаты, герой без поворота)
export const aim = (
  spec: HeroSpec,
  heroX: number,
  target: [number, number],
) => {
  const sx = heroX + spec.shoulderR[0] * spec.scale;
  const sy = (spec.shoulderR[1] + 0.5) * spec.scale;
  return Math.atan2(target[0] - sx, -(target[1] - sy));
};
