import type { ReactNode } from "react";
import Marquee from "./Marquee";
import { useCollectionItems } from "./useCollectionItems";

export interface CMSMarqueeProps {
  cmsCollectionComponentSlot: ReactNode;
  showCMSCollectionComponent: boolean;
  speed: number;
  direction: string;
  pauseOnHover: boolean;
  gap: number;
  fadeEdges: boolean;
}

const CMSMarquee = (props: CMSMarqueeProps) => {
  const { cmsCollectionComponentSlot, showCMSCollectionComponent, ...marqueeProps } = props;
  const { containerRef, items } = useCollectionItems();

  return (
    <div>
      <div ref={containerRef} style={{ display: showCMSCollectionComponent ? "block" : "none" }}>
        {cmsCollectionComponentSlot}
      </div>
      <Marquee {...marqueeProps} items={items} ariaLabel="CMS marquee" />
    </div>
  );
};

export default CMSMarquee;
