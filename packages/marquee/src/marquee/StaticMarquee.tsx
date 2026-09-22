import type { ReactNode } from "react";
import Marquee from "./Marquee";
import { useAssignedSlotContent } from "./useAssignedSlotContent";

const ITEMS_SLOT_NAME = "itemsSlot";

export interface StaticMarqueeProps {
  itemsSlot: ReactNode;
  showItemsComponent: boolean;
  speed: number;
  direction: string;
  pauseOnHover: boolean;
  gap: number;
  fadeEdges: boolean;
}

const StaticMarquee = (props: StaticMarqueeProps) => {
  const { itemsSlot, showItemsComponent, ...marqueeProps } = props;
  const { containerRef, assigned } = useAssignedSlotContent(ITEMS_SLOT_NAME);
  const items = assigned ?? [];

  return (
    <div>
      <div ref={containerRef} style={{ display: showItemsComponent ? "block" : "none" }}>
        {itemsSlot}
      </div>
      <Marquee {...marqueeProps} items={items} ariaLabel="Marquee" />
    </div>
  );
};

export default StaticMarquee;
