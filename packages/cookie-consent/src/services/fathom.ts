/**
 * Fathom Analytics (cookieless). cfg: { id: "ABCDEFG" }   (Site ID)
 */
import type { ServiceDef } from "../types";

const service: ServiceDef = {
  id: "fathom",
  vendor: "Conva Ventures Inc.",
  vendorUrl: "https://usefathom.com/",
  privacyUrl: "https://usefathom.com/privacy",
  category: "analytics",
  cookies: [],
  cookieless: true,
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. cdn.usefathom.com/script.js loaded (HTTP 200) with a site id; no errors.",
    observed: "No cookies or storage keys observed; Fathom's documentation states that the embed script uses no cookies or similar technologies.",
  },
  label: { de: "Fathom Analytics", en: "Fathom Analytics" },
  description: {
    de: "Misst die Nutzung der Website ohne Cookies. Dabei wird Ihre IP-Adresse kurzzeitig an Server von Fathom übertragen, um Statistiken zu erzeugen.",
    en: "Measures website usage without cookies. Your IP address is briefly sent to Fathom servers to produce statistics.",
  },
  sources: ["https://usefathom.com/docs/script/script-advanced", "https://usefathom.com/docs/legal/privacy-policy-sample"],
  async load(ctx) {
    const id = String(ctx.cfg.id ?? "");
    if (!/^[A-Za-z0-9]{3,16}$/.test(id)) {
      console.warn("[FivexConsent] fathom: invalid id");
      return;
    }
    await ctx.loadScript("https://cdn.usefathom.com/script.js", { "data-site": id, defer: "" });
  },
};
export default service;
