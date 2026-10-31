// ПРОБНИК (выбрасываемый код): новый риг Юнита — суставы, ходьба с постановкой ступней, наклон, дотягивание,
// прыжок, пружины антенны и головы. Сверху «было» (Robot2 по ключам), снизу «стало».
// Физика считается заранее на весь ролик (Remotion рендерит кадры вразнобой) — кадр берёт готовое состояние.
import { ThreeCanvas } from "@remotion/three";
import { useLayoutEffect, useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, N8AO } from "@react-three/postprocessing";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GRAPHITE, ORANGE, SCREEN, shift } from "../heroes";
import { alive, poseAt, type Key } from "../rig";
import {
  glassSheen,
  REST2,
  Robot2,
  ROBOT2,
  ScreenPixels,
  type Pose2,
} from "../robot2";
import { box, jitter, VoxelLookContext, Voxels, type Vox } from "../voxel";

export const SPIKE_FPS = 60;
export const SPIKE_FRAMES = 8 * 60;
export type V3 = [number, number, number];
const TOY = { kind: "toy" as const, bevel: 0.14 };
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const smooth = (x: number) => x * x * (3 - 2 * x);
const orange = (s: string) => jitter(ORANGE, s, 0.05);

// ---------- сценарий движения (секунды) ----------
const T = {
  walk0: 0.6,
  walk1: 3.0,
  turn1: 3.6,
  bend0: 3.7,
  grab: 4.35,
  up1: 5.0,
  squat: 5.5,
  jump: 5.75,
  land: 6.2,
  end: 8,
};
const START: V3 = [-4.2, 0, -1.5];
const WALK_YAW = 1.0;
const FACE_YAW = 0.3;
const D = 4.2; // длина пути
export const STEP = 0.75; // длина шага
export const PELVIS = 1.3; // высота таза стоя (суставы бёдер)
export const L1 = 0.7; // бедро
export const L2 = 0.6; // голень до щиколотки
export const ANKLE = 0.22;
const HIP_X = 0.95;

const dirOf = (yaw: number): V3 => [Math.sin(yaw), 0, Math.cos(yaw)];
const walkEnd: V3 = [
  START[0] + dirOf(WALK_YAW)[0] * D,
  0,
  START[2] + dirOf(WALK_YAW)[2] * D,
];
// кирпич — в зоне досягаемости правой руки после разворота: вправо 2,2 и вперёд 1,3, на постаменте высотой со стол
const RIGHT: V3 = [Math.cos(FACE_YAW), 0, -Math.sin(FACE_YAW)];
const PED_H = 2.0;
const BRICK_HOME: V3 = [
  walkEnd[0] + RIGHT[0] * 2.2 + dirOf(FACE_YAW)[0] * 1.3,
  PED_H + 0.28,
  walkEnd[2] + RIGHT[2] * 2.2 + dirOf(FACE_YAW)[2] * 1.3,
];

