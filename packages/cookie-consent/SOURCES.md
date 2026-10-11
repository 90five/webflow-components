# Sources

Generated from `src/services/*.ts` (run `UPDATE_SOURCES=1 pnpm test` to regenerate; the test fails when this file is out of date).

## Method and release rule

A service is part of the package only if

1. every listed cookie / storage entry is backed by evidence, and
2. its loader or embed was shown to work (script or iframe loads after consent, no errors from the loader).

Evidence per entry:

- **observed**: seen in a real Chrome in a fresh profile, either in a sandbox page that loads the service through this package, or on a live website that runs the tool. An entry counts for a vendor only when the attribution is clear (cookie domain of the vendor, `Set-Cookie` response from a vendor host, or the writing script was loaded from a vendor domain). Durations are the observed expiry, rounded.
- **vendor-docs**: listed in the vendor's official documentation (URL below). Where a documented entry could not be observed, the documented duration is used.

Entries that rest only on third-party collections are not included. The date above is the day of verification; vendors change cookie names and durations over time, so re-check before relying on the tables.

Services: 38.

### Adobe Fonts (`adobe-fonts`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: The kit stylesheet <link> is added only after consent and https://use.typekit.net/<kit>.css is requested (the endpoint answers; kits are restricted to their licensed domains, so a stylesheet body is only served there). Same URL pattern as on fonts.adobe.com.
- Observation: No cookies or storage keys from Adobe Fonts were observed; Adobe's privacy page states that the Adobe Fonts service for websites does not set or use cookies.
- Observed on live websites: https://fonts.adobe.com/
- Entries (cookies / storage keys):
  - none (no cookies or storage keys)
- Note: According to Adobe, data such as web project ID, account ID and hostname is collected (billing, licensing); the IP address is not stored.
- Vendor documentation:
  - https://www.adobe.com/privacy/typekit.html

### Cal.com (`cal-com`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. The embed script and an inline booking page (app.cal.com) loaded; window.Cal queue stub works. Two containers released one after another, a late container after "allow all" and two at once each rendered an inline booking page (one Cal.com namespace per container; a second inline embed in the same namespace is ignored by Cal.com).
- Observation: Cookie __cf_bm set by cal.com observed in the sandbox (public demo link).
- Entries (cookies / storage keys):
  - `__cf_bm` (cookie) · 30 minutes · evidence: observed
- Note: Per Cal.com's privacy page the app uses cookies for login, preferences and security and no third-party advertising cookies. Only __cf_bm was set in the test; further cookies may appear during an actual booking.
- Vendor documentation:
  - https://cal.com/docs/llms.txt
  - https://cal.com/privacy

### Calendly (`calendly`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. widget.js and an inline booking widget (public demo account) loaded. Two containers released one after another, a late container after "allow all" and two containers at once each rendered an inline widget (Calendly.initInlineWidget for containers released after widget.js ran).
- Observation: Cookies and storage keys of calendly.com observed in the sandbox. Entries written by embedded third parties (Stripe, reCAPTCHA) are not attributed to Calendly.
- Entries (cookies / storage keys):
  - `__cf_bm` (cookie) · 30 minutes · evidence: observed
  - `_cfuvid` (cookie) · session · evidence: observed
  - `OptanonConsent` (cookie) · 12 months · evidence: observed
  - `_cache` (localStorage) · persistent · evidence: observed
- Note: The Calendly widget loads further services (Stripe, Google reCAPTCHA, OneTrust). Their entries (Stripe: cookie m and session storage keys _ab, _mf; reCAPTCHA: rc::a, rc::c) do not come from a Calendly origin and are therefore not listed. Scope can vary per Calendly account.
- Vendor documentation:
  - https://calendly.com/help/embed-options-overview
  - https://calendly.com/privacy

### Microsoft Clarity (`clarity`)

- Category: analytics
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. scripts.clarity.ms loaded and ran with a real project id taken from Microsoft Clarity's own website (tag request 200, no errors).
- Observation: Cookies and session storage observed in the sandbox with a real project id and on live websites; cookie names also listed in Microsoft's documentation.
- Observed on live websites: https://clarity.microsoft.com/, https://www.brevo.com/
- Entries (cookies / storage keys):
  - `_clck` (cookie) · 1 year · evidence: observed, vendor-docs
  - `_clsk` (cookie) · 1 day · evidence: observed, vendor-docs
  - `MUID` (cookie) · 13 months · evidence: observed, vendor-docs
  - `MR` (cookie) · 7 days · evidence: observed, vendor-docs
  - `ANONCHK` (cookie) · 10 minutes · evidence: observed, vendor-docs
  - `SM` (cookie) · session · evidence: observed, vendor-docs
  - `_cltk` (sessionStorage) · session · evidence: observed
  - `SRM_B` (cookie) · 13 months · evidence: observed
