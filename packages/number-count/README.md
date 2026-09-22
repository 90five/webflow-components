# Webflow Number Count

A Webflow Code Component that animates a number counting up when it scrolls into view. Works with a plain static heading/text block *or* a CMS-bound field — it doesn't care which, it just reads whatever text is already there. Zero baked-in visual styling.

- Type the final number exactly as it should read — `"500+"`, `"$1,234.56"`, `"99.9%"`, `"10,000"` — the component parses prefix, suffix, decimals and thousands grouping straight out of that text and reproduces the same shape at every frame of the animation
- Counts up once when the element enters the viewport (with an option to replay every time), strong ease-out easing, `prefers-reduced-motion` aware (jumps straight to the final value instead)
- Applies tabular (fixed-width) numerals automatically — the one CSS rule this component sets, because without it a counting number visibly jitters sideways as narrower/wider digits swap in each frame. That's a correctness fix for the animation, not a style choice, so it isn't a toggle — still overridable with your own more specific rule if you ever want proportional numerals back
- No CMS/Static split needed (unlike the slider/accordion/tabs) — one component, since it just enhances whatever's already in the slot

## Getting started

- `pnpm install` from the repo root (this package is part of the `webflow-components` pnpm workspace)
- `pnpm --filter webflow-number-count dev` — local sandbox (`src/App.tsx`) for developing the animation itself
- `npx webflow library share` — publish this as a Code Component library to your Webflow workspace

## Setting it up in Webflow

1. Add the component to the canvas.
2. Drop your number element — a Heading, Text Block, whatever — into its **Number** slot. Type the number exactly as it should look once it's finished counting (with a currency symbol, thousands separator, `%`, `+`, whatever). Works the same way with a CMS-bound field: bind the field to that element's text as usual.
3. That's it. No other setup — it reads the target value from the text itself.

## Options

| Prop | Default | Description |
| --- | --- | --- |
| `duration` | `2000` | How long the count-up takes, in ms. |
| `startValue` | `0` | The number it counts up from. |
| `decimalSeparator` | `"."` | Which character means the decimal point in your number — `"."` or `","`. The other is treated as thousands grouping. Set to `","` for German-style formatting like `1.234,56`. |
| `replay` | `false` | Re-run the animation every time it scrolls back into view, instead of only once. |

### A note on parsing ambiguous numbers

A number can only ever have one decimal point. If a separator character shows up more than once in your text (e.g. `"1.234.567"`), it's always treated as thousands grouping, regardless of `decimalSeparator` — a genuine decimal point can't repeat. If only one separator character appears exactly once, `decimalSeparator` decides what it means. If both `.` and `,` appear together (e.g. `"$1,234.56"`), the `decimalSeparator` one has to appear exactly once and the other has to look like grouping before it, or parsing is refused rather than guessed wrong (the number just won't animate — it'll show its static text as authored).

## Theming

Nothing is styled by this library beyond the one tabular-numerals rule explained above. The number keeps whatever Heading/Text styling you gave it — the component only ever changes its text content and reads its own value from what you typed.

## Accessibility

`prefers-reduced-motion: reduce` skips the animation and jumps straight to the final value — a rapidly changing number is exactly the kind of motion that setting exists to suppress. The element's accessible text updates every frame like any other text node, same as it would if you were editing it by hand.

## Security

- No `innerHTML` anywhere — only `textContent` is ever written, and only with values this component itself computed (formatted numbers), never with content parsed as HTML.
- The component only reads and updates the text of the one element in its own slot. No network requests, no external calls, nothing stored.

## Browser support

Any evergreen browser. Uses native Shadow DOM `<slot>` support, `IntersectionObserver`, and `requestAnimationFrame`.

## Development

```
pnpm install   # from the repo root
pnpm --filter webflow-number-count dev      # sandbox for the animation (src/App.tsx)
pnpm --filter webflow-number-count lint
pnpm --filter webflow-number-count test
pnpm --filter webflow-number-count build     # tsc --noEmit && vite build
```

The number parser/formatter and the easing/interpolation math are unit tested directly, including the ambiguous-separator edge cases described above (round-tripping every example through parse → format unchanged). The full play/pause/reset/replay lifecycle — including tabular-numeral application — is tested against a real Shadow DOM slot (not a mock) with `IntersectionObserver` faked and `requestAnimationFrame` driven by vitest's fake timers, and verified manually in a real browser.

## License

MIT
