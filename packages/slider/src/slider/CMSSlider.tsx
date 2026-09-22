import type { ReactNode } from "react";
import ClonedElement from "./ClonedElement";
import Slider from "./Slider";
import { useCMSCollectionItems } from "./useCMSCollectionItems";

export interface CMSSliderProps {
  cmsCollectionComponentSlot: ReactNode;
  showCMSCollectionComponent: boolean;
  loop: boolean;
  autoplay: boolean;
  autoplaySpeed: number;
  slidesPerViewDesktop: number;
  slidesPerViewTablet: number;
  slidesPerViewMobile: number;
  gapDesktop: number;
  gapTablet: number;
  gapMobile: number;
  prevButtonSlot?: ReactNode;
  nextButtonSlot?: ReactNode;
  dotTemplateSlot?: ReactNode;
}

const CMSSlider = (props: CMSSliderProps) => {
  const { cmsCollectionComponentSlot, showCMSCollectionComponent, ...sliderProps } = props;
  const { containerRef, items } = useCMSCollectionItems();

  return (
    <div>
      <div ref={containerRef} style={{ display: showCMSCollectionComponent ? "block" : "none" }}>
        {cmsCollectionComponentSlot}
      </div>
      <Slider {...sliderProps} slides={items.map((item, index) => <ClonedElement key={index} source={item} />)} ariaLabel="CMS slider" />
    </div>
  );
};

export default CMSSlider;
