# Webflow Multi-Step Form

A dependency-free multi-step form for Webflow. Drop it on any normal Webflow **Form Block** — it stays a real, native Webflow form the whole time (Webflow's own submission, integrations, spam protection and success/error states all keep working untouched), it just shows one section at a time.

- No jQuery, no Parsley, no build step for consumers — one small script + attributes
- Every step lives in the same form; navigation is just visibility, not multiple forms
- Custom error messages, field interpolation, minimum-word-count and business-email-only validation — all opt-in, all set via plain Webflow Custom Attributes, no code editing per field
- Nothing to theme: no colors, spacing or button styles shipped. Style everything the normal Webflow way
- WAI-ARIA wizard pattern: live region announcing step changes, focus moves into each new step, `prefers-reduced-motion` aware

## Getting started

- `pnpm install` from the repo root (this package is part of the `webflow-components` pnpm workspace)
- `pnpm --filter webflow-multiple-step-form dev` — local sandbox (`index.html`) for developing the script itself
- `pnpm --filter webflow-multiple-step-form build` — produces `dist/step-form.js` (readable) and `dist/step-form.min.js` (minified)

## Setting it up in Webflow

1. Add a normal **Form Block** to the page. Inside it, add one wrapper element per step (a Div Block is fine) and give each one a Custom Attribute: **Name** `data-step`, **Value** empty.
2. Add your fields inside each step wrapper as usual — nothing special needed on the fields themselves beyond normal Webflow validation (Required, type, pattern) and whichever of the optional attributes below you want.
3. Add your Prev/Next/Submit controls anywhere in the form (typically once, after all the steps) and give each a Custom Attribute: `data-step-next` on the "next" element, `data-step-back` on "previous". The **Submit Button** Webflow already gives your form works as-is — no attribute needed, though you can add `data-step-submit` for clarity. The back button is hidden on the first step, the next button is hidden on the last step, and the submit button only shows on the last step — the script manages this for you.
4. Add the script before the `</body>` tag in Project Settings → Custom Code, or Page Settings for a single page:

```html
<script src="https://cdn.jsdelivr.net/gh/90five/webflow-components@main/packages/multi-step-form/dist/step-form.min.js"></script>
```

That's it — no init call needed. The script scans the page for `[data-step-form]` on load and wires each one up automatically. Add `data-step-form` to the Form Block itself as the last step (Custom Attribute, empty value).

> jsDelivr can only serve files from a **public** GitHub repo — this snippet only resolves once `webflow-components` is public (same requirement `webflow-datepicker` has). This is the one package in this repo where that actually matters; see the root README.

As with the datepicker, pin the commit before go-live rather than tracking `@main`.

## Attributes reference

All optional except `data-step-form` and `data-step`.

| Attribute | Where | Value | Description |
| --- | --- | --- | --- |
| `data-step-form` | the `<form>` | — | Marks the form as multi-step. |
| `data-step` | a step wrapper | — | One per step. Order = document order. |
| `data-step-next` | any element | — | Advances a step (after validating the current one). |
| `data-step-back` | any element | — | Goes back a step. No validation. |
| `data-step-submit` | any element | — | Optional marker for the submit control — a normal `type="submit"` button already works without it. |
| `data-step-error-message` | a field | text | Custom message shown for that field, for any failure (required, type, pattern, minwords, business-email). Overrides everything else below. |
| `data-step-error-for` | any element | field's `name` | Where that field's error message is rendered. Hidden by default; shown only while invalid. |
| `data-step-field` | any element | a field's `name` | Live-interpolates that field's current value as text — for "Hi {firstName}"-style copy on a later step. |
| `data-step-minwords` | a textarea/input | a number | Blocks advancing until the field has at least that many words. Skipped while the field is empty (pair with `required` if it must be filled). |
| `data-step-minwords-message` | the `<form>` | text with `{n}` | Form-wide default message for minwords failures, e.g. `Bitte schreibe mindestens {n} Woerter.` A field's own `data-step-error-message` still wins if set. |
| `data-step-business-email` | an email field | empty, or extra domains | Blocks common free/consumer providers (Gmail, Yahoo, GMX, Web.de, T-Online, ...). Give it a comma-separated value to block additional domains on top of the built-in list, e.g. `data-step-business-email="mailinator.com"`. |
| `data-step-business-email-message` | the `<form>` | text | Form-wide default message for a blocked email. |
| `data-step-dot` | one element | — | A single dot/step-indicator element. Cloned once per step; the original is removed. Gets `aria-current="true"` on the active dot and `data-step-dot-completed` on already-passed dots — style both with ordinary combo classes. Clicking a dot jumps to that step, but only backward or to the current step, never ahead (navigation still has to go through validation). |
| `data-step-progress-bar` | any element | — | Its `width` is set to a `%` reflecting the current step. Use alongside or instead of dots. |

## Theming

Nothing is styled by this library — no CSS file is even shipped. Steps, error boxes and nav buttons are shown/hidden by clearing or setting an inline `display: none`, so whatever `display` value your Webflow class already uses (`flex`, `grid`, `block`, ...) is exactly what appears when a step, error box or button becomes visible. Style everything — spacing, colors, the dot/progress-bar look, error text — directly in the Designer.

## Accessibility

Follows the WAI-ARIA wizard pattern: the current step gets focus (its heading, if there is one, else its first field) on every real navigation — not on initial page load, so it doesn't steal focus from something else on the page. A visually-hidden live region announces "Step n of total" on every change. Invalid fields get `aria-invalid` and `aria-describedby` pointing at their error text; the first invalid field is focused automatically. `prefers-reduced-motion: reduce` disables the step-entrance animation.

## Security

- No `innerHTML` anywhere — the only content this script writes into the page is text (`textContent`), never parsed as HTML, so nothing here creates an XSS vector even with CMS- or user-supplied values.
- Business-email blocking is a UX nicety, not a security boundary — it filters by the domain string in the `<input type="email">` value on the client. Treat it exactly like any other client-side form validation: don't rely on it as your only defense against bad submissions server-side.
- The script reads and writes only the form and elements described above. No network requests, no external calls, nothing stored.

## Browser support

Any evergreen browser. Uses the native Constraint Validation API and the Web Animations API (the entrance animation is skipped, not broken, if `Element.animate` isn't available).

## Development

```
pnpm install   # from the repo root
pnpm --filter webflow-multiple-step-form dev      # sandbox at index.html
pnpm --filter webflow-multiple-step-form lint
pnpm --filter webflow-multiple-step-form test
pnpm --filter webflow-multiple-step-form build     # dist/step-form.js + dist/step-form.min.js
```

Pure logic (word counting, step-index math, free-email-domain matching) is unit tested directly. The DOM/validation/navigation behavior is tested against real jsdom-rendered forms — see `src/step-form.test.ts`.

## License

MIT
