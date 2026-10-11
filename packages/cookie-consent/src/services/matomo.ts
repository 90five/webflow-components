/**
 * Matomo (Cloud or self-hosted). cfg: { url: "https://example.matomo.cloud/", siteId: "1" }
 * url = base URL of the Matomo instance (https only); matomo.js and matomo.php are expected there.
 */
import type { ServiceDef } from "../types";

const service: ServiceDef = {
  id: "matomo",
  vendor: "Matomo (InnoCraft Ltd. / self-hosted)",
  vendorUrl: "https://matomo.org/",
  privacyUrl: "https://matomo.org/privacy-policy/",
  category: "analytics",
  label: { de: "Matomo", en: "Matomo" },
  description: {
    de: "Misst, wie die Website genutzt wird. Dabei wird Ihre IP-Adresse an den Matomo-Server des Betreibers übertragen (bei Matomo Cloud: Server von InnoCraft).",
    en: "Measures how the website is used. Your IP address is transmitted to the site operator's Matomo server (for Matomo Cloud: InnoCraft servers).",
  },
  cookies: [
    {
      name: "_pk_id.*",
      duration: { de: "13 Monate", en: "13 months" },
      description: { de: "Speichert die Besucher-ID.", en: "Stores the visitor ID." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "_pk_ses.*",
      duration: { de: "30 Minuten", en: "30 minutes" },
      description: { de: "Kurzlebiges Sitzungs-Cookie.", en: "Short-lived session cookie." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "_pk_ref.*",
      duration: { de: "6 Monate", en: "6 months" },
      description: { de: "Speichert die Herkunft (Referrer) des Besuchers.", en: "Stores the visitor's referrer attribution." },
      evidence: ["vendor-docs"],
    },
  ],
  devNote: {
    de: "Matomo kann auch ohne Cookies betrieben werden; dieser Eintrag geht vom Standardbetrieb mit Cookies aus. Optionale Funktionen (z. B. Heatmaps, A/B-Tests) setzen weitere Cookies.",
    en: "Matomo can also run without cookies; this entry assumes the default mode with cookies. Optional features (e.g. heatmaps, A/B tests) set further cookies.",
  },
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. matomo.js loaded from the public demo instance.",
    observed: "_pk_id and _pk_ses observed in the sandbox; _pk_ref is in Matomo's cookie documentation.",
  },
  sources: ["https://matomo.org/faq/general/faq_146/", "https://developer.matomo.org/guides/tracking-javascript-guide"],
  load(ctx) {
    let base: URL;
    try {
      base = new URL(String(ctx.cfg.url ?? ""));
    } catch {
      console.warn("[FivexConsent] matomo: invalid url");
      return;
    }
    const siteId = String(ctx.cfg.siteId ?? "");
    if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) {
      console.warn("[FivexConsent] matomo: invalid url");
      return;
    }
    if (!/^\d{1,9}$/.test(siteId)) {
      console.warn("[FivexConsent] matomo: invalid siteId");
      return;
    }
    const u = base.origin + base.pathname.replace(/\/?$/, "/");
    const paq = (ctx.win._paq = ctx.win._paq || []);
    paq.push(["trackPageView"]);
    paq.push(["enableLinkTracking"]);
    paq.push(["setTrackerUrl", u + "matomo.php"]);
    paq.push(["setSiteId", siteId]);
    return ctx.loadScript(u + "matomo.js");
  },
};
export default service;
