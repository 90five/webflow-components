import type { ServiceDef } from "../types";

/** LinkedIn Insight Tag. cfg: `{ id: "1234567" }` (partner ID, digits only). */
const service: ServiceDef = {
  id: "linkedin-insight",
  vendor: "LinkedIn Ireland Unlimited Company",
  vendorUrl: "https://www.linkedin.com",
  privacyUrl: "https://www.linkedin.com/legal/privacy-policy",
  category: "marketing",
  label: { de: "LinkedIn Insight Tag", en: "LinkedIn Insight Tag" },
  description: {
    de: "Misst Conversions und Zielgruppen für LinkedIn-Werbung. Dabei werden Ihre IP-Adresse und Seitenaufrufe an Server von LinkedIn übertragen.",
    en: "Measures conversions and audiences for LinkedIn advertising. Your IP address and page views are transmitted to LinkedIn servers.",
  },
  cookies: [
    {
      name: "bcookie",
      duration: { de: "1 Jahr", en: "1 year" },
      description: { de: "Browser-Kennung zur Missbrauchserkennung und für Diagnosen.", en: "Browser identifier used to detect abuse and for diagnostics." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "lidc",
      duration: { de: "24 Stunden", en: "24 hours" },
      description: { de: "Auswahl des Rechenzentrums.", en: "Data centre selection." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "li_gc",
      duration: { de: "6 Monate", en: "6 months" },
      description: { de: "Speichert die Cookie-Einwilligung von Gästen für nicht notwendige Zwecke.", en: "Stores the consent of guests for non-essential cookies." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "__cf_bm",
      duration: { de: "30 Minuten", en: "30 minutes" },
      description: { de: "Cloudflare-Bot-Schutz (HttpOnly, linkedin.com).", en: "Cloudflare bot management (HttpOnly, linkedin.com)." },
      evidence: ["observed"],
    },
  ],
  devNote: { de: "Namen und Laufzeiten stammen aus der Cookie-Tabelle von LinkedIn und wurden bestätigt (bcookie, lidc, li_gc).", en: "Names and durations are taken from LinkedIn's cookie table and were confirmed (bcookie, lidc, li_gc)." },
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. insight.min.js loaded and page-view beacons were sent to px.ads.linkedin.com.",
    observed: "Cookies observed in the sandbox; durations also in LinkedIn's cookie table.",
  },
  sources: ["https://www.linkedin.com/legal/l/cookie-table", "https://www.linkedin.com/legal/cookie-policy"],
  load(ctx) {
    const id = String(ctx.cfg.id ?? "");
    if (!/^\d{3,12}$/.test(id)) {
      console.warn("[FivexConsent] linkedin-insight: invalid id");
      return;
    }
    const w = ctx.win;
    w._linkedin_data_partner_ids = w._linkedin_data_partner_ids || [];
    w._linkedin_data_partner_ids.push(id);
    w._linkedin_partner_id = id;
    return ctx.loadScript("https://snap.licdn.com/li.lms-analytics/insight.min.js");
  },
};
export default service;
