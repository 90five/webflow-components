import type { ServiceDef } from "../types";

/** Pinterest Tag. cfg: `{ id: "1234567890123" }` (tag ID, digits only). */

const service: ServiceDef = {
  id: "pinterest-tag",
  vendor: "Pinterest Europe Ltd.",
  vendorUrl: "https://www.pinterest.com",
  privacyUrl: "https://policy.pinterest.com/de/privacy-policy",
  category: "marketing",
  label: { de: "Pinterest Tag", en: "Pinterest Tag" },
  description: {
    de: "Misst Conversions für Pinterest-Werbung und ermöglicht Remarketing. Dabei werden Ihre IP-Adresse und Seitenaufrufe an Server von Pinterest übertragen.",
    en: "Measures conversions for Pinterest advertising and enables remarketing. Your IP address and page views are transmitted to Pinterest servers.",
  },
  cookies: [
    {
      name: "_pin_unauth",
      duration: { de: "12 Monate", en: "12 months" },
      description: { de: "Pinterest-Kennung für nicht angemeldete Besucher (First-Party-Cookie des Tags).", en: "Pinterest identifier for visitors who are not logged in (first-party cookie set by the tag)." },
      evidence: ["observed"],
    },
    {
      name: "_epik",
      duration: { de: "12 Monate", en: "12 months" },
      description: { de: "Speichert die Klick-ID (epik) nach einem Klick auf eine Pinterest-Anzeige.", en: "Stores the click ID (epik) after a click on a Pinterest ad." },
      evidence: ["observed"],
    },
    {
      name: "is_eu",
      type: "sessionStorage",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Kennzeichen, ob der Besucher aus der EU kommt (Session Storage).", en: "Flag whether the visitor is located in the EU (session storage)." },
      evidence: ["observed"],
    },
  ],
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. s.pinimg.com/ct/core.js loaded and ct.pinterest.com beacons were sent with a real tag id taken from a live website.",
    observed: "_pin_unauth, _epik (with an epik parameter in the URL) and session storage observed in the sandbox with a real tag id.",
  },
  sources: ["https://help.pinterest.com/en/business/article/track-conversions-with-pinterest-tag", "https://policy.pinterest.com/en/cookies"],
  load(ctx) {
    const id = String(ctx.cfg.id ?? "");
    if (!/^\d{6,20}$/.test(id)) {
      console.warn("[FivexConsent] pinterest-tag: invalid id");
      return;
    }
    const w = ctx.win;
    if (!w.pintrk) {
      const p: any = (w.pintrk = (...a: unknown[]) => p.queue.push(a)); // eslint-disable-line @typescript-eslint/no-explicit-any
      p.queue = [];
      p.version = "3.0";
      ctx.loadScript("https://s.pinimg.com/ct/core.js");
    }
    w.pintrk("load", id);
    w.pintrk("page");
  },
};
export default service;
