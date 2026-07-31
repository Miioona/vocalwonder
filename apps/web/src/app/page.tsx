"use client";

import { useQuery } from "@tanstack/react-query";
import { midiToNoteName, parseUltraStar } from "@vocalwonder/core";
import type { Chart, HealthStatus } from "@vocalwonder/core";

import { requestApi } from "@/lib/api/request-api";
import { CONFIG } from "@/lib/config/config";
import { QUERY_KEYS } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

/** Minimal chart used to prove the shared parser runs in the browser bundle. */
const SAMPLE_CHART = [
  "#TITLE:Scaffold Test",
  "#ARTIST:VocalWonder",
  "#BPM:240",
  "#GAP:0",
  ": 0 4 0 Hal",
  ": 4 4 4 lo",
  "- 8",
  "* 8 8 7 Welt",
  "E",
].join("\n");

function parseSample(): { chart: Chart } | { error: string } {
  try {
    return { chart: parseUltraStar(SAMPLE_CHART) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "unknown error" };
  }
}

function StatusDot({ tone }: { tone: "ok" | "error" | "pending" }) {
  return (
    <span
      className={cn(
        "inline-block size-2 rounded-full",
        tone === "ok" && "bg-emerald-400",
        tone === "error" && "bg-red-400",
        tone === "pending" && "bg-neutral-500",
      )}
    />
  );
}

export default function Home() {
  const health = useQuery({
    queryKey: [QUERY_KEYS.HEALTH],
    queryFn: () =>
      requestApi<HealthStatus>({ url: `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.HEALTH}` }),
    retry: false,
  });

  const sample = parseSample();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">VocalWonder</h1>
        <p className="text-neutral-400">
          Gerüst steht. Diese Seite prüft nur, ob Backend und Shared-Package erreichbar sind.
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-lg border border-neutral-800 p-5">
        <h2 className="flex items-center gap-2 text-sm font-medium text-neutral-300">
          <StatusDot tone={health.isPending ? "pending" : health.isError ? "error" : "ok"} />
          Backend
        </h2>
        {health.isPending && <p className="text-sm text-neutral-500">verbinde …</p>}
        {health.isError && (
          <p className="text-sm text-red-400">
            {health.error.message} — läuft <code className="text-neutral-300">pnpm dev</code>?
          </p>
        )}
        {health.data && (
          <p className="text-sm text-neutral-400">
            {CONFIG.API.BASE_URL} · uptime {health.data.uptime.toFixed(1)}s
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-neutral-800 p-5">
        <h2 className="flex items-center gap-2 text-sm font-medium text-neutral-300">
          <StatusDot tone={"error" in sample ? "error" : "ok"} />
          UltraStar-Parser (@vocalwonder/core)
        </h2>
        {"error" in sample ? (
          <p className="text-sm text-red-400">{sample.error}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm text-neutral-400">
            {sample.chart.phrases.map((phrase, index) => (
              <li key={index} className="font-mono">
                {phrase.notes
                  .map((note) => `${note.text.trim()}(${midiToNoteName(note.midi)})`)
                  .join(" ")}
                <span className="text-neutral-600">
                  {" "}
                  — {phrase.startMs.toFixed(0)}–{phrase.endMs.toFixed(0)} ms
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
