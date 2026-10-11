/**
 * YouTube video embed (iframe). No config. Use https://www.youtube-nocookie.com/embed/<id> in fivex-consent-src.
 * Category functional: video as content; Google docs: privacy-enhanced mode does not personalise via embed views.
 */
import type { ServiceDef } from "../types";

const service: ServiceDef = {
  id: "youtube",
  vendor: "Google Ireland Limited",
  vendorUrl: "https://www.youtube.com",
  privacyUrl: "https://policies.google.com/privacy",
  category: "functional",
  label: { de: "YouTube", en: "YouTube" },
  description: {
    de: "Zeigt eingebettete YouTube-Videos an. Dabei wird Ihre IP-Adresse an Server von Google übertragen.",
    en: "Shows embedded YouTube videos. Your IP address is transferred to Google servers.",
  },
  cookies: [
    {
      name: "YSC",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Stellt sicher, dass Anfragen innerhalb einer Sitzung vom Nutzer stammen (HttpOnly, youtube.com).", en: "Ensures requests within a session are made by the user (HttpOnly, youtube.com)." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "VISITOR_INFO1_LIVE",
      duration: { de: "6 Monate (180 Tage)", en: "6 months" },
      description: { de: "Schätzt die Bandbreite und erkennt Probleme (HttpOnly, youtube.com).", en: "Estimates bandwidth and detects problems (HttpOnly, youtube.com)." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "__Secure-YNID",
      duration: { de: "6 Monate (180 Tage)", en: "6 months" },
      description: { de: "Erkennt und behebt Probleme des Dienstes (Nachfolger von VISITOR_INFO1_LIVE).", en: "Detects and resolves problems with the service (successor of VISITOR_INFO1_LIVE)." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "VISITOR_PRIVACY_METADATA",
      duration: { de: "6 Monate (180 Tage)", en: "6 months" },
      description: { de: "Speichert den Datenschutz-/Einwilligungsstatus des Besuchers (youtube.com).", en: "Stores the visitor's privacy/consent state (youtube.com)." },
      evidence: ["observed"],
    },
    {
      name: "__Secure-ROLLOUT_TOKEN",
      duration: { de: "6 Monate (180 Tage)", en: "6 months" },
      description: { de: "Steuert die schrittweise Einführung neuer Funktionen (youtube.com).", en: "Used to launch new features gradually (youtube.com)." },
      evidence: ["observed", "vendor-docs"],
    },
    {
      name: "test_cookie",
      duration: { de: "15 Minuten", en: "15 minutes" },
      description: { de: "Prüft, ob der Browser Cookies zulässt (doubleclick.net).", en: "Checks whether the browser allows cookies (doubleclick.net)." },
      evidence: ["observed"],
    },
    {
      name: "ytidb::LAST_RESULT_ENTRY_KEY",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Interner Zwischenspeicher des Players.", en: "Internal cache of the player." },
      evidence: ["observed"],
    },
    {
      name: "yt-player-bandwidth",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Gemessene Bandbreite für die Qualitätswahl.", en: "Measured bandwidth for quality selection." },
      evidence: ["observed"],
    },
    {
      name: "yt-player-caption-persistence",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Merkt Untertitel-Einstellungen.", en: "Remembers caption settings." },
      evidence: ["observed"],
    },
    {
      name: "yt-icons-last-purged",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Interne Cache-Pflege des Players.", en: "Internal cache maintenance of the player." },
      evidence: ["observed"],
    },
    {
      name: "YtIdbMeta",
      type: "indexedDB",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "IndexedDB des Players (Metadaten).", en: "IndexedDB of the player (metadata)." },
      evidence: ["observed"],
    },
    {
      name: "LogsDatabaseV2:*",
      type: "indexedDB",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "IndexedDB für Protokolldaten (nur youtube.com, nicht youtube-nocookie.com).", en: "IndexedDB for log data (youtube.com only, not youtube-nocookie.com)." },
      evidence: ["observed"],
    },
    {
      name: "ServiceWorkerLogsDatabase",
      type: "indexedDB",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "IndexedDB für Protokolldaten des Players (nur youtube.com, nicht youtube-nocookie.com).", en: "IndexedDB for player log data (youtube.com only, not youtube-nocookie.com)." },
      evidence: ["observed"],
    },
  ],
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. The embed iframe loaded and played with youtube-nocookie.com and with youtube.com.",
    observed: "Cookies and storage keys observed in the sandbox and on a page with a standard embed; no cookies with the nocookie domain.",
  },
  devNote: { de: "Mit der Domain youtube-nocookie.com wurden in unseren Tests keine Cookies gesetzt (nur Local Storage/IndexedDB), mit youtube.com mehrere. Nutzen Sie nach Möglichkeit die nocookie-Domain.", en: "With the youtube-nocookie.com domain no cookies were set in our tests (only local storage / IndexedDB), with youtube.com several. Use the nocookie domain where possible." },
  sources: [
    "https://support.google.com/youtube/answer/171780",
    "https://policies.google.com/technologies/cookies",
  ],
  embed: {
    hosts: ["youtube-nocookie.com", "youtube.com"],
    placeholder: {
      de: "Dieses Video wird von YouTube (Google) bereitgestellt. Beim Laden werden Daten an Google übertragen.",
      en: "This video is provided by YouTube (Google). Loading it transfers data to Google.",
    },
  },
};
export default service;
