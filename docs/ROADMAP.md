# VocalWonder — Roadmap

Reihenfolge der Umsetzung. Jeder Schritt ist einzeln lauffähig und für sich reviewbar —
nach jedem Schritt wird angehalten, gezeigt und erst dann weitergemacht.

Stand des Gerüsts: Monorepo, Express-Backend mit `/health`, Next.js-Frontend,
`packages/core` mit Notenmodell, UltraStar-Parser und Pitch-Helfern. Zustand liegt in
Zustand-Stores (`stores/useExplorerStore.ts`), Logik in `lib/song-explorer`.

---

## Phase 1 — Songs lokal verfügbar machen ✅

- [x] **1. Ordner freigeben** — `showDirectoryPicker()`, Handle in IndexedDB persistiert.
      Die Berechtigung überlebt den Reload nicht und wird per Klick erneuert (`needs-permission`).
      _Hinweis:_ Nur Chrome/Edge. Fallback wäre Drag & Drop eines Ordners.
- [x] **2. Dateien lesen** — **abweichend umgesetzt:** kein rekursiver Scan beim Öffnen, sondern
      `readDirectory` pro Ordner, faul beim Aufklappen. Der rekursive `scanForAudioFiles`
      liegt ungenutzt bereit für eine spätere "Alle Songs"-Ansicht.
- [x] **3. Metadaten lesen** — `music-metadata` (`parseBlob`) liefert Titel, Artist, Album,
      Dauer und eingebettetes Cover. Fehlende Tags fallen auf Dateiname/Platzhalter zurück.
      In der Liste faul pro sichtbarer Zeile (`IntersectionObserver`), höchstens vier
      Lesevorgänge parallel, Cache mit 200 Einträgen, der die Cover-URLs besitzt und
      beim Verdrängen freigibt. Liste ohne `precise`, Preview mit — deshalb kann die
      Liste bei VBR-MP3s ohne Header `–:––` zeigen.
- [x] **4. Song-Explorer** — Ordnerbaum + Dateiliste + Preview-Leiste, volle Fensterhöhe ohne
      Seiten-Scroll, mobil einspaltig mit Drill-down. Breadcrumb navigiert auch nach oben.
      _Offen:_ Suche.

> **Browser-Grenze, teuer gelernt:** Chromium gibt über die File System Access API nur Einträge
> heraus, deren Namen auf *allen* Plattformen zulässig sind. Ein Ordner, den Finder als
> "Rock/anderes" anzeigt, heißt auf der Platte `Rock:anderes` — der Doppelpunkt ist unter Windows
> verboten, also taucht der Ordner in der Aufzählung gar nicht auf. Keine Fehlermeldung, kein
> Workaround. Nur Umbenennen hilft.

## Phase 2 — Charts laden (noch ohne Analyse)

- [ ] **5. UltraStar-`.txt` erkennen** — liegt eine `.txt` neben der MP3, durch den Parser in
      `packages/core/src/ultrastar.ts` schicken.
      _Fertig wenn:_ Die Noten eines echten Songs sind im UI sichtbar (erstmal als Tabelle).
- [ ] **6. Chart-Cache** — geparste Charts in IndexedDB, Key = Hash der Datei.

> **Braucht einen echten Testsong:** eine MP3 plus ein passendes Chart von USDB.
> Ohne das lässt sich ab hier nur synthetisch testen.

## Phase 3 — Abspielen und Balken zeichnen

> **Reihenfolge geändert:** Weil noch kein Chart existiert, bauen wir Canvas und Mikrofon
> vor den Balken. Ergebnis ist ein "Freestyle"-Modus — Musik läuft, die eigene Tonhöhe
> ist sichtbar, nur die Sollnoten fehlen. Damit sind Uhr, Renderer und Mikrofon fertig
> getestet, bevor der erste Chart dazukommt.

- [x] **7. Audio-Engine** — `AudioEngine` (`lib/player/audio-engine.ts`) mit decode,
      Play/Pause/Resume; Position ausschließlich aus `AudioContext.currentTime`.
      Dazu der **Spielmodus** als Vollbild-Overlay (`components/player/`): unscharfes Cover
      als CSS-Hintergrund, Countdown 3-2-1, Fortschritt, Pausenmenü über Esc und ☰,
      Ein-/Ausblenden beim Wechsel. Overlay statt Route, weil Datei-Handle und dekodierte
      Audiodaten nicht in eine URL passen — und weil das Aushängen alles mit aufräumt.
- [ ] **8. Canvas-Renderer** — zuerst nur Zeitachse und Playhead (macht Uhrfehler sichtbar),
      danach die Balken der aktuellen Phrase.
      _Fertig wenn:_ Die Balken laufen im Takt durch.
      _Regel:_ Renderschleife liest Zeit aus der Engine und Zustand aus Refs — niemals
      React-State pro Frame.
- [ ] **9. Text auf den Balken** — Silben, Phrasenwechsel, Scrolling.

## Phase 4 — Mikrofon

- [ ] **10. Mic-Zugriff + AudioWorklet** — `getUserMedia` zwingend mit
      `echoCancellation: false, noiseSuppression: false, autoGainControl: false`,
      sonst zerstört die Browser-DSP die Grundfrequenz.
      _Fertig wenn:_ Eine Pegel-Anzeige reagiert.
- [ ] **11. Pitch-Erkennung** — `pitchy` im Worklet, F0 + Confidence.
      _Fertig wenn:_ Ein gesungener Ton wird als Notenname angezeigt.
