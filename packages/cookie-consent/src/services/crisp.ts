/** Crisp chat. cfg: { id } = Crisp website ID (UUID, required). */
import type { ServiceDef } from "../types";

const service: ServiceDef = {
  id: "crisp",
  vendor: "Crisp IM SAS",
  vendorUrl: "https://crisp.chat",
  privacyUrl: "https://crisp.chat/en/privacy/",
  category: "functional", // chat widget
  label: { de: "Crisp Chat", en: "Crisp Chat" },
  description: {
    de: "Zeigt einen Live-Chat für Fragen und Support an. Dabei wird Ihre IP-Adresse an Server von Crisp übertragen.",
    en: "Shows a live chat for questions and support. Your IP address is transmitted to Crisp servers.",
  },
  cookies: [
    {
      name: "crisp-client%2F*",
      duration: { de: "6 Monate", en: "6 months" },
      description: { de: "Crisp-Chat: Sitzung des Besuchers, um den Nachrichtenverlauf wiederherzustellen (Präfix crisp-client/, Website-ID im Namen). Die Laufzeit wird bei jedem Besuch erneuert.", en: "Crisp chat: visitor session used to restore the message history (prefix crisp-client/, website ID in the name). The expiry is renewed on every visit." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "crisp-client/*",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
      description: { de: "Crisp-Chat: Sitzungs- und Trigger-Daten (Local Storage, Website-ID im Namen).", en: "Crisp chat: session and trigger data (local storage, website ID in the name)." },
      evidence: ["observed"],
    },
  ],
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. client.crisp.chat/l.js loaded (HTTP 200) with the $crisp stub from Crisp's official snippet.",
    observed: "Cookie and local storage entries observed on crisp.chat (writer: client.crisp.chat); name pattern and 6-month default expiry are in Crisp's cookie policy.",
    liveSites: ["https://crisp.chat/en/"],
  },
  sources: ["https://help.crisp.chat/en/article/crisp-chatbox-cookie-and-ip-policy-1147xor/"],
  load(ctx) {
    const id = ctx.cfg.id;
    if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      console.warn("[FivexConsent] crisp: invalid id");
      return;
    }
    ctx.win.$crisp = ctx.win.$crisp || [];
    ctx.win.CRISP_WEBSITE_ID = id;
    return ctx.loadScript("https://client.crisp.chat/l.js");
  },
};
export default service;
