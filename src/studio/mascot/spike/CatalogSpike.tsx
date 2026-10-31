// ПРОБНИК (выбрасываемый код): каталог движений и эмоций Юнита — 32 подписанных клипа подряд.
// 8 походок, жесты, эмоции и «способности-действия» (лайк, код, колокольчик, готово, починить баг, телепорт, левитация).
import { ThreeCanvas } from "@remotion/three";
import { useLayoutEffect } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, N8AO } from "@react-three/postprocessing";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BELL_ICON, BOLT, CHECK, ROBOT2, THUMB, type Pose2 } from "../robot2";
import { glowTex } from "../glow";
import { VoxelLookContext } from "../voxel";
import {
  apply,
  BOOK,
  BOOK_HANDS,
  bookMatrix,
  CHART,
  CHART_HAND,
  INSPECT_HAND,
  inspectPose,
  MEGA,
  MEGA_HAND,
  megaPose,
  PEDESTAL,
  placePose,
  PULL_FROM,
  pullPose,
  rootMatrix,
  SEAT,
  STAR,
  torsoMatrix,
  torsoPt,
} from "./props";
import {
  ANKLE,
  armIK,
  handPos,
  L1,
  L2,
  legIK,
  PELVIS,
  shoulderMatrix,
  Spring,
  Unit3,
  type ArmPose,
  type Frame,
  type V3,
} from "./RigSpike";

export const CAT_FPS = 60;
const TOY = { kind: "toy" as const, bevel: 0.14 };
const ADD = THREE.AdditiveBlending;
const S = ROBOT2.scale;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const smooth = (x: number) => x * x * (3 - 2 * x);
const backOut = (x: number, k = 1.3) => 1 + (k + 1) * Math.pow(x - 1, 3) + k * Math.pow(x - 1, 2);
const easeIO = (x: number) =>
  x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

type Clip = { id: string; label: string; dur: number };
const CLIPS: Clip[] = [
  // походки
  { id: "walk", label: "походка", dur: 3.0 },
  { id: "run", label: "бег", dur: 2.6 },
  { id: "sneak", label: "крадётся", dur: 3.2 },
  { id: "skip", label: "вприпрыжку", dur: 3.0 },
  { id: "tired", label: "устало плетётся", dur: 3.4 },
  { id: "march", label: "марширует", dur: 3.0 },
  { id: "back", label: "пятится", dur: 3.0 },
  { id: "dance", label: "танцует", dur: 3.2 },
  // действия и способности
  { id: "like", label: "лайк", dur: 2.8 },
  { id: "code", label: "пишет код", dur: 3.2 },
  { id: "bell", label: "колокольчик", dur: 2.6 },
  { id: "down", label: "подписка тут ↓", dur: 2.4 },
  { id: "check", label: "готово", dur: 2.4 },
  { id: "fix", label: "чинит баг", dur: 3.2 },
  { id: "teleport", label: "телепорт", dur: 3.0 },
  { id: "levitate", label: "левитирует", dur: 3.0 },
  // жесты
  { id: "wave", label: "машет", dur: 2.4 },
  { id: "clap", label: "аплодирует", dur: 2.4 },
  { id: "nod", label: "кивает «да»", dur: 2.0 },
  { id: "no", label: "качает головой «нет»", dur: 2.0 },
  { id: "wink", label: "подмигивает", dur: 2.4 },
  { id: "think", label: "думает → идея", dur: 3.0 },
  { id: "shrug", label: "пожимает плечами", dur: 2.4 },
  { id: "surprise", label: "удивился", dur: 2.2 },
  // эмоции
  { id: "joy", label: "радость", dur: 2.4 },
  { id: "laugh", label: "смеётся", dur: 2.4 },
  { id: "love", label: "любовь", dur: 2.6 },
  { id: "sad", label: "грусть", dur: 2.6 },
  { id: "angry", label: "злится", dur: 2.6 },
  { id: "sleepy", label: "засыпает", dur: 3.0 },
  { id: "error", label: "ошибка", dur: 2.2 },
  { id: "loading", label: "загрузка", dur: 2.2 },
  // ещё 16: способности, предметы, тело, вход и выход
  { id: "pull", label: "притягивает предмет", dur: 3.0 },
  { id: "mat", label: "материализует", dur: 3.0 },
  { id: "dis", label: "растворяет", dur: 2.6 },
  { id: "place", label: "ставит на место", dur: 2.6 },
  { id: "point", label: "указывает на предмет", dur: 2.4 },
  { id: "mega", label: "кричит в рупор", dur: 2.6 },
  { id: "read", label: "читает", dur: 3.0 },
  { id: "charge", label: "заряжается", dur: 3.0 },
  { id: "sit", label: "садится", dur: 3.0 },
  { id: "hatch", label: "вылезает из люка", dur: 2.6 },
  { id: "fall", label: "падает и встаёт", dur: 3.2 },
  { id: "hips", label: "руки в боки", dur: 2.4 },
  { id: "chart", label: "показывает на график", dur: 3.0 },
  { id: "inspect", label: "рассматривает", dur: 3.0 },
  { id: "turn", label: "поворот к камере", dur: 2.6 },
  { id: "exit", label: "уходит из кадра", dur: 3.0 },
];
const STARTS = CLIPS.reduce<number[]>(
  (a, c, i) => (a.push(i ? a[i - 1] + CLIPS[i - 1].dur : 0), a),
  [],
);
const TOTAL = STARTS[STARTS.length - 1] + CLIPS[CLIPS.length - 1].dur;
export const CAT_FRAMES = Math.round(TOTAL * CAT_FPS);
const clipAt = (t: number) => {
  let i = 0;
  while (i + 1 < CLIPS.length && t >= STARTS[i + 1]) i++;
  return { c: CLIPS[i], i, tau: t - STARTS[i] };
};

// ---------- походки: шаг, подъём ступни, доля фазы переноса (>0.5 — фаза полёта), подпрыгивание ----------
// шаг крупнее, чем в первом каталоге: ноги короткие, мелкий шаг не читался
type Gait = {
  stride: number;
  lift: number;
  sf: number;
  drop: number;
  bounce: number;
  hop: number;
  lean: number;
  swing: number;
  elbow: number;
  dist: number;
  yaw: number;
  back?: boolean;
};
const GAITS: Record<string, Gait> = {
  walk: {
    stride: 0.9,
    lift: 0.45,
    sf: 0.5,
    drop: 0.1,
    bounce: 0.12,
    hop: 0.08,
    lean: 0.05,
    swing: 0.55,
    elbow: -0.35,
    dist: 8,
    yaw: 1.15,
  },
  run: {
    stride: 1.25,
    lift: 0.65,
    sf: 0.62,
    drop: 0.16,
    bounce: 0.12,
    hop: 0.4,
    lean: 0.22,
    swing: 0.95,
    elbow: -1.3,
    dist: 11,
    yaw: 1.15,
  },
  sneak: {
    stride: 0.55,
    lift: 0.6,
    sf: 0.5,
    drop: 0.3,
    bounce: 0.04,
    hop: 0,
    lean: 0.12,
    swing: 0.15,
    elbow: -1.2,
    dist: 4,
    yaw: 1.15,
  },
  skip: {
    stride: 1.0,
    lift: 0.55,
    sf: 0.55,
    drop: 0.05,
    bounce: 0.05,
    hop: 0.75,
    lean: 0.05,
    swing: 0.85,
    elbow: -0.5,
    dist: 8,
    yaw: 1.15,
  },
  tired: {
    stride: 0.55,
    lift: 0.18,
    sf: 0.5,
    drop: 0.2,
    bounce: 0.04,
    hop: 0,
    lean: 0.14,
    swing: 0.12,
    elbow: -0.1,
    dist: 4,
    yaw: 1.15,
  },
  march: {
    stride: 0.8,
    lift: 0.85,
    sf: 0.5,
    drop: 0.02,
    bounce: 0.06,
    hop: 0.12,
    lean: -0.04,
    swing: 1.0,
    elbow: -0.05,
    dist: 7,
    yaw: 1.15,
  },
  back: {
    stride: 0.7,
    lift: 0.4,
    sf: 0.5,
    drop: 0.12,
    bounce: 0.08,
    hop: 0.05,
    lean: -0.08,
    swing: 0.35,
    elbow: -0.6,
    dist: 5,
    yaw: 0.6,
    back: true,
  },
  exit: { stride: 0.9, lift: 0.45, sf: 0.5, drop: 0.1, bounce: 0.12, hop: 0.08, lean: 0.05, swing: 0.55, elbow: -0.35, dist: 9, yaw: -1.3 },
};
function gaitLegs(
  g: Gait,
  uL: number,
  env: number,
  pelvisY: number,
  air: number,
) {
  const c = g.stride * (1 - g.sf);
  const sign = g.back ? -1 : 1;
  const foot = (o: number) => {
    const x = (uL + o) / (2 * g.stride);
    const fr = x - Math.floor(x);
    const sw = clamp01((fr - (1 - g.sf)) / g.sf);
    const gg = Math.floor(x) + smooth(sw);
    return {
      fz: sign * (2 * g.stride * gg - o + c - uL) * env,
      fy: g.lift * Math.sin(Math.PI * sw) * env,
    };
  };
  return [0, g.stride].map((o) => {
    const { fz, fy } = foot(o);
    const ik = legIK(fz, fy + ANKLE - pelvisY - air / S);
    return { thigh: ik.thigh, knee: ik.knee, foot: -(ik.thigh - ik.knee) };
  });
}
const standLegs = (pelvisY: number, dz = [0, 0], dy = [0, 0]) =>
  [0, 1].map((i) => {
    const ik = legIK(dz[i], dy[i] + ANKLE - pelvisY);
    return { thigh: ik.thigh, knee: ik.knee, foot: -(ik.thigh - ik.knee) };
  });

