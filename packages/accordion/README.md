# Webflow Accordion

Two Webflow Code Components — **Accordion — CMS Collection** and **Accordion — Static Content** — sharing one engine, configurable between accordion behavior (multiple items open) and tabs-like behavior (one at a time) via props. Zero baked-in visual styling: no colors, spacing, or icon opinions — the trigger and panel are whatever you build in the Designer.

- Works with a Webflow **Collection List** (FAQ pages driven by CMS) or plain static elements — two Library entries, same engine
- `singleOpen` + `allowAllClosed` options cover both an accordion (multiple open, can close to none) and true tabs (always exactly one open) from the same component
- Panel open/close uses the CSS Grid `0fr → 1fr` technique — the only real way to animate to an unknown content height — plus an opacity fade, both respecting `prefers-reduced-motion`
- Full WAI-ARIA accordion/disclosure pattern: real `<button>` triggers, `aria-expanded`/`aria-controls`, arrow-key roving navigation between triggers, closed panels are `inert` (not just visually hidden)

## Getting started

- `pnpm install` from the repo root (this package is part of the `webflow-components` pnpm workspace)
- `pnpm --filter webflow-accordion dev` — local sandbox (`src/App.tsx`) for developing the engine itself
- `npx webflow library share` — publish this as a Code Component library to your Webflow workspace

## Setting it up in Webflow

### Accordion — CMS Collection

1. Add the component, then drop a **Collection List** into its **CMS Collection List** slot. Each collection item becomes one accordion item.
2. Inside each Collection Item's layout, give one element a Custom Attribute `data-accordion-trigger` (the question/header — whatever's in it becomes the clickable trigger) and another `data-accordion-panel` (the answer/content — shown when open).
3. Style the trigger and panel exactly like any other Webflow element. Use `[aria-expanded="true"]` on the trigger to style an open state (e.g. rotate an icon).

### Accordion — Static Content

Same idea, but drop plain elements (e.g. Div Blocks) into the **Items** slot instead of a Collection List — one direct element per item, each containing its own `data-accordion-trigger` / `data-accordion-panel` pair.

### Behavior options

| Prop | Default | Description |
| --- | --- | --- |
| `singleOpen` | `true` | Only one item open at a time (tabs-like). Turn off for a normal multi-open accordion. |
| `allowAllClosed` | `true` | Whether the open item can be closed by clicking it again, leaving nothing open. Turn **off** for true tabs behavior — exactly one item is always open. |
| `defaultOpenIndex` | `0` | Which item starts open (0-based). Use `-1` to start with everything closed (only meaningful when `allowAllClosed` is on). |

## Theming

Nothing is styled by this library. Triggers and panels keep the classes and structure you gave them in the Designer — the component only adds the interaction (click, keyboard, `aria-expanded`) and the panel's open/close animation. There's no icon rotation, color change, or spacing baked in: style `[aria-expanded="true"]` on your trigger for an open-state look (icon rotation, background, whatever you want).

## Accessibility

Follows the WAI-ARIA accordion/disclosure pattern rather than the separate Tabs pattern, even when `singleOpen` is on — a "disclosure that only allows one open" is a well-established, still-fully-accessible variant, and it avoids swapping ARIA role sets based on a prop. Each trigger is a real `<button>` (native focus, `:disabled`, Enter/Space for free) with `aria-expanded` and `aria-controls`; each panel is `role="region"` with `aria-labelledby` pointing back at its trigger.

Keyboard: Arrow Up/Down move focus between triggers (wrapping), Home/End jump to the first/last. A closed panel is marked `inert`, so its content (links, form fields) isn't reachable by Tab while hidden — not just visually clipped.

## Security

- No `innerHTML` anywhere in the library — content is only ever cloned real DOM nodes (from Webflow's own rendered CMS collection or static elements) or manipulated via DOM APIs, never parsed from a string.
- The component only reads and restructures the DOM inside its own slot content. No network requests, no external calls, nothing stored.

## Browser support

Any evergreen browser. Uses native Shadow DOM `<slot>` support (for reading Designer-authored content out of the slots), the CSS Grid `fr` unit, and the `inert` attribute — all baseline in evergreen browsers.

## Development

```
pnpm install   # from the repo root
pnpm --filter webflow-accordion dev      # sandbox for the engine (src/App.tsx)
pnpm --filter webflow-accordion lint
pnpm --filter webflow-accordion test
pnpm --filter webflow-accordion build     # tsc --noEmit && vite build
```

The open/close state machine (single vs. multi-open, the allow-all-closed rule) and keyboard roving-index math are unit tested directly. The DOM enhancement that wraps a cloned item's trigger/panel — and the Slot extraction CMS/Static content relies on — are both tested against real jsdom-rendered DOM and real Shadow DOM slot distribution, not mocks. `AccordionItem` also has a regression test that renders it under React StrictMode's deliberate double-invoke, which is what caught (and now guards against) a real duplicate-content bug found while building this component.

## License

MIT
