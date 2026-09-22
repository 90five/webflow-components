import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { formatNumber, interpolate, parseNumberText } from "./logic";
import { useAssignedSlotContent } from "./useAssignedSlotContent";

const SLOT_NAME = "numberSlot";

export interface NumberCountProps {
  numberSlot: ReactNode;
  duration: number;
  startValue: number;
  decimalSeparator: string;
  replay: boolean;
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const NumberCount = (props: NumberCountProps) => {
  const { numberSlot, duration, startValue, decimalSeparator, replay } = props;
  const { containerRef, assigned } = useAssignedSlotContent(SLOT_NAME);
  const hasPlayedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const target = assigned?.[0] as HTMLElement | undefined;
    if (!target) return;

    const separator = decimalSeparator === "," ? "," : ".";
    const parsed = parseNumberText(target.textContent ?? "", separator);
    if (!parsed) return;

    // Tabular (fixed-width) numerals — not a visual opinion, a correctness
    // fix: proportional digit widths make a counting number visibly jitter
    // sideways as narrower/wider digits swap in each frame. `target` lives
    // in the light DOM (it's the real element, never cloned), so this has
    // to be an inline style rather than a class rule in the component's own
    // shadow-scoped <style> — that would never reach outside the shadow
    // root. Still overridable with a `!important` rule if a project
    // genuinely wants proportional numerals back.
    target.style.fontVariantNumeric = "tabular-nums";
    const originalText = target.textContent ?? "";

    const play = () => {
      if (hasPlayedRef.current && !replay) return;
      hasPlayedRef.current = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

      if (prefersReducedMotion()) {
        target.textContent = originalText;
        return;
      }

      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        if (elapsed < duration) {
          target.textContent = formatNumber(interpolate(startValue, parsed.value, elapsed, duration), parsed);
          rafRef.current = requestAnimationFrame(tick);
        } else {
          target.textContent = originalText;
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    const reset = () => {
      if (!replay) return;
      hasPlayedRef.current = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      target.textContent = formatNumber(startValue, parsed);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) play();
          else reset();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(target);

    return () => {
      observer.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [assigned, duration, startValue, decimalSeparator, replay]);

  return <div ref={containerRef}>{numberSlot}</div>;
};

export default NumberCount;
