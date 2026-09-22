// Structural CSS only — no color, spacing-scale, or typography opinions.
// Rendered as an inline <style> inside the component's own subtree so it
// reaches inside the shadow root Webflow renders Code Components into,
// instead of depending on a global stylesheet from the host document.
export const ACCORDION_STYLES = `
.wfa-trigger {
  all: unset;
  display: block;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
}

.wfa-trigger:active {
  transform: scale(0.99);
}

.wfa-panel-track {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 250ms cubic-bezier(0.65, 0, 0.35, 1);
}

.wfa-panel-track[data-open="true"] {
  grid-template-rows: 1fr;
}

.wfa-panel-inner {
  overflow: hidden;
  min-height: 0;
  opacity: 0;
  transition: opacity 200ms ease;
}

.wfa-panel-track[data-open="true"] .wfa-panel-inner {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .wfa-trigger,
  .wfa-panel-track,
  .wfa-panel-inner {
    transition: none;
  }
}
`;
