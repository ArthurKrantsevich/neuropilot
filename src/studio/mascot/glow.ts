// Мягкое круглое свечение (радиальный градиент) — для лучей и голограмм каталога.
import * as THREE from "three";

export const glowTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.25, "rgba(170,225,255,0.7)");
    grd.addColorStop(1, "rgba(90,180,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    t = new THREE.CanvasTexture(c);
    return t;
  };
})();
