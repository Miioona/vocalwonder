# VocalWonder

Karaoke im Browser mit Tonhöhen-Balken — für die eigene Musiksammlung auf der Festplatte.

Der User gibt einen Musikordner frei, wählt einen Song, dieser wird analysiert
(Trennung in Gesang und Instrumental, danach Pitch-Erkennung auf der Gesangsspur)
und daraus entstehen die Balken. Beim Singen wird das Mikrofon live analysiert
und gegen die Balken bewertet.

## Stack

- **apps/web** — Next.js 16, React 19, Tailwind 4, TanStack Query → http://localhost:3000
- **apps/api** — Express 5, ESM, Zod-validierte Env → http://localhost:8000
- **packages/core** — `@vocalwonder/core`: Notenmodell, UltraStar-Parser, Pitch-Helfer

`packages/core` ist bewusst frei von Node- und DOM-APIs, damit derselbe Code im
Browser (Analyse, Renderer, Scoring) und im Backend (Chart-Import) läuft.

## Setup

```bash
pnpm install
pnpm dev          # startet web + api parallel (turbo)
```

Weitere Skripte: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm format`.

Node 24 (siehe `.nvmrc`), pnpm über corepack.

## Begriffe

- **Chart** — die Notendaten hinter den Balken: Liste von Noten mit Startzeit,
  Länge und Tonhöhe, gruppiert in Phrasen (= Textzeilen).
- **UltraStar-Format** — De-facto-Standard für Karaoke-Charts (`.txt`), genutzt
  von UltraStar Deluxe, Vocaluxe und den Community-Datenbanken. Wir benutzen es
  als Austauschformat und als Referenz zum Testen der eigenen Analyse.
  Format: https://wiki.usdb.eu/txt_files/format

## Stand

Gerüst. Die Startseite prüft nur, ob Backend und Shared-Package erreichbar sind.

Nächster Schritt ist ein Spike auf die Stem-Separation im Browser
(onnxruntime-web + WebGPU): messen, wie lange ein 4-Minuten-Song braucht und ob
die Gesangsspur für Pitch-Erkennung taugt. Das ist der einzige Punkt, der die
Architektur kippen könnte — alles andere ist bekanntes Terrain.

## Referenzen

- [UltraSinger](https://github.com/rakuri255/UltraSinger) — dieselbe Pipeline in
  Python (Demucs + Whisper + CREPE → UltraStar-Datei). Gute Vorlage für
  Modellwahl und Parameter.
- [LRCLIB](https://www.lrclib.net/) — freies API für zeitsynchrone Songtexte,
  kein Key nötig, CORS offen. Liefert die Silben, die die Audio-Analyse nicht
  hergibt.
- [USDB](https://usdb.eu/) — Community-Datenbank mit handgetappten Charts.
