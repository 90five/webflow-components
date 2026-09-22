const MIN_AUTOPLAY_DELAY_MS = 1000;

export function sanitizeCount(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value! >= 1 ? Math.round(value!) : fallback;
}

export function sanitizeGap(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value! >= 0 ? value! : fallback;
}

export function sanitizeAutoplayDelay(value: number | undefined): number {
  return Math.max(Number.isFinite(value) ? value! : MIN_AUTOPLAY_DELAY_MS, MIN_AUTOPLAY_DELAY_MS);
}

export function getLoopEnabled(loop: boolean, slideCount: number): boolean {
  return loop && slideCount > 1;
}

export function formatSlideLabel(index: number, total: number): string {
  return `${index + 1} of ${total}`;
}
