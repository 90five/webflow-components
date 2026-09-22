/**
 * A setTimeout wrapper that can be paused and resumed without losing its
 * remaining duration — used to drive auto-advance so hovering/focusing a
 * tabset correctly "pauses time" rather than just delaying a fixed-length
 * timer that was already ticking in the background.
 */
export class PausableTimer {
  private remainingMs: number;
  private startedAt = 0;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly onComplete: () => void;

  constructor(durationMs: number, onComplete: () => void) {
    this.remainingMs = durationMs;
    this.onComplete = onComplete;
  }

  start(): void {
    if (this.timeoutId !== null || this.remainingMs <= 0) return;
    this.startedAt = performance.now();
    this.timeoutId = setTimeout(this.onComplete, this.remainingMs);
  }

  pause(): void {
    if (this.timeoutId === null) return;
    clearTimeout(this.timeoutId);
    this.timeoutId = null;
    this.remainingMs = Math.max(0, this.remainingMs - (performance.now() - this.startedAt));
  }

  resume(): void {
    this.start();
  }

  cancel(): void {
    if (this.timeoutId !== null) clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }
}
