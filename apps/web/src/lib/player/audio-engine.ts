/**
 * Audiowiedergabe über die Web Audio API.
 *
 * Die Position kommt **ausschließlich** aus `AudioContext.currentTime`. Das ist die einzige
 * Uhr, die mit dem tatsächlich hörbaren Ton übereinstimmt — `<audio>.currentTime` ist zu
 * grob und ein Frame-Zähler läuft weg. Alles Spätere (Balken, Mikrofon, Bewertung) hängt an
 * dieser Zahl, deshalb steckt sie an genau einer Stelle.
 *
 * Kein React: Der Renderer fragt die Position pro Frame ab, das darf nie einen Re-Render
 * auslösen.
 */
export class AudioEngine {
  private context?: AudioContext;
  private buffer?: AudioBuffer;
  private source?: AudioBufferSourceNode;
  /** Alles läuft hierdurch — ein Punkt für die Lautstärke, statt sie pro Quelle zu setzen. */
  private master?: GainNode;
  /**
   * Der Song vor der Lautstärkeregelung.
   *
   * Von hier gehen zwei Wege ab: über `master` zu den Lautsprechern dieses Rechners, und —
   * im Mehrspieler — unverändert an die Mitspieler.
   */
  private tap?: GainNode;
  /** Abgriff für die Übertragung an Mitspieler. Erst angelegt, wenn jemand ihn anfordert. */
  private broadcast?: MediaStreamAudioDestinationNode;
  private volume = 0.8;

  /** Kontextzeit, zu der die aktuelle Wiedergabe begann. */
  private startedAt = 0;
  /** Position im Song, an der die aktuelle Wiedergabe begann. */
  private offsetSeconds = 0;
  private playing = false;
  /** Unterscheidet "Song zu Ende" von "wir haben selbst gestoppt". */
  private stopping = false;

  private endedListeners = new Set<() => void>();

  /** Meldet das Ende des Songs. Gibt die Abmeldefunktion zurück. */
  onEnded(listener: () => void): () => void {
    this.endedListeners.add(listener);
    return () => {
      this.endedListeners.delete(listener);
    };
  }

  /**
   * Den Audiokontext anlegen, ohne eine Datei zu laden.
   *
   * Für Mitspieler im Mehrspieler: Sie bekommen den Song als Strom und haben nichts zu
   * dekodieren — brauchen aber trotzdem einen Kontext, an dem ihr Mikrofon hängen kann.
   */
  ensureContext(): AudioContext {
    const context = (this.context ??= new AudioContext());

    this.master ??= context.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(context.destination);

    this.tap ??= context.createGain();
    this.tap.connect(this.master);

    return context;
  }

  /** Muss aus einer Nutzerinteraktion heraus laufen, sonst bleibt der Kontext suspendiert. */
  async load(blob: Blob): Promise<void> {
    const context = this.ensureContext();

    const bytes = await blob.arrayBuffer();
    this.buffer = await context.decodeAudioData(bytes);
  }

  /**
   * Derselbe Ton als Strom, zum Weiterreichen an Mitspieler.
   *
   * Greift **vor** der Lautstärkeregelung ab: Jeder soll für sich regeln können. Würde der
   * Abgriff hinter dem Regler sitzen, hätten alle anderen die Lautstärke des Gastgebers.
   *
   * Das Mikrofon ist nicht dabei — es hängt an einem anderen Knoten und soll auch nicht mit
   * übertragen werden.
   */
  broadcastStream(): MediaStream | undefined {
    if (!this.context || !this.tap) return undefined;

    this.broadcast ??= this.context.createMediaStreamDestination();
    this.tap.connect(this.broadcast);

    return this.broadcast.stream;
  }

  /** 0–1. Wirkt sofort, auch während der Song läuft. */
  setVolume(volume: number): void {
    this.volume = Math.min(Math.max(volume, 0), 1);
    if (this.master) this.master.gain.value = this.volume;
  }

  /**
   * Legt fest, über welches Gerät ausgegeben wird. Gibt es die Möglichkeit nicht (nur
   * Chrome und Edge kennen `setSinkId`), bleibt es bei der Systemvorgabe.
   */
  async setOutputDevice(deviceId?: string): Promise<boolean> {
    const context = this.context as
      (AudioContext & { setSinkId?: (id: string) => Promise<void> }) | undefined;
    if (!context?.setSinkId) return false;

    try {
      await context.setSinkId(deviceId ?? "");
      return true;
    } catch {
      // Gerät verschwunden oder nicht erlaubt — Systemvorgabe ist der richtige Rückfall.
      return false;
    }
  }

  /** Die geschätzte Verzögerung der Ausgabe in Millisekunden, als Startwert für den Ausgleich. */
  get outputLatencyMs(): number {
    const context = this.context;
    if (!context) return 0;
    return Math.round((context.outputLatency || context.baseLatency || 0) * 1000);
  }

  /** Das Mikrofon hängt sich in denselben Kontext — eine Uhr für Wiedergabe und Aufnahme. */
  get audioContext(): AudioContext | undefined {
    return this.context;
  }

  get durationMs(): number {
    return (this.buffer?.duration ?? 0) * 1000;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  positionMs(): number {
    if (!this.context || !this.buffer) return 0;

    const seconds = this.playing
      ? this.offsetSeconds + (this.context.currentTime - this.startedAt)
      : this.offsetSeconds;

    return Math.min(Math.max(seconds, 0), this.buffer.duration) * 1000;
  }

  start(fromMs = 0): void {
    const { context, buffer } = this;
    if (!context || !buffer) return;

    this.stop();
    void context.resume();

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.tap ?? this.master ?? context.destination);
    source.onended = () => {
      if (this.stopping) return;
      this.playing = false;
      this.offsetSeconds = buffer.duration;
      for (const listener of this.endedListeners) listener();
    };

    this.offsetSeconds = Math.min(fromMs / 1000, buffer.duration);
    this.startedAt = context.currentTime;
    this.playing = true;
    this.source = source;

    source.start(0, this.offsetSeconds);
  }

  pause(): void {
    if (!this.playing) return;
    const position = this.positionMs();
    this.stop();
    this.offsetSeconds = position / 1000;
  }

  resume(): void {
    if (this.playing) return;
    this.start(this.offsetSeconds * 1000);
  }

  /**
   * Springt an eine Position. Läuft der Song gerade, spielt er dort weiter — sonst wird
   * nur die Marke gesetzt, die `positionMs()` zurückgibt.
   */
  seek(toMs: number): void {
    if (this.playing) {
      this.start(toMs);
      return;
    }
    this.offsetSeconds = Math.max(0, Math.min(toMs / 1000, this.buffer?.duration ?? 0));
  }

  /** Beendet die Wiedergabe, behält aber die dekodierten Daten. */
  stop(): void {
    if (!this.source) return;

    this.stopping = true;
    this.source.onended = null;
    this.source.stop();
    this.source.disconnect();
    this.source = undefined;
    this.stopping = false;
    this.playing = false;
  }

  /** Beim Verlassen des Spielbildschirms — gibt den AudioContext frei. */
  dispose(): void {
    this.stop();
    this.tap?.disconnect();
    this.master?.disconnect();
    this.tap = undefined;
    this.master = undefined;
    this.broadcast = undefined;
    this.buffer = undefined;
    void this.context?.close();
    this.context = undefined;
  }
}
