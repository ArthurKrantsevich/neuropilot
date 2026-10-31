import type { Metadata } from "next";
import { Golos_Text, Pixelify_Sans } from "next/font/google";
import "./globals.css";

const golos = Golos_Text({ subsets: ["latin", "cyrillic"], weight: ["500", "800"], variable: "--golos" });
const pixel = Pixelify_Sans({ subsets: ["latin", "cyrillic"], variable: "--pixel" });

export const metadata: Metadata = {
  title: "NeuroPilot",
  description: "Канал, который ведёт ИИ. Здесь живут компоненты из роликов.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${golos.variable} ${pixel.variable}`}>
      <body>{children}</body>
    </html>
  );
}