- Vendor documentation:
  - https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-cookies
  - https://learn.microsoft.com/en-us/clarity/setup-and-installation/cookie-consent

### Crisp Chat (`crisp`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. client.crisp.chat/l.js loaded (HTTP 200) with the $crisp stub from Crisp's official snippet.
- Observation: Cookie and local storage entries observed on crisp.chat (writer: client.crisp.chat); name pattern and 6-month default expiry are in Crisp's cookie policy.
- Observed on live websites: https://crisp.chat/en/
- Entries (cookies / storage keys):
  - `crisp-client%2F*` (cookie) · 6 months · evidence: observed, vendor-docs
  - `crisp-client/*` (localStorage) · persistent (until cleared) · evidence: observed
- Vendor documentation:
  - https://help.crisp.chat/en/article/crisp-chatbox-cookie-and-ip-policy-1147xor/

### Fathom Analytics (`fathom`)

- Category: analytics
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. cdn.usefathom.com/script.js loaded (HTTP 200) with a site id; no errors.
- Observation: No cookies or storage keys observed; Fathom's documentation states that the embed script uses no cookies or similar technologies.
- Entries (cookies / storage keys):
  - none (no cookies or storage keys)
- Vendor documentation:
  - https://usefathom.com/docs/script/script-advanced
  - https://usefathom.com/docs/legal/privacy-policy-sample

### Google Analytics 4 (`ga4`)

- Category: analytics
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. gtag.js loaded with a real measurement id (HTTP 200); Consent Mode defaults are set before the script without any request to Google.
- Observation: _ga and _ga_<id> observed in the sandbox with a real measurement id; names and 2-year default duration in Google's documentation (Chrome caps cookie lifetime at 400 days).
- Entries (cookies / storage keys):
  - `_ga` (cookie) · 2 years · evidence: observed, vendor-docs
  - `_ga_*` (cookie) · 2 years · evidence: observed, vendor-docs
- Note: Consent Mode v2 (basic): no Google script is loaded and no data is sent before consent. ad_user_data and ad_personalization are not sent (default denied) unless the site sets ads: true or configures gtm or google-ads; then they follow the marketing consent. A Tag Manager container loaded with beforeConsent is a separate service and loads before consent. Chrome caps cookie lifetime at 400 days; the value shown is the default documented by Google.
- Vendor documentation:
  - https://support.google.com/analytics/answer/11397207

### Google Ads (`google-ads`)

- Category: marketing
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. gtag.js loaded with a test conversion id (HTTP 200).
- Observation: Cookies and local storage observed in the sandbox; IDE and _gcl_aw are in Google's ads cookie documentation.
- Entries (cookies / storage keys):
  - `_gcl_au` (cookie) · 90 days · evidence: observed, vendor-docs
  - `_gcl_aw` (cookie) · 90 days · evidence: vendor-docs
  - `_gcl_ls` (localStorage) · persistent · evidence: observed
  - `IDE` (cookie) · 13 months (EEA/UK), otherwise 24 months · evidence: vendor-docs
  - `test_cookie` (cookie) · 15 minutes · evidence: observed, vendor-docs
- Vendor documentation:
  - https://business.safety.google/adscookies/

### Google Fonts (`google-fonts`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: The library loads nothing for this service; fonts come from the site's own CSS and cannot be gated.
- Observation: Not applicable (no loader). Google's documentation states that the Google Fonts API does not set or log cookies.
- Entries (cookies / storage keys):
  - none (no cookies or storage keys)
- Note: The library loads nothing for this service and cannot block Google Fonts (included via CSS): self-hosting is best. Your IP address is transmitted to Google on request; according to Google the Google Fonts API does not set cookies.
- Vendor documentation:
  - https://developers.google.com/fonts/faq/privacy

