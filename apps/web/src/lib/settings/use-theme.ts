"use client";

import { useEffect } from "react";

import { useSettingsStore } from "@/stores/useSettingsStore";

/**
 * Hält die Theme-Klasse am Dokument mit der Einstellung im Gleichklang.
 *
 * Beim ersten Laden hat das Skript im Dokumentkopf schon die richtige Klasse gesetzt; dieser
 * Effekt greift danach — beim Umschalten in den Einstellungen.
 */
export const useTheme = () => {
  const theme = useSettingsStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme !== "light");
  }, [theme]);

  return theme;
};
