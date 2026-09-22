# Webflow Marquee

Two Webflow Code Components — **Marquee — CMS Collection** and **Marquee — Static Content** — for a seamless, infinitely-looping scroll: logo strips, testimonial tickers, announcement bars. Zero baked-in visual styling.

- Works with a Webflow **Collection List** or plain static elements — two Library entries, same engine
- The scroll itself is a plain CSS `@keyframes` animation — linear easing (Emil's own rule: constant motion like a marquee gets `linear`, never an eased curve), transform-only, off the main thread. The only JS involved is measuring how wide one pass of your content actually is, so the loop distance is exact
- Genuinely seamless at any item count or viewport width — it measures your content and adds exactly as many duplicate passes as needed to avoid a gap, rather than assuming two copies is always enough
- Pause on hover, either direction, `prefers-reduced-motion` aware (stops moving entirely — continuous, unprompted motion is exactly what that setting exists to suppress)
- Duplicate passes (everything after the first) are `aria-hidden` and `inert`, so screen readers and keyboard users see your content once, not N times

## Getting started

- `pnpm install` from the repo root (this package is part of the `webflow-components` pnpm workspace)
- `pnpm --filter webflow-marquee dev` — local sandbox (`src/App.tsx`) for developing the engine itself
- `npx webflow library share` — publish this as a Code Component library to your Webflow workspace

## Setting it up in Webflow

### Marquee — CMS Collection

1. Add the component, then drop a **Collection List** into its **CMS Collection List** slot. Each collection item becomes one piece of the marquee.
2. Style the Collection List item exactly like you would anywhere else in Webflow.

### Marquee — Static Content

Same idea, but drop plain elements (e.g. logo Images) into the **Items** slot instead of a Collection List — one direct element per item.

## Options

| Prop | Default | Description |
| --- | --- | --- |
| `speed` | `60` | Scroll speed in pixels per second. This is speed, not a fixed duration — visual speed stays constant whether you have 3 items or 30. |
| `direction` | `"left"` | `"left"` or `"right"`. |
| `pauseOnHover` | `true` | Pause the scroll while the pointer is over it. |
| `gap` | `24` | Space between items, in px — and between each loop of the set, so the wrap has the same rhythm as the rest. |
| `fadeEdges` | `false` | Fade content out at the left/right edges instead of a hard clip (a CSS `mask-image`). Not achievable with plain Webflow classes, which is why it's a toggle here rather than left to your own CSS. |

## Theming

Nothing is styled by this library beyond the mechanics described above (the scroll animation, and optionally the edge fade). Style your items exactly like you would anywhere else in Webflow.

## Accessibility

The marquee's content is duplicated in the DOM purely to make the visual loop seamless — without hiding those duplicates, a screen reader would read the same logos or testimonials over and over, and keyboard users could tab through repeated copies of the same links. Every pass after the first is `aria-hidden="true"` and `inert`, so assistive tech and the keyboard only ever encounter your content once. The viewport itself is `role="region"` with a label. `prefers-reduced-motion: reduce` stops the scroll entirely rather than just slowing it down.

## Security

- No `innerHTML` anywhere in the library — content is only ever cloned real DOM nodes (from Webflow's own rendered CMS collection or static elements), never parsed from a string.
- The component only reads and clones the DOM inside its own slot content, and measures element geometry to size the loop. No network requests, no external calls, nothing stored.

## Browser support

Any evergreen browser. Uses native Shadow DOM `<slot>` support, `ResizeObserver`, and CSS `mask-image` (only relevant if you turn on `fadeEdges` — browsers without mask support just show a hard edge instead, no breakage).

## Development

```
pnpm install   # from the repo root
pnpm --filter webflow-marquee dev      # sandbox for the engine (src/App.tsx)
pnpm --filter webflow-marquee lint
pnpm --filter webflow-marquee test
pnpm --filter webflow-marquee build     # tsc --noEmit && vite build
```

The copy-count and duration math (how many passes are needed to avoid a gap, how the configured speed translates to an animation duration) is unit tested directly. `getBoundingClientRect` doesn't do real layout in jsdom, so the actual measurement/scaling behavior — confirmed working with as few as 2 items in a wide viewport, where it correctly renders more than the minimum 2 passes — was verified in a real browser rather than faked in a unit test. The accessibility wiring (aria-hidden/inert on duplicate passes) and a React-StrictMode double-invoke regression test are both covered against real jsdom-rendered DOM.

## License

MIT
