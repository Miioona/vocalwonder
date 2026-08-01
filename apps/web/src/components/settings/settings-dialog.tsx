"use client";

import { useState } from "react";

import { SettingSlider, SettingsSection } from "@/components/settings/settings-sections";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { canChooseOutput, useAudioDevices } from "@/lib/settings/use-audio-devices";
import { useExplorerStore } from "@/stores/useExplorerStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

/**
 * Einstellungen, erreichbar über das Zahnrad in der Kopfzeile.
 *
 * In Bereiche geteilt, weil die Werte aus verschiedenen Welten kommen: Was man hört, was das
 * Mikrofon aufnimmt, wie beides zeitlich zusammenfindet, und wo die Musik herkommt.
 */
export const SettingsDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Einstellungen">
            <GearIcon />
          </Button>
        }
      />

      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Einstellungen</DialogTitle>
          <DialogDescription>Gelten für alle Songs und bleiben gespeichert.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          <PlaybackSection />
          <MicrophoneSection />
          <TimingSection />
          <LibrarySection onFolderChange={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const PlaybackSection = () => {
  const volume = useSettingsStore((state) => state.volume);
  const outputDeviceId = useSettingsStore((state) => state.outputDeviceId);
  const update = useSettingsStore((state) => state.update);
  const { outputs } = useAudioDevices();

  return (
    <SettingsSection title="Wiedergabe">
      <SettingSlider
        label="Lautstärke"
        display={`${Math.round(volume * 100)} %`}
        value={volume}
        min={0}
        max={1}
        step={0.05}
        onChange={(next) => update({ volume: next })}
      />

      {canChooseOutput() && (
        <div className="flex flex-col gap-2">
          <Label>Ausgabegerät</Label>
          <DevicePicker
            devices={outputs}
            value={outputDeviceId}
            onChange={(deviceId) => update({ outputDeviceId: deviceId })}
          />
        </div>
      )}
    </SettingsSection>
  );
};

const MicrophoneSection = () => {
  const micSensitivity = useSettingsStore((state) => state.micSensitivity);
  const inputDeviceId = useSettingsStore((state) => state.inputDeviceId);
  const monitorEnabled = useSettingsStore((state) => state.monitorEnabled);
  const monitorVolume = useSettingsStore((state) => state.monitorVolume);
  const update = useSettingsStore((state) => state.update);
  const { inputs, labelsAvailable } = useAudioDevices();

  return (
    <SettingsSection title="Mikrofon">
      <div className="flex flex-col gap-2">
        <Label>Gerät</Label>
        <DevicePicker
          devices={inputs}
          value={inputDeviceId}
          onChange={(deviceId) => update({ inputDeviceId: deviceId })}
        />
        {!labelsAvailable && (
          <p className="text-xs text-muted-foreground">
            Gerätenamen zeigt der Browser erst, nachdem du einmal einen Song gespielt und das
            Mikrofon erlaubt hast.
          </p>
        )}
      </div>

      <SettingSlider
        label="Empfindlichkeit"
        display={`${Math.round(micSensitivity * 100)} %`}
        value={micSensitivity}
        min={0}
        max={1}
        step={0.05}
        onChange={(next) => update({ micSensitivity: next })}
        hint="Höher erkennt auch leise und unsaubere Töne — dann rutschen aber Atem und Hintergrundgeräusche mit durch."
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <Label>Eigenen Gesang mithören</Label>
          <Switch
            checked={monitorEnabled}
            onCheckedChange={(checked) => update({ monitorEnabled: checked })}
          />
        </div>

        <SettingSlider
          label="Lautstärke der eigenen Stimme"
          display={`${Math.round(monitorVolume * 100)} %`}
          value={monitorVolume}
          min={0}
          max={1}
          step={0.05}
          disabled={!monitorEnabled}
          onChange={(next) => update({ monitorVolume: next })}
          hint={
            monitorEnabled ? (
              <span className="text-amber-400">
                Nur mit Kopfhörern — über Lautsprecher pfeift es sofort.
              </span>
            ) : undefined
          }
        />
      </div>
    </SettingsSection>
  );
};

const TimingSection = () => {
  const latencyMs = useSettingsStore((state) => state.latencyMs);
  const latencyAuto = useSettingsStore((state) => state.latencyAuto);
  const update = useSettingsStore((state) => state.update);

  return (
    <SettingsSection title="Timing">
      <SettingSlider
        label="Verzögerungsausgleich"
        display={`${latencyMs} ms${latencyAuto ? " (auto)" : ""}`}
        value={latencyMs}
        min={-100}
        max={500}
        step={5}
        // Der erste Zug schaltet die Automatik ab, sonst überschreibt sie den Wert beim
        // nächsten Songstart wieder.
        onChange={(next) => update({ latencyMs: next, latencyAuto: false })}
        hint="Kommt dein Gesang im Spiel zu spät an, dreh nach rechts. Bei Bluetooth-Kopfhörern sind 200–300 ms normal, per Kabel fast nichts. Am besten während des Singens verstellen — die Wirkung ist sofort sichtbar."
      />

      {!latencyAuto && (
        <div>
          <Button variant="ghost" size="sm" onClick={() => update({ latencyAuto: true })}>
            Wieder automatisch ermitteln
          </Button>
        </div>
      )}
    </SettingsSection>
  );
};

const LibrarySection = ({ onFolderChange }: { onFolderChange: () => void }) => {
  const status = useExplorerStore((state) => state.status);
  const root = useExplorerStore((state) => state.root);
  const pick = useExplorerStore((state) => state.pick);
  const forget = useExplorerStore((state) => state.forget);

  return (
    <SettingsSection title="Songordner">
      <div className="flex flex-col gap-3">
        <p className="truncate font-mono text-sm text-muted-foreground">
          {root?.name ?? "Kein Ordner freigegeben"}
        </p>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              // Der Dialog schließt sich: Der Ordner-Dialog des Browsers legt sich sonst
              // über unseren, und dahinter steht die alte Liste.
              onFolderChange();
              void pick();
            }}
          >
            {root ? "Ordner wechseln" : "Ordner auswählen"}
          </Button>

          {status === "ready" && (
            <Button
              variant="ghost"
              onClick={() => {
                onFolderChange();
                void forget();
              }}
            >
              Vergessen
            </Button>
          )}
        </div>
      </div>
    </SettingsSection>
  );
};

const SYSTEM_DEFAULT = "__system__";

const DevicePicker = ({
  devices,
  value,
  onChange,
}: {
  devices: { deviceId: string; label: string }[];
  value?: string;
  onChange: (deviceId?: string) => void;
}) => (
  <Select
    value={value ?? SYSTEM_DEFAULT}
    onValueChange={(next) => onChange(next === SYSTEM_DEFAULT ? undefined : String(next))}
  >
    <SelectTrigger className="w-full">
      {/*
        Ohne diese Zuordnung zeigt Base UI im geschlossenen Zustand den rohen Wert — bei
        Geräten also die kryptische ID statt des Namens.
      */}
      <SelectValue>
        {(selected) => {
          const id = String(selected);
          if (id === SYSTEM_DEFAULT) return "Systemvorgabe";
          return devices.find((device) => device.deviceId === id)?.label ?? "Unbekanntes Gerät";
        }}
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value={SYSTEM_DEFAULT}>Systemvorgabe</SelectItem>
      {devices.map((device) => (
        <SelectItem key={device.deviceId} value={device.deviceId}>
          {device.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const GearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.2.6.77 1 1.41 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
