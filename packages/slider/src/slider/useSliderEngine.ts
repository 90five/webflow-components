import { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import type { EmblaOptionsType } from "embla-carousel";
import { getLoopEnabled, sanitizeAutoplayDelay } from "./logic";

export interface SliderEngineOptions {
  loop: boolean;
  autoplay: boolean;
  autoplaySpeed: number;
  slideCount: number;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export function useSliderEngine({ loop, autoplay, autoplaySpeed, slideCount }: SliderEngineOptions) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const loopEnabled = getLoopEnabled(loop, slideCount);

  const autoplayPlugin = useMemo(
    () =>
      Autoplay({
        delay: sanitizeAutoplayDelay(autoplaySpeed),
        stopOnMouseEnter: true,
        stopOnFocusIn: true,
        stopOnInteraction: false,
      }),
    [autoplaySpeed],
  );

  const emblaOptions = useMemo<EmblaOptionsType>(
    () => ({
      loop: loopEnabled,
      containScroll: loopEnabled ? false : "trimSnaps",
      ...(prefersReducedMotion ? { duration: 0 } : {}),
    }),
    [loopEnabled, prefersReducedMotion],
  );

  const plugins = useMemo(() => (autoplay ? [autoplayPlugin] : []), [autoplay, autoplayPlugin]);

  const [viewportRef, emblaApi] = useEmblaCarousel(emblaOptions, plugins);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };
    const onReInit = () => {
      setScrollSnaps(emblaApi.scrollSnapList());
      onSelect();
    };

    onReInit();
    emblaApi.on("select", onSelect).on("reInit", onReInit);

    return () => {
      emblaApi.off("select", onSelect).off("reInit", onReInit);
    };
  }, [emblaApi]);

  useEffect(() => {
    const plugin = emblaApi?.plugins().autoplay;
    if (!plugin) return;

    const onVisibilityChange = () => (document.hidden ? plugin.stop() : plugin.play());
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  return { viewportRef, selectedIndex, scrollSnaps, canScrollPrev, canScrollNext, scrollPrev, scrollNext, scrollTo };
}
