/** Zendesk Web Widget. cfg: { key } = Web Widget key (UUID, required). Loads static.zdassets.com/ekr/snippet.js?key=… */
import type { ServiceDef } from "../types";

const service: ServiceDef = {
  id: "zendesk-chat",
  vendor: "Zendesk, Inc.",
  vendorUrl: "https://www.zendesk.com",
  privacyUrl: "https://www.zendesk.com/company/agreements-and-terms/privacy-notice/",
  category: "functional", // support/chat widget
  label: { de: "Zendesk Web Widget", en: "Zendesk Web Widget" },
  description: {
    de: "Zeigt ein Support- und Chat-Widget an. Dabei werden Ihre IP-Adresse und Nutzungsdaten an Server von Zendesk übertragen.",
    en: "Shows a support and chat widget. Your IP address and usage data are transmitted to Zendesk servers.",
  },
  cookies: [
    {
      name: "ZD-suid",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
      description: { de: "Zendesk: Kennung der Besucher-Sitzung (Local Storage, zusätzlich Session Storage).", en: "Zendesk: visitor session identifier (local storage, also session storage)." },
      evidence: ["observed"],
    },
    {
      name: "ZD-suid",
      type: "sessionStorage",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Zendesk: Kennung der Besucher-Sitzung (Session Storage).", en: "Zendesk: visitor session identifier (session storage)." },
      evidence: ["observed"],
    },
    {
      name: "ZD-buid",
      type: "sessionStorage",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Zendesk: Kennung des Browsers (Session Storage).", en: "Zendesk: browser identifier (session storage)." },
      evidence: ["observed"],
    },
    {
      name: "*.clientId",
      type: "sessionStorage",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Zendesk: Client-Kennung des Messaging-Widgets (Session Storage).", en: "Zendesk: client identifier of the messaging widget (session storage)." },
      evidence: ["observed"],
    },
  ],
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. static.zdassets.com/ekr/snippet.js?key=<key> loaded and the widget booted with a real key taken from a live website.",
    observed: "Session storage and local storage keys observed in the sandbox (writer: static.zdassets.com).",
    liveSites: ["https://www.activecampaign.com/"],
  },
  sources: ["https://developer.zendesk.com/api-reference/widget/settings/"],
  load(ctx) {
    const key = ctx.cfg.key;
    if (typeof key !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
      console.warn("[FivexConsent] zendesk-chat: invalid key");
      return;
    }
    return ctx.loadScript(`https://static.zdassets.com/ekr/snippet.js?key=${encodeURIComponent(key)}`, { id: "ze-snippet" });
  },
};
export default service;
