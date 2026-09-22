import type { ReactNode } from "react";
import Accordion from "./Accordion";
import { useCollectionItems } from "./useCollectionItems";

export interface CMSAccordionProps {
  cmsCollectionComponentSlot: ReactNode;
  showCMSCollectionComponent: boolean;
  singleOpen: boolean;
  allowAllClosed: boolean;
  defaultOpenIndex: number;
}

const CMSAccordion = (props: CMSAccordionProps) => {
  const { cmsCollectionComponentSlot, showCMSCollectionComponent, ...accordionProps } = props;
  const { containerRef, items } = useCollectionItems();

  return (
    <div>
      <div ref={containerRef} style={{ display: showCMSCollectionComponent ? "block" : "none" }}>
        {cmsCollectionComponentSlot}
      </div>
      <Accordion {...accordionProps} items={items} ariaLabel="CMS accordion" />
    </div>
  );
};

export default CMSAccordion;
