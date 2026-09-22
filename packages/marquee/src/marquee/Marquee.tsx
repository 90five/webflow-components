import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import ClonedElement from "./ClonedElement";
import { computeCopyCount, computeDurationSeconds } from "./logic";
import { MARQUEE_STYLES } from "./styles";

export interface MarqueeProps {
  items: Element[];
  speed: number;
  direction: string;
  pauseOnHover: boolean;
  gap: number;
  fadeEdges: boolean;
  ariaLabel?: string;
}

const INITIAL_COPIES = 2;

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const Marquee = (props: MarqueeProps) => {
  const { items, speed, direction, pauseOnHover, gap, fadeEdges, ariaLabel = "Marquee" } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const setRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [copies, setCopies] = useState(INITIAL_COPIES);
  const [distancePx, setDistancePx] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const firstSet = setRefs.current[0];
    const secondSet = setRefs.current[1];
    if (!container || !firstSet || !secondSet || items.length === 0) return;

    const measure = () => {
      // The gap between sets is baked into this delta already (it's the
      // distance from one set's start to the next, not either set's own
      // width), so the loop wraps with the exact same rhythm as the gaps
      // between items inside a set.
      const delta = secondSet.getBoundingClientRect().left - firstSet.getBoundingClientRect().left;
      if (delta <= 0) return;
      const containerWidth = container.getBoundingClientRect().width;
      setDistancePx(delta);
      setCopies((current) => {
        const needed = computeCopyCount(delta, containerWidth);
        return needed === current ? current : needed;
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [items, gap]);

  const durationSeconds = computeDurationSeconds(distancePx, speed);
  const reduced = prefersReducedMotion();

  const trackStyle = {
    "--wfm-distance": `${distancePx}px`,
    "--wfm-gap": `${gap}px`,
    ...(reduced || durationSeconds <= 0 ? {} : { animationDuration: `${durationSeconds}s` }),
  } as CSSProperties;

  return (
    <div
      ref={containerRef}
      className="wfm-viewport"
      role="region"
      aria-label={ariaLabel}
      data-fade-edges={fadeEdges || undefined}
      data-pause-on-hover={pauseOnHover || undefined}
    >
      <style>{MARQUEE_STYLES}</style>
      <div className="wfm-track" data-direction={direction === "right" ? "right" : "left"} style={trackStyle}>
        {Array.from({ length: copies }).map((_, setIndex) => (
          <div
            key={setIndex}
            className="wfm-set"
            ref={(el) => {
              setRefs.current[setIndex] = el;
            }}
            aria-hidden={setIndex === 0 ? undefined : true}
            inert={setIndex !== 0}
          >
            {items.map((item, itemIndex) => (
              <ClonedElement key={itemIndex} source={item} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Marquee;
