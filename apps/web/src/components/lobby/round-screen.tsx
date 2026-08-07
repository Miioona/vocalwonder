"use client";

import { useEffect, useRef, useState } from "react";

import type { Chart, LobbyState, QueuedSong } from "@vocalwonder/core";

import { LobbyScoreboard } from "@/components/lobby/lobby-scoreboard";
import { PitchCanvas, type Clock } from "@/components/player/pitch-canvas";
import { Button } from "@/components/ui/button";
import { AudioEngine } from "@/lib/player/audio-engine";
import { useMicrophone } from "@/lib/player/use-microphone";
import { usePerformance } from "@/lib/player/use-performance";
import { Broadcaster, Listener, setSignalHandler } from "@/lib/rtc/broadcast";
import { sendFinished, sendScore } from "@/lib/realtime/socket";
import { RemoteClock } from "@/lib/rtc/remote-clock";
import { formatDuration } from "@/lib/song-explorer/audio-files";
import { openFile } from "@/lib/song-explorer/open-file";
import { useAnalysisStore } from "@/stores/useAnalysisStore";
import { useLobbyStore } from "@/stores/useLobbyStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

/** Wie oft der Besitzer seine Position meldet. Zehnmal pro Sekunde reicht für ruhige Balken. */
const POSITION_INTERVAL_MS = 100;

/** Wie im Einzelspiel: Die Zeitanzeige braucht keine volle Bildrate. */
const CLOCK_INTERVAL_MS = 250;

/** Wie im Einzelspiel: Zeit zum Luftholen — und für den Verbindungsaufbau. */
const COUNTDOWN_FROM = 3;

/** Abstand, in dem sich ein Mitspieler meldet, solange noch kein Ton da ist. */
const HELLO_INTERVAL_MS = 1000;

type Phase = "loading" | "playing" | "error";

/** Solange keine Uhr feststeht, steht die Zeit — dann wird auch nichts gewertet. */
const STILL = { positionMs: () => 0 };

/**
 * Die laufende Runde.
 *
 * Wer den Song eingestellt hat, spielt ihn ab, schickt den Ton weiter und meldet seine
 * Position. Die anderen hören zu und richten ihre Balken danach aus. Der Chart kommt
 * ebenfalls von ihm — die anderen haben die Datei nicht und könnten ihn nicht bilden.
 *
 * Mikrofon und Wertung fehlen noch; hier laufen erst einmal bei allen dieselben Balken.
 */
