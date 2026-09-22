import type { ReactNode } from "react";
import Tabs from "./Tabs";
import { useCollectionItems } from "./useCollectionItems";

export interface CMSTabsProps {
  cmsCollectionComponentSlot: ReactNode;
  showCMSCollectionComponent: boolean;
  autoplay: boolean;
  autoplaySpeed: number;
  defaultActiveIndex: number;
}

const CMSTabs = (props: CMSTabsProps) => {
  const { cmsCollectionComponentSlot, showCMSCollectionComponent, ...tabsProps } = props;
  const { containerRef, items } = useCollectionItems();

  return (
    <div>
      <div ref={containerRef} style={{ display: showCMSCollectionComponent ? "block" : "none" }}>
        {cmsCollectionComponentSlot}
      </div>
      <Tabs {...tabsProps} items={items} ariaLabel="CMS tabs" />
    </div>
  );
};

export default CMSTabs;