### Google Maps (`google-maps`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. The iframe (google.com/maps/embed) loads only after consent or a click on the placeholder; the host check applies.
- Observation: Embed loaded in the sandbox (standard share-embed URL and output=embed URL): no cookies, one session storage key observed.
- Entries (cookies / storage keys):
  - `__sak` (sessionStorage) · session · evidence: observed
- Note: In our tests the embedded map set no cookies; only one session storage entry was observed.
- Vendor documentation:
  - https://developers.google.com/maps/documentation/embed/get-started
  - https://policies.google.com/technologies/cookies

### Google Tag Manager (`gtm`)

- Category: analytics
- Verified: 2026-10-11
- Loader / embed: gtm.js was requested only after consent (no request before consent or after "deny all", also with beforeConsent unset); with beforeConsent: true it is requested on load with all signals denied and the signals are updated on every decision. The container id format is validated.
- Observation: A container without tags sets no cookies or storage (sandbox, test container id).
- Entries (cookies / storage keys):
  - none
- Note: By default the container loads only after consent to the chosen category (cfg.category, default analytics); the Consent Mode signals follow the visitor's choices. With beforeConsent: true the container loads without consent (all signals denied) and the IP address is transmitted to Google. The container itself sets no cookies. EVERY tag inside the container MUST require the consent signals or the dataLayer events this package pushes.
- Vendor documentation:
  - https://support.google.com/tagmanager/answer/10718549
  - https://developers.google.com/tag-platform/security/guides/consent

### hCaptcha (`hcaptcha`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. api.js loaded and a widget rendered with hCaptcha's official test site key.
- Observation: Cookie __cf_bm observed in the sandbox.
- Entries (cookies / storage keys):
  - `__cf_bm` (cookie) · 30 minutes · evidence: observed, vendor-docs
- Note: hCaptcha also mentions localStorage entries; none were observed with the test key.
- Vendor documentation:
  - https://docs.hcaptcha.com/faq/
  - https://www.hcaptcha.com/privacy

### Hotjar (`hotjar`)

- Category: analytics
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. static.hotjar.com/c/hotjar-<id>.js?sv=<n> loaded (HTTP 200), the Hotjar modules loaded and the session started with a real site id, no errors.
- Observation: Cookies and storage keys observed on live websites running Hotjar (writer: script.hotjar.com) and in the sandbox with a real site id; the names of the cookies are also in Hotjar's own cookie documentation.
- Observed on live websites: https://www.intercom.com/, https://www.trustpilot.com/, https://help.hotjar.com/
- Entries (cookies / storage keys):
  - `_hjSessionUser_*` (cookie) · 1 year · evidence: observed, vendor-docs
  - `_hjSession_*` (cookie) · 30 minutes · evidence: observed, vendor-docs
  - `_hjHasCachedUserAttributes` (cookie) · session · evidence: observed, vendor-docs
  - `_hjUserAttributesHash` (cookie) · 2 minutes · evidence: observed, vendor-docs
  - `_hjUserAttributes` (localStorage) · persistent (until cleared) · evidence: observed
  - `hjActiveViewportIds` (localStorage) · persistent (until cleared) · evidence: observed
  - `hjViewportId` (sessionStorage) · session · evidence: observed
- Vendor documentation:
  - https://help.hotjar.com/hc/en-us/articles/115011789248-Hotjar-Cookie-Information

### HubSpot (`hubspot`)

- Category: marketing
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. js.hs-scripts.com/<portalId>.js loaded after consent. A public form (portal 53) rendered in two containers released one after another, in a late container after "allow all" and in two at once, from js.hsforms.net/forms/embed/v2.js with hbspt.forms.create. A one-off load requested only js.hsforms.net, forms.hsforms.com and forms-na1.hsforms.com (set __cf_bm on hsforms.net / hsforms.com) and never js.hs-scripts.com; the tracking code was requested only after the marketing consent.
- Observation: Tracking cookies observed on hubspot.com (writer: js.hs-analytics.net); the full list and durations are in HubSpot's documentation.
- Observed on live websites: https://www.hubspot.com/
- Entries (cookies / storage keys):
  - `__hstc` (cookie) · 6 months · evidence: vendor-docs
  - `hubspotutk` (cookie) · 6 months · evidence: vendor-docs
  - `__hssc` (cookie) · 30 minutes · evidence: vendor-docs
  - `__hssrc` (cookie) · session · evidence: vendor-docs
  - `messagesUtk` (cookie) · 6 months · evidence: vendor-docs
  - `hs-messages-is-open` (cookie) · 30 minutes · evidence: vendor-docs
  - `hs-messages-hide-welcome-message` (cookie) · 1 day · evidence: vendor-docs
  - `__cf_bm` (cookie) · 30 minutes · evidence: observed, vendor-docs
