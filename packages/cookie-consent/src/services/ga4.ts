/**
 * Google Analytics 4 (gtag.js), Consent Mode v2 "basic" mode.
 * cfg: { id: "G-XXXXXXXXXX", ads?: boolean }   (Measurement ID)
 *
 * The Consent Mode signals come from the shared function in lib/google.ts (one result for ga4, gtm and google-ads,
 * independent of load order): analytics_storage follows the analytics consent. ad_user_data and ad_personalization
 * are not sent (they stay denied, the Consent Mode default) unless the site opted in with `ads: true` (GA4 linked to
 * Google Ads / Google Signals) or gtm / google-ads is configured; then they follow the marketing consent.
 */
import type { ServiceDef } from "../types";
import { setConsentDefaults, syncGoogleConsent, ensureGtag } from "../lib/google";

const service: ServiceDef = {
  id: "ga4",
  vendor: "Google Ireland Limited",
  vendorUrl: "https://marketingplatform.google.com/about/analytics/",
  privacyUrl: "https://policies.google.com/privacy",
  category: "analytics",
  label: { de: "Google Analytics 4", en: "Google Analytics 4" },
  description: {
    de: "Misst, wie die Website genutzt wird (Seitenaufrufe, Herkunft, Verweildauer). Dabei wird Ihre IP-Adresse an Server von Google übertragen.",
    en: "Measures how the website is used (page views, origin, time on site). Your IP address is transmitted to Google servers.",
  },
  cookies: [
    {
      name: "_ga",
      duration: { de: "2 Jahre", en: "2 years" },
      description: { de: "Unterscheidet Besucher (Google-Analytics-Kennung).", en: "Used to distinguish users (Google Analytics identifier)." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "_ga_*",
      duration: { de: "2 Jahre", en: "2 years" },
      description: { de: "Hält den Sitzungsstatus (Container-ID als Suffix).", en: "Persists session state (container ID as suffix)." },
      evidence: ["observed", "vendor-docs"],
    },
  ],
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. gtag.js loaded with a real measurement id (HTTP 200); Consent Mode defaults are set before the script without any request to Google.",
    observed: "_ga and _ga_<id> observed in the sandbox with a real measurement id; names and 2-year default duration in Google's documentation (Chrome caps cookie lifetime at 400 days).",
  },
  devNote: {
    de: "Consent Mode v2 (Basic): Vor der Einwilligung wird kein Google-Skript geladen und es werden keine Daten gesendet. ad_user_data und ad_personalization werden nicht gesendet (Standard „denied“), außer die Website setzt ads: true oder konfiguriert gtm bzw. google-ads; dann folgen sie der Marketing-Einwilligung. Ein per beforeConsent geladener Tag Manager ist ein eigener Dienst und lädt vor der Einwilligung. Chrome begrenzt die Laufzeit von Cookies auf 400 Tage; angegeben ist der von Google dokumentierte Standardwert.",
    en: "Consent Mode v2 (basic): no Google script is loaded and no data is sent before consent. ad_user_data and ad_personalization are not sent (default denied) unless the site sets ads: true or configures gtm or google-ads; then they follow the marketing consent. A Tag Manager container loaded with beforeConsent is a separate service and loads before consent. Chrome caps cookie lifetime at 400 days; the value shown is the default documented by Google.",
  },
  visitorNote: {
    de: "Google Analytics wird erst nach Ihrer Einwilligung in Statistik geladen.",
    en: "Google Analytics is loaded only after you consent to statistics.",
  },
  sources: ["https://support.google.com/analytics/answer/11397207"],
  init(ctx) {
    setConsentDefaults(ctx.win);
  },
  async load(ctx) {
    const id = String(ctx.cfg.id ?? "");
    if (!/^G-[A-Z0-9]+$/.test(id)) {
      console.warn("[FivexConsent] ga4: invalid id");
      return;
    }
    setConsentDefaults(ctx.win);
    syncGoogleConsent(ctx);
    const gtag = ensureGtag(ctx.win);
    gtag("js", new Date());
    gtag("config", id);
    await ctx.loadScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id));
  },
  update(ctx) {
    syncGoogleConsent(ctx);
  },
};
export default service;
