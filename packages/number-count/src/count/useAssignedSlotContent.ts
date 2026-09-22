import { useEffect, useRef, useState } from "react";

/**
 * Webflow Slot props render as a native Shadow DOM <slot>. Reading its
 * assignedElements() is how you get at the real, Designer-authored DOM nodes —
 * needed whenever content from a slot has to be cloned into multiple places
 * (a same-named <slot> only ever distributes its assignment to the first
 * instance of itself in the tree, so re-rendering the slot prop directly
 * would leave every other instance empty).
 */
export function queryAssignedElements(container: Element, slotName: string): Element[] | null {
  const slot = container.querySelector(`[name="${slotName}"]`) as HTMLSlotElement | null;
  const elements = slot?.assignedElements();
  return elements && elements.length > 0 ? elements : null;
}

export function useAssignedSlotContent(slotName: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [assigned, setAssigned] = useState<Element[] | null>(null);

  useEffect(() => {
    if (assigned !== null || !containerRef.current) return;
    const elements = queryAssignedElements(containerRef.current, slotName);
    if (elements) setAssigned(elements);
  }, [assigned, slotName]);

  return { containerRef, assigned };
}