- Note: Depending on setup HubSpot may set further cookies (e.g. __hs_opt_out, __hs_cookie_cat_pref). A form released with "Load content" / "Always allow" loads only js.hsforms.net/forms/embed/v2.js, never the tracking code (js.hs-scripts.com), which starts only with the marketing consent. A HubSpot portal can inject additional ad pixels (e.g. Meta) through its tracking code; these need the respective service configured separately (e.g. meta-pixel) and are not controlled by this package.
- Vendor documentation:
  - https://knowledge.hubspot.com/privacy-and-consent/what-cookies-does-hubspot-set-in-a-visitor-s-browser

### Instagram (`instagram`)

- Category: marketing
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. embed.js and a public post embed loaded. Two blockquote containers released one after another, a late container after "allow all" and two at once each rendered the post (instgrm.Embeds.process()).
- Observation: Cookie csrftoken observed in the sandbox with a public post embed.
- Entries (cookies / storage keys):
  - `csrftoken` (cookie) · 13 months · evidence: observed
- Vendor documentation:
  - https://privacycenter.instagram.com/policy/cookies
  - https://developers.facebook.com/docs/instagram-platform/oembed

### Intercom (`intercom`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. widget.intercom.io/widget/<appId> loaded and the Messenger booted with a real app id taken from Intercom's own website (origin intercom.com).
- Observation: Cookies and local storage keys observed in the sandbox with a real app id; names and durations also in Intercom's documentation.
- Observed on live websites: https://www.intercom.com/
- Entries (cookies / storage keys):
  - `intercom-id-*` (cookie) · 9 months (270 days) · evidence: observed
  - `intercom-session-*` (cookie) · 7 days (adjustable) · evidence: observed, vendor-docs
  - `intercom-device-id-*` (cookie) · 9 months (270 days) · evidence: observed, vendor-docs
  - `intercom.intercom-state-*` (localStorage) · persistent (until cleared) · evidence: observed
- Vendor documentation:
  - https://www.intercom.com/help/en/articles/2361922-intercom-messenger-cookies

### LinkedIn Insight Tag (`linkedin-insight`)

- Category: marketing
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. insight.min.js loaded and page-view beacons were sent to px.ads.linkedin.com.
- Observation: Cookies observed in the sandbox; durations also in LinkedIn's cookie table.
- Entries (cookies / storage keys):
  - `bcookie` (cookie) · 1 year · evidence: observed, vendor-docs
  - `lidc` (cookie) · 24 hours · evidence: observed, vendor-docs
  - `li_gc` (cookie) · 6 months · evidence: observed, vendor-docs
  - `__cf_bm` (cookie) · 30 minutes · evidence: observed
- Note: Names and durations are taken from LinkedIn's cookie table and were confirmed (bcookie, lidc, li_gc).
- Vendor documentation:
  - https://www.linkedin.com/legal/l/cookie-table
  - https://www.linkedin.com/legal/cookie-policy

### Loom (`loom`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. The embed iframe loaded with a public sample video.
- Observation: Cookies, local/session storage and IndexedDB observed in the sandbox with a public sample video and on loom.com (writer: cdn.loom.com).
- Observed on live websites: https://www.loom.com/
- Entries (cookies / storage keys):
  - `loom_anon_comment` (cookie) · 12 months · evidence: observed
  - `ajs_anonymous_id` (cookie) · 12 months · evidence: observed
  - `ajs_anonymous_id` (localStorage) · persistent · evidence: observed
  - `statsig.session_id.*` (localStorage) · persistent · evidence: observed
  - `statsig.stable_id.*` (localStorage) · persistent · evidence: observed
  - `awc.session.id` (localStorage) · persistent · evidence: observed
  - `awc.session.expiry` (localStorage) · persistent · evidence: observed
  - `awc.*` (sessionStorage) · session · evidence: observed
  - `sentryReplaySession` (sessionStorage) · session · evidence: observed
  - `analytics-web-client` (indexedDB) · persistent · evidence: observed
  - `viewer_session_data` (localStorage) · persistent (until cleared) · evidence: observed
