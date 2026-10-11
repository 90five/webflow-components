# Webflow Cookie Consent

GDPR / TTDSG opt-in cookie-consent component for Webflow. One dependency-free script with a **built-in service library** (German + English texts, cookie details, vendor privacy links, loader code) — per site you only list which services are used.

- **You design the banner and the preferences modal in the Webflow Designer.** The script ships no UI and no CSS; it only adds behavior through `fivex-consent` attributes.
- Opt-in only: nothing non-necessary loads or runs before consent. "Reject all" is a first-class button next to "Accept all".
- Script-based services (GA4, Clarity, Meta Pixel, ...) are loaded **by the library** after consent. Embeds (YouTube, Vimeo, Calendly, Maps, ...) are blocked behind a placeholder until the visitor clicks.
- Consent is revocable at any time. A withdrawn consent clears the service's cookies (on the site's own domain) and reloads the page if it had started a script. A withdrawal in another tab is picked up as well. Content a visitor loaded for one page view ("Inhalt laden") is never taken back by a later decision; it stays until the visitor leaves the page.
- Zero dependencies, no external requests, no web fonts. About 36 kB gzipped (the whole service library is in the bundle).


## Quick start

1. In **Project Settings → Custom Code → Head**, add the config **before** the script tag:

```html
<script>
  window.FivexConsent = {
    lang: "de", // "de" | "en" | "auto" (uses <html lang>)
    privacyUrl: "/datenschutz",
    imprintUrl: "/impressum",
    revision: 1, // bump to ask everybody again
    services: {
      ga4: { id: "G-XXXXXXXXXX" },
      clarity: { id: "abcdefghij" },
      calendly: true,
      vimeo: true
    }
  };
</script>
<script src="https://cdn.jsdelivr.net/gh/90five/webflow-components@<tag>/packages/cookie-consent/dist/consent.min.js" defer></script>
```

