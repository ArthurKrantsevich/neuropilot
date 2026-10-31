"use client";
// Подмена @remotion/three: обычный холст React Three Fiber на всю область родителя.
import { Canvas, type CanvasProps } from "@react-three/fiber";

export const ThreeCanvas: React.FC<CanvasProps & { width?: number; height?: number }> = ({ width: _w, height: _h, children, ...rest }) => (
  <Canvas style={{ position: "absolute", inset: 0 }} dpr={[1, 1.5]} {...rest}>
    {children}
  </Canvas>
);