type CFrame = Frame & {
  clip: number;
  tau: number;
  fx: string;
  hand: V3;
  handL: V3;
};
function simulate(): CFrame[] {
  const dt = 1 / CAT_FPS;
  const out: CFrame[] = [];
  const headYaw = new Spring(0, 90, 13);
  const headPitch = new Spring(0, 90, 13);
  const headRoll = new Spring(0, 90, 13);
  const antenna = new Spring(0, 160, 6);
  const antRoll = new Spring(0, 160, 6);
  const squash = new Spring(0, 260, 14);
  let prevHY = 0;
  let prevLift = 0;
  let prevLiftV = 0;
  // сглаживание: каждый сустав идёт к цели через пружину без перелёта — на стыках поз нет рывков
  const SM = new Map<string, Spring>();
  const sm = (key: string, target: number, k = 380) => {
    let sp = SM.get(key);
    if (!sp) SM.set(key, (sp = new Spring(target, k, 2 * Math.sqrt(k))));
    return sp.step(target, dt);
  };
  let lastScreen: Pose2["screen"] = "face";
  let prevScreen: Pose2["screen"] = "face";
  let screenSince = -1000;
  for (let i = 0; i < CAT_FRAMES; i++) {
    const t = i / CAT_FPS;
    const { c, i: ci, tau } = clipAt(t);
    const k = tau / c.dur;
    let pos: V3 = [0, 0, 1];
    let yaw = 0.25;
    let pelvisY = PELVIS;
    let pitch = 0;
    let roll = 0;
    let twist = 0;
    let lift = 0;
    let impulse = 0;
    let vis = 1;
    let armL: ArmPose = { sh: [0, 0, -0.08], elbow: -0.25 };
    let armR: ArmPose = { sh: [0, 0, 0.08], elbow: -0.25 };
    let legs = standLegs(PELVIS);
    let hy = 0;
    let hp = 0;
    let hr = 0;
    let screen: Pose2["screen"] = "face";
    let eye: Pose2["eye"] = "open";
    let fx = "";
    let airLegs = true;
    let customLegs = false;
    const g = GAITS[c.id];
    if (g) {
      // «уходит из кадра»: стартует из центра и только разгоняется
      const u = c.id === "exit" ? g.dist * Math.pow(clamp01(k), 1.4) : g.dist * easeIO(clamp01(k));
      const env = c.id === "exit" ? clamp01(k * 3) : clamp01(Math.sin(Math.PI * clamp01(k)) * 1.6);
      yaw = g.yaw;
      // направление движения: вперёд по взгляду, у «пятится» — спиной вперёд
      const face: V3 = [Math.sin(yaw), 0, Math.cos(yaw)];
      const dir: V3 = g.back ? [-face[0], 0, -face[2]] : face;
      pos = [
        (-g.dist / 2) * dir[0] + dir[0] * u,
        0,
        0.5 + (u - g.dist / 2) * dir[2] * 0.6,
      ];
      if (c.id === "exit") {
        pos = [dir[0] * u, 0, 1 + dir[2] * u * 0.6];
        hy = 0.5 * (1 - ramp(tau, 0.2, 1.0)); // оглядывается на зрителя и уходит
        eye = "happy";
      }
      const uL = u / S;
      const phase = (uL / g.stride) * Math.PI;
      lift = g.hop * env * Math.abs(Math.sin(phase));
      pelvisY =
        PELVIS -
        g.drop * env +
        env * (g.bounce * Math.abs(Math.sin(phase)) - g.bounce * 0.5);
      pitch = g.lean * env;
      twist = 0.14 * env * Math.sin(phase);
      const sw = g.swing * env * Math.sin(phase);
      armL = { sh: [sw, 0, -0.1], elbow: g.elbow };
      armR = { sh: [-sw, 0, 0.1], elbow: g.elbow };
      legs = gaitLegs(g, uL, env, pelvisY, lift);
      airLegs = false;
      if (c.id === "sneak") {
        hy = 0.35 * Math.sin(tau * 2.2);
        armL = { sh: [-0.7 + sw, 0, -0.2], elbow: -1.3 };
        armR = { sh: [-0.7 - sw, 0, 0.2], elbow: -1.3 };
      }
      if (c.id === "skip") eye = "happy";
      if (c.id === "run") screen = "bolt";
      if (c.id === "tired") {
        hp = 0.18;
        screen = "sleepy";
      }
      if (c.id === "march") {
        // руки прямые и высоко, корпус ровно
        armL = { sh: [1.6 * sw, 0, -0.1], elbow: -0.05 };
        armR = { sh: [-1.6 * sw, 0, 0.1], elbow: -0.05 };
        screen = "angry";
      }
      if (c.id === "back") {
        hy = -0.2; // оглядывается через плечо, лицо к зрителю
        screen = "confused";
      }
    } else {
      const a = (x: number, y: number) => ramp(tau, x, y);
      const hop = (t0: number, t1: number, h: number) => {
        const j = ramp(tau, t0, t1);
        return j > 0 && j < 1 ? h * 4 * j * (1 - j) : 0;
      };
      const landAt = (tl: number) => tau >= tl && tau < tl + dt * 1.5;
      // руки по ИК на цель (мир) и плавное смешивание с позой покоя
      const ik = (side: 1 | -1, w: V3) => armIK(shoulderMatrix({ pos, yaw, pelvisY, lift, pitch, twist, roll }, side), w);
      const mixA = (a0: ArmPose, b: ArmPose, q: number): ArmPose => ({
        sh: [a0.sh[0] + (b.sh[0] - a0.sh[0]) * q, a0.sh[1] + (b.sh[1] - a0.sh[1]) * q, a0.sh[2] + (b.sh[2] - a0.sh[2]) * q],
        elbow: a0.elbow + (b.elbow - a0.elbow) * q,
      });
      const tp = (p: V3) => torsoPt({ pos, yaw, pelvisY, lift, pitch, twist, roll }, p);
      switch (c.id) {
        case "dance": {
          // грув: качается в такт 2 Гц, руки по очереди вверх, переступает на месте
          const b = tau * 2 * Math.PI * 2;
          pelvisY = PELVIS - 0.12 - 0.1 * Math.abs(Math.sin(b / 2));
          roll = 0.14 * Math.sin(b / 2);
          hr = -0.16 * Math.sin(b / 2);
          armL = {
            sh: [-0.3, 0, -1.4 - 0.9 * Math.max(0, Math.sin(b / 2))],
            elbow: -0.9,
          };
          armR = {
            sh: [-0.3, 0, 1.4 + 0.9 * Math.max(0, -Math.sin(b / 2))],
            elbow: -0.9,
          };
          legs = standLegs(
            pelvisY,
            [0, 0],
            [
              0.25 * Math.max(0, Math.sin(b / 2)),
              0.25 * Math.max(0, -Math.sin(b / 2)),
            ],
          );
          screen = "laugh";
          airLegs = false;
          break;
        }
        case "like": {
          const up = smooth(a(0.1, 0.45));
          armR = {
            sh: [-1.55 * up, 0, 0.1 + 0.2 * up],
            elbow: -1.5 * up - 0.25 * (1 - up),
          };
          if (tau > 0.35) screen = "thumb";
          eye = "happy";
          fx = "like";
          break;
        }
        case "code": {
          const on = smooth(a(0.1, 0.5));
          const tap = (ph: number) => 0.14 * Math.sin(tau * 26 + ph) * on;
          armL = {
            sh: [-0.95 * on + tap(0), 0, -0.3 * on],
            elbow: -0.9 * on - 0.25,
          };
          armR = {
            sh: [-0.95 * on + tap(1.7), 0, 0.3 * on],
            elbow: -0.9 * on - 0.25,
          };
          pitch = 0.12 * on;
          hp = 0.25 * on;
          screen = tau > 0.3 ? "code" : "face";
          fx = "code";
          break;
        }
        case "bell": {
          const on = smooth(a(0.1, 0.4));
          // звонит: рука вверх и покачивается в такт колокольчику
          const ring = Math.sin(tau * 14) * Math.exp(-((tau - 0.6) % 1) * 2);
          armR = {
            sh: [-0.4 * on, 0, (2.3 + 0.15 * ring) * on + 0.08],
            elbow: -0.4,
          };
          screen = "bell";
          fx = "bell";
          break;
        }
        case "down": {
          const on = smooth(a(0.1, 0.4));
          const bob = 0.12 * Math.sin(tau * 9) * on;
          armR = {
            sh: [-0.9 * on, 0, 0.35 * on + 0.08],
            elbow: (-1.7 + bob) * on - 0.25,
          };
          pitch = 0.08 * on;
          hp = 0.25 * on;
          screen = "down";
          break;
        }
        case "check": {
          const up = smooth(a(0.15, 0.45));
          armR = {
            sh: [-1.4 * up, 0, 0.2 * up + 0.08],
            elbow: -1.3 * up - 0.25,
          };
          screen = tau > 0.35 ? "check" : "face";
          eye = "happy";
          fx = "check";
          lift = hop(0.4, 0.75, 0.4);
          if (landAt(0.75)) impulse = 1;
          break;
        }
        case "fix": {
          // молоток: замах вверх и удар вниз, 3 удара; на ударе — искры
          const on = smooth(a(0.05, 0.3));
          const cyc = clamp01((tau - 0.3) / 2.4) * 3;
          const ph = cyc - Math.floor(cyc);
          const swing =
            tau > 0.3 && tau < 2.7
              ? ph < 0.65
                ? smooth(ph / 0.65)
                : 1 - Math.pow((ph - 0.65) / 0.35, 2)
              : 0;
          armR = {
            sh: [-(0.4 + 2.0 * swing) * on, 0, 0.25 * on + 0.08],
            elbow: -0.6 * on - 0.25,
          };
          pitch = 0.18 * on;
          hp = 0.35 * on;
          pelvisY = PELVIS - 0.15 * on;
          screen = tau < 2.7 ? "angry" : "check";
          eye = tau > 2.7 ? "happy" : "open";
          fx = "fix";
          if (tau > 0.3 && tau < 2.7 && ph > 0.97) impulse = 0.4;
          break;
        }
        case "teleport": {
          // втягивается вверх лучом, исчезает, появляется правее
          vis = tau < 0.9 ? 1 - smooth(a(0.3, 0.9)) : smooth(a(1.4, 2.0));
          pos = tau < 1.15 ? [-1.4, 0, 1] : [1.6, 0, 1];
          screen = "loading";
          if (tau > 2.0) {
            screen = "face";
            eye = "happy";
          }
          if (landAt(2.0)) impulse = 1;
          fx = "teleport";
          break;
        }
        case "levitate": {
          const on = smooth(a(0.1, 0.8)) * (1 - smooth(a(2.5, 2.95)));
          lift = (1.2 + 0.12 * Math.sin(tau * 3)) * on;
          armL = { sh: [-0.4 * on, 0, -1.0 * on - 0.08], elbow: -0.6 };
          armR = { sh: [-0.4 * on, 0, 1.0 * on + 0.08], elbow: -0.6 };
          screen = "sleepy";
          fx = "levitate";
          if (landAt(2.95)) impulse = 0.6;
          break;
        }
        case "wave": {
          const on = smooth(a(0.1, 0.4)) * (1 - smooth(a(2.0, 2.35)));
          const w = Math.sin(tau * 13);
          armL = {
            sh: [-0.2 * on, 0, (-2.45 + 0.18 * w) * on - 0.08],
            elbow: (-0.5 - 0.35 * w) * on - 0.25,
          };
          roll = -0.05 * on;
          eye = "happy";
          break;
        }
        case "clap": {
          const on = smooth(a(0.1, 0.35));
          const cl = (Math.sin(tau * 18) + 1) / 2;
          armL = {
            sh: [-1.1 * on, 0, (0.55 - 0.25 * cl) * on - 0.08],
            elbow: -1.2 * on - 0.25,
          };
          armR = {
            sh: [-1.1 * on, 0, (-0.55 + 0.25 * cl) * on + 0.08],
            elbow: -1.2 * on - 0.25,
          };
          screen = "stars";
          fx = "clap";
          break;
        }
        case "nod":
          hp = 0.3 * Math.max(0, Math.sin(tau * 9)) * (1 - ramp(tau, 1.4, 1.8));
          eye = "happy";
          break;
        case "no":
          hy = 0.4 * Math.sin(tau * 9) * (1 - ramp(tau, 1.4, 1.8));
          break;
        case "wink": {
          const on = smooth(a(0.15, 0.5));
          armR = { sh: [-1.5 * on, 0, 0.12], elbow: -0.15 };
          pitch = -0.05 * on;
          hr = 0.12 * on;
          screen = tau > 0.4 ? "wink" : "face";
          break;
        }
        case "think": {
          const on = smooth(a(0.1, 0.5)) * (1 - smooth(a(2.0, 2.3)));
          armR = {
            sh: [-1.25 * on, 0, -0.55 * on + 0.08],
            elbow: -2.3 * on - 0.25,
          };
          hr = 0.18 * on;
          hy = -0.25 * on;
          hp = -0.08 * on;
          screen = tau < 1.95 ? "think" : "bulb";
          lift = hop(1.95, 2.35, 0.6);
          if (landAt(2.35)) impulse = 1;
          break;
        }
        case "shrug": {
          const on = smooth(a(0.15, 0.55)) * (1 - smooth(a(1.8, 2.2)));
          armL = {
            sh: [-0.35 * on, 0, -1.15 * on - 0.08],
            elbow: -1.45 * on - 0.25,
          };
          armR = {
            sh: [-0.35 * on, 0, 1.15 * on + 0.08],
            elbow: -1.45 * on - 0.25,
          };
          hr = 0.22 * on;
          pelvisY = PELVIS + 0.06 * on;
          screen = "confused";
          break;
        }
        case "surprise": {
          // отпрянул: короткий подскок назад, руки к голове
          const on = smooth(a(0.05, 0.25));
          pos = [0, 0, 1 - 0.8 * smooth(a(0.05, 0.45))];
          lift = hop(0.05, 0.45, 0.7);
          if (landAt(0.45)) impulse = 1;
          armL = {
            sh: [-0.6 * on, 0, -1.9 * on - 0.08],
            elbow: -1.6 * on - 0.25,
          };
          armR = {
            sh: [-0.6 * on, 0, 1.9 * on + 0.08],
            elbow: -1.6 * on - 0.25,
          };
          pitch = -0.12 * on;
          eye = "wow";
          break;
        }
        case "joy": {
          const up = smooth(a(0.1, 0.4));
          armL = { sh: [-0.2 * up, 0, -2.7 * up - 0.08], elbow: -0.3 };
          armR = { sh: [-0.2 * up, 0, 2.7 * up + 0.08], elbow: -0.3 };
          lift = hop(0.5, 0.95, 1.3);
          if (tau < 0.5) pelvisY = PELVIS - 0.28 * smooth(a(0.25, 0.5));
          if (landAt(0.95)) impulse = 1;
          screen = "stars";
          break;
        }
        case "laugh": {
          const on = smooth(a(0.1, 0.3));
          // трясётся от смеха, держится за живот
          pelvisY = PELVIS - 0.05 * on + 0.05 * Math.sin(tau * 40) * on;
          pitch = -0.1 * on;
          hp = -0.2 * on;
          armL = {
            sh: [-0.7 * on, 0, 0.35 * on - 0.08],
            elbow: -1.2 * on - 0.25,
          };
          armR = {
            sh: [-0.7 * on, 0, -0.35 * on + 0.08],
            elbow: -1.2 * on - 0.25,
          };
          screen = "laugh";
          break;
        }
        case "love": {
          const on = smooth(a(0.1, 0.5));
          armL = {
            sh: [-1.0 * on, 0, 0.55 * on - 0.08],
            elbow: -1.45 * on - 0.25,
          };
          armR = {
            sh: [-1.0 * on, 0, -0.55 * on + 0.08],
            elbow: -1.45 * on - 0.25,
          };
          roll = 0.1 * Math.sin(tau * 3.2) * on;
          hr = -0.12 * Math.sin(tau * 3.2) * on;
          screen = "love";
          fx = "hearts";
          break;
        }
        case "sad": {
          const on = smooth(a(0.1, 0.8));
          pitch = 0.22 * on;
          hp = 0.4 * on;
          pelvisY = PELVIS - 0.1 * on;
          armL = { sh: [0.15 * on, 0, 0.12 * on - 0.08], elbow: -0.15 };
          armR = { sh: [0.15 * on, 0, -0.12 * on + 0.08], elbow: -0.15 };
          roll = 0.04 * Math.sin(tau * 1.6) * on;
          screen = "sad";
          break;
        }
        case "angry": {
          const on = smooth(a(0.1, 0.4));
          armL = {
            sh: [0.25 * on, 0, -0.4 * on - 0.08],
            elbow: -1.7 * on - 0.25,
          };
          armR = {
            sh: [0.25 * on, 0, 0.4 * on + 0.08],
            elbow: -1.7 * on - 0.25,
          };
          pitch = 0.1 * on;
          lift = hop(0.6, 0.85, 0.35) + hop(1.5, 1.75, 0.35);
          if (landAt(0.85) || landAt(1.75)) impulse = 1;
          screen = "angry";
          fx = "red";
          break;
        }
        case "sleepy": {
          const cyc = (tau % 1.4) / 1.4;
          hp = cyc < 0.85 ? 0.45 * smooth(cyc / 0.85) : 0;
          pelvisY = PELVIS - 0.06;
          armL = { sh: [0.05, 0, -0.03], elbow: -0.1 };
          armR = { sh: [0.05, 0, 0.03], elbow: -0.1 };
          screen = "sleepy";
          break;
        }
        case "error":
          hy = 0.4 * Math.sin(tau * 22) * Math.exp(-tau * 1.4);
          screen = "error";
          fx = "red";
          break;
        case "pull": {
          const on = smooth(a(0.1, 0.5)) * (1 - smooth(a(2.3, 2.8)));
          armR = { sh: [-1.0 * on, 0, 0.75 * on + 0.08], elbow: -0.1 * on - 0.25 * (1 - on) };
          hy = 0.35 * on;
          hp = 0.15 * on;
          eye = tau > 0.9 ? "wow" : "open";
          fx = "pull";
          break;
        }
        case "mat": {
          const on = smooth(a(0.1, 0.4)) * (1 - smooth(a(2.4, 2.8)));
          const tr = 0.05 * Math.sin(tau * 32);
          armL = { sh: [-1.2 * on + tr, 0, -0.35 * on - 0.08], elbow: -0.4 * on - 0.25 };
          armR = { sh: [-1.2 * on - tr, 0, 0.35 * on + 0.08], elbow: -0.4 * on - 0.25 };
          hy = 0.3 * on;
          pelvisY = PELVIS - 0.1 * on;
          screen = tau > 0.2 && tau < 2.5 ? "code" : "face";
          fx = "mat";
          break;
        }
        case "dis": {
          const on = smooth(a(0.1, 0.4)) * (1 - smooth(a(2.1, 2.5)));
          const sweep = smooth(a(0.5, 1.1));
          armR = { sh: [-0.9 * on, 0, (1.1 - 0.8 * sweep) * on + 0.08], elbow: -0.3 };
          hy = 0.3 * on;
          fx = "dis";
          break;
        }
        case "place": {
          const on = smooth(a(0.1, 0.4)) * (1 - smooth(a(2.1, 2.5)));
          armR = { sh: [-0.8 * on, 0, 0.8 * on + 0.08], elbow: -0.1 * on - 0.25 * (1 - on) };
          hy = 0.35 * on;
          eye = tau > 1.7 ? "happy" : "open";
          fx = "place";
          break;
        }
        case "point": {
          const on = smooth(a(0.15, 0.5)) * (1 - smooth(a(2.0, 2.35)));
          {
            const top = apply(shoulderMatrix({ pos, yaw, pelvisY, lift, pitch, twist, roll }, -1), [0, 0, 0]); // плечо
            const d = [STAR[0] - top[0], STAR[1] - top[1], STAR[2] - top[2]];
            const l = Math.hypot(d[0], d[1], d[2]);
            armL = mixA(armL, ik(-1, [top[0] + (d[0] / l) * 2.1 * S, top[1] + (d[1] / l) * 2.1 * S, top[2] + (d[2] / l) * 2.1 * S]), on);
          }
          hy = -0.45 * on;
          hp = -0.25 * on;
          eye = "wow";
          fx = "point";
          break;
        }
        case "mega": {
          const on = smooth(a(0.1, 0.4)) * (1 - smooth(a(2.2, 2.55)));
          pitch = -0.08 * on;
          armR = mixA(armR, ik(1, tp(MEGA_HAND)), on);
          armL = { sh: [-0.3 * on, 0, -0.35 * on - 0.08], elbow: -0.6 * on - 0.25 };
          screen = tau > 0.4 && tau < 2.3 ? "laugh" : "face";
          fx = "mega";
          break;
        }
        case "read": {
          const on = smooth(a(0.1, 0.5)) * (1 - smooth(a(2.6, 2.95)));
          armL = mixA(armL, ik(-1, tp(BOOK_HANDS[0])), on);
          armR = mixA(armR, ik(1, tp(BOOK_HANDS[1])), on);
          hp = 0.15 * on;
          screen = tau < 2.2 ? "think" : "face";
          eye = "happy";
          fx = "book";
          break;
        }
        case "charge": {
          screen = tau < 1.8 ? "loading" : "bolt";
          lift = hop(1.8, 2.2, 0.4);
          if (landAt(2.2)) impulse = 0.6;
          armL = { sh: [0, 0, -0.35 * smooth(a(1.8, 2.0)) - 0.08], elbow: -0.3 };
          armR = { sh: [0, 0, 0.35 * smooth(a(1.8, 2.0)) + 0.08], elbow: -0.3 };
          fx = "charge";
          break;
        }
        case "sit": {
          const on = smooth(a(0.2, 1.0)) * (1 - smooth(a(2.4, 2.95)));
          // садится на ящик: бёдра горизонтально, голени вниз; вполоборота, чтобы ноги были видны
          // садится на ящик: бёдра вперёд, голени свисают и болтаются по очереди
          pelvisY = PELVIS - 0.35 * on; // низ корпуса ложится ровно на крышку ящика (props.SEAT)
          yaw = 0.25 + 0.2 * on;
          const st = standLegs(PELVIS)[0];
          const kick = smooth(a(1.0, 1.3)) * (1 - smooth(a(2.2, 2.4)));
          legs = [0, 1].map((_, j) => ({
            thigh: st.thigh * (1 - on) + 1.45 * on,
            knee: st.knee * (1 - on) + (1.45 - 0.45 * kick * Math.max(0, Math.sin(tau * 7 + j * Math.PI))) * on,
            foot: st.foot * (1 - on),
          }));
          fx = "seat";
          customLegs = true;
          armL = { sh: [0.5 * on, 0, -0.3 * on - 0.08], elbow: -0.2 };
          armR = { sh: [0.5 * on, 0, 0.3 * on + 0.08], elbow: -0.2 };
          eye = "happy";
          break;
        }
        case "hatch": {
          lift = -10 * (1 - backOut(clamp01((tau - 0.25) / 0.8)));
          if (tau < 0.25) lift = -10;
          const up = smooth(a(1.0, 1.3)) * (1 - smooth(a(2.0, 2.4)));
          armL = { sh: [0, 0, -2.4 * up - 0.08], elbow: -0.3 };
          armR = { sh: [0, 0, 2.4 * up + 0.08], elbow: -0.3 };
          eye = "happy";
          airLegs = false;
          fx = "hatch";
          break;
        }
        case "fall": {
          // спотыкается и падает вперёд, лежит, поднимается и отряхивается
          const down = Math.pow(a(0.2, 0.55), 1.6) * (1 - smooth(a(1.4, 2.3)));
          pitch = 1.45 * down;
          pelvisY = PELVIS + 0.15 * down;
          pos = [0, 0, 1 + 1.4 * down];
          armL = { sh: [-2.4 * down, 0, -0.2 * down - 0.08], elbow: -0.2 };
          armR = { sh: [-2.4 * down, 0, 0.2 * down + 0.08], elbow: -0.2 };
          const st = standLegs(pelvisY)[0];
          legs = [0, 1].map(() => ({ thigh: st.thigh * (1 - down) - 0.5 * down, knee: st.knee * (1 - down) + 0.2 * down, foot: st.foot * (1 - down) }));
          customLegs = true;
          if (landAt(0.55)) impulse = 0.8;
          screen = tau < 0.25 ? "face" : tau < 1.6 ? "error" : tau < 2.3 ? "confused" : "face";
          eye = tau > 2.3 ? "happy" : "open";
          fx = "fall";
          break;
        }
        case "hips": {
          const on = smooth(a(0.15, 0.5)) * (1 - smooth(a(2.0, 2.35)));
          armL = { sh: [0.1 * on, 0, -0.95 * on - 0.08], elbow: -2.1 * on - 0.25 };
          armR = { sh: [0.1 * on, 0, 0.95 * on + 0.08], elbow: -2.1 * on - 0.25 };
          pitch = -0.06 * on;
          hr = 0.1 * on;
          eye = "happy";
          break;
        }
        case "chart": {
          const on = smooth(a(0.3, 0.7)) * (1 - smooth(a(2.6, 2.95)));
          armR = mixA(armR, ik(1, CHART_HAND), on);
          hy = 0.45 * on;
          eye = tau > 2.2 ? "happy" : "open";
          fx = "chart";
          break;
        }
        case "inspect": {
          const on = smooth(a(0.1, 0.5)) * (1 - smooth(a(2.6, 2.95)));
          armR = mixA(armR, ik(1, tp(INSPECT_HAND)), on);
          armL = { sh: [-1.3 * on, 0, 0.35 * on - 0.08], elbow: -1.9 * on - 0.25 }; // рука к «подбородку»: думает
          hy = 0.4 * on; // смотрит на кубик
          hr = 0.12 * Math.sin(tau * 2.2) * on;
          hp = 0.1 * on;
          screen = "think";
          fx = "inspect";
          break;
        }
        case "turn": {
          const tk = smooth(a(0.3, 1.4));
          yaw = Math.PI - 0.3 + (0.2 - (Math.PI - 0.3)) * tk;
          const turning = Math.sin(Math.PI * clamp01((tau - 0.3) / 1.1));
          legs = standLegs(pelvisY, [0, 0], [0.25 * Math.max(0, Math.sin(tau * 12)) * turning, 0.25 * Math.max(0, -Math.sin(tau * 12)) * turning]);
          customLegs = true;
          const w = smooth(a(1.6, 1.9)) * (1 - smooth(a(2.3, 2.55)));
          armL = { sh: [-0.2 * w, 0, (-2.4 + 0.18 * Math.sin(tau * 13)) * w - 0.08], elbow: -0.5 * w - 0.25 };
          eye = tau > 1.4 ? "happy" : "open";
          break;
        }
        case "loading":
          screen = "loading";
          fx = "loading";
          break;
      }
      if (c.id !== "dance" && !customLegs) legs = standLegs(pelvisY);
      if (lift > 0.02 && airLegs) {
        const ik = legIK(0.25, -(L1 + L2) * 0.82);
        legs = [0, 1].map(() => ({
          thigh: ik.thigh,
          knee: ik.knee,
          foot: -(ik.thigh - ik.knee),
        }));
      }
    }
    armL = { sh: [sm("aL0", armL.sh[0]), sm("aL1", armL.sh[1]), sm("aL2", armL.sh[2])], elbow: sm("aLe", armL.elbow) };
    armR = { sh: [sm("aR0", armR.sh[0]), sm("aR1", armR.sh[1]), sm("aR2", armR.sh[2])], elbow: sm("aRe", armR.elbow) };
    pitch = sm("pitch", pitch);
    roll = sm("roll", roll);
    twist = sm("twist", twist);
    const pelS = sm("pel", pelvisY);
    // вне походок ноги пересчитываются от сглаженного таза; в походках — точная ИК, чтобы ступни не скользили
    if (!g && c.id !== "dance" && !customLegs) {
      pelvisY = pelS;
      if (!(lift > 0.02 && airLegs)) legs = standLegs(pelvisY);
    }
    if (screen !== lastScreen) {
      prevScreen = lastScreen;
      lastScreen = screen;
      screenSince = i;
    }
    const liftV = (lift - prevLift) / dt;
    const liftA = (liftV - prevLiftV) / dt;
    prevLift = lift;
    prevLiftV = liftV;
    const hY = headYaw.step(hy, dt);
    const hP = headPitch.step(hp, dt);
    const hR = headRoll.step(hr, dt);
    const headAcc = (hY - prevHY) / dt;
    prevHY = hY;
    const ant = antenna.step(
      c.id === "sleepy" || c.id === "tired" ? 0.35 : 0,
      dt,
      -liftA * 0.02 - 40 * impulse,
    );
    const antR = antRoll.step(0, dt, -headAcc * 6);
    const sq = squash.step(0, dt, -260 * impulse);
    const base = { pos, yaw, pelvisY, lift, pitch, twist, roll };
    out.push({
      pos,
      yaw,
      pelvisY,
      lift,
      squash: sq,
      pitch,
      twist,
      sway: 0,
      roll,
      vis,
      legL: legs[0],
      legR: legs[1],
      armL,
      armR,
      headYaw: hY,
      headPitch: hP,
      headRoll: hR,
      antenna: ant,
      antennaRoll: antR,
      brick: [0, -10, 0],
      eye,
      screen,
      screenPrev: prevScreen,
      screenSince,
      clip: ci,
      tau,
      fx,
      hand: handPos(shoulderMatrix(base, 1), armR),
      handL: handPos(shoulderMatrix(base, -1), armL),
    });
  }
  return out;
}
let CACHE: CFrame[] | null = null;
const framesOf = () => (CACHE ??= simulate());
/** Кадры одного клипа каталога (для тестовых сцен). */
/** Кадр начала клипа на общей шкале каталога — чтобы пересчитать screenSince (смена экрана) на свою шкалу. */
export const clipStart = (id: string) => Math.round(STARTS[CLIPS.findIndex((c) => c.id === id)] * CAT_FPS);
export const clipFrames = (id: string) => {
  const i = CLIPS.findIndex((c) => c.id === id);
  const a = Math.round(STARTS[i] * CAT_FPS);
  return framesOf().slice(a, a + Math.round(CLIPS[i].dur * CAT_FPS));
};
export { Effects as CatalogEffects };

