import type { ReactNode } from "react";
import ClonedElement from "./ClonedElement";
import Slider from "./Slider";
import { useAssignedSlotContent } from "./useAssignedSlotContent";

const SLIDES_SLOT_NAME = "slidesSlot";

export interface StaticSliderProps {
  slidesSlot: ReactNode;
  showSlidesComponent: boolean;
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

const StaticSlider = (props: StaticSliderProps) => {
  const { slidesSlot, showSlidesComponent, ...sliderProps } = props;
  const { containerRef, assigned } = useAssignedSlotContent(SLIDES_SLOT_NAME);
  const slides = assigned ?? [];

  return (
    <div>
      <div ref={containerRef} style={{ display: showSlidesComponent ? "block" : "none" }}>
        {slidesSlot}
      </div>
      <Slider {...sliderProps} slides={slides.map((item, index) => <ClonedElement key={index} source={item} />)} ariaLabel="Slider" />
    </div>
  );
};

export default StaticSlider;
