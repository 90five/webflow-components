/** tawk.to live chat. cfg: { propertyId, widgetId } (both required; from the embed URL embed.tawk.to/<propertyId>/<widgetId>). */
import type { ServiceDef } from "../types";

const service: ServiceDef = {
  id: "tawk",
  vendor: "tawk.to Inc.",
  vendorUrl: "https://www.tawk.to",
  privacyUrl: "https://www.tawk.to/privacy-policy/",
  category: "functional", // chat widget
  label: { de: "tawk.to Chat", en: "tawk.to Chat" },
  description: {
    de: "Zeigt einen Live-Chat für Fragen und Support an. Dabei werden Ihre IP-Adresse und besuchte Seiten an Server von tawk.to übertragen.",
    en: "Shows a live chat for questions and support. Your IP address and visited pages are transmitted to tawk.to servers.",
  },
  cookies: [
    {
      name: "twk_uuid_*",
      duration: { de: "6 Monate", en: "6 months" },
      description: { de: "Besucherkennung des Chats (Property-ID als Suffix; Domain tawk.to bzw. der Website).", en: "Visitor identifier of the chat (property ID as suffix)." },
      evidence: ["observed"],
    },
    {
      name: "TawkConnectionTime",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Zeitpunkt der letzten Verbindung des Chat-Widgets.", en: "Time of the last connection of the chat widget." },
      evidence: ["observed"],
    },
    {
      name: "twk_idm_key",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Schlüssel zur Zuordnung der Chat-Sitzung.", en: "Key that binds the chat session." },
      evidence: ["observed"],
    },
    {
      name: "twk_*",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
      description: { de: "Chat-Zustand und Token (Local Storage, Property-ID als Suffix).", en: "Chat state and token (local storage, property ID as suffix)." },
      evidence: ["observed"],
    },
    {
      name: "previousNav",
      type: "sessionStorage",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Vorherige Navigation für den Chat (Session Storage).", en: "Previous navigation for the chat (session storage)." },
      evidence: ["observed"],
    },
  ],
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. embed.tawk.to/<propertyId>/<widgetId> loaded and the chat started with a real property taken from tawk.to's own website (normal browser user agent).",
    observed: "Cookies and storage keys observed in the sandbox and on tawk.to (writer: embed.tawk.to).",
    liveSites: ["https://www.tawk.to/"],
  },
  sources: ["https://www.tawk.to/privacy-policy/"],
  load(ctx) {
    const p = ctx.cfg.propertyId;
    const w = ctx.cfg.widgetId;
    if (typeof p !== "string" || !/^[a-f0-9]{24}$/i.test(p)) {
      console.warn("[FivexConsent] tawk: invalid propertyId");
      return;
    }
    if (typeof w !== "string" || !/^[a-z0-9]{1,32}$/i.test(w)) {
      console.warn("[FivexConsent] tawk: invalid widgetId");
      return;
    }
    ctx.win.Tawk_API = ctx.win.Tawk_API || {};
    ctx.win.Tawk_LoadStart = new Date();
    return ctx.loadScript(`https://embed.tawk.to/${encodeURIComponent(p)}/${encodeURIComponent(w)}`, { crossorigin: "*" });
  },
};
export default service;
