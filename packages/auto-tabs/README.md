# Webflow Auto Tabs

Two Webflow Code Components — **Auto Tabs — CMS Collection** and **Auto Tabs — Static Content** — for the "auto-advancing showcase tabs" pattern: a row of tabs that cycles through itself on a timer, each with an optional progress-fill indicator, pausing on hover/focus so visitors can actually read. Zero baked-in visual styling — no colors, spacing, or progress-bar look shipped, all of it is your own Designer elements.

- Works with a Webflow **Collection List** or plain static elements — two Library entries, same engine
- Real WAI-ARIA Tabs pattern: `role="tablist"/"tab"/"tabpanel"`, roving tabindex, automatic activation on arrow-key focus
- Autoplay pauses on hover, focus, and when the browser tab is hidden — and resumes with the *remaining* time, not a fresh full duration
- An optional per-tab progress element animates in perfect sync with the actual advance timer (not a separate approximation) — pausing the timer pauses the animation and vice versa
- Panel switch uses a real WAI-ARIA Tabs crossfade (`@starting-style`, same technique as `webflow-datepicker`'s calendar), `prefers-reduced-motion` aware

## Getting started

- `pnpm install` from the repo root (this package is part of the `webflow-components` pnpm workspace)
- `pnpm --filter webflow-auto-tabs dev` — local sandbox (`src/App.tsx`) for developing the engine itself
- `npx webflow library share` — publish this as a Code Component library to your Webflow workspace

## Setting it up in Webflow

### Auto Tabs — CMS Collection

1. Add the component, then drop a **Collection List** into its **CMS Collection List** slot. Each collection item becomes one tab.
2. Inside each Collection Item's layout, give one element a Custom Attribute `data-tab-trigger` (the tab label — whatever's in it becomes the clickable trigger) and another `data-tab-panel` (the content shown when that tab is active).
3. Optional: inside the trigger, add one more element with `data-tab-progress` — a thin bar, underline, whatever you want. It fills left-to-right over the autoplay duration and resets on every tab switch. No progress element, no problem — the tabs still advance, there's just nothing to show for it.
4. Style the trigger's `[aria-selected="true"]` state and the panel/progress elements however you like.

### Auto Tabs — Static Content

Same idea, but drop plain elements (e.g. Div Blocks) into the **Items** slot instead of a Collection List — one direct element per tab, each with its own `data-tab-trigger` / `data-tab-panel` (and optional `data-tab-progress`).

### Behavior options

| Prop | Default | Description |
| --- | --- | --- |
| `autoplay` | `true` | Automatically advance through tabs. |
| `autoplaySpeed` | `5000` | How long each tab stays active before advancing, in ms. |
| `defaultActiveIndex` | `0` | Which tab starts active (0-based). |

## Theming

Nothing is styled by this library. The trigger and panel keep the classes and structure you gave them — the component only adds the interaction (click, keyboard, autoplay, `aria-selected`) and the two small animations described above. Style the active-tab look via `[aria-selected="true"]` on your trigger.

## Accessibility

Implements the actual [WAI-ARIA Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) (not the Accordion/disclosure pattern used by `webflow-accordion` — this component is always exactly one tab active, which is what Tabs actually is): `role="tablist"` on the container, `role="tab"` + `aria-selected` + `aria-controls` on each trigger, `role="tabpanel"` + `aria-labelledby` on each panel. Roving tabindex — only the active tab is in normal Tab order, arrow keys move between the others. Automatic activation: moving focus with the arrow keys also switches the active tab (matches the "showcase" mental model better than requiring a separate Enter/Space press). Autoplay pauses on hover, focus, and a hidden browser tab.

## Security

- No `innerHTML` anywhere in the library — content is only ever cloned real DOM nodes (from Webflow's own rendered CMS collection or static elements) or manipulated via DOM APIs, never parsed from a string.
- The component only reads and restructures the DOM inside its own slot content. No network requests, no external calls, nothing stored.

## Browser support

Any evergreen browser. Uses native Shadow DOM `<slot>` support, the Web Animations API for the progress fill, and `@starting-style`/`transition-behavior: allow-discrete` for the panel crossfade — browsers without the latter simply show/hide panels instantly instead of fading, same graceful degradation as the datepicker.

## Development

```
pnpm install   # from the repo root
pnpm --filter webflow-auto-tabs dev      # sandbox for the engine (src/App.tsx)
pnpm --filter webflow-auto-tabs lint
pnpm --filter webflow-auto-tabs test
pnpm --filter webflow-auto-tabs build     # tsc --noEmit && vite build
```

The index/roving-key math is unit tested directly, as is `PausableTimer` (with fake timers — confirms it doesn't fire early when paused, resumes with only the remaining time, and doesn't double-count a pause called twice). The DOM enhancement (trigger/panel/progress wrapping into the real Tabs pattern) is tested against real jsdom-rendered DOM, and Slot extraction against real Shadow DOM distribution. `TabItem` has a regression test rendering under React StrictMode's deliberate double-invoke — the same duplicate-content bug class found and fixed in the sibling `webflow-slider` and `webflow-accordion` repos, guarded against here from the start. Autoplay pause/resume/roving-activation were also verified in a real browser using genuine `PointerEvent`s (the automated `hover` action in this session's tooling doesn't reliably fire real pointer events, which was confirmed as a tooling limitation, not a product bug, before shipping).

## License

MIT
