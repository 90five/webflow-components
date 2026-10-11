import type { ServiceDef } from "../types";

/**
 * Microsoft Advertising UET. cfg: `{ id: "12345678" }` (UET tag ID, digits only).
 * Consent Mode (per Microsoft's UET consent docs): init() queues consent default ad_storage=denied,
 * load() queues consent update ad_storage=granted BEFORE the tag is created, so it is processed first.
 */
const service: ServiceDef = {
  id: "microsoft-uet",
  vendor: "Microsoft Ireland Operations Ltd.",
  vendorUrl: "https://ads.microsoft.com",
  privacyUrl: "https://privacy.microsoft.com/de-de/privacystatement",
  category: "marketing",
  label: { de: "Microsoft Advertising (UET)", en: "Microsoft Advertising (UET)" },
  description: {
    de: "Misst Conversions für Microsoft-/Bing-Werbung und ermöglicht Remarketing. Dabei werden Ihre IP-Adresse und Seitenaufrufe an Server von Microsoft übertragen.",
    en: "Measures conversions for Microsoft/Bing advertising and enables remarketing. Your IP address and page views are transmitted to Microsoft servers.",
  },
  cookies: [
    {
      name: "_uetvid",
      duration: { de: "13 Monate (390 Tage)", en: "13 months (390 days)" },
      description: { de: "Anonymisierte Besucher-ID für Conversion-Messung und Remarketing (First-Party).", en: "Anonymised visitor ID for conversion measurement and remarketing (first-party)." },
      evidence: ["observed"],
    },
    {
      name: "_uetsid",
      duration: { de: "24 Stunden", en: "24 hours" },
      description: { de: "Kennung einer Sitzung auf der Website (First-Party).", en: "Identifier of a session on the website (first-party)." },
      evidence: ["observed"],
    },
    {
      name: "MUID",
      duration: { de: "13 Monate (390 Tage)", en: "13 months (390 days)" },
      description: { de: "Drittanbieter-Cookie von Bing zur Wiedererkennung über Websites hinweg.", en: "Third-party cookie from Bing to recognise users across sites." },
      evidence: ["observed"],
    },
    {
      name: "_uetvid",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Kopie der Besucher-ID im Local Storage (mit _uetvid_exp).", en: "Copy of the visitor ID in local storage (with _uetvid_exp)." },
      evidence: ["observed"],
    },
    {
      name: "_uetsid",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Kopie der Sitzungs-ID im Local Storage (mit _uetsid_exp).", en: "Copy of the session ID in local storage (with _uetsid_exp)." },
      evidence: ["observed"],
    },
    {
      name: "_uetvid_exp",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
      description: { de: "Ablaufzeit von _uetvid (Local Storage, bat.bing.com).", en: "Expiry time of _uetvid (local storage, bat.bing.com)." },
      evidence: ["observed"],
    },
    {
      name: "_uetsid_exp",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
      description: { de: "Ablaufzeit von _uetsid (Local Storage, bat.bing.com).", en: "Expiry time of _uetsid (local storage, bat.bing.com)." },
      evidence: ["observed"],
    },
  ],
  devNote: { de: "Microsoft nennt in der offiziellen Dokumentation keine Laufzeiten; die Angaben stammen aus der Beobachtung.", en: "Microsoft states no durations in its official documentation; the values come from observation." },
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. bat.js loaded; /action beacons returned 204.",
    observed: "Cookies and local storage keys observed in the sandbox (writer: bat.bing.com) and on live websites.",
    liveSites: ["https://www.brevo.com/", "https://www.intercom.com/"],
  },
  sources: [
    "https://help.ads.microsoft.com/apex/index/3/en/60119",
    "https://learn.microsoft.com/en-us/advertising/guides/universal-event-tracking?view=bingads-13",
  ],
  init(ctx) {
    const w = ctx.win;
    w.uetq = w.uetq || [];
    if (Array.isArray(w.uetq)) w.uetq.push("consent", "default", { ad_storage: "denied" });
  },
  load(ctx) {
    const id = String(ctx.cfg.id ?? "");
    if (!/^\d{4,12}$/.test(id)) {
      console.warn("[FivexConsent] microsoft-uet: invalid id");
      return;
    }
    const w = ctx.win;
    const q: any[] = (w.uetq = w.uetq || []); // eslint-disable-line @typescript-eslint/no-explicit-any
    q.push("consent", "update", { ad_storage: "granted" });
    return ctx.loadScript("https://bat.bing.com/bat.js").then(() => {
      if (typeof w.UET !== "function" || !Array.isArray(w.uetq)) return;
      const t = new w.UET({ ti: id, enableAutoSpaTracking: true, q: w.uetq });
      w.uetq = t;
      t.push("pageLoad");
    });
  },
};
export default service;
