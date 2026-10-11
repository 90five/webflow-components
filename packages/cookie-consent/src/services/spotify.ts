/** Spotify embed (iframe, open.spotify.com/embed/...). No config. */
import type { ServiceDef } from "../types";

const service: ServiceDef = {
  id: "spotify",
  vendor: "Spotify AB",
  vendorUrl: "https://www.spotify.com",
  privacyUrl: "https://www.spotify.com/legal/privacy-policy/",
  category: "functional",
  label: { de: "Spotify", en: "Spotify" },
  description: {
    de: "Zeigt eingebettete Spotify-Inhalte (Musik, Podcasts) an. Dabei wird Ihre IP-Adresse an Server von Spotify übertragen.",
    en: "Shows embedded Spotify content (music, podcasts). Your IP address is transferred to Spotify servers.",
  },
  cookies: [
    {
      name: "sp_t",
      duration: { de: "12 Monate (365 Tage)", en: "12 months" },
      description: { de: "Geräte-Kennung (spotify.com).", en: "Device identifier (spotify.com)." },
      evidence: ["observed"],
    },
    {
      name: "sp_landing",
      duration: { de: "24 Stunden", en: "24 hours" },
      description: { de: "Merkt die erste aufgerufene Seite (HttpOnly, spotify.com).", en: "Remembers the landing page (HttpOnly, spotify.com)." },
      evidence: ["observed"],
    },
    {
      name: "sp_last_utm",
      duration: { de: "60 Tage", en: "60 days" },
      description: { de: "Speichert die letzten UTM-Parameter (spotify.com).", en: "Stores the last UTM parameters (spotify.com)." },
      evidence: ["observed"],
    },
    {
      name: "OptanonConsent",
      duration: { de: "12 Monate (365 Tage)", en: "12 months" },
      description: { de: "Speichert die Cookie-Einwilligung im Spotify-Player (OneTrust).", en: "Stores the cookie consent inside the Spotify player (OneTrust)." },
      evidence: ["observed"],
    },
    {
      name: "anonymous:*",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Oberflächen-Einstellungen des Web-Players (z. B. Spaltenbreiten, Ansicht).", en: "UI preferences of the web player (e.g. panel widths, view mode)." },
      evidence: ["observed"],
    },
    {
      name: "sentryReplaySession",
      type: "sessionStorage",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Fehler-Monitoring und Sitzungs-Replay (Sentry).", en: "Error monitoring and session replay (Sentry)." },
      evidence: ["observed"],
    },
    {
      name: "keyval-store",
      type: "indexedDB",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "IndexedDB des Web-Players.", en: "IndexedDB of the web player." },
      evidence: ["observed"],
    },
  ],
  devNote: { de: "Spotify nennt die Cookies des Embeds nicht; die Einträge stammen aus der Beobachtung eines öffentlichen Embeds.", en: "Spotify does not list the embed's cookies; the entries come from observing a public embed." },
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. A public track embed loaded.",
    observed: "Cookies and storage keys observed in the sandbox.",
  },
  sources: ["https://www.spotify.com/us/legal/privacy-policy/"],
  embed: {
    hosts: ["open.spotify.com"],
    placeholder: {
      de: "Dieser Inhalt wird von Spotify bereitgestellt. Beim Laden werden Daten an Spotify übertragen.",
      en: "This content is provided by Spotify. Loading it transfers data to Spotify.",
    },
  },
};
export default service;
