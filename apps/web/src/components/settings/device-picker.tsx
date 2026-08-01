"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AudioDevice } from "@/lib/settings/use-audio-devices";

const SYSTEM_DEFAULT = "__system__";

interface DevicePickerProps {
  devices: AudioDevice[];
  value?: string;
  onChange: (deviceId?: string) => void;
}

export const DevicePicker = ({ devices, value, onChange }: DevicePickerProps) => (
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
