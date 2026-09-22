# Webflow Slider

Two Webflow Code Components — **Slider — CMS Collection** and **Slider — Static Content** — sharing one engine. Both ship with zero visual opinions: no default colors, spacing or arrow/dot styling. Everything is styled the normal Webflow way, with your own classes on your own elements, so the same library drops into any client project and looks completely different every time.

- Works with a Webflow **Collection List** or with plain, static elements — two separate Library entries, same engine
- Slot-based Prev/Next buttons and dot template: you build them in the Designer, the component only wires up the behavior
- Independent slides-per-view and gap for desktop / tablet / mobile
- Loop, autoplay (pauses on hover, focus and when the tab is hidden), drag/swipe with momentum
- Built on [embla-carousel](https://www.embla-carousel.com) — a small, headless, unstyled carousel engine (not a themed slider library)
- WAI-ARIA carousel pattern, full keyboard support, `prefers-reduced-motion` aware

## Getting started

- `pnpm install` from the repo root (this package is part of the `webflow-components` pnpm workspace)
- `pnpm --filter webflow-slider dev` — local sandbox (`src/App.tsx`) for developing the engine itself
- `npx webflow library share` — publish this as a Code Component library to your Webflow workspace, then drop either component into any client site from there

## Setting it up in Webflow

### Slider — CMS Collection

1. Add the component to the canvas, then drop a **Collection List** into its **CMS Collection List** slot. Each collection item becomes one slide.
2. Style the Collection List item exactly like you would anywhere else in Webflow — that styling is what the slide looks like.
3. Optionally add your own elements to the **Previous Button**, **Next Button** and **Dot Template** slots (see [Building the controls](#building-the-controls) below).

### Slider — Static Content

Same as above, but drop plain elements (e.g. Div Blocks) into the **Slides** slot instead of a Collection List — one direct element per slide, no CMS needed.

### Building the controls

Put a **Div Block, Text, Icon or Image** in the Previous Button / Next Button / Dot Template slots — not another Button or Link Block. The component already wraps whatever you put there in a real, accessible `<button>`; nesting another interactive element inside it would be invalid, double-clickable markup. Style the button's `:hover`/`:active`/`:disabled` states, and style the dot's `[aria-current="true"]` state, with ordinary Webflow class combos.

If your dot element carries a Webflow interaction bound to its own element ID: the component clones that one element once per slide, so the ID (and any ID-bound interaction) is shared across every clone. Keep dot interactions to hover/tap states rather than ID-bound triggers.

## Options

Both components share the same props.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `loop` | Boolean | `true` | Loop back to the start after the last slide. |
| `autoplay` | Boolean | `false` | Automatically advance slides. |
| `autoplaySpeed` | Number | `4000` | Delay between automatic slides, in ms. Clamped to a 1000ms floor. |
| `slidesPerViewDesktop` | Number | `3` | Visible slides at 992px and up. |
| `slidesPerViewTablet` | Number | `2` | Visible slides between 768px and 991px. |
| `slidesPerViewMobile` | Number | `1` | Visible slides below 768px. |
| `gapDesktop` / `gapTablet` / `gapMobile` | Number | `24` / `16` / `16` | Space between slides, in px, per breakpoint. |
| `prevButtonSlot` / `nextButtonSlot` | Slot | — | Optional. See [Building the controls](#building-the-controls). |
| `dotTemplateSlot` | Slot | — | Optional. One dot element, cloned once per slide. |

`Slider — CMS Collection` additionally has `cmsCollectionComponentSlot` (the Collection List) and `showCMSCollectionComponent` (keep the source Collection List visible on canvas for editing bindings). `Slider — Static Content` has `slidesSlot` and `showSlidesComponent` for the same purpose.

## Theming

There is nothing to theme. The component contributes no colors, fonts, borders, or spacing scale — style the slide content, the buttons and the dots as you would any other Webflow element. The only thing driven by props is the CSS custom properties controlling slide width and gap per breakpoint (`--wfs-slides-*`, `--wfs-gap-*`), which are internal to the component.

## Accessibility

Follows the [WAI-ARIA carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/): the viewport is `role="region"` with `aria-roledescription="carousel"`, each slide is `role="group"` with `aria-roledescription="slide"` and a `"n of total"` label, and a visually-hidden live region announces the current slide on every change. Prev/Next/dots are real `<button>` elements, so focus, `:disabled`, and Enter/Space activation all come from the browser for free — no custom keyboard code to get wrong.

Autoplay pauses on hover, on focus, and when the browser tab is hidden. `prefers-reduced-motion: reduce` disables the slide-change animation.

| Control | Behavior |
| --- | --- |
| Tab | Moves through Prev, Next and each dot in normal document order. |
| Enter / Space | Activates the focused button (native `<button>` behavior). |

Arrow-key slide navigation is intentionally scoped to the Prev/Next/dot controls rather than hijacked globally on the viewport — a slide can contain its own interactive content (links, form fields), and a global arrow-key handler would break normal keyboard behavior inside it (e.g. moving the cursor in a text field).

## Security

- The component only reads and clones DOM nodes that Webflow itself rendered from your Collection List / static elements (same-origin, not a string parsed as HTML) — there is no `innerHTML` call anywhere in the library, and no user or CMS content is ever interpolated into an HTML string.
- The only place a number is turned into visible text without going through React's own escaping is the slide/live-region label (`"n of total"`), and both values are always plain integers derived from the slide count — never CMS or user content.
- `npm audit --omit=dev` reports 0 vulnerabilities. The dev-only toolchain (`@webflow/webflow-cli`, used solely to run `npx webflow library share` locally) has known advisories in its own nested dependencies at the time of writing; none of them run in, or ship with, the published component.

## Browser support

Any evergreen browser. Requires native Shadow DOM `<slot>` support (used to read Designer-authored content out of the Prev/Next/Dot/Slides slots) and CSS custom properties — both are baseline in every evergreen browser.

## Development

```
pnpm install   # from the repo root
pnpm --filter webflow-slider dev      # sandbox for the engine (src/App.tsx)
pnpm --filter webflow-slider lint
pnpm --filter webflow-slider test
pnpm --filter webflow-slider build     # tsc -b && vite build
```

The pure logic (breakpoint sanitizing, loop/label rules) is unit tested directly. The Slot-based extraction that CMS/Static content relies on is tested against real Shadow DOM slot distribution (see `useAssignedSlotContent.test.ts`), since that specific mechanism can't be exercised through a plain browser sandbox — that needs Webflow's own Designer runtime, which `pnpm --filter webflow-slider dev` does not replicate.

## License

MIT
