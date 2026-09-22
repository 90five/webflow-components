// Structural CSS only — no color, spacing-scale, or typography opinions.
// Rendered as an inline <style> inside the component's own subtree so it
// reaches inside the shadow root Webflow renders Code Components into,
// instead of depending on a global stylesheet from the host document.
export const TABS_STYLES = `
.wft-trigger {
  all: unset;
  display: block;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
}

.wft-trigger:active {
  transform: scale(0.99);
}

[data-tab-progress] {
  transform-origin: left;
  transform: scaleX(0);
}

.wft-panel {
  opacity: 1;
  transition: opacity 200ms ease-out;
}

.wft-panel[hidden] {
  display: none;
  opacity: 0;
  transition:
    opacity 150ms ease-out,
    display 150ms allow-discrete;
}

@starting-style {
  .wft-panel:not([hidden]) {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wft-trigger,
  .wft-panel {
    transition: none;
  }
}
`;
