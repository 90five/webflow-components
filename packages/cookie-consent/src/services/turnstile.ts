/**
 * Cloudflare Turnstile. cfg: { siteKey } (required). Loads challenges.cloudflare.com/turnstile/v0/api.js (auto-renders .cf-turnstile).
 * Forms that depend on Turnstile fail while consent is not given (README guidance).
 */
import type { ServiceDef } from "../types";

const service: ServiceDef = {
  id: "turnstile",
  vendor: "Cloudflare, Inc.",
  vendorUrl: "https://www.cloudflare.com/products/turnstile/",
  privacyUrl: "https://www.cloudflare.com/privacypolicy/",
  category: "functional", // spam/bot protection for forms
  label: { de: "Cloudflare Turnstile", en: "Cloudflare Turnstile" },
  description: {
    de: "Schützt Formulare vor Bots und Spam. Dabei werden Browserdaten sowie Ihre IP-Adresse an Cloudflare übertragen.",
    en: "Protects forms from bots and spam. Browser data and your IP address are transmitted to Cloudflare.",
  },
  cookies: [
    {
      name: "cf.turnstile.u",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
      description: { de: "Turnstile: Kennung für die Bot-Prüfung (Local Storage, challenges.cloudflare.com).", en: "Turnstile: identifier for the bot check (local storage, challenges.cloudflare.com)." },
      evidence: ["observed"],
    },
  ],
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. api.js loaded and a widget rendered with Cloudflare's official test site key.",
    observed: "Local storage key observed in the sandbox and on dash.cloudflare.com (origin challenges.cloudflare.com).",
    liveSites: ["https://dash.cloudflare.com/login"],
  },
  devNote: { de: "Mit aktivierter Pre-Clearance stellt Cloudflare zusätzlich ein cf_clearance-Cookie aus (siehe Cloudflare-Dokumentation).", en: "With pre-clearance enabled Cloudflare also issues a cf_clearance cookie (see the Cloudflare documentation)." },
  sources: ["https://developers.cloudflare.com/turnstile/get-started/pre-clearance/", "https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/"],
  load(ctx) {
    const key = ctx.cfg.siteKey;
    if (typeof key !== "string" || !/^[0-9A-Za-z_-]{10,64}$/.test(key)) {
      console.warn("[FivexConsent] turnstile: invalid siteKey");
      return;
    }
    return ctx.loadScript("https://challenges.cloudflare.com/turnstile/v0/api.js");
  },
};
export default service;
