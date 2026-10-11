import type { ServiceDef } from "../types";

/**
 * Meta Pixel (Facebook/Instagram). cfg: `{ id: "1234567890" }` (pixel ID, digits only).
 * Loaded only after consent; no fbq stub is defined before. Meta's own fbq('consent','revoke'|'grant')
 * is therefore not needed (the pixel is never present without consent).
 */

const service: ServiceDef = {
  id: "meta-pixel",
  vendor: "Meta Platforms Ireland Ltd.",
  vendorUrl: "https://www.facebook.com",
  privacyUrl: "https://www.facebook.com/privacy/policy/",
  category: "marketing",
  label: { de: "Meta Pixel", en: "Meta Pixel" },
  description: {
    de: "Misst Seitenaufrufe und Aktionen für Werbung auf Facebook und Instagram und ermöglicht Remarketing. Dabei werden Daten, darunter Ihre IP-Adresse, an Server von Meta übertragen.",
    en: "Measures page views and actions for advertising on Facebook and Instagram and enables remarketing. Data, including your IP address, is transmitted to Meta servers.",
  },
  cookies: [
    {
      name: "_fbp",
      duration: { de: "3 Monate", en: "3 months" },
      description: { de: "Meta-Browserkennung zur Zuordnung von Besuchen (First-Party-Cookie des Pixels).", en: "Meta browser identifier used to attribute visits (first-party cookie set by the pixel)." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "_fbc",
      duration: { de: "3 Monate", en: "3 months" },
      description: { de: "Speichert die Klick-ID (fbclid) nach einem Klick auf eine Meta-Anzeige.", en: "Stores the click ID (fbclid) after a click on a Meta ad." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "lastExternalReferrer",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
      description: { de: "Letzte externe Herkunftsseite (Local Storage, fbevents.js).", en: "Last external referrer (local storage, fbevents.js)." },
      evidence: ["observed"],
    },
    {
      name: "lastExternalReferrerTime",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
      description: { de: "Zeitpunkt der letzten externen Herkunftsseite (Local Storage, fbevents.js).", en: "Time of the last external referrer (local storage, fbevents.js)." },
      evidence: ["observed"],
    },
    {
      name: "multiFbc",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
      description: { de: "Liste der gespeicherten Klick-IDs (Local Storage, fbevents.js).", en: "List of stored click IDs (local storage, fbevents.js)." },
      evidence: ["observed"],
    },
  ],
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. fbevents.js, the pixel configuration and the PageView beacon (facebook.com/tr) worked with a real pixel id taken from a live website.",
    observed: "_fbp, _fbc (with a fbclid in the URL) and local storage keys observed in the sandbox; _fbp also on a live website (writer: fbevents.js).",
    liveSites: ["https://contentsquare.com/hotjar/"],
  },
  sources: ["https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/fbp-and-fbc", "https://developers.facebook.com/docs/meta-pixel/implementation/gdpr"],
  load(ctx) {
    const id = String(ctx.cfg.id ?? "");
    if (!/^\d{5,20}$/.test(id)) {
      console.warn("[FivexConsent] meta-pixel: invalid id");
      return;
    }
    const w = ctx.win;
    if (!w.fbq) {
      const n: any = (w.fbq = function (...args: unknown[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (n.callMethod) n.callMethod(...args);
        else n.queue.push(args);
      });
      if (!w._fbq) w._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
    }
    w.fbq("init", id);
    w.fbq("track", "PageView");
    return ctx.loadScript("https://connect.facebook.net/en_US/fbevents.js");
  },
};
export default service;
