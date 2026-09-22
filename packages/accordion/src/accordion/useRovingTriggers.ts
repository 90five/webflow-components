import { useCallback, useRef } from "react";

/** Tracks each item's real trigger <button> so arrow-key navigation can move focus between them. */
export function useRovingTriggers() {
  const triggersRef = useRef(new Map<number, HTMLButtonElement>());

  const register = useCallback((index: number, el: HTMLButtonElement | null) => {
    if (el) triggersRef.current.set(index, el);
    else triggersRef.current.delete(index);
  }, []);

  const focusIndex = useCallback((index: number) => {
    triggersRef.current.get(index)?.focus();
  }, []);

  return { register, focusIndex };
}
