import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NeuroPilot",
  description: "Всё, что сделано для канала NeuroPilot",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
