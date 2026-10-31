"use client";
// 3D работает только в браузере: сцену грузим без серверного рендера.
import dynamic from "next/dynamic";

const BentoHome = dynamic(() => import("./BentoHome"), { ssr: false, loading: () => <div style={{ position: "fixed", inset: 0, background: "#05070B" }} /> });

export default function HomeClient() {
  return <BentoHome />;
}
