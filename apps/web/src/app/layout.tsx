import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Providers } from "@/components/providers";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "VocalWonder",
  description: "Sing along to your own music library — pitch bars in the browser.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // "dark" fest gesetzt: Die App ist dunkel. shadcn legt seine Farben sonst in der hellen
  // Fassung an, und die Bausteine kämen weiß daher.
  return (
    <html lang="de" className={cn("dark font-sans", geist.variable)}>
      {/* Kein Seiten-Scroll: Die App füllt das Fenster, gescrollt wird nur in den Panes. */}
      <body className="h-dvh overflow-hidden bg-neutral-950 text-neutral-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
