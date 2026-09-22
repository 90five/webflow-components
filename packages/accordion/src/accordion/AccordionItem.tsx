import { useEffect, useRef } from "react";
import { enhanceItemDom } from "./enhanceItemDom";
import { getRovingIndex, type RovingKey } from "./logic";

export interface AccordionItemProps {
  source: Element;
  index: number;
  count: number;
  isOpen: boolean;
  panelIdPrefix: string;
  onToggle: (index: number) => void;
  registerTrigger: (index: number, el: HTMLButtonElement | null) => void;
  focusIndex: (index: number) => void;
}

const ROVING_KEYS = new Set(["ArrowUp", "ArrowDown", "Home", "End"]);

const AccordionItem = (props: AccordionItemProps) => {
  const { source, index, count, isOpen, panelIdPrefix, onToggle, registerTrigger, focusIndex } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const setOpenRef = useRef<((open: boolean) => void) | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.appendChild(source.cloneNode(true));
    const enhanced = enhanceItemDom(container, `${panelIdPrefix}-${index}`, isOpen);
    if (!enhanced) return;

    setOpenRef.current = enhanced.setOpen;
    registerTrigger(index, enhanced.trigger);

    const onClick = () => onToggle(index);
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
      // Undo the clone + enhanceItemDom restructuring so a re-run (StrictMode's
      // deliberate double-invoke in dev, or any real remount) starts from an
      // empty container instead of appending a second copy alongside the first.
      container.replaceChildren();
    };
    // Intentionally only re-runs when the cloned source itself changes — index/count/isOpen
    // (initial) are read once at clone time, and callbacks are stable from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  useEffect(() => {
    setOpenRef.current?.(isOpen);
  }, [isOpen]);

  return <div ref={containerRef} />;
};

export default AccordionItem;
