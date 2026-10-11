/** SoundCloud player embed (iframe, w.soundcloud.com/player). No config. */
import type { ServiceDef } from "../types";

const service: ServiceDef = {
  id: "soundcloud",
  vendor: "SoundCloud Global Limited & Co. KG",
  vendorUrl: "https://soundcloud.com",
  privacyUrl: "https://soundcloud.com/pages/privacy",
  category: "functional",
  label: { de: "SoundCloud", en: "SoundCloud" },
  description: {
    de: "Zeigt eingebettete SoundCloud-Audioplayer an. Dabei wird Ihre IP-Adresse an Server von SoundCloud übertragen.",
    en: "Shows embedded SoundCloud audio players. Your IP address is transferred to SoundCloud servers.",
  },
  cookies: [
    {
      name: "ddSession_datadome",
      type: "localStorage",
      duration: { de: "Dauerhaft (bis zur Löschung)", en: "persistent" },
      description: { de: "Bot-Schutz von DataDome innerhalb des Players (w.soundcloud.com).", en: "DataDome bot protection inside the player (w.soundcloud.com)." },
      evidence: ["observed"],
    },
  ],
  devNote: { de: "Zusätzlich schreibt der Player einen Schlüssel „getItem“ in den Session Storage.", en: "The player also writes a key \"getItem\" to session storage." },
  verification: {
    date: "2026-10-11",
    loader: "Loaded after consent in a real Chrome profile; no request to the vendor before consent. A public track embed loaded.",
    observed: "Local storage key observed in the sandbox.",
  },
  sources: ["https://soundcloud.com/pages/privacy"],
  embed: {
    hosts: ["w.soundcloud.com"],
    placeholder: {
      de: "Dieser Player wird von SoundCloud bereitgestellt. Beim Laden werden Daten an SoundCloud übertragen.",
      en: "This player is provided by SoundCloud. Loading it transfers data to SoundCloud.",
    },
  },
};
export default service;
