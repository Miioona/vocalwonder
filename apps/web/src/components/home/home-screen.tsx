"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { GameCard } from "@/components/common/game-card";
import { ScoreHistory } from "@/components/settings/sections/score-history";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/auth-client";
import { stripExtension } from "@/lib/song-explorer/audio-files";
import { useSongMetadata } from "@/lib/song-explorer/use-song-metadata";
import { useExplorerStore } from "@/stores/useExplorerStore";
import { useLobbyStore } from "@/stores/useLobbyStore";
import { usePlayerStore } from "@/stores/usePlayerStore";

/**
 * Das Hauptmenü: der Song in der Mitte, Bibliothek links, Ergebnisse rechts.
 *
 * Der Singen-Knopf startet den ausgewählten Song direkt und wechselt dafür in die Bibliothek —
 * dort liegt der Spielbildschirm, und dorthin kommt man beim Beenden zurück.
 */
export const HomeScreen = () => {
  const router = useRouter();
  const { data: session } = useSession();

  const status = useExplorerStore((state) => state.status);
  const root = useExplorerStore((state) => state.root);
  const files = useExplorerStore((state) => state.files);
  const selectedFile = useExplorerStore((state) => state.selectedFile);
  const start = usePlayerStore((state) => state.start);
  const lobby = useLobbyStore((state) => state.lobby);

  const { metadata } = useSongMetadata(selectedFile);
  const title = metadata?.title ?? (selectedFile ? stripExtension(selectedFile.name) : undefined);

  const sing = () => {
    if (selectedFile) start(selectedFile);
    router.push("/songs");
  };

  return (
    <div className="game-backdrop h-full overflow-y-auto">
      <div className="mx-auto grid max-w-6xl gap-4 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
        <GameCard framed title="Bibliothek">
          {status === "ready" && root ? (
            <>
              <p className="truncate text-sm">{root.name}</p>
              <p className="text-xs text-muted-foreground">
                {files.length} {files.length === 1 ? "Song" : "Songs"} im offenen Ordner
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Noch kein Ordner freigegeben.</p>
          )}

          <Link href="/songs" className="mt-auto">
            <Button variant="outline" size="sm" className="w-full">
              Zur Bibliothek
            </Button>
          </Link>
        </GameCard>

        {/* Die Mitte trägt das Stück: Cover groß, Knopf darunter. */}
        <div className="flex flex-col items-center justify-center gap-5 py-6">
          <div className="aspect-square w-full max-w-64 overflow-hidden rounded-xl border border-border bg-muted shadow-lg">
            {metadata?.coverUrl ? (
              // Kein next/image: Das Cover kommt als Objekt-URL aus der lokalen Datei.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={metadata.coverUrl} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-5xl">🎤</div>
            )}
          </div>

          <div className="text-center">
            <p className="text-lg font-semibold">{title ?? "Kein Song gewählt"}</p>
            <p className="text-sm text-muted-foreground">
              {metadata?.artist ?? (selectedFile ? "" : "Wähle einen in der Bibliothek")}
            </p>
          </div>

          {/* In einer Lobby wird nicht allein gesungen — dort geht es zur Lobby zurück. */}
          {lobby ? (
            <Button size="lg" className="px-10 text-base" onClick={() => router.push("/lobby")}>
              Zur Lobby
            </Button>
          ) : (
            <Button size="lg" className="px-10 text-base" onClick={sing}>
              {selectedFile ? "Singen" : "Bibliothek öffnen"}
            </Button>
          )}
        </div>

        <GameCard framed title="Zuletzt gesungen">
          {session ? (
            <ScoreHistory />
          ) : (
            <p className="text-sm text-muted-foreground">
              Mit Konto werden deine Ergebnisse gesichert.
            </p>
          )}
        </GameCard>
      </div>
    </div>
  );
};
