# VocalWonder — Roadmap

Reihenfolge der Umsetzung. Jeder Schritt ist einzeln lauffähig und für sich reviewbar —
nach jedem Schritt wird angehalten, gezeigt und erst dann weitergemacht.

Stand des Gerüsts: Monorepo, Express-Backend mit `/health`, Next.js-Frontend,
`packages/core` mit Notenmodell, UltraStar-Parser und Pitch-Helfern. Zustand liegt in
Zustand-Stores (`stores/`), Logik in `lib/song-explorer`, `lib/player` und `lib/analysis`.

**Stand 31.07.2026:** Bibliothek, Spielmodus, Mikrofon und die eigene Analyse laufen.
Ein Song lässt sich auswählen, analysieren (Trennung → Tonhöhe → Noten) und spielen —
mit Balken im Canvas und der eigenen Stimme als Linie darüber. Was fehlt, ist die
Bewertung und viel Feinschliff an den Analyse-Schwellen.

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
> heraus, deren Namen auf _allen_ Plattformen zulässig sind. Ein Ordner, den Finder als
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
- [x] **8. Canvas-Renderer** — Zeitachse, Oktavlinien, Playhead, Sollnoten aus dem Chart und
      die eigene gesungene Linie (`lib/player/renderer.ts`, `components/player/pitch-canvas.tsx`),
      inklusive `devicePixelRatio` und `ResizeObserver`. Die gerade fällige Note leuchtet auf.
      Der sichtbare Tonumfang richtet sich nach dem Chart (Umfang plus drei Halbtöne, mindestens
      eine Oktave). Ohne Chart bleibt es beim Freestyle-Bild.
      _Regel:_ Renderschleife liest Zeit aus der Engine und Zustand aus Refs — niemals
      React-State pro Frame.
      _Offen:_ phrasenweises Scrollen statt durchlaufender Achse (kommt mit Schritt 9).
- [ ] **9. Text auf den Balken** — Silben, Phrasenwechsel, Scrolling.

## Phase 4 — Mikrofon

- [x] **10. Mic-Zugriff** — `getUserMedia` mit abgeschalteter Browser-DSP: `echoCancellation`,
      `noiseSuppression` und `autoGainControl` stehen alle auf `false`.
      **Abweichung:** `AnalyserNode` statt AudioWorklet — liefert genau das Analysefenster,
      die Erkennung läuft im Renderframe mit. Ein Worklet mit eigenem Audiothread lohnt erst,
      wenn die Erkennung nachweislich Frames kostet.
- [x] **11. Pitch-Erkennung** — `pitchy` (MPM), Klarheitsschwelle 0.85, Bereich 65–1200 Hz.
      Pegel und Notenname als Kontrollanzeige im Spielbildschirm.
- [x] **12. Ist-Linie im Renderer** — geglättet (EMA 0.4), Sprünge über 2,5 Halbtöne werden
      direkt übernommen; Unterbrechung der Linie bei Pausen über 140 ms.
- [ ] **13. Latenz-Kalibrierung** — `AudioContext.outputLatency` als Startwert plus manueller
      Offset-Slider. Ohne das fühlt sich alles daneben an, und man findet nie heraus warum.

## Phase 4b — Einstellungen

Erreichbar über ein Zahnrad/Benutzer-Symbol **oben rechts im Explorer**, nicht im Spielmodus.
Werte in einem eigenen `useSettingsStore` und dauerhaft gespeichert (localStorage reicht,
Gerätewahl als `deviceId`).

- [ ] **S1. Eingabegerät wählen** — `navigator.mediaDevices.enumerateDevices()`, Auswahl als
      `deviceId` in den `getUserMedia`-Constraints.
      _Stolperstein:_ Gerätenamen sind leer, solange keine Mikrofon-Berechtigung erteilt wurde —
      die Liste ist also erst nach dem ersten Zulassen brauchbar.
      _Stolperstein:_ Wird ein Gerät abgezogen, muss auf den Standard zurückgefallen werden
      (`devicechange`-Event).