- [ ] **12. Ist-Linie im Renderer** — die eigene Tonhöhe über den Soll-Balken, geglättet.
- [ ] **13. Latenz-Kalibrierung** — `AudioContext.outputLatency` als Startwert plus manueller
      Offset-Slider. Ohne das fühlt sich alles daneben an, und man findet nie heraus warum.

## Phase 5 — Spiel

- [ ] **14. Scoring** — pro Note, oktav-agnostisch (nur die Tonklasse zählt, wie SingStar).
- [ ] **15. Anzeige** — Punktestand live, Golden- und Freestyle-Noten.
- [ ] **16. Ergebnisscreen.**

> **Nach Schritt 16 ist das Spiel spielbar** — mit fremden Charts.
> Erst danach kommt der riskante Teil.

## Phase 6 — Auto-Analyse

- [ ] **17. Spike: Stem-Separation** — messen, ob ONNX/WebGPU im Browser schnell genug ist.
      Der einzige Punkt, der das Projekt kippen kann. Die Latte ist niedrig: Der Vocal-Stem muss
      nicht gut klingen, nur die Grundfrequenz muss dominieren.
      Plan B: lokaler Python-Helper (Demucs) auf localhost.
- [ ] **18. Melodie → Noten** — `basic-pitch` (liefert direkt Note-Events), danach Segmentierung.
- [ ] **19. Text via LRCLIB** — kein API-Key, CORS offen, direkt aus dem Browser abfragbar.
- [ ] **20. `ChartProvider`-Abstraktion** — Cache / USDB / Analyse hinter einem Interface,
      USDB-Proxy im Backend.

### Idee: Melodie direkt aus dem Mix, ohne Trennung

Vor dem großen Separations-Spike (17) ein kleines Experiment: `essentia.js` enthält
`PredominantPitchMelodia` — den Melodia-Algorithmus, gebaut für „hol die Hauptmelodie aus
einer polyphonen Aufnahme". Song laden, durchschicken, F0-Kurve als Bild ausgeben und mit
dem Gehör vergleichen. Wenn das brauchbar aussieht, wird Phase 6 deutlich kleiner, weil die
Stem-Trennung — das größte Risiko im Projekt — womöglich ganz entfällt.

### Werkzeugkasten für die Analyse

| Paket | Version | Wofür | Einordnung |
| --- | --- | --- | --- |
| `pitchy` | 4.1.0 | Tonhöhe eines einzelnen, sauberen Signals | Echtzeitfähig, für das Mikrofon (Schritt 11). Braucht **einen** dominanten Ton. |
| `aubiojs` | 0.2.1 | dito, WASM (YIN/YINFFT) | Alternative zu `pitchy`. |
| `essentia.js` | 0.1.3 | Melodie aus dem polyphonen Mix | Der interessante Kandidat, siehe Idee oben. |
| `@spotify/basic-pitch` | 1.0.1 | Audio → fertige Note-Events (Start/Länge/Tonhöhe) | Spart die eigene Segmentierung, ist aber polyphon — auf dem Gesamtmix kommen auch Gitarre und Klavier mit. |
| `meyda` | 5.6.3 | Features (Lautstärke, Spektralmaße) | Keine Melodie; nützlich später, um Pausen und Einsätze zu erkennen. |

**Nicht geeignet:** Tone.js. Das ist ein Framework zum *Erzeugen* von Musik; sein `Tone.Analyser`
ist nur ein Wrapper um den `AnalyserNode` (FFT + Wellenform). Gut für Visualizer, liefert aber
keine Antwort auf „welchen Ton singt die Stimme gerade".

**Vorbehalt:** `essentia.js` und `@spotify/basic-pitch` werden beide nicht aktiv weiterentwickelt.
Sie funktionieren, aber auf zeitnahe Bugfixes sollte man nicht bauen.

**Warum das nicht alles löst:** „MP3 analysieren" sind drei Probleme, nicht eins. Tonhöhe erkennen
ist das leichteste. Schwerer ist, aus vielen gleichzeitigen Tönen den *Gesang* herauszuhalten.
Am schwersten ist die Silbenzuordnung — Text bekommt man aus Audio praktisch nicht, dafür bleibt
es bei LRCLIB oder Whisper.

---

## Offene Kleinigkeiten

Nichts davon blockiert, aber es sollte nicht verloren gehen:

- [ ] `apps/web/tsconfig.json` erbt nicht von `tsconfig.base.json` (Rest von `create-next-app`).
      Dadurch gelten im Frontend weder `verbatimModuleSyntax` noch `noUnusedLocals` noch
      `noUncheckedIndexedAccess` — anders als in `api` und `core`.
- [ ] Preview springt einmal, sobald der erste Song gewählt ist (Pill kommt dazu) — `min-h` fehlt.
- [ ] Artist/Titel aus dem Dateinamen ableiten, wenn die Tags leer sind
      (`130 David Guetta & Wynter Gordon - Dirty Talk`).
- [ ] Suche im Explorer.

## Offene Entscheidung

Schritt 17 steht bewusst am Ende, obwohl er das größte Risiko trägt: Bis dahin gibt es
bereits ein spielbares Spiel, und der Ausgang des Spikes ändert nichts an Phase 1–5.
Das Gegenargument ist genauso gültig — scheitert die Browser-Separation, will man das
vielleicht früh wissen. Der Spike ist vom Rest unabhängig und kann jederzeit vorgezogen werden.

Falls vorgezogen wird, zuerst das kleine Melodia-Experiment (siehe Idee in Phase 6) statt des
großen Spikes: geringerer Aufwand, und im Erfolgsfall erübrigt sich der große Spike.
