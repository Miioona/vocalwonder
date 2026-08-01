"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useSettingsStore, type ThemeName } from "@/stores/useSettingsStore";

const THEMES: { id: ThemeName; label: string; description: string }[] = [
  { id: "dark", label: "Dunkel", description: "Standard" },
  { id: "light", label: "Hell", description: "Für helle Räume" },
];

export const ThemeSettings = () => {
  const theme = useSettingsStore((state) => state.theme);
  const update = useSettingsStore((state) => state.update);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Farbschema</Label>

        <div className="grid grid-cols-2 gap-3">
          {THEMES.map(({ id, label, description }) => (
            <button
              key={id}
              type="button"
              onClick={() => update({ theme: id })}
              className={cn(
                "flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors",
                theme === id ? "border-primary bg-accent" : "border-border hover:bg-muted",
              )}
            >
              <ThemePreview theme={id} />
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">{description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/** Kleine Vorschau aus denselben Farben, die das Theme setzt. */
const ThemePreview = ({ theme }: { theme: ThemeName }) => (
  <span
    className={cn(
      "flex h-12 w-full items-end gap-1 rounded-md p-2",
      theme === "dark" ? "bg-[oklch(0.15_0.014_300)]" : "bg-[oklch(0.99_0.004_300)]",
    )}
  >
    <span className="h-3 flex-1 rounded-sm bg-[oklch(0.52_0.23_310)]" />
    <span
      className={cn(
        "h-5 flex-1 rounded-sm",
        theme === "dark" ? "bg-[oklch(0.28_0.03_300)]" : "bg-[oklch(0.9_0.008_300)]",
      )}
    />
    <span className="h-2 flex-1 rounded-sm bg-[oklch(0.79_0.16_160)]" />
  </span>
);