2. **Build the banner** (Designer): a Div with the Custom Attribute `fivex-consent` = `banner`, containing three buttons: `allow` ("Alle akzeptieren"), `deny` ("Alle ablehnen"), `open-preferences` ("Einstellungen"). Give `allow` and `deny` the **same** styling.
3. **Build the preferences modal**: a Div with `fivex-consent` = `preferences` containing a Form with one checkbox per category (`fivex-consent-checkbox` = `functional` / `analytics` / `marketing`; optional locked one: `necessary`), a submit button (`fivex-consent` = `submit`, not needed on a native Webflow Submit Button), plus optional `allow`, `deny` and `close` buttons.
4. **Footer link** "Cookie-Einstellungen": give any link or button `fivex-consent` = `open-preferences`. (Optional floating trigger: a Div with `fivex-consent` = `manager`, shown automatically whenever the banner and the preferences are closed.)
5. Put the banner/preferences in a Webflow **Symbol / Component** so they exist on every page, including CMS templates, 404 and search.
6. Publish and run the [launch checklist](#launch-consent-checklist).

Pin `<tag>` to a release tag (never `@main`): consent behaviour must not change under a live site. jsDelivr serves the committed `dist/` files straight from this public repo.

### Showing and hiding

Components are hidden with an inline `display: none` and shown by clearing it, so the display value from your Webflow class (`flex`, `grid`, ...) applies. If your class is `display: none` in the Designer, set `fivex-consent-display="flex"` (or `block`, `grid`, ...) on the element. To avoid a flash before the script runs, set the initial display of banner and preferences to `none` and add that attribute. For custom animations put a hidden Div with `fivex-consent="interaction"` inside the component and bind a Webflow click interaction to it (1st click opens, 2nd click closes). The script does **not** wait for the window `load` event (images and fonts can take seconds). If `window.Webflow` exists it uses `Webflow.push`; otherwise it waits for `DOMContentLoaded` plus a short delay (50 ms) and, if webflow.js has shown up meanwhile, uses `Webflow.push`. If Webflow has not answered 1.5 s after `DOMContentLoaded` (webflow.js missing, blocked or broken), the panel is shown or hidden directly through `display`, so a banner can never stay hidden. The trigger is clicked only when the panel's real (computed) visibility differs from the wanted state. After the click the panel is watched for style / class changes: a reaction means the interaction is running and is never clicked again; if there is no reaction at all within 1.5 s and no `Webflow.push` was used, the click is repeated once (the handler was probably not bound yet). If the panel still is not in the wanted state in the end, `display` is set directly, so it never ends inverted. **Build your interaction so that it sets `display` immediately** (animate `opacity` / `transform` as you like, but do not delay the `display` switch by more than a second or so). The script tag can stay in the head with `defer`.

## Attribute reference

All attributes use the `fivex-consent` prefix.

| Attribute | On | Value | What it does |
| --- | --- | --- | --- |
| `fivex-consent` | a component | `banner` | Shown on first visit and whenever `revision` changes, hidden after a choice. Gets `role="region"` and an accessible name. |
| | | `preferences` | The preferences modal / form. Hidden by default. Gets `role="dialog"`, `aria-modal="true"`, an accessible name (see `fivex-consent-label`), a focus trap that skips hidden, inert and disabled elements, and Esc to close. |
| | | `manager` | Optional floating trigger; visible while banner and preferences are closed. |
| | | `interaction` | Hidden Div inside a component that drives a Webflow interaction (see above). |
| `fivex-consent` | a button / link | `allow` | Accept all categories. |
| | | `deny` | Reject everything except necessary. |
| | | `submit` | Save the checkboxes of the surrounding form / component. (A real `<form>` inside banner/preferences is intercepted too.) |
| | | `open-preferences` | Close the banner, open the preferences (use in the footer too). |
| | | `close` | Close the component without saving. The banner returns on the next page load. |
| | | `load-embed` | Inside an embed placeholder: load this one embed for this visit only. |
| | | `allow-embed` | Inside an embed placeholder: always allow this embed's service. |
| `fivex-consent-checkbox` | a checkbox | `functional`, `analytics`, `marketing`, `necessary` | Reflects the current consent every time the preferences open. `necessary` is checked and locked. |
| `fivex-consent-category` | a wrapper (optional) | category name | Wrapper of one checkbox row. Hidden when no configured service uses the category. Falls back to the checkbox's `<label>`. |
| `fivex-consent-label` | banner / preferences | text | Accessible name (`aria-label`). Without it the first heading inside is used (`aria-labelledby`), then a built-in text ("Cookie-Einstellungen" / "Cookie settings", "Cookie-Hinweis" / "Cookie notice"). An `aria-label` / `aria-labelledby` you set yourself is kept. |
| `fivex-consent-scroll` | banner / preferences | `lock` | Locks page scrolling while open. |
| `fivex-consent-display` | a component | `block`, `flex`, `grid`, ... | Display value used when the class itself is `display: none`. |
| `fivex-consent-link` | a link | `privacy`, `imprint` | Sets `href` from `privacyUrl` / `imprintUrl`. |
| `type="fivex-consent"` | `<script>` | | Script that must not run before consent. |
| `fivex-consent-categories` | script / iframe | `functional,analytics,marketing` | Required categories (comma separated). Without it the element needs full consent ("uncategorized"). |
| `fivex-consent-service` | script / iframe / container | service id | Ties the element to a service from the library (preferred over categories). |
| `fivex-consent-src` | `<iframe>` | URL | The real source, set only after consent. Use instead of `src`. |
| `fivex-consent-html` | any container | HTML string | Markup inserted after consent, filtered by an [allow-list sanitizer](#html-sanitizer); then the service's embed library runs and re-scans the container (see [container markup per service](#container-markup-per-service)). For widgets such as `<div class="calendly-inline-widget">`. |
| `fivex-consent-placeholder` | iframe: a CSS selector; or on a placeholder element next to the embed | | Use your own designed placeholder instead of the default. One placeholder may serve several embeds. |
| `fivex-consent-services` | a wrapper | category | [Service list renderer](#rendering-the-service-list-in-your-design). |

### Embeds

```html
<!-- (a) iframe: replace src with fivex-consent-src -->
<iframe fivex-consent-service="vimeo" fivex-consent-src="https://player.vimeo.com/video/123456789" width="640" height="360" title="..."></iframe>

<!-- (b) blocked script: runs only after consent -->
<script type="fivex-consent" fivex-consent-service="calendly" src="https://assets.calendly.com/assets/external/widget.js"></script>
<script type="fivex-consent" fivex-consent-categories="analytics">/* inline code */</script>

<!-- (c) inline widget container: markup is inserted after consent -->
<div fivex-consent-service="calendly" fivex-consent-html="&lt;div class=&quot;calendly-inline-widget&quot; data-url=&quot;https://calendly.com/you/30min&quot;&gt;&lt;/div&gt;"></div>
```

#### HTML sanitizer

The markup in `fivex-consent-html` is parsed in an inert `<template>`, filtered through an **allow-list** and rebuilt element by element (it is never re-serialised). Allowed elements: `div`, `span`, `p`, `a`, `strong`, `em`, `b`, `i`, `ul`, `ol`, `li`, `br`, `img`, `h1`-`h6`, `button` (always `type="button"`), `small`, `figure`, `figcaption`, `picture`, `source`, `blockquote`. Allowed attributes: `class`, `href`, `src`, `srcset`, `sizes`, `alt`, `title`, `width`, `height`, `loading`, `target`, `rel`, `role`, `cite`, `lang`, `dir`, `aria-*` and `data-*` (see below). `href`, `src`, `srcset` and `cite` are kept only if the URL is relative or uses `http`, `https`, `mailto` or `tel`; the scheme is checked after removing control characters, spaces and invisible characters and after decoding, so `java&#9;script:` style tricks do not pass. Everything else is dropped together with its children, including `svg`, `math`, `style`, `form`, `base`, `meta`, `link`, `iframe` (unless a service grants it, see below), `object`, `embed`, `script`, inline `style` attributes and every `on*` handler. Use classes (defined in Webflow) instead of inline styles.

- **`id` and `name` are removed.** Named elements become properties of `window` / `document` (DOM clobbering: `id="dataLayer"` would shadow the real array). Use classes.
- **`data-*`** must match `data-<words-with-dashes>` (lower case letters, digits, single dashes). Attributes that frameworks evaluate or dispatch on are dropped: `data-bind`, `data-hx-*` / `data-htmx-*`, `data-x-*`, `data-v-*`, `data-ng-*`, `data-on*`, `data-ko-*`, `data-alpine-*`, `data-action`, `data-controller`, `data-turbo*`, `data-bs-*`, `data-toggle`, `data-target`, `data-dismiss`, `data-trigger`, `data-method`, `data-remote`, `data-confirm`, `data-js*`, `data-call`, `data-click`. `x-*`, `@*`, `:*`, `v-*`, `ng-*` attributes are not on the list at all.
- **Links:** any `target` other than `_self`, `_top` or `_parent` (for example `_blank`, a window name) gets `rel="noopener noreferrer"`, replacing a `rel` you wrote.
- **A service can grant extra markup** for its containers: `wistia` allows the `<wistia-player>` custom element with its documented attributes, `tally` allows `<iframe data-tally-src="https://tally.so/...">` (no `src`/`srcdoc`; the `data-*src` URL must point to the service's hosts). The grant applies only to containers of that service. Everything a container service needs is listed below.

The sanitizer is a safety net, not a licence to paste untrusted HTML: the markup should come from trusted authors of the site.

##### Container markup per service

Put the markup in `fivex-consent-html` of an element with `fivex-consent-service="<id>"`. After the markup is inserted the service's embed library is loaded (once per page view) and **every** container is started with the vendor's official re-scan API, whether it was released together with the library, later with "Inhalt laden" or after "allow all". Inline `style` attributes are removed, so give the container its size with a class.

| Service | Markup | Started with |
| --- | --- | --- |
| `calendly` | `<div class="calendly-inline-widget" data-url="https://calendly.com/you/30min"></div>` | `Calendly.initInlineWidget({ url, parentElement })` |
| `typeform` | `<div data-tf-widget="FORM_ID"></div>` or `<div data-tf-live="FORM_ID"></div>` | `tf.load()` |
| `tally` | `<iframe data-tally-src="https://tally.so/embed/ID?dynamicHeight=1" loading="lazy" width="100%" height="276" title="..."></iframe>` or `<button data-tally-open="ID">` | `Tally.loadEmbeds()` |
| `trustpilot` | `<div class="trustpilot-widget" data-locale data-template-id data-businessunit-id data-style-height data-style-width><a href="..." target="_blank" rel="noopener">Trustpilot</a></div>` | `Trustpilot.loadFromElement(widget, true)` |
| `instagram` | `<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/p/ID/" data-instgrm-version="14"><a href="...">...</a></blockquote>` | `instgrm.Embeds.process()` |
| `x-twitter` | `<blockquote class="twitter-tweet"><p lang="en" dir="ltr">...</p>&mdash; Name (@handle) <a href="https://twitter.com/handle/status/ID">date</a></blockquote>` (or `<a class="twitter-timeline" href="...">`) | `twttr.widgets.load(container)` |
| `cal-com` | `<div class="cal-inline" data-cal-link="username/event" data-cal-config='{"layout":"month_view"}'></div>` | one Cal.com namespace per container, `Cal.ns[name]("inline", { elementOrSelector, calLink, config })` (Cal.com allows one inline embed per namespace) |
| `hubspot` | `<div class="hs-form-html" data-region="eu1" data-portal-id="1234567" data-form-id="UUID"></div>` | `hbspt.forms.create({ portalId, formId, region, target })` from `js.hsforms.net/forms/embed/v2.js` |
| `wistia` | `<wistia-player media-id="ID" aspect="1.7777777777777777"></wistia-player>` | `player.js` defines the element; `fast.wistia.com/embed/<ID>.js` is added per video |

Videos, maps and audio (`youtube`, `vimeo`, `loom`, `google-maps`, `openstreetmap`, `spotify`, `soundcloud`) are plain iframes: use `fivex-consent-src`.

For script-based services listed in `services` you usually need **no** tag at all: the library injects the vendor script itself. A service found on the page but missing from `services` is added automatically (with a console note) so it still shows up in the consent UI; add it to the config anyway.

**Default placeholder.** Without a designed placeholder, an unstyled block is rendered before the embed: `div.fivex-consent-placeholder` > `p.fivex-consent-placeholder__text`, `div.fivex-consent-placeholder__actions` > `button.fivex-consent-placeholder__btn--load` ("Inhalt laden") and `--always` ("Immer erlauben"), and `a.fivex-consent-placeholder__link` to the privacy policy. Style these classes in Webflow. "Inhalt laden" loads exactly the embed(s) of that placeholder, for this visit only; other embeds of the same service stay blocked, and nothing is stored. Only the **embed** library of the service runs (the form, widget or player script), never a site-wide tracker of the same vendor. What was loaded this way stays until the visitor leaves the page: a later "Nur notwendige" decision (in this or another tab) does not reload the page or remove it. "Immer erlauben" stores consent for that service only (cookie `fivex_consent`, `decided: false`) and loads **all** embeds of that service on the page and on later visits (again only the embed library, not a tracker; for example a HubSpot form loads `js.hsforms.net/forms/embed/v2.js` but never the tracking code, which needs the marketing category); it is **not** a banner decision, so the banner stays visible until the visitor makes a category choice. A later category choice replaces the stored service grants. Strings can be overridden with `texts: { de: { load, always, privacy } }`.

**Designed placeholder.** Put an element with `fivex-consent-placeholder` right next to the embed (same parent), with buttons `fivex-consent="load-embed"` and optionally `fivex-consent="allow-embed"`, and optional text fields `fivex-consent-field="vendor" | "text"` / `"privacy-link"` that the script fills. It is hidden once the embed loads. A designed placeholder that sits next to several embeds governs all of them: "Inhalt laden" loads every embed it governs, and the placeholder disappears when the last one is loaded. Blocked iframes are hidden with an inline `display: none` (a `hidden` attribute would lose against CSS such as `iframe { display: block }`); the original inline display value is restored when the iframe loads.

**Embeds added later.** A `MutationObserver` (`observe: true`, the default) picks up blocked iframes, scripts and containers that are added after the page loaded (CMS "load more", tabs, lazy sections): they get a placeholder, are released immediately if the visitor already consented, and appear in `FivexConsent.services` / `categories`. Set `observe: false` to turn it off.

Iframe sources are checked against the service's allowed hosts (e.g. `player.vimeo.com`); other hosts are refused. An iframe with an unknown service id (typo) or a service without embeds stays blocked, a warning is logged, and its placeholder has no buttons (no "Immer erlauben" for unknown services).

### Rendering the service list in your design

Inside the preferences, per category:

```html
<div fivex-consent-services="analytics">
  <div fivex-consent-template>
    <strong fivex-consent-field="label"></strong>
    <span fivex-consent-field="vendor"></span>
    <p fivex-consent-field="description"></p>
    <a fivex-consent-field="privacy-link"></a>   <!-- href set, link text kept; default text if empty -->
    <table><tbody>
      <tr fivex-consent-cookie-template>
        <td fivex-consent-field="name"></td><td fivex-consent-field="duration"></td><td fivex-consent-field="purpose"></td>
      </tr>
    </tbody></table>
  </div>
</div>
```

The template is cloned per configured service in that category, in the configured language. The wrapper is hidden if the category has no service. Without a template nothing is rendered and your static text stays. Fields: `label`, `vendor`, `description`, `privacy-link`, `vendor-link`, `cookies` (plain comma list when no cookie template exists), and inside the cookie template `name`, `duration`, `purpose`.

## Configuration (`window.FivexConsent`)

| Key | Default | |
| --- | --- | --- |
| `lang` | `auto` | `de`, `en` or `auto` (`<html lang>`, falls back to `de`). Affects the generated texts (placeholder, service list). Static banner text is yours. |
| `privacyUrl`, `imprintUrl` | | Used for `fivex-consent-link` and the placeholder's privacy link. |
| `revision` | `1` | Integer. Bump to ask every visitor again (e.g. after adding a service). Other values are coerced to an integer with a console warning. |
| `expires` | `180` | Days the decision is remembered. Minimum 1: smaller values are raised to 1 day with a console warning; values that are not a positive number fall back to 180 with a warning. |
| `cookieDomain` | host only | e.g. `.example.com` to share the decision across subdomains. Must be the current host or a parent of it (with at least one dot); otherwise a console warning is logged and a host-only cookie is used. Only one copy of the consent cookie is kept: writing it with a domain removes the host-only copy and vice versa. |
| `observe` | `true` | Pick up blocked embeds that are added to the page later. |
| `services` | `{}` | `{ id: true | { options } }`. See the service table. |
| `texts` | | `{ de: { load, always, privacy }, en: { ... } }` overrides for the default placeholder. |
| `ready` | | A `function(api)` or an array of them, called once the script is up; `api` is the `FivexConsent` object described under [API](#api). Anything else is ignored with a console warning. |

### Service options

| Service | Options |
| --- | --- |
| `ga4` | `id` (G-...) |
| `gtm` | `id` (GTM-...), `category?` (`analytics` default, `marketing` or `functional`), `beforeConsent?` (`true` loads the container before consent, see below) |
| `google-ads` | `id` (AW-...) |
| `clarity` | `id` |
| `hotjar` | `id`, `snapshotVersion?` |
| `matomo` | `url` (Cloud or self-hosted base URL, https), `siteId` |
| `plausible` | `domain?`, `src?` |
| `fathom` | `id` |
| `meta-pixel`, `linkedin-insight`, `pinterest-tag`, `microsoft-uet` | `id` (digits) |
| `hubspot` | `id?` (digits, HubSpot tracking code; leave it out if you only embed forms) |
| `tiktok-pixel` | `id` |
| `recaptcha`, `hcaptcha`, `turnstile` | `siteKey` (`recaptcha`: optional `domain: "recaptcha.net"`) |
| `intercom` | `appId` |
| `crisp` | `id` |
| `tawk` | `propertyId`, `widgetId` |
| `zendesk-chat` | `key` |
| `adobe-fonts` | `kitId` |
| `cal-com` | `origin?` |
| all others | `true` |

Ids are validated with strict patterns before they are placed in any URL or script; an invalid id logs a warning and the service is not loaded.

## API

`window.FivexConsent` has two roles: **before** the script runs it is your config object; **after** it has started the same name holds the API, and your config stays readable as `FivexConsent.config` (the API's `FivexConsent.services` is the list of active service ids, while `FivexConsent.config.services` is what you configured). Call the API from `ready` or after `DOMContentLoaded`:

```js
FivexConsent.open();                    // open the preferences (also: fivex-consent="open-preferences")
FivexConsent.close();
FivexConsent.allow(); FivexConsent.deny();
FivexConsent.accept("vimeo");           // opt in to one service
FivexConsent.has("ga4");                // service consented?
FivexConsent.hasCategory("analytics");
FivexConsent.hasConsent();              // banner/preferences decision for this revision? (false while only "Immer erlauben" grants exist)
FivexConsent.getConsent();              // { rev, ts, cats, svc, decided } | null
FivexConsent.onConsent("vimeo", () => {});      // service id or category; immediate if already consented, else on consent
FivexConsent.services;                  // ids of the services in use (configured, plus those found on the page)
FivexConsent.categories;                // categories in use
FivexConsent.config;                    // the config object you set before the script loaded
```

The decision is stored in the first-party cookie `fivex_consent` (necessary, 180 days by default, `SameSite=Lax`, `Secure` on https). On each (re)load and after each decision the script pushes GTM-friendly events to `dataLayer`: `analytics-activated`, `marketing-activated`, `personalization-activated` (functional), plus `fivex_consent_update`. They come **after** the Consent Mode update and the loaders of the services (`consent default` > `consent update` > `gtm.js` > category events > `fivex_consent_update`), so tags that fire on them already see the granted signals.

**Other tabs and history.** The decision is re-read from the cookie when a page is restored from the back/forward cache (`pageshow`), and, via `BroadcastChannel` (or `visibilitychange` where it is missing), when another tab of the site decides. A withdrawal there of a grant that started a script reloads this tab too; a new grant is applied without reload; one-off "Inhalt laden" content stays. The `BroadcastChannel` is closed on `pagehide` and reopened on `pageshow`, so it does not keep the page out of the back/forward cache.

## Services

Every service carries its category, German and English texts, vendor privacy link, the cookies and storage keys it sets (name, duration, purpose) and its loader. A service is part of the package only if every listed entry was **observed** in a real browser (a sandbox page that loads the service through this package, or a live website that runs the tool, attributed to the vendor) or is in the vendor's **official documentation**, and if its loader or embed was shown to work after consent. [SOURCES.md](SOURCES.md) lists the evidence per entry, the verification date, the live sites and the documentation URLs. Local storage, session storage and IndexedDB keys are listed too (only cookies are erased on withdrawal).

| id | Service | Category | What is blocked until consent | Cookies / storage |
| --- | --- | --- | --- | --- |
| `clarity` | Microsoft Clarity | analytics | vendor script | 8 entries |
| `fathom` | Fathom Analytics | analytics | vendor script | none (no cookies or storage) |
| `ga4` | Google Analytics 4 | analytics | vendor script | 2 entries |
| `gtm` | Google Tag Manager | analytics (configurable) | container script | none (container only) |
| `hotjar` | Hotjar | analytics | vendor script | 7 entries |
| `matomo` | Matomo | analytics | vendor script | 3 entries |
| `plausible` | Plausible Analytics | analytics | vendor script | none (no cookies or storage) |
| `adobe-fonts` | Adobe Fonts | functional | vendor script | none (no cookies or storage) |
| `cal-com` | Cal.com | functional | vendor script; iframe/container: cal.com, app.cal.com | 1 entry |
| `calendly` | Calendly | functional | vendor script; iframe/container: calendly.com | 4 entries |
| `crisp` | Crisp Chat | functional | vendor script | 2 entries |
| `google-fonts` | Google Fonts | functional | nothing loaded by the library (see note) | none (no cookies or storage) |
| `google-maps` | Google Maps | functional | iframe/container: www.google.com/maps, maps.google.com | 1 entry |
| `hcaptcha` | hCaptcha | functional | vendor script | 1 entry |
| `intercom` | Intercom | functional | vendor script | 4 entries |
| `loom` | Loom | functional | iframe/container: loom.com | 11 entries |
| `openstreetmap` | OpenStreetMap | functional | iframe/container: www.openstreetmap.org, openstreetmap.org | none (no cookies or storage) |
| `recaptcha` | Google reCAPTCHA | functional | vendor script | 6 entries |
| `soundcloud` | SoundCloud | functional | iframe/container: w.soundcloud.com | 1 entry |
| `spotify` | Spotify | functional | iframe/container: open.spotify.com | 7 entries |
| `tally` | Tally | functional | vendor script; iframe/container: tally.so | none (no cookies or storage) |
| `tawk` | tawk.to Chat | functional | vendor script | 5 entries |
| `trustpilot` | Trustpilot | functional | vendor script; iframe/container: widget.trustpilot.com, trustpilot.com | none (no cookies or storage) |
| `turnstile` | Cloudflare Turnstile | functional | vendor script | 1 entry |
| `typeform` | Typeform | functional | vendor script; iframe/container: form.typeform.com, typeform.com | 5 entries |
| `vimeo` | Vimeo | functional | iframe/container: player.vimeo.com | 12 entries |
| `wistia` | Wistia | functional | vendor script; iframe/container: fast.wistia.net, fast.wistia.com | 2 entries |
| `youtube` | YouTube | functional | iframe/container: youtube-nocookie.com, youtube.com | 13 entries |
| `zendesk-chat` | Zendesk Web Widget | functional | vendor script | 4 entries |
| `google-ads` | Google Ads | marketing | vendor script | 5 entries |
| `hubspot` | HubSpot | marketing | tracking code (marketing consent only); forms library `js.hsforms.net` for containers; iframe/container: hsforms.com, hsforms.net, meetings.hubspot.com, share.hsforms.com | 8 entries |
| `instagram` | Instagram | marketing | vendor script; iframe/container: instagram.com, cdninstagram.com | 1 entry |
| `linkedin-insight` | LinkedIn Insight Tag | marketing | vendor script | 4 entries |
| `meta-pixel` | Meta Pixel | marketing | vendor script | 5 entries |
| `microsoft-uet` | Microsoft Advertising (UET) | marketing | vendor script | 7 entries |
| `pinterest-tag` | Pinterest Tag | marketing | vendor script | 3 entries |
| `tiktok-pixel` | TikTok Pixel | marketing | vendor script | 8 entries |
| `x-twitter` | X (Twitter) | marketing | vendor script; iframe/container: platform.twitter.com, platform.x.com, syndication.twitter.com | 4 entries |

Categories: **functional** (comfort functions and embeds; "Personalisierung" in other tools), **analytics** (statistics), **marketing** (advertising, retargeting, conversion tracking). **necessary** is always on and reserved for the consent cookie. Only categories with at least one configured service (or blocked element on the page) are shown.

Category decisions are conservative. Marketing: ad pixels and tags (Meta Pixel, LinkedIn Insight, TikTok Pixel, Pinterest Tag, Microsoft Advertising UET, Google Ads, HubSpot tracking and forms) and social embeds (Instagram, X), which set cookies of the platform in verification. Functional: embeds (YouTube, Vimeo, Loom, Wistia, Spotify, SoundCloud, Google Maps, OpenStreetMap, Calendly, Cal.com, Typeform, Tally), chat widgets, CAPTCHAs, review widgets and fonts. Trustpilot is functional because the TrustBox widget set no cookies or storage keys in verification. Analytics: GA4, Clarity, Hotjar, Matomo, Plausible, Fathom and Google Tag Manager by default.

Notes that matter in practice:

- **Google Consent Mode v2 (basic).** `ga4`, `gtm` and `google-ads` define `gtag` and set all consent signals to `denied` at startup **without any request to Google**. Only after consent are the signals updated and `gtag.js` / `gtm.js` injected.
- **Consent Mode signals are computed in one place** for all Google services on the page, from the visitor's categories and the configured services, so the result does not depend on the order of `services` or on which script loads first. A signal is sent only when a service that is allowed uses it: `analytics_storage` (`ga4` or `gtm`) follows the analytics consent; `ad_storage` (`gtm` or `google-ads`) follows the marketing consent; `ad_user_data` and `ad_personalization` (`gtm`, `google-ads`, or `ga4` with `ads: true`) follow the marketing consent; `functionality_storage` and `personalization_storage` (`gtm`) follow the functional consent. Everything else keeps the denied default. In particular `ga4` alone never sends `ad_*` keys, also with marketing consent, unless it is configured with `ads: true`. Unchanged signals are not pushed twice.
- **Microsoft Clarity.** The Consent API v2 signal follows the categories: `analytics_Storage` the analytics consent, `ad_Storage` the marketing consent (re-sent on every decision).
- **Google Tag Manager.** By default the container (`gtm.js`) loads **after** the visitor consented to the service's category (`analytics` unless you set `category: "marketing"` or `"functional"`), and the Consent Mode signals (`analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization`, `functionality_storage`, `personalization_storage`) follow the visitor's categories as described above; the events `analytics-activated`, `marketing-activated`, `personalization-activated` and `fivex_consent_update` are pushed to `dataLayer`. Revoking that category reloads the page and the container no longer loads. Pick the category that matches the tags in the container: a visitor who consents only to a different category does not load it.
  `beforeConsent: true` is an explicit opt-in that loads the container on every page view with all signals denied, so that tags can use Consent Mode's cookieless pings. **Trade-off:** the visitor's IP address reaches Google before any consent, and the site owner needs their own legal approval for that. Every tag inside the container must use these signals (built-in / additional consent checks) or fire only on those events; tags that do not will run for everybody, and this package cannot prevent that.
- **HubSpot.** Two separate parts. A form container (`<div class="hs-form-html" ...>`) released with "Inhalt laden" or "Immer erlauben" loads only the forms library (`js.hsforms.net/forms/embed/v2.js`) and renders the form with `hbspt.forms.create`; the visitor-tracking code (`js.hs-scripts.com/<id>.js`, configured with `id`) starts only with the **marketing** consent. A form-only site configures `hubspot: true`. **A HubSpot portal can inject additional ad pixels (for example Meta) through its tracking code.** This package does not control them: configure the respective service (`meta-pixel`, ...) separately and check what your portal loads.
- **Cookieless tools** (`plausible`, `fathom`, `google-fonts`, `adobe-fonts`) are listed for transparency; whether they need consent depends on your legal assessment. Google Fonts cannot be gated by this script (they are loaded by CSS): self-host them.
- **CAPTCHAs** (`recaptcha`, `hcaptcha`, `turnstile`) are functional. Without functional consent the widget does not load, so a form that depends on it cannot be submitted. Show a hint or use a "load" placeholder next to the form (`fivex-consent="load-embed"`), or make the form usable without the CAPTCHA until the visitor consents.
- `noscript` fallbacks of vendor snippets (pixels) must be removed, they cannot respect consent.

## Withdrawing consent

Any `fivex-consent="open-preferences"` element opens the preferences with the checkboxes reflecting the current decision. If a stored grant (a category, or "Immer erlauben") that actually started a script is revoked, the library erases the service's cookies (host and parent domains, wildcard names supported) and **reloads the page** so already-running scripts stop. Nothing is reloaded for content the visitor released for one page view only ("Inhalt laden"), and another tab's "Immer erlauben" never reloads this tab. On every decision, and at the start of every page load without a valid decision (never decided, new `revision`, expired), the cookies of **every** configured service that is not allowed are erased, whether or not it ran on that page; this also removes cookies that a script rewrote while the page unloaded. Cookies set by the vendor's own domain (e.g. `__cf_bm`, `vuid`, `IDE`) and HttpOnly cookies cannot be removed from JavaScript; they stay in the browser but are not sent to your site and nothing new is requested from the vendor.

## Browser support

Evergreen browsers; there is no Internet Explorer support and no polyfills. The bundle is plain ES2020 (optional chaining, nullish coalescing). By the APIs it uses, the minimums are Chrome / Edge 86, Firefox 78 and Safari 14 (`Element.replaceChildren`); it is tested in current Chrome (end-to-end) and jsdom. Some parts are progressive: `inert` is set as an attribute on hidden panels (effective from Chrome 102, Firefox 112, Safari 15.5; the panels are hidden with `display: none` / `aria-hidden` anyway), `BroadcastChannel` is used where present (Safari 15.4) and replaced by `visibilitychange` elsewhere, `MutationObserver` picks up late embeds.

## Accessibility

Preferences get `role="dialog"`, `aria-modal="true"` and an accessible name (`aria-labelledby` the first heading inside, or `fivex-consent-label`, or a built-in text); the banner is a labelled `region`. Focus moves into the dialog on open; on close, after the other components have updated, it returns to the element that opened the dialog, or, if that is hidden by then (for example the banner button after saving), to a visible `open-preferences` trigger, the manager, or the first focusable element of the page. Tab is trapped and skips hidden, inert and disabled elements, Esc closes. Components carry `aria-hidden` / `inert` while hidden. Embed placeholders are real buttons inside a labelled group. Keep visible focus styles in your Webflow button styles, and do not make "Alle ablehnen" less prominent than "Alle akzeptieren".

## Security and privacy

- Pin a release tag. jsDelivr itself is the only third party contacted before consent (it serves this script and thus receives the visitor's IP): mention it in your privacy policy, or self-host `consent.min.js`.
- No requests to vendors before consent, no `eval`. `fivex-consent-html` is parsed in an inert `<template>` and rebuilt through an [allow-list sanitizer](#html-sanitizer); the markup should still come from trusted authors. Service ids are regex-validated before use in URLs.
- Consent is stored only in the first-party cookie, nothing is sent anywhere. There is no consent log endpoint; if you need proof of consent, build that on top.
- Scripts are blocked via `type="fivex-consent"`, not intercepted: a vendor tag left in the page as a normal `<script>` (Webflow Custom Code, Designer embeds) will run for everybody.

## Launch consent checklist

- [ ] Scan the published site (browser dev tools network + application tab, or a scanner) for third-party scripts, iframes, pixels, fonts and cookies on **every page template**, including CMS and 404.
- [ ] Every third party found is either configured in `services` or removed.
- [ ] No vendor tag remains as plain `<script>` / `<iframe src>` in Page Settings, Project Settings or embeds; remove `noscript` pixels.
- [ ] Hard reload in a fresh private window: nothing but jsDelivr and your own origin before the choice; after "Alle ablehnen" nothing new loads.
- [ ] After "Alle akzeptieren" each expected cookie appears; after withdrawing, they are gone.
- [ ] "Alle ablehnen" is as prominent as "Alle akzeptieren"; footer has the open-preferences link.
- [ ] Privacy policy lists all services, the consent cookie `fivex_consent` and jsDelivr; links to imprint and privacy work from the banner.
- [ ] Tag is pinned; `revision` bumped if services changed.

## Migrating a Finsweet Cookie Consent v1 banner

Remove the Finsweet script and swap the attributes. The concepts map one to one:

| Finsweet v1 | This package |
| --- | --- |
| `fs-cc="banner"`, `preferences`, `manager` | `fivex-consent="banner"`, `preferences`, `manager` |
| `fs-cc="allow"`, `deny`, `close`, `submit`, `open-preferences`, `interaction` | same values on `fivex-consent` |
| `fs-cc-checkbox="marketing"`, `analytics` | `fivex-consent-checkbox="marketing"`, `analytics` |
| `fs-cc-checkbox="personalization"` | `fivex-consent-checkbox="functional"` |
| `type="fs-cc"` + `fs-cc-categories="..."` | `type="fivex-consent"` + `fivex-consent-categories="..."` (`essential` is not needed, `personalization` becomes `functional`) |
| `fs-cc-src` on an iframe, `fs-cc-placeholder="#sel"` | `fivex-consent-src`, `fivex-consent-placeholder="#sel"` |
| `fs-cc-scroll="disable"` | `fivex-consent-scroll="lock"` |
| `fs-cc-display` | `fivex-consent-display` |
| `fs-cc-expires` on the script tag | `expires` in `window.FivexConsent` |
| `fs-cc-mode`, `fs-cc-endpoint`, `fs-cc-source`, `fs-cc-domain` | not supported (opt-in only, no consent log, `cookieDomain` in config) |

## Development

```
pnpm install   # from the repo root
pnpm --filter webflow-cookie-consent lint
pnpm --filter webflow-cookie-consent test
pnpm --filter webflow-cookie-consent build   # dist/consent.js + dist/consent.min.js (commit them: jsDelivr serves from git)
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" pnpm --filter webflow-cookie-consent test:e2e
```

**End-to-end test (`e2e/`).** `pnpm test:e2e` serves `e2e/demo.html` (a designed banner and preferences built from `fivex-consent` attributes, configured with ga4, clarity, meta-pixel, youtube, vimeo, calendly and google-maps; Google Tag Manager variants via `?gtm=default|before|marketing`) together with the built `dist/consent.min.js`, drives it in a real Chrome through `playwright-core` (no browser download; point `CHROME_PATH` at a local Chrome/Chromium) and asserts: zero third-party requests and no cookies/storage before a choice and after "deny all" (also after reload); every service loads after "allow all" and the GA4 cookies appear; "only analytics" loads only ga4/clarity; withdrawal reloads the page, removes the site's first-party vendor cookies and requests nothing on reload; embed placeholders ("Inhalt laden" loads only that embed, "Immer erlauben" persists it but the banner stays); a revision bump re-shows the banner; Esc closes the preferences and the focus trap holds; Google Tag Manager does not request `gtm.js` before consent or after "deny all", loads after consent to its category (not after consent to another one), sets Consent Mode defaults to denied and updates them, and with `beforeConsent: true` loads only the container before consent, with all signals denied. It needs network access to the real vendors (public demo ids; no account needed). It also serves small pages for the regression checks: the `fivex-consent-html` sanitizer against script payloads, Webflow-interaction banners with the documented `defer` include (stand-ins for jQuery-ready and `Webflow.push` timing), focus return and hidden iframes, script order, a withdrawal in a second tab and embeds added after load. Further live checks: every container service (Calendly, Typeform, Tally, Trustpilot, Instagram, X, Cal.com, HubSpot, Wistia) renders for two sequential "Inhalt laden" clicks and for a late container after "allow all" (the HubSpot form loads without the tracking code), Consent Mode signals for gtm + ga4 and ga4 + google-ads in both orders, one-off loads surviving "Nur notwendige" and another tab's "Immer erlauben" (typed text stays), Webflow-interaction banners without waiting for `load` / with a missing webflow.js / with delayed `display` switches, `id` / `name` stripping in a real browser, and back/forward cache restore. Run `pnpm build` first.

- `src/services/<id>.ts`: one file per service (`ServiceDef`, see `src/types.ts`). Add a file and it is picked up automatically. Only list cookies you verified: every `cookies` entry needs `evidence` (`observed` and/or `vendor-docs`), and the service needs a `verification` record (how the loader was proven, what was observed, on which live sites) and the documentation URLs in `sources`.
- `UPDATE_SOURCES=1 pnpm test` regenerates `SOURCES.md`; the tests fail if it is stale. After re-verifying a vendor, update `cookies`, `verification` and `sources` in its service file, then regenerate.
- `src/constants.ts` holds the attribute prefix, global name and cookie name; every selector derives from it.
- `devNote` (SOURCES.md only, never rendered) holds integration caveats and test findings; `visitorNote` is an optional short remark in visitor language that the service list renders after the description.
- Tests (vitest + jsdom, 320 unit tests) cover the service registry (including evidence and verification records for every service), the HTML sanitizer corpus, banner / preferences flow, blocked scripts (document order), embeds and placeholders, revision handling, withdrawal and cookie erasure, cookie validation, accessibility names and focus handling, Webflow interactions, cross-tab handling, late embeds, and Consent Mode ordering for Google Tag Manager, GA4 and Clarity.

## Legal note

The component provides the technical consent mechanism. Site owners remain responsible for their privacy policy, for the legal assessment of the services they enable and for keeping the cookie information current.

## License

MIT
