/**
 * Google Fonts, externally loaded (fonts.googleapis.com / fonts.gstatic.com). No cfg.
 * Intentionally NO load(): the site's CSS cannot be gated by this script. Recommendation: self-host the fonts instead
 * (then this entry is unnecessary). Listed for transparency only.
 */
import type { ServiceDef } from "../types";

const service: ServiceDef = {
  id: "google-fonts",
  vendor: "Google LLC",
  vendorUrl: "https://fonts.google.com",
  privacyUrl: "https://policies.google.com/privacy",
  category: "functional", // typography; loaded from external servers
  label: { de: "Google Fonts", en: "Google Fonts" },
  description: {
    de: "Lädt Schriftarten von Servern von Google. Dabei wird Ihre IP-Adresse an Google übertragen. Es werden keine Cookies gesetzt.",
    en: "Loads fonts from Google servers. Your IP address is transmitted to Google. No cookies are set.",
  },
  cookies: [],
  cookieless: true,
  verification: {
    date: "2026-10-11",
    loader: "The library loads nothing for this service; fonts come from the site's own CSS and cannot be gated.",
    observed: "Not applicable (no loader). Google's documentation states that the Google Fonts API does not set or log cookies.",
  },
  devNote: { de: "Die Bibliothek lädt nichts für diesen Dienst und kann Google Fonts nicht blockieren (Einbindung per CSS): am besten selbst hosten. Beim Abruf wird die IP-Adresse an Google übertragen; laut Google setzt die Google-Fonts-API keine Cookies.", en: "The library loads nothing for this service and cannot block Google Fonts (included via CSS): self-hosting is best. Your IP address is transmitted to Google on request; according to Google the Google Fonts API does not set cookies." },
  sources: ["https://developers.google.com/fonts/faq/privacy"],
};
export default service;
