/** OpenStreetMap embed (iframe, www.openstreetmap.org/export/embed.html). No config. */
import type { ServiceDef } from "../types";

const service: ServiceDef = {
  id: "openstreetmap",
  vendor: "OpenStreetMap Foundation",
  vendorUrl: "https://www.openstreetmap.org",
  privacyUrl: "https://osmfoundation.org/wiki/Privacy_Policy",
  category: "functional",
  label: { de: "OpenStreetMap", en: "OpenStreetMap" },
  description: {
    de: "Zeigt eine eingebettete OpenStreetMap-Karte an. Dabei wird Ihre IP-Adresse an Server der OpenStreetMap Foundation übertragen und in Server-Logs verarbeitet.",
    en: "Shows an embedded OpenStreetMap map. Your IP address is transferred to servers of the OpenStreetMap Foundation and processed in server logs.",
  },
  cookies: [],
  cookieless: true,
  devNote: { de: "Die Einbettung setzte weder Cookies noch Speichereinträge.", en: "The embed set no cookies or storage entries." },
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. The embed iframe loaded; tiles come from tile.openstreetmap.org.",
    observed: "No cookies or storage keys observed in the sandbox.",
  },
  sources: ["https://osmfoundation.org/wiki/Privacy_Policy"],
  embed: {
    hosts: ["www.openstreetmap.org", "openstreetmap.org"],
    placeholder: {
      de: "Diese Karte wird von OpenStreetMap bereitgestellt. Beim Laden werden Daten an die OpenStreetMap Foundation übertragen.",
      en: "This map is provided by OpenStreetMap. Loading it transfers data to the OpenStreetMap Foundation.",
    },
  },
};
export default service;