export const RoundScreen = ({
  lobby,
  song,
  meId,
}: {
  lobby: LobbyState;
  song: QueuedSong;
  meId: string;
}) => {
  const endRound = useLobbyStore((state) => state.endRound);

  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState<string>();
  const [chart, setChart] = useState<Chart>();
  const [clock, setClock] = useState<Clock>();

  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const [positionMs, setPositionMs] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [engine] = useState(() => new AudioEngine());

  // Jeder singt gegen denselben Chart und wertet bei sich — der Server sammelt nur ein.
  const { microphone } = useMicrophone(engine, phase === "playing");
  const { performance, snapshot } = usePerformance(
    clock ?? STILL,
    microphone,
    chart,
    phase === "playing",
  );

  const isOwner = song.addedBy === meId;

  /**
   * Die Lautstärke gilt für beide Rollen — nur an verschiedenen Stellen.
   *
   * Der Besitzer regelt seine Engine, die Mitspieler das Element, in dem der empfangene Ton
   * läuft. Beim Besitzer wirkt sie **nicht** auf das, was er sendet: Der Abgriff sitzt hinter
   * seinem Regler, die anderen hätten sonst seine Lautstärke.
   */
  useEffect(() => {
    const apply = ({ volume, outputDeviceId }: { volume: number; outputDeviceId?: string }) => {
      engine.setVolume(volume);
      void engine.setOutputDevice(outputDeviceId);

      const element = audioRef.current;
      if (!element) return;

      element.volume = volume;

      // Ein Audio-Element nimmt sonst das Standardgerät des Systems — die Wahl in den
      // Einstellungen ginge für Mitspieler also ins Leere.
      void element.setSinkId?.(outputDeviceId ?? "").catch((err: unknown) => {
        console.error("[runde] Ausgabegerät", err);
      });
    };

    apply(useSettingsStore.getState());
    return useSettingsStore.subscribe(apply);
  }, [engine]);

  // Die Zeitanzeige braucht keine 60 Hz — das Spielfeld liest die Uhr selbst, viermal öfter.
  useEffect(() => {
    if (!clock) return;

    const timer = setInterval(() => setPositionMs(clock.positionMs()), CLOCK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [clock]);

  // Läuft bei allen gleichzeitig — der Rundenstart kommt für alle im selben Moment vom Server.
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((value) => (value <= 0 ? 0 : value - 1));
    }, 1000);

    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    // Auch Mitspieler brauchen einen Audiokontext — daran hängt ihr Mikrofon.
    engine.ensureContext();

    const settings = useSettingsStore.getState();
    engine.setVolume(settings.volume);
    void engine.setOutputDevice(settings.outputDeviceId);

    let start: ReturnType<typeof setTimeout> | undefined;
    let hello: ReturnType<typeof setInterval> | undefined;
    let cleanupEnded: (() => void) | undefined;
    let broadcaster: Broadcaster | undefined;
    let listener: Listener | undefined;

    void (async () => {
      if (isOwner) {
        // Aus dem Speicher gelesen statt als Abhängigkeit: Die Lobby meldet ständig neue
        // Objekte, und jeder Neustart dieses Effekts würde die Verbindung wegwerfen.
        const file = useLobbyStore.getState().ownFiles[song.songHash];
        if (!file) {
          setPhase("error");
          setMessage("Die Datei ist weg — stell den Song neu ein.");
          return;
        }

        await engine.load(await openFile(file));
        if (cancelled) return;

        await useAnalysisStore.getState().load(file);
        const own = useAnalysisStore.getState().results[file.path]?.chart;

        const stream = engine.broadcastStream();
        if (stream) {
          broadcaster = new Broadcaster(stream);
          setSignalHandler((from, signal) => void broadcaster?.handle(from, signal));

          if (own) broadcaster.setChart(own);
        }

        setChart(own);
        setClock(engine);

        // Der Countdown läuft schon; der Song setzt an seinem Ende ein. Erst dann wird die
        // Position gemeldet — vorher würden die Mitspieler von 0 an weiterzählen und ihr
        // Raster liefe los, obwohl noch nichts zu hören ist.
        // Nur der Besitzer merkt das Ende zuverlässig — bei ihm läuft die Datei.
        const stopWatching = engine.onEnded(() => sendFinished());

        start = setTimeout(() => {
          engine.start();
          setPhase("playing");

          timer = setInterval(
            () => broadcaster?.sendPosition(engine.positionMs()),
            POSITION_INTERVAL_MS,
          );
        }, COUNTDOWN_FROM * 1000);

        cleanupEnded = stopWatching;
        return;
      }

      const remote = new RemoteClock();
      setClock({ positionMs: remote.positionMs });

      listener = new Listener(
        (stream) => {
          if (audioRef.current) {
            audioRef.current.srcObject = stream;
            audioRef.current.volume = useSettingsStore.getState().volume;
          }

          // Angekommen — ab jetzt braucht es keine Meldungen mehr.
          if (hello) clearInterval(hello);
          hello = undefined;
          setPhase("playing");
        },
        (packet) => {
          if (packet.kind === "position") remote.update(packet.positionMs);
          else setChart(packet.chart);
        },
      );

      setSignalHandler((from, signal) => void listener?.handle(from, signal));

      /*
       * Der Besitzer ruft erst an, wenn hier jemand zuhört — also melden wir uns, bis der Ton
       * da ist. Eine einzelne Meldung reicht nicht: Der Besitzer lädt erst Datei und Chart und
       * hört in dieser Zeit noch gar nicht zu. Wiederholen deckt außerdem den Fall ab, dass
       * seine Seite zwischendurch neu aufgebaut wird.
       */
      const announce = () => {
        // Sobald ein Angebot da ist, läuft der Aufbau — weitere Meldungen würden ihn nur
        // wieder abreißen lassen.
        if (listener?.connecting) {
          if (hello) clearInterval(hello);
          hello = undefined;
          return;
        }

        listener?.announce(song.addedBy);
      };
      announce();
      hello = setInterval(announce, HELLO_INTERVAL_MS);
    })().catch((error: unknown) => {
      console.error("[runde]", error);
      if (cancelled) return;

      setPhase("error");
      setMessage("Der Song ließ sich nicht starten.");
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (start) clearTimeout(start);
      if (hello) clearInterval(hello);
      setSignalHandler(undefined);
      cleanupEnded?.();
      broadcaster?.hangUp();
      listener?.close();
      engine.dispose();
    };
  }, [engine, isOwner, meId, song.addedBy, song.songHash]);

  // Der eigene Stand geht an die Lobby, damit alle dieselbe Rangfolge sehen.
  useEffect(() => {
    if (!snapshot) return;

    sendScore(snapshot.points, snapshot.ratio);
    // Zum Sichern nach dem Song: Der Rundenbildschirm ist dann längst weg.
    useLobbyStore.getState().setMySnapshot(snapshot);
  }, [snapshot]);

  const owner = lobby.players.find((player) => player.userId === song.addedBy);
  const progress = song.durationMs > 0 ? (positionMs / song.durationMs) * 100 : 0;

  return (
    // Vollbild über allem, wie im Einzelspiel: Beim Singen soll nichts ablenken.
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3 md:px-6">
        <div className="min-w-0">
          <p className="truncate font-semibold">{song.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[song.artist, owner?.playerName].filter(Boolean).join(" · ")}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={endRound}>
          Zurück
        </Button>
      </div>

      <div className="relative flex min-h-0 flex-1">
        <LobbyScoreboard lobby={lobby} meId={meId} />

        {clock && chart ? (
          <PitchCanvas clock={clock} performance={performance} chart={chart} />
        ) : (
          <div className="flex h-full flex-1 items-center justify-center text-sm text-muted-foreground">
            {phase === "error" ? message : "wartet auf den Song …"}
          </div>
        )}

        {countdown > 0 && phase !== "error" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-7xl font-semibold tabular-nums">{countdown}</span>
          </div>
        )}
      </div>

      <footer className="shrink-0 p-4 md:p-6">
        <div className="h-1 overflow-hidden rounded-full bg-accent">
          <div
            className="h-full rounded-full bg-foreground/70 transition-[width] duration-200 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-xs text-muted-foreground">
          <span>{formatDuration(positionMs)}</span>
          <span>{formatDuration(song.durationMs)}</span>
        </div>
      </footer>

      {/* Der empfangene Ton. Beim Besitzer bleibt das Element leer, er hört über den Kontext. */}
      <audio ref={audioRef} autoPlay />
    </div>
  );
};
