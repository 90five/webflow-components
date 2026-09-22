import { useEffect, useRef } from "react";
import { enhanceTabItemDom } from "./enhanceTabItemDom";
import { getRovingIndex, type RovingKey } from "./logic";

export interface TabItemProps {
  source: Element;
  index: number;
  count: number;
  isSelected: boolean;
  isPaused: boolean;
  autoplay: boolean;
  autoplaySpeed: number;
  idPrefix: string;
  onSelect: (index: number) => void;
  registerTrigger: (index: number, el: HTMLButtonElement | null) => void;
  focusIndex: (index: number) => void;
}

const ROVING_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]);

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const TabItem = (props: TabItemProps) => {
  const { source, index, count, isSelected, isPaused, autoplay, autoplaySpeed, idPrefix, onSelect, registerTrigger, focusIndex } =
    props;
  const containerRef = useRef<HTMLDivElement>(null);
  const setSelectedRef = useRef<((selected: boolean) => void) | null>(null);
  const progressElRef = useRef<HTMLElement | null>(null);
  const animationRef = useRef<Animation | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.appendChild(source.cloneNode(true));
    const enhanced = enhanceTabItemDom(container, `${idPrefix}-tab-${index}`, `${idPrefix}-panel-${index}`, isSelected);
    if (!enhanced) return;

    setSelectedRef.current = enhanced.setSelected;
    progressElRef.current = enhanced.progressEl;
    registerTrigger(index, enhanced.trigger);

    const onClick = () => onSelect(index);
    const onKeyDown = (event: KeyboardEvent) => {
      if (!ROVING_KEYS.has(event.key)) return;
      event.preventDefault();
      focusIndex(getRovingIndex(index, event.key as RovingKey, count));
    };

    enhanced.trigger.addEventListener("click", onClick);
    enhanced.trigger.addEventListener("keydown", onKeyDown);

    return () => {
      enhanced.trigger.removeEventListener("click", onClick);
      enhanced.trigger.removeEventListener("keydown", onKeyDown);
      registerTrigger(index, null);
      // Undo the clone + enhanceTabItemDom restructuring so a re-run (StrictMode's
      // deliberate double-invoke in dev, or any real remount) starts empty instead
      // of appending a second copy alongside the first.
      container.replaceChildren();
    };
    // Only re-runs when the cloned source itself changes — index/count/idPrefix are
    // read once at clone time, isSelected's initial value only matters at clone
    // time (subsequent changes are handled by the effect below), and callbacks are
    // stable from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  useEffect(() => {
    setSelectedRef.current?.(isSelected);

    animationRef.current?.cancel();
    animationRef.current = null;

    const progressEl = progressElRef.current;
    if (!isSelected || !autoplay || !progressEl) return;

    if (prefersReducedMotion()) {
      progressEl.style.transform = "scaleX(1)";
      return () => {
        progressEl.style.transform = "scaleX(0)";
      };
    }

    const animation = progressEl.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
      duration: autoplaySpeed,
      easing: "linear",
      fill: "forwards",
    });
    if (isPaused) animation.pause();
    animationRef.current = animation;

    return () => animation.cancel();
    // isPaused intentionally excluded — handled by the effect below so pausing
    // doesn't restart the animation from zero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelected, autoplay, autoplaySpeed]);

  useEffect(() => {
    const animation = animationRef.current;
    if (!animation) return;
    if (isPaused) animation.pause();
    else animation.play();
  }, [isPaused]);

  return <div ref={containerRef} />;
};

export default TabItem;
