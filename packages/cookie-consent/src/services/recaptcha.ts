/**
 * Google reCAPTCHA (v2/v3). cfg: { siteKey } (required). Optional: { domain: "recaptcha.net" } to use www.recaptcha.net instead of www.google.com.
 * Loads api.js?render=<siteKey>. Forms that depend on reCAPTCHA will fail while consent is not given (README guidance).
 */
import type { ServiceDef } from "../types";

const service: ServiceDef = {
  id: "recaptcha",
  vendor: "Google LLC",
  vendorUrl: "https://www.google.com/recaptcha/about/",
  privacyUrl: "https://policies.google.com/privacy",
  category: "functional", // spam protection for forms; not advertising
  label: { de: "Google reCAPTCHA", en: "Google reCAPTCHA" },
  description: {
    de: "Schützt Formulare vor Spam und Missbrauch. Dabei werden Browser- und Nutzungsdaten sowie Ihre IP-Adresse an Google übertragen.",
    en: "Protects forms from spam and abuse. Browser and usage data and your IP address are transmitted to Google.",
  },
  cookies: [
    {
      name: "_GRECAPTCHA",
      duration: { de: "6 Monate (180 Tage)", en: "6 months" },
      description: { de: "Notwendiges Cookie für die Risikoanalyse (google.com bzw. recaptcha.net, je nach Einbindung).", en: "Necessary cookie for risk analysis (google.com or recaptcha.net, depending on the integration)." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "_grecaptcha",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Speichert Risikoanalyse-Daten (Local Storage der Website).", en: "Stores risk-analysis data (local storage of the site)." },
      evidence: ["observed"],
    },
    {
      name: "rc::a",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Bot-Erkennung (Local Storage, google.com).", en: "Bot detection (local storage, google.com)." },
      evidence: ["observed"],
    },
    {
      name: "rc::f",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Bot-Erkennung (Local Storage, google.com).", en: "Bot detection (local storage, google.com)." },
      evidence: ["observed"],
    },
    {
      name: "rc::b",
      type: "sessionStorage",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Bot-Erkennung (Session Storage, google.com).", en: "Bot detection (session storage, google.com)." },
      evidence: ["observed"],
    },
    {
      name: "rc::c",
      type: "sessionStorage",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Bot-Erkennung (Session Storage, google.com).", en: "Bot detection (session storage, google.com)." },
      evidence: ["observed"],
    },
  ],
  devNote: { de: "Formulare, die reCAPTCHA erfordern, funktionieren ohne Einwilligung nicht. Alternative Domain: www.recaptcha.net.", en: "Forms that require reCAPTCHA will not work without consent. Alternative domain: www.recaptcha.net." },
  visitorNote: {
    de: "Formulare mit reCAPTCHA funktionieren ohne Ihre Einwilligung nicht.",
    en: "Forms protected by reCAPTCHA do not work without your consent.",
  },
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. api.js loaded and a v2 widget rendered with Google's official test site key.",
    observed: "Cookie and storage keys observed in the sandbox; _GRECAPTCHA also in Google's FAQ.",
  },
  sources: ["https://docs.cloud.google.com/recaptcha/docs/faq"],
  load(ctx) {
    const key = ctx.cfg.siteKey;
    if (typeof key !== "string" || !/^[A-Za-z0-9_-]{20,64}$/.test(key)) {
      console.warn("[FivexConsent] recaptcha: invalid siteKey");
      return;
    }
    const host = ctx.cfg.domain === "recaptcha.net" ? "www.recaptcha.net" : "www.google.com";
    return ctx.loadScript(`https://${host}/recaptcha/api.js?render=${encodeURIComponent(key)}`);
  },
};
export default service;
