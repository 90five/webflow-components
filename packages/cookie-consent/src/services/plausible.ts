/**
 * Plausible Analytics (cookieless). cfg: { domain?: "example.com", src?: "https://plausible.io/js/script.js" }
 * domain defaults to location.hostname; src may point to a self-hosted/proxied script (https only).
 */
import type { ServiceDef } from "../types";

const service: ServiceDef = {
  id: "plausible",
  vendor: "Plausible Insights OÜ",
  vendorUrl: "https://plausible.io/",
  privacyUrl: "https://plausible.io/privacy",
  category: "analytics",
  cookies: [],
  cookieless: true,
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. plausible.io/js/script.js loaded (HTTP 200).",
    observed: "No cookies or storage keys observed; Plausible's data policy states that no cookies are used.",
  },
  label: { de: "Plausible Analytics", en: "Plausible Analytics" },
  description: {
    de: "Misst die Nutzung der Website ohne Cookies und ohne lokale Speicherung. Dabei wird Ihre IP-Adresse kurzzeitig an den Server übertragen, aber nicht gespeichert.",
    en: "Measures website usage without cookies or local storage. Your IP address is briefly sent to the server but not stored.",
  },
  sources: ["https://plausible.io/data-policy"],
  async load(ctx) {
    const domain = String(ctx.cfg.domain ?? ctx.win.location.hostname);
    if (!/^[a-z0-9.-]+(,[a-z0-9.-]+)*$/i.test(domain)) {
      console.warn("[FivexConsent] plausible: invalid domain");
      return;
    }
    let src = "https://plausible.io/js/script.js";
    if (ctx.cfg.src != null) {
      try {
        const u = new URL(String(ctx.cfg.src));
        if (u.protocol !== "https:" || u.username || u.password) throw new Error();
        src = u.href;
      } catch {
        console.warn("[FivexConsent] plausible: invalid src");
        return;
      }
    }
    await ctx.loadScript(src, { defer: "", "data-domain": domain });
  },
};
export default service;
