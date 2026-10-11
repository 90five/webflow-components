/** Adobe Fonts (Typekit). cfg: { kitId } (required, 7 lowercase alphanumerics). Injects the kit CSS after consent. */
import type { ServiceDef } from "../types";

const service: ServiceDef = {
  id: "adobe-fonts",
  vendor: "Adobe Inc.",
  vendorUrl: "https://fonts.adobe.com",
  privacyUrl: "https://www.adobe.com/privacy/typekit.html",
  category: "functional", // typography; loaded from external servers
  label: { de: "Adobe Fonts", en: "Adobe Fonts" },
  description: {
    de: "Lädt Schriftarten von Servern von Adobe. Dabei wird Ihre IP-Adresse an Adobe übertragen. Adobe setzt zur Auslieferung der Schriften keine Cookies.",
    en: "Loads fonts from Adobe servers. Your IP address is transmitted to Adobe. Adobe sets no cookies to serve the fonts.",
  },
  cookies: [],
  cookieless: true,
  devNote: {
    de: "Laut Adobe werden u. a. Web-Projekt-ID, Account-ID und Hostname erfasst (Abrechnung, Lizenz); die IP-Adresse wird nicht gespeichert.",
    en: "According to Adobe, data such as web project ID, account ID and hostname is collected (billing, licensing); the IP address is not stored.",
  },
  verification: {
    date: "2026-10-11",
    loader: "The kit stylesheet <link> is added only after consent and https://use.typekit.net/<kit>.css is requested (the endpoint answers; kits are restricted to their licensed domains, so a stylesheet body is only served there). Same URL pattern as on fonts.adobe.com.",
    observed: "No cookies or storage keys from Adobe Fonts were observed; Adobe's privacy page states that the Adobe Fonts service for websites does not set or use cookies.",
    liveSites: ["https://fonts.adobe.com/"],
  },
  sources: ["https://www.adobe.com/privacy/typekit.html"],
  load(ctx) {
    const kit = ctx.cfg.kitId;
    if (typeof kit !== "string" || !/^[a-z0-9]{5,10}$/i.test(kit)) {
      console.warn("[FivexConsent] adobe-fonts: invalid kitId");
      return;
    }
    const link = ctx.doc.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://use.typekit.net/${encodeURIComponent(kit)}.css`;
    ctx.doc.head.appendChild(link);
  },
};
export default service;