- Vendor documentation:
  - https://www.atlassian.com/legal/privacy-policy

### Matomo (`matomo`)

- Category: analytics
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. matomo.js loaded from the public demo instance.
- Observation: _pk_id and _pk_ses observed in the sandbox; _pk_ref is in Matomo's cookie documentation.
- Entries (cookies / storage keys):
  - `_pk_id.*` (cookie) · 13 months · evidence: observed, vendor-docs
  - `_pk_ses.*` (cookie) · 30 minutes · evidence: observed, vendor-docs
  - `_pk_ref.*` (cookie) · 6 months · evidence: vendor-docs
- Note: Matomo can also run without cookies; this entry assumes the default mode with cookies. Optional features (e.g. heatmaps, A/B tests) set further cookies.
- Vendor documentation:
  - https://matomo.org/faq/general/faq_146/
  - https://developer.matomo.org/guides/tracking-javascript-guide

### Meta Pixel (`meta-pixel`)

- Category: marketing
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. fbevents.js, the pixel configuration and the PageView beacon (facebook.com/tr) worked with a real pixel id taken from a live website.
- Observation: _fbp, _fbc (with a fbclid in the URL) and local storage keys observed in the sandbox; _fbp also on a live website (writer: fbevents.js).
- Observed on live websites: https://contentsquare.com/hotjar/
- Entries (cookies / storage keys):
  - `_fbp` (cookie) · 3 months · evidence: observed, vendor-docs
  - `_fbc` (cookie) · 3 months · evidence: observed, vendor-docs
  - `lastExternalReferrer` (localStorage) · persistent (until cleared) · evidence: observed
  - `lastExternalReferrerTime` (localStorage) · persistent (until cleared) · evidence: observed
  - `multiFbc` (localStorage) · persistent (until cleared) · evidence: observed
- Vendor documentation:
  - https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/fbp-and-fbc
  - https://developers.facebook.com/docs/meta-pixel/implementation/gdpr

### Microsoft Advertising (UET) (`microsoft-uet`)

- Category: marketing
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. bat.js loaded; /action beacons returned 204.
- Observation: Cookies and local storage keys observed in the sandbox (writer: bat.bing.com) and on live websites.
- Observed on live websites: https://www.brevo.com/, https://www.intercom.com/
- Entries (cookies / storage keys):
  - `_uetvid` (cookie) · 13 months (390 days) · evidence: observed
  - `_uetsid` (cookie) · 24 hours · evidence: observed
  - `MUID` (cookie) · 13 months (390 days) · evidence: observed
  - `_uetvid` (localStorage) · persistent · evidence: observed
  - `_uetsid` (localStorage) · persistent · evidence: observed
  - `_uetvid_exp` (localStorage) · persistent (until cleared) · evidence: observed
  - `_uetsid_exp` (localStorage) · persistent (until cleared) · evidence: observed
- Note: Microsoft states no durations in its official documentation; the values come from observation.
- Vendor documentation:
  - https://help.ads.microsoft.com/apex/index/3/en/60119
  - https://learn.microsoft.com/en-us/advertising/guides/universal-event-tracking?view=bingads-13

### OpenStreetMap (`openstreetmap`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. The embed iframe loaded; tiles come from tile.openstreetmap.org.
- Observation: No cookies or storage keys observed in the sandbox.
- Entries (cookies / storage keys):
  - none (no cookies or storage keys)
- Note: The embed set no cookies or storage entries.
- Vendor documentation:
  - https://osmfoundation.org/wiki/Privacy_Policy

### Pinterest Tag (`pinterest-tag`)

- Category: marketing
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. s.pinimg.com/ct/core.js loaded and ct.pinterest.com beacons were sent with a real tag id taken from a live website.
- Observation: _pin_unauth, _epik (with an epik parameter in the URL) and session storage observed in the sandbox with a real tag id.
- Entries (cookies / storage keys):
  - `_pin_unauth` (cookie) · 12 months · evidence: observed
  - `_epik` (cookie) · 12 months · evidence: observed
  - `is_eu` (sessionStorage) · session · evidence: observed
- Vendor documentation:
  - https://help.pinterest.com/en/business/article/track-conversions-with-pinterest-tag
  - https://policy.pinterest.com/en/cookies