// ---------- эффекты ----------
const Glow: React.FC<{ p: V3; size: number; o?: number; c?: string }> = ({
  p,
  size,
  o = 1,
  c = "#A8E4FF",
}) =>
  o <= 0.01 ? null : (
    <mesh position={p} scale={size}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={glowTex()}
        color={c}
        transparent
        opacity={o}
        blending={ADD}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
// воксельная картинка из строк (любой непробельный символ — пиксель)
const PixelArt: React.FC<{
  rows: string[];
  pos: V3;
  px: number;
  color: string;
  o?: number;
  depth?: number;
}> = ({ rows, pos, px, color, o = 1, depth = 1 }) => (
  <group position={pos}>
    {rows.flatMap((r, y) =>
      [...r].map((ch, x) =>
        ch !== "." ? (
          <mesh
            key={`${x}-${y}`}
            position={[
              (x - (r.length - 1) / 2) * px,
              ((rows.length - 1) / 2 - y) * px,
              0,
            ]}
            scale={[px * 0.94, px * 0.94, px * depth]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.9}
              transparent
              opacity={o}
              toneMapped={false}
            />
          </mesh>
        ) : null,
      ),
    )}
  </group>
);
const HEART_ART = [
  ".##.##.",
  "#######",
  "#######",
  ".#####.",
  "..###..",
  "...#...",
];
// иконка над головой — ровно тот же пиксельный рисунок и цвет, что на экране Юнита, только объёмными вокселями;
// без кругов и рамок: всплывает с пружинкой, чуть покачивается и мягко светится
const HoloBadge: React.FC<{ at: V3; icon: string[]; color: string; k: number; fade: number; t: number }> = ({ at, icon, color, k, fade, t }) => {
  if (k <= 0) return null;
  const x = Math.min(1, k);
  const pop = x < 1 ? 1 + 0.22 * Math.sin(x * Math.PI) : 1;
  return (
    <group position={[at[0], at[1] + 0.12 * Math.sin(t * 2.6), at[2]]} scale={smooth(Math.min(1, k * 1.4)) * pop}>
      <PixelArt rows={icon} pos={[0, 0, 0]} px={0.22} color={color} o={fade} depth={0.9} />
      <Glow p={[0, 0, -0.3]} size={4.2} o={0.28 * fade} c={color} />
    </group>
  );
};

const Effects: React.FC<{ f: CFrame; frame: number }> = ({ f, frame }) => {
  const tau = f.tau;
  const top: V3 = [f.pos[0], 11.2 * S, f.pos[2]];
  const badgeAt: V3 = [f.pos[0] + 2.8, 12.3, f.pos[2] + 0.3]; // над головой справа: не задевает голову и подпись
  const fadeOut = (a: number, b: number) => 1 - ramp(tau, a, b);
  switch (f.fx) {
    case "like":
      return (
        <>
          <HoloBadge
            at={badgeAt}
            icon={THUMB}
            color="#FFE3D2"
            k={ramp(tau, 0.45, 0.85)}
            fade={fadeOut(2.3, 2.7)}
            t={tau}
          />
          {[0, 1, 2, 3].map((i) => {
            const h = ramp(tau, 1.0 + i * 0.15, 2.2 + i * 0.15);
            if (h <= 0 || h >= 1) return null;
            return (
              <PixelArt
                key={i}
                rows={HEART_ART}
                pos={[
                  badgeAt[0] + 1.6 + i * 0.45,
                  badgeAt[1] - 0.2 + h * 1.6,
                  badgeAt[2] + 0.3,
                ]}
                px={0.14}
                color="#FF5F87"
                o={1 - h}
              />
            );
          })}
        </>
      );
    case "bell":
      return (
        <group>
          <group
            position={badgeAt}
            rotation={[
              0,
              0,
              0.35 * Math.sin(tau * 14) * Math.exp(-((tau - 0.4) % 1) * 2),
            ]}
          >
            <HoloBadge
              at={[0, 0, 0]}
              icon={BELL_ICON}
              color="#FFC53D"
              k={ramp(tau, 0.3, 0.7)}
              fade={fadeOut(2.2, 2.6)}
              t={tau}
            />
          </group>
        </group>
      );
    case "check":
      return (
        <HoloBadge
          at={badgeAt}
          icon={CHECK}
          color="#7EE0A1"
          k={ramp(tau, 0.35, 0.75)}
          fade={fadeOut(2.0, 2.4)}
          t={tau}
        />
      );
    case "code": {
      const on = smooth(ramp(tau, 0.2, 0.7));
      const keys = [];
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 9; c++) {
          const press = Math.sin(frame * 0.9 + r * 3 + c * 7) > 0.92;
          keys.push(
            <mesh
              key={`${r}-${c}`}
              position={[
                f.pos[0] + (c - 4) * 0.42,
                3.0 - (press ? 0.05 : 0),
                f.pos[2] + 2.6 + r * 0.4,
              ]}
              scale={[0.36, 0.08, 0.34]}
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial
                color={press ? "#FFFFFF" : "#6FB8FF"}
                transparent
                opacity={on * (press ? 1 : 0.6)}
                toneMapped={false}
              />
            </mesh>,
          );
        }
      const lines = Math.floor(ramp(tau, 0.5, 3.0) * 9);
      const cols = ["#FF9B73", "#7FA6FF", "#FFE3D2", "#9BE0B0"];
      return (
        <>
          {keys}
          <mesh
            position={[f.pos[0] - 3.4, 11.2, f.pos[2] - 1.2]}
            scale={[4.0, 3.8, 1]}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              color="#123A6E"
              transparent
              opacity={0.55 * on}
              side={THREE.DoubleSide}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          {Array.from({ length: lines }, (_, i) => {
            const w = 0.8 + ((i * 37) % 5) * 0.45;
            const ind = ((i * 13) % 3) * 0.3;
            return (
              <mesh
                key={i}
                position={[
                  f.pos[0] - 5.1 + ind + w / 2,
                  12.7 - i * 0.38,
                  f.pos[2] - 1.15,
                ]}
                scale={[w, 0.18, 0.05]}
              >
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color={cols[i % 4]} toneMapped={false} />
              </mesh>
            );
          })}
          <Glow
            p={[f.pos[0] - 3.4, 11.2, f.pos[2] - 0.8]}
            size={6}
            o={0.25 * on}
            c="#3A7BD5"
          />
        </>
      );
    }
    case "fix": {
      // молоток в руке, «баг» на полу: красный, после трёх ударов — зелёный
      const hits = Math.floor(clamp01((tau - 0.3) / 2.4) * 3 + 0.03);
      const cyc = clamp01((tau - 0.3) / 2.4) * 3;
      const ph = cyc - Math.floor(cyc);
      const spark =
        tau > 0.3 && tau < 2.75 ? Math.max(0, 1 - Math.abs(ph - 0.98) * 12) : 0;
      const bug: V3 = [f.pos[0] + 1.6, 0.5, f.pos[2] + 2.6];
      const hand = f.hand;
      return (
        <>
          <group position={hand}>
            <mesh position={[0, -0.1, 0.55]}>
              <boxGeometry args={[0.24, 0.24, 1.4]} />
              <meshPhysicalMaterial color="#8A6A4A" roughness={0.6} />
            </mesh>
            <mesh position={[0, -0.1, 1.3]}>
              <boxGeometry args={[0.9, 0.5, 0.5]} />
              <meshPhysicalMaterial
                color="#9AA3B2"
                roughness={0.3}
                metalness={0.6}
              />
            </mesh>
          </group>
          <mesh position={bug} scale={[1.3, 0.8, 1.3]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={tau > 2.7 ? "#4AD991" : "#FF5A5A"}
              emissive={tau > 2.7 ? "#4AD991" : "#FF5A5A"}
              emissiveIntensity={0.5}
              toneMapped={false}
            />
          </mesh>
          <Glow
            p={[bug[0], bug[1] + 0.6, bug[2] + 0.6]}
            size={4 * spark + 1.2}
            o={0.9 * spark + 0.25}
            c={hits >= 3 ? "#7EE0A1" : "#FFB347"}
          />
        </>
      );
    }
    case "teleport": {
      // столб света и пиксели: вверх при исчезновении, вниз при появлении
      const outK = ramp(tau, 0.2, 1.0);
      const inK = ramp(tau, 1.3, 2.1);
      const beamO =
        Math.sin(outK * Math.PI) * (tau < 1.15 ? 1 : 0) +
        Math.sin(inK * Math.PI) * (tau >= 1.15 ? 1 : 0);
      return (
        <>
          <mesh position={[f.pos[0], 7, f.pos[2]]}>
            <cylinderGeometry args={[2.2, 2.2, 14, 32, 1, true]} />
            <meshBasicMaterial
              color="#8CD2FF"
              transparent
              opacity={0.22 * beamO}
              blending={ADD}
              depthWrite={false}
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          {Array.from({ length: 16 }, (_, i) => {
            const ph = (i * 0.37) % 1;
            const up = tau < 1.15 ? (outK + ph) % 1 : 1 - ((inK + ph) % 1);
            return (
              <Glow
                key={i}
                p={[
                  f.pos[0] + Math.cos(i * 2.4) * 1.6,
                  1 + up * 11,
                  f.pos[2] + Math.sin(i * 2.4) * 1.0 + 1,
                ]}
                size={0.45}
                o={beamO}
              />
            );
          })}
        </>
      );
    }
    case "levitate":
      return (
        <>
          <mesh
            position={[f.pos[0], 0.05, f.pos[2]]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={1 + 0.1 * Math.sin(frame * 0.1)}
          >
            <ringGeometry args={[1.8, 2.0, 64]} />
            <meshBasicMaterial
              color="#8CD2FF"
              transparent
              opacity={0.7 * Math.min(1, f.lift)}
              blending={ADD}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <Glow
            p={[f.pos[0], f.lift + 0.6, f.pos[2] + 1.2]}
            size={3.5}
            o={0.45 * Math.min(1, f.lift)}
          />
        </>
      );
    case "clap": {
      const cl = (Math.sin(tau * 18) + 1) / 2;
      const mid: V3 = [
        (f.hand[0] + f.handL[0]) / 2,
        (f.hand[1] + f.handL[1]) / 2,
        (f.hand[2] + f.handL[2]) / 2 + 0.4,
      ];
      return <Glow p={mid} size={1.6} o={cl > 0.92 ? 0.9 : 0} c="#FFE7A0" />;
    }
    case "hearts":
      return (
        <>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const h = (tau * 0.6 + i / 6) % 1;
            return (
              <PixelArt
                key={i}
                rows={HEART_ART}
                pos={[
                  top[0] + Math.sin(i * 2.1 + tau * 2) * 2.2,
                  top[1] + h * 3.5,
                  top[2] + 0.4,
                ]}
                px={0.14}
                color="#FF5F87"
                o={Math.sin(h * Math.PI)}
              />
            );
          })}
        </>
      );
    case "pull": {
      // кирпич с пола летит по дуге и зависает перед ладонью (не касаясь кисти); от ладони к нему бежит поводок
      const { p: bp, k } = pullPose(f);
      const tO = smooth(ramp(tau, 0.3, 0.6)) * (1 - smooth(ramp(tau, 1.8, 2.2)));
      const lerp = (a: V3, b: V3, q: number): V3 => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q, a[2] + (b[2] - a[2]) * q];
      return (
        <>
          <mesh position={bp} rotation={[0, f.yaw + k * Math.PI * 2, 0]} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshPhysicalMaterial color="#FFC53D" roughness={0.35} clearcoat={0.5} emissive="#FFB020" emissiveIntensity={0.25} />
          </mesh>
          <Glow p={[bp[0], bp[1], bp[2] + 0.6]} size={2.2} o={0.5} c="#FFD978" />
          {tO > 0.01 &&
            Array.from({ length: 14 }, (_, i) => {
              const q = (i / 14 + tau * 1.6) % 1;
              const c: V3 = [(f.hand[0] + bp[0]) / 2, Math.max(f.hand[1], bp[1]) + 1, (f.hand[2] + bp[2]) / 2];
              const p = lerp(lerp(f.hand, c, q), lerp(c, bp, q), q);
              return <Glow key={i} p={p} size={0.3 + 0.18 * Math.sin(q * Math.PI)} o={tO * (0.4 + 0.6 * Math.sin(q * Math.PI))} />;
            })}
          {tau < 0.8 && <Glow p={[PULL_FROM[0], 0.05, PULL_FROM[2]]} size={2} o={ramp(tau, 0.3, 0.6)} c="#FFD978" />}
        </>
      );
    }
    case "mat": {
      // воксели слетаются с кольца и собирают блок; снизу вверх проходит сканирующее кольцо
      const M: V3 = [3.4, 0, 1.6];
      const V = 0.6;
      const out = [];
      let n = 0;
      for (let y = 0; y < 2; y++)
        for (let x = -1; x <= 1; x++)
          for (let z = -1; z <= 1; z++) {
            const i = n++;
            const s0 = 0.4 + i * 0.07;
            if (tau < s0) continue;
            const q = clamp01((tau - s0) / 0.55);
            const ang = -Math.PI / 2 + ((i * 0.618) % 1) * Math.PI; // правая полуокружность: воксели не пролетают сквозь Юнита
            const st: V3 = [M[0] + Math.cos(ang) * 3.6, 2 + ((i * 37) % 10) * 0.35, M[2] + Math.sin(ang) * 2.8];
            const slot: V3 = [M[0] + x * V, V / 2 + y * V, M[2] + z * V];
            const e = backOut(q, 1.2);
            const p: V3 = [st[0] + (slot[0] - st[0]) * e, st[1] + (slot[1] - st[1]) * e, st[2] + (slot[2] - st[2]) * e];
            out.push(
              <mesh key={i} position={p} rotation={[(1 - q) * 3, (1 - q) * 4, 0]} scale={V * 0.94} castShadow>
                <boxGeometry args={[1, 1, 1]} />
                <meshPhysicalMaterial color={i % 3 ? "#2B3240" : "#353D4D"} roughness={0.45} clearcoat={0.4} emissive="#4FA6FF" emissiveIntensity={0.6 * (1 - q)} />
              </mesh>,
            );
          }
      const sc = ramp(tau, 2.1, 2.6);
      return (
        <>
          {out}
          {sc > 0 && sc < 1 && (
            <mesh position={[M[0], sc * 1.4, M[2]]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.25, 1.4, 64]} />
              <meshBasicMaterial color="#8CD2FF" transparent opacity={0.9 * Math.sin(sc * Math.PI)} blending={ADD} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
          )}
          <Glow p={f.hand} size={1 + 0.2 * Math.sin(frame * 0.4)} o={0.8 * smooth(ramp(tau, 0.1, 0.4)) * (1 - ramp(tau, 2.3, 2.6))} />
          <Glow p={f.handL} size={1 + 0.2 * Math.sin(frame * 0.4 + 1)} o={0.8 * smooth(ramp(tau, 0.1, 0.4)) * (1 - ramp(tau, 2.3, 2.6))} />
        </>
      );
    }
    case "dis": {
      // куб рассыпается на пиксели, которые улетают вверх и гаснут
      const C: V3 = [3.0, 0.7, 2.2];
      const q = ramp(tau, 0.9, 2.2);
      if (tau < 0.9)
        return (
          <>
            <mesh position={C} scale={1.4} castShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshPhysicalMaterial color="#7FA6FF" roughness={0.35} clearcoat={0.5} emissive="#4F7FFF" emissiveIntensity={0.3 + 0.5 * ramp(tau, 0.5, 0.9)} />
            </mesh>
            <Glow p={[C[0], C[1], C[2] + 0.9]} size={2.5} o={0.5 * ramp(tau, 0.5, 0.9)} />
          </>
        );
      return (
        <>
          {Array.from({ length: 27 }, (_, i) => {
            const x = (i % 3) - 1;
            const y = Math.floor(i / 3) % 3 - 1;
            const z = Math.floor(i / 9) - 1;
            const sp = 0.6 + ((i * 53) % 10) * 0.08;
            const p: V3 = [C[0] + x * 0.47 * (1 + q * 2), C[1] + y * 0.47 + q * 4 * sp, C[2] + z * 0.47 * (1 + q * 2)];
            return (
              <mesh key={i} position={p} rotation={[q * 4 * x, q * 3, q * 2 * z]} scale={0.42 * (1 - q * 0.6)}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#9CCBFF" emissive="#7FB8FF" emissiveIntensity={1} transparent opacity={1 - q} toneMapped={false} />
              </mesh>
            );
          })}
        </>
      );
    }
    case "place": {
      // кирпич висит перед ладонью и по дуге уходит на постамент, защёлкивается
      const { p: bp, k } = placePose(f);
      const snap = tau > 1.6 ? Math.exp(-10 * (tau - 1.6)) : 0;
      return (
        <>
          <mesh position={[PEDESTAL[0], 0.6, PEDESTAL[2]]} castShadow receiveShadow>
            <boxGeometry args={[1.6, 1.2, 1.6]} />
            <meshPhysicalMaterial color="#2B3240" roughness={0.45} clearcoat={0.4} />
          </mesh>
          <mesh position={bp} rotation={[0, f.yaw * (1 - k), 0]} scale={1 + 0.3 * snap} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshPhysicalMaterial color="#FFC53D" roughness={0.35} clearcoat={0.5} />
          </mesh>
          {k < 0.98 && <Glow p={f.hand} size={1.1} o={0.6 * (1 - k)} c="#FFD978" />}
          {snap > 0.02 && (
            <mesh position={[PEDESTAL[0], 1.22, PEDESTAL[2]]} rotation={[-Math.PI / 2, 0, 0]} scale={1 + (1 - snap) * 2.4}>
              <ringGeometry args={[0.75, 0.88, 48]} />
              <meshBasicMaterial color="#FFE7A0" transparent opacity={snap} blending={ADD} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
          )}
        </>
      );
    }
    case "point":
      return (
        <group position={STAR} rotation={[0, frame * 0.02, 0]}>
          <PixelArt rows={["..#..", ".###.", "#####", ".###.", ".#.#."]} pos={[0, 0, 0]} px={0.32} color="#FFD66B" depth={0.9} />
          <Glow p={[0, 0, -0.2]} size={3.5} o={0.4} c="#FFD66B" />
        </group>
      );
    case "mega": {
      // рупор в правой руке: рукоять в кисти, узкий конец у подбородка, раструб наружу; всё в системе корпуса
      const on = smooth(ramp(tau, 0.3, 0.5)) * (1 - ramp(tau, 2.2, 2.5));
      const m = torsoMatrix(f);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...MEGA.dir));
      const mid: V3 = [MEGA.N[0] + MEGA.dir[0] * MEGA.len * 0.5, MEGA.N[1] + MEGA.dir[1] * MEGA.len * 0.5, MEGA.N[2] + MEGA.dir[2] * MEGA.len * 0.5];
      const { W, grip, hand } = megaPose(f);
      const gd = new THREE.Vector3(grip[0] - hand[0], grip[1] - hand[1], grip[2] - hand[2]);
      const gq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), gd.clone().normalize());
      const wd = new THREE.Vector3(W[0] - f.pos[0], 0, W[2] - f.pos[2]).normalize();
      return (
        <>
          <group matrixAutoUpdate={false} matrix={m}>
            <mesh position={mid} quaternion={q} scale={on}>
              <cylinderGeometry args={[MEGA.r1, MEGA.r0, MEGA.len, 20, 1, true]} />
              <meshPhysicalMaterial color="#E8774D" roughness={0.45} clearcoat={0.5} side={THREE.DoubleSide} />
            </mesh>
          </group>
          <mesh position={[(grip[0] + hand[0]) / 2, (grip[1] + hand[1]) / 2, (grip[2] + hand[2]) / 2]} quaternion={gq} scale={[on, gd.length() * on + 0.001, on]}>
            <cylinderGeometry args={[0.16, 0.16, 1, 10]} />
            <meshPhysicalMaterial color="#2B3240" roughness={0.45} clearcoat={0.4} />
          </mesh>
          {[0, 1, 2].map((i) => {
            const k = (tau * 1.4 + i / 3) % 1;
            return (
              <mesh key={i} position={[W[0] + wd.x * k * 2.4, W[1], W[2] + wd.z * k * 2.4]} rotation={[0, Math.atan2(wd.x, wd.z) - Math.PI / 2, 0]} scale={0.6 + k * 2.2}>
                <ringGeometry args={[0.9, 1.0, 32, 1, -0.9, 1.8]} />
                <meshBasicMaterial color="#8CD2FF" transparent opacity={on * (1 - k)} blending={ADD} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
              </mesh>
            );
          })}
        </>
      );
    }
    case "book": {
      // книга лежит почти горизонтально перед грудью, кисти держат её за края; страницы видны сверху
      const on = smooth(ramp(tau, 0.3, 0.6)) * (1 - smooth(ramp(tau, 2.6, 2.9)));
      const flip = smooth(ramp(tau, 1.4, 1.9));
      const w = BOOK.w;
      const d = BOOK.d;
      return (
        <group matrixAutoUpdate={false} matrix={bookMatrix(f)}>
          <group scale={on}>
            <mesh position={[-w / 2, 0, -0.04]} rotation={[0, 0.12, 0]}>
              <boxGeometry args={[w, d, 0.1]} />
              <meshPhysicalMaterial color="#C0413B" roughness={0.5} />
            </mesh>
            <mesh position={[w / 2, 0, -0.04]} rotation={[0, -0.12, 0]}>
              <boxGeometry args={[w, d, 0.1]} />
              <meshPhysicalMaterial color="#C0413B" roughness={0.5} />
            </mesh>
            <mesh position={[-w / 2 + 0.02, 0, 0.03]} rotation={[0, 0.12, 0]}>
              <planeGeometry args={[w - 0.1, d - 0.12]} />
              <meshStandardMaterial color="#F4F0EA" side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[w / 2 - 0.02, 0, 0.03]} rotation={[0, -0.12, 0]}>
              <planeGeometry args={[w - 0.1, d - 0.12]} />
              <meshStandardMaterial color="#F4F0EA" side={THREE.DoubleSide} />
            </mesh>
            {/* перелистываемая страница: вращается вокруг корешка */}
            <group position={[0, 0, 0.05]} rotation={[0, -Math.PI * flip, 0]}>
              <mesh position={[(w - 0.1) / 2, 0, 0]} rotation={[0, 0, 0]}>
                <planeGeometry args={[w - 0.1, d - 0.12]} />
                <meshStandardMaterial color="#FFFDF8" side={THREE.DoubleSide} />
              </mesh>
            </group>
          </group>
        </group>
      );
    }
    case "charge": {
      // молния над головой и луч в антенну; внутри тела поднимается свечение
      const on = smooth(ramp(tau, 0.1, 0.4)) * (1 - smooth(ramp(tau, 2.5, 2.9)));
      const flick = 0.6 + 0.4 * Math.sin(frame * 0.9);
      return (
        <>
          <group position={[f.pos[0], 14.2, f.pos[2]]} scale={on}>
            <PixelArt rows={BOLT} pos={[0, 0, 0]} px={0.2} color="#FFD66B" depth={0.9} />
          </group>
          <mesh position={[f.pos[0], 12.4, f.pos[2]]}>
            <cylinderGeometry args={[0.08, 0.08, 2.4, 8]} />
            <meshBasicMaterial color="#FFE7A0" transparent opacity={on * flick} toneMapped={false} />
          </mesh>
          <Glow p={[f.pos[0], 2 + ramp(tau, 0.3, 1.8) * 3, f.pos[2] + 1.6]} size={3.2} o={on * 0.5} c="#FFD66B" />
        </>
      );
    }
    case "hatch": {
      const o = smooth(ramp(tau, 0, 0.25)) * (1 - smooth(ramp(tau, 1.9, 2.4)));
      return (
        <>
          <mesh position={[f.pos[0], 0.03, f.pos[2]]} rotation={[-Math.PI / 2, 0, 0]} scale={[4.2 * o + 0.01, 3.2 * o + 0.01, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#000000" transparent opacity={o} />
          </mesh>
          <mesh position={[f.pos[0], 0.04, f.pos[2]]} rotation={[-Math.PI / 2, 0, 0]} scale={[4.2 * o + 0.01, 3.2 * o + 0.01, 1]}>
            <ringGeometry args={[0.49, 0.52, 4, 1, Math.PI / 4]} />
            <meshBasicMaterial color="#8CD2FF" transparent opacity={o} toneMapped={false} />
          </mesh>
        </>
      );
    }
    case "fall": {
      const d1 = ramp(tau, 0.55, 1.1);
      const d2 = ramp(tau, 2.2, 2.7);
      const puff = (q: number, base: V3) =>
        q > 0 && q < 1
          ? [0, 1, 2, 3].map((i) => <Glow key={i} p={[base[0] + (i - 1.5) * 1.4 * (0.5 + q), base[1] + q * 0.8, base[2] + 0.8]} size={1.2 + q * 1.5} o={0.5 * (1 - q)} c="#C9D4E2" />)
          : null;
      return (
        <>
          {puff(d1, [f.pos[0], 0.4, f.pos[2] + 2.5])}
          {puff(d2, [f.pos[0], 0.4, f.pos[2]])}
        </>
      );
    }
    case "chart": {
      // голографический столбчатый график справа от Юнита, в его плоскости; последний столбик — золотой
      const on = smooth(ramp(tau, 0.2, 0.6)) * (1 - smooth(ramp(tau, 2.6, 2.95)));
      const hs = [1.0, 1.7, 2.3, 3.2];
      const by = CHART.c[1] - CHART.h / 2 + 0.35;
      return (
        <group position={[CHART.c[0], 0, CHART.c[2]]} rotation={[0, -0.2, 0]}>
          <mesh position={[0, CHART.c[1], -0.2]} scale={[CHART.w, CHART.h, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#123A6E" transparent opacity={0.5 * on} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
          {hs.map((h, i) => {
            const g = smooth(ramp(tau, 0.5 + i * 0.3, 0.9 + i * 0.3)) * on;
            return (
              <mesh key={i} position={[-1.05 + i * 0.7, by + (h * g) / 2, 0]} scale={[0.48, h * g + 0.001, 0.3]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color={i === 3 ? "#FFC53D" : "#6FB8FF"} toneMapped={false} />
              </mesh>
            );
          })}
          <Glow p={[0, CHART.c[1], 0.2]} size={5} o={0.2 * on} c="#3A7BD5" />
        </group>
      );
    }
    case "inspect": {
      // кубик парит над ладонями перед грудью (на силе), вертится; между ладонями — свечение
      const on = smooth(ramp(tau, 0.3, 0.7)) * (1 - smooth(ramp(tau, 2.6, 2.9)));
      const { c } = inspectPose(f);
      return (
        <>
          <mesh position={c} rotation={[tau * 1.3, tau * 2.1, 0]} scale={0.9 * on}>
            <boxGeometry args={[1, 1, 1]} />
            <meshPhysicalMaterial color="#FFC53D" roughness={0.3} clearcoat={0.6} emissive="#FFB020" emissiveIntensity={0.25} />
          </mesh>
          <Glow p={[c[0], c[1], c[2] + 0.5]} size={2.2} o={0.5 * on} c="#FFD978" />
          <Glow p={[f.hand[0], f.hand[1] + 0.5, f.hand[2]]} size={1.5} o={0.45 * on} c="#FFD978" />
        </>
      );
    }
    case "seat": {
      // ящик за бёдрами (система корня): крышка ровно под низом корпуса, голени свисают перед ним
      const pop = smooth(ramp(tau, 0.0, 0.25)) * (1 - smooth(ramp(tau, 2.75, 3.0)));
      return (
        <group matrixAutoUpdate={false} matrix={rootMatrix(f)}>
          <mesh position={[SEAT.c[0], SEAT.c[1] * pop, SEAT.c[2]]} scale={[2 * SEAT.h[0] * pop + 0.001, 2 * SEAT.h[1] * pop + 0.001, 2 * SEAT.h[2] * pop + 0.001]} castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshPhysicalMaterial color="#6B4E37" roughness={0.6} clearcoat={0.2} />
          </mesh>
        </group>
      );
    }
    case "red":
      return (
        <Glow
          p={[f.pos[0], 8.0, f.pos[2] + 1]}
          size={7 + 0.6 * Math.sin(frame * 0.4)}
          o={0.35}
          c="#FF4040"
        />
      );
    case "loading":
      return (
        <Glow
          p={[f.pos[0], 11.3 * S, f.pos[2] + 0.3]}
          size={1.2}
          o={0.5 + 0.5 * Math.sin(frame * 0.25)}
          c="#FFC861"
        />
      );
  }
  return null;
};

const Cam: React.FC = () => {
  const { camera, gl, scene } = useThree();
  useLayoutEffect(() => {
    gl.toneMapping = THREE.NeutralToneMapping;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.4;
    camera.position.set(0.4, 7.6, 32);
    camera.lookAt(0.4, 6.2, 0);
    camera.updateProjectionMatrix();
    return () => {
      env.dispose();
      pm.dispose();
    };
  }, [camera, gl, scene]);
  return null;
};

export const CatalogSpike: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const f = framesOf()[Math.min(frame, CAT_FRAMES - 1)];
  const c = CLIPS[f.clip];
  const fade = Math.min(1, f.tau / 0.25, (c.dur - f.tau) / 0.25);
  return (
    <AbsoluteFill style={{ backgroundColor: "#05070B" }}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ fov: 42, near: 0.3, far: 200 }}
      >
        <Cam />
        <color attach="background" args={["#05070B"]} />
        <fog attach="fog" args={["#05070B", 30, 75]} />
        <hemisphereLight args={["#DCE6FF", "#0A0D14", 0.4]} />
        <directionalLight
          position={[-10, 20, 14]}
          intensity={2.4}
          color="#FFF1E2"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-14}
          shadow-camera-right={14}
          shadow-camera-top={14}
          shadow-camera-bottom={-14}
        />
        <directionalLight
          position={[12, 8, -14]}
          intensity={2}
          color="#5C8CFF"
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[90, 90]} />
          <meshStandardMaterial color="#0B0F16" roughness={0.9} />
        </mesh>
        <gridHelper
          args={[90, 90, "#2B5FA8", "#1A2C4A"]}
          position={[0, 0.01, 0]}
        />
        <Effects f={f} frame={frame} />
        <VoxelLookContext.Provider value={TOY}>
          <Unit3 f={f} frame={frame} />
        </VoxelLookContext.Provider>
        <EffectComposer multisampling={4}>
          <N8AO aoRadius={1.2} intensity={2.2} quality="high" />
          <Bloom intensity={0.8} luminanceThreshold={0.72} mipmapBlur />
        </EffectComposer>
      </ThreeCanvas>
      <div
        style={{
          position: "absolute",
          top: 150,
          width: "100%",
          textAlign: "center",
          fontFamily: "Golos Text",
          fontWeight: 800,
          fontSize: 88,
          color: "#F4F0EA",
          opacity: fade,
          textShadow: "0 6px 26px rgba(0,0,0,.8)",
        }}
      >
        {c.label}
      </div>
      <div
        style={{
          position: "absolute",
          top: 262,
          width: "100%",
          textAlign: "center",
          fontFamily: "Golos Text",
          fontWeight: 700,
          fontSize: 40,
          color: "#8A9BB0",
          opacity: fade,
        }}
      >
        {f.clip + 1} / {CLIPS.length}
      </div>
    </AbsoluteFill>
  );
};
