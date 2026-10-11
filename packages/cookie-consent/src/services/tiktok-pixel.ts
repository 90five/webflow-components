import type { ServiceDef } from "../types";

/** TikTok Pixel. cfg: `{ id: "C1A2B3..." }` (pixel code, A-Z/0-9). */
const service: ServiceDef = {
  id: "tiktok-pixel",
  vendor: "TikTok Technology Limited",
  vendorUrl: "https://www.tiktok.com",
  privacyUrl: "https://www.tiktok.com/legal/page/eea/privacy-policy/de",
  category: "marketing",
  label: { de: "TikTok Pixel", en: "TikTok Pixel" },
  description: {
    de: "Misst Aktionen auf dieser Website für TikTok-Werbung und ermöglicht Remarketing. Dabei werden Ihre IP-Adresse und Seitenaufrufe an Server von TikTok übertragen.",
    en: "Measures actions on this website for TikTok advertising and enables remarketing. Your IP address and page views are transmitted to TikTok servers.",
  },
  cookies: [
    {
      name: "_ttp",
      duration: { de: "13 Monate", en: "13 months" },
      description: { de: "TikTok-Kennung zur Zuordnung von Besuchen (First-Party-Cookie des Pixels; zusätzlich auf tiktok.com).", en: "TikTok identifier used to attribute visits (first-party cookie set by the pixel; also on tiktok.com)." },
      evidence: ["observed"],
    },
    {
      name: "_tt_enable_cookie",
      duration: { de: "13 Monate", en: "13 months" },
      description: { de: "Kennzeichen, dass der Pixel Cookies setzen darf.", en: "Flag that the pixel may set cookies." },
      evidence: ["observed"],
    },
    {
      name: "ttcsid_*",
      duration: { de: "13 Monate (ab letzter Nutzung)", en: "13 months (from last use)" },
      description: { de: "TikTok: Sitzungskennung des Pixels (Pixel-Code als Suffix).", en: "TikTok: session identifier of the pixel (pixel code as suffix)." },
      evidence: ["vendor-docs"],
    },
    {
      name: "tt_sessionId",
      type: "sessionStorage",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Sitzungskennung des Pixels (Session Storage).", en: "Session identifier of the pixel (session storage)." },
      evidence: ["observed"],
    },
    {
      name: "tt_pixel_session_index",
      type: "sessionStorage",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Zähler der Seitenaufrufe der Sitzung (Session Storage).", en: "Page view counter of the session (session storage)." },
      evidence: ["observed"],
    },
    {
      name: "tt_appInfo",
      type: "sessionStorage",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Informationen zur Pixel-Einbindung (Session Storage).", en: "Information about the pixel integration (session storage)." },
      evidence: ["observed"],
    },
    {
      name: "tt_adInfo",
      type: "sessionStorage",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Anzeigeninformationen der Sitzung (Session Storage).", en: "Ad information of the session (session storage)." },
      evidence: ["observed"],
    },
    {
      name: "ttclid",
      duration: { de: "13 Monate", en: "13 months" },
      description: { de: "TikTok-Klick-ID: wird nach einem Klick auf eine TikTok-Anzeige gespeichert (First-Party-Cookie des Pixels).", en: "TikTok click ID: stored after a click on a TikTok ad (first-party cookie set by the pixel)." },
      evidence: ["observed", "vendor-docs"],
      devNote: { de: "Beobachtet im Sandbox-Test: 24 Stunden Laufzeit. Angegeben ist die längere, in der TikTok-Dokumentation genannte Laufzeit (13 Monate), damit nichts zu kurz ausgewiesen wird.", en: "Observed in the sandbox test with a 24-hour expiry. The longer duration from TikTok's documentation (13 months) is shown so that nothing is understated." },
    },
  ],
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. analytics.tiktok.com/i18n/pixel/events.js loaded and beacons were sent with a real pixel code taken from a live website.",
    observed: "Cookies (including ttclid, set when the landing URL carries a ttclid parameter) and session storage observed in the sandbox with a real pixel code; ttcsid_* and ttclid are in TikTok's cookie documentation.",
  },
  sources: ["https://ads.tiktok.com/help/article/faqs-for-partner-pixels-and-cookie-enablement"],
  load(ctx) {
    const id = String(ctx.cfg.id ?? "");
    if (!/^[A-Z0-9]{8,32}$/.test(id)) {
      console.warn("[FivexConsent] tiktok-pixel: invalid id");
      return;
    }
    const w = ctx.win;
    // Mirrors the official TikTok snippet: events.js needs window.TiktokAnalyticsObject and the full stub.
    w.TiktokAnalyticsObject = "ttq";
    const ttq: any = (w.ttq = w.ttq || []); // eslint-disable-line @typescript-eslint/no-explicit-any
    ttq.methods = [
      "page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group",
      "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent",
    ];
    ttq.setAndDefer = (t: any, e: string) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      t[e] = (...a: unknown[]) => t.push([e, ...a]);
    };
    for (const m of ttq.methods) ttq.setAndDefer(ttq, m);
    ttq.instance = (pid: string) => {
      const inst = ttq._i[pid] || [];
      for (const m of ttq.methods) ttq.setAndDefer(inst, m);
      return inst;
    };
    ttq.load = (pid: string, opts?: Record<string, unknown>) => {
      const src = "https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._i = ttq._i || {};
      ttq._i[pid] = [];
      ttq._i[pid]._u = src;
      ttq._t = ttq._t || {};
      ttq._t[pid] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[pid] = opts || {};
      ctx.loadScript(src + "?sdkid=" + encodeURIComponent(pid) + "&lib=ttq").catch((e) => console.warn("[FivexConsent] tiktok-pixel:", e));
    };
    ttq.load(id);
    ttq.page();
  },
};
export default service;
