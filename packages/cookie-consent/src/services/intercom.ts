/** Intercom Messenger. cfg: { appId } (required, e.g. "abc12xyz"). Optional extra Messenger settings are not forwarded. */
import type { ServiceDef } from "../types";

const service: ServiceDef = {
  id: "intercom",
  vendor: "Intercom, Inc.",
  vendorUrl: "https://www.intercom.com",
  privacyUrl: "https://www.intercom.com/legal/privacy",
  category: "functional", // chat/support widget
  label: { de: "Intercom", en: "Intercom" },
  description: {
    de: "Zeigt einen Chat für Fragen und Support an. Dabei werden Ihre IP-Adresse und Nutzungsdaten an Server von Intercom übertragen.",
    en: "Shows a chat for questions and support. Your IP address and usage data are transmitted to Intercom servers.",
  },
  cookies: [
    {
      name: "intercom-id-*",
      duration: { de: "9 Monate (270 Tage)", en: "9 months (270 days)" },
      description: { de: "Anonyme Besucherkennung des Messengers (App-ID als Suffix).", en: "Anonymous visitor identifier of the Messenger (app ID as suffix)." },
      evidence: ["observed"],
      devNote: { de: "Intercom dokumentiert diesen Eintrag als Local Storage ohne Ablauf; im Test wurde er als Cookie beobachtet.", en: "Intercom documents this entry as local storage without expiry; it was observed as a cookie in the test." },
    },
    {
      name: "intercom-session-*",
      duration: { de: "7 Tage (einstellbar)", en: "7 days (adjustable)" },
      description: { de: "Kennung der Messenger-Sitzung (App-ID als Suffix).", en: "Identifier of the Messenger session (app ID as suffix)." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "intercom-device-id-*",
      duration: { de: "9 Monate (270 Tage)", en: "9 months (270 days)" },
      description: { de: "Kennung des Geräts (App-ID als Suffix).", en: "Identifier of the device (app ID as suffix)." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "intercom.intercom-state-*",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
      description: { de: "Zustand des Messengers (Local Storage, App-ID als Suffix).", en: "State of the Messenger (local storage, app ID as suffix)." },
      evidence: ["observed"],
    },
  ],
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. widget.intercom.io/widget/<appId> loaded and the Messenger booted with a real app id taken from Intercom's own website (origin intercom.com).",
    observed: "Cookies and local storage keys observed in the sandbox with a real app id; names and durations also in Intercom's documentation.",
    liveSites: ["https://www.intercom.com/"],
  },
  sources: ["https://www.intercom.com/help/en/articles/2361922-intercom-messenger-cookies"],
  load(ctx) {
    const id = ctx.cfg.appId;
    if (typeof id !== "string" || !/^[a-z0-9]{6,12}$/i.test(id)) {
      console.warn("[FivexConsent] intercom: invalid appId");
      return;
    }
    const settings = { app_id: id };
    ctx.win.intercomSettings = settings;
    return ctx.loadScript(`https://widget.intercom.io/widget/${encodeURIComponent(id)}`).then(() => {
      if (typeof ctx.win.Intercom === "function") ctx.win.Intercom("boot", settings);
    });
  },
};
export default service;
