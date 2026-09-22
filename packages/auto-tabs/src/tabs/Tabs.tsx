import { useCallback, useEffect, useRef, useState } from "react";
import { PausableTimer } from "./PausableTimer";
import TabItem from "./TabItem";
import { clampIndex, getNextIndex } from "./logic";
import { TABS_STYLES } from "./styles";
import { useRovingTriggers } from "./useRovingTriggers";

export interface TabsProps {
  items: Element[];
  autoplay: boolean;
  autoplaySpeed: number;
  defaultActiveIndex: number;
  ariaLabel?: string;
}

let instanceCounter = 0;

const Tabs = (props: TabsProps) => {
  const { items, autoplay, autoplaySpeed, defaultActiveIndex, ariaLabel = "Tabs" } = props;
  const [idPrefix] = useState(() => `wft-${++instanceCounter}`);
  const [activeIndex, setActiveIndex] = useState(() => clampIndex(defaultActiveIndex, items.length || 1));
  const [isPaused, setIsPaused] = useState(false);
  const { register, focusIndex } = useRovingTriggers();
  const containerRef = useRef<HTMLDivElement>(null);

  // items arrive asynchronously for CMS/Static content (Slot extraction runs
  // in an effect) — reclamp once the real count is known, once.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current || items.length === 0) return;
    initializedRef.current = true;
    setActiveIndex(clampIndex(defaultActiveIndex, items.length));
  }, [items.length, defaultActiveIndex]);

  const handleSelect = useCallback((index: number) => setActiveIndex(index), []);

  // Automatic-activation model: moving roving focus also activates the tab.
  const handleRoveFocus = useCallback(
    (index: number) => {
      focusIndex(index);
      setActiveIndex(index);
    },
    [focusIndex],
  );

  // Auto-advance timer — a fresh one per activation, so switching tabs (by
  // click or keyboard) always gives the new tab the full duration.
  const timerRef = useRef<PausableTimer | null>(null);
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    if (!autoplay || items.length <= 1) return;
    const timer = new PausableTimer(autoplaySpeed, () => {
      setActiveIndex((current) => getNextIndex(current, items.length));
    });
    timerRef.current = timer;
    timer.start();
    if (isPausedRef.current) timer.pause();
    return () => timer.cancel();
  }, [activeIndex, autoplay, autoplaySpeed, items.length]);

  useEffect(() => {
    if (isPaused) timerRef.current?.pause();
    else timerRef.current?.resume();
  }, [isPaused]);

  // Pause on hover, focus-within, or the tab going hidden — same policy as
  // the slider's autoplay.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !autoplay) return;

    const pause = () => setIsPaused(true);
    const resume = () => setIsPaused(false);
    const onVisibilityChange = () => (document.hidden ? pause() : resume());

    container.addEventListener("pointerenter", pause);
    container.addEventListener("pointerleave", resume);
    container.addEventListener("focusin", pause);
    container.addEventListener("focusout", resume);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      container.removeEventListener("pointerenter", pause);
      container.removeEventListener("pointerleave", resume);
      container.removeEventListener("focusin", pause);
      container.removeEventListener("focusout", resume);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [autoplay]);

  return (
    <div ref={containerRef} role="tablist" aria-label={ariaLabel}>
      <style>{TABS_STYLES}</style>
      {items.map((item, index) => (
        <TabItem
          key={index}
          source={item}
          index={index}
          count={items.length}
          isSelected={activeIndex === index}
          isPaused={isPaused}
          autoplay={autoplay}
          autoplaySpeed={autoplaySpeed}
          idPrefix={idPrefix}
          onSelect={handleSelect}
          registerTrigger={register}
          focusIndex={handleRoveFocus}
        />
      ))}
    </div>
  );
};

export default Tabs;
