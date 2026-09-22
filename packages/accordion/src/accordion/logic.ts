export interface OpenModeOptions {
  singleOpen: boolean;
  allowAllClosed: boolean;
}

export function getInitialOpenIndexes(defaultOpenIndex: number, itemCount: number): Set<number> {
  if (itemCount <= 0) return new Set();
  const clamped = Math.min(Math.max(defaultOpenIndex, -1), itemCount - 1);
  return clamped < 0 ? new Set() : new Set([clamped]);
}

export function toggleOpenIndexes(open: Set<number>, index: number, options: OpenModeOptions): Set<number> {
  const { singleOpen, allowAllClosed } = options;
  const isOpen = open.has(index);

  if (singleOpen) {
    if (isOpen) return allowAllClosed ? new Set() : open;
    return new Set([index]);
  }

  if (isOpen) {
    if (!allowAllClosed && open.size <= 1) return open;
    const next = new Set(open);
    next.delete(index);
    return next;
  }

  return new Set(open).add(index);
}

export type RovingKey = "ArrowUp" | "ArrowDown" | "Home" | "End";

export function getRovingIndex(current: number, key: RovingKey, count: number): number {
  if (count <= 0) return 0;
  switch (key) {
    case "ArrowUp":
      return (current - 1 + count) % count;
    case "ArrowDown":
      return (current + 1) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
  }
}
