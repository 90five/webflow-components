import { useEffect, useRef } from "react";

/** Renders a clone of a real DOM node extracted from a slot (see useAssignedSlotContent). */
const ClonedElement = ({ source }: { source: Element }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    container.appendChild(source.cloneNode(true));
    // Undo the append on cleanup so a re-run (StrictMode's deliberate double-invoke
    // in dev, or a real remount if `source` changes) doesn't leave a stale copy
    // alongside the new one.
    return () => container.replaceChildren();
  }, [source]);

  return <div ref={ref} />;
};

export default ClonedElement;