- [ ] **S2. Ausgabegerät wählen** — `AudioContext.setSinkId()` (Chrome/Edge). Fällt der Aufruf
      durch, bleibt es bei der Systemausgabe — dann den Wähler ausblenden statt Fehler zeigen.
- [ ] **S3. Eigenen Gesang mithören** — Checkbox plus Lautstärkeregler. Technisch:
      Mikrofonquelle → `GainNode` → Ausgabe, Gain 0 wenn aus.
      _Achtung:_ ohne Kopfhörer Rückkopplung, und die Verzögerung wirft Sänger aus dem Takt.
      Deshalb standardmäßig **aus**, mit Hinweis beim Einschalten.
- [ ] **S4. Songordner wechseln** — der bestehende Ordner-Picker zieht aus der Kopfzeile in
      die Einstellungen um.
- [ ] **S5. Mikrofon-Empfindlichkeit** — beim Testen wurden gelegentlich leise
      Hintergrundgeräusche als Ton erkannt. Zwei Stellschrauben, beide gehören in die
      Einstellungen: die Klarheitsschwelle (`MIN_CLARITY`, aktuell 0.85 in
      `lib/player/microphone.ts`) und eine Mindestlautstärke (`minVolumeDecibels` von
      `pitchy`, aktuell ungenutzt). Dazu ein Regler "Empfindlichkeit" mit sinnvollem
      Standardwert, statt zwei technischer Zahlen.

## Phase 5 — Spiel

- [ ] **14. Scoring** — pro Note, oktav-agnostisch (nur die Tonklasse zählt, wie SingStar).
- [ ] **15. Anzeige** — Punktestand live, Golden- und Freestyle-Noten.
- [ ] **16. Ergebnisscreen.**

> **Nach Schritt 16 ist das Spiel spielbar** — mit fremden Charts.
> Erst danach kommt der riskante Teil.

## Phase 6 — Auto-Analyse

