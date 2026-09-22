// Structural CSS only — no color, spacing-scale, or typography opinions.
// Rendered as an inline <style> inside the component's own subtree (see Slider.tsx)
// so it reaches inside the shadow root Webflow renders Code Components into,
// instead of depending on a global stylesheet from the host document.
export const SLIDER_STYLES = `
.wfs-viewport {
  position: relative;
  overflow: hidden;
  --wfs-slides: var(--wfs-slides-desktop, 1);
  --wfs-gap: var(--wfs-gap-desktop, 0px);
}

@media (max-width: 991px) {
  .wfs-viewport {
    --wfs-slides: var(--wfs-slides-tablet, var(--wfs-slides-desktop, 1));
    --wfs-gap: var(--wfs-gap-tablet, var(--wfs-gap-desktop, 0px));
  }
}

@media (max-width: 767px) {
  .wfs-viewport {
    --wfs-slides: var(--wfs-slides-mobile, var(--wfs-slides-tablet, var(--wfs-slides-desktop, 1)));
    --wfs-gap: var(--wfs-gap-mobile, var(--wfs-gap-tablet, var(--wfs-gap-desktop, 0px)));
  }
}

.wfs-track {
  display: flex;
  gap: var(--wfs-gap);
  touch-action: pan-y pinch-zoom;
  cursor: grab;
  user-select: none;
}

.wfs-track:active {
  cursor: grabbing;
}

.wfs-slide {
  flex: 0 0 calc((100% - (var(--wfs-slides) - 1) * var(--wfs-gap)) / var(--wfs-slides));
  min-width: 0;
}

.wfs-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`;