// пройденный путь: разгон и торможение
const walkU = (t: number) => {
  const x = ramp(t, T.walk0, T.walk1);
  return D * (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
};

// ---------- ИК: две кости в плоскости — угол бедра вперёд от вертикали и сгиб колена ----------
export function legIK(dz: number, dy: number) {
  const c = Math.max(0.05, Math.min(L1 + L2 - 1e-4, Math.hypot(dz, dy)));
  const ang = Math.atan2(dz, -dy);
  const a1 = Math.acos((L1 * L1 + c * c - L2 * L2) / (2 * L1 * c));
  const a2 = Math.acos((L1 * L1 + L2 * L2 - c * c) / (2 * L1 * L2));
  return { thigh: ang + a1, knee: Math.PI - a2 };
}

// ---------- пружина (полунеявный Эйлер), шаг — кадр ----------
export class Spring {
  x: number;
  v = 0;
  k: number;
  d: number;
  constructor(x0: number, k: number, d: number) {
    this.x = x0;
    this.k = k;
    this.d = d;
  }
  step(target: number, dt: number, force = 0) {
    const a = this.k * (target - this.x) - this.d * this.v + force;
    this.v += a * dt;
    this.x += this.v * dt;
    return this.x;
  }
}

export type ArmPose = { sh: [number, number, number]; elbow: number };
export type LegPose = { thigh: number; knee: number; foot: number };
export type Frame = {
  pos: V3;
  yaw: number;
  pelvisY: number;
  lift: number;
  squash: number;
  pitch: number;
  twist: number;
  sway: number;
  legL: LegPose;
  legR: LegPose;
  armL: ArmPose;
  armR: ArmPose;
  headYaw: number;
  headPitch: number;
  headRoll: number;
  antenna: number;
  antennaRoll: number;
  brick: V3;
  eye: Pose2["eye"];
  screen: Pose2["screen"];
  roll?: number; // наклон корпуса вбок (пожать плечами, танец)
  vis?: number; // 0..1 — для телепорта: Юнит «втягивается» и появляется
  screenPrev?: Pose2["screen"]; // что было на экране до смены — для шторки
  screenSince?: number; // кадр смены экрана
};

const tmpM = new THREE.Matrix4();
const lerp3 = (a: V3, b: V3, k: number): V3 => [
  a[0] + (b[0] - a[0]) * k,
  a[1] + (b[1] - a[1]) * k,
  a[2] + (b[2] - a[2]) * k,
];

// матрица плеча в мире (масштаб героя учтён) — для ИК руки и положения кисти
export function shoulderMatrix(
  f: {
    pos: V3;
    yaw: number;
    pelvisY: number;
    lift: number;
    pitch: number;
    twist: number; roll?: number;
  },
  side: 1 | -1,
) {
  const m = new THREE.Matrix4().makeTranslation(f.pos[0], f.lift, f.pos[2]);
  m.multiply(tmpM.makeRotationY(f.yaw));
  m.multiply(tmpM.makeScale(ROBOT2.scale, ROBOT2.scale, ROBOT2.scale));
  m.multiply(tmpM.makeTranslation(0, f.pelvisY, 0));
  m.multiply(
    tmpM.makeRotationFromEuler(new THREE.Euler(f.pitch, f.twist, f.roll ?? 0, "YXZ")),
  );
  m.multiply(tmpM.makeTranslation(side * 2.5, 4.2 + 0.5 - PELVIS, 0));
  return m;
}
// ИК руки: плечо разворачивается на цель, локоть сгибается; кости по 1 (в единицах героя)
export function armIK(sm: THREE.Matrix4, target: V3): ArmPose {
  const p = new THREE.Vector3(...target).applyMatrix4(sm.clone().invert());
  const c = Math.max(0.2, Math.min(1.98, p.length()));
  const a1 = Math.acos(c / 2);
  const a2 = Math.acos((2 - c * c) / 2);
  const dir = p.clone().normalize();
  const fwd = Math.atan2(dir.z, -dir.y);
  const side = Math.asin(Math.max(-1, Math.min(1, dir.x)));
  return { sh: [-(fwd - a1), 0, side], elbow: -(Math.PI - a2) };
}
export function handPos(sm: THREE.Matrix4, a: ArmPose): V3 {
  const m = sm
    .clone()
    .multiply(tmpM.makeRotationFromEuler(new THREE.Euler(...a.sh)));
  m.multiply(tmpM.makeTranslation(0, -1, 0))
    .multiply(tmpM.makeRotationX(a.elbow))
    .multiply(tmpM.makeTranslation(0, -1.15, 0));
  const v = new THREE.Vector3().applyMatrix4(m);
  return [v.x, v.y, v.z];
}

// ---------- симуляция всего ролика ----------
function simulate(N: number, fps: number): Frame[] {
  const dt = 1 / fps;
  const out: Frame[] = [];
  const headYaw = new Spring(0, 90, 13);
  const headPitch = new Spring(0, 90, 13);
  const antenna = new Spring(0, 160, 6); // мягкая и недодемпфированная — качается
  const antRoll = new Spring(0, 160, 6);
  const lean = new Spring(0, 60, 11);
  const squash = new Spring(0, 260, 14);
  let prevPos: V3 = START;
  let prevV = 0;
  let prevLift = 0;
  let prevLiftV = 0;
  let prevHY = 0;
  let holding = false;
  let brick: V3 = BRICK_HOME;
  for (let i = 0; i < N; i++) {
    const t = i / fps;
    const u = walkU(t);
    const wd = dirOf(WALK_YAW);
    const pos: V3 = [START[0] + wd[0] * u, 0, START[2] + wd[2] * u];
    const yaw =
      WALK_YAW + (FACE_YAW - WALK_YAW) * smooth(ramp(t, T.walk1, T.turn1));
    const speed = Math.hypot(pos[0] - prevPos[0], pos[2] - prevPos[2]) / dt;
    const accel = (speed - prevV) / dt;
    prevPos = pos;
    prevV = speed;
    const env = clamp01(speed / 2.2); // размах шага от скорости: стоя — ступни рядом
    // прыжок: парабола
    let lift = 0;
    if (t >= T.jump && t < T.land) {
      const x = (t - T.jump) / (T.land - T.jump);
      lift = 4 * 1.25 * x * (1 - x);
    }
    const liftV = (lift - prevLift) / dt;
    const liftA = (liftV - prevLiftV) / dt;
    prevLift = lift;
    prevLiftV = liftV;
    const landed = t >= T.land && t < T.land + dt * 1.5;
    // присед: при наклоне за кирпичом и перед прыжком; в ходьбе — чуть ниже и покачивание
    const bend =
      smooth(ramp(t, T.bend0, T.grab - 0.15)) *
      (1 - smooth(ramp(t, T.grab + 0.1, T.up1)));
    const pre = t < T.jump ? smooth(ramp(t, T.squat, T.jump)) : 0;
    const uSteps = u / (STEP / ROBOT2.scale);
    const stepPhase = uSteps * Math.PI;
    const bob = env * (0.08 * Math.abs(Math.sin(stepPhase)) - 0.05);
    const pelvisY = PELVIS - 0.07 * env + bob - 0.42 * bend - 0.3 * pre;
    const pitch =
      0.5 * bend +
      0.12 * pre +
      lean.step(Math.max(-0.12, Math.min(0.12, accel * 0.03)), dt);
    const twist = 0.14 * env * Math.sin(stepPhase);
    const sway = 0.04 * env * Math.sin(stepPhase);
    // ступни (в единицах героя): опорная стоит, маховая переносится дугой
    const uL = u / ROBOT2.scale;
    const foot = (o: number) => {
      const x = (uL + o) / (2 * STEP);
      const fr = x - Math.floor(x);
      const sw = clamp01((fr - 0.5) / 0.5);
      const g = Math.floor(x) + smooth(sw);
      return {
        fz: (2 * STEP * g - o + 0.5 * STEP - uL) * env,
        fy: 0.32 * Math.sin(Math.PI * sw) * env,
      };
    };
    const air = lift > 0.02;
    const legs = [0, STEP].map((o) => {
      const { fz, fy } = foot(o);
      const ik = air
        ? legIK(0.25, -(L1 + L2) * 0.82)
        : legIK(fz, fy + ANKLE - pelvisY);
      return { thigh: ik.thigh, knee: ik.knee, foot: -(ik.thigh - ik.knee) };
    });
    // руки: в ходьбе — противофаза ногам; затем ИК к кирпичу и держим его перед грудью
    const swing = 0.45 * env * Math.sin(stepPhase);
    const armL: ArmPose = {
      sh: [swing, 0, -0.08 - 0.25 * (air ? 1 : 0)],
      elbow: -0.25 - 0.2 * env,
    };
    let armR: ArmPose = { sh: [-swing, 0, 0.08], elbow: -0.25 - 0.2 * env };
    const smR = shoulderMatrix({ pos, yaw, pelvisY, lift, pitch, twist }, 1);
    if (t >= T.bend0 - 0.2 && !holding) {
      const kk = smooth(ramp(t, T.bend0 - 0.2, T.grab));
      const ik = armIK(smR, brick);
      armR = {
        sh: [
          armR.sh[0] + (ik.sh[0] - armR.sh[0]) * kk,
          0,
          armR.sh[2] + (ik.sh[2] - armR.sh[2]) * kk,
        ],
        elbow: armR.elbow + (ik.elbow - armR.elbow) * kk,
      };
    }
    if (t >= T.grab) holding = true;
    if (holding) {
      const chest = new THREE.Vector3(1.9, 3.3 + 0.5 * clamp01(lift), 1.3) // в согнутой руке перед животом: локоть и кисть видны
        .multiplyScalar(ROBOT2.scale)
        .applyMatrix4(
          new THREE.Matrix4()
            .makeTranslation(pos[0], lift, pos[2])
            .multiply(tmpM.makeRotationY(yaw)),
        );
      const target = lerp3(
        BRICK_HOME,
        [chest.x, chest.y, chest.z],
        smooth(ramp(t, T.grab, T.up1)),
      );
      armR = armIK(smR, target);
      brick = handPos(smR, armR);
    }
    // голова: смотрит на кирпич, потом в камеру; пружина даёт запаздывание за телом
    const lookBrick =
      smooth(ramp(t, T.walk1 - 0.4, T.bend0)) *
      (1 - smooth(ramp(t, T.land + 0.3, T.land + 0.9)));
    const hY = headYaw.step(
      -0.15 * twist + 0.25 * lookBrick + (t > T.land + 0.6 ? -0.3 : 0),
      dt,
    );
    const hP = headPitch.step(0.45 * lookBrick - 0.3 * bend, dt);
    const headAcc = (hY - prevHY) / dt;
    prevHY = hY;
    // антенна: инерция от вертикального ускорения, разгона и поворотов головы
    const ant = antenna.step(
      0,
      dt,
      -liftA * 0.02 - accel * 0.03 + (landed ? -40 : 0),
    );
    const antR = antRoll.step(0, dt, -headAcc * 6);
    // приземление: сплющивается только тело (кадр не трясём)
    const sq = squash.step(0, dt, landed ? -260 : 0) - 0.08 * pre;
    out.push({
      pos,
      yaw,
      pelvisY,
      lift,
      squash: sq,
      pitch,
      twist,
      sway,
      legL: legs[0],
      legR: legs[1],
      armL,
      armR,
      headYaw: hY,
      headPitch: -hP * 0.6,
      headRoll: 0.12 * lookBrick * Math.sin(t * 2),
      antenna: ant,
      antennaRoll: antR,
      brick,
      eye: t > T.land ? "happy" : t > T.grab ? "wow" : "open",
      screen: "face",
    });
  }
  return out;
}
let CACHE: Frame[] | null = null;
const framesOf = () => (CACHE ??= simulate(SPIKE_FRAMES, SPIKE_FPS));

// ---------- новый Юнит ----------
const Leg: React.FC<{ side: 1 | -1; l: LegPose }> = ({ side, l }) => (
  <group position={[side * HIP_X, 0, 0]} rotation={[-l.thigh, 0, 0]}>
    <mesh position={[0, -L1 / 2, 0]} castShadow>
      <boxGeometry args={[0.66, L1 + 0.12, 0.66]} />
      <meshPhysicalMaterial
        color={GRAPHITE}
        roughness={0.45}
        clearcoat={0.35}
      />
    </mesh>
    <group position={[0, -L1, 0]} rotation={[l.knee, 0, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.36, 16, 12]} />
        <meshPhysicalMaterial color="#2E323B" roughness={0.4} clearcoat={0.4} />
      </mesh>
      <mesh position={[0, -L2 / 2, 0]} castShadow>
        <boxGeometry args={[0.6, L2 + 0.1, 0.6]} />
        <meshPhysicalMaterial
          color={GRAPHITE}
          roughness={0.45}
          clearcoat={0.35}
        />
      </mesh>
      <group position={[0, -L2 + 0.02, 0]} rotation={[l.foot, 0, 0]}>
        <mesh position={[0, -ANKLE / 2, 0.12]} castShadow>
          <boxGeometry args={[0.8, ANKLE, 1.05]} />
          <meshPhysicalMaterial
            color={GRAPHITE}
            roughness={0.45}
            clearcoat={0.35}
          />
        </mesh>
      </group>
    </group>
  </group>
);
// футболка: те же кубики тела, перекрашенные в ткань, принт — пиксели на груди
const SHIRT = "#1B1D23";
const PRINT = "#55F21C";
const PRINT_ROWS = [
  ".####..####.#####.",
  ".#...#.#......#...",
  ".####..####...#...",
  ".#...#.#......#...",
  ".####...####..#...",
  "..................",
  "..####.####...###.",
  ".#.....#...#.#...#",
  ".####..####..#####",
  ".#.....#..#..#...#",
  "#..###.#...#.#...#",
];
const PRINT_PX = 0.17;
const ShirtPrint: React.FC = () => (
  <group position={[0, 3.05, 1.53]}>
    {PRINT_ROWS.flatMap((row, j) =>
      [...row].map((ch, i) =>
        ch === "#" ? (
          <mesh
            key={`${i}-${j}`}
            position={[(i - (row.length - 1) / 2) * PRINT_PX, ((PRINT_ROWS.length - 1) / 2 - j) * PRINT_PX, 0]}
          >
            <boxGeometry args={[PRINT_PX * 0.96, PRINT_PX * 0.96, 0.06]} />
            <meshStandardMaterial color={PRINT} roughness={0.7} emissive={PRINT} emissiveIntensity={0.18} />
          </mesh>
        ) : null,
      ),
    )}
  </group>
);
const Arm: React.FC<{ side: 1 | -1; a: ArmPose; shirt?: boolean }> = ({ side, a, shirt }) => (
  <group position={[side * 2.5, 4.2, 0]} rotation={a.sh}>
    <Voxels cells={[[0, -0.5, 0, shirt ? jitter(SHIRT, `sl${side}`, 0.05) : GRAPHITE]]} />
    <group position={[0, -1, 0]} rotation={[a.elbow, 0, 0]}>
      <Voxels cells={[[0, -0.5, 0, orange(side > 0 ? "rhr" : "rhl")]]} />
    </group>
  </group>
);

export const Unit3: React.FC<{ f: Frame; frame: number; shirt?: boolean }> = ({ f, frame, shirt }) => {
  const body = useMemo(
    () =>
      shift(
        box(
          [-2, 1],
          [2, 4],
          [-1, 1],
          (x, y, z) => (shirt ? jitter(SHIRT, `sb${x}${y}${z}`, 0.06) : orange(`rb${x}${y}${z}`)),
          { xz: true },
        ),
        0.5,
        0,
        0,
      ),
    [shirt],
  );
  const head = useMemo(
    () =>
      shift(
        box(
          [-3, 2],
          [0, 4],
          [-2, 1],
          (x, y, z) =>
            z === 1 && x >= -2 && x <= 1 && y >= 1 && y <= 3
              ? null
              : orange(`rh${x}${y}${z}`),
          { xy: true, xz: true },
        ),
        0.5,
        0.5,
        0.5,
      ),
    [],
  );
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
    const o: Vox[] = [];
    for (const x of [-6.5, 6.5])
      for (const y of [8, 9, 10]) o.push([x, y, 0, GRAPHITE]);
    for (let x = -6; x <= 6; x++)
      if (Math.abs(x) > 1) o.push([x, 10.5, 0, GRAPHITE]);
    return o;
  }, []);
  const sheen = useMemo(() => {
    const t = glassSheen().clone();
    t.repeat.set(0.5, 1);
    t.needsUpdate = true;
    return t;
  }, []);
  sheen.offset.x = 0.25 - (f.yaw + f.headYaw) * 0.22 + f.squash * 1.6;
  const pose: Pose2 = {
    ...REST2,
    eye: f.eye,
    screen: f.screen,
    blink: alive(REST2, frame, SPIKE_FPS, "spike").blink,
  };
  const s = f.squash;
  return (
    <group
      position={[f.pos[0], f.lift, f.pos[2]]}
      rotation={[0, f.yaw, 0]}
      scale={[ROBOT2.scale * (0.35 + 0.65 * (f.vis ?? 1)), ROBOT2.scale * (f.vis ?? 1), ROBOT2.scale * (0.35 + 0.65 * (f.vis ?? 1))]}
    >
      <group scale={[1 - s * 0.5, 1 + s, 1 - s * 0.5]}>
        {/* таз: ноги крепятся к нему, корпус наклоняется над ним */}
        <group position={[f.sway, f.pelvisY, 0]}>
          <Leg side={-1} l={f.legL} />
          <Leg side={1} l={f.legR} />
          <group rotation={new THREE.Euler(f.pitch, f.twist, f.roll ?? 0, "YXZ")}>
            <group position={[0, 0.5 - PELVIS, 0]}>
              <Voxels cells={body} />
              {shirt ? (
                <ShirtPrint />
              ) : (
                <Voxels
                  cells={[[1.2 / 0.4, 4.0 / 0.4, 1.55 / 0.4, "#FFB08F"]]}
                  size={0.4}
                  glow
                />
              )}
              <Voxels cells={[[0, 5, 0, GRAPHITE]]} />
              <Arm side={-1} a={f.armL} shirt={!!shirt} />
              <Arm side={1} a={f.armR} shirt={!!shirt} />
              <group
                position={[0, 5.5, 0]}
                rotation={
                  new THREE.Euler(f.headPitch, f.headYaw, f.headRoll, "YXZ")
                }
              >
                <Voxels cells={head} />
                <Voxels cells={cups} />
                <Voxels cells={band} size={0.5} />
                <mesh position={[0, 2.5, 0.5]}>
                  <boxGeometry args={[4, 3, 1]} />
                  <meshStandardMaterial color={SCREEN} roughness={0.22} />
                </mesh>
                <group position={[0, 2.5, 1.04]}>
                  <ScreenPixels pose={pose} prev={f.screenPrev ?? pose.screen} t={f.screenSince != null ? frame - f.screenSince : frame + 100} />
                </group>
                <mesh position={[0, 2.5, 1.21]}>
                  <planeGeometry args={[4, 3]} />
                  <meshBasicMaterial
                    map={sheen}
                    transparent
                    depthWrite={false}
                    toneMapped={false}
                  />
                </mesh>
                {/* антенна на пружине: качается от рывков и приземлений */}
                <group
                  position={[0, 5, 0]}
                  rotation={[f.antenna, 0, f.antennaRoll]}
                >
                  <Voxels cells={[[0, 0.5, 0, GRAPHITE]]} />
                  <Voxels
                    cells={[[0, 1.3 / 0.7, 0, "#FFAE73"]]}
                    size={0.7}
                    glow
                  />
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

// ---------- старый Юнит: тот же сюжет на прежних ключах (скользит, рука поднимается целиком) ----------
const key = (t: number, p: Partial<Pose2>): Key<Pose2> => ({
  f: Math.round(t * SPIKE_FPS),
  p,
});
const OLD_KEYS: Key<Pose2>[] = [
  key(0, { ...REST2, turn: WALK_YAW, x: 0 }),
  key(T.walk0, { x: 0 }),
  key(T.walk1, { turn: WALK_YAW }),
  key(T.turn1, { turn: FACE_YAW }),
  key(T.bend0, { armR: 0.15, armRf: 0 }),
  key(T.grab, { armR: 0.9, armRf: 1.1 }),
  key(T.up1, { armR: 0.6, armRf: 1.3, eye: "wow" }),
  key(T.squat, { squash: 0, y: 0 }),
  key(T.jump, { squash: -0.12 }),
  key((T.jump + T.land) / 2, { y: 1.3 / ROBOT2.scale, squash: 0.06 }),
  key(T.land, { y: 0, squash: -0.08, eye: "happy" }),
  key(T.land + 0.3, { squash: 0 }),
];

const Rig: React.FC = () => {
  const { camera, gl, scene } = useThree();
  useLayoutEffect(() => {
    gl.toneMapping = THREE.NeutralToneMapping;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.4;
    camera.position.set(0.6, 7.5, 25);
    camera.lookAt(0.4, 3.8, 0);
    camera.updateProjectionMatrix();
    return () => {
      env.dispose();
      pm.dispose();
    };
  }, [camera, gl, scene]);
  return null;
};

const Stage: React.FC<{ children: React.ReactNode; brick: V3 }> = ({
  children,
  brick,
}) => (
  <>
    <color attach="background" args={["#05070B"]} />
    <fog attach="fog" args={["#05070B", 24, 60]} />
    <hemisphereLight args={["#DCE6FF", "#0A0D14", 0.4]} />
    <directionalLight
      position={[-10, 20, 14]}
      intensity={2.4}
      color="#FFF1E2"
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-12}
      shadow-camera-right={12}
      shadow-camera-top={12}
      shadow-camera-bottom={-12}
    />
    <directionalLight position={[12, 8, -14]} intensity={2} color="#5C8CFF" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial color="#0B0F16" roughness={0.9} />
    </mesh>
    <gridHelper args={[80, 80, "#2B5FA8", "#1A2C4A"]} position={[0, 0.01, 0]} />
    <mesh
      position={[BRICK_HOME[0], PED_H / 2, BRICK_HOME[2]]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1.2, PED_H, 1.2]} />
      <meshPhysicalMaterial color="#2B3240" roughness={0.5} clearcoat={0.3} />
    </mesh>
    <mesh position={brick} castShadow>
      <boxGeometry args={[0.55, 0.55, 0.55]} />
      <meshPhysicalMaterial color="#FFC53D" roughness={0.35} clearcoat={0.5} />
    </mesh>
    {children}
    <EffectComposer multisampling={4}>
      <N8AO aoRadius={1.2} intensity={2.2} quality="high" />
      <Bloom intensity={0.7} luminanceThreshold={0.75} mipmapBlur />
    </EffectComposer>
  </>
);

