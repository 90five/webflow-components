/**
 * How many copies of the item set need to render so the track never shows a
 * gap, however wide the viewport is — at least 2 (the minimum for the
 * seamless-loop trick to work at all), or enough to cover the container
 * plus one extra set for slack while the loop resets.
 */
export function computeCopyCount(itemSetWidth: number, containerWidth: number): number {
  if (itemSetWidth <= 0) return 2;
  return Math.max(2, Math.ceil(containerWidth / itemSetWidth) + 1);
}

/**
 * The animation always translates by exactly one item set's width, however
 * many copies are actually rendered — that's what makes the loop invisible:
 * once shifted by one set's width, the next copy sits exactly where the
 * first one started.
 */
export function computeDurationSeconds(itemSetWidthPx: number, speedPxPerSecond: number): number {
  if (speedPxPerSecond <= 0 || itemSetWidthPx <= 0) return 0;
  return itemSetWidthPx / speedPxPerSecond;
}
