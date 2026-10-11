/**
 * Google Ads conversion measurement / remarketing (gtag.js), Consent Mode v2.
 * cfg: { id: "AW-123456789" }
 * Conversion events are sent by the page itself: gtag('event','conversion',{send_to:'AW-123456789/LABEL'}).
 */
import type { ServiceDef } from "../types";
import { setConsentDefaults, syncGoogleConsent, ensureGtag } from "../lib/google";

const service: ServiceDef = {
  id: "google-ads",
  vendor: "Google Ireland Limited",
  vendorUrl: "https://ads.google.com/",
  privacyUrl: "https://policies.google.com/privacy",
  category: "marketing",
  label: { de: "Google Ads", en: "Google Ads" },
  description: {
    de: "Misst den Erfolg von Werbeanzeigen und ermöglicht Remarketing. Dabei werden Ihre IP-Adresse und Nutzungsdaten an Server von Google übertragen.",
    en: "Measures the success of ads and enables remarketing. Your IP address and usage data are transmitted to Google servers.",
  },
  cookies: [
    {
      name: "_gcl_au",
      duration: { de: "90 Tage", en: "90 days" },
      description: { de: "Speichert und verfolgt Anzeigen-Conversions (First-Party).", en: "Stores and tracks ad conversions (first-party)." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "_gcl_aw",
      duration: { de: "90 Tage", en: "90 days" },
      description: { de: "Speichert Klickinformationen aus Google Ads zur Conversion-Messung.", en: "Stores click information from Google Ads for conversion measurement." },
      evidence: ["vendor-docs"],
    },
    {
      name: "_gcl_ls",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Zwischenspeicher für Consent-/Conversion-Daten von Google (Local Storage der Website).", en: "Google's consent/conversion cache (local storage of the site)." },
      evidence: ["observed"],
    },
    {
      name: "IDE",
      duration: { de: "13 Monate (EWR/UK), sonst 24 Monate", en: "13 months (EEA/UK), otherwise 24 months" },
      description: { de: "Drittanbieter-Cookie von doubleclick.net für Anzeigenauslieferung und Messung.", en: "Third-party cookie from doubleclick.net for ad serving and measurement." },
      evidence: ["vendor-docs"],
    },
    {
      name: "test_cookie",
      duration: { de: "15 Minuten", en: "15 minutes" },
      description: { de: "Prüft, ob der Browser Cookies zulässt (doubleclick.net).", en: "Checks whether the browser allows cookies (doubleclick.net)." },
      evidence: ["observed", "vendor-docs"],
    },
  ],
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. gtag.js loaded with a test conversion id (HTTP 200).",
    observed: "Cookies and local storage observed in the sandbox; IDE and _gcl_aw are in Google's ads cookie documentation.",
  },
  sources: ["https://business.safety.google/adscookies/"],
  init(ctx) {
    setConsentDefaults(ctx.win);
  },
  async load(ctx) {
    const id = String(ctx.cfg.id ?? "");
    if (!/^AW-[0-9]+$/.test(id)) {
      console.warn("[FivexConsent] google-ads: invalid id");
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
