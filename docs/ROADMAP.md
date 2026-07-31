# VocalWonder — Roadmap

Reihenfolge der Umsetzung. Jeder Schritt ist einzeln lauffähig und für sich reviewbar —
nach jedem Schritt wird angehalten, gezeigt und erst dann weitergemacht.

Stand des Gerüsts: Monorepo, Express-Backend mit `/health`, Next.js-Frontend mit
Systemcheck-Startseite, `packages/core` mit Notenmodell, UltraStar-Parser und Pitch-Helfern.

---

## Phase 1 — Songs lokal verfügbar machen

- [ ] **1. Ordner freigeben** — `showDirectoryPicker()`, Handle in IndexedDB persistieren.
      _Fertig wenn:_ Der Ordnername steht nach einem Reload noch da.
      _Hinweis:_ Nur Chrome/Edge. Fallback wäre Drag & Drop eines Ordners.
- [ ] **2. Dateien scannen** — rekursiv nach Audio-Dateien suchen, rohe Liste anzeigen.
      _Fertig wenn:_ Die eigenen MP3s erscheinen.
- [ ] **3. Metadaten lesen** — ID3-Tags (Titel, Artist, Cover) via `music-metadata`.
      _Fertig wenn:_ Die Liste zeigt Artist/Titel statt Dateinamen.
- [ ] **4. Song-Explorer** — UI mit Suche und Cover-Grid.

## Phase 2 — Charts laden (noch ohne Analyse)

- [ ] **5. UltraStar-`.txt` erkennen** — liegt eine `.txt` neben der MP3, durch den Parser in
      `packages/core/src/ultrastar.ts` schicken.
      _Fertig wenn:_ Die Noten eines echten Songs sind im UI sichtbar (erstmal als Tabelle).
- [ ] **6. Chart-Cache** — geparste Charts in IndexedDB, Key = Hash der Datei.

> **Braucht einen echten Testsong:** eine MP3 plus ein passendes Chart von USDB.
> Ohne das lässt sich ab hier nur synthetisch testen.

## Phase 3 — Abspielen und Balken zeichnen

- [ ] **7. Audio-Engine** — `decodeAudioData`, Play/Pause/Seek. Zeit **ausschließlich** über
      `AudioContext.currentTime`, nie über rAF-Zähler oder `audio.currentTime`.
      _Fertig wenn:_ Song spielt, Zeitanzeige läuft sauber.
- [ ] **8. Canvas-Renderer** — Balken der aktuellen Phrase + Playhead, synchron zur Musik.
      _Fertig wenn:_ Die Balken laufen im Takt durch.
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

---

## Offene Entscheidung

Schritt 17 steht bewusst am Ende, obwohl er das größte Risiko trägt: Bis dahin gibt es
bereits ein spielbares Spiel, und der Ausgang des Spikes ändert nichts an Phase 1–5.
Das Gegenargument ist genauso gültig — scheitert die Browser-Separation, will man das
vielleicht früh wissen. Der Spike ist vom Rest unabhängig und kann jederzeit vorgezogen werden.
