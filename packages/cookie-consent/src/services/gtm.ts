/**
 * Google Tag Manager with Consent Mode v2.
 * cfg: { id: "GTM-XXXXXX", category?: "analytics" | "marketing" | "functional", beforeConsent?: boolean }
 *
 * Default: the container loads only after the visitor consented to `category` (default "analytics");
 * Consent Mode signals follow the visitor's choices. `beforeConsent: true` is an explicit opt-in that
 * loads the container on every page view with all signals denied (the IP address reaches Google before
 * consent). Tags inside the container must use the Consent Mode signals (built-in / additional consent
 * checks) or fire on the dataLayer events this package pushes.
 */
import type { ServiceDef } from "../types";
import { getDataLayer, setConsentDefaults, syncGoogleConsent } from "../lib/google";

const service: ServiceDef = {
  id: "gtm",
  vendor: "Google Ireland Limited",
  vendorUrl: "https://tagmanager.google.com/",
  privacyUrl: "https://policies.google.com/privacy",
  category: "analytics",
  categories: ["analytics", "marketing", "functional"],
  loadsBeforeConsent: (cfg) => cfg.beforeConsent === true,
  label: { de: "Google Tag Manager", en: "Google Tag Manager" },
  description: {
    de: "Lädt und steuert weitere Dienste (Tags) der Website. Dabei wird Ihre IP-Adresse an Server von Google übertragen; welche Daten die Tags verarbeiten, hängt von der Konfiguration ab.",
    en: "Loads and manages further services (tags) on the website. Your IP address is transmitted to Google servers; which data the tags process depends on the container configuration.",
  },
  cookies: [],
  devNote: {
    de: "Standardmäßig wird der Container erst nach Einwilligung in die gewählte Kategorie geladen (cfg.category, Standard: Statistik); die Consent-Mode-Signale folgen der Auswahl der Besucher. Mit beforeConsent: true wird der Container ohne Einwilligung geladen (alle Signale „denied“), dabei wird die IP-Adresse an Google übertragen. Der Container selbst setzt keine Cookies. Jedes Tag im Container MUSS die Consent-Signale oder die vom Paket gepushten dataLayer-Events als Bedingung nutzen.",
    en: "By default the container loads only after consent to the chosen category (cfg.category, default analytics); the Consent Mode signals follow the visitor's choices. With beforeConsent: true the container loads without consent (all signals denied) and the IP address is transmitted to Google. The container itself sets no cookies. EVERY tag inside the container MUST require the consent signals or the dataLayer events this package pushes.",
  },
  visitorNote: {
    de: "Der Tag Manager selbst setzt keine Cookies; die über ihn geladenen Dienste können es tun.",
    en: "The Tag Manager itself sets no cookies; services loaded through it may do so.",
  },
  verification: {
    date: "2026-10-11",
    loader: "gtm.js was requested only after consent (no request before consent or after \"deny all\", also with beforeConsent unset); with beforeConsent: true it is requested on load with all signals denied and the signals are updated on every decision. The container id format is validated.",
    observed: "A container without tags sets no cookies or storage (sandbox, test container id).",
  },
  sources: ["https://support.google.com/tagmanager/answer/10718549", "https://developers.google.com/tag-platform/security/guides/consent"],
  init(ctx) {
    setConsentDefaults(ctx.win);
  },
  async load(ctx) {
    const id = String(ctx.cfg.id ?? "");
    if (!/^GTM-[A-Z0-9]+$/.test(id)) {
      console.warn("[FivexConsent] gtm: invalid id");
      return;
    }
    setConsentDefaults(ctx.win);
    syncGoogleConsent(ctx);
    getDataLayer(ctx.win).push({ "gtm.start": Date.now(), event: "gtm.js" });
    await ctx.loadScript("https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(id));
  },
  /** Later decisions only update the signals. */
  update(ctx) {
    syncGoogleConsent(ctx);
  },
};
export default service;
