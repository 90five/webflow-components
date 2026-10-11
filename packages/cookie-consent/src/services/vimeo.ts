/**
 * Vimeo video embed (iframe). No config.
 * Vimeo's player parameter dnt=1 stops session data/analytics but "some essential cookies will still be active",
 * so it does not replace consent.
 */
import type { ServiceDef } from "../types";

const service: ServiceDef = {
  id: "vimeo",
  vendor: "Vimeo.com, Inc.",
  vendorUrl: "https://vimeo.com",
  privacyUrl: "https://vimeo.com/privacy",
  category: "functional",
  label: { de: "Vimeo", en: "Vimeo" },
  description: {
    de: "Zeigt eingebettete Vimeo-Videos an. Dabei wird Ihre IP-Adresse an Server von Vimeo übertragen.",
    en: "Shows embedded Vimeo videos. Your IP address is transferred to Vimeo servers.",
  },
  cookies: [
    {
      name: "vuid",
      duration: { de: "13 Monate (400 Tage)", en: "13 months" },
      description: { de: "Anonyme Besucher-Kennung für Statistiken (vimeo.com).", en: "Anonymous visitor identifier for statistics (vimeo.com)." },
      evidence: ["observed"],
    },
    {
      name: "player",
      duration: { de: "12 Monate (365 Tage)", en: "12 months" },
      description: { de: "Speichert Player-Einstellungen wie Lautstärke und Qualität (vimeo.com).", en: "Stores player preferences such as volume and quality (vimeo.com)." },
      evidence: ["observed"],
    },
    {
      name: "__cf_bm",
      duration: { de: "30 Minuten", en: "30 minutes" },
      description: { de: "Cloudflare-Bot-Schutz (HttpOnly, vimeo.com).", en: "Cloudflare bot management (HttpOnly, vimeo.com)." },
      evidence: ["observed"],
    },
    {
      name: "cf_clearance",
      duration: { de: "12 Monate (365 Tage)", en: "12 months" },
      description: { de: "Cloudflare: merkt eine bestandene Bot-Prüfung (HttpOnly, vimeo.com).", en: "Cloudflare: remembers a passed bot check (HttpOnly, vimeo.com)." },
      evidence: ["observed"],
    },
    {
      name: "__cf_ob",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Cloudflare: Origin-Bot-Prüfung (player.vimeo.com).", en: "Cloudflare: origin bot check (player.vimeo.com)." },
      evidence: ["observed"],
    },
    {
      name: "LOCAL_STORAGE_ID_VIMEO_PLAYER",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Player-Kennung (player.vimeo.com).", en: "Player identifier (player.vimeo.com)." },
      evidence: ["observed"],
    },
    {
      name: "LOCAL_STORAGE_ID_PICOX_ID",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Kennung der Vimeo-Player-Statistik (Picox).", en: "Identifier of Vimeo's player analytics (Picox)." },
      evidence: ["observed"],
    },
    {
      name: "PLAYER_PICOX_SAMPLING_SEED",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Stichproben-Wert der Player-Statistik.", en: "Sampling value of the player analytics." },
      evidence: ["observed"],
    },
    {
      name: "sync_active",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Synchronisationsstatus des Players.", en: "Sync status of the player." },
      evidence: ["observed"],
    },
    {
      name: "_cfPre_tabId",
      type: "sessionStorage",
      duration: { de: "Sitzung", en: "session" },
      description: { de: "Cloudflare: Tab-Kennung der Bot-Prüfung.", en: "Cloudflare: tab identifier of the bot check." },
      evidence: ["observed"],
    },
    {
      name: "orionV3",
      type: "indexedDB",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "IndexedDB des Players.", en: "IndexedDB of the player." },
      evidence: ["observed"],
    },
    {
      name: "picox",
      type: "indexedDB",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "IndexedDB der Player-Statistik.", en: "IndexedDB of the player analytics." },
      evidence: ["observed"],
    },
  ],
  devNote: { de: "Der Player-Parameter dnt=1 ersetzt keine Einwilligung: laut Vimeo bleiben einige notwendige Cookies auch dann aktiv.", en: "The player parameter dnt=1 does not replace consent: per Vimeo, some essential cookies stay active even then." },
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. A public sample video loaded and played.",
    observed: "Cookies and storage keys observed in the sandbox.",
  },
  sources: ["https://help.vimeo.com/hc/en-us/articles/12426260232977-Player-parameters-overview", "https://vimeo.com/privacy"],
  embed: {
    hosts: ["player.vimeo.com"],
    placeholder: {
      de: "Dieses Video wird von Vimeo bereitgestellt. Beim Laden werden Daten an Vimeo übertragen.",
      en: "This video is provided by Vimeo. Loading it transfers data to Vimeo.",
    },
  },
};
export default service;