### Plausible Analytics (`plausible`)

- Category: analytics
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. plausible.io/js/script.js loaded (HTTP 200).
- Observation: No cookies or storage keys observed; Plausible's data policy states that no cookies are used.
- Entries (cookies / storage keys):
  - none (no cookies or storage keys)
- Vendor documentation:
  - https://plausible.io/data-policy

### Google reCAPTCHA (`recaptcha`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. api.js loaded and a v2 widget rendered with Google's official test site key.
- Observation: Cookie and storage keys observed in the sandbox; _GRECAPTCHA also in Google's FAQ.
- Entries (cookies / storage keys):
  - `_GRECAPTCHA` (cookie) · 6 months · evidence: observed, vendor-docs
  - `_grecaptcha` (localStorage) · persistent · evidence: observed
  - `rc::a` (localStorage) · persistent · evidence: observed
  - `rc::f` (localStorage) · persistent · evidence: observed
  - `rc::b` (sessionStorage) · session · evidence: observed
  - `rc::c` (sessionStorage) · session · evidence: observed
- Note: Forms that require reCAPTCHA will not work without consent. Alternative domain: www.recaptcha.net.
- Vendor documentation:
  - https://docs.cloud.google.com/recaptcha/docs/faq

### SoundCloud (`soundcloud`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. A public track embed loaded.
- Observation: Local storage key observed in the sandbox.
- Entries (cookies / storage keys):
  - `ddSession_datadome` (localStorage) · persistent · evidence: observed
- Note: The player also writes a key "getItem" to session storage.
- Vendor documentation:
  - https://soundcloud.com/pages/privacy

### Spotify (`spotify`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. A public track embed loaded.
- Observation: Cookies and storage keys observed in the sandbox.
- Entries (cookies / storage keys):
  - `sp_t` (cookie) · 12 months · evidence: observed
  - `sp_landing` (cookie) · 24 hours · evidence: observed
  - `sp_last_utm` (cookie) · 60 days · evidence: observed
  - `OptanonConsent` (cookie) · 12 months · evidence: observed
  - `anonymous:*` (localStorage) · persistent · evidence: observed
  - `sentryReplaySession` (sessionStorage) · session · evidence: observed
  - `keyval-store` (indexedDB) · persistent · evidence: observed
- Note: Spotify does not list the embed's cookies; the entries come from observing a public embed.
- Vendor documentation:
  - https://www.spotify.com/us/legal/privacy-policy/

### Tally (`tally`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. The embed iframe (tally.so/embed/<id>) and widgets/embed.js loaded with a public form. Two containers (<iframe data-tally-src>) released one after another, a late container after "allow all" and two at once each loaded the form (Tally.loadEmbeds()).
- Observation: No cookies or storage keys observed in the sandbox or on tally.so's own form embed.
- Entries (cookies / storage keys):
  - none (no cookies or storage keys)
- Note: The embedded form set no cookies or storage entries in our tests.
- Vendor documentation:
  - https://tally.so/help/terms-and-privacy

### tawk.to Chat (`tawk`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. embed.tawk.to/<propertyId>/<widgetId> loaded and the chat started with a real property taken from tawk.to's own website (normal browser user agent).
- Observation: Cookies and storage keys observed in the sandbox and on tawk.to (writer: embed.tawk.to).
- Observed on live websites: https://www.tawk.to/
- Entries (cookies / storage keys):
  - `twk_uuid_*` (cookie) · 6 months · evidence: observed
  - `TawkConnectionTime` (cookie) · session · evidence: observed
  - `twk_idm_key` (cookie) · session · evidence: observed
  - `twk_*` (localStorage) · persistent (until cleared) · evidence: observed
  - `previousNav` (sessionStorage) · session · evidence: observed
- Vendor documentation:
  - https://www.tawk.to/privacy-policy/

### TikTok Pixel (`tiktok-pixel`)

