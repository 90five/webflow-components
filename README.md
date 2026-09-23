# Webflow Components

90five's reusable Webflow tools, one repo. Every package ships with zero baked-in visual styling — style everything in the Designer, the same way across the whole suite.

| Package | What it is | How it ships |
| --- | --- | --- |
| [`packages/slider`](packages/slider) | CMS + static carousel, fully Designer-styled | Webflow Code Component (`npx webflow library share`) |
| [`packages/accordion`](packages/accordion) | Accordion / single-open tabs, one engine | Webflow Code Component |
| [`packages/auto-tabs`](packages/auto-tabs) | Auto-advancing showcase tabs with a progress fill | Webflow Code Component |
| [`packages/number-count`](packages/number-count) | Count-up number animation | Webflow Code Component |
| [`packages/marquee`](packages/marquee) | Seamless infinite-loop marquee | Webflow Code Component |
| [`packages/multi-step-form`](packages/multi-step-form) | Multi-step form on a native Webflow Form Block | Custom-code script via CDN (jsDelivr) |
| [`packages/datepicker`](packages/datepicker) | Accessible jQuery date picker for Webflow forms | Custom-code script via CDN (jsDelivr) |

Each package has its own README with full setup instructions, options, accessibility notes, and security notes — this file is just the map.

## Two distribution models, on purpose

Five of these are **Webflow Code Components**: React, published straight into your Workspace with `npx webflow library share`, and added to a page the same way as any native Webflow element. GitHub visibility doesn't matter for these — Webflow never fetches from GitHub for a Code Component, the CLI push is what gets it into your Workspace.

`multi-step-form` and `datepicker` are different on purpose: they have to stay plain scripts loaded into a **real, native Webflow Form Block** so Webflow's own submission handling, spam protection, and integrations (Zapier, native email notifications, the Form Submissions panel) keep working untouched — wrapping a form in a Code Component's Shadow DOM would fight that. So instead each is a plain script + Custom Attributes/init call, loaded via a `<script src="https://cdn.jsdelivr.net/gh/90five/webflow-components@main/packages/<name>/...">` tag in Project Settings. jsDelivr mirrors a public GitHub repo directly — **this is the one thing in this repo that actually depends on it being public**, and the reason to pin a commit (not `@main`) once a client site goes live — see each package's own Security section.

## Development

This is a pnpm workspace — one install, one place for shared tooling.

```
pnpm install
pnpm -r lint     # lint every package
pnpm -r test     # test every package
pnpm -r build    # build every package
```

To work on one package specifically (filter by its `package.json` name, not its folder name):

```
pnpm --filter webflow-slider dev
pnpm --filter webflow-multiple-step-form build
```

| Folder | Package name |
| --- | --- |
| `packages/slider` | `webflow-slider` |
| `packages/accordion` | `webflow-accordion` |
| `packages/auto-tabs` | `webflow-auto-tabs` |
| `packages/number-count` | `webflow-number-count` |
| `packages/marquee` | `webflow-marquee` |
| `packages/multi-step-form` | `webflow-multiple-step-form` |
| `packages/datepicker` | `webflow-datepicker` |

## License

MIT
