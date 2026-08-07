"use client";

/**
 * Die Uhr für alle, die den Song nicht selbst abspielen.
 *
 * Der Besitzer meldet seine Position mehrmals pro Sekunde. Dazwischen wird weitergezählt —
 * sonst würden die Balken ruckeln statt zu laufen.
 *
 * **Kein Zurückspringen:** Ein Päckchen kann später ankommen als ein neueres (die Leitung
 * liefert bewusst ungeordnet aus). Eine Meldung, die hinter dem aktuellen Stand liegt, wird
 * deshalb verworfen — lieber ein paar Millisekunden vorauseilen als zurückzucken.
 */
export class RemoteClock {
  private lastPositionMs = 0;
  private lastAt = 0;

  update(positionMs: number): void {
    const now = performance.now();

    // Ein Rücksprung ist nur beim Neustart des Songs echt — dann fällt er deutlich aus.
    const restarted = positionMs < this.lastPositionMs - 1000;
    if (!restarted && positionMs < this.positionMs()) return;

    this.lastPositionMs = positionMs;
    this.lastAt = now;
  }

  positionMs = (): number => {
    if (!this.lastAt) return 0;
    return this.lastPositionMs + (performance.now() - this.lastAt);
  };
}
