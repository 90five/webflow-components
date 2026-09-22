export function clampIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(index, 0), count - 1);
}

export function getNextIndex(current: number, count: number): number {
  if (count <= 0) return 0;
  return (current + 1) % count;
}

export type RovingKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Home" | "End";

export function getRovingIndex(current: number, key: RovingKey, count: number): number {
  if (count <= 0) return 0;
  switch (key) {
    case "ArrowLeft":
    case "ArrowUp":
      return (current - 1 + count) % count;
    case "ArrowRight":
    case "ArrowDown":
      return (current + 1) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
  }
}
