/** Loom video embed (iframe, loom.com/embed/<id>). No config. */
import type { ServiceDef } from "../types";

const service: ServiceDef = {
  id: "loom",
  vendor: "Loom, Inc. (Atlassian)",
  vendorUrl: "https://www.loom.com",
  privacyUrl: "https://www.atlassian.com/legal/privacy-policy",
  category: "functional",
  label: { de: "Loom", en: "Loom" },
  description: {
    de: "Zeigt eingebettete Loom-Videos an. Dabei wird Ihre IP-Adresse an Server von Loom übertragen.",
    en: "Shows embedded Loom videos. Your IP address is transferred to Loom servers.",
  },
  cookies: [
    {
      name: "loom_anon_comment",
      duration: { de: "12 Monate (365 Tage)", en: "12 months" },
      description: { de: "Anonyme Kennung für Kommentare (loom.com).", en: "Anonymous identifier for comments (loom.com)." },
      evidence: ["observed"],
    },
    {
      name: "ajs_anonymous_id",
      duration: { de: "12 Monate (365 Tage)", en: "12 months" },
      description: { de: "Anonyme Besucher-ID der Analytics-Bibliothek (Cookie und Local Storage, loom.com).", en: "Anonymous visitor id of the analytics library (cookie and local storage, loom.com)." },
      evidence: ["observed"],
    },
    {
      name: "ajs_anonymous_id",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Anonyme Besucher-ID der Analytics-Bibliothek (loom.com).", en: "Anonymous visitor id of the analytics library (loom.com)." },
      evidence: ["observed"],
    },
    {
      name: "statsig.session_id.*",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Sitzungs-ID für Feature-Tests/Analysen (Statsig).", en: "Session id for feature tests/analytics (Statsig)." },
      evidence: ["observed"],
    },
    {
      name: "statsig.stable_id.*",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Stabile Geräte-ID für Feature-Tests/Analysen (Statsig).", en: "Stable device id for feature tests/analytics (Statsig)." },
      evidence: ["observed"],
    },
    {
      name: "awc.session.id",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Sitzungs-ID des Analytics-Clients von Atlassian.", en: "Session id of Atlassian's analytics client." },
      evidence: ["observed"],
    },
    {
      name: "awc.session.expiry",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Ablaufzeit der Analytics-Sitzung (Atlassian).", en: "Expiry of the analytics session (Atlassian)." },
      evidence: ["observed"],
    },
    {
      name: "awc.*",
      type: "sessionStorage",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Sitzungsdaten des Analytics-Clients von Atlassian (z. B. awc.tab.id, awc.taskSessions).", en: "Session data of Atlassian's analytics client (e.g. awc.tab.id, awc.taskSessions)." },
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
      name: "analytics-web-client",
      type: "indexedDB",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "IndexedDB des Analytics-Clients von Atlassian.", en: "IndexedDB of Atlassian's analytics client." },
      evidence: ["observed"],
    },
    {
      name: "viewer_session_data",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent (until cleared)" },
      description: { de: "Loom: Daten der Zuschauer-Sitzung (Local Storage).", en: "Loom: viewer session data (local storage)." },
      evidence: ["observed"],
    },
  ],
  visitorNote: {
    de: "Loom gehört zu Atlassian; es gilt dessen Datenschutzerklärung.",
    en: "Loom is owned by Atlassian; its privacy policy applies.",
  },
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. The embed iframe loaded with a public sample video.",
    observed: "Cookies, local/session storage and IndexedDB observed in the sandbox with a public sample video and on loom.com (writer: cdn.loom.com).",
    liveSites: ["https://www.loom.com/"],
  },
  sources: ["https://www.atlassian.com/legal/privacy-policy"],
  embed: {
    hosts: ["loom.com"],
    placeholder: {
      de: "Dieses Video wird von Loom bereitgestellt. Beim Laden werden Daten an Loom übertragen.",
      en: "This video is provided by Loom. Loading it transfers data to Loom.",
    },
  },
};
export default service;
