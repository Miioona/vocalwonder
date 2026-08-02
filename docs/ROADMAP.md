# VocalWonder — Roadmap

Reihenfolge der Umsetzung. Jeder Schritt ist einzeln lauffähig und für sich reviewbar —
nach jedem Schritt wird angehalten, gezeigt und erst dann weitergemacht.

Stand des Gerüsts: Monorepo, Express-Backend mit `/health`, Next.js-Frontend,
`packages/core` mit Notenmodell, UltraStar-Parser und Pitch-Helfern. Zustand liegt in
Zustand-Stores (`stores/`), Logik in `lib/song-explorer`, `lib/player` und `lib/analysis`.

**Stand 01.08.2026:** Das Spiel ist spielbar. Ein Song lässt sich auswählen, analysieren
(Trennung → Tonhöhe → Noten) und singen — mit Balken im Canvas, der eigenen Stimme darüber,
laufender Bewertung und einem Ergebnisbildschirm mit Nachschau. Dazu Einstellungen (Geräte,
Lautstärke, Empfindlichkeit, Mithören, Latenzausgleich) und ein durchgängiges Farbsystem mit
hellem und dunklem Modus.

Als Nächstes: Konten mit Anmeldung über Google und Discord, danach Lyrics und der Editor.

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

> **Reihenfolge geändert:** Weil damals noch kein Chart existierte, kamen Canvas und Mikrofon
> vor den Balken. Der "Freestyle"-Modus daraus ist geblieben: Ohne Chart läuft die Musik,
> die eigene Tonhöhe ist sichtbar, nur Sollnoten und Bewertung fehlen. Die Charts kommen
> inzwischen aus der eigenen Analyse (Phase 6), nicht aus Phase 2.

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
- [ ] **9. Lyrics und Phrasenwechsel** — **nicht auf den Balken**: Der Text läuft als eigene
      Zeile unter oder über dem Spielfeld, die Balken bleiben leer. Dazu das phrasenweise
      Scrollen des Spielfelds.

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
- [x] **13. Latenz-Kalibrierung** — `outputLatency` als Startwert (Automatik, die der erste
      Zug am Regler abschaltet), Regler in den Einstellungen. Wirkt sofort: Die Renderschleife
      liest den Wert pro Frame aus dem Store und verschiebt damit die gesungene Linie.
      _Offen:_ Der bequeme Weg — ein Kalibrier-Bildschirm mit Klickspur, der die Differenz
      selbst misst, statt sie schätzen zu lassen.

## Phase 4b — Einstellungen

Erreichbar über ein Zahnrad/Benutzer-Symbol **oben rechts im Explorer**, nicht im Spielmodus.
Werte in einem eigenen `useSettingsStore` und dauerhaft gespeichert (localStorage reicht,
Gerätewahl als `deviceId`).

- [x] **S1. Eingabegerät wählen** — Auswahl als `deviceId` in den Constraints, bewusst ohne
      `exact`: Ist das gemerkte Gerät weg, nimmt der Browser das Standardgerät, statt den
      Zugriff zu verweigern. Liste aktualisiert sich über `devicechange`.
      _Stolperstein, bestätigt:_ Gerätenamen sind leer, bis die Mikrofon-Berechtigung einmal
      erteilt wurde. Der Dialog sagt das jetzt, statt namenlose Einträge zu zeigen.
- [x] **S2. Ausgabegerät wählen** — `AudioContext.setSinkId()`; ist es nicht verfügbar, wird
      der Wähler ausgeblendet statt ein Fehler gezeigt.
- [x] **S3. Eigenen Gesang mithören** — Schalter plus Lautstärke, standardmäßig aus.
      Verstärkung bis Faktor 5 und quadratisch geregelt: Der rohe Mikrofonpegel ist leise,
      weil `autoGainControl` aus sein muss.
