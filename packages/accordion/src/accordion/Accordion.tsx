import { useCallback, useEffect, useRef, useState } from "react";
import AccordionItem from "./AccordionItem";
import { getInitialOpenIndexes, toggleOpenIndexes } from "./logic";
import { ACCORDION_STYLES } from "./styles";
import { useRovingTriggers } from "./useRovingTriggers";

export interface AccordionProps {
  items: Element[];
  singleOpen: boolean;
  allowAllClosed: boolean;
  defaultOpenIndex: number;
  ariaLabel?: string;
}

let instanceCounter = 0;

const Accordion = (props: AccordionProps) => {
  const { items, singleOpen, allowAllClosed, defaultOpenIndex, ariaLabel = "Accordion" } = props;
  const [idPrefix] = useState(() => `wfa-${++instanceCounter}`);
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(() => new Set());
  const { register, focusIndex } = useRovingTriggers();

  // items arrive asynchronously (Slot extraction runs in an effect, see
  // useAssignedSlotContent) — the initial-open computation has to wait for
  // the real item count instead of running against an empty array at mount.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current || items.length === 0) return;
    initializedRef.current = true;
    setOpenIndexes(getInitialOpenIndexes(defaultOpenIndex, items.length));
  }, [items.length, defaultOpenIndex]);

  const handleToggle = useCallback(
    (index: number) => {
      setOpenIndexes((current) => toggleOpenIndexes(current, index, { singleOpen, allowAllClosed }));
    },
    [singleOpen, allowAllClosed],
  );

  return (
    <div role="group" aria-label={ariaLabel}>
      <style>{ACCORDION_STYLES}</style>
      {items.map((item, index) => (
        <AccordionItem
          key={index}
          source={item}
          index={index}
          count={items.length}
          isOpen={openIndexes.has(index)}
          panelIdPrefix={idPrefix}
          onToggle={handleToggle}
          registerTrigger={register}
          focusIndex={focusIndex}
        />
      ))}
    </div>
  );
};

export default Accordion;
