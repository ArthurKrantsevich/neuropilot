// Воксельный конструктор маскота: модель = набор кубиков, рисуем одним InstancedMesh на материал.
import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { random } from "remotion";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type Vox = [number, number, number, string]; // x, y, z, цвет

const geoCache = new Map<number, THREE.BufferGeometry>();
const flatCache = new Map<number, THREE.BufferGeometry>();
// без фаски — для светящихся пикселей экрана, чтобы соседние сливались без швов
const flatBox = (s: number) => {
  let g = flatCache.get(s);
  if (!g) {
    g = new THREE.BoxGeometry(s, s, s);
    flatCache.set(s, g);
  }
  return g;
};
const roundedBox = (s: number, bevel = 0.09) => {
  const k = s * 1000 + bevel;
  let g = geoCache.get(k);
  if (!g) {
    g = new RoundedBoxGeometry(s, s, s, bevel > 0.1 ? 4 : 2, s * bevel);
    geoCache.set(k, g);
  }
  return g;
};

// «вид» рендера: basic — как в первых роликах; toy — игрушечный пластик с лаком и мягкой фаской
export type VoxelLook = { kind: "basic" | "toy"; bevel: number };
export const VoxelLookContext = createContext<VoxelLook>({
  kind: "basic",
  bevel: 0.09,
});
export const useVoxelLook = () => useContext(VoxelLookContext);

// лёгкий разброс яркости по кубикам — «пиксельная» фактура как на референсе
export const jitter = (hex: string, seed: string, amount = 0.05) => {
  const c = new THREE.Color(hex);
  const k = 1 + (random(seed) - 0.5) * 2 * amount;
  c.r = Math.min(1, c.r * k);
  c.g = Math.min(1, c.g * k);
  c.b = Math.min(1, c.b * k);
  return `#${c.getHexString()}`;
};

export const Voxels: React.FC<{
  cells: Vox[];
  size?: number;
  glow?: boolean;
  visible?: boolean;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  seamless?: boolean;
  // сборка по кубику: reveal[i] 0..1 — кубик прилетает со сдвигом fly и вырастает; paint[i] 0..1 — серый → свой цвет
  reveal?: number[];
  fly?: [number, number, number];
  paint?: number[];
}> = ({
  cells,
  size = 1,
  glow = false,
  visible = true,
  roughness = 0.5,
  emissive = "#000000",
  emissiveIntensity = 0,
  seamless = false,
  reveal,
  fly = [0, 3, 0],
  paint,
}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const look = useVoxelLook();
  const geo = useMemo(
    () => (seamless ? flatBox(size) : roundedBox(size, look.bevel)),
    [size, seamless, look.bevel],
  );
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const mat = new THREE.Matrix4();
    const col = new THREE.Color();
    const grey = new THREE.Color("#B9B4AE");
    cells.forEach(([x, y, z, c], i) => {
      const e = reveal ? reveal[i] : 1;
      const k = 1 - e;
      mat.makeScale(Math.max(e, 1e-4), Math.max(e, 1e-4), Math.max(e, 1e-4));
      mat.setPosition(
        x * size + fly[0] * k,
        y * size + fly[1] * k,
        z * size + fly[2] * k,
      );
      m.setMatrixAt(i, mat);
      col.set(c);
      if (paint) col.lerpColors(grey, new THREE.Color(c), paint[i]);
      m.setColorAt(i, col);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [cells, size, reveal, paint, fly]);
  if (cells.length === 0) return null;
  return (
    <instancedMesh
      key={cells.length}
      ref={ref}
      args={[geo, undefined, cells.length]}
      castShadow={!glow}
      receiveShadow={!glow}
      visible={visible}
    >
      {glow ? (
        <meshBasicMaterial toneMapped={false} />
      ) : look.kind === "toy" ? (
        <meshPhysicalMaterial
          roughness={0.38}
          metalness={0}
          clearcoat={0.45}
          clearcoatRoughness={0.28}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
        />
      ) : (
        <meshStandardMaterial
          roughness={roughness}
          metalness={0.02}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
        />
      )}
    </instancedMesh>
  );
};

// строки-битмапы → кубики; '#' — пиксель, остальное пусто. Центр по x и y.
export const bitmap = (rows: string[], color: string): Vox[] => {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const out: Vox[] = [];
  rows.forEach((r, j) =>
    [...r].forEach((ch, i) => {
      if (ch === "#") out.push([i - (w - 1) / 2, (h - 1) / 2 - j, 0, color]);
    }),
  );
  return out;
};

// коробка из кубиков с фаской рёбер; color может вернуть null — кубик пропускаем
export const box = (
  [x0, x1]: [number, number],
  [y0, y1]: [number, number],
  [z0, z1]: [number, number],
  color: (x: number, y: number, z: number) => string | null,
  chamfer: { xy?: boolean; xz?: boolean; yz?: boolean } = {},
): Vox[] => {
  const out: Vox[] = [];
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++) {
        const ex = x === x0 || x === x1;
        const ey = y === y0 || y === y1;
        const ez = z === z0 || z === z1;
        if (chamfer.xy && ex && ey) continue;
        if (chamfer.xz && ex && ez) continue;
        if (chamfer.yz && ey && ez) continue;
        // внутренние кубики не видны — не рисуем
        if (!ex && !ey && !ez) continue;
        const c = color(x, y, z);
        if (c) out.push([x, y, z, c]);
      }
  return out;
};