- [x] **S4. Songordner wechseln** — in den Einstellungen unter "Bibliothek". In der Kopfzeile
      bleiben nur "Ordner auswählen" und "Zugriff erlauben", weil ohne die nichts geht.
- [x] **S5. Mikrofon-Empfindlichkeit** — ein Regler, dahinter beide Schwellen
      (Klarheit 0.95→0.7, Mindestlautstärke −25→−55 dB). Wirkt ohne Neustart des Mikrofons.

Dazu, nicht ursprünglich geplant: **Wiedergabelautstärke** (eigener `GainNode` in der Engine)
und die Aufteilung des Dialogs in Bereiche mit Menü links.

## Phase 5 — Spiel

- [x] **14. Scoring** — `packages/core/src/scoring.ts`, frei von Mikrofon, Canvas und React.
      Oktav-agnostisch über `pitchClassDistance`; Treffer bis 1,5 Halbtöne, sauber bis 0,8
      (dazwischen 60 % Wertung). Gutgeschrieben werden Millisekunden, dadurch wiegen lange
      Noten von selbst mehr. Goldene Noten zählen doppelt, Freestyle gar nicht — beide
      bleiben aber in der Nummerierung, damit Renderer und Bewertung dieselben Indizes haben.
      **Gemessen wird im festen 20-ms-Takt** (`lib/player/use-performance.ts`), nicht pro
      Bildframe: Sonst hinge das Ergebnis an der Bildrate des Geräts.
- [x] **15. Anzeige** — Punktestand und Trefferzahl im Spielbildschirm, fünfmal pro Sekunde
      aktualisiert. Getroffene Anteile füllen die Balken während des Singens.
      Die Balkenhöhe folgt dem sauberen Trefferbereich, dahinter ein blasses Band für den
      vollen — vorher war der Balken ein Sechstel so hoch wie der zählende Bereich.
- [x] **16. Ergebnisscreen** — Punktzahl, Trefferquote und **Nachschau**: der ganze Song als
      Bild, Sollnoten und die eigene Linie übereinander, getroffene Noten hervorgehoben.
      Die Aufzeichnung läuft im selben 20-ms-Takt mit (~100 KB für vier Minuten) und wird
      beim Neustart verworfen.
      _Offen:_ Wertung in Stufen ("Star", "Superstar"), Kombos, goldene Noten in der Analyse.

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

- [x] **T1. Semantische Tokens** — Palette in `globals.css`, hell und dunkel, jeweils mit
      leichtem Violett-Ton. Dazu eigene Spiel-Tokens (`--note`, `--note-active`, `--voice`,
      `--grid`, `--playhead`), die shadcn nicht mitbringt.
- [x] **T2. Komponenten umgestellt** — keine fest verdrahteten `neutral-*`, `emerald-*` oder
      `red-*`-Klassen mehr außerhalb der shadcn-Bausteine.
- [x] **T3. Canvas zieht mit** — `renderer-colors.ts` liest die Variablen per
      `getComputedStyle`, einmal beim Aufbau und bei Größen- oder Themewechsel, nie pro Frame.
      Abstufungen laufen über `globalAlpha` statt über eingebackene Alphawerte.
- [x] **T4a. Hell und Dunkel** — `theme` in den Einstellungen, Klasse am Dokument, dazu ein
      Skript im Dokumentkopf gegen das Aufblitzen der falschen Fassung beim Laden.
      Der Spielmodus bleibt bewusst in beiden Fassungen dunkel.
- [ ] **T4b. Eigene Farben** — Auswahl der Akzentfarbe durch den User. Technisch nur noch das
      Überschreiben derselben Variablen auf `document.documentElement`; es fehlt die Oberfläche
      dafür. Auch die Spielfarben sollen anpassbar sein.
- [x] **T5. shadcn/ui** — Base UI als Unterbau, Voreinstellung "nova". Dialog, Slider, Switch,
      Select, Label, Button.
      **Falle:** shadcn legt seine Farben in der hellen Fassung an und schaltet über die Klasse
      `dark` um. Ohne die Klasse am `<html>` sind alle Bausteine weiß.