- Category: marketing
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. analytics.tiktok.com/i18n/pixel/events.js loaded and beacons were sent with a real pixel code taken from a live website.
- Observation: Cookies (including ttclid, set when the landing URL carries a ttclid parameter) and session storage observed in the sandbox with a real pixel code; ttcsid_* and ttclid are in TikTok's cookie documentation.
- Entries (cookies / storage keys):
  - `_ttp` (cookie) · 13 months · evidence: observed
  - `_tt_enable_cookie` (cookie) · 13 months · evidence: observed
  - `ttcsid_*` (cookie) · 13 months (from last use) · evidence: vendor-docs
  - `tt_sessionId` (sessionStorage) · session · evidence: observed
  - `tt_pixel_session_index` (sessionStorage) · session · evidence: observed
  - `tt_appInfo` (sessionStorage) · session · evidence: observed
  - `tt_adInfo` (sessionStorage) · session · evidence: observed
  - `ttclid` (cookie) · 13 months · evidence: observed, vendor-docs
- Vendor documentation:
  - https://ads.tiktok.com/help/article/faqs-for-partner-pixels-and-cookie-enablement

### Trustpilot (`trustpilot`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. tp.widget.bootstrap.min.js loaded and rendered a TrustBox (iframe, data and view statistics requests succeeded) with a public business unit. Two containers released one after another, a late container after "allow all" and two at once each rendered a TrustBox (Trustpilot.loadFromElement).
- Observation: No cookies or storage keys observed in the sandbox or on live websites using TrustBoxes.
- Observed on live websites: https://www.vistaprint.com/, https://www.hostinger.com/
- Entries (cookies / storage keys):
  - none (no cookies or storage keys)
- Note: The review widget (TrustBox) set no cookies or storage entries in our tests; on load it sends view statistics (impression/view) to Trustpilot and your IP address is transmitted.
- Vendor documentation:
  - https://legal.trustpilot.com/for-everyone/cookie-policy

### Cloudflare Turnstile (`turnstile`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. api.js loaded and a widget rendered with Cloudflare's official test site key.
- Observation: Local storage key observed in the sandbox and on dash.cloudflare.com (origin challenges.cloudflare.com).
- Observed on live websites: https://dash.cloudflare.com/login
- Entries (cookies / storage keys):
  - `cf.turnstile.u` (localStorage) · persistent (until cleared) · evidence: observed
- Note: With pre-clearance enabled Cloudflare also issues a cf_clearance cookie (see the Cloudflare documentation).
- Vendor documentation:
  - https://developers.cloudflare.com/turnstile/get-started/pre-clearance/
  - https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/

### Typeform (`typeform`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. embed.typeform.com/next/embed.js loaded and rendered a public form (form.typeform.com) with a data-tf-widget element. Two containers released one after another, a late container after "allow all" and two containers at once each rendered the form (tf.load() for containers released after embed.js ran; data-tf-widget with a public form).
- Observation: Cookies and local storage observed on form.typeform.com in the sandbox with a public form.
- Entries (cookies / storage keys):
  - `tf_respondent_cc` (cookie) · 6 months · evidence: observed
  - `attribution_user_id` (cookie) · 1 year · evidence: observed
  - `AWSALBTGCORS` (cookie) · 7 days · evidence: observed
  - `tf_random_id` (localStorage) · persistent (until cleared) · evidence: observed
  - `*-visitorId` (localStorage) · persistent (until cleared) · evidence: observed
- Vendor documentation:
  - https://www.typeform.com/legal/cookie-policy/

### Vimeo (`vimeo`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. A public sample video loaded and played.
- Observation: Cookies and storage keys observed in the sandbox.
- Entries (cookies / storage keys):
  - `vuid` (cookie) · 13 months · evidence: observed
  - `player` (cookie) · 12 months · evidence: observed
  - `__cf_bm` (cookie) · 30 minutes · evidence: observed
  - `cf_clearance` (cookie) · 12 months · evidence: observed
  - `__cf_ob` (cookie) · session · evidence: observed
  - `LOCAL_STORAGE_ID_VIMEO_PLAYER` (localStorage) · persistent · evidence: observed
  - `LOCAL_STORAGE_ID_PICOX_ID` (localStorage) · persistent · evidence: observed
  - `PLAYER_PICOX_SAMPLING_SEED` (localStorage) · persistent · evidence: observed
  - `sync_active` (localStorage) · persistent · evidence: observed
  - `_cfPre_tabId` (sessionStorage) · session · evidence: observed
  - `orionV3` (indexedDB) · persistent · evidence: observed
  - `picox` (indexedDB) · persistent · evidence: observed