- [x] **17. Spike: Stem-Separation** — **funktioniert, und zwar gut.** Werkbank unter
      `/development` (`components/development/`, `lib/development/`).
      Gemessen auf einem Apple-Silicon-Mac, Chrome, WebGPU: **0,95× Echtzeit** — ein
      Vier-Minuten-Song braucht knapp vier Minuten. Der Gesangs-Stem klingt sehr sauber,
      deutlich besser als für die Tonhöhenerkennung nötig.
      Modell: [kramp/htdemucs-6s-webgpu-onnx](https://huggingface.co/kramp/htdemucs-6s-webgpu-onnx),
      285 MB, einmalig ~33 s Download, danach im Cache Storage.
      **Wichtig:** Die Modelle von StemSplitio laufen _nicht_ auf WebGPU — ihr eingebautes
      ISTFT enthält einen `ConstantOfShape`-Knoten, den das Backend nicht ausführt, und die
      Session bricht beim Erstellen ab. Die kramp-Variante hat genau diesen Knoten vorab
      gefaltet. Wer das Modell wechselt, tritt sonst in dieselbe Falle.
      Plan B (lokaler Python-Helper) wird damit nicht gebraucht.
- [x] **18. Melodie → Noten** — eigene Kette statt `basic-pitch`: `pitchy` rahmenweise über den
      Gesangs-Stem (`lib/analysis/pitch-track.ts`), dann Segmentierung mit Hysterese
      (`lib/analysis/build-notes.ts`). Läuft im Web Worker, Ergebnis in IndexedDB,
      Schlüssel = SHA-256 des Dateiinhalts, versioniert über `ANALYSIS_VERSION`.
      Die Notenhöhe bleibt eine Kommazahl (Median der Rahmen) — Bewertung und Schlauch-Modus
      brauchen die feine Auflösung.
      **Falle:** `idb-keyval` legt Objektspeicher nur beim Erzeugen der Datenbank an. Ein
      zweiter Speicher in einer bestehenden Datenbank existiert nie — deshalb hat die Analyse
      eine eigene Datenbank (`vocalwonder-analysis`).
      _Offen:_ Feinschliff an den Schwellen (siehe Voreinstellungen pro Genre), Ad-libs.
- [ ] **19. Text via LRCLIB** — kein API-Key, CORS offen, direkt aus dem Browser abfragbar.
- [ ] **20. `ChartProvider`-Abstraktion** — Cache / USDB / Analyse hinter einem Interface.
      **Ohne USDB-Proxy im Backend.** Charts enthalten Liedtext und Melodie-Transkription;
      wer sie über einen eigenen Server ausliefert, ist nicht mehr Werkzeugbauer, sondern
      Verteiler. Wenn Komfort gewünscht ist: Download im Namen des Users mit dessen eigenen
      Zugangsdaten, damit er der Handelnde bleibt.

### Die anderen Stems — Ideen

Das Modell liefert **sechs** Stems in einem Durchlauf: `drums`, `bass`, `other`, `vocals`,
`guitar`, `piano`. Aktuell behalten wir nur `vocals` und werfen den Rest weg.

**Sie kosten keine Rechenzeit extra** — sie fallen ohnehin an. Der einzige Preis ist Speicher:
alle sechs bei vier Minuten sind gut 500 MB im RAM. Wer sie behalten will, muss sie also
wegschreiben (File System Access oder IndexedDB), nicht im Speicher halten.

Nicht enthalten: Kick und Snare getrennt — `drums` ist eine Spur. Dafür gibt es separate
Modelle ("drumsep"), die auf dem Drum-Stem in einem zweiten Durchlauf laufen.

Was sich damit bauen ließe:

- **Echter Karaoke-Modus** — alles außer `vocals` zusammenmischen, Original-Gesang weg.
- **Übemodus** — Gesang leiser statt ganz weg, oder nur Drums als Metronom.
- **Hilfe für die Analyse selbst** — `bass` ist ein guter Anhaltspunkt für Tonart und
  Grundton, `drums` für die Taktschätzung.

### Idee: Voreinstellungen pro Genre für die Analyse

Der User wählt vor dem Analysieren die Art des Songs — Rap, Pop, Rock, Ballade — und die
Segmentierung bekommt dazu passende Schwellen. Grund: Was Rap verbessert, macht Balladen
kaputt und umgekehrt. Ohne Voreinstellungen optimiert man ewig im Kreis.

Was sich je Genre unterscheidet:

| Schraube          | Rap                            | Ballade                     |
| ----------------- | ------------------------------ | --------------------------- |
| `MIN_NOTE_MS`     | kurz (~70 ms), schnelle Silben | lang (~150 ms)              |
| `PITCH_TOLERANCE` | eng, Tonhöhe trägt wenig       | weit, Vibrato und Glissandi |
| `PHRASE_GAP_MS`   | kurz, dichte Zeilen            | länger                      |

**Für Rap gibt es die elegantere Lösung als getunte Schwellen:** Das Notenmodell kennt den
Typ `rap` — dort wird nur der Rhythmus bewertet, die Tonhöhe ignoriert. Eine Rap-Voreinstellung
sollte also `type: "rap"` erzeugen, statt zu versuchen, aus Sprechgesang Melodie zu pressen.

**Das Umschalten ist billig**, sofern die F0-Kurve gespeichert wird (siehe Ergebnisformat):
Die teure Trennung läuft einmal, die Segmentierung dauert Millisekunden. Eine andere
Voreinstellung heißt dann: neu segmentieren, nicht neu trennen. Damit wäre sogar denkbar,
die Schwellen live per Regler zu verändern und das Ergebnis sofort zu sehen.

Die gewählte Voreinstellung gehört in die Metadaten des Ergebnisses, damit später
nachvollziehbar ist, womit ein Chart entstanden ist.

### Problem: Ad-libs und Backings landen mit in den Balken

Das Trennmodell kennt nur "Gesang" — Leadstimme, Ad-libs, Backings und Chöre liegen alle im
selben Stem. Beim Testen wurden Ad-libs im Intro als Noten erkannt. Perfekt lösen lässt sich
das nicht; es ist ein Zuordnungsproblem, kein Trennproblem.

Was helfen könnte, in der Reihenfolge des Aufwands:

- **Mitte/Seite auswerten.** Die Leadstimme sitzt fast immer in der Mitte des Stereobilds,
  Ad-libs und Backings werden nach außen gelegt. Aus dem Stem lässt sich `mitte = (L+R)/2`
  und `seite = (L-R)/2` rechnen; Rahmen, in denen die Seite dominiert, sind verdächtig.
  Billig zu rechnen, weil der Stem ohnehin in Stereo vorliegt — der erste Versuch wert.
- **Lautstärke im Verhältnis zur Umgebung.** Ad-libs sind meist leiser abgemischt als die
  Leadstimme. Eine Schwelle relativ zum lokalen Median statt absolut.
- **Von Hand nachbessern.** Ein kleiner Editor, in dem man Balken löscht, verschiebt und
  zusammenfasst. Löst nicht nur dieses Problem, sondern alle — und ist am Ende das, was die
  UltraStar-Gemeinde seit zwanzig Jahren macht.

### Idee: Fortgeschrittenen-Modus mit stufenloser Tonhöhe

Statt gerasterter Balken ein **Schlauch**: die rohe F0-Kurve der Originalstimme als Band im
Canvas, mit einer Breite, die der erlaubten Abweichung entspricht. Der Sänger muss die
Linie treffen und ihr folgen — auch durch Glissandi, Vibrato und Zwischentöne, die ein
Halbtonraster wegbügelt.

**Der entscheidende Punkt: Die Kurve fällt bei der Analyse ohnehin an.** Sie ist der
Zwischenschritt, aus dem die Noten gebildet werden, und wird danach weggeworfen. Sie muss
also **zusammen mit dem Chart gespeichert werden** — sonst muss später jeder Song erneut
durch die Trennung, nur um sie zurückzubekommen. (Gleiches Argument wie bei den
Energiekurven weiter unten.)

Was der Modus möglich macht:

- **Feine Bewertung** — Abweichung in Cent statt "Halbton getroffen / nicht getroffen",
  über die Zeit aufsummiert. Damit lässt sich ein Ergebnis berechnen, das echtes Können
  abbildet statt nur Treffer zu zählen.
- **Schwierigkeitsgrade** über die Schlauchbreite: breit zum Üben, schmal für Fortgeschrittene.
- **Sichtbares Feedback** — Farbe des Schlauchs dort, wo man drin war, und dort, wo nicht.

Reihenfolge: Der klassische Balkenmodus zuerst, das ist der vertraute Einstieg. Dieser Modus
kommt als zweite Ansicht auf dieselben Daten.

### Idee: Stem-gesteuerte Animationen im Spielmodus

Die Stems liegen nach der Analyse fertig vor — daraus lässt sich **pro Stem eine
Energiekurve** vorberechnen (z. B. RMS alle 20 ms) und neben dem Chart ablegen. Der Renderer
liest sie dann wie eine Partitur, statt zur Laufzeit zu analysieren.

Das ist der elegante Teil daran: **keine Live-Analyse, keine Latenz, perfekt im Takt** — und
weil die Kurve ein paar Kilobyte groß ist, kostet sie im Spiel praktisch nichts.

Damit möglich:

- **Kick** → das ganze Spielfeld gibt kurz nach, Balken federn, ein Puls im Hintergrund
- **Bass** → Helligkeit oder Sättigung des unscharfen Covers pumpt mit
- **Drums** → Partikel oder ein Aufblitzen der Playhead-Linie auf Snare-Schlägen
- **Gesangseinsätze** → die kommende Phrase leuchtet kurz auf, bevor sie dran ist

Reihenfolge: Erst Balken und Bewertung, dann das. Aber die Energiekurven sollten **schon beim
ersten Analyselauf mitgeschrieben** werden — sonst muss später jeder Song erneut durchs Modell.

### Idee: Melodie direkt aus dem Mix, ohne Trennung

**Überholt, seit die Trennung nachweislich läuft (Schritt 17).** Bleibt als Rückfall notiert,
falls die Separation auf schwächerer Hardware unbrauchbar langsam wird.

Ursprünglicher Gedanke: `essentia.js` enthält
`PredominantPitchMelodia` — den Melodia-Algorithmus, gebaut für „hol die Hauptmelodie aus
einer polyphonen Aufnahme". Song laden, durchschicken, F0-Kurve als Bild ausgeben und mit
dem Gehör vergleichen. Wenn das brauchbar aussieht, wird Phase 6 deutlich kleiner, weil die
Stem-Trennung — das größte Risiko im Projekt — womöglich ganz entfällt.

### Werkzeugkasten für die Analyse

| Paket                  | Version | Wofür                                             | Einordnung                                                                                                 |
| ---------------------- | ------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pitchy`               | 4.1.0   | Tonhöhe eines einzelnen, sauberen Signals         | Echtzeitfähig, für das Mikrofon (Schritt 11). Braucht **einen** dominanten Ton.                            |
| `aubiojs`              | 0.2.1   | dito, WASM (YIN/YINFFT)                           | Alternative zu `pitchy`.                                                                                   |
| `essentia.js`          | 0.1.3   | Melodie aus dem polyphonen Mix                    | Der interessante Kandidat, siehe Idee oben.                                                                |
| `@spotify/basic-pitch` | 1.0.1   | Audio → fertige Note-Events (Start/Länge/Tonhöhe) | Spart die eigene Segmentierung, ist aber polyphon — auf dem Gesamtmix kommen auch Gitarre und Klavier mit. |
| `meyda`                | 5.6.3   | Features (Lautstärke, Spektralmaße)               | Keine Melodie; nützlich später, um Pausen und Einsätze zu erkennen.                                        |

**Nicht geeignet:** Tone.js. Das ist ein Framework zum _Erzeugen_ von Musik; sein `Tone.Analyser`
ist nur ein Wrapper um den `AnalyserNode` (FFT + Wellenform). Gut für Visualizer, liefert aber
keine Antwort auf „welchen Ton singt die Stimme gerade".

**Vorbehalt:** `essentia.js` und `@spotify/basic-pitch` werden beide nicht aktiv weiterentwickelt.
Sie funktionieren, aber auf zeitnahe Bugfixes sollte man nicht bauen.

**Warum das nicht alles löst:** „MP3 analysieren" sind drei Probleme, nicht eins. Tonhöhe erkennen
ist das leichteste. Schwerer ist, aus vielen gleichzeitigen Tönen den _Gesang_ herauszuhalten.
Am schwersten ist die Silbenzuordnung — Text bekommt man aus Audio praktisch nicht, dafür bleibt
es bei LRCLIB oder Whisper.

---

## Farbtokens und anpassbares Theme

Ziel: Der User soll später eigene Farben wählen können. Optische Richtung ist GeoGuessr —
dunkel, spielerisch, große Zahlen, wenige kräftige Akzente.

**Jetzt machen, nicht später:** Aktuell stehen `neutral-800`, `emerald-400` und Freunde in
jeder Datei einzeln. Bei zwölf Komponenten ist die Umstellung eine Stunde, bei vierzig ein
Nachmittag Fleißarbeit.

- [ ] **T1. Semantische Tokens** — im `@theme`-Block von `globals.css` als CSS-Variablen
      definieren (Hintergrund, Fläche, Rand, Text, gedämpfter Text, Akzent, Warnung, Fehler),
      bestehende Farben darauf abbilden.
- [ ] **T2. Komponenten umstellen** — feste Farbklassen durch die Tokens ersetzen.
- [ ] **T3. Canvas mitziehen** — der Renderer erbt **kein** CSS. Farben für Raster, Playhead
      und Linie müssen per `getComputedStyle` aus den Variablen gelesen werden, sonst bleibt
      das Spielfeld grau, während der Rest das Theme wechselt.
- [ ] **T4. Theme-Store** — Auswahl setzt die Variablen auf `document.documentElement` und
      merkt sie sich (localStorage). Ein paar Voreinstellungen plus freie Akzentfarbe.
- [ ] **T5. shadcn/ui gezielt dazunehmen** — Dialog, Select, Slider, Switch, wenn die
      Einstellungen (Phase 4b) gebaut werden. Nicht auf Vorrat installieren: Es ist
      Copy-in-Code mit Radix-Paketen pro Komponente, und die Spielansichten sind Canvas.

## Stellschrauben, die als Nächstes gedreht gehören

Nach dem ersten Spielen mit echten Songs (31.07.2026) — nichts davon ist kaputt, alles ist
Feinschliff:

- [ ] **Segmentierung pro Genre** — siehe Voreinstellungen weiter oben. Bei Rap sitzen die
      Noten gut, bei gehaltenem Gesang gerät es leichter zu kleinteilig.
- [ ] **Ad-libs im Intro** werden als Noten erkannt (Mitte/Seite-Trick als erster Versuch).
- [ ] **Latenz-Kalibrierung** (Schritt 13) — ohne sie lässt sich "die Balken sitzen daneben"
      nicht von "die Analyse ist daneben" unterscheiden.
- [ ] **Notendichte** im Spielfeld prüfen: Sind die Balken lang genug zum Treffen, oder
      zerfällt eine Zeile in zu viele kurze?

## Offene Kleinigkeiten

Nichts davon blockiert, aber es sollte nicht verloren gehen:

- [ ] `apps/web/tsconfig.json` erbt nicht von `tsconfig.base.json` (Rest von `create-next-app`).
      Dadurch gelten im Frontend weder `verbatimModuleSyntax` noch `noUnusedLocals` noch
      `noUncheckedIndexedAccess` — anders als in `api` und `core`.
- [ ] Preview springt einmal, sobald der erste Song gewählt ist (Pill kommt dazu) — `min-h` fehlt.
- [ ] Artist/Titel aus dem Dateinamen ableiten, wenn die Tags leer sind
      (`130 David Guetta & Wynter Gordon - Dirty Talk`).
- [ ] **Suche im Explorer** über Titel und Artist. Hängt an nichts, kann jederzeit kommen.
- [ ] **Filter im Explorer** — "nur analysierte" und "Favoriten".
      **Blockiert: erst wenn es Benutzerkonten und eine eigene Datenbank gibt** (Entscheidung
      vom 31.07.2026). Beide Filter brauchen eine Song-Tabelle, die es dann ohnehin geben
      muss — vorher würde man sie zweimal bauen.
      "Nur analysierte" scheitert heute daran, dass der Cache-Schlüssel ein Hash des
      Dateiinhalts ist: Ohne Index Pfad → Schlüssel müsste die App für jede Listenzeile die
      Datei lesen, aus dem Filter würde ein Ladebalken. "Favoriten" braucht einen Ort zum
      Speichern, der den Rechnerwechsel überlebt.

## Offene Entscheidung

Schritt 17 steht bewusst am Ende, obwohl er das größte Risiko trägt: Bis dahin gibt es
bereits ein spielbares Spiel, und der Ausgang des Spikes ändert nichts an Phase 1–5.
Das Gegenargument ist genauso gültig — scheitert die Browser-Separation, will man das
vielleicht früh wissen. Der Spike ist vom Rest unabhängig und kann jederzeit vorgezogen werden.

Falls vorgezogen wird, zuerst das kleine Melodia-Experiment (siehe Idee in Phase 6) statt des
großen Spikes: geringerer Aufwand, und im Erfolgsfall erübrigt sich der große Spike.