- [ ] **T6. Verlauf im Hintergrund** — der Grundhintergrund ist heute eine glatte Fläche
      (`--background`, hell und dunkel bereits vorhanden). Ein sanfter Schein von oben oder ein
      Hauch Textur würde dem Explorer mehr Tiefe geben, ohne von den Songs abzulenken. Muss in
      beiden Fassungen funktionieren und über dieselben Tokens laufen, damit T4b später
      mitzieht.

## Startseite und Navigation — nach einem Spiel aussehen

Besprochen am 02.08.2026. Auslöser: Wer wissen will, ob er angemeldet ist oder wer von seinen
Freunden da ist, muss heute erst in die Einstellungen. Das gehört auf den ersten Blick.
Vorbild bleibt GeoGuessr — Hauptmenü mit Karten, Nutzermenü oben rechts, gesperrte Bereiche
sichtbar statt versteckt.

**Pfade**

- `/` — Startseite, Hauptmenü
- `/songs` — der Explorer, inhaltlich unverändert
- später `/freunde`, `/bestenlisten`
- Der **Spielbildschirm bleibt eine Überlagerung**, kein eigener Pfad. Begründung: Nach einem
  echten Neuladen wären Ordnerfreigabe, Mikrofon und Audiokontext neu zu erfragen, und alle
  drei brauchen eine Nutzergeste. Als Überlagerung kann der Fall nicht eintreten.

**Kein Hindernis:** Der Zustand-Store überlebt Seitenwechsel — Next wechselt ohne Neuladen,
der Store liegt im Modul. Nur ein echtes Neuladen leert ihn; der Ordner-Handle kommt dann aus
IndexedDB zurück, die Berechtigung dafür braucht aber meist einen Klick.

**Aufbau der Startseite**

- Kopfzeile: Logo, Bereiche (Singen, Duell, Freunde, Bestenliste), rechts das **Nutzermenü**
  mit Avatar, Name und Punkten — darin Einstellungen, Freunde, Abmelden
- Mitte: Cover des zuletzt gesungenen Songs, darunter der große **Singen**-Knopf
- Links: Bibliothek (Anzahl Songs, wie viele analysiert, Ordner wechseln)
- Rechts: die letzten Ergebnisse
- **Ohne Anmeldung** sind Duell, Freunde und Bestenliste grau mit Schloss, statt zu fehlen.
  Angefasst: "Dafür brauchst du ein Konto", mehr nicht
- Abweichung vom Vorbild: Eine tägliche Herausforderung geht nicht — GeoGuessr hat für alle
  dieselbe Welt, unsere Songs liegen lokal und sind bei jedem andere

- [ ] **U1. Gerüst** — `/songs` anlegen, `/` wird Startseite, gemeinsame Kopfzeile ins Layout,
      `restore()` eine Ebene höher (heute im Explorer, die Startseite braucht die Bibliothek
      aber auch).
- [ ] **U2. Karten füllen** — Bibliothek, zuletzt gesungen, Verlauf.
- [ ] **U3. Freunde einbauen** — erst hier entscheidet sich, ob sie eine eigene Seite brauchen
      oder als Karte reichen.
- [ ] **U4. Online-Status ohne Sockets** — Lebenszeichen alle 60 Sekunden, solange der Tab
      sichtbar ist, dazu `lastSeenAt` im Profil. Online heißt: vor weniger als zwei Minuten
      gesehen. Echte Verbindungen erst fürs Duell.
- [ ] **U5. Zahlen zeigen** — Gesamtpunkte, gesungene Songs, Bestwert je Song in der Songliste.
      Der Teil, der aus einer Dateiliste ein Spiel macht.

Der Hintergrundverlauf aus **T6** gehört hierher: Auf einer Startseite trägt er, hinter einer
Dateiliste wäre er nur Unruhe.