- Note: The player parameter dnt=1 does not replace consent: per Vimeo, some essential cookies stay active even then.
- Vendor documentation:
  - https://help.vimeo.com/hc/en-us/articles/12426260232977-Player-parameters-overview
  - https://vimeo.com/privacy

### Wistia (`wistia`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. A public sample video loaded as iframe and via player.js with <wistia-player>. Two <wistia-player> containers released one after another, a late container after "allow all" and two at once each rendered the player (player.js plus fast.wistia.com/embed/<id>.js).
- Observation: Local storage keys observed in the sandbox; Wistia's documentation states that the player uses local storage instead of cookies.
- Entries (cookies / storage keys):
  - `wistia` (localStorage) · persistent · evidence: observed
  - `wistia-video-progress-*` (localStorage) · persistent · evidence: observed
- Note: Per Wistia the player sets no tracking cookies and uses local storage instead; only local storage entries were observed.
- Vendor documentation:
  - https://support.wistia.com/en/articles/8264955-privacy-data-protection-and-security
  - https://wistia.com/privacy

### X (Twitter) (`x-twitter`)

- Category: marketing
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. widgets.js and a public tweet embed loaded. Two blockquote containers released one after another, a late container after "allow all" and two at once each rendered the post (twttr.widgets.load(container)).
- Observation: Cookies observed in the sandbox.
- Entries (cookies / storage keys):
  - `guest_id` (cookie) · 13 months · evidence: observed
  - `__cf_bm` (cookie) · 30 minutes · evidence: observed
  - `gt` (cookie) · 2 hours · evidence: observed
  - `__cuid` (cookie) · 13 months · evidence: observed
- Vendor documentation:
  - https://help.x.com/en/rules-and-policies/x-cookies
  - https://developer.x.com/en/docs/twitter-for-websites/embedded-tweets/overview

### YouTube (`youtube`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. The embed iframe loaded and played with youtube-nocookie.com and with youtube.com.
- Observation: Cookies and storage keys observed in the sandbox and on a page with a standard embed; no cookies with the nocookie domain.
- Entries (cookies / storage keys):
  - `YSC` (cookie) · session · evidence: observed, vendor-docs
  - `VISITOR_INFO1_LIVE` (cookie) · 6 months · evidence: observed, vendor-docs
  - `__Secure-YNID` (cookie) · 6 months · evidence: observed, vendor-docs
  - `VISITOR_PRIVACY_METADATA` (cookie) · 6 months · evidence: observed
  - `__Secure-ROLLOUT_TOKEN` (cookie) · 6 months · evidence: observed, vendor-docs
  - `test_cookie` (cookie) · 15 minutes · evidence: observed
  - `ytidb::LAST_RESULT_ENTRY_KEY` (localStorage) · persistent · evidence: observed
  - `yt-player-bandwidth` (localStorage) · persistent · evidence: observed
  - `yt-player-caption-persistence` (localStorage) · persistent · evidence: observed
  - `yt-icons-last-purged` (localStorage) · persistent · evidence: observed
  - `YtIdbMeta` (indexedDB) · persistent · evidence: observed
  - `LogsDatabaseV2:*` (indexedDB) · persistent · evidence: observed
  - `ServiceWorkerLogsDatabase` (indexedDB) · persistent · evidence: observed
- Note: With the youtube-nocookie.com domain no cookies were set in our tests (only local storage / IndexedDB), with youtube.com several. Use the nocookie domain where possible.
- Vendor documentation:
  - https://support.google.com/youtube/answer/171780
  - https://policies.google.com/technologies/cookies

### Zendesk Web Widget (`zendesk-chat`)

- Category: functional
- Verified: 2026-10-11
- Loader / embed: Loaded after consent in a real Chrome profile; no request to the vendor before consent. static.zdassets.com/ekr/snippet.js?key=<key> loaded and the widget booted with a real key taken from a live website.
- Observation: Session storage and local storage keys observed in the sandbox (writer: static.zdassets.com).
- Observed on live websites: https://www.activecampaign.com/
- Entries (cookies / storage keys):
  - `ZD-suid` (localStorage) · persistent (until cleared) · evidence: observed
  - `ZD-suid` (sessionStorage) · session · evidence: observed
  - `ZD-buid` (sessionStorage) · session · evidence: observed
  - `*.clientId` (sessionStorage) · session · evidence: observed
- Vendor documentation:
  - https://developer.zendesk.com/api-reference/widget/settings/
