# VocalWonder

Karaoke im Browser mit Tonhöhen-Balken — für die eigene Musiksammlung auf der Festplatte.

Der User gibt einen Musikordner frei und wählt einen Song. Der wird im Browser analysiert
(Trennung in Gesang und Instrumental, danach Tonhöhenerkennung auf der Gesangsspur), daraus
entstehen die Balken. Beim Singen wird das Mikrofon live ausgewertet und gegen die Balken
bewertet.

**Die Musik bleibt auf dem Gerät.** Nichts wird hochgeladen — auch die Analyse läuft im
Browser. Ein Konto braucht es nur für Ergebnisse und Freunde.

## Stack

- **apps/web** — Next.js 16, React 19, Tailwind 4, Zustand, TanStack Query → http://localhost:3000
- **apps/api** — Express 5, ESM, Mongoose, better-auth, Zod-validierte Env → http://localhost:8000
- **packages/core** — `@vocalwonder/core`: Notenmodell, Wertung, Pitch-Helfer, UltraStar-Parser, geteilte DTOs

`packages/core` ist bewusst frei von Node- und DOM-APIs, damit derselbe Code im Browser
(Analyse, Renderer, Wertung) und im Backend läuft.

## Setup

```bash
pnpm install
pnpm dev          # startet web + api parallel (turbo)
```

Weitere Skripte: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm format`.

Node 24 (siehe `.nvmrc`), pnpm über corepack.

Das Backend läuft auch ohne `MONGODB_URI` — dann eben ohne Konten. Die nötigen Variablen
stehen in `apps/api/src/config/env.ts`.

**Browser:** Chromium. Die Bibliothek braucht die File System Access API, die Analyse WebGPU.

## Wie es funktioniert

**Bibliothek** — Ordnerfreigabe über `showDirectoryPicker`, der Handle liegt in IndexedDB und
wird beim Start zurückgeholt. Titel, Artist und Cover kommen per `music-metadata` aus den Tags
der Datei, nachgeladen erst beim Ansehen.

**Analyse** (`apps/web/src/lib/analysis`) — in einem Web Worker:

1. Trennung mit HTDemucs über onnxruntime-web, bevorzugt auf WebGPU (~0,95× Echtzeit; ohne
   WebGPU fällt es auf WASM zurück und dauert deutlich länger)
2. Tonhöhenkurve der Gesangsspur mit `pitchy` (MPM), als spaltenweise `Float32Array`
3. Noten daraus über Glättung, Hysterese und Zusammenfassen — `build-notes.ts`

Das Ergebnis liegt in einer eigenen IndexedDB, der Schlüssel ist der SHA-256 der Datei. Damit
ist derselbe Song auf jedem Rechner derselbe, egal wie die Datei heißt. Steigt
`ANALYSIS_VERSION` (aktuell 3), gilt Gespeichertes als veraltet.

**Spielen** — `AudioContext.currentTime` ist die einzige Uhr. Das Mikrofon läuft über einen
`AnalyserNode`, die Tonhöhe wird alle 20 ms bestimmt, nicht pro Bild — sonst hinge die Wertung
an der Bildrate. Gewertet wird oktavunabhängig, Punkte gibt es je getroffener Millisekunde
(`packages/core/src/scoring.ts`).

**Konten** — better-auth mit Google und Discord, Sitzungen in MongoDB, Konten über die E-Mail
verknüpft. Ergebnisse, Spielername und Freundschaften liegen in eigenen Sammlungen daneben.

## Struktur

```
apps/web/src/
  app/                    /  und  /songs  — der Spielbildschirm ist eine Überlagerung
  components/
    home/                 Hauptmenü
    song-explorer/        Bibliothek: Ordner, Songliste, Vorschau
    player/               Spielbildschirm, Canvas, Ergebnis
    friends/              Feld von rechts
    layout/               Kopfzeile, Nutzermenü, Menü für schmale Schirme
    settings/             Einstellungsdialog
  lib/                    analysis, player, song-explorer, friends, profile, scores, settings
  stores/                 Zustand: Explorer, Player, Analyse, Einstellungen

apps/api/src/modules/     auth, profile, friends, scores, health
                          je Modul: routes → controller → service → model
```

## Stand

Spielbar. Bibliothek, Analyse, Spielmodus mit Wertung, Einstellungen, Hell/Dunkel, Konten,
Ergebnisverlauf und Freundesliste stehen. Live: Frontend auf Vercel, Backend auf Render.

Als Nächstes: socket.io für Anwesenheit und später Duelle. Was sonst noch offen ist, steht in
[docs/ROADMAP.md](docs/ROADMAP.md) — die Datei ist die eigentliche Arbeitsliste und enthält
auch die Begründungen zu den Entscheidungen.

## Begriffe

- **Chart** — die Notendaten hinter den Balken: Liste von Noten mit Startzeit, Länge und
  Tonhöhe, gruppiert in Phrasen (= Textzeilen).
- **Stem** — eine getrennte Einzelspur eines Songs, hier vor allem Gesang und Instrumental.
- **UltraStar-Format** — De-facto-Standard für Karaoke-Charts (`.txt`), genutzt von UltraStar
  Deluxe, Vocaluxe und den Community-Datenbanken. Wir benutzen es als Austauschformat und als
  Referenz zum Testen der eigenen Analyse.
  Format: https://wiki.usdb.eu/txt_files/format

## Referenzen

- [UltraSinger](https://github.com/rakuri255/UltraSinger) — dieselbe Pipeline in Python
  (Demucs + Whisper + CREPE → UltraStar-Datei). Gute Vorlage für Modellwahl und Parameter.
- [LRCLIB](https://www.lrclib.net/) — freies API für zeitsynchrone Songtexte, kein Key nötig,
  CORS offen. Liefert die Silben, die die Audio-Analyse nicht hergibt.
- [USDB](https://usdb.eu/) — Community-Datenbank mit handgetappten Charts.
