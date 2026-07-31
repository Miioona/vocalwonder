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

  /** Muss aus einer Nutzerinteraktion heraus laufen, sonst bleibt der Kontext suspendiert. */
  async load(blob: Blob): Promise<void> {
    const context = (this.context ??= new AudioContext());
    const bytes = await blob.arrayBuffer();
    this.buffer = await context.decodeAudioData(bytes);
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
    source.connect(context.destination);
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
    this.buffer = undefined;
    void this.context?.close();
    this.context = undefined;
  }
}
