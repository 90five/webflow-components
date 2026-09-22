// Structural CSS only — no color, spacing-scale, or typography opinions.
// Rendered as an inline <style> inside the component's own subtree so it
// reaches inside the shadow root Webflow renders Code Components into,
// instead of depending on a global stylesheet from the host document.
//
// The scroll itself is a plain CSS @keyframes animation (Emil's rule:
// constant motion like a marquee gets linear easing, and CSS animations
// stay off the main thread — no per-frame JS driving this). The only JS
// involved is measuring how far one item set spans, so the loop distance
// is exact and the wrap is invisible regardless of item count or gap.
export const MARQUEE_STYLES = `
.wfm-viewport {
  overflow: hidden;
}

.wfm-viewport[data-fade-edges="true"] {
  mask-image: linear-gradient(to right, transparent, black 64px, black calc(100% - 64px), transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, black 64px, black calc(100% - 64px), transparent);
}

.wfm-track {
  display: flex;
  width: max-content;
  gap: var(--wfm-gap, 0px);
  animation-name: wfm-scroll;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.wfm-track[data-direction="right"] {
  animation-direction: reverse;
}

.wfm-viewport[data-pause-on-hover="true"]:hover .wfm-track {
  animation-play-state: paused;
}

.wfm-set {
  display: flex;
  flex-shrink: 0;
  gap: var(--wfm-gap, 0px);
}

@keyframes wfm-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(calc(-1 * var(--wfm-distance, 0px)));
  }
}

@media (prefers-reduced-motion: reduce) {
  .wfm-track {
    animation: none;
  }
}
`;