export const RigSpike: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const fr = framesOf()[Math.min(frame, SPIKE_FRAMES - 1)];
  const old = alive(
    poseAt(OLD_KEYS, frame, REST2),
    frame,
    SPIKE_FPS,
    "spike-old",
  );
  // у старого кирпич «приклеен» к поднятой руке после захвата — как сделали бы ключами
  const oldBrick: V3 =
    frame / SPIKE_FPS < T.grab
      ? BRICK_HOME
      : [fr.pos[0] + 2.2, 3.6 + old.y, fr.pos[2] + 1.4];
  const half = height / 2;
  const label = (txt: string) => (
    <div
      style={{
        position: "absolute",
        top: 40,
        left: 48,
        fontFamily: "Golos Text",
        fontWeight: 800,
        fontSize: 64,
        color: "#F4F0EA",
        textShadow: "0 4px 18px rgba(0,0,0,.8)",
      }}
    >
      {txt}
    </div>
  );
  return (
    <AbsoluteFill style={{ backgroundColor: "#05070B" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          width,
          height: half,
          overflow: "hidden",
        }}
      >
        <ThreeCanvas
          width={width}
          height={half}
          shadows
          camera={{ fov: 40, near: 0.3, far: 200 }}
        >
          <Rig />
          <Stage brick={oldBrick}>
            <VoxelLookContext.Provider value={TOY}>
              {/* старый идёт тем же путём, но просто скользит: ноги не шагают */}
              <group position={[fr.pos[0], 0, fr.pos[2]]}>
                <Robot2 pose={old} />
              </group>
            </VoxelLookContext.Provider>
          </Stage>
        </ThreeCanvas>
        {label("было")}
      </div>
      <div
        style={{
          position: "absolute",
          top: half,
          width,
          height: half,
          overflow: "hidden",
          borderTop: "4px solid #1A2C4A",
        }}
      >
        <ThreeCanvas
          width={width}
          height={half}
          shadows
          camera={{ fov: 40, near: 0.3, far: 200 }}
        >
          <Rig />
          <Stage brick={fr.brick}>
            <VoxelLookContext.Provider value={TOY}>
              <Unit3 f={fr} frame={frame} />
            </VoxelLookContext.Provider>
          </Stage>
        </ThreeCanvas>
        {label("стало")}
      </div>
    </AbsoluteFill>
  );
};
