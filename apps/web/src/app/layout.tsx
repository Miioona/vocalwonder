import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "VocalWonder",
  description: "Sing along to your own music library — pitch bars in the browser.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="de">
      {/* Kein Seiten-Scroll: Die App füllt das Fenster, gescrollt wird nur in den Panes. */}
      <body className="h-dvh overflow-hidden bg-neutral-950 text-neutral-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