## Konten und Server

Entschieden am 01.08.2026. Die App bleibt **ohne Konto voll nutzbar** — Musik und Analyse
liegen beim User. Ein Konto bringt Abgleich zwischen Geräten, Bestenlisten und später Duelle.

- Anmeldung über **better-auth**, selbst gehostet, mit **Google und Discord**.
  E-Mail/Passwort bleibt vorerst weg — spart Domain, Versand und Passwort-Zurücksetzen.
- **Eigenes Backend statt Next-Routen**, weil später Mobile- und Desktop-Fassungen sowie
  Duelle dazukommen sollen. Express bleibt; für Duelle kommt später socket.io oder Colyseus
  daneben. **Hosting-Grenze:** Vercel kann keine dauerhaften Verbindungen halten, das Backend
  braucht einen laufenden Prozess (Railway, Fly.io, Render, eigener Server).
  **Stand 01.08.2026:** Backend läuft auf **Render** (`vocalwonder-api`, Gratisstufe, schläft
  nach 15 Minuten ein), Frontend auf **Vercel** (`vocalwonder-web.vercel.app`). Offen: Chrome
  blockt den Google-Rücksprung auf der `onrender.com`-Adresse über Safe Browsing. Ausweg ohne
  eigene Domain wäre ein `rewrites`-Eintrag in `next.config.ts`, der `/api/*` an Render
  weiterreicht — dann liefe die Anmeldung über die Vercel-Adresse.
- **MongoDB**, weil vorhandene Erfahrung schwerer wiegt als die Vorteile von Postgres bei
  diesem Datenzuschnitt.
- **Punkte werden von Anfang an gespeichert** — jedes gespielte Ergebnis, nicht nur Bestwerte.

- [x] **A1. Datenbank** — MongoDB Atlas, eine Verbindung über Mongoose; better-auth bekommt
      den nativen Treiber aus derselben Verbindung statt einer zweiten.
- [x] **A2. better-auth im Backend** mit Google und Discord, Kontenverknüpfung über die
      E-Mail (ein Mensch, mehrere Anbieter). Sitzungen liegen in der Datenbank und lassen
      sich dadurch zurückziehen.
      **Falle:** Der Auth-Handler muss **vor** `express.json()` hängen — die Bibliothek liest
      den Rumpf selbst.
- [x] **A3. Frontend** — Bereich "Konto" in den Einstellungen, Anmelden über Google oder
      Discord, Sitzung und Abmelden.
      **Falle:** `credentials: "include"` im Auth-Client, sonst schickt der Browser das
      Sitzungs-Cookie nicht an die andere Adresse.
- [x] **A4. Ergebnisse speichern** — `POST /scores` je Durchgang, nicht nur Bestwerte.
      Song erkannt am Datei-Hash, Titel und Artist liegen denormalisiert dabei, die
      Analysefassung ebenfalls (Punkte aus verschiedenen Chart-Fassungen sind nur bedingt
      vergleichbar). Zusammengesetzter Index für Bestenlisten je Song.
- [ ] **A5. Bestenlisten und Verlauf anzeigen** — die Daten liegen bereits, es fehlt die
      Ansicht.
- [ ] **A6. Abgleich der übrigen Daten** — **zurückgestellt, erst besprechen.** Die Frage ist
      nicht "wie synchronisieren", sondern **welche Seite pro Wert gewinnt**: Gerätebezogenes
      wie Latenzausgleich, Mikrofon und Lautstärke gehört zum Browser, nicht zum Konto;
      Favoriten und Charts gehören zum Konto. Eine pauschale Regel wäre in beide Richtungen
      falsch.

### Idee: Charts nicht stillschweigend verwerfen

Heute wirft eine Erhöhung von `ANALYSIS_VERSION` gespeicherte Analysen beim Laden weg. Besser
wäre ein Hinweis statt eines Verschwindens:

- **Aktuelle Fassung:** Pille grün, wie heute ("Chart vorhanden · 35 Phrasen")
- **Ältere Analysefassung:** Pille und Text **gelb**, mit dem Hinweis, dass der Chart mit einer
  älteren Analyse entstanden ist — spielbar bleibt er, neu analysieren wird nur angeboten
- **Von Hand bearbeitet:** immer **grün**, mit dem Vermerk "selbst bearbeitet", unabhängig von
  der Fassung. Handarbeit wird nie als veraltet dargestellt und nie automatisch ersetzt
  (siehe Editor-Modus).

## Freundesliste und Duell-Modus

Vorgemerkt am 02.08.2026, als Nächstes dran. Beides setzt Konten voraus (siehe oben) und ist
der Grund, warum das Backend ein eigener Prozess ist und nicht in Next-Routen liegt.

**Freundesliste**

Gesucht wird über den **Spielernamen** (Präfix) oder die **genaue E-Mail** — entschieden am
02.08.2026. Teiltreffer auf E-Mails gibt es bewusst nicht, sonst ließe sich durch Adressen
tasten und herausfinden, wer hier ein Konto hat.

- [x] **F1. Spielername im Backend** — eigene Sammlung `profile` neben den Sammlungen von
      better-auth, `playerNameLower` eindeutig. Die Eindeutigkeit entscheidet die Datenbank,
      nicht eine Abfrage davor: Zwischen "ist frei?" und "dann nimm ihn" passt genau der
      Moment, in dem ihn jemand anderes bekommt.
- [x] **F2. Freundschaften im Backend** — ein Dokument je Beziehung mit `pairKey` (beide IDs
      sortiert), damit A→B und B→A nicht zwei werden. Gegenseitige Anfragen werden sofort zur
      Freundschaft. Wer keinen Spielernamen hat, taucht nirgends auf.
- [x] **F3. Oberfläche** — Spielername unter "Konto", eigener Bereich "Freunde" mit Suche,
      offenen Anfragen und Liste.
- [ ] **F4. Bestenliste je Song unter Freunden** statt weltweit — die Ergebnisse liegen
      bereits (A4), es fehlt die Auswahl und die Ansicht.
- [ ] **F5. Kleinigkeiten, wenn es benutzt wird** — Anzahl offener Anfragen sichtbar,
      Blockieren, Begrenzung der Anfragen pro Stunde.

Der Bereich "Freunde" sitzt vorerst in den Einstellungen. Das ist der falsche Ort — er zieht
mit **U3** an eine sichtbare Stelle um.

**Duell-Modus**

- Zwei Leute singen denselben Song, am Ende gewinnt die höhere Punktzahl
- Erste Frage ist nicht die Technik, sondern **woher beide denselben Song haben**: Die Musik
  liegt lokal, geteilt wird höchstens der Chart. Naheliegend: Duell nur, wenn beide Seiten
  dieselbe Datei besitzen (Abgleich über den Datei-Hash) — sonst gibt es nichts zu vergleichen
- Zweite Frage: gleichzeitig oder nacheinander. Nacheinander ist deutlich einfacher (keine
  laufende Verbindung nötig, nur ein Ergebnis hin und her) und wäre der bessere erste Schritt
- Gleichzeitig braucht dann socket.io oder Colyseus neben Express, plus Lobby, Bereitschaft
  und einen gemeinsamen Start

## Editor-Modus

Ein Bildschirm, in dem der User den Chart eines Songs von Hand nachbessert. Wird auf Dauer
gebraucht: Keine Automatik trifft jede Note, und ohne Korrekturmöglichkeit bleibt jeder Song
so gut oder schlecht, wie die Analyse ihn erwischt hat. Löst nebenbei die Ad-lib-Frage und
alles, wofür sich sonst eine eigene Heuristik lohnen müsste.

Was er können muss:

- Noten **verschieben, in der Tonhöhe ändern, verlängern, löschen** — dazu teilen und
  zusammenführen
- **Hineinzoomen** in die Zeitachse; die Spielansicht taugt zum Bearbeiten nicht
- **Anhören ab Zeigerposition**, gern mit hörbarer Note beim Ziehen
- **Rückgängig/Wiederherstellen**
- später: **Silben zuordnen**, sobald es Lyrics gibt

Zwei Dinge, die man vorher entscheiden muss, sonst tut es später weh:

- **Handarbeit darf nie stillschweigend verloren gehen.** Ein bearbeiteter Chart muss eine
  Erhöhung von `ANALYSIS_VERSION` überleben und darf beim erneuten Analysieren nicht
  überschrieben werden. Also getrennt ablegen (`source: "manual"` hat Vorrang) und beim
  Knopf "Neu analysieren" ausdrücklich nachfragen.
- **Die Bearbeitung braucht ein eigenes Zeitmaß.** Der Renderer des Spiels zeichnet relativ
  zum Playhead; der Editor braucht einen festen Ausschnitt mit Zoom und Bildlauf.

## Analyse: was noch fehlt

Die Schwellen sind eingestellt (Stand 01.08.2026), diese drei Punkte lassen sich damit aber
nicht lösen:

- [ ] **Oktav-Nachkorrektur.** Die Erkennung springt gelegentlich eine Oktave. Keine Schwelle
      hilft dagegen — nötig ist ein Nachlauf, der Noten weit weg vom lokalen Median um zwölf
      Halbtöne zurückholt. Der Fehler, der beim Zuhören am meisten stört.
- [ ] **Gleitende Stille-Schwelle.** Sie hängt heute am lautesten Punkt des **ganzen** Songs.
      Bei lautem Refrain und leiser Strophe verschwindet die Strophe, egal welcher Wert
      eingestellt ist. Richtig wäre ein gleitender Bezug über ein paar Sekunden.
- [ ] **Ad-libs**, siehe eigener Abschnitt weiter oben.

## Offene Kleinigkeiten

Nichts davon blockiert, aber es sollte nicht verloren gehen:

- [ ] `apps/web/tsconfig.json` erbt nicht von `tsconfig.base.json` (Rest von `create-next-app`).
      Dadurch gelten im Frontend weder `verbatimModuleSyntax` noch `noUnusedLocals` noch
      `noUncheckedIndexedAccess` — anders als in `api` und `core`.
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

## Ganz später: Notenbildung auf den Server

Nicht wichtig, aber notiert. Die Analyse ist das Kernstück und soll irgendwann nicht mehr
offen im Browser liegen.

**Nicht die ganze Analyse verlagern.** Das hieße, die Audiodatei hochzuladen — heute verlässt
nichts den Rechner des Users. Dazu käme Rechenzeit auf deiner Seite (etwa Songlänge pro Song
auf einer GPU), Warteschlangen und eine deutlich unangenehmere rechtliche Lage.

**Stattdessen der Schnitt hinter der Tonhöhenkurve:**

```
Browser:  Trennung + Tonhöhenkurve     kostenlos, keine Datei verlässt den Rechner
      ↓   nur die Kurve, ~100 KB
Server:   Notenbildung → Chart          das eigentlich Eigene
```

Trennmodell und Tonhöhenerkennung sind ohnehin fremde, offen lizenzierte Bausteine. Eigen ist
die Notenbildung — Schwellen, Hysterese, Verschmelzen, Versatz. Genau die wandert.

**Nebengewinn, unabhängig vom Schutzgedanken:** Liegen Charts zentral, muss ein Song **einmal
weltweit** analysiert werden — der Datei-Hash erkennt dieselbe Datei bei jedem anderen Nutzer.
Zu klären wäre dabei, ab wann das Weitergeben von Charts an fremde Nutzer die rechtliche
Grauzone berührt (siehe Schritt 20).
