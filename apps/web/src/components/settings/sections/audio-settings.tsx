"use client";

import { DevicePicker } from "@/components/settings/device-picker";
import { SettingSlider } from "@/components/settings/setting-slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { canChooseOutput, useAudioDevices } from "@/lib/settings/use-audio-devices";
import { useSettingsStore } from "@/stores/useSettingsStore";

/** Alles Klangliche an einer Stelle: Wiedergabe, Mikrofon, Timing. */
export const AudioSettings = () => {
  const settings = useSettingsStore();
  const { inputs, outputs, labelsAvailable } = useAudioDevices();
  const update = settings.update;

  return (
    <div className="flex flex-col gap-6">
      <Block title="Wiedergabe">
        <SettingSlider
          label="Lautstärke"
          display={`${Math.round(settings.volume * 100)} %`}
          value={settings.volume}
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
              value={settings.outputDeviceId}
              onChange={(deviceId) => update({ outputDeviceId: deviceId })}
            />
          </div>
        )}
      </Block>

      <Block title="Mikrofon">
        <div className="flex flex-col gap-2">
          <Label>Gerät</Label>
          <DevicePicker
            devices={inputs}
            value={settings.inputDeviceId}
            onChange={(deviceId) => update({ inputDeviceId: deviceId })}
          />
          {!labelsAvailable && (
            <p className="text-xs text-muted-foreground">
              Erlaube das Mikrofon, um deine Geräte zu sehen.
            </p>
          )}
        </div>

        <SettingSlider
          label="Empfindlichkeit"
          display={`${Math.round(settings.micSensitivity * 100)} %`}
          value={settings.micSensitivity}
          min={0}
          max={1}
          step={0.05}
          onChange={(next) => update({ micSensitivity: next })}
          hint="Ein zu hoher Wert erkennt auch ungewünschte Hintergrundgeräusche und erzeugt unsaubere Töne."
        />

        <div className="flex items-center justify-between gap-4">
          <Label>Eigenen Gesang mithören</Label>
          <Switch
            checked={settings.monitorEnabled}
            onCheckedChange={(checked) => update({ monitorEnabled: checked })}
          />
        </div>

        <SettingSlider
          label="Lautstärke der eigenen Stimme"
          display={`${Math.round(settings.monitorVolume * 100)} %`}
          value={settings.monitorVolume}
          min={0}
          max={1}
          step={0.05}
          disabled={!settings.monitorEnabled}
          onChange={(next) => update({ monitorVolume: next })}
          hint={
            settings.monitorEnabled ? (
              <span className="text-amber-500 dark:text-amber-400">
                Nur mit Kopfhörern, sonst gibt es Rückkopplung.
              </span>
            ) : undefined
          }
        />
      </Block>

      <Block title="Timing">
        <SettingSlider
          label="Verzögerungsausgleich"
          display={`${settings.latencyMs} ms${settings.latencyAuto ? " (auto)" : ""}`}
          value={settings.latencyMs}
          min={-100}
          max={500}
          step={5}
          // Der erste Zug schaltet die Automatik ab, sonst überschreibt sie den Wert beim
          // nächsten Songstart wieder.
          onChange={(next) => update({ latencyMs: next, latencyAuto: false })}
          hint="Kommt dein Gesang zu spät an, erhöhe den Wert. Empfehlung bei Bluetooth: 200–300 ms."
        />

        {!settings.latencyAuto && (
          <div>
            <Button variant="ghost" size="sm" onClick={() => update({ latencyAuto: true })}>
              Wieder automatisch ermitteln
            </Button>
          </div>
        )}
      </Block>
    </div>
  );
};

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-4 border-t border-border pt-5 first:border-0 first:pt-0">
    <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
    {children}
  </section>
);
