import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Investigación Gltec",
  description: "Videos que superaron el rendimiento habitual de su canal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
