/**
 * hCaptcha. cfg: { siteKey } (required, UUID). Loads js.hcaptcha.com/1/api.js (auto-renders .h-captcha elements).
 * Forms that depend on hCaptcha fail while consent is not given (README guidance).
 */
import type { ServiceDef } from "../types";

const service: ServiceDef = {
  id: "hcaptcha",
  vendor: "Intuition Machines, Inc.",
  vendorUrl: "https://www.hcaptcha.com",
  privacyUrl: "https://www.hcaptcha.com/privacy",
  category: "functional", // spam protection for forms
  label: { de: "hCaptcha", en: "hCaptcha" },
  description: {
    de: "Schützt Formulare vor Spam und Missbrauch. Dabei werden Browser- und Nutzungsdaten sowie Ihre IP-Adresse an hCaptcha übertragen.",
    en: "Protects forms from spam and abuse. Browser and usage data and your IP address are transmitted to hCaptcha.",
  },
  cookies: [
    {
      name: "__cf_bm",
      duration: { de: "30 Minuten", en: "30 minutes" },
      description: { de: "Cloudflare-Bot-Schutz (HttpOnly, hcaptcha.com); laut hCaptcha bis zu 1 Tag.", en: "Cloudflare bot management (HttpOnly, hcaptcha.com); hCaptcha states up to 1 day." },
      evidence: ["observed", "vendor-docs"],
    },
  ],
  devNote: { de: "hCaptcha nennt außerdem localStorage-Einträge; mit dem Test-Schlüssel wurden keine beobachtet.", en: "hCaptcha also mentions localStorage entries; none were observed with the test key." },
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. api.js loaded and a widget rendered with hCaptcha's official test site key.",
    observed: "Cookie __cf_bm observed in the sandbox.",
  },
  sources: ["https://docs.hcaptcha.com/faq/", "https://www.hcaptcha.com/privacy"],
  load(ctx) {
    const key = ctx.cfg.siteKey;
    if (typeof key !== "string" || !/^[0-9a-fA-F-]{36}$/.test(key)) {
      console.warn("[FivexConsent] hcaptcha: invalid siteKey");
      return;
    }
    return ctx.loadScript("https://js.hcaptcha.com/1/api.js");
  },
};
export default service;
