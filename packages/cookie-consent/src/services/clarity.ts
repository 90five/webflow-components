/**
 * Microsoft Clarity. cfg: { id: "abcdefghij" }   (Project ID)
 * Loads Clarity after consent, then passes the Consent API v2 signal.
 */
import type { LoadContext, ServiceDef } from "../types";


const service: ServiceDef = {
  id: "clarity",
  vendor: "Microsoft Corporation",
  vendorUrl: "https://clarity.microsoft.com/",
  privacyUrl: "https://privacy.microsoft.com/privacystatement",
  category: "analytics",
  label: { de: "Microsoft Clarity", en: "Microsoft Clarity" },
  description: {
    de: "Zeichnet Klicks, Scrollen und Mausbewegungen auf, um die Nutzung der Website zu analysieren. Dabei werden Daten, auch Ihre IP-Adresse, an Server von Microsoft übertragen.",
    en: "Records clicks, scrolling and mouse movement to analyse website usage. Data, including your IP address, is transmitted to Microsoft servers.",
  },
  cookies: [
    {
      name: "_clck",
      duration: { de: "1 Jahr", en: "1 year" },
      description: { de: "Speichert die Clarity-Nutzer-ID und -Einstellungen für die Website (First-Party, geschrieben vom Clarity-Skript).", en: "Persists the Clarity user ID and preferences for the website (first party, written by the Clarity script)." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "_clsk",
      duration: { de: "1 Tag", en: "1 day" },
      description: { de: "Verbindet mehrere Seitenaufrufe eines Besuchs zu einer Sitzungsaufzeichnung.", en: "Connects multiple page views of a visit into one session recording." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "MUID",
      duration: { de: "13 Monate", en: "13 months" },
      description: { de: "Microsoft-Browserkennung (Domains clarity.ms / bing.com), u. a. für Werbung und Analyse.", en: "Microsoft browser identifier (domains clarity.ms / bing.com), used for advertising and analytics among other things." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "MR",
      duration: { de: "7 Tage", en: "7 days" },
      description: { de: "Kennzeichen, ob MUID aufgefrischt werden soll (clarity.ms).", en: "Flag indicating whether MUID is to be refreshed (clarity.ms)." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "ANONCHK",
      duration: { de: "10 Minuten", en: "10 minutes" },
      description: { de: "Kennzeichen, ob MUID an ANID übertragen wird (Clarity nutzt ANID nicht, der Wert ist immer 0).", en: "Flag whether MUID is transferred to ANID (Clarity does not use ANID, so the value is always 0)." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "SM",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Synchronisiert MUID zwischen Microsoft-Domains.", en: "Synchronises MUID across Microsoft domains." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "_cltk",
      type: "sessionStorage",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Sitzungsdaten des Clarity-Skripts (Session Storage).", en: "Session data of the Clarity script (session storage)." },
      evidence: ["observed"],
    },
    {
      name: "SRM_B",
      duration: { de: "13 Monate", en: "13 months" },
      description: { de: "Microsoft-Kennung für die Synchronisierung zwischen Microsoft-Diensten (c.bing.com).", en: "Microsoft identifier used to synchronise between Microsoft services (c.bing.com)." },
      evidence: ["observed"],
    },
  ],
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. scripts.clarity.ms loaded and ran with a real project id taken from Microsoft Clarity's own website (tag request 200, no errors).",
    observed: "Cookies and session storage observed in the sandbox with a real project id and on live websites; cookie names also listed in Microsoft's documentation.",
    liveSites: ["https://clarity.microsoft.com/", "https://www.brevo.com/"],
  },
  sources: ["https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-cookies", "https://learn.microsoft.com/en-us/clarity/setup-and-installation/cookie-consent"],
  async load(ctx) {
    const id = String(ctx.cfg.id ?? "");
    if (!/^[a-z0-9]{6,16}$/i.test(id)) {
      console.warn("[FivexConsent] clarity: invalid id");
      return;
    }
    const w = ctx.win;
    w.clarity =
      w.clarity ||
      function () {
        // eslint-disable-next-line prefer-rest-params
        (w.clarity.q = w.clarity.q || []).push(arguments);
      };
    await ctx.loadScript("https://www.clarity.ms/tag/" + encodeURIComponent(id));
    signal(ctx);
  },
  /** Marketing consent drives ad_Storage, analytics consent drives analytics_Storage; re-sent on every decision. */
  update(ctx) {
    signal(ctx);
  },
};

function signal(ctx: LoadContext): void {
  const g = (b: boolean) => (b ? "granted" : "denied");
  ctx.win.clarity?.("consentv2", { ad_Storage: g(ctx.hasCategory("marketing")), analytics_Storage: g(ctx.hasCategory("analytics")) });
}
export default service;
