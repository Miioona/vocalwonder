"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { RealtimeProvider } from "@/lib/realtime/realtime-provider";
import { useTheme } from "@/lib/settings/use-theme";

export const Providers = ({ children }: { children: ReactNode }) => {
  // Hält die Theme-Klasse am Dokument aktuell, wenn sie in den Einstellungen umgestellt wird.
  useTheme();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* Innerhalb der Query-Verwaltung: Ereignisse über die Verbindung machen die
          Freundesliste ungültig. */}
      <RealtimeProvider>{children}</RealtimeProvider>

      <Toaster position="bottom-right" />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};
