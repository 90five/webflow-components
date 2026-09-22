import type { CSSProperties, ReactNode } from "react";
import ClonedElement from "./ClonedElement";
import { formatSlideLabel, sanitizeCount, sanitizeGap } from "./logic";
import { SLIDER_STYLES } from "./styles";
import { useDotTemplate } from "./useDotTemplate";
import { useSliderEngine } from "./useSliderEngine";

export interface SliderProps {
  slides: ReactNode[];
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
  ariaLabel?: string;
}

const Slider = (props: SliderProps) => {
  const {
    slides,
    loop,
    autoplay,
    autoplaySpeed,
    prevButtonSlot,
    nextButtonSlot,
    dotTemplateSlot,
    ariaLabel = "Slider",
  } = props;

  const { viewportRef, selectedIndex, scrollSnaps, canScrollPrev, canScrollNext, scrollPrev, scrollNext, scrollTo } =
    useSliderEngine({ loop, autoplay, autoplaySpeed, slideCount: slides.length });
  const { containerRef: dotTemplateRef, template: dotTemplate } = useDotTemplate();

  const viewportStyle = {
    "--wfs-slides-desktop": sanitizeCount(props.slidesPerViewDesktop, 1),
    "--wfs-slides-tablet": sanitizeCount(props.slidesPerViewTablet, 1),
    "--wfs-slides-mobile": sanitizeCount(props.slidesPerViewMobile, 1),
    "--wfs-gap-desktop": `${sanitizeGap(props.gapDesktop, 0)}px`,
    "--wfs-gap-tablet": `${sanitizeGap(props.gapTablet, 0)}px`,
    "--wfs-gap-mobile": `${sanitizeGap(props.gapMobile, 0)}px`,
  } as CSSProperties;

  return (
    <div>
      <style>{SLIDER_STYLES}</style>

      <div className="wfs-viewport" ref={viewportRef} style={viewportStyle} role="region" aria-roledescription="carousel" aria-label={ariaLabel}>
        <div className="wfs-track">
          {slides.map((slide, index) => (
            <div className="wfs-slide" role="group" aria-roledescription="slide" aria-label={formatSlideLabel(index, slides.length)} key={index}>
              {slide}
            </div>
          ))}
        </div>
      </div>

      {prevButtonSlot && (
        <button type="button" onClick={scrollPrev} disabled={!canScrollPrev} aria-label="Previous slide">
          {prevButtonSlot}
        </button>
      )}
      {nextButtonSlot && (
        <button type="button" onClick={scrollNext} disabled={!canScrollNext} aria-label="Next slide">
          {nextButtonSlot}
        </button>
      )}

      {dotTemplateSlot && (
        <div ref={dotTemplateRef} style={{ display: "none" }}>
          {dotTemplateSlot}
        </div>
      )}
      {dotTemplate && scrollSnaps.length > 1 && (
        <div role="group" aria-label="Slide navigation">
          {scrollSnaps.map((_, index) => (
            <button
              type="button"
              key={index}
              onClick={() => scrollTo(index)}
              aria-current={index === selectedIndex}
              aria-label={`Go to slide ${index + 1}`}
            >
              <ClonedElement source={dotTemplate} />
            </button>
          ))}
        </div>
      )}

      <div className="wfs-visually-hidden" aria-live="polite" aria-atomic="true">
        {formatSlideLabel(selectedIndex, slides.length)}
      </div>
    </div>
  );
};

export default Slider;
