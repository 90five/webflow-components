import type { ReactNode } from "react";
import Tabs from "./Tabs";
import { useAssignedSlotContent } from "./useAssignedSlotContent";

const ITEMS_SLOT_NAME = "itemsSlot";

export interface StaticTabsProps {
  itemsSlot: ReactNode;
  showItemsComponent: boolean;
  autoplay: boolean;
  autoplaySpeed: number;
  defaultActiveIndex: number;
}

const StaticTabs = (props: StaticTabsProps) => {
  const { itemsSlot, showItemsComponent, ...tabsProps } = props;
  const { containerRef, assigned } = useAssignedSlotContent(ITEMS_SLOT_NAME);
  const items = assigned ?? [];

  return (
    <div>
      <div ref={containerRef} style={{ display: showItemsComponent ? "block" : "none" }}>
        {itemsSlot}
      </div>
      <Tabs {...tabsProps} items={items} ariaLabel="Tabs" />
    </div>
  );
};

export default StaticTabs;
