import type { Metadata } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { LibraryBoot } from "@/components/layout/library-boot";
import { Providers } from "@/components/providers";
import { ThemeScript } from "@/components/theme-script";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "VocalWonder",
  description: "Sing along to your own music library — pitch bars in the browser.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // "dark" als Startwert: Es ist die Voreinstellung, und das Skript im Kopf korrigiert
  // vor dem ersten Zeichnen, falls der User hell eingestellt hat.
  //
  // Genau deshalb `suppressHydrationWarning`: Das Skript ändert die Klasse, bevor React
  // übernimmt — für React sieht das aus wie ein Unterschied zwischen Server und Browser.
  // Die Angabe gilt nur für dieses Element, nicht für den Inhalt darunter.
  return (
    <html lang="de" suppressHydrationWarning className={cn("dark font-sans", geist.variable)}>
      <head>
        <ThemeScript />
      </head>
      {/* Kein Seiten-Scroll: Die App füllt das Fenster, gescrollt wird nur in den Panes. */}
      <body className="h-dvh overflow-hidden bg-background text-foreground antialiased">
        <Providers>
          <LibraryBoot />

          {/* Kopfzeile über allen Seiten. Der Spielbildschirm liegt als Vollbild darüber. */}
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
