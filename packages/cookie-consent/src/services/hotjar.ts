/**
 * Hotjar. cfg: { id: "1234567", snapshotVersion?: "6" }   (id = Site ID)
 */
import type { ServiceDef } from "../types";

const service: ServiceDef = {
  id: "hotjar",
  vendor: "Hotjar Ltd.",
  vendorUrl: "https://www.hotjar.com/",
  privacyUrl: "https://www.hotjar.com/legal/policies/privacy/",
  category: "analytics",
  label: { de: "Hotjar", en: "Hotjar" },
  description: {
    de: "Erstellt Heatmaps und Sitzungsaufzeichnungen, um die Nutzung der Website zu verbessern. Dabei werden Nutzungsdaten und Ihre IP-Adresse an Server von Hotjar übertragen.",
    en: "Creates heatmaps and session recordings to improve the website. Usage data and your IP address are transmitted to Hotjar servers.",
  },
  cookies: [
    {
      name: "_hjSessionUser_*",
      duration: { de: "1 Jahr", en: "1 year" },
      description: { de: "Speichert die Hotjar-Nutzer-ID für die Website (Site-ID als Suffix).", en: "Persists the Hotjar user ID for the site (site ID as suffix)." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "_hjSession_*",
      duration: { de: "30 Minuten", en: "30 minutes" },
      description: { de: "Enthält die Daten der aktuellen Sitzung (Site-ID als Suffix).", en: "Holds current session data (site ID as suffix)." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "_hjHasCachedUserAttributes",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Zeigt, ob Nutzerattribute bereits zwischengespeichert sind.", en: "Indicates whether user attributes are already cached." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "_hjUserAttributesHash",
      duration: { de: "2 Minuten", en: "2 minutes" },
      description: { de: "Prüfsumme der Nutzerattribute, um Änderungen zu erkennen.", en: "Hash of the user attributes to detect changes." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "_hjUserAttributes",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
      description: { de: "Zwischengespeicherte Nutzerattribute (Local Storage).", en: "Cached user attributes (local storage)." },
      evidence: ["observed"],
    },
    {
      name: "hjActiveViewportIds",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
      description: { de: "Ansichtsfenster-Kennungen der Aufzeichnung (Local Storage).", en: "Viewport identifiers of the recording (local storage)." },
      evidence: ["observed"],
    },
    {
      name: "hjViewportId",
      type: "sessionStorage",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Kennung des Ansichtsfensters der aktuellen Sitzung (Session Storage).", en: "Viewport identifier of the current session (session storage)." },
      evidence: ["observed"],
    },
  ],
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. static.hotjar.com/c/hotjar-<id>.js?sv=<n> loaded (HTTP 200), the Hotjar modules loaded and the session started with a real site id, no errors.",
    observed: "Cookies and storage keys observed on live websites running Hotjar (writer: script.hotjar.com) and in the sandbox with a real site id; the names of the cookies are also in Hotjar's own cookie documentation.",
    liveSites: ["https://www.intercom.com/", "https://www.trustpilot.com/", "https://help.hotjar.com/"],
  },
  sources: ["https://help.hotjar.com/hc/en-us/articles/115011789248-Hotjar-Cookie-Information"],
  async load(ctx) {
    const id = String(ctx.cfg.id ?? "");
    const sv = String(ctx.cfg.snapshotVersion ?? "6");
    if (!/^\d{1,10}$/.test(id)) {
      console.warn("[FivexConsent] hotjar: invalid id");
      return;
    }
    if (!/^\d{1,3}$/.test(sv)) {
      console.warn("[FivexConsent] hotjar: invalid snapshotVersion");
      return;
    }
    const w = ctx.win;
    w.hj =
      w.hj ||
      function () {
        // eslint-disable-next-line prefer-rest-params
        (w.hj.q = w.hj.q || []).push(arguments);
      };
    w._hjSettings = { hjid: Number(id), hjsv: Number(sv) };
    await ctx.loadScript("https://static.hotjar.com/c/hotjar-" + encodeURIComponent(id) + ".js?sv=" + encodeURIComponent(sv));
  },
};
export default service;
