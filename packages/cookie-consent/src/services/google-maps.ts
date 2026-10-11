/**
 * Google Maps embed (iframe, www.google.com/maps/embed/...). No config.
 * Maps JavaScript API (maps.googleapis.com) is a different integration and is NOT covered by embed hosts;
 * it would need its own script load with an API key after consent.
 */
import type { ServiceDef } from "../types";

const service: ServiceDef = {
  id: "google-maps",
  vendor: "Google Ireland Limited",
  vendorUrl: "https://maps.google.com",
  privacyUrl: "https://policies.google.com/privacy",
  category: "functional",
  label: { de: "Google Maps", en: "Google Maps" },
  description: {
    de: "Zeigt eine eingebettete Google-Maps-Karte an. Dabei wird Ihre IP-Adresse an Server von Google übertragen.",
    en: "Shows an embedded Google Maps map. Your IP address is transferred to Google servers.",
  },
  cookies: [
    {
      name: "__sak",
      type: "sessionStorage",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Google Maps: Sitzungsdaten der eingebetteten Karte (Session Storage, google.com).", en: "Google Maps: session data of the embedded map (session storage, google.com)." },
      evidence: ["observed"],
    },
  ],
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. The iframe (google.com/maps/embed) loads only after consent or a click on the placeholder; the host check applies.",
    observed: "Embed loaded in the sandbox (standard share-embed URL and output=embed URL): no cookies, one session storage key observed.",
  },
  devNote: { de: "In unseren Tests setzte die eingebettete Karte keine Cookies; beobachtet wurde nur ein Eintrag im Session Storage.", en: "In our tests the embedded map set no cookies; only one session storage entry was observed." },
  sources: ["https://developers.google.com/maps/documentation/embed/get-started", "https://policies.google.com/technologies/cookies"],
  embed: {
    hosts: ["www.google.com/maps", "maps.google.com"],
    placeholder: {
      de: "Diese Karte wird von Google Maps bereitgestellt. Beim Laden werden Daten an Google übertragen.",
      en: "This map is provided by Google Maps. Loading it transfers data to Google.",
    },
  },
};
export default service;
