import type { ReactNode } from "react";
import Accordion from "./Accordion";
import { useAssignedSlotContent } from "./useAssignedSlotContent";

const ITEMS_SLOT_NAME = "itemsSlot";

export interface StaticAccordionProps {
  itemsSlot: ReactNode;
  showItemsComponent: boolean;
  singleOpen: boolean;
  allowAllClosed: boolean;
  defaultOpenIndex: number;
}

const StaticAccordion = (props: StaticAccordionProps) => {
  const { itemsSlot, showItemsComponent, ...accordionProps } = props;
  const { containerRef, assigned } = useAssignedSlotContent(ITEMS_SLOT_NAME);
  const items = assigned ?? [];

  return (
    <div>
      <div ref={containerRef} style={{ display: showItemsComponent ? "block" : "none" }}>
        {itemsSlot}
      </div>
      <Accordion {...accordionProps} items={items} ariaLabel="Accordion" />
    </div>
  );
};

export default StaticAccordion;
